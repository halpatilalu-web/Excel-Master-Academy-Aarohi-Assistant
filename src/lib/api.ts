/**
 * Relative-`/api` fetch wrapper. Same origin in dev (Vite proxies /api to the
 * FastAPI server) and in prod (FastAPI serves both), so the session cookie
 * flows with no configuration. A 401 fires `auth:required` so AuthGate
 * re-shows the sign-in form. Import from here; don't hand-roll fetch calls.
 *
 * Every request gets a timeout, because a backend that accepts the connection
 * and then stalls used to leave the UI spinning "loading…" forever.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const DEFAULT_TIMEOUT_MS = 20_000;

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onOuterAbort);
  try {
    const res = await fetch(path, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      signal: controller.signal,
    });
    if (res.status === 401) window.dispatchEvent(new Event("auth:required"));
    if (!res.ok) {
      let detail: string = res.statusText;
      try {
        const data = (await res.json()) as { detail?: unknown };
        if (data && data.detail !== undefined) detail = String(data.detail);
      } catch {
        /* non-JSON error body — keep statusText */
      }
      throw new ApiError(res.status, detail);
    }
    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      throw new ApiError(404, "Backend API not mounted on this host");
    }
    return (await res.json()) as T;
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      throw new ApiError(0, options.signal?.aborted ? "Request cancelled" : "The server took too long to answer. Check your connection.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onOuterAbort);
  }
}

export const api = {
  get: <T>(path: string, options?: { timeoutMs?: number; signal?: AbortSignal }) => request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: { timeoutMs?: number; signal?: AbortSignal }) => request<T>("POST", path, body, options),
  put: <T>(path: string, body?: unknown, options?: { timeoutMs?: number; signal?: AbortSignal }) => request<T>("PUT", path, body, options),
  del: (path: string, options?: { timeoutMs?: number; signal?: AbortSignal }) => request<void>("DELETE", path, undefined, options),
};
