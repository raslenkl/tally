/* UI layer, part 1: icons, helpers, Today, Food, Train.
   Loaded after index.html's script and native.js, so S, UI, A, targets(), hook() etc. are shared globals.
   Part 2 (ui-more.js) has Progress, photos, sheets, actions and render(). */

/* ===================== Icons (24 grid, stroked) ===================== */
const IC={
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
 barbell:'<path d="M2.5 12h2M19.5 12h2M7 6.5v11M17 6.5v11M4.5 9v6M19.5 9v6M7 12h10"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 bowl:'<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 20.5h6"/><path d="M9.5 4c-.7 1.2.7 2.1 0 3.3M14 3.5c-.8 1.4.8 2.4 0 3.8"/>',
 trend:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
 sliders:'<path d="M4 6h8M16 6h4M4 12h2M10 12h10M4 18h10M18 18h2"/><circle cx="14" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
 scale:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 10.5a5.5 5.5 0 0 1 8 0"/><path d="M12 12.5l2-3"/>',
 pill:'<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>',
 flask:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
 cup:'<path d="M7 8h10l-1 12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"/><path d="M6 8h12M9.5 4.5h5V8"/>',
 repeat:'<path d="M4 12V9a3 3 0 0 1 3-3h13M17 3l3 3-3 3M20 12v3a3 3 0 0 1-3 3H4M7 21l-3-3 3-3"/>',
 moon:'<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
 barcode:'<path d="M4 6v12M7 6v12M10.5 6v12M13 6v12M16.5 6v12M20 6v12"/>',
 camera:'<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
 target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".9" fill="currentColor"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 chevR:'<path d="M9 6l6 6-6 6"/>', chevL:'<path d="M15 6l-6 6 6 6"/>',
 cal:'<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M8 3v4M16 3v4"/>',
 photo:'<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M3.5 16l4.5-4.5 4 4 3-3 5.5 5.5"/><circle cx="15.5" cy="9.5" r="1.2"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
 focus:'<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9.5 12h5M12 9.5v5"/>',
 swap:'<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
 flag:'<path d="M5 21V4M5 4h12l-2.5 4 2.5 4H5"/>',
 bed:'<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.6"/>',
 pulse:'<path d="M3 12h4l2.5-6 4 12 2.5-6h5"/>',
 ruler:'<path d="M3 15L15 3l6 6L9 21zM7.5 13.5L9 15M10.5 10.5l2 2M13.5 7.5L15 9"/>',
 spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16v4M17 18h4"/>',
 trash:'<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
 flip:'<path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M20 4v4h-4M4 20v-4h4"/>',
 book:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"/>',
 bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>', save:'<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>', pause:'<path d="M9 6v12M15 6v12"/>', play:'<path d="M8 5l11 7-11 7z"/>',
 dots:'<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>'
};
const ic=(n,c='')=>`<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]||''}</svg>`;

/* ===================== Small helpers ===================== */
const pct=(v,m)=>Math.max(0,Math.min(100,m>0?v/m*100:0));
const dShort=d=>{const x=parse(d);return x.getDate()+' '+x.toLocaleString('en',{month:'short'})+(x.getFullYear()!==parse(TODAY).getFullYear()?" '"+String(x.getFullYear()).slice(2):'')};
const nTimes=()=>({weigh:'07:30',mg:'23:00',...(S.profile.notif||{})});
function ring2(v,max,big,small,color){const r=42,C=2*Math.PI*r,p=Math.min(1,max?v/max:0);
  return `<div class="ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--raise2)" stroke-width="8"/><circle class="v" cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-p)).toFixed(1)}" style="--c:${C.toFixed(1)}"${p?'':' stroke-opacity="0"'}/></svg><div class="c"><div><b>${big}</b><br><span>${small}</span></div></div></div>`}
const shortName=p=>p.name.includes('+')?p.name.split('+').map(s=>s.trim()[0]).join('+').toUpperCase():p.name.split(' ')[0].slice(0,4).toUpperCase();
function weekDates(){const dow=(parse(TODAY).getDay()+6)%7,mon=addDays(TODAY,-dow);return [0,1,2,3,4,5,6].map(i=>addDays(mon,i))}
// When you usually train: the middle of your last few session start times, or the time set in Settings.
function gymLearned(){const ts=S.log.filter(l=>l.t0!=null).slice(-6).map(l=>l.t0).sort((a,b)=>a-b);return ts.length>=3?ts[Math.floor(ts.length/2)]:null}
// Pinned in Settings: always that time. Otherwise the learned time once there are 3 timed sessions.
function gymAt(){const l=gymLearned();return !S.profile.gymPin&&l!=null?l:toMin(S.profile.gymAt||'18:00')}
// Long names get a smaller heading, so "Shoulders + Arms + Core" stays on two lines instead of five.
const nameCls=n=>{const s=String(n||'').length;return s>22?' xlong':s>13?' long':''};
const moveTxt=(id,v)=>{const m=MOVES.find(x=>x.id===id);return m?(m.u==='s'?v+' s '+m.n.toLowerCase():v+' '+m.n.toLowerCase()):''};
const repSetTxt=()=>S.gtg.on.map(id=>moveTxt(id,setSize(id))).filter(Boolean).join(', ');
const repRounds=()=>{const g=gtgDay(TODAY);return Math.max(0,...S.gtg.on.map(id=>(g[id]||[]).length))};
const lastTxt=h=>{const top=Math.max(...h.sets.map(s=>s[0]));return (top?top+' × ':'')+h.sets.filter(s=>s[0]===top).map(s=>s[1]).join(', ')};
function leadLine(p){const e=p.ex[0];if(!e)return '';const d=def(e.x),h=lastFor(d.id);if(!h)return `${esc(d.n)} first. New lift: find a load for ${d.r[1]} reps.`;
  const top=Math.max(...h.sets.map(s=>s[0])),sg=suggest(d);return `${esc(d.n)}: <b>${lastTxt(h)}</b> last time. ${+sg.kg>top?`Go up to <b>${sg.kg} kg</b>.`:'Beat it.'}`}

/* ===================== Food helpers ===================== */
const SLOT_N=['Breakfast','Lunch','Snack','Dinner','Logged'];
// Which meal an entry belongs to: MyFitnessPal says so itself, everything else goes by the time it was logged.
function slotOf(e){const m=String(e.g||'').match(/^(?:mfp|hc)-\d{4}-\d\d-\d\d-(.+)$/);
  if(m){const s=m[1].toLowerCase();return /break/.test(s)||s==='0'?0:/lunch/.test(s)||s==='1'?1:/dinner/.test(s)||s==='2'?3:2}
  // After midnight (before 4:00) is a late snack, not breakfast.
  if(e.t==null)return 4;return e.t<240?2:e.t<660?0:e.t<930?1:e.t<dinFrom()?2:3}
// Dinner starts at 18:30. In Ramadan it starts half an hour before iftar, so the meal you break the fast with is dinner.
let DINC=null;function dinFrom(){if(DINC&&DINC.k===TODAY+S.profile.ramadan)return DINC.v;let v=1110;try{if(ramadanOn()){const rt=ramadanTimes(nowMin()<dayEnd()?addDays(TODAY,1):TODAY);if(rt.iftar!=='–')v=Math.min(1110,toMin(rt.iftar)-30)}}catch(_){}DINC={k:TODAY+S.profile.ramadan,v};return v}
const SRC_TAG={mfp:'MFP',hc:'MFP',ai:'AI',off:'Scan',scan:'Scan',usda:'USDA'};
// Meals you repeat, best guess first: how often, how recently, and whether you usually eat it around this time of day.
// Each meal also remembers which meal of the day it usually is (slot), so the Food screen can offer it there.
function againList(){const map={},nm=nowMin();
  for(let i=0;i<=45;i++){const d=addDays(TODAY,-i);groupsOn(d).forEach(gp=>{if(gp.items.some(e=>e.pend))return;const sig=mealSig(gp.items);
    const m=map[sig]||(map[sig]={sig,items:gp.items.map(strip),n:0,last:d,ts:[],sl:[0,0,0,0,0]});m.n++;if(d>m.last)m.last=d;if(gp.items[0].t!=null)m.ts.push(gp.items[0].t);m.sl[slotOf(gp.items[0])]++})}
  const top=m=>{if(!m||!m.sl)return -1;const a=m.sl.slice(0,4),mx=Math.max(...a);return mx?a.indexOf(mx):-1};
  const pinned=new Set(S.meals.map(m=>m.sig)),near=m=>m.ts.length?Math.min(...m.ts.map(t=>Math.abs(t-nm))):999;
  const auto=Object.values(map).filter(m=>!pinned.has(m.sig)).map(m=>({...m,slot:top(m),score:m.n*3-diffDays(m.last,TODAY)/5+(near(m)<=90?6:near(m)<=180?2:0)})).sort((a,b)=>b.score-a.score).slice(0,12);
  return [...S.meals.map(m=>({...(map[m.sig]||{}),...m,slot:top(map[m.sig]),pin:true})),...auto]}
// Breakfast, lunch, snack, dinner: the time a meal added through that meal's "+" gets.
const SLOT_T=[480,780,990,1200];
const slotNow=()=>{const m=nowMin();return m<240?2:m<660?0:m<930?1:m<dinFrom()?2:3};
const mealLabel=m=>{const s=(m.label||mealName(m.items)).replace(/ · MFP/g,'');return s.length>30?s.slice(0,28)+'…':s};

/* ===================== Today: what matters right now ===================== */
// One state at a time, most pressing first. Everything else waits in the ticks and the timeline.
function nowState(){
  const nm=nowMinD(),sp=S.supps[TODAY]||{},t=targets(),sum=sumFood(TODAY),n=nTimes();
  const w=S.weights.find(x=>x.d===TODAY&&!x.sample),plan=dayForDate(TODAY),lg=S.log.filter(l=>l.d===TODAY).pop(),nx=gtgNext(),gym=gymAt();
  const left=t.k-sum.k,pleft=Math.max(0,Math.round(t.pr-sum.pr));
  if(S.active)return {k:'active'};
  if(nowMin()<240)return {k:'night'};
  if(!w&&nm<720)return {k:'weigh'};
  if(hasSupp('fe')&&!sp.fe&&nm<780)return {k:'iron'};
  if(plan&&!lg&&nm>=gym-45)return {k:'train',plan};
  if(S.gtg.on.length&&nx!=null&&nx<=nm)return {k:'reps'};
  if(lg&&lg.t1!=null&&nm-lg.t1<150&&nm>=lg.t1&&pleft>=25)return {k:'refuel',pleft,left};
  if(hasSupp('mg')&&!sp.mg&&nm>=toMin(n.mg)-60)return {k:'mag'};
  if(nm>=1170&&(left>250||pleft>=25))return {k:'eat',pleft,left};
  if(plan&&!lg)return {k:'train',plan,early:true};
  return {k:'clear',plan,lg};
}
function againBtns(n,protein){let r=againList();if(protein)r=r.filter(m=>mealP(m.items)>=15);
  return r.slice(0,n).map(m=>`<button class="btn sm" data-a="mealadd" data-sig="${esc(m.sig)}">${esc(mealLabel(m))} <span class="muted">${Math.round(mealP(m.items))} P</span></button>`).join('')}
function nowCard(st){
  const lab=(txt,live)=>`<p class="label"><span class="dot${live?' live':' calm'}"></span>${txt}</p>`;
  const sp=S.supps[TODAY]||{},nm=nowMin();
  if(st.k==='active'){const a=S.active,p=S.program.find(x=>x.id===a.day)||{name:'Workout'},all=a.list.flatMap(x=>x.sets),dn=all.filter(s=>s.done).length;
    return `<div class="now">${lab(a.d<TODAY?(a.past?'Logging for '+fmtDate(a.d):'Unfinished from '+fmtDate(a.d)):'Session in progress',1)}<h2 class="xl${nameCls(p.name)}">${esc(p.name).replace(' + ','<br>+ ')}</h2><p class="ctx">${dn}/${all.length} sets · ${Math.round((Date.now()-a.start)/60000)} min in</p><div class="go"><button class="btn cta" data-a="startday" data-id="${a.day}">Resume</button></div></div>`}
  if(st.k==='night'){const late=S.profile.dayEnd==null&&nm<240,y=addDays(TODAY,-1);
    return `<div class="now">${lab('Night')}<h2>Sleep</h2><p class="ctx">Weigh in when you wake up, after the toilet, before food or water.</p>
     ${late?`<p class="ctx">Still up? Anything you log now counts for <b>${fmtDate(TODAY)}</b>. If your day really ends when you go to bed, it can count for ${DOW[parse(y).getDay()]} instead.</p><div class="go"><button class="btn sm" data-a="dayend" data-v="180">My day ends at 3:00</button><button class="btn sm ghost" data-a="dayend" data-v="0">Keep midnight</button></div>`:''}</div>`}
  if(st.k==='weigh'){const lw=countedW().pop();
    return `<div class="now">${lab(nm<570?'Right now · just woke up':'Right now · before you eat',1)}<h2>Weigh in</h2><p class="ctx">After the toilet, before food or water.</p>
     <div class="go" style="flex-wrap:nowrap"><input class="num grow" id="wIn" type="number" inputmode="decimal" step="0.1" placeholder="${lw?lw.kg:'kg'}" aria-label="Morning weight in kg, fasted"><button class="btn cta" data-a="logw">Save</button></div>
     ${sp.fe||!hasSupp('fe')?'':`<div class="go"><button class="tick" data-a="supp" data-k="fe">${ic('pill')}Iron taken</button><span class="small muted">with water, before coffee</span></div>`}</div>`}
  if(st.k==='iron')return `<div class="now">${lab('Right now · empty stomach',1)}<h2>Take your iron</h2><p class="ctx">With water or orange juice. Coffee, tea, milk and whey from <b>${hm(Math.min(1439,nm+60))}</b>.</p><div class="go"><button class="btn cta" data-a="supp" data-k="fe">Taken</button></div></div>`;
  if(st.k==='train'){const p=st.plan,nSets=p.ex.reduce((a,e)=>a+e.s,0),first=p.ex[0];
    return `<div class="now${first?' has-fig':''}">${first?`<div class="pfig">${exMedia(first.x)}</div>`:''}${lab(st.early?'Today · around '+hm(gymAt()):'Right now · gym time',!st.early)}
     <h2 class="xl${nameCls(p.name)}">${esc(p.name).replace(' + ','<br>+ ')}</h2><p class="ctx">${leadLine(p)}</p><p class="ctx">${p.ex.length} exercises · ${nSets} sets · ~${Math.round(nSets*3.5+10)} min</p>
     <div class="go"><button class="btn cta" data-a="startday" data-id="${p.id}">Start session</button><button class="linkbtn" data-a="resched" data-d="${TODAY}">Can't make it?</button></div></div>`}
  if(st.k==='reps')return `<div class="now">${lab('Right now · rep set due',1)}<h2>Rep set</h2><p class="ctx"><b>${repSetTxt()}</b>. Easy reps, about half your max.</p>
    <div class="go"><button class="btn cta" data-a="repall">Did it</button><button class="btn" data-a="sheet" data-k="repset">Other numbers</button></div></div>`;
  if(st.k==='refuel')return `<div class="now">${lab('After training',1)}<h2>${st.pleft} g protein to go</h2><p class="ctx">${fmt(Math.max(0,st.left))} kcal left today. Eat within a couple of hours.</p>
    <div class="go">${sp.wh||!hasSupp('wh')?'':`<button class="btn cta" data-a="supp" data-k="wh">Whey · 24 g</button>`}${againBtns(2,true)}<button class="btn sm ghost" data-a="plus">Log food</button></div></div>`;
  if(st.k==='mag')return `<div class="now">${lab('Right now · before bed',1)}<h2>Magnesium</h2><p class="ctx">Last thing today.</p><div class="go"><button class="btn cta" data-a="supp" data-k="mg">Taken</button></div></div>`;
  if(st.k==='eat')return `<div class="now">${lab('Tonight',1)}<h2>${st.left>0?fmt(st.left)+' kcal left':st.pleft+' g protein to go'}</h2><p class="ctx">${st.left>0?`<b>${st.pleft} g protein</b> still to go.`:'Calories are in. Lean protein closes the gap.'}</p>
    <div class="go">${againBtns(2,st.pleft>=25)}<button class="btn sm ghost" data-a="plus">Log food</button></div></div>`;
  // clear
  const tm=addDays(TODAY,1),tp=dayForDate(tm),thu=!LITE&&parse(TODAY).getDay()===4,f=!LITE&&S.sk&&S.sk.focus&&SKI[S.sk.focus];
  return `<div class="now">${lab(st.lg?'Trained today':st.plan?'Today':'Rest day')}<h2>${st.lg?'Done for today':st.plan?esc(st.plan.name):'Rest day'}</h2>
   <p class="ctx">${st.lg?'':thu?'Optional: one circuit at about 7/10 effort, upper body only. ':'Daily reps only. '}Tomorrow: <b>${tp?esc(tp.name):'rest'}</b>.${!st.lg&&f?` Ten minutes on <b>${esc(f.n)}</b> fits well today.`:''}</p>
   ${!st.lg&&thu?`<div class="go"><button class="btn" data-a="sheet" data-k="circs">Circuits</button></div>`:''}</div>`;
}
function tickRow(){
  const sp=S.supps[TODAY]||{},w=S.weights.find(x=>x.d===TODAY&&!x.sample),sl=S.sleep[TODAY],steps=S.steps[TODAY]||0,nm=nowMinD(),nx=gtgNext();
  const rounds=repRounds(),goal=S.gtg.sets||6,due=nx!=null&&nx<=nm;
  const T=(on,icn,label,attrs,cls='')=>`<button class="tick${on?' on':''}${cls}" ${attrs}>${ic(on?'check':icn)}${label}</button>`;
  return `<div class="ticks">
   ${T(!!w,'scale',w?w.kg+' kg'+(w.fasted===false?' · not fasted':''):'Weight','data-a="sheet" data-k="weight"')}
   ${hasSupp('fe')?T(!!sp.fe,'pill','Iron','data-a="supp" data-k="fe"'):''}
   ${hasSupp('cr')?T(!!sp.cr,'flask','Creatine','data-a="supp" data-k="cr"'):''}
   ${hasSupp('wh')?T(!!sp.wh,'cup','Whey','data-a="supp" data-k="wh"'):''}
   ${S.gtg.on.length?T(rounds>=goal,'repeat',`Reps ${rounds}/${goal}`,'data-a="sheet" data-k="repset"',due&&rounds<goal?' due':''):''}
   ${hasSupp('mg')?T(!!sp.mg,'moon','Magnesium','data-a="supp" data-k="mg"'):''}
   ${T(sl!=null,'bed',sl!=null?sl+' h sleep':'Sleep','data-a="sheet" data-k="sleep"')}
   ${T(steps>0,'pulse',steps?(steps/1000).toFixed(1)+'k steps':'Steps','data-a="stepsheet"')}
  </div>`}
function timelineCard(st){
  const nm=nowMinD(),sp=S.supps[TODAY]||{},n=nTimes(),plan=dayForDate(TODAY),lg=S.log.some(l=>l.d===TODAY),nx=gtgNext(),it=[];
  if(sp.feAt!=null&&sp.feAt+60>nm)it.push({m:sp.feAt+60,title:'Coffee and whey are fine',sub:'an hour after iron'});
  if(S.gtg.on.length&&nx!=null&&st.k!=='reps')it.push({m:Math.max(nx,nm),title:'Rep set',sub:repSetTxt(),a:'data-a="sheet" data-k="repset"'});
  if(plan&&!lg&&st.k!=='train'&&st.k!=='active'){const ns=plan.ex.reduce((a,e)=>a+e.s,0);it.push({m:Math.max(gymAt(),nm),title:esc(plan.name),sub:`${plan.ex.length} exercises · ~${Math.round(ns*3.5+10)} min`,a:`data-a="tab" data-t="train" data-tt="plan"`,chev:1})}
  if(ramadanOn()){const rt=ramadanTimes();if(rt.iftar!=='–')it.push({m:toMin(rt.iftar),title:'Iftar',sub:'dates, water, soup, then 50 g protein.'+(hasSupp('cr')?' Take your creatine with it.':'')})}
  if(hasSupp('mg')&&!sp.mg&&st.k!=='mag')it.push({m:Math.max(toMin(n.mg),nm),title:'Magnesium',sub:'before bed'});
  it.sort((a,b)=>a.m-b.m);
  const tp=dayForDate(addDays(TODAY,1));
  const rows=it.filter(x=>x.m>=nm-1).map((x,i)=>`<${x.a?'button':'div'} class="it${i===0?' next':''}" ${x.a||''}><span class="t">${hm(x.m)}</span><span class="n"></span><span class="grow"><b>${x.title}</b>${x.sub?`<br><span class="small muted">${x.sub}</span>`:''}</span>${x.chev?ic('chevR','muted'):'<span></span>'}</${x.a?'button':'div'}>`).join('');
  if(!rows)return '';
  return `<div class="card"><div class="row between"><p class="label">Rest of today</p><span class="tiny muted">Tomorrow: ${tp?esc(tp.name):'rest'}</span></div><div class="tl" style="margin-top:4px">${rows}</div></div>`}
function fuelCard(t,sum){
  const low=S.profile.lowEffort,left=t.k-sum.k,pl=Math.max(0,Math.round(t.pr-sum.pr)),sp=S.supps[TODAY]||{};
  const M=(n,v,m,c)=>`<div><div class="small">${n} <b>${Math.round(v)}</b><span class="muted">/${m}</span></div><div class="bar" style="margin-top:5px"><i style="width:${pct(v,m)}%;background:${c}"></i></div></div>`;
  if(low)return `<button class="card stack" data-a="tab" data-t="eat" style="gap:10px"><div class="row between"><p class="label">Protein</p><span class="small"><b class="hi">${Math.round(sum.pr)}</b> <span class="muted">/ ${t.pr} g</span></span></div><div class="bar"><i style="width:${pct(sum.pr,t.pr)}%;background:var(--violet)"></i></div><p class="small muted">${pl} g to go.</p></button>`;
  return `<button class="card stack" data-a="tab" data-t="eat" style="gap:10px">
    <div class="row between"><p class="label">Fuel</p><span class="small"><b class="hi">${fmt(sum.k)}</b> <span class="muted">/ ${fmt(t.k)} kcal</span></span></div>
    <div class="bar"><i style="width:${pct(sum.k,t.k)}%"></i></div>
    <div class="macros">${M('Protein',sum.pr,t.pr,'var(--violet)')}${M('Carbs',sum.c,t.c,'var(--grain)')}${M('Fat',sum.f,t.f,'var(--muted)')}</div>
    <p class="small muted">${left>=0?`${fmt(left)} kcal left · <b style="color:var(--ink)">${pl} g protein</b> to go.${pl>=20&&!sp.wh&&hasSupp('wh')?' A whey shake covers 24 g.':''}`:`${fmt(-left)} kcal over. The weekly average is what counts.`}</p></button>`}
function todayNotes(){
  const o=[],sl=S.sleep[TODAY],m=missedYesterday();
  if(m){const bd=betterDays(m.d,m.p)[0];if(bd)o.push(`<div class="note">${ic('cal')}<div class="grow stack" style="gap:8px"><p><b class="hi">Missed ${esc(m.p.name)} yesterday?</b> Best day to fit it in: <b>${fmtDate(bd.d)}</b>. ${bd.why}</p><div class="row wrap"><button class="btn sm primary" data-a="reschmove" data-from="${m.d}" data-to="${bd.d}" data-id="${m.p.id}" data-past="1">Move it there</button><button class="btn sm" data-a="startday" data-id="${m.p.id}" data-d="${m.d}">I did it · log it</button><button class="btn sm ghost" data-a="reschskip" data-from="${m.d}">Skip it</button></div></div></div>`)}
  if(sl!=null&&sl<6.5)o.push(`<div class="note">${ic('bed')}<p><b class="hi">Short sleep (${sl} h).</b> Keep your loads, skip the last set of each exercise, no record attempts.</p></div>`);
  if(ramadanOn()){const rt=ramadanTimes();o.push(`<details class="note" data-o="ram" style="display:block"><summary class="row between"><span><b class="hi">Ramadan · iftar ${rt.iftar} · suhoor ends ${rt.suhoor}</b><br><span class="tiny muted">${esc(rt.place)} · change in Settings</span></span><span class="chip">Plan</span></summary><ol class="why small" style="margin-top:8px"><li><b>Iftar:</b> dates, water, soup, then a real meal with 50 g protein.${hasSupp('cr')?' Creatine with it.':''}</li><li><b>Train</b> 75–90 min after iftar. Drop the last set if you feel flat.</li><li><b>Before bed:</b> whey or yogurt, 40 g protein.</li><li><b>Suhoor:</b> eggs, bread, yogurt, dates, 40 g protein, 0.75 L water.</li></ol></details>`)}
  const dm=+TODAY.slice(8),pm=addDays(TODAY,-dm).slice(0,7);
  if(dm<=7&&recapMonths().includes(pm))o.push(`<button class="note" data-a="recap" data-m="${pm}" style="width:100%;text-align:left;color:inherit;font:inherit;font-size:13px">${ic('cal')}<span class="grow"><b class="hi">${MON[+pm.slice(5)-1]} recap is ready</b><br><span class="muted">sessions, records, kg moved</span></span>${ic('chevR','muted')}</button>`);
  if(!trendNow())o.push(`<div class="note">${ic('scale')}<p>Until you log a morning weigh-in, targets assume ${S.profile.startKg||74} kg.</p></div>`);
  return o.join('')}
function focusRow(){const f=!LITE&&S.sk&&S.sk.focus&&SKI[S.sk.focus];if(!f)return '';const b=skBest(f);
  return `<button class="card row" data-a="sknode" data-id="${f.id}"><span class="grow"><span class="label">Skill focus · ${esc(brOf(f).n)}</span><br><b class="hi">${esc(f.n)}</b><div class="bar" style="margin-top:7px"><i style="width:${pct(b.v,f.v)}%"></i></div></span><span class="num hi" style="font-size:26px">${b.v||0}<span class="muted" style="font-size:15px">/${f.v}</span></span></button>`}
function vToday(){
  const t=targets(),sum=sumFood(TODAY),st=nowState();
  return `
  <div class="top"><div><p class="label">${fmtDate(TODAY)} · ${nowHM()}</p><h1>Today</h1></div>
   <button class="icon-btn" data-a="settings" aria-label="Settings">${ic('sliders')}</button></div>
  <div class="stack">
   ${nowCard(st)}
   ${tickRow()}
   ${todayNotes()}
   ${timelineCard(st)}
   ${fuelCard(t,sum)}
   ${focusRow()}
  </div>`}

/* ===================== Food ===================== */
function feRow({e,i},day){return `<button class="fe${e.pend?' pend':''}" data-a="fedit" data-i="${i}" data-d="${day}" aria-label="Edit ${esc(e.n)}"><span class="grow small"><b class="hi">${esc(e.n.replace(/ · MFP$/,''))}</b>${e.x!==1?` <span class="muted">×${e.x}</span>`:''} ${e.pend?'<span class="tag sig">Estimating</span>':e.nonum?'<span class="tag sig">Needs numbers</span>':SRC_TAG[e.src]?`<span class="tag${e.src==='ai'?' v':''}">${SRC_TAG[e.src]}</span>`:''}<br><span class="muted tiny">${Math.round(e.pr*e.x)} P · ${Math.round(e.c*e.x)} C · ${Math.round(e.f*e.x)} F</span></span><span class="k">${e.pend&&!e.k?'…':fmt(e.k*e.x)}</span></button>`}
function week7(t){
  const est=estMaint().est,v=[0,1,2,3,4,5,6].map(i=>{const d=addDays(TODAY,i-6);return {d,s:sumFood(d),n:dayFood(d).length,full:d!==TODAY&&fullDay(d,est)}});
  // The average uses fully logged days only (today is still going, half-logged days would pull it down).
  const lg0=v.filter(x=>x.full),lg=lg0.length>=2?lg0:v.filter(x=>x.n&&x.d!==TODAY),half=v.filter(x=>x.n&&!x.full&&x.d!==TODAY).length,mx=Math.max(t.k*1.15,...v.map(x=>x.s.k));
  if(lg.length<2)return '';
  const ak=lg.reduce((a,x)=>a+x.s.k,0)/lg.length,ap=lg.reduce((a,x)=>a+x.s.pr,0)/lg.length;
  return `<div class="card stack" style="gap:10px"><div class="row between"><p class="label">Last 7 days</p><span class="small"><b class="hi">${fmt(ak)}</b> <span class="muted">kcal ·</span> <b class="hi">${Math.round(ap)}</b> <span class="muted">g protein a day</span></span></div>
   <div class="wk7">${v.map(x=>`<div><i class="${x.n&&x.s.pr>=t.pr*.9?'hit':''}${x.d===TODAY?' now':''}${x.n&&!x.full&&x.d!==TODAY?' half':''}" style="height:calc((100% - 16px)*${(x.n?Math.max(.05,x.s.k/mx):0).toFixed(3)})"></i><span>${DOW[parse(x.d).getDay()][0]}</span></div>`).join('')}</div>
   <p class="tiny muted">Bar height is calories against your ${fmt(t.k)} target. Lit bars hit protein. Average of ${lg.length} ${lg0.length>=2?'fully logged ':''}days${lg0.length>=2&&half?`, ${half} half-logged left out (faded)`:''}.</p></div>`}
function vEat(){
  const day=UI.foodDay||TODAY,isT=day===TODAY,t=targets(),sum=sumFood(day),low=S.profile.lowEffort,left=t.k-sum.k;
  const gs=[[],[],[],[],[]];(S.food[day]||[]).forEach((e,i)=>gs[slotOf(e)].push({e,i}));
  // Every meal of the day has its own place and its own "+". Your usual meals are offered where they belong:
  // in the meal you are in right now, and only today.
  const cur=isT?slotNow():-1,todaySigs=new Set(groupsOn(day).map(g=>mealSig(g.items))),rec=isT?againList().filter(m=>!todaySigs.has(m.sig)):[];
  const sug=k=>{const ms=rec.filter(m=>m.slot===k).slice(0,3);return ms.length?`<div class="usual"><span class="tiny muted">Usual ${SLOT_N[k].toLowerCase()}</span>${ms.map(m=>`<button data-a="mealadd" data-sig="${esc(m.sig)}" aria-label="Add ${esc(mealName(m.items))}">${m.pin?'★ ':''}<span>${esc(mealLabel(m))}</span><small>${fmt(mealK(m.items))}</small></button>`).join('')}</div>`:''};
  const sec=k=>{const it=gs[k],kc=it.reduce((a,{e})=>a+e.k*e.x,0),pr=it.reduce((a,{e})=>a+e.pr*e.x,0),nm=SLOT_N[k];
    return `<section class="mealsec${k===cur?' cur':''}"><div class="meal"><h3>${nm}</h3>${it.length?`<span class="small muted">${fmt(kc)} kcal · ${Math.round(pr)} P</span>`:k===cur?'<span class="tiny sigt">now</span>':''}<span class="grow"></span>${k<4&&it.length?`<button class="icon-btn s" data-a="slotadd" data-k="${k}" aria-label="Add to ${nm.toLowerCase()}">${ic('plus')}</button>`:''}</div>
     ${it.map(o=>feRow(o,day)).join('')}${!it.length&&k<4?`<button class="addrow" data-a="slotadd" data-k="${k}">${ic('plus')}Add ${nm.toLowerCase()}</button>`:''}${k===cur?sug(k):''}</section>`};
  const meals=[0,1,2,3].map(sec).join('')+(gs[4].length?sec(4):'');
  const yest=isT&&!(S.food[day]||[]).some(e=>!e.auto)?groupsOn(addDays(TODAY,-1)):[];
  const B=(n,v,m,c)=>`<div><div class="row between small"><span>${n}</span><span><b class="hi">${Math.round(v)}</b><span class="muted">/${m}</span></span></div><div class="bar" style="margin-top:4px"><i style="width:${pct(v,m)}%;background:${c}"></i></div></div>`;
  const mfpN=(S.food[TODAY]||[]).filter(e=>e.src==='mfp'||e.src==='hc').length,mfpOn=S.profile.mfpUser||S.profile.mfp;
  return `
  <div class="top"><div><p class="label">${isT?fmtDate(day):'Looking back'}</p><h1>${isT?'Food':fmtDate(day)}</h1></div>
   <div class="row" style="gap:6px"><button class="icon-btn" data-a="foodday" data-d="-1" aria-label="Previous day">${ic('chevL')}</button>${isT?'':`<button class="icon-btn" data-a="foodday" data-d="1" aria-label="Next day">${ic('chevR')}</button>`}</div></div>
  <div class="stack">
   <div class="sticky"><div class="row" style="gap:16px">
    ${low?ring2(sum.pr,t.pr,Math.round(sum.pr),'of '+t.pr+' g','var(--violet)')+`<div class="grow stack" style="gap:8px"><p class="small">Low-effort mode: protein only.</p>${isT?`<div class="row wrap">${[25,40].map(g=>`<button class="btn sm" data-a="quickpr" data-g="${g}">+${g} g</button>`).join('')}</div>`:''}</div>`
    :ring2(sum.k,t.k,fmt(Math.abs(left)),left>=0?'kcal left':'kcal over','var(--accent)')+`<div class="grow stack" style="gap:8px">${B('Protein',sum.pr,t.pr,'var(--violet)')}${B('Carbs',sum.c,t.c,'var(--grain)')}${B('Fat',sum.f,t.f,'var(--muted)')}</div>`}
   </div></div>
   <div class="qlog">
    <button data-a="scan">${ic('barcode')}<span>Scan</span></button>
    <button data-a="sheet" data-k="describe">${ic('camera')}<span>Photo or say it</span></button>
    <button data-a="sheet" data-k="search">${ic('search')}<span>Search</span></button>
    <button data-a="sheet" data-k="again">${ic('repeat')}<span>Repeats</span></button></div>
   ${isT?'':`<div class="note">${ic('cal')}<div class="grow stack" style="gap:8px"><p>You're looking at <b class="hi">${fmtDate(day)}</b>. Anything you add now goes into this day.</p><div class="row wrap"><button class="btn sm primary" data-a="foodday" data-d="0">Back to today</button>${(S.food[day]||[]).length?`<button class="btn sm" data-a="copyday" data-d="${day}">Copy this day to today</button>`:''}</div></div></div>`}
   <div class="card meals">${meals}
    ${yest.length?`<button class="btn sm block" data-a="copyyest" style="margin-top:12px">${ic('repeat')} Same as yesterday · ${yest.length} meal${yest.length>1?'s':''}</button>`:''}
    ${(S.food[day]||[]).length&&!low?`<p class="tiny muted" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line)">Fiber ${Math.round(sum.fi)} / ${Math.round(t.k/1000*14)} g · tap an entry to change the amount or move it</p>`:''}</div>
   ${isT&&mfpOn?`<button class="note" data-a="sheet" data-k="sources" style="width:100%;text-align:left;color:inherit;font:inherit;font-size:13px">${ic('repeat')}<span class="grow"><b class="hi">MyFitnessPal</b> · ${mfpN} entr${mfpN===1?'y':'ies'} today${UI.mfpdAt||UI.mfpAt?' · synced '+(UI.mfpdAt||UI.mfpAt):''}</span>${ic('chevR','muted')}</button>`
     :isT?`<button class="linkbtn" data-a="sheet" data-k="sources" style="align-self:flex-start">Connect MyFitnessPal</button>`:''}
   ${week7(t)}
  </div>`}

/* ===================== Train ===================== */
function circList(){return CIRCUITS.map(c=>{const b=best(c.id);return `<button class="ex" data-a="circsheet" data-id="${c.id}"><span class="thumb">${gMedia(c.st[0][2],c.st[0][0])}</span>
  <span class="grow"><b>${c.n}</b> ${c.tag?`<span class="tag v">${c.tag}</span>`:''}<br><span class="small muted">${c.type==='amrap'?c.min+' min AMRAP':c.type==='ladder'?'Pyramid ladder':c.rounds+' rounds · '+c.work+'/'+c.rest+' s'}${b!=null?` · best ${c.type==='amrap'?b+' rounds':mmss(b)+(c.type==='ladder'&&bestPeak(c.id)?' (peak '+bestPeak(c.id)+')':'')}`:''}</span></span>${ic('chevR','muted')}</button>`}).join('')}
function vPlan(){
  const dates=weekDates(),sel=UI.planDay&&dates.includes(UI.planDay)?UI.planDay:TODAY,p=dayForDate(sel),li=S.log.findIndex(l=>l.d===sel),done=li>=0,isT=sel===TODAY,thu=!LITE&&parse(sel).getDay()===4;
  const strip=`<div class="week">${dates.map(d=>{const q=dayForDate(d),dn=S.log.some(l=>l.d===d),w=parse(d).getDay();
    return `<button class="day${d===sel?' sel':''}${dn?' done':''}${!q&&!dn?' rest':''}${d===TODAY?' today':''}${q&&!dn&&d<TODAY?' miss':''}" data-a="planday" data-d="${d}" aria-label="${fmtDate(d)}${q?', '+q.name:', rest'}${dn?', done':''}"><span class="d">${DOW[w]}</span><span class="s">${q?shortName(q):dn?'DONE':w===4&&!LITE?'CIRC':'REST'}</span></button>`}).join('')}</div>`;
  let card;const past=sel<TODAY,dn3=DOW[parse(sel).getDay()],moved=past&&!done&&!p&&S.resched[sel]===null?S.program.find(x=>x.dow===parse(sel).getDay()):null;
  if(p){const nSets=p.ex.reduce((a,e)=>a+e.s,0);
    card=`<div class="card stack"><div class="row between" style="align-items:flex-start"><div><p class="label">${isT?'Today':fmtDate(sel)}${done?' · done':past?' · not logged':''}</p><h2 class="${nameCls(p.name)}" style="margin-top:4px">${esc(p.name)}</h2></div><span class="small muted" style="text-align:right">${p.ex.length} exercises<br>~${Math.round(nSets*3.5+10)} min</span></div>
     <div>${p.ex.map(e=>{const d=def(e.x),h=lastFor(d.id);return `<button class="ex" data-a="exinfo" data-id="${d.id}"><span class="thumb">${exMedia(d.id)}</span><span class="grow"><b>${esc(d.n)}</b><br><span class="small muted">${e.s} × ${d.r[0]}–${d.r[1]}${h?' · last '+lastTxt(h):''}</span></span>${ic('chevR','muted')}</button>`}).join('')}</div>
     <div class="row">${done?`<button class="btn grow" data-a="wlog" data-li="${li}">See what you logged</button>`:past?`<button class="btn primary grow" data-a="startday" data-id="${p.id}" data-d="${sel}">Log it for ${dn3}</button>`:`<button class="btn ${isT?'cta':'primary'} grow" data-a="startday" data-id="${p.id}">${isT?'Start session':'Start it today'}</button>`}<button class="btn" data-a="editday" data-id="${p.id}">Edit</button></div>
     ${past&&!done?`<button class="linkbtn" data-a="startday" data-id="${p.id}" style="align-self:flex-start">Or do it today instead</button>`:''}
     ${isT&&!done?`<button class="linkbtn" data-a="resched" data-d="${TODAY}" style="align-self:flex-start">Can't make it today?</button>`:''}</div>`}
  else card=`<div class="card stack"><div><p class="label">${isT?'Today':fmtDate(sel)}</p><h2 style="margin-top:4px">${done?'Extra session':moved?'Moved':thu?'Circuit day':'Rest'}</h2></div>
     <p class="small muted">${done?'You trained on a rest day.':moved?`You moved ${esc(moved.name)} away from this day. Trained it here after all?`:thu?'Optional. One circuit at about 7/10 effort, upper body: your legs are recovering from Wednesday. Daily reps as usual.':'Full rest. Daily reps only.'}</p>
     ${moved?`<button class="btn primary" data-a="startday" data-id="${moved.id}" data-d="${sel}">Log ${esc(moved.name)} for ${dn3}</button>`:''}
     ${done?`<button class="btn" data-a="wlog" data-li="${li}">See what you logged</button>`:''}${thu&&!done?`<div>${circList()}</div>`:''}</div>`;
  return `${strip}${card}
   ${LITE||thu&&!p&&!done?'':`<button class="card row" data-a="sheet" data-k="circs"><span class="grow"><span class="label">Circuits</span><br><b class="hi">Cindy, Monster pyramid</b> <span class="small muted">+ ${CIRCUITS.length-2} more</span></span>${ic('chevR','muted')}</button>`}
   <p class="small muted">Swap, add or remove exercises any time, for one session or for good. <button class="info" data-a="sheet" data-k="proginfo" aria-label="How progression works">i</button></p>`}
// Plank (any timed move): 3 s to get into position, then a stopwatch with a beep at the set size. Stop logs the seconds.
const mss=s=>s>=60?Math.floor(s/60)+':'+String(s%60).padStart(2,'0'):String(s);
function holdTimer(sz){return `<div class="htimer ready" id="ht"><span class="label" id="htl">Get into position</span><div class="holdclock" id="htc">3</div>
   <div class="bar"><i id="htb" style="transform:scaleX(0)"></i></div><span class="small muted" id="hts">Target ${mss(sz)} s · it beeps when you get there</span>
   <div class="row" style="width:100%"><button class="btn grow" data-a="htcancel">Cancel</button><button class="btn cta grow" data-a="htstop">Stop and log</button></div></div>`}
function vReps(){
  const g=gtgDay(TODAY),trained=trainedToday(),nx=gtgNext(),rr=S.gtg.remind,lastSet=S.gtg.last&&S.gtg.last.d===TODAY?S.gtg.last.m:null,nm=nowMinD(),due=nx!=null&&nx<=nm;
  return `
   <div class="now"><div class="row between"><p class="label"><span class="dot${due?' live':' calm'}"></span>Next rep set</p><button class="info" data-a="sheet" data-k="repinfo" aria-label="How daily reps work">i</button></div>
    <h2 class="xl">${nx==null?(nm>toMin(rr.end)?'Tomorrow':'Done'):due?'Now':hm(nx)}</h2><p class="ctx">${lastSet!=null?'Last set at '+hm(lastSet)+'. ':''}<b>${repSetTxt()||'Pick moves below'}</b></p>
    <div class="go"><button class="btn cta" data-a="repall">Log a set of each</button><button class="btn" data-a="remindsheet">Reminders</button></div></div>
   <div class="card">${myMoves().filter(m=>S.gtg.on.includes(m.id)).map(m=>{const mx=maxOf(m.id),sz=setSize(m.id),done=g[m.id]||[],skip=trained.has(m.m)&&m.m!=='abs';return `
    <div class="ex" style="align-items:flex-start"><span class="thumb" style="width:64px">${gMedia(m.g)}</span><div class="grow stack" style="gap:6px">
     <div class="row between"><b class="hi">${m.n}</b><span class="num hi" style="font-size:22px">${done.reduce((a,b)=>a+b,0)}<span class="muted small" style="font-family:var(--body);font-weight:600"> ${m.u==='s'?'s':'today'}</span></span></div>
     <p class="small muted">${mx?`Max ${mx} · sets of ${sz}`:'Test your max to get a set size'}</p>
     ${done.length?`<div class="row wrap" style="gap:6px">${done.map((v,i)=>`<button class="chip" data-a="gtgrm" data-m="${m.id}" data-i="${i}" aria-label="Remove the set of ${v}">${v}${m.u==='s'?' s':''} <span class="muted">×</span></button>`).join('')}<span class="tiny muted" style="align-self:center">tap a set to remove it</span></div>`:''}
     ${skip?'<p class="small" style="color:var(--warn);font-weight:700">Trained in the gym today. Skip or go very light.</p>':''}
     ${m.u==='s'&&UI.ht&&UI.ht.m===m.id?holdTimer(sz)
      :`<div class="row">${m.u==='s'?`<button class="btn sm cta grow" data-a="htstart" data-m="${m.id}">${ic('play')} Start timer</button>`:''}<input class="num" id="gtg-${m.id}" type="number" inputmode="numeric" value="${sz}" aria-label="${m.n} ${m.u==='s'?'seconds':'reps'}" style="width:${m.u==='s'?64:76}px;padding:7px"><button class="btn sm ${m.u==='s'?'':'primary grow'}" data-a="gtglog" data-m="${m.id}">${m.u==='s'?'Log':'Log set'}</button>${done.length?`<button class="btn sm ghost" data-a="gtgundo" data-m="${m.id}" aria-label="Undo last set">Undo</button>`:''}</div>`}
    </div></div>`}).join('')||'<p class="small muted">No moves in rotation. Pick some below.</p>'}</div>
   <div class="stack" style="gap:8px"><div class="row between"><p class="label">Records</p><span class="tiny muted">tap to test</span></div>${prTiles()}</div>
   <div class="card stack"><p class="label">Moves in rotation</p><div class="row wrap" style="gap:6px">${myMoves().map(m=>`<button class="chip${S.gtg.on.includes(m.id)?' on':''}" data-a="gtgtoggle" data-m="${m.id}">${m.n}</button>`).join('')}</div></div>`}
function vStats(){
  const o=muscleSets(UI.mapMode),recs=records(),sorted=Object.entries(o).sort((a,b)=>b[1]-a[1]),low=sorted.filter(([,v])=>v<8).map(([k])=>MUSC[k]),st=stalls();
  const prs=Object.entries(recs).sort((a,b)=>b[1].v-a[1].v).slice(0,8).map(([id,r])=>`<button class="li" data-a="exinfo" data-id="${id}"><span class="grow">${esc(def(id).n)}</span><span class="num hi" style="font-size:18px">${r.kg}×${r.r}</span><span class="small muted" style="width:76px;text-align:right">≈${Math.round(r.v)} kg 1RM</span></button>`).join('');
  return `
   <button class="card row" data-a="exlib"><span class="thumb" style="width:44px;height:44px;display:grid;place-items:center;background:var(--raise);color:var(--muted)">${ic('book')}</span><span class="grow"><b class="hi">Exercise library</b><br><span class="small muted">${Object.keys({...LIB,...S.customEx}).length} exercises · form cues and your chart for each</span></span>${ic('chevR','muted')}</button>
   <div class="card stack"><div class="row between"><h3>Records</h3><span class="tiny muted">best set · estimated 1-rep max</span></div><div class="list">${prs||'<p class="small muted">Log a session to see records.</p>'}</div></div>
   ${st.length?`<details class="card" data-o="plat"><summary class="row between"><span><h3>Plateau check</h3><span class="small muted">${st.map(x=>esc(def(x.id).n)).slice(0,2).join(', ')}${st.length>2?' +'+(st.length-2):''}</span></span><span class="chip warn">${st.length} stalled</span></summary>
    ${st.map(x=>`<details class="card flat" data-o="plat-${x.id}" style="margin-top:8px"><summary class="row between"><span><b class="hi">${esc(def(x.id).n)}</b><br><span class="small muted">No new best in ${x.since} sessions, since ${fmtDate(x.pr.d)}</span></span><span class="chip">Ideas</span></summary><ul class="cues" style="margin-top:8px">${stallIdeas(x).map(t=>`<li>${t}</li>`).join('')}</ul></details>`).join('')}<p class="small muted" style="margin-top:8px">Suggestions only. Nothing changes unless you change it.</p></details>`:''}
   <details class="card" data-o="mus"><summary class="row between"><span><h3>Sets per muscle</h3><span class="small muted">${low.length?(UI.mapMode==='week'?'Light this week: ':'Light in your plan: ')+low.slice(0,3).join(', '):'Every muscle gets 8+ hard sets'}</span></span><span class="chip">Show</span></summary>
    <div class="stack" style="margin-top:10px"><div class="seg"><button class="${UI.mapMode==='plan'?'on':''}" data-a="mapmode" data-v="plan">Plan</button><button class="${UI.mapMode==='week'?'on':''}" data-a="mapmode" data-v="week">This week</button></div>
    ${musclemap(o)}
    <div class="stack" style="gap:7px">${sorted.map(([k,v])=>`<div class="msrow"><span>${MUSC[k]}</span><div class="bar"><i style="width:${Math.min(100,v/20*100)}%;background:${v>=12?'var(--accent)':v>=8?'var(--violet)':'var(--muted)'}"></i></div><span class="num hi" style="text-align:right;font-size:16px">${v.toFixed(1)}</span></div>`).join('')}</div>
    <p class="small muted">Hard sets per week. A row gives the biceps half a set.</p></div></details>
   <details class="card" data-o="hist"><summary class="row between"><span><h3>History</h3><span class="small muted">${S.log.length} sessions · tap one to fix it</span></span><span class="chip">Show</span></summary>
    <div class="list" style="margin-top:8px">${S.log.map((l,i)=>({l,i})).slice(UI.histAll?0:-14).reverse().map(({l,i})=>{const p=S.program.find(x=>x.id===l.day),n=Object.values(l.ex).reduce((a,s)=>a+s.length,0);return `<button class="li" data-a="wlog" data-li="${i}"><span class="grow"><b class="hi">${p?esc(p.name):'Workout'}</b><br><span class="small muted">${fmtDate(l.d)}${l.d.slice(0,4)!==TODAY.slice(0,4)?' '+l.d.slice(0,4):''} · ${Object.keys(l.ex).length} exercises · ${n} sets${l.dur?' · '+l.dur+' min':''}${l.gr?` · <span class="gl up">▲ ${l.gr[0]}</span> ▼ ${l.gr[1]}${l.gr[2]?' = '+l.gr[2]:''}`:''}</span></span>${ic('chevR','muted')}</button>`}).join('')||'<p class="small muted">No sessions yet.</p>'}</div>
    <div class="row wrap" style="margin-top:8px"><button class="btn sm" data-a="wpast">+ Log a past workout</button>${S.log.length>14?`<button class="btn sm ghost" data-a="histall">${UI.histAll?'Show the last 14':'Show all '+S.log.length}</button>`:''}</div></details>`}
function vTrain(){
  if(S.active)return vWorkout();
  if(LITE&&UI.trainTab==='skills')UI.trainTab='plan';
  const tt=UI.trainTab||'plan',dates=weekDates();
  return `
  <div class="top"><div><p class="label">${tt==='plan'?'Week of '+dShort(dates[0]):tt==='reps'?'Through the day':tt==='skills'?'Bodyweight skills':'Your numbers'}</p><h1>Train</h1></div></div>
  <div class="stack">
   <div class="seg">${[['plan','Plan'],['reps','Reps'],...(LITE?[]:[['skills','Skills']]),['stats','Stats']].map(([k,l])=>`<button class="${tt===k?'on':''}" data-a="traintab" data-v="${k}">${l}</button>`).join('')}</div>
   ${tt==='plan'?vPlan():tt==='reps'?vReps():tt==='skills'?vSkills():vStats()}
  </div>`}

/* ===================== Workout: one set at a time ===================== */
function fxCur(){const a=S.active;if(!a.list.length)return UI.fx=-1;let x=UI.fx;
  if(x==null||x<0||x>=a.list.length){x=a.list.findIndex(e=>e.sets.some(s=>!s.done));if(x<0)x=a.list.length-1}return UI.fx=x}
// Reps shown before you touch anything: what you did on this set last time (bottom of the range if the load went up).
function repTarget(x,i){const d=def(x.id),h=lastFor(x.id);if(!h)return d.r[0];const top=Math.max(...h.sets.map(z=>z[0]));
  if((+x.sets[i].kg||0)>top)return d.r[0];return h.sets[Math.min(i,h.sets.length-1)][1]||d.r[0]}
const restTxt=s=>Math.floor(s/60)+':'+pad(s%60);
/* Ghost race: every set you finish is scored against the same set of the last session with that exercise (its "ghost").
   One number per set, so 60 × 9 against 62.5 × 7 is a fair fight: the estimated 1-rep max. Bodyweight moves count your own
   weight plus the added (or minus the assisted) kg. */
const ghostOn=()=>S.profile.ghost!==false;
const ghostOf=x=>{const h=lastFor(x.id);return h&&h.sets.length?h:null};
function setScore(d,kg,reps){kg=+kg||0;reps=+reps||0;if(!(reps>0))return 0;const load=d.u==='bw'?Math.max(1,W()+kg):kg;return load>0?e1(load,reps):reps/1000}
// More weight than last time for at least the bottom of the rep range is progress by the plan's own rule, so it counts as ahead.
function ghostCmp(d,z,g){if((+z.kg||0)>(+g[0]||0)&&(+z.reps||0)>=d.r[0])return 1;const a=setScore(d,z.kg,z.reps),b=setScore(d,g[0],g[1]);return a>b*1.0005?1:a<b*0.9995?-1:0}
// Reps that tie the ghost's set at the load you have on now.
function ghostNeed(d,kg,g){for(let r=1;r<=50;r++)if(ghostCmp(d,{kg,reps:r},g)>=0)return r;return null}
function ghostTally(list){const t={w:0,l:0,t:0,bonus:0};list.forEach(x=>{const h=ghostOf(x);if(!h)return;const d=def(x.id);
  x.sets.forEach((z,i)=>{if(!z.done||!(+z.reps>0))return;const g=h.sets[i];if(!g)return t.bonus++;const c=ghostCmp(d,z,g);c>0?t.w++:c<0?t.l++:t.t++})});return t}
const ghostSet=(d,g)=>(d.u==='bw'&&!g[0]?'BW':g[0]+(d.u==='bw'&&g[0]>0?' kg':''))+' × '+g[1];
// The line under the lanes: where the numbers on screen right now would put you.
function ghostLine(x,si,kg,reps){const h=ghostOf(x);if(!h)return '';const d=def(x.id),g=h.sets[si];
  if(!g)return `<b class="gl up">Extra set.</b> Last time stopped at ${h.sets.length}.`;
  const c=ghostCmp(d,{kg,reps},g),need=ghostNeed(d,kg,g),gt=ghostSet(d,g);
  if(c>0)return `<b class="gl up">▲ Ahead</b> of last time's ${gt}${kg>(+g[0]||0)?': more weight':''}.`;
  if(c===0)return `<b class="gl eq">= Level</b> with last time's ${gt}. One more rep wins the set.`;
  return `<b class="gl dn">▼ Behind</b> last time's ${gt}${need&&need>reps&&need<=40?`: ${need} reps to match it at this load`:''}.`}
function ghostSum(t){const p=[];if(t.w)p.push(`<b class="gl up">${t.w} ahead</b>`);if(t.t)p.push(t.t+' level');if(t.l)p.push(t.l+' behind');if(t.bonus)p.push(t.bonus+' extra');return p.length?'This exercise: '+p.join(', ')+'.':''}
function ghostBlock(x,si,exDone,sg){const d=def(x.id),h=ghostOn()?ghostOf(x):null,note=NOTES[x.id]?' <span class="muted">'+NOTES[x.id]+'</span>':'';
  if(!h)return `<p class="hint">${sg.txt}${note}</p>`;
  const cur=x.sets[si],line=exDone?ghostSum(ghostTally([x])):ghostLine(x,si,+cur.kg||0,cur.reps!==''?+cur.reps:repTarget(x,si));
  return `<div class="grace">${ghostLanes(x,h,si,exDone)}
    <p class="small" id="ghl">${line}</p>${sg.adv||note?`<p class="tiny muted">${sg.adv||''}${note}</p>`:''}</div>`}
// Two lanes, last time on top and today below, set by set. si = the set you are on ("now"), -1 for none.
function ghostLanes(x,h,si,exDone){const d=def(x.id);
  const n=Math.max(x.sets.length,h.sets.length),cell=(kg,r)=>`${d.u==='bw'&&!kg?'BW':kg}<i>×</i>${r}`,cols=Array.from({length:n},(_,i)=>i);
  const top=cols.map(i=>{const g=h.sets[i];return `<span class="c">${g?cell(g[0],g[1]):'–'}</span>`}).join('');
  const bot=cols.map(i=>{const z=x.sets[i],g=h.sets[i];if(!z)return '<span class="c off">–</span>';
    if(z.done){const c=g?ghostCmp(d,z,g):2;return `<span class="c ${c>0?'up':c<0?'dn':'eq'}">${cell(+z.kg||0,z.reps)}<b>${c===2?'+':c>0?'▲':c<0?'▼':'='}</b></span>`}
    return i===si&&!exDone?'<span class="c now">now</span>':'<span class="c off">·</span>'}).join('');
  return `<div class="glanes${n>=5?' tight':''}" style="--n:${n}" role="img" aria-label="Last time against today, set by set"><span class="who">${dShort(h.d)}</span>${top}<span class="who">Today</span>${bot}</div>`}
// List mode: the same lanes on each exercise card, filled in as you tick sets.
function ghostCard(x,sg){const h=ghostOn()?ghostOf(x):null;if(!h)return `<p class="hint">${sg.txt}</p>`;
  const si=x.sets.findIndex(s=>!s.done),t=ghostTally([x]),line=t.w+t.l+t.t+t.bonus?ghostSum(t):`Beat last time's sets, one by one. ${sg.txt}`;
  return `<div class="grace">${ghostLanes(x,h,si,si<0)}<p class="small">${line}</p></div>`}
function ghostHead(a){if(!ghostOn())return '';const t=ghostTally(a.list);if(!(t.w+t.l+t.t))return '';
  return `<p class="tiny muted" style="margin-top:-8px">Against last time · <b class="gl up">▲ ${t.w}</b> · ▼ ${t.l} · = ${t.t}${t.bonus?' · +'+t.bonus+' extra':''}</p>`}
// While you change the kg or reps, the line follows without redrawing the card.
function ghostLive(){const el=document.getElementById('ghl');if(!el||!S.active||!ghostOn())return;const x=S.active.list[fxCur()];if(!x)return;const si=x.sets.findIndex(s=>!s.done);if(si<0)return;
  const k=document.getElementById('fkg'),r=document.getElementById('freps');if(!k||!r)return;el.innerHTML=ghostLine(x,si,parseFloat(k.value)||0,parseInt(r.value)||0)}
document.addEventListener('input',e=>{if(e.target.id==='fkg'||e.target.id==='freps')ghostLive()});
function vWorkout(){return (S.profile.wmode||'focus')==='list'?vWorkoutList():vFocus()}
function workHead(mode){const a=S.active,p=S.program.find(x=>x.id===a.day)||{name:'Workout'},all=a.list.flatMap(x=>x.sets),done=all.filter(s=>s.done).length;
  return `<div class="top"><div class="grow"><p class="label">${a.past?'For '+fmtDate(a.d)+' · ':Math.round((Date.now()-a.start)/60000)+' min · '}${done}/${all.length} sets</p><h1 class="${nameCls(p.name)}">${esc(p.name)}</h1></div>
   <div class="row" style="gap:6px"><button class="icon-btn" data-a="wmode" data-v="${mode==='focus'?'list':'focus'}" aria-label="${mode==='focus'?'Show the full list':'One set at a time'}">${ic(mode==='focus'?'list':'focus')}</button><button class="btn sm ghost" data-a="cancelw">Discard</button></div></div>${activeNote()}`}
// A session left open from an earlier day: say so, and let you pick which day it belongs to.
function activeNote(){const a=S.active;if(!a||a.d>=TODAY)return '';
  if(a.past)return `<p class="hint" style="margin-bottom:12px">Logging a missed session. It saves under <b>${fmtDate(a.d)}</b>.</p>`;
  return `<div class="note" style="margin-bottom:12px">${ic('cal')}<div class="grow stack" style="gap:8px"><p><b class="hi">Started ${fmtDate(a.d)}, never finished.</b> Save what you ticked under that day, or carry on as today's session.</p>
   <div class="row wrap"><button class="btn sm primary" data-a="finishw">Save for ${DOW[parse(a.d).getDay()]}</button><button class="btn sm" data-a="activetoday">Continue as today</button></div></div></div>`}
function vFocus(){
  const a=S.active,all=a.list.flatMap(x=>x.sets),done=all.filter(s=>s.done).length,allDone=all.length>0&&done===all.length,sl=S.sleep[TODAY];
  const xi=fxCur(),x=a.list[xi],n=a.list.length,resting=UI.timerEnd>Date.now();
  const prog=`<div class="segp">${a.list.map((e,i)=>`<span class="${i===xi?'cur':''}"><i style="width:${pct(e.sets.filter(s=>s.done).length,e.sets.length)}%"></i></span>`).join('')}</div>`;
  if(!x)return `${workHead('focus')}<div class="stack"><p class="small muted">No exercises in this session.</p><button class="btn block" data-a="swapopen" data-mode="activeadd">+ Add exercise</button></div>`;
  const d=def(x.id),sg=suggest(d);let si=x.sets.findIndex(s=>!s.done);const exDone=si<0;if(exDone)si=x.sets.length-1;const s=x.sets[si];
  const left=resting?Math.max(0,Math.round((UI.timerEnd-Date.now())/1000)):0,nxt=a.list[xi+1];
  return `${workHead('focus')}
  <div class="stack">
   ${prog}${ghostHead(a)}
   ${done===0?warmupCard(a):''}
   ${sl!=null&&sl<6.5?`<p class="hint">Slept ${sl} h. Skip the last set of each exercise, no records today.</p>`:''}
   <div class="fcard">
    <div class="fig"><button class="figbox" data-a="bigph" data-id="${x.id}" aria-label="Show ${esc(d.n)} bigger" style="width:108px">${exMedia(x.id)}</button>
     <div class="grow stack" style="gap:7px"><p class="label">${xi+1} of ${n} · rest ${Math.round(d.rest/60*2)/2} min</p><h2 class="${nameCls(d.n)}">${esc(d.n)}</h2>
      <div class="fdots">${x.sets.map((z,i)=>`<button data-a="fsetpick" data-i="${i}" ${z.done?'':'disabled'} aria-label="${z.done?'Fix set '+(i+1)+': '+(+z.kg?z.kg+' kg × ':'')+z.reps:'Set '+(i+1)+', not done yet'}"><i class="${z.done?'ok':i===si&&!exDone?'cur':''}"></i></button>`).join('')}</div>
      <p class="small muted">${exDone?'All '+x.sets.length+' sets done':'Set '+(si+1)+' of '+x.sets.length+' · '+d.r[0]+'–'+d.r[1]+' reps'}${x.sets.some(z=>z.done)&&!exDone?' · tap a green dash to fix it':''}</p></div>
     <button class="btn sm ghost" data-a="exopt" data-x="${xi}" aria-label="Edit sets and options for ${esc(d.n)}" style="align-self:flex-start;padding:6px 10px">Edit</button></div>
    ${ghostBlock(x,si,exDone,sg)}
    ${exDone?`${ghostOn()&&ghostOf(x)?'':`<p class="small muted">${x.sets.map(z=>(+z.kg?z.kg+' × ':'')+z.reps).join(' · ')}</p>`}<div class="row"><button class="btn grow" data-a="addset" data-x="${xi}">+ One more set</button><button class="btn grow" data-a="funtick">Edit last set</button></div>`:`
    <div class="fsteps">
     <div class="fstep"><span class="label">${d.u==='bw'?'added kg':'kg'}</span><input id="fkg" type="number" inputmode="decimal" step="0.5" value="${s.kg}" placeholder="${d.u==='bw'?'BW':'0'}" data-c="setkg" data-x="${xi}" data-i="${si}" aria-label="${esc(d.n)} set ${si+1} kg">
      <div class="pm"><button data-a="fstep" data-k="kg" data-d="-1" aria-label="Less weight">−</button><button data-a="fstep" data-k="kg" data-d="1" aria-label="More weight">+</button></div></div>
     <div class="fstep"><span class="label">reps</span><input id="freps" type="number" inputmode="numeric" value="${s.reps!==''?s.reps:repTarget(x,si)}" data-c="setreps" data-x="${xi}" data-i="${si}" aria-label="${esc(d.n)} set ${si+1} reps">
      <div class="pm"><button data-a="fstep" data-k="reps" data-d="-1" aria-label="Fewer reps">−</button><button data-a="fstep" data-k="reps" data-d="1" aria-label="More reps">+</button></div></div>
    </div>
    <div class="row" style="gap:10px"><button class="linkbtn" data-a="settip" data-k="${xi}-${si}" style="align-self:flex-start">${UI.tip===xi+'-'+si?'Hide':'What is this set for?'}</button><span class="grow"></span><button class="linkbtn" data-a="addset" data-x="${xi}" aria-label="Add one more set to ${esc(d.n)}">+ 1 set</button></div>${UI.tip===xi+'-'+si?`<p class="small muted">${setTip(x,xi,si)}</p>`:''}
    ${resting?`<div class="frest" id="frest"><span class="label">Rest · then set ${si+1}</span><b>${restTxt(left)}</b><div class="row"><button class="btn sm" data-a="tplus">+30 s</button><button class="btn sm" data-a="frestskip">Skip rest</button></div></div>`
     :`<button class="fdone" data-a="fdone">Done · set ${si+1}</button>`}`}
   </div>
   <div class="fnav"><button class="btn" data-a="fgo" data-d="-1" ${xi===0?'disabled':''}>‹ Prev</button><button class="btn" data-a="swapopen" data-mode="active" data-x="${xi}">Swap</button><button class="btn" data-a="fgo" data-d="1" ${xi===n-1?'disabled':''}>Next ›</button></div>
   ${nxt?`<p class="small muted">Up next: <b style="color:var(--ink)">${esc(def(nxt.id).n)}</b> · ${nxt.sets.length} sets</p>`:''}
   <div class="row"><button class="btn grow ghost" data-a="swapopen" data-mode="activeadd" data-x="${xi}" aria-label="Add an exercise before ${esc(d.n)}">+ Add exercise</button><button class="btn grow ${allDone?'cta':''}" data-a="finishw">Finish workout</button></div>
  </div>`}
function vWorkoutList(){
  const a=S.active,p=S.program.find(x=>x.id===a.day)||{name:'Workout'},all=a.list.flatMap(x=>x.sets),done=all.filter(s=>s.done).length,sl=S.sleep[TODAY];
  return `${workHead('list')}
  <div class="stack">
   <div class="bar"><i style="width:${pct(done,all.length)}%"></i></div>
   ${ghostHead(a)}
   ${sl!=null&&sl<6.5?`<p class="hint">Slept ${sl} h. Skip the last set of each exercise, no records today.</p>`:''}
   ${warmupCard(a)}
   ${a.list.map((x,xi)=>{const d=def(x.id),sg=suggest(d),note=NOTES[x.id];return `
   <div class="card stack">
    <div class="row" style="align-items:flex-start"><button class="figbox" data-a="bigph" data-id="${x.id}" aria-label="Show ${esc(d.n)} bigger">${exMedia(x.id)}</button>
     <div class="grow stack" style="gap:4px"><h3>${esc(d.n)}</h3><p class="small muted">${x.sets.length} × ${d.r[0]}–${d.r[1]} · rest ${Math.round(d.rest/60*2)/2} min</p>
      <details data-o="cues-${xi}"><summary class="small" style="color:var(--violet);font-weight:700;padding:4px 0">Form cues</summary><ul class="cues">${(CUES[d.g]||[]).map(c=>`<li>${c}</li>`).join('')}</ul></details></div>
     <button class="icon-btn s" data-a="exopt" data-x="${xi}" aria-label="Options for ${esc(d.n)}">${ic('dots')}</button></div>
    ${ghostCard(x,sg)}${note?`<p class="small muted">${note}</p>`:''}
    <div><div class="setrow small muted"><span></span><span style="text-align:center">${unitLabel(d.u)}</span><span style="text-align:center">reps</span><span></span></div>
     ${x.sets.map((s,i)=>`<div class="setrow"><button class="idx${UI.tip===xi+'-'+i?' open':''}" data-a="settip" data-k="${xi}-${i}" aria-label="What set ${i+1} is for">${i+1}</button>
      <input class="num" type="number" inputmode="decimal" step="0.5" value="${s.kg}" data-c="setkg" data-x="${xi}" data-i="${i}" aria-label="${esc(d.n)} set ${i+1} kg">
      <input class="num" type="number" inputmode="numeric" placeholder="${d.r[0]}–${d.r[1]}" value="${s.reps}" data-c="setreps" data-x="${xi}" data-i="${i}" aria-label="${esc(d.n)} set ${i+1} reps">
      <button class="check${s.done?' done':''}" data-a="toggleset" data-x="${xi}" data-i="${i}" aria-label="Mark set ${i+1} done">${I.check}</button></div>${UI.tip===xi+'-'+i?`<p class="settip">${setTip(x,xi,i)}</p>`:''}`).join('')}</div>
    <div class="row"><button class="btn sm ghost" data-a="addset" data-x="${xi}">+ Set</button>${x.sets.length>1?`<button class="btn sm ghost" data-a="rmset" data-x="${xi}">− Set</button>`:''}<span class="grow"></span>${lastFor(x.id)&&x.sets.some(s=>!s.done)?`<button class="btn sm ghost" data-a="samelast" data-x="${xi}" aria-label="Fill with last session's weights and reps">↺ Last time</button>`:''}<button class="btn sm" data-a="swapopen" data-mode="active" data-x="${xi}">Swap</button></div>
   </div>`}).join('')}
   <button class="btn block" data-a="swapopen" data-mode="activeadd">+ Add exercise</button>
   <p class="small muted">Swaps are today only unless you turn on <b>Also save to plan</b> in the swap sheet.</p>
   <button class="btn cta block" data-a="finishw">Finish workout</button>
   <div style="height:64px" aria-hidden="true"></div>
  </div>`}
