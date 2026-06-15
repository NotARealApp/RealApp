// Bump this version on each deploy to refresh the cached app shell.
const CACHE = "my-planner-v26";
const ASSETS = [
  "./",
  "./index.html",
  "../tokens.css",
  "../i18n.js",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  // Activate the new version immediately so updates can never get stuck behind
  // an old worker (the page reloads on controllerchange).
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

// Belt-and-suspenders: the page can also ask us to activate.
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

// Tapping a leave reminder focuses the planner (or opens it).
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) { if ("focus" in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
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

  // Cross-origin (weather + MVG APIs, fonts) → straight to network.
  if (url.origin !== location.origin) return;

  // App shell (page + its code) → network-first so a deploy always wins when
  // online; fall back to cache offline. This avoids fresh-HTML/stale-CSS skew.
  const isShell =
    e.request.mode === "navigate" || /\.(?:html|css|js|json)$/.test(url.pathname);
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

  // Other static assets (icons) → cache-first.
  e.respondWith(caches.match(e.request).then((c) => c || fetch(e.request)));
});
