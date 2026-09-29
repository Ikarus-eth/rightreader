import {LENGTH,IMPACT_TIMES,clamp,ease,crowState,stoneState,waterLevel,actors} from './crow-timeline.js?v=12';
export const FILES=['garden','artus','pip','crow','wing','stone','artus-gaze','pip-gaze'].map(name=>new URL(`./book/animation/page-20/${name}.webp`,import.meta.url).href);
let loading=null,art=null;
export function prepare(){
 if(!loading)loading=Promise.all(FILES.map(async url=>{const image=new Image();image.src=url;await image.decode();return image;})).then(images=>art=Object.fromEntries(['garden','artus','pip','crow','wing','stone','artus-gaze','pip-gaze'].map((name,i)=>[name,images[i]]))).catch(()=>{loading=null;return null;});
 return loading;
}
const W=1086,H=1448;
const smooth=t=>ease(t);
function rig(x,y,parts){let px=x,py=y;
 for(const p of parts){const d=Math.hypot((x-p.cx)/p.rx,(y-p.cy)/p.ry),w=1-smooth((d-.48)/.52);if(w===0)continue;
  const dx=x-p.jx,dy=y-p.jy,c=Math.cos(p.angle||0),s=Math.sin(p.angle||0);
  px+=w*(dx*c-dy*s-dx+(p.dx||0));py+=w*(dx*s+dy*c-dy+(p.dy||0));
 }
 return [px,py];
}
function joint(cx,cy,rx,ry,jx,jy,angle,dx=0,dy=0){return {cx,cy,rx,ry,jx,jy,angle,dx,dy};}
class Stage{
 constructor(canvas){
  this.gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:false,preserveDrawingBuffer:false});if(!this.gl)throw Error('Graphics unavailable');
  const g=this.gl;this.resources=[];this.meshes=[];
  const shader=(kind,source)=>{const s=g.createShader(kind);this.resources.push(['Shader',s]);g.shaderSource(s,source);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s;};
  const program=g.createProgram();this.resources.push(['Program',program]);
  g.attachShader(program,shader(g.VERTEX_SHADER,'attribute vec4 aVertex; varying vec2 vUV; void main(){gl_Position=vec4(aVertex.x/543.-1.,1.-aVertex.y/724.,0.,1.);vUV=aVertex.zw;}'));
  g.attachShader(program,shader(g.FRAGMENT_SHADER,'precision mediump float; varying vec2 vUV; uniform sampler2D uTexture;uniform sampler2D uLook;uniform vec2 uTone;uniform vec4 uEyes[2];uniform vec3 uLookMap;uniform float uGaze;void main(){vec4 c=texture2D(uTexture,vUV);float mask=0.;for(int i=0;i<2;i++){float d=length((vUV-uEyes[i].xy)/max(uEyes[i].zw,vec2(.0001)));mask=max(mask,1.-smoothstep(.72,1.,d));}c=mix(c,texture2D(uLook,vUV*uLookMap.x+uLookMap.yz),mask*uGaze);gl_FragColor=vec4(c.rgb*uTone.x,c.a)*uTone.y;}'));
  g.linkProgram(program);if(!g.getProgramParameter(program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(program));g.useProgram(program);
  g.uniform1i(g.getUniformLocation(program,'uTexture'),0);g.uniform1i(g.getUniformLocation(program,'uLook'),1);this.eyes=g.getUniformLocation(program,'uEyes[0]');this.gaze=g.getUniformLocation(program,'uGaze');this.lookMap=g.getUniformLocation(program,'uLookMap');
  this.attribute=g.getAttribLocation(program,'aVertex');this.tone=g.getUniformLocation(program,'uTone');g.enableVertexAttribArray(this.attribute);
  g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);g.viewport(0,0,W,H);
 }
 mesh(image,nx=1,ny=1){const g=this.gl,uv=[],indices=[];
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)uv.push([x/nx,y/ny]);
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+nx+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const m=this.raw(image,uv,indices);this.meshes.push(m);return m;
 }
 raw(image,uv,indices){const g=this.gl,texture=g.createTexture(),vertices=g.createBuffer(),elements=g.createBuffer();this.resources.push(['Texture',texture],['Buffer',vertices],['Buffer',elements]);
  g.bindTexture(g.TEXTURE_2D,texture);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
  g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,image);g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,elements);g.bufferData(g.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),g.STATIC_DRAW);
  return {texture,vertices,elements,uv,data:new Float32Array(uv.length*4),count:indices.length,width:image.width,height:image.height};
 }
 refresh(mesh,canvas){const g=this.gl;g.bindTexture(g.TEXTURE_2D,mesh.texture);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,canvas);}
 draw(mesh,map,shade=1,opacity=1,look=null){const g=this.gl,d=mesh.data;
  mesh.uv.forEach(([u,v],i)=>{const p=map(u*mesh.width,v*mesh.height,u,v);d.set([p[0],p[1],u,v],i*4);});
  g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,look?.mesh.texture||mesh.texture);g.uniform1f(this.gaze,look?.amount||0);g.uniform4fv(this.eyes,look?.eyes||new Float32Array(8));g.uniform3fv(this.lookMap,look?.map||[1,0,0]);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,mesh.texture);g.bindBuffer(g.ARRAY_BUFFER,mesh.vertices);g.bufferData(g.ARRAY_BUFFER,d,g.DYNAMIC_DRAW);g.vertexAttribPointer(this.attribute,4,g.FLOAT,false,0,0);g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,mesh.elements);g.uniform2f(this.tone,shade,opacity);g.drawElements(g.TRIANGLES,mesh.count,g.UNSIGNED_SHORT,0);
 }
 clear(){const g=this.gl;g.clearColor(.04,.08,.06,1);g.clear(g.COLOR_BUFFER_BIT);}
 release(){for(const [kind,r] of this.resources)this.gl['delete'+kind](r);this.resources=[];}
}
const canvas2D=()=>{const c=document.createElement('canvas');c.width=600;c.height=300;return c;};
function waterPaint(canvas,t,splashOnly=false){
 const c=canvas.getContext('2d'),level=waterLevel(t);c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,600,300);c.setTransform(600/460,0,0,300/230,-480*600/460,-710*300/230);
 c.save();
 if(!splashOnly){
  // The stone interior and lip are never moved. Only the water plane rises.
  c.beginPath();c.ellipse(710,865,169,27,0,0,2*Math.PI);c.clip();
  const depth=(880-level)/22,ry=15+10*depth;
  c.beginPath();c.ellipse(710,level,162,ry,0,0,Math.PI*2);c.clip();
  const fill=c.createLinearGradient(0,level-ry,0,level+ry);fill.addColorStop(0,'#1e2e3c');fill.addColorStop(.38,'#1b2834');fill.addColorStop(.7,'#344754');fill.addColorStop(1,'#243943');c.fillStyle=fill;c.fillRect(535,820,350,90);
  // A still reflected patch of the painted sky supplies the water's texture.
  // Local ripples break that reflection only after a stone hits it.
  c.save();c.globalAlpha=.40;c.translate(710,level);c.scale(1,-1);c.drawImage(art.garden,548,100,324,660,-162,-ry,324,ry*2);c.restore();
  const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  for(let i=0;i<420;i++){const yy=level-ry+noise(i*3+1)*ry*2,xx=548+noise(i*3+2)*324;
   const light=noise(i*3+3);c.strokeStyle=light>.78?`rgba(228,174,101,${.1+noise(i+54)*.2})`:`rgba(99,128,155,${.07+noise(i+21)*.16})`;c.lineWidth=.35+noise(i+14)*.7;
   c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+2+noise(i+89)*13,yy+noise(i+98)*.3);c.stroke();
  }
  for(let index=0;index<2;index++){const age=t-IMPACT_TIMES[index];if(age<0||age>3)continue;const impact=stoneState(IMPACT_TIMES[index]-.0001,index);
   for(let k=0;k<4;k++){const r=age*78-k*18;if(r<=0||r>210)continue;const alpha=(1-age/3)*.48*Math.min(1,r/10);c.beginPath();c.ellipse(impact.x,level,r,r*.17,0,k*.7,k*.7+Math.PI*1.7);c.lineWidth=1.35;c.strokeStyle=`rgba(227,224,195,${alpha})`;c.stroke();}
  }
 }else{
  for(let index=0;index<2;index++){const age=t-IMPACT_TIMES[index];if(age<0||age>1.05)continue;const p=stoneState(IMPACT_TIMES[index]-.0001,index),base=waterLevel(t);
   // A short crown, then ballistic droplets. Neither repeats before an impact.
   if(age<.22){const f=age/.22;c.strokeStyle=`rgba(240,231,200,${.75*(1-f)})`;c.lineWidth=1.8;c.beginPath();c.ellipse(p.x,base,5+18*f,2+5*f,0,Math.PI,Math.PI*2);c.stroke();}
   for(let j=0;j<11;j++){const direction=(j-5)/5,velocity=85+((j*37)%55),x=p.x+direction*65*age,y=base-velocity*age+150*age*age;if(y>base+3)continue;
    c.globalAlpha=Math.max(0,(1-age/1.05))*.8;c.fillStyle=j%3?'#cedbdc':'#fff0c0';c.beginPath();c.ellipse(x,y,1.1+((j*7)%3)*.3,2.6,Math.atan2(direction*65,-velocity+300*age),0,Math.PI*2);c.fill();
   }
  }
 }
 c.restore();
}
function birdTransform(crow,x,y){const c=Math.cos(crow.bank),s=Math.sin(crow.bank);return [crow.x+(x*c-y*s)*crow.scale,crow.y+(x*s+y*c)*crow.scale];}
export function wingPoint(x,y,c,far){const dx=(x-1150)*.17,dy=(y-1020)*.17,span=-dx*.64-dy*.77,chord=dx*.77-dy*.64;
    const tip=clamp(Math.hypot(dx,dy)/245),lag=.19*tip*Math.sin(c.phase-.7),phi=c.flap+lag+(far?.08:0);
    const fold=1-.13*tip*(.5-.5*Math.sin(c.phase));const length=span*fold,depth=length*Math.cos(phi)*(far?1:-1);
    const xx=chord*.85+length*.22+depth*.8,yy=-length*Math.sin(phi)-.12*depth+chord*.08+5*tip*Math.sin(c.phase-.9);
    return birdTransform(c,(far?8:18)+xx*(far?.84:1),(far?-15:-5)+yy*(far?.84:1));}
export function buildScene(container){
 if(!art)throw Error('Scene assets are not ready');
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;container.append(canvas);
 let stage;try{stage=new Stage(canvas);}catch(error){canvas.remove();throw error;}
 const bg=stage.mesh(art.garden),boy=stage.mesh(art.artus,44,66),dragon=stage.mesh(art.pip,42,58),bird=stage.mesh(art.crow,24,16),wing=stage.mesh(art.wing,25,29),stone=stage.mesh(art.stone);
 const boyLook=stage.mesh(art['artus-gaze']),pipLook=stage.mesh(art['pip-gaze']);
 const water=canvas2D(),splash=canvas2D(),waterMesh=stage.mesh(water),splashMesh=stage.mesh(splash);
 // A static copy of the foreground jar occludes the dragon's lower body.
 const rim=[[501,864],[522,880],[563,892],[619,898],[692,901],[765,899],[828,892],[878,880],[915,861],[940,940],[946,1260],[810,1340],[542,1310],[475,1110]];
 const uv=[[710/W,1130/H],...rim.map(([x,y])=>[x/W,y/H])],indices=[];for(let i=1;i<uv.length;i++)indices.push(0,i,i===uv.length-1?1:i+1);
 const front=stage.raw(art.garden,uv,indices);
 function render(time){const t=clamp(time,0,LENGTH),a=actors(t);stage.clear();stage.draw(bg,(x,y)=>[x,y]);waterPaint(water,t);stage.refresh(waterMesh,water);stage.draw(waterMesh,(x,y)=>[480+x*460/600,710+y*230/300]);
  const boyParts=[joint(604,265,185,186,605,443,a.head),joint(620,610,310,360,575,970,a.lean),joint(735,629,77,122,764,735,-a.lean*.9),joint(292,895,155,292,485,750,-a.lean*.7)];
  stage.draw(boy,(x,y)=>{const p=rig(x,y,boyParts);return [-74+p[0]*.625,310+p[1]*.625];},1,1,{mesh:boyLook,amount:a.gaze,eyes:[.568,.209,.045,.03,.641,.191,.031,.025],map:[1,0,0]});
  const pipParts=[joint(725,275,295,245,750,484,a.pipHead),joint(788,708,222,338,735,1170,a.pipLean),joint(277,1130,260,225,567,1207,a.tail),joint(366,745,240,238,657,735,-a.pipLean*.8),joint(795,612,150,115,733,690,-a.pipLean*.7,0,-a.surprise*8)];
  stage.draw(dragon,(x,y)=>{const p=rig(x,y,pipParts);return [220+p[0]*.39,610+p[1]*.39];},1,1,{mesh:pipLook,amount:a.gaze,eyes:[.69,.185,.058,.039,.8,.151,.03,.028],map:[1.037,-3/1086,-1/1448]});
  stage.draw(front,(x,y)=>[x,y]);
  // Far bird first, then near bird; wing roots and beak props share body transforms.
  for(const index of [1,0]){const c=crowState(t,index);if(!c.visible)continue;
   const wingMap=far=>(x,y)=>wingPoint(x,y,c,far);
   stage.draw(wing,wingMap(true),.72);
   stage.draw(wing,wingMap(false),.94+.05*Math.sin(c.phase));
   stage.draw(bird,(x,y)=>birdTransform(c,(x-690)*.15,(y-485)*.15));
  }
  for(let i=0;i<2;i++){const p=stoneState(t,i);if(!p.visible)continue;const cs=Math.cos(p.rotation),sn=Math.sin(p.rotation),size=36;
   stage.draw(stone,(x,y,u,v)=>{const dx=(u-.5)*size,dy=(v-.5)*size;return [p.x+dx*cs-dy*sn,p.y+dx*sn+dy*cs];});
  }
  waterPaint(splash,t,true);stage.refresh(splashMesh,splash);stage.draw(splashMesh,(x,y)=>[480+x*460/600,710+y*230/300]);
  container.dataset.time=t.toFixed(3);container.dataset.waterLevel=waterLevel(t).toFixed(2);
 }
 render(0);
 return {canvas,render,release:()=>stage.release()};
}
export function play(parent,onEnd){
 if(!art||document.hidden||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return null;
 parent.querySelector('.scene20-settled')?.remove();
 const layer=document.createElement('div');layer.className='living-scene scene20';layer.dataset.page='20';layer.setAttribute('aria-hidden','true');parent.append(layer);
 let scene;try{scene=buildScene(layer);}catch{layer.remove();return null;}
 let frame=0,closed=false,count=0;const started=performance.now();parent.dataset.motionStatus='playing';
 const stop=()=>{if(closed)return;closed=true;cancelAnimationFrame(frame);scene.canvas.removeEventListener('webglcontextlost',lost);
  try{scene.render(LENGTH);const still=document.createElement('canvas');still.width=W;still.height=H;still.getContext('2d').drawImage(scene.canvas,0,0);layer.replaceChildren(still);layer.className='scene20-settled';}catch{layer.remove();}
  scene.release();parent.dataset.motionStatus='stopped';
 };
 const lost=e=>{e.preventDefault();stop();layer.remove();onEnd();};scene.canvas.addEventListener('webglcontextlost',lost);
 const tick=now=>{if(closed)return;const elapsed=Math.max(0,(now-started)/1000);
  if(elapsed>=LENGTH||document.hidden){stop();parent.dataset.motionStatus=elapsed>=LENGTH?'finished':'hidden';onEnd();return;}
  try{scene.render(elapsed);}catch{stop();onEnd();return;}
  parent.dataset.motionFrames=String(++count);parent.dataset.motionElapsed=String(Math.round(elapsed*1000));frame=requestAnimationFrame(tick);
 };
 frame=requestAnimationFrame(tick);return stop;
}
