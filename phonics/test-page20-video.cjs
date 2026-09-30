const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/page20-video.js','utf8').replace(/export /g,'').replace(/import\.meta\.url/g,"'https://example.test/phonics/page20-video.js'");
function setup({reduced=false,hidden=false,download=true,rejectPlay=false}={}){
 const children=new Set(),timers=new Map(),events={};let timer=0,paused=0,loads=0,video;
 const parent={dataset:{},querySelector:()=>null,append:node=>children.add(node)};
 const context={URL:class extends URL{static createObjectURL(){return 'blob:local-test';}},fetch:async()=>({ok:download,blob:async()=>({})}),Image:class{decode(){return Promise.resolve();}cloneNode(){return {style:{}};}},
 window:{matchMedia:()=>({matches:reduced})},document:{hidden,createElement:tag=>{
  const node={style:{},setAttribute(){},append(){},replaceChildren(){},remove(){children.delete(this);}};
  if(tag==='video')Object.assign(node,{addEventListener:(event,fn)=>events[event]=fn,removeEventListener:event=>delete events[event],pause:()=>paused++,load:()=>loads++,removeAttribute(){},play:()=>rejectPlay?Promise.reject(Error('denied')):Promise.resolve()});
  if(tag==='video')video=node;return node;
 }},setTimeout:fn=>{timers.set(++timer,fn);return timer;},clearTimeout:id=>timers.delete(id)};
 vm.createContext(context);vm.runInContext(source,context);const api=vm.runInContext('({prepare,play})',context);
 return {api,parent,children,timers,events,video:()=>video,paused:()=>paused,loads:()=>loads};
}
test('video completion and skip hold the ending without altering image geometry',async()=>{
 for(const reason of ['ended','skip']){const s=setup();await s.api.prepare();let ends=0;const stop=s.api.play(s.parent,()=>ends++);s.events.playing();assert.equal(s.parent.dataset.motionStatus,'playing');assert.equal(s.video().muted,true);assert.equal(s.video().playsInline,true);assert.match(s.video().style.cssText,/object-fit:contain/);
  if(reason==='ended')s.events.ended();else stop();assert.equal(s.children.size,1);assert.equal([...s.children][0].className,'scene20-settled');assert.equal(s.paused(),1);assert.equal(s.loads(),1);assert.equal(s.timers.size,0);assert.equal(Object.keys(s.events).length,0);assert.equal(ends,reason==='ended'?1:0);stop();assert.equal(s.paused(),1);
 }
});
test('loading or decoding failures restore reading instead of trapping the page',async()=>{
 for(const reason of ['error','stall','play-rejected']){const s=setup({rejectPlay:reason==='play-rejected'});await s.api.prepare();let ends=0;s.api.play(s.parent,()=>ends++);
  if(reason==='error')s.events.error();if(reason==='stall')[...s.timers.values()][0]();await Promise.resolve();
  assert.equal(ends,1);assert.equal(s.children.size,0);assert.equal(s.timers.size,0);assert.equal(s.parent.dataset.motionStatus,'unavailable');
 }
});
test('missing video, hidden page and reduced-motion preference leave the original readable still',async()=>{
 for(const options of [{download:false},{hidden:true},{reduced:true}]){const s=setup(options);await s.api.prepare();assert.equal(s.api.play(s.parent,()=>assert.fail('unexpected completion')),null);assert.equal(s.children.size,0);assert.equal(s.timers.size,0);}
});
