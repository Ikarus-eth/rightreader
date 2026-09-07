/* Right Reader — offline shell.

   Reading needs no network; only word lookups do. Without this file a
   flaky connection means the app will not even open, and the books are
   already sitting on the device. Stale-while-revalidate: she always gets
   an instant start from cache, and a new version is fetched in the
   background and used at the next launch. Bump VERSION on any deploy
   that changes index.html or app.js. */
const VERSION = "rr-v10";
const SHELL = [
  "./","./index.html","./app.js","./config.js","./manifest.json",
  "./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png","./icons/icon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never touch the API or anything cross-origin: a cached word
  // explanation served for a different sentence would be wrong.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      return hit || net || new Response("offline", { status: 503 });
    })
  );
});
