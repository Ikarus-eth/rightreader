const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function worker({cached=null,network,put=async()=>{}}={}){
 const events={};
 const cache={match:async()=>cached?.clone(),put};
 const ctx={self:{registration:{scope:'https://example.test/rightreader/phonics/'},addEventListener:(name,fn)=>events[name]=fn},caches:{open:async()=>cache},fetch:network,Response,Headers,URL};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/sw.js','utf8'),ctx);
 return async(range)=>{let result;events.fetch({request:new Request('https://example.test/rightreader/phonics/audio/word.mp3',{headers:range?{Range:range}:{}}),respondWith:p=>result=p});return result;};
}
test('network 206 audio reaches the player without an invalid cache write',async()=>{
 const run=worker({network:async()=>new Response('ab',{status:206,headers:{'Content-Range':'bytes 0-1/6'}}),put:async()=>assert.fail('must not cache a partial response')});
 const r=await run('bytes=0-1');assert.equal(r.status,206);assert.equal(await r.text(),'ab');
});
test('offline complete recording supports bounded, open and suffix ranges',async()=>{
 const run=worker({cached:new Response('abcdef',{headers:{'Content-Type':'audio/mpeg'}}),network:async()=>assert.fail('recording should be cached')});
 for(const [range,want,contentRange] of [['bytes=0-1','ab','bytes 0-1/6'],['bytes=2-','cdef','bytes 2-5/6'],['bytes=-2','ef','bytes 4-5/6'],['bytes=4-99','ef','bytes 4-5/6']]){
  const r=await run(range);assert.equal(r.status,206);assert.equal(await r.text(),want);assert.equal(r.headers.get('Content-Range'),contentRange);assert.equal(r.headers.get('Content-Length'),String(want.length));
 }
 const full=await run();assert.equal(full.status,200);assert.equal(await full.text(),'abcdef');
});
test('invalid ranges return 416',async()=>{
 const run=worker({cached:new Response('abcdef')});
 for(const range of ['bytes=6-','bytes=4-2','bytes=-0','bytes=','bytes=0-1,3-4']){const r=await run(range);assert.equal(r.status,416);assert.equal(r.headers.get('Content-Range'),'bytes */6');}
});
test('cache quota failure does not discard a successful network response',async()=>{
 const run=worker({network:async()=>new Response('complete'),put:async()=>{throw Error('quota');}});
 const r=await run();assert.equal(r.status,200);assert.equal(await r.text(),'complete');
});
