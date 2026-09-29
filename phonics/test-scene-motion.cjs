const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

// Exercise the actual motion controller with a deterministic clock and image loads.
function scene({reduced=false,decode=()=>Promise.resolve()}={}){
 const nodes=new Map(),frames=new Map(),reading={inert:false};let next=0;
 const classes=new Set(),listeners={};
 const page={classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},querySelector:s=>s==='.reading-panel'?reading:s==='.picture-panel'?page:nodes.get(s),append:n=>nodes.set('.'+n.className,n)};
 const preference={matches:reduced,addEventListener:(name,fn)=>listeners[name]=fn};
 const ctx={LivingScenes:{SCENES:{},play:()=>null},window:{matchMedia:()=>preference},document:{hidden:false,querySelector:()=>page,createElement:()=>({setAttribute(){},append(){},remove(){nodes.delete('.'+this.className);}})},Image:class{constructor(){this.style={};}decode(){return decode();}},performance:{now:()=>0},requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id)};
 vm.createContext(ctx);
 const source=fs.readFileSync(__dirname+'/reader.js','utf8').replace(/^import .*\n/,'');
 vm.runInContext(source.slice(0,source.indexOf('const $=')),ctx);
 return {ctx,nodes,frames,reading,classes,preference,listeners,
  preload:async()=>{vm.runInContext('preloadMotion()',ctx);await vm.runInContext('motionLoading',ctx);},
  play:()=>vm.runInContext('playPageTwoMotion()',ctx),
  stop:()=>vm.runInContext('stopMotion()',ctx),
  tick:time=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));}};
}

test('one four-second sequence restores reading and leaves no scheduled work',async()=>{
 const s=scene();await s.preload();s.play();
 assert.ok(s.nodes.has('.scene-motion'));assert.equal(s.reading.inert,true);
 s.tick(700);s.tick(2100);s.tick(3999);
 assert.ok(s.nodes.has('.scene-motion'));
 s.tick(4000);
 assert.equal(s.nodes.has('.scene-motion'),false);assert.equal(s.nodes.has('.skip-motion'),false);
 assert.equal(s.reading.inert,false);assert.equal(s.frames.size,0);assert.equal(s.classes.size,0);
 s.tick(9000);assert.equal(s.nodes.size,0);
});
test('Read now, leaving the page and reduced motion cancel without a late callback',async()=>{
 for(const reason of ['read-now','leave','reduced']){
  const s=scene();await s.preload();s.play();s.tick(700);
  if(reason==='read-now')s.nodes.get('.skip-motion').onclick();
  else if(reason==='leave')s.stop();
  else s.listeners.change({matches:true});
  assert.equal(s.nodes.size,0,reason);assert.equal(s.frames.size,0,reason);assert.equal(s.reading.inert,false,reason);
  s.tick(4000);assert.equal(s.nodes.size,0,reason);
 }
});
test('unready, failed, hidden and reduced-motion cases keep the still readable',async()=>{
 const unready=scene();unready.play();assert.equal(unready.nodes.size,0);
 const failed=scene({decode:()=>Promise.reject(Error('missing frame'))});await failed.preload();failed.play();assert.equal(failed.nodes.size,0);
 const reduced=scene({reduced:true});await reduced.preload();reduced.play();assert.equal(reduced.nodes.size,0);
 const hidden=scene();await hidden.preload();hidden.ctx.document.hidden=true;hidden.play();assert.equal(hidden.nodes.size,0);
 for(const s of [unready,failed,reduced,hidden])assert.equal(s.reading.inert,false);
});
