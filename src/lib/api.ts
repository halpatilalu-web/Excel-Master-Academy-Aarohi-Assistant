/**
 * Relative-`/api` fetch wrapper. Same origin in dev (Vite proxies /api to the
 * FastAPI server) and in prod (FastAPI serves both), so the session cookie
 * flows with no configuration. A 401 fires `auth:required` so AuthGate
 * re-shows the sign-in form. Import from here; don't hand-roll fetch calls.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
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
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del: (path: string) => request<void>("DELETE", path),
};
