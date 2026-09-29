// Page 20 has a beginning, two deliveries, and a held result. Seconds, image pixels.
export const LENGTH=12;
export const DROP_TIMES=[4.15,6.65];
export const FALL_TIME=.68;
export const IMPACT_TIMES=DROP_TIMES.map(t=>t+FALL_TIME);
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
export function track(keys,t){
 if(t<=keys[0][0])return keys[0][1];
 for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const f=ease((t-keys[i-1][0])/(keys[i][0]-keys[i-1][0]));return keys[i-1][1]+(keys[i][1]-keys[i-1][1])*f;}
 return keys.at(-1)[1];
}
function bezier(a,b,c,d,t){const u=1-t;return u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d;}
export function crowState(t,index){
 const start=index?2.55:.55,arrival=index?5.85:3.35,release=DROP_TIMES[index],leave=release+.62,end=leave+2.5;
 const hover=index?[830,491]:[705,465];let x,y,scale,bank;
 if(t<arrival){const f=ease((t-start)/(arrival-start));
  x=bezier(1230,1100,hover[0]+20,hover[0],f);y=bezier(index?95:15,index?245:110,hover[1]-150,hover[1],f);
  scale=.45+.55*ease(f);bank=track([[0,.28],[.55,.12],[1,-.04]],f);
 }else if(t<leave){const q=t-arrival,gain=ease(q/.3)*ease((leave-t)/.3);x=hover[0]+3*Math.sin(q*2.6)*gain;y=hover[1]+4*Math.sin(q*3.5)*gain;scale=1;bank=-.04+.025*Math.sin(q*2.2);
 }else{const f=ease((t-leave)/(end-leave));x=bezier(hover[0],hover[0]-120,130,-280,f);y=bezier(hover[1],hover[1]-10,80,-90,f);scale=1-.22*ease(f);bank=-.04-.20*ease(f);}
 const phase=(t-start)*Math.PI*2*(index?2.75:3.05)+index*.7;
 const flap=.10+1.18*Math.cos(phase+.17*Math.sin(phase));
 return {x,y,scale,bank,phase,flap,visible:t>=start&&t<=end,carrying:t<release,release};
}
// The same transformed beak point is used before and at release: no teleport.
export function beakPoint(crow){const x=-61*crow.scale,y=37*crow.scale,c=Math.cos(crow.bank),s=Math.sin(crow.bank);return {x:crow.x+x*c-y*s,y:crow.y+x*s+y*c};}
export function stoneState(t,index){
 const release=DROP_TIMES[index],impact=IMPACT_TIMES[index];
 if(t<release){const crow=crowState(t,index);return {...beakPoint(crow),visible:crow.visible,falling:false,rotation:crow.bank};}
 const point=beakPoint(crowState(release,index));const f=clamp((t-release)/FALL_TIME),targetY=waterLevel(impact-.001);
 return {x:point.x+7*f,y:point.y+(targetY-point.y)*f*f,visible:t<impact,falling:true,rotation:(t-release)*3.2};
}
export function waterLevel(t){return 880-IMPACT_TIMES.reduce((rise,impact)=>rise+11*ease((t-impact)/.75),0);}
export function actors(t){
 const head=track([[0,.16],[.6,.16],[1.5,-.12],[3.3,-.15],[4.1,-.06],[4.85,.20],[5.25,.12],[5.85,-.12],[6.65,-.08],[7.38,.24],[8.4,.18],[9.8,.10],[12,.13]],t);
 const lean=track([[0,0],[1.8,-.026],[3.4,-.025],[4.9,.034],[5.9,-.018],[7.5,.046],[8.5,.029],[12,.024]],t);
 const surprise=Math.exp(-(((t-4.83)/.2)**2))+Math.exp(-(((t-7.33)/.23)**2));
 const gaze=track([[0,1],[.9,1],[1.04,0],[4.30,0],[4.44,1],[5.45,1],[5.59,0],[6.78,0],[6.92,1],[12,1]],t);
 return {gaze,head,lean:lean*1.65,pipHead:head*1.12,pipLean:lean*1.75,surprise,tail:track([[0,0],[1.7,.12],[3.4,-.08],[5,.10],[6.2,-.10],[8,.12],[10,.035],[12,.035]],t)};
}
