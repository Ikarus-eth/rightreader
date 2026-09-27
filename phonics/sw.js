/* This worker only controls /phonics/ and never reads the original reader's saves. */
const CACHE='rightreader-phonics-moonflower-v5';
const SHELL=['./','index.html','styles.css?v=5','reader.js?v=5','book/story.json','teaching.json','audio.json','manifest.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
async function withRange(response,range){
 if(!range||response.status!==200)return response;
 const bytes=await response.arrayBuffer(),size=bytes.byteLength,m=/^bytes=(\d*)-(\d*)$/.exec(range);
 let start,end;
 if(m&&(m[1]||m[2])){
  start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]));
  end=m[1]?(m[2]?Math.min(Number(m[2]),size-1):size-1):size-1;
 }
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
 const headers=new Headers(response.headers);
 headers.delete('Content-Encoding');headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
 return new Response(bytes.slice(start,end+1),{status:206,headers});
}
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 const fresh=e.request.mode==='navigate'||/\.(?:js|css|json)$/.test(url.pathname);
 const range=e.request.headers.get('range');
 e.respondWith(caches.open(CACHE).then(async cache=>{
  if(!fresh){const saved=await cache.match(e.request,{ignoreSearch:true});if(saved)return withRange(saved,range);}
  try{
   const r=await fetch(e.request,fresh?{cache:'no-store'}:undefined);
   // Cache API rejects 206 responses. A cache write must never prevent playback.
   if(r.status===200&&!url.pathname.endsWith('.epub')){try{await cache.put(e.request,r.clone());}catch{}}
   return r;
  }catch{
   const saved=await cache.match(e.request,{ignoreSearch:true});
   if(saved)return withRange(saved,range);
   return (e.request.mode==='navigate'?await cache.match('index.html'):null)||new Response('Unavailable offline',{status:503});
  }
 }));
});
