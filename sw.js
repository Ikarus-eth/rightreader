/* Right Reader — offline shell.

   Reading needs no network; only word lookups do. App shell files and icons
   use network-first when online so an iPad Home Screen install can never get
   stuck on an old bundle or on a broken icon. Everything still falls back to
   cache offline. Nothing here touches IndexedDB or localStorage, so an
   update never costs her books, words or reading position. */
const VERSION = "rr-v14";
const SHELL = [
  "./","./index.html","./app.js?v=14","./config.js?v=14","./manifest.json",
  "./icons/rr-192.png","./icons/rr-512.png","./icons/rr-180.png"
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

  /* Icons and the manifest join the shell here. A cached corrupt icon used to
     survive every deploy, and the Home Screen has no way to ask for a fresh
     one. */
  const isFreshShell =
    /\/(?:index\.html|app\.js|config\.js|manifest\.json)$/.test(url.pathname) ||
    /\/icons\//.test(url.pathname) ||
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
      if (hit) return hit;
      /* This used to be `hit || net || new Response(...)`. net is a promise,
         so it was always truthy, and when the fetch failed respondWith got a
         null and the request errored instead of falling through. */
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        return new Response("offline", { status: 503 });
      }
    })
  );
});
