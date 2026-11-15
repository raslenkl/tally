/* UI layer, part 2: Progress, goal dates, consistency calendar, photos, sheets, actions, render. */

/* ===================== Goal dates: where your own trend line lands ===================== */
function linFit(pts){const n=pts.length;if(n<3)return null;const mx=pts.reduce((a,p)=>a+p.x,0)/n,my=pts.reduce((a,p)=>a+p.y,0)/n;let sxx=0,sxy=0;
  pts.forEach(p=>{sxx+=(p.x-mx)**2;sxy+=(p.x-mx)*(p.y-my)});if(!sxx)return null;const b=sxy/sxx;return {b,at:x=>my+b*(x-mx)}}
const byDate=h=>{const m={};h.forEach(x=>{if(!(x.d in m)||x.v>m[x.d])m[x.d]=x.v});return Object.keys(m).sort().map(d=>({d,v:m[d]}))};
// Straight line through the last 4 months of results. Needs 3+ results spread over 10+ days, and a line that goes up.
function etaFor(series,target){
  const pts=series.filter(s=>diffDays(s.d,TODAY)<=120).map(s=>({x:-diffDays(s.d,TODAY),y:s.v}));
  if(pts.length<3)return {need:3-pts.length};
  if(pts[pts.length-1].x-pts[0].x<10)return {short:true};
  const f=linFit(pts);if(!f||f.b<=0.0005)return {flat:true};
  const cur=Math.max(f.at(0),...pts.map(p=>p.y)),days=Math.max(1,Math.ceil((target-cur)/f.b));
  return {days,d:addDays(TODAY,days),n:pts.length,wk:f.b*7}}
const GOAL_STEPS={reps:[3,5,8,10,12,15,20,25,30,40,50,60,80,100],s:[30,45,60,90,120,180,240,300]};
function goalList(){
  const out=[],G=S.goals||{};
  BIG3.forEach(([id,n,u])=>{const h=byDate(S.gtg.max[id]||[]);if(!h.length)return;const cur=bestOf(id),k=u==='s'?'s':'reps';
    const auto=GOAL_STEPS[k].find(v=>v>cur)||cur+(k==='s'?60:10),tg=G[id]>cur?G[id]:auto;
    out.push({id,n,unit:k==='s'?' s':'',cur,tg,custom:G[id]>cur,from:h[0].v,e:etaFor(h,tg),what:'test'})});
  const cnt={};S.log.forEach(l=>Object.entries(l.ex).forEach(([id,s])=>{if(s.some(z=>z[0]>0))cnt[id]=(cnt[id]||0)+1}));
  Object.entries(cnt).filter(x=>x[1]>=2).sort((a,b)=>b[1]-a[1]).slice(0,3).forEach(([id])=>{const h=exHistory(id).filter(x=>x.kgd).map(x=>({d:x.d,v:x.v}));if(!h.length)return;
    const cur=Math.round(Math.max(...h.map(x=>x.v))*2)/2,key='ex:'+id,auto=Math.floor(cur/5)*5+5,tg=G[key]>cur?G[key]:auto;
    out.push({id:key,n:def(id).n,unit:' kg',cur,tg,custom:G[key]>cur,from:h[0].v,e:etaFor(h,tg),what:'session',rm:true})});
  const f=S.sk&&S.sk.focus&&SKI[S.sk.focus];
  if(f&&!BIG3.some(b=>b[0]===f.mx&&f.t!=='wt')){const h=byDate(skHist(f).map(a=>({d:a.d,v:a.v}))),cur=skBest(f).v||0;
    if(cur<f.v)out.push({id:'sk:'+f.id,n:f.n,unit:f.t==='hold'?' s':'',cur,tg:f.v,fixed:true,from:h.length?h[0].v:0,e:etaFor(h,f.v),what:'attempt'})}
  return out}
function goalRow(g){const e=g.e;
  const eta=e.d?(e.days>365?'1 y+':dShort(e.d)):'–';
  const sub=e.d?(e.days>365?'at this pace':`+${e.wk>=1?e.wk.toFixed(1):e.wk.toFixed(2)}${g.unit||''} a week`):e.need?`${e.need} more ${g.what}${e.need>1?'s':''} needed`:e.short?'needs 10+ days of results':'not moving yet';
  return `<button class="goal" data-a="sheet" data-k="goal" data-id="${g.id}"><span><b class="hi">${esc(g.n)}</b>${g.rm?' <span class="tag">1RM</span>':''}<br><span class="small muted">${g.cur}${g.unit} now → <b style="color:var(--ink)">${g.tg}${g.unit}</b>${g.rm?` (about ${Math.round(g.tg/(1+8/30)/2.5)*2.5} × 8)`:''}</span></span>
   <span style="text-align:right"><span class="eta">${eta}</span><br><span class="tiny muted">${sub}</span></span><span class="bar"><i style="width:${pct(g.cur-g.from,g.tg-g.from)||(g.cur>0?4:0)}%"></i></span></button>`}

/* ===================== Consistency calendar ===================== */
function dayMarks(d,t){const plan=dayForDate(d),tr=S.log.some(l=>l.d===d),fd=dayFood(d),sp=S.supps[d]||{};
  return {plan,t:tr?1:plan?(d<TODAY?-1:0):null,p:fd.length&&sumFood(d).pr>=t.pr*.9?1:0,w:S.weights.some(w=>w.d===d&&!w.sample)?1:0,s:sp.cr?1:0}}
function calCard(){
  const ym=UI.calM||TODAY.slice(0,7),[y,m]=ym.split('-').map(Number),n=new Date(y,m,0).getDate(),off=(parse(ym+'-01').getDay()+6)%7,t=targets(),c={t:0,tp:0,p:0,w:0,s:0,n:0};
  let cells='';for(let i=0;i<off;i++)cells+='<span class="cd out"></span>';
  for(let i=1;i<=n;i++){const d=ym+'-'+pad(i),fut=d>TODAY,k=dayMarks(d,t);
    if(!fut){c.n++;if(k.t===1)c.t++;if(k.plan||k.t===1)c.tp++;c.p+=k.p;c.w+=k.w;c.s+=k.s}
    cells+=`<button class="cd${d===TODAY?' today':''}${fut?' fut':''}" data-a="sheet" data-k="calday" data-d="${d}" ${fut?'disabled':''} aria-label="${fmtDate(d)}"><b>${i}</b><span class="q"><i class="${k.t===1?'t':k.t===null?'na':''}"></i><i class="${k.p?'p':''}"></i><i class="${k.w?'w':''}"></i><i class="${k.s?'s':''}"></i></span></button>`}
  const cur=ym===TODAY.slice(0,7),prev=ymd(new Date(y,m-2,1)).slice(0,7),next=ymd(new Date(y,m,1)).slice(0,7);
  const St=(v,of,l)=>`<div><span class="num hi" style="font-size:22px">${v}</span><span class="muted small">/${of}</span><p class="tiny muted">${l}</p></div>`;
  return `<div class="card stack"><div class="row between"><h3>${MON[m-1]}${y!==parse(TODAY).getFullYear()?' '+y:''}</h3><div class="row" style="gap:6px"><button class="icon-btn s" data-a="calm" data-m="${prev}" aria-label="Previous month">${ic('chevL')}</button><button class="icon-btn s" data-a="calm" data-m="${next}" ${cur?'disabled style="opacity:.3"':''} aria-label="Next month">${ic('chevR')}</button></div></div>
   <div class="cal">${['M','T','W','T','F','S','S'].map(x=>`<span class="hd">${x}</span>`).join('')}${cells}</div>
   <div class="lg"><span><i class="t"></i>Trained</span><span><i class="p"></i>Protein hit</span><span><i class="w"></i>Weighed in</span><span><i class="s"></i>Creatine</span></div>
   <div class="row between" style="text-align:center;padding-top:10px;border-top:1px solid var(--line)">${St(c.t,c.tp,'sessions')}${St(c.p,c.n,'protein')}${St(c.w,c.n,'weigh-ins')}${hasSupp('cr')?St(c.s,c.n,'creatine'):''}</div></div>`}
function daySheet(s){
  const d=s.d,t=targets(),lg=S.log.filter(l=>l.d===d),fd=dayFood(d),sm=sumFood(d),w=S.weights.find(x=>x.d===d&&!x.sample),sp=S.supps[d]||{},g=S.gtg.days[d]||{},plan=dayForDate(d);
  const R=(l,v,ok)=>`<div class="li"><span class="label" style="width:76px">${l}</span><span class="grow small">${v}</span>${ok?`<span style="color:var(--mint)">${ic('check')}</span>`:''}</div>`;
  const pills=[['fe','Iron'],['cr','Creatine'],['wh','Whey'],['mg','Magnesium']].filter(([k])=>sp[k]).map(x=>x[1]);
  const reps=Object.entries(g).filter(([,a])=>a&&a.length).map(([id,a])=>moveTxt(id,a.reduce((x,y)=>x+y,0))+' in '+a.length+' sets');
  return `<p class="label">${d===TODAY?'Today':diffDays(d,TODAY)+' days ago'}</p><h2>${fmtDate(d)}</h2>
   <div class="list">
    ${R('Training',lg.length?lg.map(l=>{const p=S.program.find(x=>x.id===l.day);return `<b class="hi">${p?esc(p.name):'Workout'}</b> · ${Object.values(l.ex).reduce((a,x)=>a+x.length,0)} sets${l.dur?' · '+l.dur+' min':''}`}).join('<br>'):plan?(d<TODAY?`${esc(plan.name)} was planned, not logged`:esc(plan.name)+' planned'):'Rest day',lg.length>0)}
    ${R('Food',fd.length?`<b class="hi">${fmt(sm.k)}</b> kcal · <b class="hi">${Math.round(sm.pr)}</b> g protein of ${t.pr}`:'Nothing logged',fd.length>0&&sm.pr>=t.pr*.9)}
    ${R('Weight',w?`<b class="hi">${w.kg} kg</b>${w.fasted===false?' · not fasted':''}`:'No weigh-in',!!w)}
    ${R('Pills',pills.length?pills.join(', '):'None ticked',!!sp.cr)}
    ${reps.length?R('Reps',reps.join('<br>')):''}
    ${S.sleep[d]!=null?R('Sleep',S.sleep[d]+' h'):''}${S.steps[d]?R('Steps',fmt(S.steps[d])):''}
   </div>
   ${fd.length?`<button class="btn" data-a="gofood" data-d="${d}">Open that day's food</button>`:''}${lg.length?`<button class="btn" data-a="wlog" data-li="${S.log.indexOf(lg[0])}">Open the session</button>`:''}`}

/* ===================== Progress photos (kept in the phone's own database, not in backups) ===================== */
const PH={db:null,urls:{},
  open(){return this.db||(this.db=new Promise((res,rej)=>{const r=indexedDB.open('rc-photos',1);r.onupgradeneeded=()=>r.result.createObjectStore('p');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))},
  async tx(mode,fn){const db=await this.open();return new Promise((res,rej)=>{const t=db.transaction('p',mode),rq=fn(t.objectStore('p'));t.oncomplete=()=>res(rq&&rq.result);t.onerror=()=>rej(t.error)})},
  put(id,blob){return this.tx('readwrite',s=>s.put(blob,id))},
  get(id){return this.tx('readonly',s=>s.get(id))},
  async del(id){if(this.urls[id]){URL.revokeObjectURL(this.urls[id]);delete this.urls[id]}return this.tx('readwrite',s=>s.delete(id))},
  async url(id){if(this.urls[id])return this.urls[id];try{const b=await this.get(id);return b?(this.urls[id]=URL.createObjectURL(b)):null}catch(_){return null}}};
function hydrate(){document.querySelectorAll('img[data-ph]:not([src])').forEach(async im=>{const u=await PH.url(im.dataset.ph);if(u)im.src=u})}
const photosOf=pose=>(S.photos||[]).filter(x=>x.pose===pose).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:a.id<b.id?-1:1);
async function photoAdd(blob,d,pose){const id=d+'-'+pose+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,4);await PH.put(id,blob);
  (S.photos=S.photos||[]).push({id,d,pose});if(!S.profile.photoLast||d>S.profile.photoLast)S.profile.photoLast=d;save();if(window.NX&&NX.savePhoto)NX.savePhoto(id,blob);return id}
function shrink(file,max=1600){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{const k=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');
  c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(img.src);c.toBlob(b=>b?res(b):rej(new Error('Could not read that photo')),'image/jpeg',.86)};
  img.onerror=()=>rej(new Error('Could not read that photo'));img.src=URL.createObjectURL(file)})}
const PH_POSES=['front','side','back'],capW=s=>s[0].toUpperCase()+s.slice(1);
function photoCard(){
  const ps=S.photos||[],p=S.profile,next=p.photoLast?addDays(p.photoLast,14):null,due=!next||diffDays(next,TODAY)>=0;
  const latest=PH_POSES.map(k=>photosOf(k).pop()).filter(Boolean);
  return `<div class="card stack"><div class="row between"><h3>Photos</h3>${due?`<span class="tag sig">${ps.length?'Due':'Take your first set'}</span>`:`<span class="tiny muted">next ${dShort(next)}</span>`}</div>
   ${latest.length?`<div class="phs">${latest.map(x=>`<button data-a="phopen" data-pose="${x.pose}" aria-label="${capW(x.pose)} photos"><img data-ph="${x.id}" alt=""><span>${capW(x.pose)} · ${dShort(x.d)}</span></button>`).join('')}</div>`
    :`<p class="small muted">Every 2 weeks: morning, same light, same spot. Your last photo shows faintly in the camera so you can match the pose, and compare is one tap.</p>`}
   <div class="grid2"><button class="btn primary" data-a="camopen" data-pose="front">Take photos</button><button class="btn" data-a="phopen" data-pose="front">${ps.length>1?'Compare':'Add old photos'}</button></div></div>`}
function photosSheet(){
  const pose=UI.phPose||'front',ps=photosOf(pose),a=ps.find(x=>x.id===UI.phA)||ps[0],b=ps.find(x=>x.id===UI.phB)||ps[ps.length-1];
  const opt=(sel)=>ps.map(x=>`<option value="${x.id}" ${x.id===sel.id?'selected':''}>${fmtDate(x.d)}</option>`).join('');
  return `<h2>Photos</h2>
   <div class="seg">${PH_POSES.map(k=>`<button class="${pose===k?'on':''}" data-a="phpose" data-v="${k}">${capW(k)} <span class="muted">${photosOf(k).length||''}</span></button>`).join('')}</div>
   ${ps.length>1?`<div class="compare"><img data-ph="${b.id}" alt="After"><img data-ph="${a.id}" alt="Before" style="clip-path:inset(0 ${100-UI.phX}% 0 0)"><span class="lbl" style="left:8px">${dShort(a.d)}</span><span class="lbl" style="right:8px">${dShort(b.d)}</span><div style="position:absolute;top:0;bottom:0;left:${UI.phX}%;width:2px;background:#fff"></div></div>
     <input type="range" min="0" max="100" value="${UI.phX}" data-c="phx" aria-label="Compare slider">
     <div class="grid2"><div class="field"><label class="label" for="phSA">Before</label><select id="phSA" data-c="phsel" data-k="A">${opt(a)}</select></div><div class="field"><label class="label" for="phSB">After</label><select id="phSB" data-c="phsel" data-k="B">${opt(b)}</select></div></div>`:''}
   ${ps.length?`<div class="phs">${ps.slice().reverse().map(x=>`<button data-a="sheet" data-k="phview" data-id="${x.id}" aria-label="Photo from ${fmtDate(x.d)}"><img data-ph="${x.id}" alt=""><span>${dShort(x.d)}</span></button>`).join('')}</div>`
    :`<p class="small muted">No ${pose} photos yet. Take one now, or add older ones from your gallery: they take the date of the file, and you can fix it after.</p>`}
   <div class="grid2"><button class="btn primary" data-a="camopen" data-pose="${pose}">Take ${pose}</button><label class="btn" style="text-align:center">Add from gallery<input type="file" accept="image/*" multiple data-c="phimport" hidden></label></div>
   <p class="small muted">Photos stay on this phone and are never uploaded. They are not part of the backup file${window.NX&&NX.native?', but a copy of each is saved to Documents on the phone':''}.</p>`}
function photoView(s){const x=(S.photos||[]).find(p=>p.id===s.id);if(!x)return '<p class="small muted">That photo is gone.</p>';
  return `<button class="btn sm ghost" data-a="phopen" data-pose="${x.pose}" style="align-self:flex-start">← All photos</button>
   <div class="compare"><img data-ph="${x.id}" alt="${capW(x.pose)} photo"></div>
   <div class="grid2"><div class="field"><label class="label" for="phD">Date</label><input id="phD" type="date" max="${TODAY}" value="${x.d}" data-c="phdate" data-id="${x.id}"></div><div class="field"><span class="label">Pose</span><div class="seg">${PH_POSES.map(k=>`<button class="${x.pose===k?'on':''}" data-a="phsetpose" data-id="${x.id}" data-v="${k}">${capW(k)}</button>`).join('')}</div></div></div>
   ${s.confirm?`<div class="row"><button class="btn grow" data-a="phdelno">Keep it</button><button class="btn grow" style="color:var(--bad)" data-a="phdelyes" data-id="${x.id}">Delete photo</button></div>`:`<button class="btn ghost" style="color:var(--bad)" data-a="phdel">Delete this photo</button>`}`}

/* ---- Camera with a faint overlay of your last photo ---- */
const CAM={stream:null,busy:false};
function camStop(){if(CAM.stream){CAM.stream.getTracks().forEach(t=>t.stop());CAM.stream=null}}
async function camStart(){camStop();const c=UI.cam;if(!c)return;
  try{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('No live camera here.');
    CAM.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:c.facing,width:{ideal:1920},height:{ideal:1080}},audio:false});
    if(!UI.cam){camStop();return}c.err='';const v=$('#camv');if(v){v.srcObject=CAM.stream;v.play().catch(()=>{})}}
  catch(e){c.err=/denied|permission|NotAllowed/i.test(e.name+e.message)?'Camera permission was not given.':'The live camera is not available here.';renderCam()}}
function renderCam(){const el=$('#cam'),c=UI.cam;if(!el)return;if(!c){el.innerHTML='';syncBack();return}
  const prev=photosOf(c.pose).pop(),g=c.ghost&&prev;
  el.innerHTML=`<div class="cam${c.facing==='user'?' mir':''}" role="dialog" aria-label="Progress photo camera">
   <div class="view"><video id="camv" autoplay playsinline muted></video>${g?`<img class="ghost" data-ph="${prev.id}" alt="">`:''}<div class="frame"></div><div class="count" id="camcount"></div>
    ${c.err?`<div class="stack" style="position:relative;padding:28px;text-align:center;max-width:320px"><p>${esc(c.err)}</p><label class="btn" style="text-align:center">Use the phone's camera app<input type="file" accept="image/*" capture="user" data-c="phfile" hidden></label></div>`:''}
    <div class="hud"><button class="btn sm" data-a="camclose">Close</button><div class="seg" style="background:#000a;flex:1;max-width:230px">${PH_POSES.map(k=>`<button class="${c.pose===k?'on':''}" data-a="campose" data-v="${k}">${capW(k)}</button>`).join('')}</div><button class="btn sm" data-a="camflip" aria-label="Switch camera">${ic('flip')}</button></div>
   </div>
   <div class="ctl"><button class="btn sm" data-a="camtimer" style="justify-self:start">Timer ${c.timer?c.timer+' s':'off'}</button><button class="shutter" data-a="camshot" aria-label="Take the ${c.pose} photo"></button>
    <button class="btn sm" data-a="camghost" style="justify-self:end" ${prev?'':'disabled'}>${prev?(c.ghost?'Overlay on':'Overlay off'):'No earlier photo'}</button></div></div>`;
  const v=$('#camv');if(v&&CAM.stream){v.srcObject=CAM.stream;v.play().catch(()=>{})}hydrate();syncBack()}

/* ===================== Progress ===================== */
function topLift(){const cnt={};S.log.forEach(l=>Object.entries(l.ex).forEach(([id,s])=>{if(s.some(z=>z[0]>0))cnt[id]=(cnt[id]||0)+1}));
  const id=S.profile.kpiLift&&cnt[S.profile.kpiLift]?S.profile.kpiLift:(Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]||[])[0];if(!id)return null;
  const h=exHistory(id).filter(x=>x.kgd),v=Math.max(...h.map(x=>x.v));return {id,n:def(id).n,v,dv:v-h[0].v}}
function progDue(){const p=S.profile;return !!(checkin().adj||(p.photoLast&&diffDays(addDays(p.photoLast,14),TODAY)>=0))}
function vProg(){
  const t=targets(),rate=weeklyRate(),tn=trendNow(),p=S.profile,ci=checkin();
  const band={gain:[0.15,0.35],recomp:[-0.1,0.1],cut:[-0.7,-0.3]}[p.goal],onT=rate!=null&&rate>=band[0]&&rate<=band[1];
  const pull=bestOf('pull'),ph=S.gtg.max.pull||[],pd=pull!=null&&ph.length?pull-ph[0].v:0,lift=topLift(),wa=lastOf(S.waist),w4=waist4w(),bf=bfNow(),arm=lastOf(S.arm);
  const ceil=tn&&rate>0.02&&p.ceiling>tn?addDays(TODAY,Math.round((p.ceiling-tn)/rate*7)):null,goals=goalList();
  const K=(attrs,label,v,unit,d,cls)=>`<button class="kpi" ${attrs}><span class="label">${label}</span><span class="v">${v}${unit?`<small>${unit}</small>`:''}</span><span class="d ${cls||''}">${d}</span></button>`;
  return `
  <div class="top"><div><p class="label">Since ${dShort(p.since)} · ${diffDays(p.since,TODAY)} days</p><h1>Progress</h1></div>
   <button class="icon-btn" data-a="camopen" data-pose="front" aria-label="Take progress photos">${ic('camera')}</button></div>
  <div class="stack">
   <div class="card stack">
    <div class="row between" style="align-items:flex-start"><div><p class="label">Weight trend <button class="info" data-a="sheet" data-k="winfo" aria-label="How weigh-ins work">i</button></p>
      <p style="margin-top:6px"><span class="num hi" style="font-size:46px;line-height:.9">${tn?tn.toFixed(1):'–'}</span> <span class="muted">kg</span></p></div>
     <div style="text-align:right">${rate!=null?`<span class="tag ${onT?'ok':'sig'}">${rate>0?'+':''}${rate.toFixed(2)} kg / wk</span>`:''}<p class="tiny muted" style="margin-top:7px">${tn?(p.ceiling-tn).toFixed(1)+' kg under your '+p.ceiling+' kg line':''}</p></div></div>
    ${chart()}
    <p class="small">${ci.txt}${ceil&&p.goal!=='cut'?` <span class="muted">At this pace you reach ${p.ceiling} kg around ${dShort(ceil)}.</span>`:''}</p>
    ${ci.adj?`<button class="btn cta" data-a="applyadj" data-v="${ci.adj}">Apply ${ci.adj>0?'+':''}${ci.adj} kcal</button>`:''}
    ${ci.wait&&p.ciLast===TODAY?`<button class="linkbtn" data-a="undoadj" style="align-self:flex-start">Undo today's change</button>`:''}
    <div class="row"><button class="btn sm" data-a="sheet" data-k="weight">Log weight</button><button class="btn sm ghost" data-a="wedit">Edit weigh-ins</button></div>
    <p class="tiny muted">Target ${fmt(t.k)} kcal a day · maintenance ${fmt(t.maint)} (${t.meas?'measured from your log':'estimated'})</p>
    ${!S.weights.length?`<button class="linkbtn" data-a="demo" style="align-self:flex-start">Preview with sample weigh-ins</button>`:S.weights.some(w=>w.sample)?`<button class="linkbtn" data-a="clearsample" style="align-self:flex-start">Clear sample weigh-ins</button>`:''}
   </div>
   <div class="kpis">
    ${K('data-a="maxtest" data-m="pull"','Pull-ups',pull!=null?pull:'–','best',pd>0?'+'+pd+' since start':pull!=null?'tap to test':'tap to test your max',pd>0?'up':'')}
    ${lift?K(`data-a="exinfo" data-id="${lift.id}"`,esc(lift.n),Math.round(lift.v),'kg 1RM',lift.dv>0.4?'+'+lift.dv.toFixed(1)+' kg since start':'estimated from your sets',lift.dv>0.4?'up':''):K('data-a="tab" data-t="train"','Top lift','–','','log a session to see it')}
    ${K('data-a="sheet" data-k="measure"','Waist',wa?wa.cm:'–','cm',w4?(w4.d>0?'+':'')+w4.d.toFixed(1)+' in 4 weeks':arm?'arm '+arm.cm+' cm':'tap to measure',w4?(w4.d>1.5?'dn':w4.d<=0.8?'up':''):'')}
    ${K('data-a="sheet" data-k="bf"','Body fat',bf.est!=null?Math.round(bf.est-3)+'–'+Math.round(bf.est+3):'–','%',bf.est!=null?(bf.n<3?'add a check to tighten it':'from '+bf.n+' methods'):'needs your waist')}
   </div>
   <div class="card"><div class="row between"><h3>Goal dates</h3><button class="info" data-a="sheet" data-k="goalinfo" aria-label="How goal dates are worked out">i</button></div>
    ${goals.length?`<div style="margin-top:6px">${goals.map(goalRow).join('')}</div>`:'<p class="small muted" style="margin-top:8px">Log a max test or two sessions of the same lift and your dates show up here.</p>'}</div>
   ${calCard()}
   ${photoCard()}
   <button class="card row" data-a="recap"><span class="thumb" style="width:44px;height:44px;display:grid;place-items:center;background:var(--raise);color:var(--muted)">${ic('cal')}</span><span class="grow"><b class="hi">Monthly recap</b><br><span class="small muted">sessions, records, kg moved, waist, skills</span></span>${ic('chevR','muted')}</button>
  </div>`}

/* ===================== The "+" box that takes anything ===================== */
const MOVE_RE={push:/\bpush[- ]?ups?\b/,pull:/\b(pull|chin)[- ]?ups?\b/,dip:/\bdips?\b/,hlr:/\b(knee|leg) raises?\b/,plank:/\bplanks?\b/};
function interpret(raw){
  const s=(raw||'').trim().toLowerCase();if(!s)return null;let m;const num=x=>parseFloat(String(x).replace(',','.'));
  if((m=s.match(/^(\d{2,3}(?:[.,]\d{1,2})?)\s*(?:kg)?$/))){const v=num(m[1]);if(v>40&&v<150)return {txt:`Weight <b>${v} kg</b>`,run:()=>{UI.sheet=null;logWeight(v);return 'keep'}}}
  if((m=s.match(/^(?:sleep|slept)\s*(\d{1,2}(?:[.,]\d)?)\s*h?$/)||s.match(/^(\d{1,2}(?:[.,]\d)?)\s*h(?:ours?|rs?)?(?:\s*(?:of\s*)?sleep)?$/))){const v=num(m[1]);if(v<16)return {txt:`Sleep <b>${v} h</b>`,run:()=>{S.sleep[TODAY]=v;save();toast('Sleep saved')}}}
  if((m=s.match(/^steps?\s*(\d{3,6})$/)||s.match(/^(\d{3,6})\s*steps?$/))){const v=+m[1];return {txt:`Steps <b>${fmt(v)}</b>`,run:()=>{S.steps[TODAY]=v;save();toast('Steps saved')}}}
  if((m=s.match(/^waist\s*(\d{2,3}(?:[.,]\d)?)(?:\s*cm)?$/))){const v=num(m[1]);if(v>50&&v<150)return {txt:`Waist <b>${v} cm</b>`,run:()=>{S.waist=S.waist.filter(w=>w.d!==TODAY);S.waist.push({d:TODAY,cm:v});save();toast('Waist saved')}}}
  const parts=s.split(/,|\+|\band\b/).map(x=>x.trim()).filter(Boolean),reps=parts.map(ch=>{const mv=MOVES.find(x=>MOVE_RE[x.id]&&MOVE_RE[x.id].test(ch)),n=ch.match(/\d+/);return mv&&n?{id:mv.id,v:+n[0]}:null});
  if(reps.length&&reps.every(Boolean))return {txt:'Rep set: <b>'+reps.map(r=>moveTxt(r.id,r.v)).join(', ')+'</b>',run:()=>{const g=gtgDay(TODAY);let pr=false;
    reps.forEach(r=>{(g[r.id]=g[r.id]||[]).push(r.v);if(BIG3.some(b=>b[0]===r.id)&&maybePR(r.id,r.v,'set'))pr=true});gtgMark();save();buzz(pr?[40,60,40]:30);toast(pr?'New record logged':'Rep set logged')}};
  const parsed=parseMeal(raw);
  if(parsed.length)return {food:true,txt:parsed.map(({f,x})=>esc(f.n)+(x!==1?' ×'+x:'')).join(', ')+` · <b>${fmt(parsed.reduce((a,{f,x})=>a+f.k*x,0))} kcal</b>`,
    run:()=>{const g=newG();parsed.forEach(({f,x})=>pushFood({n:f.n,k:f.k,pr:f.pr,c:f.c,f:f.f,fi:f.fi||0,x,g}));save();toast('Meal added')}};
  return {ai:true,txt:'Not in your saved foods. Log sends it to the AI estimate.',run:()=>{UI.desc=raw;UI.sheet={kind:'describe'};return 'keep'}}}
const anyOut=()=>{const r=interpret(UI.any);return r?`<div class="anyout"><span class="grow">${r.txt}</span>${r.food?`<button class="btn sm ghost" data-a="anyai">AI instead</button>`:''}</div>`:''};

/* ===================== Sheets ===================== */
function sheetX(s){
  const k=s.kind,t=targets();
  if(k==='plus'){const w=S.weights.find(x=>x.d===TODAY&&!x.sample),nx=gtgNext(),due=nx!=null&&nx<=nowMin(),f=S.sk&&S.sk.focus&&SKI[S.sk.focus],mfp=S.profile.mfpUser||S.profile.mfp,mn=(S.food[TODAY]||[]).filter(e=>e.src==='mfp'||e.src==='hc').length;
    const Act=(a,icn,title,sub,cls='')=>`<button class="act${cls}" ${a}>${ic(icn)}${title}<small>${sub}</small></button>`;
    return `<p class="label">Log something</p>
     <div class="any"><input id="any" data-c="any" autocomplete="off" autocapitalize="off" enterkeyhint="done" placeholder="74.6 · 8 pull-ups · 3 eggs, half baguette" value="${esc(UI.any||'')}" aria-label="Type anything to log it"><button class="btn sm cta" data-a="anygo">Log</button></div>
     <div id="anyout">${anyOut()}</div>
     <div class="acts">
      ${Act('data-a="scan"','barcode','Scan barcode','remembers your products')}
      ${Act('data-a="sheet" data-k="describe"','camera','Photo or describe','AI estimate')}
      ${S.gtg.on.length?Act('data-a="sheet" data-k="repset"','repeat','Rep set',due?'due now · '+repSetTxt():repSetTxt(),due?' due':''):''}
      ${Act('data-a="sheet" data-k="weight"','scale','Weight',w?w.kg+' kg today':'not logged today')}
      ${Act('data-a="sheet" data-k="search"','search','Search food','your list, USDA, packaged')}
      ${Act('data-a="skillgo"','target','Skill attempt',f?esc(f.n):'pick a skill')}
     </div>
     ${mfp?`<div class="row small muted">${ic('repeat')}<span class="grow">MyFitnessPal · ${mn} entr${mn===1?'y':'ies'} today${UI.mfpdAt||UI.mfpAt?' · synced '+(UI.mfpdAt||UI.mfpAt):''}</span><button class="btn sm" data-a="${S.profile.mfpUser?'mfpdsync':'mfpsync'}">Sync</button></div>`:''}`}
  if(k==='repset'){const g=gtgDay(TODAY),nx=gtgNext(),tr=trainedToday();
    return `<h2>Rep set</h2><p class="small muted">One easy set of each, about half your max. ${nx==null?'Reminders are done for today.':nx<=nowMin()?'A set is due now.':'Next reminder at '+hm(nx)+'.'}</p>
     <button class="btn cta block" data-a="repall">Did it · ${repSetTxt()}</button>
     <div class="card">${MOVES.filter(m=>S.gtg.on.includes(m.id)).map(m=>{const dn=g[m.id]||[];return `<div class="ex"><span class="thumb">${gMedia(m.g)}</span><span class="grow"><b>${m.n}</b><br><span class="small muted">${dn.length?'today: '+dn.join(', '):'none yet'}${tr.has(m.m)&&m.m!=='abs'?' · trained in the gym today':''}</span></span>
       <input class="num" id="rs-${m.id}" type="number" inputmode="numeric" value="${setSize(m.id)}" aria-label="${m.n} ${m.u==='s'?'seconds':'reps'}" style="width:70px;padding:7px"><button class="btn sm" data-a="gtglog2" data-m="${m.id}">Log</button>${m.u==='s'?`<button class="icon-btn s" data-a="htsheet" data-m="${m.id}" aria-label="Time the ${m.n.toLowerCase()}">${ic('clock')}</button>`:''}</div>`}).join('')}</div>
     <div class="row"><button class="btn sm ghost" data-a="remindsheet">Reminder times</button><button class="btn sm ghost" data-a="tab" data-t="train" data-tt="reps">Open daily reps</button></div>`}
  if(k==='weight'){const ws=countedW().slice(-5).reverse(),lw=ws[0];
    return `<h2>Morning weight</h2><p class="small muted">Right after waking, after the toilet, before food or water. Same scale, same spot.</p>
     <div class="row"><input class="num grow" id="wIn3" type="number" inputmode="decimal" step="0.1" placeholder="${lw?lw.kg:'kg'}" aria-label="Weight in kg" style="font-size:30px;padding:12px"><button class="btn cta" data-a="logw3" style="padding:16px 20px">Save</button></div>
     ${ws.length?`<div class="list">${ws.map(x=>`<div class="li small"><span class="grow muted">${fmtDate(x.d)}</span><b class="hi">${x.kg} kg</b></div>`).join('')}</div>`:''}
     <button class="btn sm ghost" data-a="wedit" style="align-self:flex-start">Edit or add past weigh-ins</button>`}
  if(k==='sleep'){const sl=S.sleep[TODAY];return `<h2>Sleep last night</h2><div class="row wrap" style="gap:6px">${[5,5.5,6,6.5,7,7.5,8,8.5,9].map(v=>`<button class="chip${sl===v?' on':''}" data-a="setsleep" data-v="${v}">${v} h</button>`).join('')}</div>
     <p class="small muted">Under 6.5 h, the app tells you to skip the last set of each exercise and hold off on record attempts.</p>`}
  if(k==='describe'){const parsed=parseMeal(UI.desc),pTot=parsed.reduce((a,{f,x})=>a+f.k*x,0);
    return `<h2>Photo or describe</h2>
     <textarea id="desc" placeholder="What was it? e.g. 2 eggs, half baguette, 3 dates. Or: mom's couscous with lamb, big plate" data-c="desc" aria-label="Describe your meal">${esc(UI.desc)}</textarea>
     ${hook('snapCard')}
     ${parsed.length?`<details class="card flat" style="padding:10px 12px"><summary class="row between"><span class="small"><b class="hi">Quick match, offline</b> · ${parsed.length} items · ${fmt(pTot)} kcal</span><span class="chip">Show</span></summary>
      <div class="list" style="margin-top:6px">${parsed.map(({f,x})=>`<div class="li"><span class="grow small"><b>${esc(f.n)}</b> <span class="muted">×${x}</span></span><span class="num hi" style="font-size:16px">${fmt(f.k*x)}</span></div>`).join('')}</div>
      <button class="btn block" data-a="adddesc" style="margin-top:6px">Add these</button></details>`:''}`}
  if(k==='search'){const items=[...FOODS,...S.myFoods.map(f=>({...f,cat:'mine'}))],q=UI.foodQ.trim().toLowerCase(),db=UI.db||{};
    const shown=items.map((f,i)=>({f,i})).filter(({f})=>q?(f.n+' '+(f.al||'')).toLowerCase().includes(q):f.cat===UI.foodCat);
    return `<h2>Search food</h2>
     <div class="row"><input id="fq" class="grow" type="search" placeholder="chicken breast, oats, Danone…" value="${esc(UI.foodQ)}" data-c="foodq" aria-label="Search foods"><button class="btn sm primary" data-a="dbgo" ${db.busy?'disabled':''}>${db.busy?'…':'Online'}</button></div>
     ${db.err?`<p class="small" style="color:var(--bad)">${esc(db.err)}</p>`:''}
     ${db.res&&db.q===UI.foodQ.trim()?`<p class="label">Online · per 100 g</p><div>${db.res.map((r,i)=>`<button class="food" data-a="dbpick" data-i="${i}"><div class="grow"><b>${esc(r.n)}</b><p class="small muted">${r.src==='usda'?'USDA lab data':'Open Food Facts label'}${r.serv?` · serving ${r.serv} g`:''}</p></div><div style="text-align:right"><div class="num hi" style="font-size:20px">${fmt(r.k)}</div><div class="small muted">${r.pr.toFixed(1)} g P</div></div></button>`).join('')||'<p class="small muted">Nothing online for that.</p>'}</div>`:''}
     ${q?'<p class="label">Your list</p>':`<div class="row wrap" style="gap:6px">${Object.entries(CATS).map(([c,v])=>`<button class="chip${UI.foodCat===c?' on':''}" data-a="foodcat" data-k="${c}">${v}</button>`).join('')}</div>`}
     <div>${shown.map(({f,i})=>`<button class="food" data-a="pickfood" data-i="${i}"><div class="grow"><b>${esc(f.n)}</b> ${f.src?`<span class="tag ok">${f.src==='official'?'Official':f.src==='scan'?'Scan':'Label'}</span>`:''}<p class="small muted">${esc(f.p)}</p></div><div style="text-align:right"><div class="num hi" style="font-size:20px">${fmt(f.k)}</div><div class="small muted">${f.pr} g P</div></div></button>`).join('')||'<p class="small muted">No matches in your list. Tap Online.</p>'}</div>
     <button class="btn block" data-a="customfood">+ Custom or restaurant item</button>`}
  if(k==='scan')return `<h2>Scan a barcode</h2>${hook('offCard')||'<p class="small muted">Barcode lookup is not available here.</p>'}`;
  if(k==='again'){const rec=againList();UI.rec=rec;const yest=groupsOn(addDays(TODAY,-1));
    return `<h2>Again</h2><p class="small muted">One tap adds the whole meal. ☆ pins it to the top for good. The ones you usually eat around this time come first.</p>
     ${yest.length?`<button class="btn" data-a="copyyest">Same as yesterday · ${yest.length} meals</button>`:''}
     <div class="recent">${rec.map((m,i)=>`<div class="li"><button class="icon-btn s" data-a="mealpin" data-i="${i}" aria-label="${m.pin?'Unpin':'Pin'} this meal" style="color:${m.pin?'var(--accent)':'var(--muted)'}">${m.pin?'★':'☆'}</button>
       <div class="grow"><b class="small hi">${esc(m.label||mealName(m.items))}</b><p class="small muted">${fmt(mealK(m.items))} kcal · ${Math.round(mealP(m.items))} P${m.n?` · ${m.n}× lately`:''}</p></div><button class="btn sm" data-a="mealadd" data-i="${i}">+ Add</button></div>`).join('')||'<p class="small muted">Meals you log show up here.</p>'}</div>`}
  if(k==='settings')return settingsSheet(s);
  if(k==='sources')return `<h2>MyFitnessPal</h2>${hook('mfpCard')}`;
  if(k==='circs')return `<h2>Circuits</h2><p class="small muted">Thursday is circuit day, at about 7/10 effort. Cindy makes a good monthly test. Never do a hard circuit the day before leg day.</p><div>${circList()}</div>`;
  if(k==='measure'){const M=(arr,id,act,l,tip,ph)=>{const a=lastOf(arr);return `<div class="card stack"><div class="row between"><p class="label">${l}</p>${a?`<span class="small"><b class="hi">${a.cm} cm</b> <span class="muted">${fmtDate(a.d)}</span></span>`:''}</div>
      <div class="row"><input id="${id}" class="num grow" type="number" inputmode="decimal" step="0.5" placeholder="${ph}" aria-label="${l} in cm"><button class="btn primary" data-a="${act}">Save</button></div>
      ${arr.length>1?`<p class="small muted">${arr.slice(-5).map(x=>x.cm).join(' → ')} cm</p>`:''}<p class="tiny muted">${tip}</p></div>`};
    return `<h2>Tape measure</h2>${M(S.waist,'waIn','logwaist','Waist, at the navel','Weekly, in the morning, relaxed belly. This is your belly-fat meter: if it grows more than 2 cm, the check-in pulls calories down.','cm')}
     ${M(S.arm,'arIn','logarm','Arm, flexed','Monthly. Your main goal.','cm')}${M(S.neck,'nkIn','logneck','Neck','Monthly, just below the Adam\'s apple. Tightens the body-fat estimate.','cm')}`}
  if(k==='bf')return `<h2>Body fat</h2>${bfCard()}`;
  if(k==='goal'){const g=goalList().find(x=>x.id===s.id);if(!g)return '<p class="small muted">That goal is gone.</p>';const e=g.e;
    const steps=g.rm?[1,2,3,4].map(i=>Math.floor(g.cur/5)*5+5*i):(GOAL_STEPS[g.unit===' s'?'s':'reps']||[]).filter(v=>v>g.cur).slice(0,4);
    return `<p class="label">Goal</p><h2>${esc(g.n)}</h2>
     <div class="grid2"><div class="stat"><p class="label">Now</p><div class="v">${g.cur}<small>${g.unit}</small></div></div><div class="stat"><p class="label">Target</p><div class="v">${g.tg}<small>${g.unit}</small></div></div></div>
     <p class="small">${e.d?`At your current pace (<b class="hi">+${e.wk>=1?e.wk.toFixed(1):e.wk.toFixed(2)}${g.unit} a week</b>, from ${e.n} ${g.what}s) you get there around <b class="hi">${fmtDate(e.d)}</b>${e.days>365?', which is over a year away. A smaller step first will feel better':''}.`:e.need?`Needs ${e.need} more ${g.what}${e.need>1?'s':''} before a date makes sense.`:e.short?'Your results are less than 10 days apart. A date shows up once they span more time.':'Your last results are flat or going down, so there is no honest date yet. It appears again once the line turns up.'}</p>
     ${g.rm?`<p class="small muted">Estimated 1-rep max from your sets (weight × (1 + reps ÷ 30)). ${g.tg} kg is roughly ${Math.round(g.tg/(1+8/30)/2.5)*2.5} kg × 8 or ${Math.round(g.tg/(1+5/30)/2.5)*2.5} kg × 5.</p>`:''}
     ${g.fixed?'<p class="small muted">This target is the standard for your skill focus, so it is fixed.</p>':`<div class="field"><span class="label">Change the target</span><div class="row wrap" style="gap:6px">${steps.map(v=>`<button class="chip${v===g.tg?' on':''}" data-a="goalset" data-id="${g.id}" data-v="${v}">${v}${g.unit}</button>`).join('')}</div></div>
      <div class="row"><input id="goalV" class="num grow" type="number" inputmode="decimal" placeholder="other" aria-label="Your own target"><button class="btn primary" data-a="goalset" data-id="${g.id}">Set</button></div>
      ${g.custom?`<button class="btn sm ghost" data-a="goalset" data-id="${g.id}" data-v="0" style="align-self:flex-start">Back to automatic next step</button>`:''}`}`}
  if(k==='goalinfo')return `<h2>Goal dates</h2><p class="small">Each date is a straight line through your own results from the last 4 months, carried forward to the target. Nothing else goes into it.</p>
    <ol class="why small" style="margin-top:0"><li>It needs at least 3 results spread over 10 days or more.</li><li>If the line is flat or going down, there is no date. It comes back when you start improving again.</li><li>Progress slows as you get stronger, so dates far away are optimistic. Treat anything past 3 months as rough.</li><li>Tap a goal to change its target.</li></ol>`;
  if(k==='calday')return daySheet(s);
  if(k==='photos')return photosSheet();
  if(k==='phview')return photoView(s);
  if(k==='winfo')return `<h2>Weigh-ins</h2><ol class="why small" style="margin-top:0"><li>Weigh right after waking, after the toilet, before food or water. Same scale, same spot.</li><li>The thick line is your trend: it smooths out daily water swings, so one heavy morning doesn't count as fat.</li><li>Weigh-ins that aren't fasted are kept, but left out of the trend and the check-ins.</li><li>The dashed line is your ${S.profile.ceiling} kg ceiling. Past stays here ended at 80–83 kg; this one stays under it with your waist up less than 2 cm.</li><li>Creatine adds 1–2 kg of water in the first weeks. The chart marks the start so it isn't read as fat.</li><li>Once a week the check-in looks at the trend and your waist, and offers a calorie change. You decide.</li></ol>`;
  if(k==='proginfo')return `<h2>How progression works</h2><p class="small">Each exercise has a rep range. Take every working set to 0–1 reps short of failure. When two sets reach the top of the range, the load goes up next time.</p><p class="small">Swap machines freely: history is kept per exercise, so each one remembers its own numbers. In a session, a swap is for today only unless you turn on <b>Also save to plan</b>.</p>`;
  if(k==='repinfo'){const rr=S.gtg.remind;return `<h2>Daily reps</h2><p class="small">Easy sets spread through the day, about half your max, never to failure. It is practice, not a workout: the reps add up without tiring you for the gym.</p>
     <p class="small">The clock starts when you log a set: the next reminder comes ${everyTxt(rr.every)} later, between ${rr.start} and ${rr.end}. Miss a few and you still get only one. ${hook('gtgNote')}</p>
     ${[['push','Push-ups',pushPlan],['pull','Pull-ups',pullPlan],['plank','Plank',plankPlan]].map(([id,n,fn])=>`<div class="card stack" style="gap:6px"><div class="row between"><b class="hi">${n}</b><span class="small muted">best ${maxOf(id)!=null?String(fmtV(id,bestOf(id))).replace(/<\/?small>/g,''):'–'}</span></div><p class="small">${fn(maxOf(id))}</p></div>`).join('')}`}
  if(k==='why'){const p=S.profile;return `<h2>Why this plan</h2><ol class="why small" style="margin-top:0">
     <li>Your cut worked: 2,000 kcal took you from 80 to 71 kg. At 71 kg you still saw belly fat, which usually means too little muscle under it.</li>
     <li>Maintenance in Malaysia with the walking was about 2,580 kcal. Here, without it, it's about ${fmt(t.est)}. That gap explains the 80–83 kg stays.</li>
     <li>About 250 kcal over maintenance, 5 training days, ${fmt(t.steps)} steps. Roughly +1 kg a month.</li>
     <li>Protein ${t.pr} g (${t.ppk} g/kg), the top of what research shows still helps.</li>
     <li>Arms and side delts get 3 sets per exercise, legs get one brutal day, everything else 2.</li>
     <li>The waist tape is the referee. If it grows more than 2 cm, the weekly check-in pulls calories down. The line for this stay: morning weight under ${p.ceiling} kg.</li></ol>`}
  return ''}
/* ===================== Settings =====================
   A short home list; each row opens its own page inside the same sheet (UI.sheet.pg). Back returns to the list. */
const GOALN={gain:'Lean gain',recomp:'Recomp',cut:'Cut'};
const segF=(f,opts,cur)=>`<div class="seg">${opts.map(([k,l])=>`<button class="${cur===k?'on':''}" data-a="set" data-f="${f}" data-v="${k}">${l}</button>`).join('')}</div>`;
const swF=(c,on,l,sub)=>`<label class="srow"><span class="grow"><b>${l}</b>${sub?`<br><span class="small muted">${sub}</span>`:''}</span><input type="checkbox" class="switch" ${on?'checked':''} data-c="${c}"></label>`;
const bkAgo=()=>{const b=S.lastBackup;return b?diffDays(b,TODAY):null};
function settingsSheet(s){const p=S.profile,t=targets(),pg=s.pg;
  const head=(title)=>`<div class="row" style="gap:8px;margin-top:-6px"><button class="btn sm ghost sback" data-a="setpg" data-v="">${ic('chevL')}Settings</button></div><h2>${title}</h2>`;
  if(pg==='goal')return `${head('Goal and food')}
   <div class="field"><span class="label">Goal</span>${segF('goal',[['gain','Lean gain'],['recomp','Recomp'],['cut','Cut']],p.goal)}</div>
   <div class="field"><span class="label">Where you live now</span>${segF('loc',[['TN','Tunisia'],['MY','Malaysia'],['XX','Elsewhere']],p.loc)}</div>
   ${p.loc==='XX'?`<div class="field"><label class="label" for="sReg">Country</label><input id="sReg" value="${esc(p.region||'')}" data-c="setstr" data-f="region" placeholder="e.g. France"></div>`:''}
   ${p.setup!=null?`<p class="label" style="margin-top:4px">Body</p><div class="field">${segF('sex',[['m','Male'],['f','Female']],p.sex)}</div><div class="card slist">
    <label class="srow"><span class="grow"><b>Birth date</b></span><input type="date" value="${p.dob}" max="${TODAY}" data-c="setstr" data-f="dob"></label>
    <label class="srow"><span class="grow"><b>Height</b><br><span class="small muted">cm</span></span><input class="num sin" type="number" inputmode="numeric" value="${p.height}" data-c="setnum" data-f="height" aria-label="Height in cm"></label></div>`:''}
   <div class="field"><span class="label">Supplements on Today</span><div class="row wrap" style="gap:6px">${SUPPN.map(([k,l])=>`<button class="chip${hasSupp(k)?' on':''}" data-a="setsupp" data-k="${k}">${hasSupp(k)?ic('check'):''}${l}</button>`).join('')}</div></div>
   <div class="card stack"><div class="row between"><p class="label">Daily targets</p><span class="chip${t.manual?' warn':''}">${t.manual?'Fixed':'Auto'}</span></div>
    <div class="grid4">${[[fmt(t.k),'kcal'],[t.pr,'protein'],[t.c,'carbs'],[t.f,'fat']].map(([v,l])=>`<div class="stat"><div class="v" style="font-size:24px">${v}</div><span class="tiny muted">${l}</span></div>`).join('')}</div>
    <p class="small muted">${t.manual?'Fixed calories: check-ins and the weight trend no longer move it. Clear the box below to go back to auto.':'Follows your goal, steps, weight trend and check-ins.'} Protein ${t.ppk} g/kg, fat ${t.fpk} g/kg, carbs fill the rest.</p></div>
   <div class="card slist">
    <label class="srow"><span class="grow"><b>Calories</b><br><span class="small muted">Empty = auto (${fmt(t.auto)})</span></span><input class="num sin" type="number" inputmode="numeric" step="50" placeholder="Auto" value="${p.kcalOver>0?p.kcalOver:''}" data-c="setnum" data-f="kcalOver" aria-label="Calories"></label>
    <label class="srow"><span class="grow"><b>Protein</b><br><span class="small muted">grams per kg</span></span><input class="num sin" type="number" inputmode="decimal" step="0.1" placeholder="2.2" value="${p.protPerKg>0?p.protPerKg:''}" data-c="setnum" data-f="protPerKg" aria-label="Protein grams per kg"></label>
    <label class="srow"><span class="grow"><b>Fat</b><br><span class="small muted">grams per kg</span></span><input class="num sin" type="number" inputmode="decimal" step="0.1" placeholder="0.9" value="${p.fatPerKg>0?p.fatPerKg:''}" data-c="setnum" data-f="fatPerKg" aria-label="Fat grams per kg"></label>
    <label class="srow"><span class="grow"><b>Weight ceiling</b><br><span class="small muted">kg, morning weight</span></span><input class="num sin" type="number" inputmode="decimal" step="0.5" value="${p.ceiling}" data-c="setnum" data-f="ceiling" aria-label="Weight ceiling"></label></div>
   <p class="label" style="margin-top:4px">Daily steps goal</p>
   <div class="card slist">
    <label class="srow"><span class="grow"><b>Tunisia</b></span><input class="num sin" type="number" inputmode="numeric" step="500" value="${p.stepsTN}" data-c="setnum" data-f="stepsTN" aria-label="Steps in Tunisia"></label>
    <label class="srow"><span class="grow"><b>Malaysia</b></span><input class="num sin" type="number" inputmode="numeric" step="500" value="${p.stepsMY}" data-c="setnum" data-f="stepsMY" aria-label="Steps in Malaysia"></label></div>
   <div class="card slist">${swF('lowEffort',p.lowEffort,'Low-effort food mode','Track protein only. Calories come from the weight trend.')}</div>
   <div class="field"><span class="label">Ramadan mode</span>${segF('ramadan',[['auto','Auto'],['on','On'],['off','Off']],p.ramadan)}<span class="tiny muted">Auto turns it on 8 Feb to 9 Mar.</span></div>
   <p class="tiny muted">Age ${ageOn(TODAY)}, ${p.height} cm, ${trendNow()?'trend '+trendNow().toFixed(1)+' kg':'assuming 74 kg'}.</p>`;
  if(pg==='train')return `${head('Training')}
   <div class="card slist">
    <label class="srow"><span class="grow"><b>Usual gym time</b><br><span class="small muted">Learns your real time after a few sessions</span></span><input type="time" value="${p.gymAt||'18:00'}" data-c="setstr" data-f="gymAt"></label>
    ${swF('restTimer',p.restTimer,'Rest timer','Counts down each time you tick a set')}</div>
   <div class="field"><span class="label">Session screen</span><div class="seg"><button class="${(p.wmode||'focus')==='focus'?'on':''}" data-a="wmode" data-v="focus">One set at a time</button><button class="${p.wmode==='list'?'on':''}" data-a="wmode" data-v="list">Full list</button></div></div>
   <p class="small muted">Today shows your session from 45 minutes before your gym time. All loads are in kg.</p>
   <button class="srow card" data-a="sheet" data-k="why" data-back="settings"><span class="grow"><b>Why this plan</b></span>${ic('chevR','muted')}</button>`;
  if(pg==='ai')return `${head('AI estimates')}${hook('setAI')}`;
  if(pg==='notif')return `${head('Notifications')}${hook('setNotif')}`;
  if(pg==='data'){const ago=bkAgo();return `${head('Backup and data')}
   <div class="card stack"><div class="row between"><p class="label">Backup</p><span class="chip ${ago==null||ago>7?'warn':'good'}">${ago==null?'Never backed up':ago===0?'Backed up today':ago+' d ago'}</span></div>
    <p class="small">Your data lives only on this phone. Save a backup every week and keep it in Drive or send it to yourself.</p>
    ${s.pending?`<p class="small"><b>Replace everything with the backup from ${s.pendingWhen}?</b> ${s.pending.weights.length} weigh-ins, ${s.pending.log.length} workouts. What's on this phone now is lost.</p>
     <div class="row"><button class="btn grow" data-a="importno">Cancel</button><button class="btn grow primary" data-a="importyes">Restore</button></div>`
    :`<div class="grid2"><button class="btn primary" data-a="exportdata">Save backup</button><label class="btn" style="text-align:center">Restore<input type="file" accept="application/json,.json" data-c="importfile" hidden></label></div>`}
    ${hook('autoBkNote')}</div>
   <div class="card stack danger"><p class="label" style="color:var(--bad)">Erase</p><p class="small">Wipes everything on this phone: weigh-ins, food, workouts, photos and plan edits.</p>
    ${s.confirm?`<div class="row"><button class="btn grow" data-a="resetno">Keep my data</button><button class="btn grow" style="color:var(--bad)" data-a="resetyes">Erase everything</button></div>`:`<button class="btn" data-a="reset" style="align-self:flex-start">Erase app data</button>`}</div>
   <p class="tiny muted">Gym exercise drawings: Everkinetic, CC BY-SA 4.0. Skill drawings made for this app; orange marks the muscles doing the work.</p>`}
  // Home
  const ago=bkAgo(),row=(pg,icn,l,sub,right)=>`<button class="srow" data-a="setpg" data-v="${pg}"><span class="sic">${ic(icn)}</span><span class="grow"><b>${l}</b><br><span class="small muted">${sub}</span></span>${right||''}${ic('chevR','muted')}</button>`;
  const ai=hook('aiState'),nt=hook('notifState');
  return `<h2>${p.name?esc(p.name):'Settings'}</h2>${p.name?'<p class="label" style="margin-top:-8px">Settings</p>':''}
   <div class="card shero"><div class="grow"><p class="label">${GOALN[p.goal]||'Goal'} · ${p.loc==='MY'?'Malaysia':p.loc==='XX'?esc(p.region||'Elsewhere'):'Tunisia'}</p><p class="num hi" style="font-size:30px;line-height:1.05;margin-top:4px">${fmt(t.k)}<small class="muted"> kcal</small> · ${t.pr}<small class="muted"> g protein</small></p></div></div>
   <div class="card slist">
    ${row('goal','target','Goal and food','Goal, targets, steps, Ramadan')}
    ${row('train','barbell','Training','Gym time, rest timer, session screen')}</div>
   <div class="card slist">
    ${row('ai','spark','AI estimates','Gemini and OpenRouter keys',`<span class="chip${ai==='Not set up'?' warn':''}">${ai}</span>`)}
    ${nt?row('notif','bell','Notifications','Weigh-in, pills, rep sets',`<span class="chip">${nt}</span>`):''}
    ${WEB?'':`<button class="srow" data-a="sheet" data-k="sources" data-back="settings"><span class="sic">${ic('repeat')}</span><span class="grow"><b>MyFitnessPal</b><br><span class="small muted">${S.profile.mfpUser||S.profile.mfp?'Connected':'Import your diary'}</span></span>${ic('chevR','muted')}</button>`}</div>
   <div class="card slist">
    ${row('data','save','Backup and data','Save, restore, erase',`<span class="chip ${ago==null||ago>7?'warn':'good'}">${ago==null?'Never':ago===0?'Today':ago+' d'}</span>`)}</div>
   <p class="tiny muted" style="text-align:center">Tally</p>`}



/* ===================== Web / iPhone =====================
   Outside the Android app: an offline cache, a request to keep this site's data, and a hint to install it,
   because on iPhone only a home-screen app keeps its data safe and gets its own full-screen window. */
const WEB=!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
const IOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const STANDALONE=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
if(WEB&&'serviceWorker' in navigator&&location.protocol!=='file:')addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
if(WEB&&navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
function installHint(){if(!WEB||STANDALONE||!IOS||UI.hintOff)return '';
  return `<div class="card ihint"><span class="sic">${ic('save')}</span><div class="grow"><b class="hi">Add Tally to your home screen</b>
   <p class="small muted">In Safari tap <b>Share</b> (the square with the arrow), then <b>Add to Home Screen</b>. It opens full screen, works offline and keeps your data safe.</p></div>
   <button class="icon-btn s" data-a="hintoff" aria-label="Hide">${I.x}</button></div>`}

/* ===================== First run =====================
   A new phone (no saved data) starts here: a welcome and three short steps, then the app is set up for that person. */
const SUPPN=[['cr','Creatine'],['wh','Whey'],['fe','Iron'],['mg','Magnesium']];
function vSetup(){const o=UI.ob||(UI.ob={step:0,sex:'m',goal:'recomp',loc:'TN',steps:6000,supps:[],ram:false,name:'',dob:'',height:'',kg:'',region:''});
  const dots=`<div class="obdots">${[0,1,2,3].map(i=>`<i class="${i<=o.step?'on':''}"></i>`).join('')}</div>`;
  const seg=(f,opts)=>`<div class="seg">${opts.map(([k,l])=>`<button class="${String(o[f])===String(k)?'on':''}" data-a="obset" data-f="${f}" data-v="${k}">${l}</button>`).join('')}</div>`;
  const nav=(next,label)=>`<div class="row obnav">${o.step?`<button class="btn" data-a="obstep" data-v="-1">Back</button>`:''}<button class="btn cta grow" data-a="${next}">${label}</button></div>`;
  const inp=(f,label,attrs)=>`<div class="field"><label class="label" for="ob-${f}">${label}</label><input id="ob-${f}" value="${esc(o[f]||'')}" data-c="ob" data-f="${f}" ${attrs}></div>`;
  let body='';
  if(o.step===0)body=`<div class="obmark" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></div>
    ${installHint()}<h1 class="obh">Tally</h1><p class="obsub">Training, food and body, counted one mark at a time. Everything stays on this phone.</p>
    ${inp('name','Your first name','autocomplete="given-name" autocapitalize="words" placeholder="Name"')}
    ${nav('obnext','Set it up')}
    <button class="btn ghost block" data-a="obrestore">I have a Tally backup</button>`;
  if(o.step===1)body=`<p class="label">Step 1 of 3</p><h2 class="obh2">About you</h2><p class="small muted">Used for your calories and protein. You can change all of it later in Settings.</p>
    <div class="field"><span class="label">Body</span>${seg('sex',[['m','Male'],['f','Female']])}</div>
    ${inp('dob','Birth date','type="date" max="'+TODAY+'"')}
    <div class="grid2">${inp('height','Height (cm)','type="number" inputmode="numeric" placeholder="175"')}${inp('kg','Weight (kg)','type="number" inputmode="decimal" step="0.1" placeholder="72.5"')}</div>
    <p class="tiny muted">Weight: this morning if you can, after the toilet, before food or water.</p>
    ${nav('obnext','Next')}`;
  if(o.step===2)body=`<p class="label">Step 2 of 3</p><h2 class="obh2">Your goal</h2>
    <div class="stack" style="gap:8px">${[['cut','Lose fat','Eat below maintenance, keep your strength.'],['recomp','Recomp','Lose a little fat and build muscle at about the same weight.'],['gain','Build muscle','A small surplus. Slow, lean weight gain.']].map(([k,l,d])=>`<button class="obopt${o.goal===k?' on':''}" data-a="obset" data-f="goal" data-v="${k}"><b>${l}</b><span class="small muted">${d}</span></button>`).join('')}</div>
    <div class="field"><span class="label">How much do you walk on a normal day?</span>${seg('steps',[[3000,'Little'],[6000,'Some'],[10000,'A lot']])}</div>
    <div class="field"><span class="label">Where you live</span>${seg('loc',[['TN','Tunisia'],['MY','Malaysia'],['XX','Elsewhere']])}</div>
    ${o.loc==='XX'?inp('region','Country (helps the AI judge local food)','placeholder="e.g. France"'):''}
    ${nav('obnext','Next')}`;
  if(o.step===3){const prev=obPreview(o);body=`<p class="label">Step 3 of 3</p><h2 class="obh2">Daily habits</h2>
    <div class="field"><span class="label">Supplements you take (each gets a tick on Today)</span><div class="row wrap" style="gap:6px">${SUPPN.map(([k,l])=>`<button class="chip${o.supps.includes(k)?' on':''}" data-a="obsupp" data-k="${k}">${o.supps.includes(k)?ic('check'):''}${l}</button>`).join('')}</div></div>
    <label class="srow card"><span class="grow"><b>I fast in Ramadan</b><br><span class="small muted">Meals move to iftar and suhoor during the month</span></span><input type="checkbox" class="switch" ${o.ram?'checked':''} data-c="obram"></label>
    <div class="card shero"><div class="grow"><p class="label">Your starting targets</p><p class="num hi" style="font-size:30px;line-height:1.05;margin-top:4px">${fmt(prev.k)}<small class="muted"> kcal</small> · ${prev.pr}<small class="muted"> g protein</small></p>
     <p class="small muted" style="margin-top:6px">A first guess. After 2 to 3 weeks of weigh-ins and food logs, Tally measures your real maintenance and adjusts.</p></div></div>
    ${nav('obdone','Start')}`}
  return `<div class="obwrap">${dots}${body}</div>`}
// Same maths as targets(), run on the answers so far.
function obPreview(o){const keep=S.profile;S.profile={...keep,...obProfile(o)};try{return targets()}finally{S.profile=keep}}
function obProfile(o){const kg=parseFloat(o.kg)||74;return {setup:true,name:(o.name||'').trim(),sex:o.sex,dob:o.dob,height:+o.height,startKg:kg,goal:o.goal,loc:o.loc,region:(o.region||'').trim(),
  stepsTN:+o.steps,stepsMY:+o.steps,ceiling:Math.round(kg+4),supps:o.supps.slice(),ramadan:o.ram?'auto':'off',since:TODAY}}

/* ===================== Render ===================== */
function render(){
  if(UI.tab==='body')UI.tab='prog';if(UI.tab==='cali'){UI.tab='train';UI.trainTab='reps'}
  const V={today:vToday,train:vTrain,eat:vEat,prog:vProg};if(!V[UI.tab])UI.tab='today';
  const app=$('#app');app.className='app'+(UI.enter?' enter':'');UI.enter=false;
  if(S.profile.setup===false){app.innerHTML=vSetup();$('#tabs').innerHTML='';document.body.classList.add('setup');renderSheet();return}
  document.body.classList.remove('setup');app.innerHTML=(UI.tab==='today'?installHint():'')+V[UI.tab]();
  const due=progDue();
  $('#tabs').innerHTML=[['today','Today','sun'],['train','Train','barbell'],null,['eat','Food','bowl'],['prog','Progress','trend']].map(x=>x
    ?`<button class="tab${UI.tab===x[0]?' on':''}" data-a="tab" data-t="${x[0]}">${ic(x[2])}<span>${x[1]}</span>${x[0]==='prog'&&due&&UI.tab!=='prog'?'<i class="badge"></i>':''}</button>`
    :`<button class="fab" data-a="plus" aria-label="Log something">${ic('plus')}</button>`).join('');
  renderSheet();renderTimer();renderOver();mapCenter();if(UI.ht)htTick();
}
function renderSheet(){const y=$('.sheet')?.scrollTop||0;$('#sheet').innerHTML=sheetHTML();const sh=$('.sheet');if(sh)sh.scrollTop=y;
  const plus=!!(UI.sheet&&UI.sheet.kind==='plus');document.body.classList.toggle('plus',plus);const f=$('.fab');if(f)f.classList.toggle('open',plus);hydrate();if(typeof syncBack==='function')syncBack()}
// Rest countdown: inside the set card in one-set mode, a floating bar everywhere else.
function renderTimer(){const el=$('#timer');if(!UI.timerEnd||UI.run){el.innerHTML='';return}
  const left=Math.max(0,Math.round((UI.timerEnd-Date.now())/1000)),fr=$('#frest');
  if(left===0&&UI.timerBeep!==UI.timerEnd){UI.timerBeep=UI.timerEnd;beep(1040,220);buzz([90,60,90])}
  if(fr){el.innerHTML='';if(left===0){UI.timerEnd=0;render();return}const b=fr.querySelector('b');if(b)b.textContent=restTxt(left);return}
  el.innerHTML=`<div class="timer"><div><span class="small">Rest</span><b>${restTxt(left)}</b><span class="grow small">${left?'':'Go. Next set.'}</span><button data-a="tplus">+30 s</button><button data-a="tstop">Skip</button></div></div>`}

/* ===================== Actions ===================== */
(function(){
const old={startday:A.startday,exmove:A.exmove,closesheet:A.closesheet};
const after=(n,fn)=>{const f=A[n];if(f)A[n]=(...a)=>{const r=f(...a);fn(...a);return r}};
// Food added from a sheet opened through "+": close the sheet when it lands.
const shut=kinds=>()=>{if(UI.sheet&&kinds.includes(UI.sheet.kind)){UI.sheet=null;render()}};
after('offadd',shut(['scan']));after('offmanual',shut(['scan']));after('aiadd',shut(['describe']));after('adddesc',shut(['describe']));
Object.assign(A,{
 tab:t=>{const k=t.dataset.t;UI.enter=UI.tab!==k||!!t.dataset.tt;UI.tab=k;if(t.dataset.tt)UI.trainTab=t.dataset.tt;UI.foodQ='';UI.foodDay=null;UI.sheet=null;render();scrollTo(0,0)},
 plus:()=>{UI.sheet=UI.sheet&&UI.sheet.kind==='plus'?null:{kind:'plus'};UI.any='';render()},
 sheet:t=>{const d={...t.dataset};delete d.a;const k=d.k;delete d.k;UI.sheet={kind:k,...d};renderSheet();const sh=$('.sheet');if(sh)sh.scrollTop=0},
 traintab:t=>{UI.trainTab=t.dataset.v;UI.enter=true;render();scrollTo(0,0)},
 planday:t=>{UI.planDay=t.dataset.d;render()},
 setsupp:t=>{const k=t.dataset.k,a=Array.isArray(S.profile.supps)?S.profile.supps:SUPPN.map(x=>x[0]),i=a.indexOf(k);if(i>=0)a.splice(i,1);else a.push(k);S.profile.supps=a;save();render()},
 hintoff:()=>{UI.hintOff=true;render()},
 obset:t=>{UI.ob[t.dataset.f]=t.dataset.f==='steps'?+t.dataset.v:t.dataset.v;render()},
 obsupp:t=>{const a=UI.ob.supps,k=t.dataset.k,i=a.indexOf(k);if(i>=0)a.splice(i,1);else a.push(k);render()},
 obstep:t=>{UI.ob.step=Math.max(0,UI.ob.step+ +t.dataset.v);render();scrollTo(0,0)},
 obrestore:()=>{UI.sheet={kind:'settings',pg:'data'};renderSheet()},
 obnext:()=>{const o=UI.ob;document.querySelectorAll('[data-c=ob]').forEach(i=>{o[i.dataset.f]=i.value});
   if(o.step===1){const h=+o.height,kg=parseFloat(o.kg),a=o.dob?Math.floor((Date.now()-parse(o.dob))/3.156e10):0;
     if(!o.dob||a<12||a>90)return toast('Add your birth date');if(!(h>=120&&h<=230))return toast('Height in cm, e.g. 175');if(!(kg>=35&&kg<=250))return toast('Weight in kg, e.g. 72.5')}
   if(o.step===2&&o.loc==='XX'&&!(o.region||'').trim())return toast('Type your country');
   o.step++;render();scrollTo(0,0)},
 obdone:()=>{const o=UI.ob;S.profile={...S.profile,...obProfile(o)};S.weights.push({d:TODAY,kg:Math.round(parseFloat(o.kg)*10)/10});
   UI.ob=null;UI.tab='today';UI.enter=true;save();render();toast(S.profile.name?'Welcome, '+S.profile.name:'All set')},
 htstart:t=>{const m=t.dataset.m;UI.ht={m,t0:Date.now()+3000,tgt:setSize(m),hit:false,cd:4};keepAwake(true);render();htTick();
   setTimeout(()=>{const el=document.getElementById('ht');if(el)el.scrollIntoView({block:'center',behavior:'smooth'})},50)},
 htsheet:t=>{UI.sheet=null;UI.tab='train';UI.trainTab='reps';A.htstart(t)},
 htcancel:()=>{UI.ht=null;keepAwake(false);render()},
 htstop:()=>{const h=UI.ht;if(!h)return;const sec=Math.floor((Date.now()-h.t0)/1000);UI.ht=null;keepAwake(false);
   if(sec<1){render();return toast('Stopped before it started')}
   render();const i=document.getElementById('gtg-'+h.m);if(i){i.value=sec;A.gtglog({dataset:{m:h.m}})}},
 setpg:t=>{UI.sheet={kind:'settings',pg:t.dataset.v||''};renderSheet();const sh=$('.sheet');if(sh)sh.scrollTop=0},
 wmode:t=>{S.profile.wmode=t.dataset.v;UI.fx=null;save();render()},
 startday:t=>{UI.fx=null;UI.enter=true;UI.sheet=null;old.startday(t)},
 exmove:t=>{const i=UI.sheet.x,j=i+(+t.dataset.d);old.exmove(t);if(UI.fx===i&&S.active&&j>=0&&j<S.active.list.length){UI.fx=j;render()}},
 // one-set mode
 fgo:t=>{const n=S.active.list.length;UI.fx=Math.max(0,Math.min(n-1,fxCur()+(+t.dataset.d)));UI.tip=null;render()},
 fstep:t=>{const x=S.active.list[fxCur()],si=x.sets.findIndex(s=>!s.done);if(si<0)return;const s=x.sets[si],dl=+t.dataset.d;
   if(t.dataset.k==='kg'){const el=$('#fkg'),cur=parseFloat(el.value)||0,st=cur<10||(cur===10&&dl<0)?1:2.5,v=Math.max(0,Math.round((cur+dl*st)*2)/2);s.kg=v||'';el.value=v||''}
   else{const el=$('#freps'),v=Math.max(0,(parseInt(el.value)||0)+dl);s.reps=v;el.value=v}
   save();buzz(8)},
 fdone:()=>{const a=S.active,x=a.list[fxCur()],si=x.sets.findIndex(s=>!s.done);if(si<0)return;const s=x.sets[si],d=def(x.id);
   const kg=parseFloat($('#fkg').value)||0,reps=parseInt($('#freps').value);if(!(reps>0))return toast('Set the reps first');
   s.kg=kg||'';s.reps=reps;s.done=true;x.sets.slice(si+1).forEach(z=>{if(!z.done)z.kg=s.kg});
   const r=records()[x.id],pr=kg&&(!r||e1(kg,reps)>r.v+0.01);
   if(S.profile.restTimer){UI.timerEnd=Date.now()+d.rest*1000;UI.timerBeep=0}
   if(!x.sets.some(z=>!z.done)){const n=a.list.length;for(let j=1;j<=n;j++){const q=(UI.fx+j)%n;if(a.list[q].sets.some(z=>!z.done)){UI.fx=q;break}}}
   UI.tip=null;save();buzz(pr?[40,60,40]:25);render();if(pr)toast('New record on '+d.n+': '+kg+' × '+reps)},
 frestskip:()=>{UI.timerEnd=0;render()},
 funtick:()=>{const x=S.active.list[fxCur()],l=[...x.sets].reverse().find(s=>s.done);if(l){l.done=false;save();render()}},
 finishw:()=>{const a=S.active,ex={};let n=0;a.list.forEach(x=>{const d=x.sets.filter(s=>s.done&&s.reps!=='').map(s=>[+s.kg||0,+s.reps]);if(d.length){ex[x.id]=(ex[x.id]||[]).concat(d);n+=d.length}});
   if(!n)return toast('Finish at least one set, or discard');
   const bwp=Math.max(0,...[...(ex.pullup||[]),...(ex.chinup||[])].filter(z=>!z[0]).map(z=>z[1])),gp=bwp&&maybePR('pull',bwp,'gym');
   const st=new Date(a.start),sameDay=ymd(st)===TODAY,dur=Math.round((Date.now()-a.start)/60000);
   S.log.push({d:a.d,day:a.day,ex,...(sameDay&&a.d===TODAY?{t0:st.getHours()*60+st.getMinutes(),t1:nowMin(),dur}:{})});sortLog();
   S.active=null;UI.fx=null;UI.timerEnd=0;UI.tab='today';UI.enter=true;save();render();scrollTo(0,0);toast(n+' set'+(n>1?'s':'')+' saved'+(dur>0&&dur<300?' · '+dur+' min':''));if(gp)setTimeout(()=>toast('New pull-up record: '+bwp),2300)},
 // quick logs
 repall:()=>{if(!S.gtg.on.length)return toast('Pick your moves under Train → Reps first');const g=gtgDay(TODAY),ids=[...S.gtg.on],prev=S.gtg.last;
   ids.forEach(id=>(g[id]=g[id]||[]).push(setSize(id)));gtgMark();save();if(UI.sheet&&UI.sheet.kind==='repset')UI.sheet=null;render();buzz(30);
   toast('Set logged · next in '+everyTxt(S.gtg.remind.every),()=>{ids.forEach(id=>(g[id]||[]).pop());S.gtg.last=prev;save();render()})},
 gtglog2:t=>{const m=t.dataset.m,v=parseInt($('#rs-'+m).value);if(!(v>0))return toast('Enter how many you did');const g=gtgDay(TODAY);(g[m]=g[m]||[]).push(v);gtgMark();
   const pr=BIG3.some(b=>b[0]===m)&&maybePR(m,v,'set');save();render();buzz(pr?[40,60,40]:30);toast(pr?'New record: '+moveTxt(m,v):moveTxt(m,v)+' logged')},
 logw3:()=>{const v=parseFloat($('#wIn3').value);if(!(v>40&&v<150))return toast('Enter your weight in kg, e.g. 76.4');UI.sheet=null;logWeight(v)},
 setsleep:t=>{S.sleep[TODAY]=+t.dataset.v;UI.sheet=null;save();render();toast('Sleep saved')},
 supp:t=>{const k=t.dataset.k,s=S.supps[TODAY]=S.supps[TODAY]||{};s[k]=!s[k];
   if(k==='fe'){if(s.fe)s.feAt=nowMin();else delete s.feAt}
   if(k==='cr'&&s.cr&&!S.profile.creatineStart){S.profile.creatineStart=TODAY;toast('Creatine start date saved')}
   if(k==='wh'){if(s.wh)pushFood({n:'Whey protein',k:120,pr:24,c:3,f:2,x:1,auto:'wh'});else{const a=S.food[TODAY]||[],i=a.findIndex(e=>e.auto==='wh');if(i>=0)a.splice(i,1)}}
   save();buzz(15);render()},
 anygo:()=>{const r=interpret(UI.any);if(!r)return toast('Type what you want to log');const keep=r.run()==='keep';UI.any='';if(!keep)UI.sheet=null;render()},
 anyai:()=>{UI.desc=UI.any;UI.any='';UI.sheet={kind:'describe'};render()},
 scan:()=>{UI.sheet={kind:'scan'};renderSheet();if(window.NX&&NX.native&&A.livescan)A.livescan()},
 skillgo:()=>{const f=S.sk&&S.sk.focus;if(f&&SKI[f]){UI.hold=null;UI.sheet={kind:'sk',id:f};renderSheet()}else{UI.sheet=null;UI.tab='train';UI.trainTab='skills';UI.enter=true;render();scrollTo(0,0);toast('Tap a skill, then "Make this my focus"')}},
 // food
 foodday:t=>{const d=+t.dataset.d,n=d===0?TODAY:addDays(UI.foodDay||TODAY,d);UI.foodDay=n>=TODAY?null:n;render();scrollTo(0,0)},
 gofood:t=>{UI.sheet=null;UI.tab='eat';UI.foodDay=t.dataset.d>=TODAY?null:t.dataset.d;UI.enter=true;render();scrollTo(0,0)},
 copyday:t=>{const gs=groupsOn(t.dataset.d);UI.foodDay=null;gs.forEach(gp=>{const g=newG();gp.items.forEach(i=>pushFood({...strip(i),g,...(i.t!=null?{t:i.t}:{})}))});save();render();scrollTo(0,0);toast('Copied '+gs.length+' meals to today')},
 // One tap adds a whole meal, so it always comes with an Undo.
 mealadd:t=>{const m=UI.rec&&UI.rec[+t.dataset.i];if(!m)return;const d=foodDayNow(),n0=(S.food[d]||[]).length;addMeal(m.items);render();buzz(20);
   toast('Added · '+fmt(mealK(m.items))+' kcal',()=>{S.food[d].splice(n0);save();render()})},
 fedit:t=>{UI.sheet={kind:'fedit',d:t.dataset.d||TODAY,i:+t.dataset.i};renderSheet()},
 // progress
 calm:t=>{UI.calM=t.dataset.m>=TODAY.slice(0,7)?null:t.dataset.m;render()},
 goalset:t=>{const id=t.dataset.id,v=t.dataset.v!=null?+t.dataset.v:parseFloat(($('#goalV')||{}).value);S.goals=S.goals||{};
   if(!(v>0)){if(t.dataset.v==null)return toast('Type a number');delete S.goals[id]}else S.goals[id]=v;save();render()},
 // photos
 phopen:t=>{UI.phPose=t.dataset.pose||UI.phPose||'front';UI.phA=UI.phB=null;UI.sheet={kind:'photos'};renderSheet();const sh=$('.sheet');if(sh)sh.scrollTop=0},
 phpose:t=>{UI.phPose=t.dataset.v;UI.phA=UI.phB=null;renderSheet()},
 phsetpose:t=>{const x=(S.photos||[]).find(p=>p.id===t.dataset.id);if(x){x.pose=t.dataset.v;save();renderSheet()}},
 phdel:()=>{UI.sheet.confirm=true;renderSheet()}, phdelno:()=>{UI.sheet.confirm=false;renderSheet()},
 phdelyes:async t=>{const id=t.dataset.id,x=(S.photos||[]).find(p=>p.id===id);S.photos=(S.photos||[]).filter(p=>p.id!==id);save();try{await PH.del(id)}catch(_){}UI.sheet={kind:'photos'};if(x)UI.phPose=x.pose;render();toast('Photo deleted')},
 camopen:t=>{const pose=t.dataset.pose||'front';UI.sheet=null;renderSheet();UI.cam={pose,facing:S.profile.camFacing||'user',ghost:true,timer:S.profile.camTimer||0,err:''};renderCam();camStart()},
 camclose:()=>{camStop();UI.cam=null;CAM.busy=false;renderCam();render()},
 campose:t=>{UI.cam.pose=t.dataset.v;renderCam()},
 camflip:()=>{const c=UI.cam;c.facing=c.facing==='user'?'environment':'user';S.profile.camFacing=c.facing;save();renderCam();camStart()},
 camghost:()=>{UI.cam.ghost=!UI.cam.ghost;renderCam()},
 camtimer:()=>{const c=UI.cam;c.timer={0:3,3:10,10:0}[c.timer]??0;S.profile.camTimer=c.timer;save();renderCam()},
 camshot:async()=>{const c=UI.cam;if(!c||CAM.busy)return;if(!CAM.stream)return toast('The camera is not ready');CAM.busy=true;const el=$('#camcount');
   for(let i=c.timer;i>0;i--){if(!UI.cam){CAM.busy=false;return}const e2=$('#camcount');if(e2)e2.textContent=i;beep(i<=3?880:660,90);await new Promise(r=>setTimeout(r,1000))}
   const e3=$('#camcount');if(e3)e3.textContent='';if(!UI.cam){CAM.busy=false;return}
   try{const v=$('#camv'),vw=v.videoWidth,vh=v.videoHeight;if(!vw)throw new Error('camera not ready');const k=Math.min(1,1600/Math.max(vw,vh)),cv=document.createElement('canvas');
     cv.width=Math.round(vw*k);cv.height=Math.round(vh*k);const x=cv.getContext('2d');if(c.facing==='user'){x.translate(cv.width,0);x.scale(-1,1)}x.drawImage(v,0,0,cv.width,cv.height);
     const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.86));await photoAdd(blob,TODAY,c.pose);beep(1320,120);buzz(40);
     const nx={front:'side',side:'back'}[c.pose];CAM.busy=false;if(nx){toast('Saved. Next: '+nx);c.pose=nx;renderCam()}else{toast('All three saved');A.camclose()}}
   catch(e){CAM.busy=false;toast('Could not take the photo: '+(e.message||e))}}
});
document.addEventListener('input',e=>{const t=e.target;if(t.dataset.c==='any'){UI.any=t.value;const o=$('#anyout');if(o)o.innerHTML=anyOut()}});
// Enter in a number or text box presses the button next to it.
document.addEventListener('keydown',e=>{const t=e.target;if(e.key!=='Enter'||t.tagName!=='INPUT')return;if(t.id==='any'){e.preventDefault();return A.anygo()}
  const box=t.closest('.row,.go'),b=box&&box.querySelector('button[data-a]:not([disabled])');if(b){e.preventDefault();t.blur();b.click()}});
document.addEventListener('change',async e=>{const t=e.target,c=t.dataset.c;if(!c)return;
  if(c==='ob'&&UI.ob){UI.ob[t.dataset.f]=t.value}
  if(c==='obram'&&UI.ob){UI.ob.ram=t.checked}
  if(c==='setstr'&&t.value){S.profile[t.dataset.f]=t.value;save()}
  if(c==='feset'&&UI.sheet&&UI.sheet.kind==='fedit'){const en=(S.food[UI.sheet.d]||[])[UI.sheet.i],v=+t.value;if(en&&v>=0){if(t.dataset.f==='k'&&en.k>0){const r=v/en.k;en.c=Math.round(en.c*r);en.f=Math.round(en.f*r)}en[t.dataset.f]=v;delete en.pend;save();render()}}
  if(c==='phsel'){UI['ph'+t.dataset.k]=t.value;renderSheet()}
  if(c==='phdate'&&t.value&&t.value<=TODAY){const x=(S.photos||[]).find(p=>p.id===t.dataset.id);if(x){x.d=t.value;save();renderSheet();toast('Date changed')}}
  if(c==='phimport'&&t.files.length){const pose=UI.phPose||'front';let n=0;toast('Adding…');
    for(const f of t.files){try{await photoAdd(await shrink(f),ymd(new Date(f.lastModified||Date.now())),pose);n++}catch(_){}}
    render();toast(n?n+' photo'+(n>1?'s':'')+' added. Tap one to fix its date.':'Could not read those photos')}
  if(c==='phfile'&&t.files[0]&&UI.cam){try{const pose=UI.cam.pose;await photoAdd(await shrink(t.files[0]),TODAY,pose);const nx={front:'side',side:'back'}[pose];toast('Saved '+pose+(nx?'. Next: '+nx:''));if(nx){UI.cam.pose=nx;renderCam()}else A.camclose()}catch(er){toast(er.message)}}});
})();


/* Hold timer tick: countdown beeps, then the stopwatch, a bigger beep at the target. */
function htTick(){const h=UI.ht;if(!h)return;const now=Date.now(),$i=id=>document.getElementById(id),c=$i('htc'),box=$i('ht'),l=$i('htl'),st=$i('hts'),b=$i('htb');
  if(now<h.t0){const n=Math.ceil((h.t0-now)/1000);if(n!==h.cd){h.cd=n;beep(520,90)}if(c)c.textContent=n;return}
  const e=(now-h.t0)/1000;if(h.cd!==0){h.cd=0;beep(1040,260);buzz(60)}
  if(!h.hit&&e>=h.tgt){h.hit=true;beep(1320,380);buzz([90,60,90])}
  if(c)c.textContent=mss(Math.floor(e));if(b)b.style.transform='scaleX('+Math.min(1,e/h.tgt)+')';
  if(box){box.classList.remove('ready');box.classList.toggle('past',h.hit)}
  if(l)l.textContent=h.hit?'Target hit · keep going or stop':'Holding';if(st&&h.hit)st.textContent='Past your set of '+mss(h.tgt)+' s'}
setInterval(htTick,200);

/* ===================== Android back button =====================
   Back closes whatever is on top (camera, a finished circuit, the skill map, a sheet), then returns to Today, and only then
   leaves the app. It works through one extra history entry that exists while anything is open. */
const BACK={on:false,skip:0};
const anyOpen=()=>!!(UI.cam||UI.run||(UI.cele&&UI.cele.length)||UI.mapFS||UI.sheet||UI.tab!=='today');
function syncBack(){const want=anyOpen();try{if(want&&!BACK.on){history.pushState({rc:1},'');BACK.on=true}else if(!want&&BACK.on){BACK.on=false;BACK.skip++;history.back()}}catch(_){}}
function backPressed(){
  if(UI.cam)return A.camclose();
  if(UI.run){if(UI.run.phase==='done')A.runclose();else{toast('Use End to stop the circuit');syncBack()}return}
  if(UI.cele&&UI.cele.length)return A.celeok();
  if(UI.mapFS)return A.mapfs({dataset:{v:'0'}});
  if(UI.sheet&&UI.sheet.kind==='settings'&&UI.sheet.pg)return A.setpg({dataset:{v:''}});
  if(UI.sheet&&UI.sheet.back==='settings')return A.setpg({dataset:{v:''}});
  if(UI.sheet)return A.closesheet();
  if(UI.tab!=='today')return A.tab({dataset:{t:'today'}})}
addEventListener('popstate',()=>{if(BACK.skip>0){BACK.skip--;return}BACK.on=false;backPressed();syncBack()});
{const ro=renderOver;renderOver=function(){ro();syncBack()}}

/* ===================== Start ===================== */
if(S.profile.restTimer==null){S.profile.restTimer=true}
S.photos=S.photos||[];S.goals=S.goals||{};
UI.tab='today';UI.trainTab='plan';UI.enter=true;UI.any='';
// Today changes with the clock: refresh it each minute when nothing is being typed.
setInterval(()=>{if(UI.tab==='today'&&!UI.sheet&&!UI.cam&&!UI.run&&!document.hidden&&!document.querySelector('input:focus,textarea:focus'))render()},60000);
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(UI.cam)A.camclose()}else if(!UI.sheet&&!UI.cam&&!document.querySelector('input:focus,textarea:focus'))render()});
// Photos whose image is gone (app data cleared, or a backup restored on another phone) are dropped from the list.
(async()=>{if(!S.photos.length)return;const keep=[];for(const p of S.photos){try{if(await PH.get(p.id))keep.push(p)}catch(_){keep.push(p)}}if(keep.length!==S.photos.length){S.photos=keep;save();render()}})();
render();
