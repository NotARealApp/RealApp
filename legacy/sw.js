// Suite-wide service worker: home + trip + gym. The dayplanner has its own
// richer worker under /dayplanner/ (more specific scope, takes precedence).
// Bump this version on each deploy to refresh the cached shells.
const CACHE = "assistant-suite-v7";
const ASSETS = [
  "./",
  "./index.html",
  "./tokens.css",
  "./i18n.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./trip/",
  "./trip/index.html",
  "./trip/styles.css",
  "./trip/app.js",
  "./gym/",
  "./gym/index.html",
  "./gym/underdevelopment.webp",
  "./settings/",
  "./settings/index.html",
  "./settings/app.js",
];

self.addEventListener("install", (e) => {
  // Don't fail the whole install if one asset 404s — cache what we can.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Cross-origin (weather/geocoding APIs, fonts) → straight to network.
  if (url.origin !== location.origin) return;
  // Let the dayplanner's own worker handle its pages/assets.
  if (url.pathname.includes("/dayplanner/")) return;

  // App shell (page + its code) → network-first so a deploy always wins online;
  // fall back to cache offline. Avoids fresh-HTML/stale-CSS skew.
  const isShell =
    e.request.mode === "navigate" || /\.(?:html|css|js)$/.test(url.pathname);
  if (isShell) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Other static assets (icons, images) → cache-first.
  e.respondWith(caches.match(e.request).then((c) => c || fetch(e.request)));
});
