// Ishara service worker: cache the app shell (and the web font) so the game works fully offline.
const CACHE = "ishara-v1";
const ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "movies.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: answer from cache instantly, refresh it in the background.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  if (req.method !== "GET" || (!sameOrigin && !FONT_HOSTS.includes(url.hostname))) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: sameOrigin });
      const network = fetch(req)
        .then((res) => { if (res.ok || res.type === "opaque") cache.put(req, res.clone()); return res; })
        .catch(() => cached || (req.mode === "navigate" ? cache.match("index.html") : Response.error()));
      return cached || network;
    })
  );
});
