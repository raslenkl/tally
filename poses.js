(()=>{
/* ===================== Drawn skill illustrations ===================== */
// Hand-posed figures in the same ink-outline style as the Everkinetic drawings, for moves
// that set doesn't cover (levers, planche, flag, handstands...). Poses use joint angles in
// degrees (0 = right, 90 = down), or IK targets {to:[x,y],b:±1} for hands and feet.
const PL={t:30,nk:4,hr:6.5,ua:16,fa:14,hd:3,th:21,sh:20,ft:7};
const rad=d=>d*Math.PI/180,dv=(d,l)=>[Math.cos(rad(d))*l,Math.sin(rad(d))*l],ad=(p,q)=>[p[0]+q[0],p[1]+q[1]];
const ang=(p,q)=>Math.atan2(q[1]-p[1],q[0]-p[0])*180/Math.PI;
function ik(o,tg,a,b,bend){const dx=tg[0]-o[0],dy=tg[1]-o[1];let d=Math.hypot(dx,dy);const base=Math.atan2(dy,dx)*180/Math.PI;
  d=Math.min(d,a+b-.01);const c=Math.max(-1,Math.min(1,(a*a+d*d-b*b)/(2*a*d)));const u=base-(bend||1)*Math.acos(c)*180/Math.PI;
  const e=ad(o,dv(u,a));return [u,ang(e,tg)]}
// Resolve one frame to joint angles (IK solved), so frames can be interpolated as angles.
function poseSolve(p){
  const f=p.f||1,fv=!!p.fv,t=p.t,h=p.h??t,H0=p.H||[0,0];
  const perp=dv(t+90,1),sw=fv?6.5:0,hw=fv?4.5:0;
  const leg=(spec,side)=>{if(!spec)return null;const hip=ad(H0,[perp[0]*hw*side,perp[1]*hw*side]);
    if(Array.isArray(spec))return {th:spec[0],sh:spec[1],ft:spec[2]??spec[1]-90*f,s:spec[3]||1};
    const [th,sh]=ik(hip,spec.to,PL.th,PL.sh,spec.b||1);return {th,sh,ft:spec.ft??(f>0?0:180),s:1}};
  let L1=leg(p.l,fv?1:0),L2=leg(p.l2??p.l,fv?-1:0);
  const fr={H:[...H0],t,h,f,fv,L1,L2,props:p.props||[],x:p.x||{}};
  // anchor: translate so a leg joint sits at a point
  if(p.anchor){const J=joints(fr,true);const [k,pt]=p.anchor;const d=[pt[0]-J[k][0],pt[1]-J[k][1]];fr.H=ad(fr.H,d)}
  const J=joints(fr,true);
  const arm=(spec,S)=>{if(!spec)return null;if(Array.isArray(spec))return {ua:spec[0],fa:spec[1]};
    const [ua,fa]=ik(S,spec.to,PL.ua,PL.fa+PL.hd,spec.b||1);return {ua,fa}};
  fr.A1=arm(p.a,J.S1);fr.A2=arm(p.a2??p.a,J.S2);
  return fr;
}
function joints(fr,noArms){
  const {H,t,h,fv}=fr,perp=dv(t+90,1),sw=fv?6.5:0,hw=fv?4.5:0;
  const S=ad(H,dv(t,PL.t)),N=ad(S,dv(h,PL.nk)),C=ad(N,dv(h,PL.hr));
  const J={H,S,N,C,S1:ad(S,[perp[0]*sw,perp[1]*sw]),S2:ad(S,[-perp[0]*sw,-perp[1]*sw])};
  const legJ=(L,side,k)=>{if(!L)return;const hip=ad(H,[perp[0]*hw*side,perp[1]*hw*side]),K=ad(hip,dv(L.th,PL.th*L.s)),A=ad(K,dv(L.sh,PL.sh*L.s)),T=ad(A,dv(L.ft,PL.ft*(L.s<1?.8:1)));J['P'+k]=hip;J['K'+k]=K;J['A'+k]=A;J['T'+k]=T};
  legJ(fr.L1,fv?1:0,1);legJ(fr.L2,fv?-1:0,2);J.A=J.A1;J.K=J.K1;
  if(!noArms){const armJ=(A,S,k)=>{if(!A)return;const E=ad(S,dv(A.ua,PL.ua)),W=ad(E,dv(A.fa,PL.fa)),G=ad(W,dv(A.fa,PL.hd));J['E'+k]=E;J['W'+k]=W;J['G'+k]=G};
    armJ(fr.A1,J.S1,1);armJ(fr.A2,J.S2,2)}
  return J;
}
const lerp=(a,b,k)=>a+(b-a)*k,lerpA=(a,b,k)=>{let d=((b-a)%360+540)%360-180;return a+d*k};
// tween the raw specs (so IK targets keep hands/feet planted), then solve
function specMix(A,B,sA,sB,k){const m={...A,H:[lerp(A.H[0],B.H[0],k),lerp(A.H[1],B.H[1],k)],t:lerp(A.t,B.t,k),h:lerp(A.h??A.t,B.h??B.t,k)};delete m.anchor;
  const limb=(key,solvedKey,q)=>{const a=A[key]??(key.endsWith('2')?A[key.slice(0,-1)]:null),b=B[key]??(key.endsWith('2')?B[key.slice(0,-1)]:null);if(!a||!b){m[key]=a;return}
    if(a.to&&b.to){m[key]={to:[lerp(a.to[0],b.to[0],k),lerp(a.to[1],b.to[1],k)],b:k<.5?a.b:b.b,ft:a.ft!=null&&b.ft!=null?lerp(a.ft,b.ft,k):a.ft};return}
    const x=sA[solvedKey],y=sB[solvedKey];m[key]=q.map(z=>z==='s'?lerp(x[z]||1,y[z]||1,k):lerpA(x[z],y[z],k))};
  limb('a','A1',['ua','fa']);limb('a2','A2',['ua','fa']);
  // legs: use solved angles unless both are IK
  const leg=(key,sk)=>{const a=A[key]??(key==='l2'?A.l:null),b=B[key]??(key==='l2'?B.l:null);if(!a||!b){m[key]=a;return}
    if(a.to&&b.to){m[key]={to:[lerp(a.to[0],b.to[0],k),lerp(a.to[1],b.to[1],k)],b:k<.5?a.b:b.b,ft:lerp(sA[sk].ft,sB[sk].ft,k)};return}
    const x=sA[sk],y=sB[sk];m[key]=[lerp(x.th,y.th,k),lerp(x.sh,y.sh,k),lerp(x.ft,y.ft,k),lerp(x.s,y.s,k)]};
  leg('l','L1');leg('l2','L2');
  if(A.anchor&&B.anchor&&A.anchor[0]===B.anchor[0])m.anchor=[A.anchor[0],[lerp(A.anchor[1][0],B.anchor[1][0],k),lerp(A.anchor[1][1],B.anchor[1][1],k)]];
  return poseSolve(m)}
// one draw list per frame (same structure every frame, so SMIL can tween each path's "d")
const r1=v=>Math.round(v*10)/10,P2=p=>r1(p[0])+' '+r1(p[1]);
function capsule(p,q,a,b){const d=ang(p,q),n=dv(d+90,1),A=[p[0]+n[0]*a/2,p[1]+n[1]*a/2],B=[q[0]+n[0]*b/2,q[1]+n[1]*b/2],C=[q[0]-n[0]*b/2,q[1]-n[1]*b/2],D=[p[0]-n[0]*a/2,p[1]-n[1]*a/2];
  return `M${P2(A)}L${P2(B)}A${r1(b/2)} ${r1(b/2)} 0 0 0 ${P2(C)}L${P2(D)}A${r1(a/2)} ${r1(a/2)} 0 0 0 ${P2(A)}Z`}
function smooth(pts){// closed Catmull-Rom -> cubic beziers
  const n=pts.length;let d=`M${P2(pts[0])}`;for(let i=0;i<n;i++){const p0=pts[(i-1+n)%n],p1=pts[i],p2=pts[(i+1)%n],p3=pts[(i+2)%n];
    const c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];d+=`C${P2(c1)} ${P2(c2)} ${P2(p2)}`}return d+'Z'}
function torso(fr,J,from,to){// side view: chest deeper in front; front view: V-taper
  const t=fr.t,u=dv(t,1),fr1=dv(t+90*fr.f,1),H=J.H;
  const prof=fr.fv?[[-.1,7.5,7.5],[0,8.6,8.6],[.42,7.4,7.4],[.78,9.6,9.6],[1,9.4,9.4],[1.1,6,6]]:[[-.1,5.6,5.6],[0,6.6,6.4],[.42,5.6,5.8],[.74,6,8.4],[.97,6,6.2],[1.08,3.8,3.6]];
  const P=prof.filter(r=>r[0]>=from-.001&&r[0]<=to+.001);if(from>-.1)P.unshift([from,...interpW(prof,from)]);if(to<1.08)P.push([to,...interpW(prof,to)]);
  const at=(k,w)=>[H[0]+u[0]*PL.t*k+fr1[0]*w,H[1]+u[1]*PL.t*k+fr1[1]*w];
  const front=P.map(r=>at(r[0],r[2])),back=P.map(r=>at(r[0],-r[1])).reverse();return smooth([...front,...back])}
function interpW(prof,k){for(let i=0;i<prof.length-1;i++){const [a,b1,f1]=prof[i],[c,b2,f2]=prof[i+1];if(k>=a&&k<=c){const z=(k-a)/(c-a);return [b1+(b2-b1)*z,f1+(f2-f1)*z]}}return [prof[0][1],prof[0][2]]}
// ===== Ink line-art renderer, in the style of the Everkinetic gym drawings =====
// Each pose frame is solved in 2D (above), lifted to 3D (left/right sides get depth), then
// drawn from a 3/4 camera. Parts are painted back to front: white fill, black ink outline,
// a few muscle lines. Orange tint = the muscles doing the work (P.hl).
const STK='#1b1b1b',HLF='#FFC7AC',WHITE='#fff';
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],len=v=>Math.hypot(v[0],v[1]),mul=(v,s)=>[v[0]*s,v[1]*s],add2=(a,b)=>[a[0]+b[0],a[1]+b[1]];
const nrm=v=>{const l=len(v);return l>1e-6?[v[0]/l,v[1]/l]:[0,-1]};
function camera(yw,pt){const a=rad(yw),b=rad(pt),ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
  return p=>{const x=p[0]*ca+p[2]*sa,z=-p[0]*sa+p[2]*ca,y=p[1];return [x,y*cb+z*sb,-y*sb+z*cb]}}
function lift(fr,J,spec){const side=!fr.fv,gw=spec.gw??8.5,sp=spec.sp??4.6,P={};
  const zz={S1:7.6,S2:-7.6,E1:(7.6+gw)/2,E2:-(7.6+gw)/2,W1:gw,W2:-gw,G1:gw,G2:-gw,P1:4.6,P2:-4.6,K1:(4.6+sp)/2,K2:-(4.6+sp)/2,A1:sp,A2:-sp,T1:sp,T2:-sp};
  Object.entries(J).forEach(([k,v])=>{if(Array.isArray(v))P[k]=[v[0],v[1],side?(zz[k]||0):0]});return P}
const TB=[[-.14,6.9],[0,7.3],[.45,6.1],[.8,8.4],[.98,8.9],[1.1,5.2]],TD=[[-.14,5.2],[0,5.7],[.45,4.8],[.8,6],[.98,5.1],[1.1,3.6]];
const pw=(prof,k)=>{if(k<=prof[0][0])return prof[0][1];for(let i=0;i<prof.length-1;i++){const [a,x]=prof[i],[b,y]=prof[i+1];if(k<=b)return x+(y-x)*(k-a)/(b-a)}return prof[prof.length-1][1]};
const qd=(a,c,b)=>`M${P2(a)}Q${P2(c)} ${P2(b)}`,ln2=(a,b)=>`M${P2(a)}L${P2(b)}`;
function limbPath(a,b,w0,wm,w1,m=.38){const d=sub(b,a),L=len(d),u=L>.01?mul(d,1/L):[0,1],n=[-u[1],u[0]];
  const c=(p,w,s)=>[p[0]+n[0]*w/2*s,p[1]+n[1]*w/2*s],mid=add2(a,mul(d,m));
  return smooth([add2(a,mul(u,-w0*.42)),c(a,w0,1),c(mid,wm,1),c(b,w1,1),add2(b,mul(u,w1*.42)),c(b,w1,-1),c(mid,wm,-1),c(a,w0,-1)])}
function ellPath(c,u,rx,ry){const n=[-u[1],u[0]],pts=[];for(let i=0;i<10;i++){const t=i/10*Math.PI*2;pts.push(add2(c,add2(mul(u,Math.cos(t)*ry),mul(n,Math.sin(t)*rx))))}return smooth(pts)}
function drawFrame(spec,o){
  const fr=poseSolve(spec),J=joints(fr),P=lift(fr,J,spec),cam=o.cam,Q={};
  Object.entries(P).forEach(([k,p])=>Q[k]=cam(p));
  const sc=p=>[p[0],p[1]],H=new Set(o.hl||[]),parts=[];
  let grp='torso';const part=(z,d,fill,det=[],under=[])=>parts.push({z,d,fill,det,under,g:grp});
  // body axes in 3D, then on screen
  const side=!fr.fv,front3=side?[...dv(fr.t+90*fr.f,1),0]:[0,0,1],lat3=side?[0,0,1]:[...dv(fr.t+90,1),0];
  const fQ=cam(front3),lQ=cam(lat3),frS=[fQ[0],fQ[1]],latS=[lQ[0],lQ[1]],fz=fQ[2];
  // torso
  const Hq=Q.H,Sq=Q.S,sv=sub(sc(Sq),sc(Hq)),L=len(sv),u=L>.01?mul(sv,1/L):[0,-1],n=[-u[1],u[0]];
  const perp=v=>{const d=v[0]*u[0]+v[1]*u[1];return len([v[0]-d*u[0],v[1]-d*u[1]])},lp=perp(latS),fp=perp(frS);
  const tw=k=>Math.max(3.2,Math.hypot(pw(TB,k)*lp,pw(TD,k)*fp));
  const sp_=k=>add2(sc(Hq),mul(u,L*k)),at=(k,s)=>add2(sp_(k),mul(n,tw(k)*s));
  const tpath=(a,b)=>{const ks=[a,...TB.map(r=>r[0]).filter(k=>k>a&&k<b),b];return smooth([...ks.map(k=>at(k,1)),...ks.slice().reverse().map(k=>at(k,-1))])};
  const surf=(k,s)=>add2(sp_(k),mul(frS,pw(TD,k)*s*.92));
  const tz=(Hq[2]+Sq[2])/2,tdet=[],tund=[],vis=Math.min(1,Math.abs(fz)*2.2);
  if(fz>.12){const c=k=>surf(k,1);
    tdet.push([qd(at(.84,.62),c(.74),at(.84,-.62)),vis],[ln2(c(.7),c(.18)),vis*.8]);
    [.52,.38].forEach(k=>tdet.push([qd(add2(c(k),mul(n,tw(k)*.34)),add2(c(k),mul(u,-.6)),add2(c(k),mul(n,-tw(k)*.34))),vis*.7]))}
  if(fz<-.12){const c=k=>surf(k,-1);tdet.push([ln2(c(.18),c(.92)),vis*.8],[qd(add2(c(.86),mul(n,tw(.86)*.2)),add2(c(.7),mul(n,tw(.7)*.42)),add2(c(.58),mul(n,tw(.58)*.2))),vis*.6],[qd(add2(c(.86),mul(n,-tw(.86)*.2)),add2(c(.7),mul(n,-tw(.7)*.42)),add2(c(.58),mul(n,-tw(.58)*.2))),vis*.6])}
  tdet.push([qd(at(.1,1),add2(sp_(.1),mul(frS,-1.2)),at(.1,-1)),.9]); // shorts waistband
  if(H.has('core')||H.has('lowback'))tund.push(tpath(.1,.6));
  if(H.has('chest')||H.has('lats'))tund.push(tpath(.6,.97));
  if(H.has('glutes'))tund.push(tpath(-.14,.1));
  part(tz,tpath(-.14,1.1),WHITE,tdet,tund);
  // neck + head
  part(Q.N[2]-.3,limbPath(sc(Sq),sc(Q.N),5.6,5,5),WHITE);
  const hu=nrm(sub(sc(Q.C),sc(Q.N))),hn=[-hu[1],hu[0]],hc=sc(Q.C),hdet=[];
  if(Math.abs(fz)<.55&&len(frS)>.35)hdet.push([ellPath(add2(hc,mul(frS,-.6)),hu,1.1,1.7),.8]);
  const back=nrm(mul(frS,-1)),bk=len(frS)>.15?back:hn;
  hdet.push([qd(add2(hc,add2(mul(hu,6.2),mul(bk,-1.2))),add2(hc,add2(mul(hu,5),mul(bk,5.4))),add2(hc,add2(mul(hu,-1.6),mul(bk,5.6)))),.9]);
  grp='head';part(Q.C[2]+.3,ellPath(hc,hu,5.3,6.6),WHITE,hdet);
  // limbs
  const z2=(a,b)=>(Q[a][2]+Q[b][2])/2;
  [1,2].forEach(k=>{const S='S'+k,E='E'+k,W='W'+k,G='G'+k,Pk=J['P'+k]?'P'+k:'H',K='K'+k,A='A'+k,T='T'+k;
    grp='arm'+k;if(Q[E]){part(z2(S,E)+.05,limbPath(sc(Q[S]),sc(Q[E]),7.4,7.8,5.4,.34),H.has('arms')?HLF:WHITE,[[qd(add2(sc(Q[S]),mul(nrm(sub(sc(Q[E]),sc(Q[S]))),3)),add2(sc(Q[S]),mul(nrm(sub(sc(Q[E]),sc(Q[S]))),5.6)),add2(sc(Q[S]),mul(nrm(sub(sc(Q[E]),sc(Q[S]))),7.4))),.0]]);
      part(z2(E,W),limbPath(sc(Q[E]),sc(Q[W]),5.8,6.3,4.2,.3),H.has('arms')||H.has('fore')?HLF:WHITE);
      part(Q[G][2]+.1,limbPath(sc(Q[W]),sc(Q[G]),4.6,5,4),WHITE);
      part(Q[S][2]+.15,ellPath(sc(Q[S]),nrm(sub(sc(Q[E]),sc(Q[S]))),4.4,4.8),H.has('delts')?HLF:WHITE)}
    grp='leg'+k;if(Q[K]){const hip=sc(Q[Pk]),kn=sc(Q[K]),dir=nrm(sub(kn,hip));
      part(z2(Pk,K),limbPath(hip,kn,10.6,10.2,7,.3),H.has('legs')||H.has('quads')?HLF:WHITE,[[qd(add2(hip,add2(mul(dir,8.5),mul([-dir[1],dir[0]],5.2))),add2(hip,mul(dir,10)),add2(hip,add2(mul(dir,8.5),mul([-dir[1],dir[0]],-5.2)))),.9]]);
      part(z2(K,A)-.05,limbPath(kn,sc(Q[A]),7.1,7.7,4.6,.3),H.has('legs')?HLF:WHITE);
      part(z2(A,T)-.02,limbPath(sc(Q[A]),sc(Q[T]),4.8,4.6,3.4,.5),WHITE)}});
  const G={};parts.forEach(p=>{(G[p.g]=G[p.g]||[]).push(p)});
  const order=Object.values(G).map(ps=>({ps,z:ps.reduce((a,p)=>a+p.z,0)/ps.length})).sort((a,b)=>a.z-b.z);
  const sw='vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"';
  // per body part: thick ink under all its pieces, then the fills, so the joints merge into one outline
  let body='';order.forEach(({ps})=>{ps.forEach(p=>body+=`<path d="${p.d}" fill="${STK}" stroke="${STK}" stroke-width="2.5" ${sw}/>`);
    ps.forEach(p=>{body+=`<path d="${p.d}" fill="${p.fill}"/>`;p.under.forEach(d=>body+=`<path d="${d}" fill="${HLF}"/>`)});
    ps.forEach(p=>p.det.forEach(([d,op])=>{if(op>.05)body+=`<path d="${d}" fill="none" stroke="${STK}" stroke-width=".8" stroke-opacity="${op.toFixed(2)}" ${sw}/>`}))});
  // bounds of the figure
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;Object.values(Q).forEach(p=>{x0=Math.min(x0,p[0]-8);x1=Math.max(x1,p[0]+8);y0=Math.min(y0,p[1]-8);y1=Math.max(y1,p[1]+8)});
  let wx0=1e9,wx1=-1e9,wy0=1e9;Object.values(P).forEach(p=>{wx0=Math.min(wx0,p[0]);wx1=Math.max(wx1,p[0]);wy0=Math.min(wy0,p[1])});
  const props=(spec.props||[]).map(pr=>propSVG3(pr,cam,{x0:wx0-16,x1:wx1+16,y0:wy0-10,gw:side?(spec.gw??8.5):0},(x,y)=>{x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)})).join('');
  return {svg:props+body,b:[x0,y0,x1,y1]};
}
function propSVG3(pr,cam,W,grow){const [k,a,b,c,d]=pr,pp=p=>{const q=cam(p);return [q[0],q[1]]};
  const poly=(pts,fill,stroke,sw=.6)=>{const s=pts.map(pp);s.forEach(p=>grow(p[0],p[1]));return `<path d="M${s.map(P2).join('L')}Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`};
  const line=(p,q,w,col='#3a3a3a')=>{const A=pp(p),B=pp(q);grow(A[0],A[1]);grow(B[0],B[1]);return `<path d="M${P2(A)}L${P2(B)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`};
  const box=(xa,xb,ya,yb,za,zb)=>{const F=[[[0,-1,0],[[xa,ya,za],[xb,ya,za],[xb,ya,zb],[xa,ya,zb]],'#ececec'],[[0,0,1],[[xa,ya,zb],[xb,ya,zb],[xb,yb,zb],[xa,yb,zb]],'#dedede'],[[0,0,-1],[[xa,ya,za],[xb,ya,za],[xb,yb,za],[xa,yb,za]],'#dedede'],[[1,0,0],[[xb,ya,za],[xb,ya,zb],[xb,yb,zb],[xb,yb,za]],'#d4d4d4'],[[-1,0,0],[[xa,ya,za],[xa,ya,zb],[xa,yb,zb],[xa,yb,za]],'#d4d4d4']];
    return F.filter(f=>cam(f[0])[2]>.01).map(f=>poly(f[1],f[2],'#8a8a8a')).join('')};
  if(k==='bar')return line([a,b,-26],[a,b,26],2.6);
  if(k==='hbar')return line([a,b,0],[c,b,0],2.6);
  if(k==='pole')return line([a,b,0],[a,c,0],3.4);
  if(k==='floor')return poly([[W.x0,a,-24],[W.x1,a,-24],[W.x1,a,24],[W.x0,a,24]],'#f1f1f1','#d6d6d6');
  if(k==='wall')return poly([[a,Math.max(b,W.y0),-24],[a,Math.max(b,W.y0),24],[a,c,24],[a,c,-24]],'#f4f4f4','#cfcfcf');
  if(k==='bench')return box(a,a+c,b,b+4,-10,10)+line([a+5,b+4,8],[a+5,b+d,8],1.6)+line([a+c-5,b+4,8],[a+c-5,b+d,8],1.6);
  if(k==='box')return box(a,a+c,b,b+d,-13,13);
  if(k==='para'){const zs=W.gw?[-W.gw,W.gw]:[0];return zs.map(z=>{const s=[[a-6,b+12,z],[a-4,b,z],[a+4,b,z],[a+6,b+12,z]].map(pp);s.forEach(p=>grow(p[0],p[1]));return `<path d="M${s.map(P2).join('L')}" stroke="#3a3a3a" stroke-width="2" fill="none" stroke-linejoin="round"/>`}).join('')}
  return '';
}
const POSE_CACHE={};
function poseSVG(key,mode='thumb'){
  const ck=key+'|'+mode;if(POSE_CACHE[ck])return POSE_CACHE[ck];
  const P=POSES[key];if(!P)return '';
  const specs=P.fr.map((f,i)=>i?{...P.fr[0],...f,props:f.props||P.fr[0].props}:f);
  const last=poseSolve(specs[specs.length-1]),fx=last.fv?0:dv(last.t+90*last.f,1)[0];
  const up=Math.abs(Math.sin(rad(last.t)))>.7&&!last.fv,ym=up?66:32,[yaw,pitch]=P.cam||[fx>.2?-ym:ym,up?4:12],cam=camera(yaw,pitch);
  const fr=specs.map(s=>drawFrame(s,{cam,hl:P.hl}));
  let out;
  if(mode==='strip'&&fr.length>1){
    const hgt=Math.max(...fr.map(f=>f.b[3]-f.b[1])),gap=16;let x=0,g='';
    fr.forEach((f,i)=>{const [x0,y0,x1,y1]=f.b,w=x1-x0,dy=(hgt-(y1-y0))/2;
      g+=`<g transform="translate(${r1(x-x0)} ${r1(dy-y0)})">${f.svg}</g>`;
      g+=`<circle cx="${r1(x+4)}" cy="4" r="4.2" fill="${STK}"/><text x="${r1(x+4)}" y="5.6" font-size="5.2" font-weight="700" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">${i+1}</text>`;
      x+=w;if(i<fr.length-1){const m=hgt/2;g+=`<path d="M${r1(x+gap*.35)} ${r1(m-4)}L${r1(x+gap*.65)} ${r1(m)}L${r1(x+gap*.35)} ${r1(m+4)}" fill="none" stroke="#9a9a9a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;x+=gap}});
    const pad=3;out=`<svg class="pose" viewBox="${-pad} ${-pad} ${r1(x+pad*2)} ${r1(hgt+pad*2)}" aria-hidden="true">${g}</svg>`;
  }else{
    const b=fr.reduce((a,f)=>[Math.min(a[0],f.b[0]),Math.min(a[1],f.b[1]),Math.max(a[2],f.b[2]),Math.max(a[3],f.b[3])],[1e9,1e9,-1e9,-1e9]);
    const n=fr.length,T=n*1.4;let g='';
    if(n===1||RM)g=fr[n-1].svg;else fr.forEach((f,i)=>{const kt=i===0?`0;${(1/n).toFixed(3)}`:`0;${(i/n).toFixed(3)}${i<n-1?';'+((i+1)/n).toFixed(3):''}`,vals=i===0?'1;0':i<n-1?'0;1;0':'0;1';
      g+=`<g opacity="${i?0:1}">${f.svg}<animate attributeName="opacity" values="${vals}" keyTimes="${kt}" dur="${T}s" calcMode="discrete" repeatCount="indefinite"/></g>`});
    const pad=4;let [x0,y0,x1,y1]=b;x0-=pad;y0-=pad;x1+=pad;y1+=pad;let w=x1-x0,h=y1-y0;
    if(w/h<1.5){const nw=h*1.5;x0-=(nw-w)/2;w=nw}else{const nh=w/1.5;y0-=(nh-h)/2;h=nh}
    out=`<svg class="pose" viewBox="${r1(x0)} ${r1(y0)} ${r1(w)} ${r1(h)}" aria-hidden="true">${g}</svg>`;
  }
  return POSE_CACHE[ck]=out;
}
const BAR=[['bar',0,0]],FLOOR=[['floor',0]];
const hang={H:[0,64],t:-90,a:{to:[0,0]},l:[92,88],props:[['bar',0,0]]};
const onBar=(t,ang,f,l,x={})=>{const S=dv(ang,33);return {H:[S[0]-Math.cos(rad(t))*30,S[1]-Math.sin(rad(t))*30],t,f,a:{to:[0,0]},l,props:BAR,...x}};
const hangL={H:[0,64],t:-90,f:-1,a:{to:[0,0]},l:[88,92],props:BAR};
const FLt=onBar(0,79.5,-1,[-62,178,178]),FLa=onBar(0,79.5,-1,[-90,180,180]),FLs={...onBar(0,79.5,-1,[180,180,180]),sp:17},FLf=onBar(0,79.5,-1,[180,180,180]),FLm=onBar(-45,69,-1,[-107,133,133]);
const GER={H:[5,49],t:-55,a:{to:[0,0]},l:[100,100,10],props:BAR},BLt={H:[-8,24.4],t:0,a:{to:[0,0]},l:[35,185,185],props:BAR},BLa={...BLt,l:[90,180,180]},BLs={...BLt,l:[180,180,180],sp:17},BLf={...BLt,l:[180,180,180]};
const FL1=[['floor',1]],PLl={H:[-16,-18],t:-26,a:{to:[0,0]},l:[154,154,70],props:FL1},PLt={H:[-20.5,-39.7],t:15,a:{to:[0,0]},l:[50,200,190],props:FL1},PLa={H:[-21.5,-34],t:0,a:{to:[0,0]},l:[70,190,190],props:FL1},PLs={H:[-21.5,-31.9],t:0,a:{to:[0,0]},l:[180,180,180],sp:17,props:FL1},PLf={H:[-21.5,-31.9],t:0,a:{to:[0,0]},l:[180,180,180],props:FL1};
const VF={H:[43.7,-34.2],t:115,fv:1,a:{to:[0,-20]},a2:{to:[0,8]},l:[-65,-65,-65],props:[['pole',0,-62,22]]},TF={H:[60.9,-4.4],t:185,fv:1,a:{to:[0,-20]},a2:{to:[0,8]},l:[-5,-5,-5,.55],props:[['pole',0,-30,22]]},SF={...TF,l:[-25,-25,-25],l2:[15,15,15]},FF={...TF,l:[-5,-5,-5],l2:[2,2,2]};
const POSES={
 hang:{fr:[hang]},
 pulltop:{fr:[hang,{H:[1,36],t:-95,a:{to:[0,0],b:-1},l:[100,95]}]},
 archer:{fr:[{H:[-19,57],t:-90,fv:1,a:{to:[8,0]},a2:{to:[-46,0]},l:[92,88],props:[['hbar',-56,0,18]]},{H:[-6,33],t:-90,fv:1,a:{to:[8,0],b:-1},a2:{to:[-46,0]},l:[95,90]}]},
 oac:{fr:[{H:[0,64],t:-90,a:{to:[0,0]},a2:[95,90],l:[92,88],props:BAR},{H:[2,36],t:-95,a:{to:[0,0],b:-1},a2:[100,95],l:[100,95]}]},
 highpull:{fr:[hang,{H:[-9,18],t:-100,a:{to:[0,0],b:-1},l:[105,100]}]},
 mu:{fr:[hang,{H:[-6,20],t:-100,a:{to:[0,0],b:-1},l:[108,100]},{H:[-3,0],t:-80,a:{to:[0,0]},l:[100,95]}],dur:3.6},
 sbdip:{fr:[{H:[-3,0],t:-80,a:{to:[0,0]},l:[100,95],props:BAR},{H:[-9,24],t:-60,a:{to:[0,0],b:-1},l:[105,100]}]},
 plank:{fr:[{H:[-29.3,-12.3],t:-12,a:[90,0],l:[168,168],props:[['floor',2]]}]},
 pushup1:{fr:[{H:[-27,-20],t:-25,a:{to:[0,0],b:-1},a2:[155,155],l:[155,155],props:[['floor',1]]},{H:[-28,-6],t:-8,a:{to:[0,0],b:-1},a2:[172,172],l:[174,174]}]},
 hollow:{fr:[{H:[0,-5],t:-14,f:-1,a:[-10,-8],l:[194,192],props:[['floor',2]]}]},
 tucklsit:{fr:[{H:[0,-6],t:-92,a:{to:[0,0]},l:[-72,75,0],props:[['para',0,0],['floor',12]]}]},
 lsit:{fr:[{H:[0,-6],t:-92,a:{to:[0,0]},l:[0,0,-10],props:[['para',0,0],['floor',12]]}]},
 vsit:{fr:[{H:[0,-5],t:-115,a:{to:[-10,0]},l:[-55,-55,-60],props:[['floor',2]]}]},
 hkr:{fr:[hang,{H:[2,62],t:-92,a:{to:[0,0]},l:[-5,90]}]},
 hlr:{fr:[hang,{H:[4,60],t:-96,a:{to:[0,0]},l:[-2,-2,-20]}]},
 ttb:{fr:[hang,{H:[14,40],t:-160,h:-150,a:{to:[0,0]},l:[-109,-109,-140]}]},
 dflag:{fr:[{H:[17,-31.6],t:125,h:172,a:{to:[-20,-3]},l:[-55,-55,-60],props:[['bench',-34,0,56,14]]},{H:[29.3,-13.2],t:168,h:172,a:{to:[-20,-3]},l:[-12,-12,-20]}],dur:3.4},
 fltuck:{fr:[hangL,FLm,FLt]},
 fladv:{fr:[hangL,FLt,FLa]},
 flone:{fr:[hangL,FLt,{...FLa,l:[180,180,180],l2:[-90,180,180]}]},
 flstr:{fr:[hangL,FLa,FLs]},
 flfull:{fr:[hangL,FLs,FLf]},
 sktc:{fr:[hang,{H:[-8,6],t:-286,h:-286,a:{to:[0,0]},l:[-40,160]},{H:[5,49],t:-415,h:-415,a:{to:[0,0]},l:[100,100,10]}],dur:4},
 german:{fr:[{H:[5,49],t:-55,a:{to:[0,0]},l:[100,100,10],props:BAR}]},
 bltuck:{fr:[GER,BLt]},
 bladv:{fr:[GER,BLt,BLa]},
 blstr:{fr:[GER,BLa,BLs]},
 blfull:{fr:[GER,BLs,BLf]},
 pllean:{fr:[{H:[-27,-20],t:-25,a:{to:[0,0]},l:[155,155,70],props:FL1},PLl]},
 frog:{fr:[{H:[-20,-39],t:30,a:{to:[0,0],b:-1},l:[40,200,170],props:[['floor',1]]}]},
 pltuck:{fr:[PLl,PLt]},
 pladv:{fr:[PLt,PLa]},
 plstr:{fr:[PLa,PLs]},
 plfull:{fr:[PLs,PLf]},
 sideplank:{fr:[{H:[-26,-14],t:-20,fv:1,a:[90,90],a2:[-90,-90],l:[160,160,90],props:[['floor',1]]}]},
 vflag:{fr:[VF]},
 tflag:{fr:[VF,TF]},
 sflag:{fr:[TF,SF]},
 flag:{fr:[SF,FF]},
 pike:{fr:[{H:[-14,-43],t:25,a:{to:[0,0]},l:[102,102,10],props:[['floor',1]]},{H:[-14,-43],t:52,a:{to:[0,0],b:-1},l:[102,102,10]}]},
 wallwalk:{fr:[{H:[-27,-20],t:-25,a:{to:[0,0]},l:[155,155,100],props:[['floor',1],['wall',-67,-120,1]]},{H:[-58,-63],t:90,a:{to:[-58,0]},l:[-90,-90,-90]}],dur:4},
 hswall:{fr:[{H:[0,-63],t:90,f:-1,a:{to:[0,0]},l:[-90,-90,-90],props:[['floor',1],['wall',9,-120,1]]}]},
 hsfree:{fr:[{H:[0,-63],t:90,f:-1,a:{to:[0,0]},l:[-90,-90,-90],props:[['floor',1]]}]},
 hspu:{fr:[{H:[0,-63],t:90,f:-1,a:{to:[0,0]},l:[-90,-90,-90],props:[['floor',1],['wall',-12,-120,1]]},{H:[-0.4,-43.9],t:95,f:-1,a:{to:[0,0],b:-1},l:[-90,-90,-90]}]},
 hspudef:{fr:[{H:[0,-63],t:90,f:-1,a:{to:[0,0]},l:[-90,-90,-90],props:[['para',0,0],['floor',12],['wall',-12,-120,12]]},{H:[-0.4,-36],t:95,f:-1,a:{to:[0,0],b:-1},l:[-90,-90,-90]}]},
 hspufree:{fr:[{H:[0,-63],t:90,f:-1,a:{to:[0,0]},l:[-90,-90,-90],props:[['floor',1]]},{H:[-0.4,-43.9],t:95,f:-1,a:{to:[0,0],b:-1},l:[-90,-90,-90]}]},
 pistol:{fr:[{H:[0,-43],t:-90,a:[0,0],a2:[0,0],l:{to:[0,-3]},l2:[-20,-20,-110],anchor:['A1',[0,-3]],props:[['floor',1]]},{H:[0,-23],t:-55,a:[-5,-5],a2:[-5,-5],l:{to:[0,-3]},l2:[-5,-5,-95],anchor:['A1',[0,-3]]}]},
 squat:{fr:[{H:[0,-43],t:-90,a:[0,0],l:{to:[0,-3]},props:[['floor',1]]},{H:[-13,-24],t:-52,a:[-5,-5],l:{to:[0,-3]}}]},
 lunge:{fr:[{H:[-12,-40],t:-90,a:[95,90],l:{to:[2,-3]},l2:{to:[-26,-5],b:1,ft:-40},props:[['floor',1]]},{H:[-12,-24],t:-90,a:[95,90],l:{to:[2,-3]},l2:{to:[-26,-5],b:1,ft:-40}}]},
 burpee:{fr:[{H:[0,-43],t:-90,a:[95,90],l:{to:[0,-3]},props:[['floor',1]]},{H:[-6,-16],t:-30,a:{to:[16,0]},l:{to:[-4,-3]}},{H:[-11,-20],t:-25,a:{to:[16,0]},l:[155,155,100]}],dur:3}
};
// what's working (orange in the drawing)
const HLMAP={hang:['fore'],pulltop:['lats','arms'],archer:['lats','arms'],oac:['lats','arms'],highpull:['lats','arms'],mu:['lats','chest','arms'],sbdip:['chest','arms'],
 plank:['core'],pushup1:['chest','arms','core'],hollow:['core'],tucklsit:['core','arms'],lsit:['core','quads'],vsit:['core','quads'],hkr:['core'],hlr:['core'],ttb:['core','lats'],dflag:['core','lats'],
 fltuck:['lats','core'],fladv:['lats','core'],flone:['lats','core'],flstr:['lats','core'],flfull:['lats','core'],sktc:['delts','core'],german:['delts','chest'],
 bltuck:['chest','delts','arms'],bladv:['chest','delts','arms'],blstr:['chest','delts','lowback','glutes'],blfull:['chest','delts','lowback','glutes'],
 pllean:['delts','arms'],frog:['delts','arms'],pltuck:['delts','arms','core'],pladv:['delts','arms','core'],plstr:['delts','arms','core','glutes'],plfull:['delts','arms','core','glutes'],
 sideplank:['core'],vflag:['lats','delts','core'],tflag:['lats','delts','core'],sflag:['lats','delts','core'],flag:['lats','delts','core'],
 pike:['delts','arms'],wallwalk:['delts','arms'],hswall:['delts','arms'],hsfree:['delts','arms','core'],hspu:['delts','arms'],hspudef:['delts','arms'],hspufree:['delts','arms','core'],
 pistol:['legs','glutes'],squat:['legs','glutes'],lunge:['legs','glutes'],burpee:['legs','chest','arms']};
[['pike',[30,10]],['wallwalk',[34,8]],['hspu',[-40,6]],['hspudef',[-40,6]],['hspufree',[-40,6]],['pistol',[-40,8]],['squat',[-40,8]],['lunge',[-40,8]],['frog',[-28,14]],['sktc',[30,6]],['german',[30,6]],['hkr',[40,6]],['hlr',[40,6]],['ttb',[36,6]]].forEach(([k,c])=>{if(POSES[k])POSES[k].cam=c});
Object.entries(HLMAP).forEach(([k,v])=>{if(POSES[k])POSES[k].hl=v});
window.poseSVG=poseSVG;window.POSES=POSES;
})();
