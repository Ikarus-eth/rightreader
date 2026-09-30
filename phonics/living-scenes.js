import * as Page20Video from './page20-video.js?v=13';
export const EXTRA_FILES=Page20Video.FILES;
// Continuous, connected texture meshes. Coordinates are fractions of the original
// 1086 × 1448 illustrations; rotations use image-height units to preserve shape.
// Each part turns about a fixed joint and feathers into its attached body.
const part=(name,region,pivot,angle,period,phase=0,stretch=0)=>({name,region,pivot,angle,period,phase,stretch});
const leaves=()=>part('canopy',[.25,.07,.30,.16],[.03,.02],.014,4.8);
export const SCENES={
 12:{parts:[
  part('Artus head',[.425,.313,.145,.106],[.376,.405],.035,4.8),
  part('Pip head',[.567,.43,.116,.086],[.625,.485],-.045,3.8,.4),
  part('Pip wing',[.771,.403,.14,.095],[.664,.464],.065,2.4,0,-.045),
  part('Pip tail',[.93,.52,.075,.079],[.87,.555],.09,3.3,.7),
  part('crow head',[.704,.551,.076,.068],[.782,.565],-.065,3.1),leaves()
 ],lights:[[.099,.337,.061]],water:[.623,.689,.106,.023]},
 15:{parts:[
  part('Artus head',[.397,.334,.137,.095],[.36,.419],.034,4.8),
  part('Artus reaching hand',[.427,.626,.055,.059],[.42,.59],.045,4.2),
  part('Pip head',[.565,.562,.107,.073],[.636,.604],-.045,3.6),
  part('Pip wing',[.807,.506,.144,.101],[.687,.588],.07,2.5,0,-.055),
  part('Pip tail',[.94,.657,.055,.102],[.869,.722],.11,3.2),
  part('loose leaves',[.882,.765,.13,.054],[.99,.77],.028,3.2,.5),leaves()
 ],lights:[[.094,.196,.07]],motes:[[.71,.29],[.62,.25],[.27,.29]]},
 18:{parts:[
  part('Artus head',[.495,.327,.097,.073],[.465,.391],.035,4.3),
  part('Artus hands and stones',[.513,.47,.083,.028],[.417,.452],.032,3.8),
  part('Artus cape',[.283,.521,.116,.076],[.4,.424],.028,4.4,.4),
  part('Pip head and pebble',[.366,.597,.084,.061],[.346,.651],-.046,3.6),
  part('Pip wing',[.197,.622,.119,.063],[.269,.651],.065,2.7,0,-.04),
  part('Pip tail',[.089,.658,.078,.072],[.182,.689],.065,3.8,.4),leaves()
 ],lights:[[.335,.315,.045],[.887,.115,.052]],motes:[[.68,.44],[.75,.335],[.17,.365]]},
 20:{kind:'video',parts:[]},
 24:{parts:[
  part('Artus head',[.424,.413,.136,.091],[.377,.497],.029,4.6),
  part('Pip head',[.639,.536,.099,.071],[.676,.595],-.042,3.9),
  part('Pip wing',[.802,.566,.101,.075],[.716,.619],.065,2.7,0,-.035),
  part('Pip tail',[.92,.656,.058,.089],[.844,.699],.08,3.7),
  part('moonflower petals',[.515,.687,.09,.045],[.514,.738],.017,4.8,0,.032),
  part('flower leaf',[.568,.771,.067,.04],[.507,.804],.035,4.2),leaves()
 ],lights:[[.51,.711,.125],[.904,.256,.058],[.678,.151,.037],[.842,.075,.03]],
  motes:[[.528,.59],[.564,.639],[.616,.73],[.876,.65],[.59,.432],[.732,.385]],stream:[.399,.66,.425,.791]}
};
export const DURATION=8000;
const images=new Map();
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function envelope(ms){return smooth(ms/850)*smooth((DURATION-ms)/1200);}
export function pose(scene,ms){
 const gain=envelope(ms),time=ms/1000;
 return scene.parts.map(p=>{const wave=Math.sin(time*2*Math.PI/p.period+p.phase)*gain;return [p.angle*wave,p.stretch*wave];});
}
export function prepare(number,src){
 if(number===20)return Page20Video.prepare();
 if(!SCENES[number])return Promise.resolve(null);
 if(!images.has(number)){
  const entry={image:null,promise:null};
  entry.promise=(async()=>{try{const img=new Image();img.src=src;await img.decode();entry.image=img;return img;}catch{images.delete(number);return null;}})();
  images.set(number,entry);
 }
 return images.get(number).promise;
}
const vertex=`
attribute vec2 aPoint;
varying vec2 vUV;
uniform vec4 uRegion[12];
uniform vec4 uJoint[12];
void main(){
 vec2 point=aPoint*vec2(.75,1.);vec2 moved=point;
 for(int i=0;i<12;i++){
  vec4 r=uRegion[i];vec4 j=uJoint[i];
  float distance=length((aPoint-r.xy)/max(r.zw,vec2(.0001)));
  float weight=1.-smoothstep(.48,1.,distance);
  vec2 arm=point-j.xy*vec2(.75,1.);
  float c=cos(j.z),s=sin(j.z);
  vec2 rotated=vec2(c*arm.x-s*arm.y,s*arm.x+c*arm.y);
  rotated.x*=1.+j.w;
  moved+=(rotated-arm)*weight;
 }
 gl_Position=vec4(moved.x/.75*2.-1.,1.-moved.y*2.,0.,1.);
 vUV=aPoint;
}`;
const fragment=`precision mediump float;varying vec2 vUV;uniform sampler2D uArt;void main(){gl_FragColor=texture2D(uArt,vUV);}`;

function meshRenderer(canvas,img,scene){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,preserveDrawingBuffer:false});
 if(!gl){console.warn('Scene animation: WebGL unavailable; keeping the still.');return null;}
 const resources=[];
 const release=()=>{for(const [type,r] of resources)gl['delete'+type](r);};
 try{
  const shader=(type,source)=>{const s=gl.createShader(type);resources.push(['Shader',s]);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();resources.push(['Program',program]);
  gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const nx=96,ny=128,points=[],indices=[];
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)points.push(x/nx,y/ny);
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+nx+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const buffer=(target,data)=>{const b=gl.createBuffer();resources.push(['Buffer',b]);gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);};
  buffer(gl.ARRAY_BUFFER,new Float32Array(points));buffer(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices));
  const attr=gl.getAttribLocation(program,'aPoint');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture();resources.push(['Texture',texture]);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
  const regions=new Float32Array(48),joints=new Float32Array(48);
  scene.parts.forEach((p,i)=>regions.set(p.region,i*4));
  gl.uniform4fv(gl.getUniformLocation(program,'uRegion[0]'),regions);
  const location=gl.getUniformLocation(program,'uJoint[0]');
  const draw=ms=>{
   pose(scene,ms).forEach(([angle,scale],i)=>joints.set([...scene.parts[i].pivot,angle,scale],i*4));
   gl.viewport(0,0,canvas.width,canvas.height);gl.uniform4fv(location,joints);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
  };
  draw(0);if(gl.getError()!==gl.NO_ERROR)throw Error('Unable to draw artwork');
  return {draw,release};
 }catch(error){console.warn('Scene animation: keeping the still.',error.message);release();return null;}
}
function effects(ctx,scene,ms){
 const t=ms/1000,gain=envelope(ms);ctx.clearRect(0,0,1086,1448);ctx.save();ctx.globalCompositeOperation='screen';
 for(const [x,y,r] of scene.lights||[]){
  const glow=ctx.createRadialGradient(x*1086,y*1448,0,x*1086,y*1448,r*1086);
  glow.addColorStop(0,`rgba(255,208,106,${gain*(.10+.045*Math.sin(t*2.1))})`);glow.addColorStop(1,'rgba(255,196,89,0)');
  ctx.fillStyle=glow;ctx.fillRect((x-r)*1086,y*1448-r*1086,r*2172,r*2172);
 }
 if(scene.water){const [x,y,rx,ry]=scene.water;
  for(let i=0;i<3;i++){const f=(t*.42+i/3)%1;ctx.beginPath();ctx.ellipse(x*1086,y*1448,rx*1086*f,ry*1448*f,0,0,Math.PI*2);ctx.strokeStyle=`rgba(248,211,146,${Math.sin(f*Math.PI)*gain*.38})`;ctx.lineWidth=1.3;ctx.stroke();}
 }
 for(const [i,[x,y]] of (scene.motes||[]).entries()){
  const px=(x+.005*Math.sin(t*1.2+i))*1086,py=(y+.009*Math.sin(t*.8+i*2))*1448;
  ctx.globalAlpha=gain*(.35+.3*Math.sin(t*1.7+i));ctx.shadowColor='#ffe2a0';ctx.shadowBlur=9;ctx.fillStyle='#fff3cf';ctx.beginPath();ctx.arc(px,py,1.4,0,Math.PI*2);ctx.fill();
 }
 ctx.globalAlpha=1;ctx.shadowBlur=0;
 if(scene.stream){const [x1,y1,x2,y2]=scene.stream;
  for(let i=0;i<12;i++){const f=(t*.85+i/12)%1;ctx.fillStyle=`rgba(245,240,219,${gain*Math.sin(f*Math.PI)*.65})`;ctx.beginPath();ctx.ellipse((x1+(x2-x1)*Math.sqrt(f))*1086,(y1+(y2-y1)*f)*1448,1,3,0,0,Math.PI*2);ctx.fill();}
 }
 ctx.restore();
}
export function play(number,parent,onEnd){
 if(number===20)return Page20Video.play(parent,onEnd);
 const scene=SCENES[number],img=images.get(number)?.image;
 if(!scene||!img||document.hidden||window.matchMedia('(prefers-reduced-motion: reduce)').matches){parent.dataset.motionStatus=!img?'unready':document.hidden?'hidden':'reduced';return null;}
 const layer=document.createElement('div');layer.className='living-scene';layer.setAttribute('aria-hidden','true');layer.dataset.page=number;
 const canvas=document.createElement('canvas'),overlay=document.createElement('canvas');
 // Cap GPU memory at the original artwork size; CSS keeps the original framing.
 canvas.width=overlay.width=1086;canvas.height=overlay.height=1448;
 layer.append(canvas,overlay);
 const renderer=meshRenderer(canvas,img,scene),ctx=overlay.getContext('2d');
 if(!renderer||!ctx){parent.dataset.motionStatus='unavailable';renderer?.release();return null;}
 parent.dataset.motionStatus='playing';
 parent.append(layer);let frame=0,closed=false,rendered=0;const start=performance.now();
 const stop=()=>{if(closed)return;closed=true;cancelAnimationFrame(frame);canvas.removeEventListener('webglcontextlost',lost);renderer.release();layer.remove();parent.dataset.motionStatus='stopped';};
 const finish=()=>{stop();onEnd();};
 const lost=e=>{e.preventDefault();finish();};canvas.addEventListener('webglcontextlost',lost);
 const tick=now=>{
  if(closed)return;
  const elapsed=Math.max(0,now-start);
  if(elapsed>=DURATION||document.hidden){finish();parent.dataset.motionStatus=document.hidden?'hidden':'finished';return;}
  try{renderer.draw(elapsed);effects(ctx,scene,elapsed);parent.dataset.motionFrames=String(++rendered);parent.dataset.motionElapsed=String(Math.round(elapsed));}catch(error){finish();parent.dataset.motionStatus=error.message;console.warn(error);return;}
  frame=requestAnimationFrame(tick);
 };
 frame=requestAnimationFrame(tick);return stop;
}
