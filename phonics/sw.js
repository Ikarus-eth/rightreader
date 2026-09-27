/* This worker only controls /phonics/ and never reads the original reader's saves. */
const CACHE='rightreader-phonics-moonflower-v4';
const SHELL=['./','index.html','styles.css?v=4','reader.js?v=4','book/story.json','teaching.json','audio.json','manifest.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 const fresh=e.request.mode==='navigate'||/\.(?:js|css|json)$/.test(url.pathname);
 e.respondWith(caches.open(CACHE).then(async cache=>{
  if(!fresh){const saved=await cache.match(e.request,{ignoreSearch:true});if(saved)return saved;}
  try{const r=await fetch(e.request,fresh?{cache:'no-store'}:undefined);if(r.ok&&!url.pathname.endsWith('.epub'))await cache.put(e.request,r.clone());return r;}
  catch{const saved=await cache.match(e.request,{ignoreSearch:true});return saved||(e.request.mode==='navigate'?await cache.match('index.html'):null)||new Response('Unavailable offline',{status:503});}
 }));
});
