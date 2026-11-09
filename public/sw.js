/**
 * Offline app shell for Excel Master Academy.
 *
 * Why this exists: the app is also shipped as an Android APK. Without a
 * service worker, losing the network meant a *blank page* — the HTML, CSS and
 * JS all come from the server, so there was nothing to show at all, and the
 * student's offline practice work (which the data layer already keeps in
 * localStorage) could not even be opened.
 *
 * Strategy, deliberately boring:
 *  - `index.html` and the hashed `/assets/*` bundles: cache-first after the
 *    first visit (Vite hashes the asset names, so a new deploy is a new URL —
 *    no stale-code risk).
 *  - everything else same-origin `GET`: network-first with a short timeout,
 *    falling back to the cache, then to a tiny offline page for navigations.
 *  - `/api/*` is never cached: per-student data must not be replayed from a
 *    cache, and the app already has its own offline data layer.
 *
 * Bump CACHE when the shell logic changes; the old cache is deleted on
 * activate so a fixed version is never hidden behind a stale one.
 */
const CACHE = "ema-shell-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = ["/", "/index.html", OFFLINE_URL, "/manifest.webmanifest", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Nothing here is allowed to fail the install: a missing optional icon
      // must not leave the app with no service worker at all.
      await Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

/** A navigation that timed out offline: serve the shell from cache if we have it. */
async function offlineShell() {
  const cache = await caches.open(CACHE);
  return (await cache.match("/index.html")) ?? (await cache.match("/")) ?? (await cache.match(OFFLINE_URL));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // fonts, analytics: untouched
  if (url.pathname.startsWith("/api/")) return; // never cache student data

  // Build output: immutable, content-hashed.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  // Documents and everything else: network first, cache as the safety net.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await offlineShell();
          if (shell) return shell;
        }
        throw new Error("offline and not cached");
      }
    })(),
  );
});
