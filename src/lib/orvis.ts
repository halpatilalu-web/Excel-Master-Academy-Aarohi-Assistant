/**
 * Browser helpers for Orvis platform services. Everything goes through THIS
 * app's own `/api/*` routes (same origin, session cookie) — the browser never
 * holds a platform key. Which services exist is read from the build env
 * (`VITE_ORVIS_SERVICES`, written by provision-service.py) and confirmed at
 * runtime by `GET /api/services`.
 *
 *   import { services, streamChat } from "./lib/orvis";
 *   if (services.has("ai")) await streamChat({ message }, (t) => setReply((r) => r + t));
 */
import { api } from "./api";

export const services: ReadonlySet<string> = new Set(
  ((import.meta.env.VITE_ORVIS_SERVICES as string | undefined) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  conversation_id?: string;
  _created?: number;
}

export interface StreamChatInput {
  message: string;
  conversation_id?: string;
  /** `data:image/...;base64,...` URIs. Use `fileToDataUrl` to build them. */
  images?: string[];
}

/** Read a picked File into the `data:` URI the chat route accepts. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsDataURL(file);
  });
}

export class ChatError extends Error {
  constructor(
    message: string,
    public code = "error",
    public status = 0,
  ) {
    super(message);
    this.name = "ChatError";
  }
}

/** POST /api/chat and feed each text delta to `onDelta`. Resolves with the saved reply id. */
export async function streamChat(
  input: StreamChatInput,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ id: string }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(input),
    credentials: "same-origin",
    signal,
  });
  if (res.status === 401) window.dispatchEvent(new Event("auth:required"));
  if (!res.ok || !res.body) {
    let detail = res.statusText;
    try {
      detail = String(((await res.json()) as { detail?: unknown }).detail ?? detail);
    } catch {
      /* keep statusText */
    }
    throw new ChatError(detail, "http_error", res.status);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let id = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let obj: { delta?: string; done?: boolean; id?: string; error?: string; code?: string; status?: number };
        try {
          obj = JSON.parse(payload);
        } catch {
          continue;
        }
        if (obj.error) throw new ChatError(obj.error, obj.code ?? "error", obj.status ?? 0);
        if (obj.delta) onDelta(obj.delta);
        if (obj.done && obj.id) id = obj.id;
      }
    }
  }
  return { id };
}

export const chatHistory = (conversation_id = "default", limit = 50) =>
  api.get<ChatMessage[]>(`/api/chat/history?conversation_id=${encodeURIComponent(conversation_id)}&limit=${limit}`);

export const clearChatHistory = (conversation_id = "default") =>
  api.del(`/api/chat/history?conversation_id=${encodeURIComponent(conversation_id)}`);

/** Runtime truth (env can lag a restart): which services the server actually mounted. */
export const fetchServices = () => api.get<{ enabled: string[]; configured: boolean }>("/api/services");

/**
 * Google login (service `google_auth`). Full-page navigation: the app server
 * hands the browser to Orvis, Orvis to Google, and back to this app with the
 * session cookie set. `returnTo` is the in-app path to land on afterwards.
 */
export function startGoogleLogin(returnTo = "/"): void {
  if (inIframe()) {
    // Google refuses to render its sign-in page inside an iframe (X-Frame-Options),
    // and the Orvis chat shows this app in a preview iframe. Run the flow in a
    // popup on this same origin; the callback lands on `/?auth=popup`, which
    // notifies the opener (see finishPopupLogin / onPopupLoginDone) and closes.
    const q = new URLSearchParams({
      origin: window.location.origin,
      return_to: `/?auth=popup&to=${encodeURIComponent(returnTo)}`,
    });
    const url = `/api/auth/oauth/start?${q.toString()}`;
    const w = window.open(url, "orvis_google_login", "popup,width=520,height=680");
    if (!w) window.open(url, "_blank"); // popup blocked → a tab still works
    return;
  }
  const q = new URLSearchParams({ origin: window.location.origin, return_to: returnTo });
  window.location.assign(`/api/auth/oauth/start?${q.toString()}`);
}

function inIframe(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

const POPUP_DONE = "orvis:google-login-done";

/**
 * Call once at boot. When this window is the Google-login popup that just came
 * back signed in (`?auth=popup`), tell the opener and close. Returns true in
 * that case so the caller can skip its own work; the session cookie is already
 * set for this origin, so the opener only needs to re-read `/api/auth/me`.
 */
export function finishPopupLogin(): boolean {
  const p = new URLSearchParams(window.location.search);
  if (p.get("auth") !== "popup") return false;
  const to = p.get("to") || "/";
  p.delete("auth"); p.delete("to");
  const rest = p.toString();
  window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
  if (window.opener && !window.opener.closed) {
    try { window.opener.postMessage({ type: POPUP_DONE, to }, window.location.origin); } catch { /* ignore */ }
    window.close();
    return true;
  }
  return false;
}

/** Subscribe to "the Google popup finished signing in"; returns an unsubscribe. */
export function onPopupLoginDone(cb: (to: string) => void): () => void {
  const handler = (e: MessageEvent) => {
    if (e.origin !== window.location.origin) return;
    if (e.data && e.data.type === POPUP_DONE) cb(String(e.data.to || "/"));
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

/** `?auth=error&reason=…` left by a failed Google login redirect, or null. */
export function readAuthError(): string | null {
  const p = new URLSearchParams(window.location.search);
  if (p.get("auth") !== "error") return null;
  const reason = p.get("reason") || "unknown";
  p.delete("auth"); p.delete("reason");
  const rest = p.toString();
  window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
  return reason;
}

/* ── payments (Razorpay, on the app owner's account) ─────────────────── */

export interface PayResult {
  paid: boolean;
  status: string;
  order_id: string;
}

interface OrderOut {
  id: string;
  order_id: string;
  key_id: string;
  amount_minor: number;
  currency: string;
  label?: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (x: unknown) => void) => void };
  }
}

let checkoutScript: Promise<void> | null = null;

/** Load Razorpay's checkout widget once (it must run in the end user's browser). */
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutScript) {
    checkoutScript = new Promise<void>((resolve, reject) => {
      const el = document.createElement("script");
      el.src = "https://checkout.razorpay.com/v1/checkout.js";
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        checkoutScript = null;
        reject(new Error("Could not load the payment widget. Check your connection."));
      };
      document.head.appendChild(el);
    });
  }
  return checkoutScript;
}

/**
 * Full checkout: create the order on our server, open Razorpay, then verify.
 * Resolves `{paid:false}` if the user closes the widget. The webhook marks the
 * order paid even if the browser dies mid-flow, so never gate fulfilment on
 * this return value alone for anything expensive.
 */
export async function payWithRazorpay(input: {
  amountMinor: number;
  label?: string;
  currency?: string;
  prefill?: { name?: string; email?: string };
  notes?: Record<string, string>;
}): Promise<PayResult> {
  await loadCheckout();
  const order = await api.post<OrderOut>("/api/payments/orders", {
    amount_minor: input.amountMinor,
    currency: input.currency,
    label: input.label,
    notes: input.notes,
  });
  if (!window.Razorpay) throw new Error("Payment widget unavailable.");

  return new Promise<PayResult>((resolve, reject) => {
    const rz = new window.Razorpay!({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount_minor,
      currency: order.currency,
      name: document.title || "Checkout",
      description: input.label || order.label || "",
      prefill: input.prefill ?? {},
      notes: input.notes ?? {},
      modal: {
        ondismiss: () => resolve({ paid: false, status: "cancelled", order_id: order.order_id }),
      },
      handler: (res: unknown) => {
        const r = res as { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
        api
          .post<PayResult>("/api/payments/verify", {
            order_id: r.razorpay_order_id,
            payment_id: r.razorpay_payment_id,
            signature: r.razorpay_signature,
          })
          .then(resolve)
          .catch(reject);
      },
    });
    rz.on("payment.failed", (e: unknown) => {
      const err = (e as { error?: { description?: string } })?.error;
      reject(new Error(err?.description || "The payment failed."));
    });
    rz.open();
  });
}

/** The signed-in user's past orders (newest first). */
export const paymentOrders = () =>
  api.get<Array<OrderOut & { status: string; created: number }>>("/api/payments/orders");

/* ── storage (files that persist) ───────────────────────────────────── */

export interface Upload {
  id: string;
  key: string;
  filename: string;
  content_type: string;
  size: number;
  visibility: "private" | "public";
  status: "pending" | "ready";
  /** "ai_image" for pictures made by `generateImage`; absent for file uploads. */
  source?: "ai_image";
  created?: number;
}

/**
 * Upload a File: presign on our server → PUT straight to storage → confirm.
 * Resolves to the stored record. `onProgress` gets 0..1.
 */
export async function uploadFile(
  file: File,
  opts: { visibility?: "private" | "public"; onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<Upload> {
  const grant = await api.post<Upload & { url: string; method: string; headers: Record<string, string> }>("/api/uploads/presign", {
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    size: file.size,
    visibility: opts.visibility ?? "private",
  });
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(grant.method || "PUT", grant.url);
    for (const [k, v] of Object.entries(grant.headers || {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) opts.onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("Upload failed. If this keeps happening the storage bucket may be missing a CORS rule for this site."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    opts.signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
  return api.post<Upload>("/api/uploads/confirm", { id: grant.id });
}

/** The signed-in user's uploads, newest first. */
export const listUploads = () => api.get<Upload[]>("/api/uploads");

/** A time-limited download URL for one of the user's uploads. */
export const uploadUrl = (id: string) => api.get<{ url: string; expires_in: number; filename: string }>(`/api/uploads/${encodeURIComponent(id)}/url`);

/** Remove an upload (file + record). */
export const deleteUpload = (id: string) => api.del(`/api/uploads/${encodeURIComponent(id)}`);

/* ── AI images (service `ai_image`) ─────────────────────────────────── */

export interface GeneratedImage extends Upload {
  source: "ai_image";
  prompt: string;
  model: string;
  /** Signed link, valid `expires_in` seconds — later, ask `uploadUrl(id)` for a fresh one. */
  url: string;
  expires_in: number;
}

/**
 * Make an image from a description. Orvis generates and stores it; it is
 * saved as one of the user's uploads (so `listUploads`, `uploadUrl`,
 * `deleteUpload` work on it). `referenceImages` (≤ 2) are `data:` URIs from
 * `fileToDataUrl`. Takes ~10–60 s; show a spinner.
 */
export const generateImage = (
  prompt: string,
  opts: { aspectRatio?: string; size?: string; quality?: string; referenceImages?: string[]; requestId?: string } = {},
) =>
  api.post<GeneratedImage>("/api/images/generate", {
    prompt,
    aspect_ratio: opts.aspectRatio,
    size: opts.size,
    quality: opts.quality,
    reference_images: opts.referenceImages ?? [],
    request_id: opts.requestId,
  });
