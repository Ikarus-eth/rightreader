// Reviewed page-20 film. The reader plays this once, then holds the ending still.
const movieURL=new URL('./book/animation/page-20/elevenlabs-scene.mp4',import.meta.url).href;
const stillURL=new URL('./book/animation/page-20/elevenlabs-ending.webp',import.meta.url).href;
export const FILES=[movieURL,stillURL];
let loading=null,ready=null;
export function prepare(){
 if(!loading)loading=Promise.all([
  fetch(movieURL).then(r=>{if(!r.ok)throw Error('Scene unavailable');return r.blob();}),
  (async()=>{const image=new Image();image.src=stillURL;await image.decode();return image;})()
 ]).then(([blob,image])=>ready={source:URL.createObjectURL(blob),image}).catch(()=>{loading=null;return null;});
 return loading;
}
export function play(parent,onEnd){
 if(!ready||document.hidden||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return null;
 parent.querySelector('.scene20-settled')?.remove();
 const layer=document.createElement('div'),video=document.createElement('video');
 layer.className='living-scene scene20-video';layer.setAttribute('aria-hidden','true');
 video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='auto';video.src=ready.source;
 video.setAttribute('playsinline','');video.setAttribute('aria-hidden','true');
 video.style.cssText='display:block;width:100%;height:100%;object-fit:contain';
 layer.append(video);parent.append(layer);parent.dataset.motionStatus='loading';
 let closed=false,watchdog;
 const stop=(hold=true)=>{
  if(closed)return;closed=true;clearTimeout(watchdog);
  video.removeEventListener('ended',ended);video.removeEventListener('error',failed);
  video.removeEventListener('playing',playing);video.removeEventListener('waiting',waiting);
  video.pause();video.removeAttribute('src');video.load();
  if(hold){const still=ready.image.cloneNode();still.alt='';still.style.cssText='display:block;width:100%;height:100%;object-fit:contain';layer.replaceChildren(still);layer.className='scene20-settled';}
  else layer.remove();
  parent.dataset.motionStatus='stopped';
 };
 const ended=()=>{stop();parent.dataset.motionStatus='finished';onEnd();};
 const failed=()=>{stop(false);parent.dataset.motionStatus='unavailable';onEnd();};
 const playing=()=>{clearTimeout(watchdog);parent.dataset.motionStatus='playing';};
 const waiting=()=>{clearTimeout(watchdog);watchdog=setTimeout(failed,8000);};
 video.addEventListener('ended',ended);video.addEventListener('error',failed);
 video.addEventListener('playing',playing);video.addEventListener('waiting',waiting);
 waiting();video.play().catch(()=>{if(!closed)failed();});
 return ()=>stop();
}
