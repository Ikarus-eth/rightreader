const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const timeline=fs.readFileSync(__dirname+'/crow-timeline.js','utf8').replace(/export /g,'');
const renderer=fs.readFileSync(__dirname+'/crow-scene.js','utf8').replace(/^import .*;\n/,'').replace(/export /g,'').replace(/import\.meta\.url/g,"'https://example.test/phonics/crow-scene.js'");
function setup({gpu=true,reduced=false,hidden=false,fail=false}={}){
 const frames=new Map(),children=new Set(),events={},deleted=[];let id=0,draws=0;
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,drawElements:()=>draws++},{get:(o,k)=>k in o?o[k]:k.startsWith('create')?()=>({}):k.startsWith('delete')?r=>deleted.push(r):()=>{}});
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});
 const parent={dataset:{},querySelector:()=>null,append:n=>children.add(n)};
 const context={URL,console,Float32Array,Uint16Array,Image:class{width=1086;height=1448;decode(){return fail?Promise.reject(Error('missing')):Promise.resolve();}},window:{matchMedia:()=>({matches:reduced})},document:{hidden,
 createElement:()=>({dataset:{},setAttribute(){},append(){},replaceChildren(){},remove(){children.delete(this);},getContext:type=>type==='webgl'?(gpu?gl:null):ctx,addEventListener:(name,fn)=>events[name]=fn,removeEventListener:name=>delete events[name]})},performance:{now:()=>100},requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)};
 vm.createContext(context);vm.runInContext(timeline+'\n'+renderer,context);
 const api=vm.runInContext('({prepare,play,crowState,stoneState,beakPoint,wingPoint,waterLevel,actors,DROP_TIMES,IMPACT_TIMES})',context);
 return {api,parent,children,frames,events,deleted,context,draws:()=>draws,tick:now=>{const list=[...frames.values()];frames.clear();list.forEach(fn=>fn(now));}};
}
test('stones stay attached until release, fall continuously and hit inside the jar',()=>{
 const {api:a}=setup();
 for(const i of [0,1]){const drop=a.DROP_TIMES[i],impact=a.IMPACT_TIMES[i];
  const before=a.stoneState(drop-.00001,i),after=a.stoneState(drop,i);assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.01);
  const end=a.stoneState(impact-.00001,i);assert.ok(end.x>545&&end.x<865);assert.ok(Math.abs(end.y-a.waterLevel(impact))<.02);assert.equal(a.stoneState(impact,i).visible,false);
  let last=after.y;for(let t=drop;t<impact;t+=.01){const p=a.stoneState(t,i);assert.ok(p.y>=last);last=p.y;}
 }
});
test('wing roots remain attached throughout every upstroke and downstroke',()=>{
 const {api:a}=setup();
 for(const far of [false,true])for(let phase=0;phase<Math.PI*2;phase+=.02){const crow={...a.crowState(3.7,0),phase,flap:.1+1.18*Math.cos(phase)};
  const root=a.wingPoint(1150,1020,crow,far),baseline=a.wingPoint(1150,1020,{...crow,phase:0,flap:0},far);
  assert.deepEqual(root,baseline);for(const p of [a.wingPoint(10,200,crow,far),root])p.forEach(n=>assert.ok(Number.isFinite(n)));
 }
});
test('water rises only after each impact and holds the result; gaze follows the action',()=>{
 const {api:a}=setup();assert.equal(a.waterLevel(4.82),880);assert.equal(a.waterLevel(6),869);assert.equal(a.waterLevel(12),858);assert.equal(a.waterLevel(90),858);
 let prev=880;for(let t=0;t<12;t+=.01){const level=a.waterLevel(t);assert.ok(level<=prev);prev=level;}
 assert.equal(a.actors(3).gaze,0);assert.equal(a.actors(4.8).gaze,1);assert.equal(a.actors(6).gaze,0);assert.equal(a.actors(7.3).gaze,1);
});
test('completion and skip retain a still result and release every frame and GPU resource',async()=>{
 for(const reason of ['end','skip','hidden','context']){const s=setup();await s.api.prepare();let ends=0;const stop=s.api.play(s.parent,()=>ends++);s.tick(1000);assert.ok(s.draws()>0);
  if(reason==='end')s.tick(12100);if(reason==='skip')stop();if(reason==='hidden'){s.context.document.hidden=true;s.tick(1500);}if(reason==='context')s.events.webglcontextlost({preventDefault(){}});
  assert.equal(s.frames.size,0);assert.ok(s.deleted.length>30);assert.equal(ends,reason==='skip'?0:1);assert.equal(s.children.size,reason==='context'?0:1);
  if(reason!=='context')assert.equal([...s.children][0].className,'scene20-settled');const draws=s.draws();s.tick(20000);stop();assert.equal(s.draws(),draws);
 }
});
test('unready or failed assets, hidden tabs, reduced motion and unavailable GPU keep reading available',async()=>{
 for(const options of [null,{fail:true},{hidden:true},{reduced:true},{gpu:false}]){const s=setup(options||{});if(options)await s.api.prepare();assert.equal(s.api.play(s.parent,()=>assert.fail('unexpected completion')),null);assert.equal(s.frames.size,0);assert.equal(s.children.size,0);}
});
