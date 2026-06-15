// NavTools service worker — makes the PWA installable + offline-capable.
// Runtime caching (no precache list, since Next.js asset names are hashed):
//   navigations        → network-first, fall back to cached page / "/"
//   same-origin static → stale-while-revalidate (_next, icons, images, css, js)
//   cross-origin       → straight to network (weather/geocoding APIs)
// Bump CACHE to invalidate everything on a breaking change.
const CACHE = "navtools-v1";

self.addEventListener("install", () => {
  // Don't skipWaiting here — let the page show an "update ready" toast and
  // decide when to activate (postMessage "SKIP_WAITING").
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Cross-origin (weather/geocoding/MVG/holidays) → straight to network.
  if (url.origin !== location.origin) return;

  // Navigations → network-first so a deploy wins online; cache offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match(new URL(self.registration.scope).pathname)),
        ),
    );
    return;
  }

  // Same-origin static (incl. /_next/static, icons, fonts) → stale-while-revalidate.
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchP = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchP;
    }),
  );
});
