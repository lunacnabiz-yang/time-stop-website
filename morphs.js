/* Approved age-change sequences, scoped to their own players. */
(()=>{

function setupFamilyMorph(rootId,row){
const root=document.getElementById(rootId);
const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');
const W=340,H=340;
const original=new Image();
original.src=document.getElementById('family-sheet').src;
// Corresponding face anchors: jaw, eyebrows, eyes, nose and lips.
const faceRows=[
 [
 [[121,235],[136,298],[164,345],[207,378],[253,393],[302,375],[344,340],[371,287],[390,230],[180,199],[209,194],[237,199],[275,196],[304,193],[334,198],[191,225],[210,225],[231,224],[285,224],[304,223],[323,224],[254,246],[237,278],[254,287],[272,278],[213,316],[254,309],[298,314],[255,327],[255,344]],
 [[120,231],[132,295],[160,342],[205,380],[256,397],[306,379],[346,341],[375,288],[390,229],[180,192],[210,187],[239,193],[278,190],[307,185],[337,191],[191,218],[211,218],[233,218],[286,217],[307,216],[328,217],[257,245],[239,282],[258,292],[275,281],[215,318],[258,312],[301,317],[258,330],[258,349]],
 [[123,231],[135,298],[165,350],[211,389],[262,405],[312,384],[352,344],[378,287],[392,228],[183,189],[214,185],[242,191],[283,187],[312,184],[341,191],[194,217],[214,216],[236,217],[290,217],[312,217],[333,217],[261,245],[241,285],[261,296],[279,285],[216,321],[260,313],[304,320],[261,333],[262,353]]
 ],
 [
 [[115,229],[129,294],[157,347],[205,388],[254,404],[303,385],[346,340],[374,283],[391,222],[174,190],[207,183],[235,190],[275,184],[303,179],[335,186],[187,215],[207,214],[228,215],[282,212],[303,210],[324,212],[254,242],[234,281],[255,293],[274,279],[213,324],[254,315],[300,321],[256,335],[256,355]],
 [[119,229],[132,295],[161,348],[206,388],[256,404],[305,385],[348,341],[375,284],[391,223],[175,189],[206,182],[235,189],[275,183],[304,179],[335,186],[186,215],[206,214],[228,215],[283,213],[304,212],[325,213],[255,243],[236,282],[256,294],[275,282],[213,325],[255,316],[300,322],[257,336],[257,354]],
 [[120,227],[133,294],[163,347],[209,387],[259,404],[307,384],[350,340],[376,283],[390,221],[183,185],[214,179],[242,186],[281,180],[309,177],[338,184],[194,212],[214,211],[235,212],[289,210],[309,209],[330,211],[258,241],[239,280],[259,292],[277,280],[215,320],[258,312],[302,318],[259,332],[260,351]]
 ]
];
const raw=faceRows[row].map(face=>face.map(p=>p.map(v=>v*340/512)));
const boundary=[[0,0],[170,0],[340,0],[340,170],[340,340],[170,340],[0,340],[0,170]];
const surfaces=[],points=[];
const temp=document.createElement('canvas');temp.width=W;temp.height=H;const tctx=temp.getContext('2d');
let triangles=[],running=!matchMedia('(prefers-reduced-motion: reduce)').matches,elapsed=0,last=0,ready=false;
let inView=false;
if('IntersectionObserver' in window){
 const visibility=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;},{threshold:0.1});
 visibility.observe(root);
}else{inView=true;}
const motion=matchMedia('(prefers-reduced-motion: reduce)');
motion.addEventListener('change',event=>{running=!event.matches;});

function circumContains(a,b,c,p){
 const ax=a[0]-p[0],ay=a[1]-p[1],bx=b[0]-p[0],by=b[1]-p[1],cx=c[0]-p[0],cy=c[1]-p[1];
 const det=(ax*ax+ay*ay)*(bx*cy-cx*by)-(bx*bx+by*by)*(ax*cy-cx*ay)+(cx*cx+cy*cy)*(ax*by-bx*ay);
 const orient=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 return orient>0?det>1e-7:det< -1e-7;
}
function triangulate(input){
 const n=input.length,ps=input.concat([[-4000,-4000],[5000,-4000],[0,6000]]);let ts=[[n,n+1,n+2]];
 for(let i=0;i<n;i++){
  const bad=ts.filter(t=>circumContains(ps[t[0]],ps[t[1]],ps[t[2]],ps[i]));const edges=new Map();
  bad.forEach(t=>{[[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]].forEach(e=>{const k=e.slice().sort((a,b)=>a-b).join(',');if(edges.has(k))edges.delete(k);else edges.set(k,e);});});
  const removed=new Set(bad);ts=ts.filter(t=>!removed.has(t));edges.forEach(e=>ts.push([e[0],e[1],i]));
 }
 return ts.filter(t=>t.every(v=>v<n));
}
function affine(src,dst){
 const [s0,s1,s2]=src,[d0,d1,d2]=dst;
 const x1=s1[0]-s0[0],y1=s1[1]-s0[1],x2=s2[0]-s0[0],y2=s2[1]-s0[1],det=x1*y2-x2*y1;
 if(Math.abs(det)<1e-6)return null;
 const u1=d1[0]-d0[0],u2=d2[0]-d0[0],v1=d1[1]-d0[1],v2=d2[1]-d0[1];
 const a=(u1*y2-u2*y1)/det,c=(u2*x1-u1*x2)/det,b=(v1*y2-v2*y1)/det,d=(v2*x1-v1*x2)/det;
 return[a,b,c,d,d0[0]-a*s0[0]-c*s0[1],d0[1]-b*s0[0]-d*s0[1]];
}
function warp(index,destination){
 tctx.setTransform(1,0,0,1,0,0);tctx.clearRect(0,0,W,H);
 for(const ids of triangles){
  const src=ids.map(i=>points[index][i]),dst=ids.map(i=>destination[i]),m=affine(src,dst);if(!m)continue;
  const center=[dst.reduce((s,p)=>s+p[0],0)/3,dst.reduce((s,p)=>s+p[1],0)/3];
  const clip=dst.map(p=>{const dx=p[0]-center[0],dy=p[1]-center[1],r=Math.hypot(dx,dy)||1;return[p[0]+dx*.45/r,p[1]+dy*.45/r];});
  tctx.save();tctx.beginPath();tctx.moveTo(...clip[0]);tctx.lineTo(...clip[1]);tctx.lineTo(...clip[2]);tctx.closePath();tctx.clip();tctx.setTransform(...m);tctx.drawImage(surfaces[index],0,0);tctx.restore();
 }
}
function render(){
 if(!ready)return;
 // Hold each portrait, then interpolate facial geometry and image colour.
 const order=[0,1,2,1],cycle=24000,local=elapsed%cycle,segment=Math.floor(local/6000),clock=local%6000;
 const from=order[segment],to=order[(segment+1)%4],linear=Math.max(0,Math.min(1,(clock-3000)/3000));
 const mix=linear*linear*(3-2*linear);
 if(mix===0){ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.drawImage(surfaces[from],0,0);return;}
 const dest=points[from].map((p,i)=>[p[0]*(1-mix)+points[to][i][0]*mix,p[1]*(1-mix)+points[to][i][1]*mix]);
 ctx.clearRect(0,0,W,H);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1-mix;warp(from,dest);ctx.drawImage(temp,0,0);
 ctx.globalCompositeOperation='lighter';ctx.globalAlpha=mix;warp(to,dest);ctx.drawImage(temp,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
}
function frame(now){const active=running&&inView&&!document.hidden;if(last&&active)elapsed+=Math.min(now-last,100);last=now;if(active)render();requestAnimationFrame(frame);}
original.onload=()=>{
 const crops=[[0,512],[512,512],[1024,512]];
 raw.forEach((landmarks,index)=>{
  const face=document.createElement('canvas');face.width=W;face.height=H;const f=face.getContext('2d');
  const left=landmarks[16],right=landmarks[19],dx=right[0]-left[0],dy=right[1]-left[1],den=dx*dx+dy*dy;
  const a=64*dx/den,b=-64*dy/den,tx=138-a*left[0]+b*left[1],ty=146-b*left[0]-a*left[1];
  f.fillStyle='#53666a';f.fillRect(0,0,W,H);f.setTransform(a,b,-b,a,tx,ty);f.drawImage(original,crops[index][0],row*512,crops[index][1],512,0,0,W,H);surfaces.push(face);
  points.push(boundary.concat(landmarks.map(p=>[a*p[0]-b*p[1]+tx,b*p[0]+a*p[1]+ty])));
 });
 const mean=points[0].map((_,i)=>[points.reduce((s,p)=>s+p[i][0],0)/3,points.reduce((s,p)=>s+p[i][1],0)/3]);
 triangles=triangulate(mean);ready=true;render();requestAnimationFrame(frame);
};
original.onerror=()=>{root.querySelector('.caption').textContent='이미지를 불러오지 못했습니다.';running=false;};
}
setupFamilyMorph('grandson-morph',0);
setupFamilyMorph('grandfather-morph',1);

})();

(()=>{
const root=document.getElementById('home-reunion-morph');
const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');
const W=680,H=403;
const original=new Image();
original.src='assets/home-reunion-keyframes.jpg';
// Corresponding face anchors: jaw, eyebrows, eyes, nose and lips.
const faces=[
 [
 [[219,252],[227,289],[252,325],[294,345],[333,353],[368,335],[386,306],[392,271],[388,237],[306,221],[333,215],[348,221],[360,211],[375,208],[385,214],[325,238],[335,238],[346,236],[367,228],[374,226],[382,226],[367,246],[367,267],[380,276],[387,269],[345,303],[363,296],[378,299],[363,308],[360,321]],
 [[573,181],[565,224],[576,276],[604,322],[641,351],[681,340],[720,305],[751,263],[772,219],[578,166],[590,160],[609,172],[626,172],[642,177],[663,190],[580,190],[589,190],[600,193],[629,198],[640,202],[654,208],[599,213],[579,241],[591,254],[612,250],[587,279],[607,274],[627,283],[607,290],[614,308]]
 ],
 [
 [[219,231],[227,271],[253,304],[296,324],[337,327],[371,311],[388,284],[392,250],[388,214],[306,187],[333,181],[348,188],[361,176],[377,173],[386,181],[325,204],[335,202],[346,201],[368,191],[377,189],[385,190],[370,215],[369,233],[382,243],[390,236],[346,274],[365,266],[382,269],[366,279],[363,292]],
 [[573,175],[566,218],[578,266],[606,308],[643,335],[683,326],[724,293],[753,252],[773,211],[578,161],[590,156],[608,167],[625,166],[641,171],[664,181],[580,185],[589,185],[600,187],[629,192],[640,196],[654,202],[599,208],[579,235],[592,248],[613,242],[588,271],[608,266],[629,275],[608,283],[615,299]]
 ],
 [
 [[225,220],[233,261],[260,295],[303,317],[345,321],[380,306],[396,279],[403,245],[398,207],[318,178],[347,172],[364,180],[376,164],[390,162],[399,171],[338,196],[349,195],[360,193],[380,182],[389,179],[397,180],[383,208],[382,228],[395,239],[402,232],[357,268],[376,260],[393,264],[377,274],[373,289]],
 [[568,171],[562,215],[575,260],[604,301],[643,328],[683,320],[724,287],[755,246],[775,205],[573,157],[586,152],[605,163],[623,162],[639,167],[663,177],[576,181],[585,183],[597,185],[626,191],[637,195],[651,201],[596,205],[578,232],[591,245],[612,240],[587,268],[608,263],[629,273],[608,280],[615,297]]
 ]
];
const factor=680/941;
const raw=faces.map(pair=>pair.flat().map(p=>[p[0]*factor,p[1]*factor]));
const fixed=[[[335,238],[374,226]],[[589,190],[640,202]]];
const aligned=faces.map(pair=>pair.flatMap((face,which)=>{
 const l=face[16],r=face[19],tl=fixed[which][0],tr=fixed[which][1];
 const sx=r[0]-l[0],sy=r[1]-l[1],dx=tr[0]-tl[0],dy=tr[1]-tl[1],den=sx*sx+sy*sy;
 const a=(dx*sx+dy*sy)/den,b=(dy*sx-dx*sy)/den;
 return face.map(p=>[(tl[0]+a*(p[0]-l[0])-b*(p[1]-l[1]))*factor,(tl[1]+b*(p[0]-l[0])+a*(p[1]-l[1]))*factor]);
}));
const boundary=[[0,0],[170,0],[340,0],[510,0],[680,0],[680,135],[680,270],[680,403],[510,403],[340,403],[170,403],[0,403],[0,270],[0,135],[340,80],[340,360]];
const surfaces=[],points=[];
const temp=document.createElement('canvas');temp.width=W;temp.height=H;const tctx=temp.getContext('2d');
let triangles=[],running=!matchMedia('(prefers-reduced-motion: reduce)').matches,elapsed=0,last=0,ready=false;
let inView=false;
if('IntersectionObserver' in window){
 const visibility=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;},{threshold:0.1});
 visibility.observe(root);
}else{inView=true;}
const motion=matchMedia('(prefers-reduced-motion: reduce)');
motion.addEventListener('change',event=>{running=!event.matches;});

function circumContains(a,b,c,p){
 const ax=a[0]-p[0],ay=a[1]-p[1],bx=b[0]-p[0],by=b[1]-p[1],cx=c[0]-p[0],cy=c[1]-p[1];
 const det=(ax*ax+ay*ay)*(bx*cy-cx*by)-(bx*bx+by*by)*(ax*cy-cx*ay)+(cx*cx+cy*cy)*(ax*by-bx*ay);
 const orient=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 return orient>0?det>1e-7:det< -1e-7;
}
function triangulate(input){
 const n=input.length,ps=input.concat([[-4000,-4000],[5000,-4000],[0,6000]]);let ts=[[n,n+1,n+2]];
 for(let i=0;i<n;i++){
  const bad=ts.filter(t=>circumContains(ps[t[0]],ps[t[1]],ps[t[2]],ps[i]));const edges=new Map();
  bad.forEach(t=>{[[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]].forEach(e=>{const k=e.slice().sort((a,b)=>a-b).join(',');if(edges.has(k))edges.delete(k);else edges.set(k,e);});});
  const removed=new Set(bad);ts=ts.filter(t=>!removed.has(t));edges.forEach(e=>ts.push([e[0],e[1],i]));
 }
 return ts.filter(t=>t.every(v=>v<n));
}
function affine(src,dst){
 const [s0,s1,s2]=src,[d0,d1,d2]=dst;
 const x1=s1[0]-s0[0],y1=s1[1]-s0[1],x2=s2[0]-s0[0],y2=s2[1]-s0[1],det=x1*y2-x2*y1;
 if(Math.abs(det)<1e-6)return null;
 const u1=d1[0]-d0[0],u2=d2[0]-d0[0],v1=d1[1]-d0[1],v2=d2[1]-d0[1];
 const a=(u1*y2-u2*y1)/det,c=(u2*x1-u1*x2)/det,b=(v1*y2-v2*y1)/det,d=(v2*x1-v1*x2)/det;
 return[a,b,c,d,d0[0]-a*s0[0]-c*s0[1],d0[1]-b*s0[0]-d*s0[1]];
}
function warp(index,destination){
 tctx.setTransform(1,0,0,1,0,0);tctx.clearRect(0,0,W,H);
 for(const ids of triangles){
  const src=ids.map(i=>points[index][i]),dst=ids.map(i=>destination[i]),m=affine(src,dst);if(!m)continue;
  const center=[dst.reduce((s,p)=>s+p[0],0)/3,dst.reduce((s,p)=>s+p[1],0)/3];
  const clip=dst.map(p=>{const dx=p[0]-center[0],dy=p[1]-center[1],r=Math.hypot(dx,dy)||1;return[p[0]+dx*.45/r,p[1]+dy*.45/r];});
  tctx.save();tctx.beginPath();tctx.moveTo(...clip[0]);tctx.lineTo(...clip[1]);tctx.lineTo(...clip[2]);tctx.closePath();tctx.clip();tctx.setTransform(...m);tctx.drawImage(surfaces[index],0,0);tctx.restore();
 }
}
function render(){
 if(!ready)return;
 const t=elapsed%30000;let from=0,to=0,linear=0;
 if(t<3000){from=0;to=0;}else if(t<8500){from=0;to=1;linear=(t-3000)/5500;}else if(t<11000){from=1;to=1;}else if(t<17000){from=1;to=2;linear=(t-11000)/6000;}else if(t<24000){from=2;to=2;}else{from=2;to=0;linear=(t-24000)/6000;}
 const mix=linear*linear*(3-2*linear);
 const targets=aligned.map(p=>boundary.concat(p));
 const dest=targets[from].map((p,i)=>[p[0]*(1-mix)+targets[to][i][0]*mix,p[1]*(1-mix)+targets[to][i][1]*mix]);
 ctx.clearRect(0,0,W,H);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1-mix;warp(from,dest);ctx.drawImage(temp,0,0);
 if(mix>0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=mix;warp(to,dest);ctx.drawImage(temp,0,0);}
 ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
 const stage=t<3000?0:t<17000?1:t<24000?2:3;
 const captions=['어린 손자와 할아버지, 서로를 바라보다.','손자는 자라고, 할아버지는 청춘으로 돌아갑니다.','서로 다른 시간을 살아온 우리, 같은 시간에서 만나다.','다시, 우리의 시간을 만나러 갑니다.'];
 if(root.dataset.stage!==String(stage)){root.querySelector('.caption').textContent=captions[stage];root.dataset.stage=stage;}
}
function frame(now){const active=running&&inView&&!document.hidden;if(last&&active)elapsed+=Math.min(now-last,100);last=now;if(active)render();requestAnimationFrame(frame);}
original.onload=()=>{
 const sh=original.height/3;
 raw.forEach((landmarks,index)=>{
  const face=document.createElement('canvas');face.width=W;face.height=H;
  face.getContext('2d').drawImage(original,0,index*sh,original.width,sh,0,0,W,H);
  surfaces.push(face);points.push(boundary.concat(landmarks));
 });
 const mean=points[0].map((_,i)=>[points.reduce((s,p)=>s+p[i][0],0)/3,points.reduce((s,p)=>s+p[i][1],0)/3]);
 triangles=triangulate(mean);ready=true;render();requestAnimationFrame(frame);
};
original.onerror=()=>{root.querySelector('.caption').textContent='이미지를 불러오지 못했습니다.';running=false;};
})();


(()=>{
const root=document.getElementById('doctor-morph');
const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');
const W=340,H=572;
const original=new Image();
original.src='assets/child-to-doctor.png';
// Corresponding face anchors: jaw, eyebrows, eyes, nose and lips.
const raw=[
 [[60,215],[66,267],[91,310],[128,341],[174,355],[220,340],[251,305],[270,260],[278,210],[106,184],[131,180],[154,184],[190,180],[214,176],[240,181],[114,205],[131,205],[149,204],[196,202],[214,201],[233,202],[173,218],[161,251],[174,257],[188,250],[140,284],[173,278],[203,281],[174,291],[174,306]],
 [[64,211],[70,272],[95,320],[129,352],[168,366],[211,352],[244,317],[265,267],[271,209],[99,187],[124,181],[148,186],[188,181],[211,179],[237,184],[107,211],[124,210],[143,210],[193,209],[210,207],[230,208],[167,224],[151,266],[167,273],[184,265],[135,301],[168,295],[200,299],[168,308],[169,324]],
 [[69,209],[74,269],[98,318],[134,352],[173,365],[217,350],[248,313],[268,263],[275,207],[108,180],[134,176],[157,180],[191,177],[214,175],[239,180],[115,206],[133,205],[151,205],[196,204],[213,203],[232,204],[173,221],[158,260],[175,268],[190,260],[139,291],[173,285],[205,290],[174,299],[175,316]]
];
const boundary=[[0,0],[170,0],[340,0],[340,286],[340,572],[170,572],[0,572],[0,286]];
const surfaces=[],points=[];
const temp=document.createElement('canvas');temp.width=W;temp.height=H;const tctx=temp.getContext('2d');
let triangles=[],running=!matchMedia('(prefers-reduced-motion: reduce)').matches,elapsed=0,last=0,ready=false;
let inView=false;
if('IntersectionObserver' in window){
 const visibility=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;},{threshold:0.1});visibility.observe(root);
}else{inView=true;}
const motion=matchMedia('(prefers-reduced-motion: reduce)');
motion.addEventListener('change',event=>{running=!event.matches;});

function circumContains(a,b,c,p){
 const ax=a[0]-p[0],ay=a[1]-p[1],bx=b[0]-p[0],by=b[1]-p[1],cx=c[0]-p[0],cy=c[1]-p[1];
 const det=(ax*ax+ay*ay)*(bx*cy-cx*by)-(bx*bx+by*by)*(ax*cy-cx*ay)+(cx*cx+cy*cy)*(ax*by-bx*ay);
 const orient=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 return orient>0?det>1e-7:det< -1e-7;
}
function triangulate(input){
 const n=input.length,ps=input.concat([[-4000,-4000],[5000,-4000],[0,6000]]);let ts=[[n,n+1,n+2]];
 for(let i=0;i<n;i++){
  const bad=ts.filter(t=>circumContains(ps[t[0]],ps[t[1]],ps[t[2]],ps[i]));const edges=new Map();
  bad.forEach(t=>{[[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]].forEach(e=>{const k=e.slice().sort((a,b)=>a-b).join(',');if(edges.has(k))edges.delete(k);else edges.set(k,e);});});
  const removed=new Set(bad);ts=ts.filter(t=>!removed.has(t));edges.forEach(e=>ts.push([e[0],e[1],i]));
 }
 return ts.filter(t=>t.every(v=>v<n));
}
function affine(src,dst){
 const [s0,s1,s2]=src,[d0,d1,d2]=dst;
 const x1=s1[0]-s0[0],y1=s1[1]-s0[1],x2=s2[0]-s0[0],y2=s2[1]-s0[1],det=x1*y2-x2*y1;
 if(Math.abs(det)<1e-6)return null;
 const u1=d1[0]-d0[0],u2=d2[0]-d0[0],v1=d1[1]-d0[1],v2=d2[1]-d0[1];
 const a=(u1*y2-u2*y1)/det,c=(u2*x1-u1*x2)/det,b=(v1*y2-v2*y1)/det,d=(v2*x1-v1*x2)/det;
 return[a,b,c,d,d0[0]-a*s0[0]-c*s0[1],d0[1]-b*s0[0]-d*s0[1]];
}
function warp(index,destination){
 tctx.setTransform(1,0,0,1,0,0);tctx.clearRect(0,0,W,H);
 for(const ids of triangles){
  const src=ids.map(i=>points[index][i]),dst=ids.map(i=>destination[i]),m=affine(src,dst);if(!m)continue;
  const center=[dst.reduce((s,p)=>s+p[0],0)/3,dst.reduce((s,p)=>s+p[1],0)/3];
  const clip=dst.map(p=>{const dx=p[0]-center[0],dy=p[1]-center[1],r=Math.hypot(dx,dy)||1;return[p[0]+dx*.45/r,p[1]+dy*.45/r];});
  tctx.save();tctx.beginPath();tctx.moveTo(...clip[0]);tctx.lineTo(...clip[1]);tctx.lineTo(...clip[2]);tctx.closePath();tctx.clip();tctx.setTransform(...m);tctx.drawImage(surfaces[index],0,0);tctx.restore();
 }
}
function render(){
 if(!ready)return;
 // Hold each portrait, then interpolate facial geometry and image colour.
 const order=[0,1,2,1],cycle=24000,local=elapsed%cycle,segment=Math.floor(local/6000),clock=local%6000;
 const from=order[segment],to=order[(segment+1)%4],linear=Math.max(0,Math.min(1,(clock-3000)/3000));
 const mix=linear*linear*(3-2*linear);
 if(mix===0){ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.drawImage(surfaces[from],0,0);return;}
 const dest=points[from].map((p,i)=>[p[0]*(1-mix)+points[to][i][0]*mix,p[1]*(1-mix)+points[to][i][1]*mix]);
 ctx.clearRect(0,0,W,H);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1-mix;warp(from,dest);ctx.drawImage(temp,0,0);
 ctx.globalCompositeOperation='lighter';ctx.globalAlpha=mix;warp(to,dest);ctx.drawImage(temp,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
}
function frame(now){const active=running&&inView&&!document.hidden;if(last&&active)elapsed+=Math.min(now-last,100);last=now;if(active)render();requestAnimationFrame(frame);}
original.onload=()=>{
 const crops=[[0,339],[343,338],[685,339]];
 raw.forEach((landmarks,index)=>{
  const face=document.createElement('canvas');face.width=W;face.height=H;const f=face.getContext('2d');
  const left=landmarks[16],right=landmarks[19],dx=right[0]-left[0],dy=right[1]-left[1],den=dx*dx+dy*dy;
  const a=84*dx/den,b=-84*dy/den,tx=128-a*left[0]+b*left[1],ty=208-b*left[0]-a*left[1];
  f.fillStyle='#53666a';f.fillRect(0,0,W,H);f.setTransform(a,b,-b,a,tx,ty);f.drawImage(original,crops[index][0],0,crops[index][1],572,0,0,W,H);surfaces.push(face);
  points.push(boundary.concat(landmarks.map(p=>[a*p[0]-b*p[1]+tx,b*p[0]+a*p[1]+ty])));
 });
 const mean=points[0].map((_,i)=>[points.reduce((s,p)=>s+p[i][0],0)/3,points.reduce((s,p)=>s+p[i][1],0)/3]);
 triangles=triangulate(mean);ready=true;render();requestAnimationFrame(frame);
};
original.onerror=()=>{root.querySelector('.caption').textContent='이미지를 불러오지 못했습니다.';running=false;};
})();
