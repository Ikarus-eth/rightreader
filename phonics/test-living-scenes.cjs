const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/living-scenes.js','utf8').replace(/^import .*;\n/,'').replace(/export /g,'');
function setup({reduced=false,hidden=false,decode=()=>Promise.resolve(),gpu=true}={}){
 const frames=new Map(),children=new Set(),deleted=[],events={};let id=0,draws=0;
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getError:()=>0,NO_ERROR:0,
  drawElements:()=>draws++},{get:(o,k)=>k in o?o[k]:k.startsWith('create')?()=>({}):k.startsWith('delete')?r=>deleted.push(r):()=>{}});
 const ctx2d={clearRect(){},save(){},restore(){},createRadialGradient:()=>({addColorStop(){}}),fillRect(){},beginPath(){},stroke(){},fill(){},arc(){},ellipse(x,y,rx,ry){assert.ok(rx>=0&&ry>=0,'no negative ripple radius');}};
 const parent={dataset:{},append:node=>children.add(node)};
 const context={Page20Video:{FILES:[]},console,Float32Array,Uint16Array,Image:class{decode(){return decode();}},window:{matchMedia:()=>({matches:reduced})},document:{hidden,
  createElement:tag=>({dataset:{},setAttribute(){},append(){},remove(){children.delete(this);},getContext:type=>type==='webgl'?(gpu?gl:null):ctx2d,addEventListener:(type,fn)=>events[type]=fn,removeEventListener:type=>delete events[type]})},
  performance:{now:()=>100},requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)};
 vm.createContext(context);vm.runInContext(source,context);const api=vm.runInContext('({SCENES,prepare,play,pose,envelope})',context);
 return {api,parent,children,frames,deleted,events,context,draws:()=>draws,tick:now=>{const f=[...frames.values()];frames.clear();f.forEach(fn=>fn(now));}};
}
test('the four retained continuous scenes animate, accept an earlier first RAF and settle after eight seconds',async()=>{
 for(const n of [12,15,18,24]){
  const s=setup();await s.api.prepare(n,'page.jpg');let ends=0;
  const stop=s.api.play(n,s.parent,()=>ends++);assert.equal(typeof stop,'function');
  s.tick(99);s.tick(1500);s.tick(8099);assert.equal(s.children.size,1);assert.ok(s.draws()>=4);
  s.tick(8100);assert.equal(ends,1);assert.equal(s.children.size,0);assert.equal(s.frames.size,0);assert.ok(s.deleted.length>=6);
  stop();assert.equal(ends,1);
 }
});
test('cancel, hidden tab and lost GPU context release resources without a late frame',async()=>{
 for(const reason of ['cancel','hidden','context']){
  const s=setup();await s.api.prepare(12,'page.jpg');let ends=0;const stop=s.api.play(12,s.parent,()=>ends++);
  s.tick(600);
  if(reason==='cancel')stop();
  if(reason==='hidden'){s.context.document.hidden=true;s.tick(700);}
  if(reason==='context')s.events.webglcontextlost({preventDefault(){}});
  assert.equal(s.children.size,0);assert.equal(s.frames.size,0);assert.equal(ends,reason==='cancel'?0:1);
  const count=s.draws();s.tick(2000);assert.equal(s.draws(),count);
 }
});
test('missing, unready, reduced-motion, hidden or unsupported scenes never hide reading',async()=>{
 for(const opts of [{},{decode:()=>Promise.reject(Error('offline'))},{reduced:true},{hidden:true},{gpu:false}]){
  const s=setup(opts);if(Object.keys(opts).length)await s.api.prepare(12,'page.jpg');
  assert.equal(s.api.play(12,s.parent,()=>assert.fail('no completion expected')),null);assert.equal(s.children.size,0);assert.equal(s.frames.size,0);
 }
});
test('each scene starts and finishes at the exact still, with small continuous joint movements',()=>{
 const {api}=setup();assert.deepEqual(Object.keys(api.SCENES),['12','15','18','20','24']);
 for(const scene of Object.values(api.SCENES).filter(scene=>scene.kind!=='video')){
  assert.ok(scene.parts.some(p=>p.name.startsWith('Artus')));assert.ok(scene.parts.some(p=>p.name.startsWith('Pip')));
  for(const time of [0,8000])for(const pair of api.pose(scene,time))for(const value of pair)assert.equal(Math.abs(value),0);
  let previous=api.pose(scene,0);
  for(let time=1000/60;time<8000;time+=1000/60){const next=api.pose(scene,time);next.forEach((pair,i)=>pair.forEach((v,j)=>{assert.ok(Number.isFinite(v));assert.ok(Math.abs(v-previous[i][j])<.014,'no stepped poses');}));previous=next;}
 }
});
