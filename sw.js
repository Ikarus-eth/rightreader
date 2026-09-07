/* Right Reader — offline shell.

   Reading needs no network; only word lookups do. App shell files use
   network-first when online so an iPad Home Screen install does not get
   stuck on an old bundle. Everything still falls back to cache offline. */
const VERSION = "rr-v11";
const SHELL = [
  "./","./index.html","./app.js?v=11","./config.js?v=11","./manifest.json?v=11",
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
  if (url.origin !== self.location.origin) return;

  const isFreshShell = /\/(?:index\.html|app\.js|config\.js)$/.test(url.pathname) ||
    url.pathname.endsWith("/rightreader/");

  if (isFreshShell) {
    e.respondWith(
      caches.open(VERSION).then(async cache => {
        try {
          const res = await fetch(req, { cache: "no-store" });
          if (res && res.ok) await cache.put(req, res.clone());
          return res;
        } catch (err) {
          return (await cache.match(req, { ignoreSearch: true })) ||
            new Response("offline", { status: 503 });
        }
      })
    );
    return;
  }

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
