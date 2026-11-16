/* Tally (formerly Recomp Coach): native and AI layer.
   Loaded after the main script, so S, UI, A, render, save, TODAY etc. are shared globals.
   - In the APK (Capacitor): notifications, Health Connect steps, share-sheet backups.
   - Everywhere: Gemini food and photo estimates (with your own key), Open Food Facts barcodes. */
(function(){
const Cap=window.Capacitor,P=(Cap&&Cap.Plugins)||{};
const NATIVE=!!(Cap&&Cap.isNativePlatform&&Cap.isNativePlatform());
const LN=P.LocalNotifications,HP=P.HealthPlugin,FS=P.Filesystem,SH=P.Share,BS=P.BarcodeScanner;
const hasAI=()=>{const g=gem();return !!(g.key||g.or)};

/* ---------- Settings kept outside S, so backups never carry the API key ---------- */
const GK='recomp.gemini';
const gem=()=>{try{return JSON.parse(localStorage.getItem(GK))||{}}catch(_){return {}}};
const setGem=o=>{try{localStorage.setItem(GK,JSON.stringify({...gem(),...o}))}catch(_){}};
const nset=()=>{const d={on:true,weigh:'07:30',gtg:true,timer:true,pills:true,mg:'23:00'};const o={...d,...(S.profile.notif||{})};if(!o.fe)o.fe=o.weigh;return o};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// A redraw nobody tapped for waits while you are typing (softRender, ui-more.js).
const soft=()=>typeof softRender==='function'?softRender():render();

/* ---------- Small helpers ---------- */
const sz=o=>Math.round(o);
function fileToJpeg(file,max=1280){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{const k=Math.min(1,max/Math.max(img.width,img.height));
  const c=document.createElement('canvas');c.width=sz(img.width*k);c.height=sz(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  URL.revokeObjectURL(img.src);res(c.toDataURL('image/jpeg',0.82).split(',')[1])};img.onerror=rej;img.src=URL.createObjectURL(file)})}

/* ---------- AI: Gemini first, OpenRouter second, and a queue when both are down ----------
   "Model is experiencing high demand" (HTTP 503) is Google's side, not your key. Each model has its own capacity and
   its own free quota, so: ask Google which models your key can use today, walk down that list, then try a second
   free service. If everything is busy, the meal is saved and estimated a little later (see the queue below). */
const AIC='recomp.ai';   // cache: model lists, cooldowns, the model that answered last
const aic=()=>{try{return JSON.parse(localStorage.getItem(AIC))||{}}catch(_){return {}}};
const setAic=o=>{try{localStorage.setItem(AIC,JSON.stringify({...aic(),...o}))}catch(_){}};
const GEM_SEED=['gemini-flash-latest','gemini-flash-lite-latest','gemini-2.5-flash','gemini-2.5-flash-lite','gemini-2.0-flash','gemini-2.0-flash-lite'];
const withT=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(Object.assign(new Error('timeout'),{status:408})),ms))]);
const aiErr=(msg,status)=>Object.assign(new Error(msg),{status});
const tfetch=(u,o,ms=20000)=>withT(fetch(u,o),ms);
// Newest Flash first, then Flash-Lite. Pro models are left out: the free tier gives them no quota.
function gemRank(names){const sc=n=>{const v=(n.match(/gemini-(\d+(?:\.\d+)?)/)||[])[1],ver=v?parseFloat(v):/latest/.test(n)?90:0;
    return (/flash-lite/.test(n)?1000:0)-ver*10+(/preview|exp/.test(n)?5:0)+n.length*.01};
  return names.filter(n=>/^gemini-.*flash/.test(n)&&!/(tts|image|embedding|live|audio|native|robotics|computer|learnlm|-8b)/.test(n)).sort((a,b)=>sc(a)-sc(b)).slice(0,14)}
async function gemModels(key,force){const c=aic(),tag=key.slice(-6);
  if(!force&&c.gm&&c.gm.length&&c.gmKey===tag&&Date.now()-c.gmAt<864e5)return c.gm;
  try{const r=await withT(fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',{headers:{'x-goog-api-key':key}}),15000),j=await r.json().catch(()=>({}));
    if(!r.ok)throw aiErr((j.error&&j.error.message)||('Gemini error '+r.status),r.status);
    const gm=gemRank((j.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>String(m.name).replace(/^models\//,'')));
    if(gm.length){setAic({gm,gmAt:Date.now(),gmKey:tag});return gm}}
  catch(e){if([400,401,403].includes(+e.status))throw e}
  return c.gm&&c.gm.length?c.gm:GEM_SEED}
// b64: one photo, a list of photos (a meal shot from several angles), or nothing.
const imgsOf=b64=>[].concat(b64||[]).filter(Boolean);
async function gemCall(model,prompt,b64,key){const parts=[{text:prompt}];imgsOf(b64).forEach(d=>parts.push({inline_data:{mime_type:'image/jpeg',data:d}}));
  const r=await withT(fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',
    headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts}],generationConfig:{responseMimeType:'application/json',temperature:0.2}})}),40000);
  const j=await withT(r.json(),30000).catch(()=>({}));if(!r.ok)throw aiErr((j.error&&j.error.message)||('Gemini error '+r.status),r.status);
  const t=j.candidates&&j.candidates[0]&&j.candidates[0].content&&(j.candidates[0].content.parts||[]).map(p=>p.text||'').join('');
  if(!t)throw aiErr('empty answer',204);return t}
// OpenRouter: free models change often, so the list is read live. 'openrouter/free' is their own router across them.
async function orModels(vision){const c=aic(),k=vision?'orv':'ort';if(c[k]&&c[k].length&&Date.now()-c.orAt<864e5)return c[k];
  try{const r=await withT(fetch('https://openrouter.ai/api/v1/models'),15000),j=await r.json(),free=(j.data||[]).filter(m=>/:free$/.test(m.id));
    const orv=free.filter(m=>((m.architecture&&m.architecture.input_modalities)||[]).includes('image')).map(m=>m.id),ort=free.map(m=>m.id);
    setAic({orv,ort,orAt:Date.now()});return vision?orv:ort}catch(_){return c[k]||[]}}
async function orCall(model,prompt,b64,key){
  const r=await withT(fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
    body:JSON.stringify({model,temperature:0.2,messages:[{role:'user',content:imgsOf(b64).length?[{type:'text',text:prompt},...imgsOf(b64).map(d=>({type:'image_url',image_url:{url:'data:image/jpeg;base64,'+d}}))]:prompt}]})}),60000);
  const j=await withT(r.json(),30000).catch(()=>({}));if(!r.ok||j.error)throw aiErr((j.error&&j.error.message)||('OpenRouter error '+r.status),(j.error&&+j.error.code)||r.status);
  const t=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;if(!t)throw aiErr('empty answer',204);
  return typeof t==='string'?t:t.map(p=>p.text||'').join('')}
function parseJSON(t){t=String(t).replace(/```(?:json)?/g,'').trim();try{return JSON.parse(t)}catch(_){}
  const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a<0||b<=a)throw aiErr('answer was not JSON',422);
  try{return JSON.parse(t.slice(a,b+1))}catch(_){throw aiErr('answer was not JSON',422)}}
// A model that just failed sits out for a while and is skipped meanwhile: 1 min after a per-minute limit, 3 min after
// "overloaded", a day if it no longer exists, and until the daily reset when its free quota for the day is used up
// (Google answers 429 "quota exceeded ... limit: 0" for that, which is NOT the same as busy).
const coolOf=m=>{const c=(aic().cool||{})[m];return typeof c==='number'?{u:c}:c||{u:0}};
const cooling=m=>coolOf(m).u>Date.now();
const noQuota=m=>cooling(m)&&!!coolOf(m).q;
function coolFor(m,ms,q){const c=aic().cool||{},now=Date.now();c[m]={u:now+ms,...(q?{q:1}:{})};Object.keys(c).forEach(k=>{if(coolOf(k).u<now&&k!==m)delete c[k]});setAic({cool:c})}
// Gemini's free quota resets at midnight Pacific time.
function untilReset(){try{const now=new Date(),pt=new Date(now.toLocaleString('en-US',{timeZone:'America/Los_Angeles'})),nx=new Date(pt);nx.setHours(24,0,0,0);return Math.max(30*6e4,nx-pt)}catch(_){return 6*36e5}}
const perMinute=m=>/per.?minute|PerMinute|requests per min|rate.?limit.*min/i.test(m);
const isDayQuota=e=>{const s=+e.status||0,m=e.message||'';return (s===429||/quota|exceeded/i.test(m))&&/quota|per.?day|PerDay|limit:\s*0\b|free-models-per-day/i.test(m)&&!perMinute(m)};
function aiOrder(list,pref){const c=aic();return [...new Set([pref,c.ok&&list.includes(c.ok)?c.ok:null,...list].filter(Boolean))]}
const OR_ALL='openrouter:all';
async function ai(prompt,b64){const g=gem();if(!g.key&&!g.or)throw new Error('Add a Gemini or OpenRouter key in Settings first');
  let busy=false,offline=false,last=null,n=0,quota=0;const t0=Date.now(),late=()=>Date.now()-t0>70000;   // give up after ~70 s and queue the meal
  const qSvc=new Set();
  const attempt=async(tag,model,call)=>{if(late()){busy=true;return null}n++;try{const j=parseJSON(await call());setAic({ok:model});UI.aiUsed=tag+' · '+model;return j}
    catch(e){last=e;const s=+e.status||0,m=e.message||'';
      if(e instanceof TypeError||/failed to fetch|network|load failed/i.test(m)){offline=true;throw e}
      if([401,403].includes(s)||(s===400&&/api.?key/i.test(m)))throw e;                       // wrong key: stop asking this service
      if(isDayQuota(e)){coolFor(tag==='OpenRouter'&&/per.?day/i.test(m)?OR_ALL:model,untilReset(),1);quota++;qSvc.add(tag)}
      else if(s===429||/rate.?limit/i.test(m)){coolFor(model,6e4);busy=true}
      else if([500,502,503,529,408].includes(s)||/overload|high demand|unavailable|timeout/i.test(m)){coolFor(model,3*6e4);busy=true}
      else if(s===404)coolFor(model,864e5);
      return null}};
  // Models sitting out are skipped, not retried. One out of quota counts as "no quota", one cooling off after busy as "busy".
  const pick=list=>list.filter(m=>{if(!cooling(m))return true;if(coolOf(m).q){quota++;qSvc.add(m.includes('/')?'OpenRouter':'Gemini')}else busy=true;return false});
  if(g.key&&!offline){try{for(const m of pick(aiOrder(await gemModels(g.key),g.model)).slice(0,8)){const j=await attempt('Gemini',m,()=>gemCall(m,prompt,b64,g.key));if(j)return j}}catch(e){last=e}}
  if(g.or&&!offline&&!late()){if(noQuota(OR_ALL)){quota++;qSvc.add('OpenRouter')}else try{const ms=await orModels(!!b64);
      for(const m of pick(aiOrder(['openrouter/free',...ms.filter(x=>/gemma/.test(x)),...ms],null)).slice(0,4)){const j=await attempt('OpenRouter',m,()=>orCall(m,prompt,b64,g.or));if(j)return j;if(noQuota(OR_ALL))break}}catch(e){last=e}}
  // Out of daily quota everywhere that was tried: waiting a few minutes won't help, so say so instead of queueing for hours.
  const outQ=!offline&&!busy&&quota>0;
  const er=new Error(offline?'No connection.':outQ?(g.key&&!g.or?'Your Gemini key has no free quota left today. Add a free OpenRouter key in Settings, or set the numbers yourself.'
      :qSvc.size>1||!g.key?'The free AI quota is used up for today on '+(g.key&&g.or?'both services':'OpenRouter')+'. Set the numbers yourself, or try again tomorrow.'
      :'Gemini has no free quota left today and OpenRouter did not answer. Set the numbers yourself, or try again later.')
    :busy?`Every AI model is busy right now (tried ${n}).`:(last&&last.message)||'The AI did not answer');
  er.offline=offline;er.quota=outQ;er.retry=offline||busy;throw er}
const gemini=ai;

const who=()=>{const a=ageOn(TODAY),f=S.profile.sex==='f';return a<30?(f?'a young woman':'a young man'):(f?'a woman':'a man')};
const where=()=>S.profile.loc==='XX'?(S.profile.region||'their country'):S.profile.loc==='MY'?'Malaysia (mamak, nasi lemak, chicken rice, roti canai, food courts)':'Tunisia (home cooking: couscous, tajine, ojja, lablabi, brik, makloub, baguette, harissa, olive oil)';
// Things the user told the AI once and asked it to keep in mind ("my plates are small", "mum uses little oil").
// Meal photos waiting to be estimated (UI.snaps = [{url,b64}]): several angles or parts of one meal.
const SNAP_MAX=4;
const snapsB64=()=>{const s=UI.snaps||[];return s.length?s.map(x=>x.b64):null};
function clearSnaps(){(UI.snaps||[]).forEach(x=>URL.revokeObjectURL(x.url));UI.snaps=[]}
function addSnap(url,b64){UI.aiTok=(UI.aiTok||0)+1;UI.snaps=[...(UI.snaps||[]),{url,b64}];while(UI.snaps.length>SNAP_MAX)URL.revokeObjectURL(UI.snaps.shift().url)}
window.addSnap=addSnap;
const aiMem=()=>(Array.isArray(S.aiMem)?S.aiMem:[]).filter(Boolean);
/* Learning from your corrections: when you change a kcal number the AI gave (before adding the meal, or later in its edit
   sheet), the pair "AI said / it was" is kept (S.aiFix, newest 40). The closest ones go into every later prompt, with the
   direction the AI has been off on average, so the same mistake is not made twice. */
const aiFixes=()=>(Array.isArray(S.aiFix)?S.aiFix:[]).filter(f=>f&&f.n&&f.a>0&&f.u>0);
function aiLearn(n,g,a,u){a=Math.round(+a);u=Math.round(+u);n=String(n||'').trim().slice(0,80);const r=u/a;
  // Small nudges (under 8% or 15 kcal) and wild ones (a different food, really) teach nothing.
  if(!n||!(a>0)||!(u>0)||Math.abs(r-1)<0.08||Math.abs(u-a)<15||r<0.3||r>3)return false;
  const key=n.toLowerCase();S.aiFix=[...aiFixes().filter(f=>f.n.toLowerCase()!==key),{n,g:g>0?Math.round(g):null,a,u,d:TODAY}].slice(-40);return true}
// Set back to the AI's own number: that correction was wrong, forget it.
function aiForget(n){const key=String(n||'').trim().slice(0,80).toLowerCase(),a=aiFixes(),b=a.filter(f=>f.n.toLowerCase()!==key);if(b.length===a.length)return false;S.aiFix=b;return true}
// The overall lean needs 5 recent corrections (last 90 days), so a few old ones do not tilt every meal.
function aiBias(){const old=addDays(TODAY,-90),f=aiFixes().filter(x=>!x.d||x.d>=old).slice(-20);if(f.length<5)return null;const ls=f.map(x=>Math.log(x.a/x.u)),m=ls.reduce((a,b)=>a+b,0)/ls.length,same=ls.filter(x=>(x>0)===(m>0)).length/ls.length;
  const pct=Math.round((Math.exp(m)-1)*100);return Math.abs(pct)>=6&&same>=0.7?{pct,n:f.length}:null}
function aiLearned(desc){const all=aiFixes();if(!all.length)return '';const wsOf=s=>String(s||'').toLowerCase().split(/[^a-zà-ÿ]+/).filter(w=>w.length>2),ws=new Set(wsOf(desc));
  const pick=all.map((f,i)=>({f,i,s:wsOf(f.n).filter(w=>ws.has(w)).length})).sort((x,y)=>y.s-x.s||y.i-x.i).slice(0,8),b=aiBias();
  return 'Corrections this user made to your earlier estimates (your number, then the real one). When the same or a similar food comes up, start from their number and scale it to the amount:\n'
    +pick.map(({f})=>`- ${f.n}${f.g?' ('+f.g+' g)':''}: you said ${f.a} kcal, it was ${f.u} kcal`).join('\n')
    +(b?`\nAcross their last ${b.n} corrections your estimates were about ${Math.abs(b.pct)}% too ${b.pct>0?'high':'low'}. Lean that way when you are unsure, without applying it blindly.`:'')}
// fix = {prev:[items], msgs:[what the user said was wrong, oldest first]} when re-estimating after feedback.
async function foodAI(desc,b64,fix){const mem=aiMem(),fx=fix&&fix.prev&&fix.msgs&&fix.msgs.length;
  const j=await gemini(`You estimate nutrition for a meal logged by ${who()} who lives in ${where()}. The numbers go into a calorie log for a body recomposition, so accuracy matters more than speed.
Meal description: "${desc||'(see photo)'}".
${imgsOf(b64).length>1?imgsOf(b64).length+' photos of the same meal are attached (different angles, parts of the meal, or a label). Combine them into one estimate and do not count the same food twice. Judge portion sizes from plates, cutlery and hands.':b64?'A photo of the meal is attached. Judge portion sizes from plates, cutlery and hands.':''}
${mem.length?'Facts this user told you earlier about how they eat (trust them):\n'+mem.map(m=>'- '+m).join('\n'):''}
${aiLearned(desc)}
Method: 1) name each component, 2) estimate its cooked weight in grams, 3) apply typical kcal and macros per 100 g for that food as cooked, 4) add cooking oil, butter, sauces and dressings as their own items when they are likely. Be realistic about home-cooking oil; don't lowball. Typical portions unless the text says otherwise.
${fx?`Your previous estimate was:\n${fix.prev.map(i=>`- ${i.n}: ${i.g?Math.round(i.g)+' g, ':''}${Math.round(i.k)} kcal, ${Math.round(i.pr)} g protein`).join('\n')}
The user says it is wrong:\n${fix.msgs.map(m=>'- "'+m+'"').join('\n')}
Redo the whole estimate using this. Facts the user states (amounts, ingredients, how it was cooked, brand) override your guesses. Keep items they did not question unless their correction affects them.`:''}
Return JSON only: {"items":[{"n":"short name with amount, e.g. 'Couscous with lamb, 1 plate'","g":grams,"k":kcal,"pr":protein_g,"c":carbs_g,"f":fat_g,"fi":fiber_g,"why":"max 12 words: the amount you assumed and the main assumption"}],"note":"one short sentence on what was hardest to judge${fx?', or what you changed':''}"}`,b64);
  // Models sometimes answer "350 kcal" as text, or leave kcal empty but give the macros. Read both; drop anything absurd.
  const num=v=>{if(typeof v==='number')return v;const m=String(v==null?'':v).replace(/(\d),(?=\d{3}(?:\D|$))/g,'$1').replace(',','.').match(/\d+(?:\.\d+)?/);return m?+m[0]:NaN};
  const items=(Array.isArray(j.items)?j.items:[]).filter(i=>i&&i.n).map(i=>{const pr=Math.max(0,num(i.pr)||0),c=Math.max(0,num(i.c)||0),f=Math.max(0,num(i.f)||0);
      let k=num(i.k);if(!(k>0)&&(pr||c||f))k=pr*4+c*4+f*9;else if(!(k>=0))k=NaN;return {n:String(i.n).slice(0,80),g:num(i.g)>0?num(i.g):null,k,pr,c,f,fi:Math.max(0,num(i.fi)||0),why:String(i.why||'').slice(0,120)}})
    .filter(i=>isFinite(i.k)&&i.k>=0&&i.k<=5000).map(i=>({...i,k0:i.k}));   // k0 = the AI's own number, to learn from if you change it
  if(!items.length)throw new Error('Could not read any food from that');
  return {items,note:j.note||''}}
async function bodyAI(b64){const w=(typeof trendNow==='function'&&trendNow())||S.profile.startKg||null;
  const j=await gemini(`Estimate the body fat percentage of the ${S.profile.sex==='f'?'woman':'man'} in this photo for a personal fitness log. ${S.profile.sex==='f'?'She':'He'} is ${S.profile.height} cm, ${w?'about '+w.toFixed(1)+' kg, ':''}${ageOn(TODAY)} years old, lifts weights.
Judge from visible ab definition, obliques, love handles, chest and arm vascularity. Lighting and pose can mislead, say so if relevant.
Return JSON only: {"est":number,"lo":number,"hi":number,"note":"one or two short sentences on what you based it on"}`,b64);
  const est=+j.est;if(!(est>3&&est<50))throw new Error('No usable estimate from that photo. Try front-on, good light, shirt off.');
  return {est,lo:+j.lo||est-3,hi:+j.hi||est+3,note:String(j.note||'').slice(0,240)}}

/* ---------- Open Food Facts ---------- */
// A value the label doesn't give stays unknown (null), shown as "?", instead of pretending it is 0.
const nn=v=>v==null||v===''||isNaN(+v)?null:+v;
async function offLookup(code){const r=await tfetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_quantity,quantity`);
  if(!r.ok&&r.status!==404)throw new Error('Open Food Facts is not answering right now ('+r.status+'). Try again, or type the numbers in.');
  const j=await withT(r.json(),15000).catch(()=>null);if(!j||j.status!==1||!j.product)throw new Error('Not in Open Food Facts. Use Type it or a custom item.');
  const p=j.product,n=p.nutriments||{},kcal=n['energy-kcal_100g']??(n['energy_100g']?n['energy_100g']/4.184:null);
  if(kcal==null)throw new Error('That product has no nutrition data. Use a custom item.');
  return {n:[p.brands&&p.brands.split(',')[0],p.product_name].filter(Boolean).join(' ')||code,k:+kcal,pr:nn(n.proteins_100g),c:nn(n.carbohydrates_100g),f:nn(n.fat_100g),fi:nn(n.fiber_100g),serv:+p.serving_quantity||100}}
async function scanImage(file){if(!('BarcodeDetector' in window))throw new Error('This phone can\'t read barcodes from photos. Type the numbers instead.');
  const bd=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});const bmp=await createImageBitmap(file);const r=await bd.detect(bmp);
  if(!r.length)throw new Error('No barcode found. Get closer, keep it flat and sharp.');return r[0].rawValue}

/* ---------- Food database search ---------- */
const fdcKey=()=>gem().fdc||'DEMO_KEY';
async function fdcSearch(q){const r=await tfetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&dataType=${encodeURIComponent('Foundation,SR Legacy')}&pageSize=8&api_key=${encodeURIComponent(fdcKey())}`);
  if(r.status===429)throw new Error('USDA limit reached for now. Add your own free key in Settings.');if(!r.ok)throw new Error('USDA search failed ('+r.status+')');const j=await r.json();
  return (j.foods||[]).map(f=>{const n={};(f.foodNutrients||[]).forEach(x=>{n[x.nutrientNumber]=x.value});
    const k=n['208']??n['957']??n['958']??(n['268']!=null?n['268']/4.184:null);if(k==null)return null;
    const name=f.description.charAt(0)+f.description.slice(1).toLowerCase();
    return {n:name,k:+k,pr:nn(n['203']),c:nn(n['205']),f:nn(n['204']),fi:nn(n['291']),src:'usda'}}).filter(Boolean)}
async function offSearch(q){const r=await tfetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name,brands,nutriments,serving_quantity`);
  if(!r.ok)throw new Error('Open Food Facts search failed');const j=await r.json();
  return (j.products||[]).map(p=>{const n=p.nutriments||{},k=n['energy-kcal_100g']??(n['energy_100g']?n['energy_100g']/4.184:null);if(k==null||!p.product_name)return null;
    return {n:[p.brands&&p.brands.split(',')[0],p.product_name].filter(Boolean).join(' '),k:+k,pr:nn(n.proteins_100g),c:nn(n.carbohydrates_100g),f:nn(n.fat_100g),fi:nn(n.fiber_100g),serv:+p.serving_quantity||null,src:'off'}}).filter(Boolean)}
async function dbSearch(q){const [a,b]=await Promise.allSettled([fdcSearch(q),offSearch(q)]);
  const res=[...(a.value||[]),...(b.value||[])];if(!res.length&&a.status==='rejected'&&b.status==='rejected')throw a.reason;return res};

/* ---------- UI pieces (called from index.html through hook()) ---------- */
const X={};X.native=NATIVE;X.dbSearch=dbSearch;
// The in-app camera where the phone has one (ui-more.js), the phone's own camera app on iPhone.
const live=()=>typeof liveCam==='function'&&liveCam();
X.snapCard=()=>{const g=gem(),st=UI.ai||{},ps=UI.snaps||[],n=ps.length,ph=n>0,more=n<SNAP_MAX,pw=n>1?'photos':'photo';
  return `${ph?`<div class="row wrap" style="gap:8px">${ps.map((p,i)=>`<div style="position:relative"><img class="snapph" src="${p.url}" alt="Meal photo ${i+1}"><button class="icon-btn s" data-a="snaprm" data-i="${i}" aria-label="Remove photo ${i+1}" style="position:absolute;top:-6px;right:-6px">${I.x}</button></div>`).join('')}</div>`:''}
   <div class="row wrap" style="gap:10px;align-items:center">
    ${!more?`<span class="small muted grow">${SNAP_MAX} photos is the most per meal</span>`
     :live()?`<button class="btn sm" data-a="camopen" data-mode="meal">${ph?'+ Another photo':'+ Photo'}</button><label class="btn sm ghost" style="text-align:center">Gallery<input type="file" accept="image/*" multiple data-c="snapph" hidden></label><span class="small muted grow">${ph?'other angles, the side dish, a label':'optional, best with a few words'}</span>`
     :`<label class="btn sm" style="text-align:center">${ph?'+ Another photo':'+ Photo'}<input type="file" accept="image/*" multiple data-c="snapph" hidden></label><span class="small muted grow">${ph?'other angles, the side dish, a label':'optional, works best with a few words'}</span>`}</div>
   ${hasAI()?`<button class="btn cta block" data-a="aifood" ${st.busy?'disabled':''}>${st.busy?'Estimating…':'Estimate'+(ph&&UI.desc.trim()?' '+pw+' + text':ph?' '+(n>1?n+' photos':'photo'):'')}</button>`
    :`<p class="small muted">Add a free AI key in Settings to estimate from photos and any description. Until then, the quick match below works offline.</p><button class="btn sm" data-a="settings" style="align-self:flex-start">Open Settings</button>`}
   ${st.err?`<p class="small" style="color:var(--bad)">${esc(st.err)}</p>${st.quota?`<div class="row wrap">${parseMeal(UI.desc||'').length?'<button class="btn sm primary" data-a="adddesc">Use the quick match</button>':''}<button class="btn sm" data-a="customfood">Type the numbers</button><button class="btn sm ghost" data-a="settings">Settings</button></div>`:''}`:''}
   ${st.items?`<div class="card raise stack" style="padding:10px 12px"><div class="list">${st.items.map((i,k)=>`<div class="li"><div class="grow"><b class="small">${esc(i.n)}</b><p class="small muted">${i.g?Math.round(i.g)+' g · ':''}${Math.round(i.pr)} P · ${Math.round(i.c)} C · ${Math.round(i.f)} F</p>${i.why?`<p class="tiny muted">${esc(i.why)}</p>`:''}</div>
     <input class="num" type="number" inputmode="numeric" value="${Math.round(i.k)}" data-c="aik" data-i="${k}" aria-label="kcal for ${esc(i.n)}" style="width:76px;font-size:16px;padding:4px"><button class="icon-btn s" data-a="aidel" data-i="${k}" aria-label="Remove ${esc(i.n)}">${I.x}</button></div>`).join('')}</div>
     ${st.note?`<p class="small muted">${esc(st.note)}</p>`:''}
     ${st.fixes&&st.fixes.length?`<p class="tiny muted">Re-estimated after: ${st.fixes.map(m=>'“'+esc(m)+'”').join(', ')}</p>`:''}
     <details data-o="aifix"${st.fixErr?' open':''}><summary class="small" style="color:var(--violet);font-weight:700;padding:4px 0">Looks wrong? Tell the AI why</summary>
      <div class="stack" style="gap:8px;margin-top:6px">
       <textarea id="aiFix" rows="2" placeholder="e.g. it was half a plate · no oil, grilled · 2 eggs not 3 · the bread was a small piece"></textarea>
       <label class="row small" style="gap:8px;cursor:pointer"><input id="aiMemOn" type="checkbox" style="width:18px;height:18px"><span class="grow">Remember this for future meals <span class="muted">(only for facts that are always true)</span></span></label>
       ${st.fixErr?`<p class="small" style="color:var(--bad)">${esc(st.fixErr)}</p>`:''}
       <button class="btn block" data-a="aifix" ${st.fixing?'disabled':''}>${st.fixing?'Re-estimating…':'Re-estimate with this'}</button></div></details>
     <p class="small muted">Or fix any kcal yourself: protein, carbs and fat scale with it, and the AI learns from your number for next time.</p>
     <button class="btn primary block" id="aiAddB" data-a="aiadd" ${st.fixing?'disabled':''}>Add ${st.items.length} item${st.items.length>1?'s':''} · ${fmt(st.items.reduce((a,i)=>a+i.k,0))} kcal</button></div>`:''}`};
X.offCard=()=>{const o=UI.off||{},nScan=S.myFoods.filter(f=>f.code).length;return `<div class="card flat stack" style="padding:12px"><p class="small"><b>Packaged food</b> <span class="small muted">barcode · Open Food Facts + your own scans</span></p>
   ${NATIVE&&BS?`<button class="btn primary block" data-a="livescan" ${o.busy?'disabled':''}>${o.busy?'Looking up…':'Scan a barcode'}</button>`
    :'BarcodeDetector' in window?`<label class="btn sm" style="text-align:center">Scan from a photo<input type="file" accept="image/*" capture="environment" data-c="offscan" hidden></label>`:''}
   <div class="row"><input id="offCode" class="grow" inputmode="numeric" placeholder="or type the barcode numbers" value="${esc(o.code||'')}" aria-label="Barcode"><button class="btn sm ink" data-a="offgo" ${o.busy?'disabled':''}>${o.busy?'…':'Look up'}</button></div>
   ${o.err&&!o.manual?`<p class="small" style="color:var(--bad)">${esc(o.err)}</p>`:''}
   ${o.manual?`<div class="card raise stack" style="padding:10px"><p class="small"><b>${o.offline?'No connection.':'Not found.'}</b> Type it once from the label and it's saved to this barcode, so next scan is instant${o.offline?', even offline':''}.</p>
     <input id="mnN" placeholder="Name, e.g. Délice yogurt vanilla" aria-label="Name">
     <p class="label">Per 100 g on the label</p>
     <div class="grid2"><input id="mnK" class="num" type="number" inputmode="decimal" placeholder="kcal" aria-label="kcal per 100 g"><input id="mnP" class="num" type="number" inputmode="decimal" placeholder="protein g" aria-label="Protein per 100 g">
      <input id="mnC" class="num" type="number" inputmode="decimal" placeholder="carbs g" aria-label="Carbs per 100 g"><input id="mnF" class="num" type="number" inputmode="decimal" placeholder="fat g" aria-label="Fat per 100 g"></div>
     <div class="row"><input id="mnG" class="num" type="number" inputmode="decimal" placeholder="g" aria-label="Grams eaten" style="width:90px"><span class="small muted grow">grams eaten</span><button class="btn primary" data-a="offmanual">Save + add</button></div></div>`:''}
   ${o.p?`<div class="card raise stack" style="padding:10px"><b>${esc(o.p.n)}</b>${o.p.mine?'<span class="small muted">From your saved scans</span>':''}<p class="small muted">Per 100 g: ${fmt(o.p.k)} kcal · ${g1(o.p.pr)} P · ${g1(o.p.c)} C · ${g1(o.p.f)} F</p>${o.p.pr==null?'<p class="tiny muted">The label has no protein value, so it counts as 0.</p>':''}
     <div class="row"><input id="offG" class="num" type="number" inputmode="decimal" value="${o.p.serv}" aria-label="Grams eaten" style="width:90px"><span class="small muted grow">grams eaten</span><button class="btn primary" data-a="offadd">Add</button></div></div>`:''}
   ${nScan?`<p class="small muted">${nScan} scanned products saved. They also show under My items.</p>`:''}</div>`};
// A barcode you scanned or typed in before is answered from your own list first, offline.
function mineByCode(code){const m=S.myFoods.find(f=>f.code===code);return m&&m.per100?{...m.per100,n:m.n,serv:m.serv||100,mine:true}:null}
function rememberScan(code,p,g){const per100={k:p.k,pr:p.pr,c:p.c,f:p.f,fi:p.fi||0},x=g/100,i=S.myFoods.findIndex(f=>f.code===code);
  const item={n:p.n,p:g+' g',k:Math.round(p.k*x),pr:Math.round(p.pr*x),c:Math.round(p.c*x),f:Math.round(p.f*x),fi:Math.round((p.fi||0)*x),src:'scan',al:p.n.toLowerCase(),code,per100,serv:g};
  if(i>=0)S.myFoods[i]=item;else S.myFoods.push(item)}
async function offFind(code){const mine=mineByCode(code);if(mine){UI.off={code,p:mine};render();return}
  UI.off={code,busy:true};render();
  try{UI.off={code,p:await offLookup(code)}}catch(e){const off=!navigator.onLine||e instanceof TypeError||/fetch|network|load failed|timeout/i.test(e.message||'');
    UI.off={code,err:off?'No connection.':e.message,manual:off||/Not in Open Food Facts|no nutrition/i.test(e.message),offline:off}}render()}
X.bfAI=()=>{const g=gem(),a=S.bfAI&&Object.entries(S.bfAI).sort().pop(),st=UI.bfai||{};
  return `<div class="card flat stack" style="padding:12px"><p class="small"><b>Photo estimate (AI)</b></p>
   ${a?`<p class="small">${fmtDate(a[0])}: <b>${Math.round(a[1].lo)}–${Math.round(a[1].hi)}%</b>. ${esc(a[1].note||'')}</p>`:''}
   ${st.err?`<p class="small" style="color:var(--bad)">${esc(st.err)}</p>`:''}
   ${hasAI()?(st.busy?`<button class="btn sm" disabled>Looking…</button>`:live()?`<div class="row"><button class="btn sm grow" data-a="camopen" data-mode="bf">Take a photo</button><label class="btn sm ghost" style="text-align:center">Gallery<input type="file" accept="image/*" data-c="bfaiph" hidden></label></div>`
      :`<label class="btn sm" style="text-align:center">Estimate from a photo<input type="file" accept="image/*" capture="environment" data-c="bfaiph" hidden></label>`)+`
    <p class="small muted">Front-on, shirt off, good light, relaxed. The photo goes to the AI service for the estimate and isn't stored by this app. Treat it as one more opinion, like the mirror pick.</p>`
   :`<p class="small muted">Add an AI key in Settings to get an estimate from a photo.</p>`}</div>`};
X.bfRun=async b64=>{UI.bfai={busy:true};render();try{const r=await bodyAI(b64);S.bfAI=S.bfAI||{};S.bfAI[TODAY]=r;UI.bfai={};save();toast('Photo estimate: '+Math.round(r.lo)+'–'+Math.round(r.hi)+'%')}
  catch(er){UI.bfai={err:er.offline?'No connection. Try again when you are online.':er.message}}render()};
X.steps=()=>NATIVE?`<div class="card flat stack" style="padding:12px">${S.profile.hcOn?`<p class="small">Steps come from Health Connect automatically (last read ${UI.hcAt?UI.hcAt:'not yet'}).</p>${UI.hcErr?`<p class="tiny muted">Health Connect: ${esc(UI.hcErr)}</p>`:''}<div class="row" style="gap:6px"><button class="btn sm" data-a="hcread">Refresh now</button>${UI.hcErr&&/permission/i.test(UI.hcErr)?`<button class="btn sm" data-a="hcon">Reconnect</button>`:''}</div>`
   :`<p class="small"><b>Samsung Health steps</b></p><p class="small muted">In Samsung Health: Settings → Health Connect → turn on sync for Steps. Then connect here.</p><button class="btn sm primary" data-a="hcon">Connect Health Connect</button>`}</div>`
   :'<p class="small muted">The Android app reads this from Samsung Health automatically.</p>';
X.gtgNote=()=>NATIVE&&nset().on&&nset().gtg?'The notification has a one-tap "Done" button that logs the set and restarts the clock.':NATIVE?'Rep reminders are off in Settings.':'The Android app sends these as quiet notifications.';
/* MyFitnessPal (or any food app) → Health Connect → here */
/* MyFitnessPal public diary: read your own diary the same way MFP's own website shows a public diary. */
const mfpCardHC=()=>{if(!NATIVE)return `<div class="card flat stack" style="padding:12px"><p class="small"><b>MyFitnessPal</b> <span class="small muted">Android app only</span></p><p class="small muted">The Android app can pull in everything you log in MyFitnessPal, through Health Connect.</p></div>`;
  const on=S.profile.mfp,n=(S.food[TODAY]||[]).filter(e=>e.src==='hc').length;
  return `<div class="card flat stack" style="padding:12px"><p class="small"><b>MyFitnessPal</b> <span class="small muted">through Health Connect</span></p>
   ${on?`<p class="small">${n?`<b>${n}</b> entries from MyFitnessPal today.`:'Nothing from MyFitnessPal today yet.'} Last sync ${UI.mfpAt||'not yet'}. It syncs each time you open the app.</p>${UI.mfpErr?`<p class="tiny muted">Last try failed: ${esc(UI.mfpErr)}</p>`:''}
     <div class="row"><button class="btn sm primary" data-a="mfpsync">Sync now</button><button class="btn sm ghost" data-a="mfpoff">Turn off</button></div>
     ${S.profile.mfpUser?'<p class="small muted">The public diary is connected too, so MyFitnessPal entries come from there (no double counting).</p>':''}<p class="small muted">Log in MyFitnessPal and the meals show up here with their calories and macros. Edits and deletions in MyFitnessPal carry over for the last 3 days, and changes you make here are kept. Nothing appears? In MyFitnessPal check that Health Connect sync is on and includes Nutrition.</p>`
   :`<p class="small muted">Use MyFitnessPal's scanner and food database, and have the meals land here automatically. In MyFitnessPal: Menu → Apps &amp; Devices (or Settings → Sync) → Health Connect → allow it to write <b>Nutrition</b>. Then connect here.</p>
     <button class="btn sm primary" data-a="mfpon" style="align-self:flex-start">Connect</button>`}</div>`};
X.mfpCard=()=>{const u=S.profile.mfpUser,st=UI.mfpd||{},n=(S.food[TODAY]||[]).filter(e=>e.src==='mfp'),kc=n.reduce((a,e)=>a+e.k,0);
  if(!NATIVE)return `<div class="card flat stack" style="padding:12px"><p class="small"><b>MyFitnessPal diary</b> <span class="small muted">Android app only</span></p><p class="small muted">The Android app can copy your MyFitnessPal diary in.</p></div>`;
  return `<div class="card flat stack" style="padding:12px"><p class="small"><b>MyFitnessPal diary</b> <span class="small muted">copies your last 3 days</span></p>
   ${u?`<p class="small">Diary of <b>${esc(u)}</b>. ${n.length?`Today: <b>${n.length}</b> entries, <b>${fmt(kc)} kcal</b>. That should match MyFitnessPal's total for today.`:'Nothing from MyFitnessPal today yet.'} ${UI.mfpdAt?'Synced '+UI.mfpdAt+'.':''}</p>
     ${st.err?`<p class="small" style="color:var(--bad)">${esc(st.err)}</p>`:''}
     <div class="row"><button class="btn sm primary" data-a="mfpdsync" ${st.busy?'disabled':''}>${st.busy?'Syncing…':'Sync now'}</button><button class="btn sm ghost" data-a="mfpdoff">Disconnect</button></div>
     <p class="small muted">It syncs each time you open the app. Edits and deletions in MyFitnessPal carry over for the last 3 days, and changes you make here are kept.</p>`
   :`<p class="small muted">In MyFitnessPal (app or website): Settings → Diary Settings → Diary Sharing → <b>Public</b>. Then type your MyFitnessPal username here. Note: a public diary can be seen by anyone who knows your username.</p>
     <div class="row"><input id="mfpU" class="grow" autocomplete="off" autocapitalize="off" placeholder="MyFitnessPal username" aria-label="MyFitnessPal username"><button class="btn sm primary" data-a="mfpdon">Connect</button></div>
     ${st.err?`<p class="small" style="color:var(--bad)">${esc(st.err)}</p>`:''}`}
   <details><summary class="small muted">Use Health Connect instead (official MFP app only)</summary>${mfpCardHC()}</details></div>`};
// One diary entry → one food line. MFP gives the totals for the entry (servings already applied).
function mfpItem(x){const nc=x.nutritional_contents||x.nutrition||{};const v=k=>{const o=nc[k];return o==null?0:typeof o==='object'?+o.value||0:+o||0};
  let k=v('energy')||v('calories');if(/kilojoule|kj/i.test((nc.energy&&nc.energy.unit)||''))k/=4.184;if(!(k>0))return null;
  const f=x.food||{},name=[f.brand_name,f.description||x.description||x.name].filter(Boolean).join(' ');
  const meal=String(x.meal_name||x.meal_position||'x');
  return {n:(name||'MyFitnessPal food').slice(0,70)+' · MFP',k:Math.round(k),pr:Math.round(v('protein')),c:Math.round(v('carbohydrates')),f:Math.round(v('fat')),fi:Math.round(v('fiber')),x:1,src:'mfp',meal,
    iid:'mfp:'+(x.id||[meal,name,Math.round(k)].join('|'))}}
// Imported entries are replaced on every sync. What you changed here (amount, numbers) or removed here is remembered
// per entry and put back on top of each sync, for as long as the entry is in the sync window.
function impApply(d,list){const E=S.impEdit||{},D=S.impDel||{},seen={};
  return list.filter(e=>{if(!e.iid)return true;const n=seen[e.iid]=(seen[e.iid]||0)+1;if(n>1)e.iid+='#'+n;return !D[e.iid]})
    .map(e=>{const o=e.iid&&E[e.iid];if(!o)return e;const {d:_,...f}=o;return {...e,...f}})}
function impPrune(){const old=addDays(TODAY,-10);['impEdit','impDel'].forEach(k=>{const o=S[k];if(!o)return;Object.keys(o).forEach(id=>{const d=o[id]&&o[id].d||o[id];if(typeof d==='string'&&d<old)delete o[id]})})}
async function mfpDiary(quiet){const u=S.profile.mfpUser;if(!NATIVE||!u)return;UI.mfpd={busy:true};if(!quiet)render();
  try{const days=[0,1,2].map(i=>addDays(TODAY,-i));let n=0;impPrune();
    for(const d of days){const r=await tfetch(`https://www.myfitnesspal.com/api/services/diary/read_diary?entry_date=${d}&fields=all&types=food_entry&username=${encodeURIComponent(u)}`,{headers:{Accept:'application/json'}},25000);
      if(r.status===401||r.status===403)throw new Error('MyFitnessPal says this diary is private. Set Diary Sharing to Public, then Sync.');
      if(r.status===404)throw new Error('No MyFitnessPal user called "'+u+'". Check the username.');
      if(!r.ok)throw new Error('MyFitnessPal answered '+r.status+'. Try again later.');
      const j=await withT(r.json(),20000).catch(()=>null);if(!j)throw new Error('MyFitnessPal sent a web page instead of diary data (probably a bot check). Try again later.');
      const items=(Array.isArray(j)?j:j.items||j.data||j.entries||[]).filter(x=>x&&(!x.type||x.type==='food_entry'));
      const add=items.map(mfpItem).filter(Boolean);
      // A day with only 0-kcal entries (water, black coffee) is fine. Only a diary we can't read at all is an error.
      if(items.length&&!add.length&&!items.some(x=>x.nutritional_contents||x.nutrition))throw new Error('Got the diary but could not read it. Send this to Claude: '+JSON.stringify(items[0]).slice(0,240));
      const own=(S.food[d]||[]).filter(x=>x.src!=='mfp'&&!(x.src==='hc'&&/ · MFP$/.test(x.n||'')));S.food[d]=own.concat(impApply(d,add.map(({meal,...a})=>({...a,g:'mfp-'+d+'-'+meal}))));n+=add.length;save()}
    UI.mfpd={};UI.mfpdAt=nowHM();save();quiet?soft():render();if(!quiet)toast(n?n+' entries from MyFitnessPal':'Connected. Nothing in the diary for the last 3 days yet.');return true}
  catch(e){UI.mfpd={err:e.message==='timeout'?'MyFitnessPal did not answer. Try again in a bit.':e.message||String(e)};save();quiet?soft():render();return false}}
/* ---------- Settings pages (the frame is in ui-more.js) ---------- */
// The key test: both services at once, a hard 30 s limit each, and a status line per service that updates while it runs.
const short=m=>String(m||'').replace(/\s+/g,' ').slice(0,120);
async function aiTest(){if(UI.gemT&&UI.gemT.run)return;const g=gem(),T={run:true,t0:Date.now()};UI.gemT=T;
  const set=(k,s,m)=>{T[k]={s,m};renderSheet()};
  const tick=setInterval(()=>{const el=document.getElementById('aitT');if(el)el.textContent=Math.round((Date.now()-T.t0)/1000)+' s'},500);
  const badKey=e=>[400,401,403].includes(+e.status)&&/key|auth|unauth|invalid|permission/i.test(e.message||'')||[401,403].includes(+e.status);
  const jobs=[];
  if(g.key){T.g={s:'run',m:'Checking the key…'};jobs.push(withT((async()=>{const ms=await gemModels(g.key,true);set('g','run','Key accepted. Asking a model…');
      // The test asks even models that are sitting out, so it always tells you how things are right now.
      let tried=0,q=0,qm='';for(const m of aiOrder(ms,g.model).slice(0,4)){if(Date.now()-T.t0>26000)break;tried++;try{parseJSON(await withT(gemCall(m,'Return JSON {"ok":true}',null,g.key),8000));coolFor(m,0);return set('g','ok','Works · '+m)}
        catch(e){if(badKey(e))throw e;if(isDayQuota(e)){q++;qm=m;coolFor(m,untilReset(),1)}}}
      if(tried&&q===tried)return set('g','bad','Key accepted, but it has no free quota left today ('+qm+(q>1?' and '+(q-1)+' more':'')+'). Meals cannot be estimated with it until tomorrow. Add an OpenRouter key below, or type the numbers in yourself.');
      set('g','warn','Key is fine, but the models are busy right now. Meals get saved and estimated a bit later.')})(),30000)
    .catch(e=>set('g','bad',e.status===408?'No answer in 30 s. Check the connection and try again.':badKey(e)?'Key not accepted. Copy it again from aistudio.google.com.':short(e.message))))}
  if(g.or){T.o={s:'run',m:'Checking the key…'};jobs.push(withT((async()=>{
      const r=await withT(fetch('https://openrouter.ai/api/v1/key',{headers:{Authorization:'Bearer '+g.or}}),12000),j=await r.json().catch(()=>({}));
      if(!r.ok)throw aiErr((j.error&&j.error.message)||('OpenRouter error '+r.status),r.status);
      set('o','run','Key accepted. Asking a free model…');
      const ms=(await orModels(false)).filter(m=>!/r1|think|reason/i.test(m)),pick=[...new Set(['openrouter/free',ms.find(m=>/gemma|llama|mistral/i.test(m))||ms[0]].filter(Boolean))];
      try{const m=await Promise.any(pick.map(m=>withT(orCall(m,'Reply with only this JSON: {"ok":true}',null,g.or),20000).then(t=>{parseJSON(t);return m})));set('o','ok','Works · '+m)}
      catch(er){const es=(er&&er.errors)||[];if(es.length&&es.every(isDayQuota)){coolFor(OR_ALL,untilReset(),1);return set('o','bad','Key accepted, but the free daily limit is used up. It resets tomorrow.')}
        set('o','warn','Key is fine, but the free models are busy or slow right now. Meals get saved and estimated a bit later.')}})(),30000)
    .catch(e=>set('o','bad',e.status===408?'No answer in 30 s. Check the connection and try again.':badKey(e)?'Key not accepted. Copy it again from openrouter.ai/keys.':short(e.message))))}
  if(!jobs.length){T.run=false;T.none=true;clearInterval(tick);renderSheet();return}
  renderSheet();await Promise.allSettled(jobs);clearInterval(tick);T.run=false;T.secs=Math.round((Date.now()-T.t0)/1000);renderSheet()}
X.aiState=()=>{const g=gem(),n=(g.key?1:0)+(g.or?1:0);return n===2?'2 services':n?'1 service':'Not set up'};
X.notifState=()=>NATIVE?(nset().on?'On':'Off'):null;
const dotCls={ok:'good',warn:'warn',bad:'bad',run:'run'};
const keyField=(id,c,label,how,val,ph,st)=>`<div class="kf">
    <div class="row between"><label class="hi" for="${id}" style="font-weight:800">${label}</label>${st?`<span class="sdot ${dotCls[st.s]}"></span>`:val?'<span class="tiny muted">saved</span>':''}</div>
    <input id="${id}" type="password" autocomplete="off" spellcheck="false" value="${esc(val||'')}" placeholder="${ph}" data-c="${c}">
    ${st?`<p class="small ${st.s==='bad'?'bad-t':st.s==='ok'?'good-t':st.s==='warn'?'warn-t':'muted'}">${esc(st.m)}</p>`:`<p class="tiny muted">${how}</p>`}</div>`;
X.setAI=()=>{const g=gem(),T=UI.gemT||{},c=aic(),q=(S.aiq||[]).length;return `
   <p class="small muted">Estimates meals from a photo or a few words, and body fat from a photo. Two free services: Gemini first, OpenRouter if Gemini is busy. Keys stay on this phone and are never put in backups.</p>
   <div class="card stack" style="gap:14px">
    ${keyField('gemKey','gemkey','Gemini','aistudio.google.com → Get API key → Create',g.key,'Paste Gemini key',T.g)}
    <div class="hr"></div>
    ${keyField('orKey','orkey','OpenRouter','openrouter.ai/keys → Create key. No credit needed.',g.or,'Paste OpenRouter key',T.o)}
    ${hasAI()?`<button class="btn ${T.run?'':'primary'} block" data-a="gemtest" ${T.run?'disabled':''}>${T.run?'Testing… <span id="aitT">'+Math.round((Date.now()-T.t0)/1000)+' s</span>':T.secs!=null?'Test again':'Test the keys'}</button>`
     :'<p class="small muted">Paste at least one key to turn on estimates.</p>'}</div>
   <div class="card stack" style="gap:8px"><p class="small"><b>What the AI remembers about your food</b></p>
    ${aiMem().length?`<div class="list">${aiMem().map((m,i)=>`<div class="li"><span class="grow small">${esc(m)}</span><button class="icon-btn s" data-a="aimemdel" data-i="${i}" aria-label="Forget this">${I.x}</button></div>`).join('')}</div>`
     :'<p class="small muted">Nothing yet. After an estimate, open "Looks wrong? Tell the AI why" and tick "Remember this" to add a fact here.</p>'}</div>
   ${(()=>{const fx=aiFixes(),b=aiBias();return `<div class="card stack" style="gap:8px"><p class="small"><b>Learned from your corrections</b></p>
    ${fx.length?`<div class="list">${fx.map((f,i)=>({f,i})).slice(-12).reverse().map(({f,i})=>`<div class="li"><span class="grow small">${esc(f.n)}<br><span class="tiny muted">AI said ${fmt(f.a)} · you set ${fmt(f.u)} kcal · ${fmtDate(f.d)}</span></span><button class="icon-btn s" data-a="aifixdel" data-i="${i}" aria-label="Forget this correction">${I.x}</button></div>`).join('')}</div>
      <p class="tiny muted">${fx.length>12?fx.length+' kept, newest shown. ':''}${b?`Across your last ${b.n} corrections it ran about ${Math.abs(b.pct)}% too ${b.pct>0?'high':'low'}. It is told that with every new estimate.`:'The closest ones are sent along with every new estimate.'}</p>`
     :'<p class="small muted">Nothing yet. When you change a kcal number the AI gave you, the pair is kept here and sent along with later estimates, so it stops making the same mistake.</p>'}</div>`})()}
   ${q||UI.aiUsed||(c.gm&&c.gm.length)?`<p class="tiny muted">${c.gm&&c.gm.length?c.gm.length+' Gemini models available to your key. ':''}${UI.aiUsed?'Last answer: '+esc(UI.aiUsed)+'. ':''}${q?q+' meal'+(q>1?'s':'')+' waiting for an estimate.':''}</p>`:''}
   <details class="card"><summary class="small" style="font-weight:700">Advanced</summary><div class="stack" style="margin-top:10px">
    <div class="field"><label class="label" for="gemModel">Preferred Gemini model</label><input id="gemModel" value="${esc(g.model||'')}" placeholder="automatic: newest free Flash" autocapitalize="off" spellcheck="false" data-c="gemmodel"></div>
    <div class="field"><label class="label" for="fdcKey">USDA food database key</label><input id="fdcKey" type="password" autocomplete="off" value="${esc(g.fdc||'')}" placeholder="optional" data-c="fdckey">
     <p class="tiny muted">Food search works without it but runs out after a few searches an hour. Free at api.data.gov/signup.</p></div></div></details>`};
X.setNotif=()=>{if(!NATIVE)return '<p class="small muted">Notifications come with the Android app.</p>';const n=nset(),off=!n.on;
  const sw=(k,l,sub)=>`<label class="srow"><span class="grow"><b>${l}</b>${sub?`<br><span class="small muted">${sub}</span>`:''}</span><input type="checkbox" class="switch" ${n[k]?'checked':''} data-c="ntog" data-k="${k}"></label>`;
  const tm=(l,sub,v,attrs)=>`<label class="srow${off?' dim':''}"><span class="grow"><b>${l}</b><br><span class="small muted">${sub}</span></span><input type="time" value="${v}" ${attrs}></label>`;
  return `${UI.nPerm&&UI.nPerm!=='granted'?'<div class="note"><p><b class="hi">Notifications are blocked for Tally.</b> Nothing below can reach you until you allow them: Android Settings → Apps → Tally → Notifications.</p></div>':''}<div class="card slist">${sw('on','All notifications')}</div>
   <p class="label" style="margin-top:4px">Reminders</p>
   <div class="card slist">
    ${tm('Morning weigh-in','Skipped once you have logged today',n.weigh,'data-c="nweigh"')}
    ${sw('pills','Pill reminders')}
    ${tm('Iron (fer)','When you wake up',n.fe,'data-c="ntime" data-k="fe"')}
    ${tm('Magnesium','Before you sleep',n.mg,'data-c="ntime" data-k="mg"')}</div>
   <p class="label" style="margin-top:4px">Training</p>
   <div class="card slist">${sw('gtg','Rep reminders','Quiet, no vibration')}${sw('timer','Rest timer done','Rings when the rest is over')}</div>
   <button class="btn sm" data-a="ntest" style="align-self:flex-start">Send a test notification</button>`};

/* ---------- Notifications ---------- */
const ID={weigh:100,fe:200,mg:300,timer:900,gtg:1000};
async function nInit(){if(!NATIVE||!LN)return;try{
  await LN.createChannel({id:'remind',name:'Reminders',importance:3,vibration:true});
  await LN.createChannel({id:'quiet',name:'Rep windows',importance:2,vibration:false});
  await LN.createChannel({id:'timer',name:'Rest timer',importance:4,vibration:true});
  await LN.registerActionTypes({types:[{id:'gtg',actions:[{id:'done',title:'Done'}]},{id:'pill',actions:[{id:'took',title:'Taken'}]},
    {id:'weigh',actions:[{id:'kg',title:'Log weight',input:true,inputButtonTitle:'Save',inputPlaceholder:'kg, e.g. 74.6'}]}]});
  LN.addListener('localNotificationActionPerformed',a=>{const ex=a.notification&&a.notification.extra||{};
    if(ex.kind==='gtg'&&a.actionId==='done'){const g=gtgDay(TODAY);S.gtg.on.forEach(id=>{(g[id]=g[id]||[]).push(setSize(id))});gtgMark();save();render();toast('Set logged. Next reminder in '+everyTxt(S.gtg.remind.every))}
    else if(ex.kind==='pill'){const d=ex.d||TODAY;if(a.actionId==='took'){const sp=S.supps[d]=S.supps[d]||{};sp[ex.k]=true;if(ex.k==='fe'&&d===TODAY)sp.feAt=nowMinD();save();toast((ex.k==='fe'?'Iron':'Magnesium')+' ticked')}UI.tab='today';render()}
    else if(ex.kind==='gtg'&&a.actionId==='tap'){UI.tab='today';UI.sheet={kind:'repset'};render()}
    // Typed straight into the notification: saved as a fasted morning weigh-in for the day it was sent.
    else if(ex.kind==='weigh'&&a.actionId==='kg'){const v=parseFloat(String(a.inputValue||'').replace(',','.')),d=ex.d||TODAY;
      if(v>40&&v<150){const t=nowHM(),morn=d===TODAY&&isMorning(t),f=S.weights.find(w=>w.d===d&&!w.sample&&w.fasted);
        // Answered late (not this morning): it's kept out of the trend, and never replaces a fasted weigh-in.
        if(!morn&&f){render();toast("Kept this morning's "+f.kg+" kg")}else{const old=putWeight(d,Math.round(v*10)/10,t,morn);render();weightToast(d,old,morn?'Weigh-in saved: '+v+' kg':'Saved '+v+' kg, kept out of the trend (not a morning weigh-in)')}}else{UI.tab='today';UI.sheet={kind:'weight'};render();toast('Could not read "'+(a.inputValue||'')+'". Type it here.')}}
    else if(ex.kind==='weigh'){UI.tab='today';UI.sheet={kind:'weight'};render();setTimeout(()=>{const i=document.getElementById('wIn3');if(i)i.focus()},300)}});
  let p=await LN.checkPermissions();if(p.display!=='granted')p=await LN.requestPermissions();UI.nPerm=p.display;nSync()}catch(e){console.warn(e)}}
let syncT;function nSyncSoon(){clearTimeout(syncT);syncT=setTimeout(nSync,800)}
async function nSync(){if(!NATIVE||!LN)return;try{
  try{UI.nPerm=(await LN.checkPermissions()).display}catch(_){}
  const pend=await LN.getPending();const mine=pend.notifications.filter(n=>n.id>=ID.weigh&&n.id<ID.timer||n.id>=ID.gtg);if(mine.length)await LN.cancel({notifications:mine.map(n=>({id:n.id}))});
  const n=nset();if(!n.on)return;const out=[],now=Date.now(),at=(d,mins)=>{const x=parse(d);x.setMinutes(mins);return x};
  [0,1].forEach(off=>{const d=addDays(TODAY,off),t=at(d,toMin(n.weigh));if(t>now&&!S.weights.some(w=>w.d===d&&!w.sample))
    out.push({id:ID.weigh+off,title:'Morning weigh-in',body:'After the toilet, before food or water. Pull down to type it here.',channelId:'remind',actionTypeId:'weigh',schedule:{at:t,allowWhileIdle:true},extra:{kind:'weigh',d}})});
  // Rep reminder: ONE pending at a time. The next comes `every` minutes after the last logged set.
  if(n.gtg&&S.gtg.on.length){const names=S.gtg.on.map(id=>{const m=MOVES.find(x=>x.id===id);return m?moveTxtS(id,setSize(id)):''}).filter(Boolean).join(', ');
    const step=Math.max(15,+S.gtg.remind.every||90);
    const add=(id,t)=>out.push({id,title:'Rep set',body:names,channelId:'quiet',actionTypeId:'gtg',schedule:{at:t,allowWhileIdle:true},extra:{kind:'gtg'}});
    // A set that's already due (you opened the app late, or ignored the last one) still gets a reminder: the next
    // step of `every` minutes from when it came due, never a burst of old ones.
    // Tomorrow's first one is only queued once today's are over, so there is never more than one waiting.
    const nx=gtgNext();let today=false;if(nx!=null){let m=nx;while(at(TODAY,m)<=now)m+=step;if(m<=toMin(S.gtg.remind.end)){add(ID.gtg,at(TODAY,m));today=true}}
    // Tomorrow's first is always queued too, so an ignored reminder never stops the next day's.
    add(ID.gtg+1,at(addDays(TODAY,1),toMin(S.gtg.remind.start)))}
  if(n.pills)[['fe',n.fe,'Iron (fer)','Take it now with water, on an empty stomach. Coffee, tea, milk and whey at least an hour later.'],['mg',n.mg,'Magnesium','Take it before you sleep.']].filter(([k])=>hasSupp(k)).forEach(([k,tm,title,body])=>
    [0,1].forEach(off=>{const d=addDays(TODAY,off),t=at(d,toMin(tm));if(t>now&&!(S.supps[d]||{})[k])out.push({id:ID[k]+off,title,body,channelId:'remind',actionTypeId:'pill',schedule:{at:t,allowWhileIdle:true},extra:{kind:'pill',k,d}})}));
  if(out.length)await LN.schedule({notifications:out})}catch(e){console.warn(e)}}
let lastTimer=0;setInterval(async()=>{if(!NATIVE||!LN)return;const te=UI.timerEnd||0;if(te===lastTimer)return;lastTimer=te;
  try{await LN.cancel({notifications:[{id:ID.timer}]});const n=nset();if(te>Date.now()+3000&&n.on&&n.timer)await LN.schedule({notifications:[{id:ID.timer,title:'Rest done',body:'Next set.',channelId:'timer',schedule:{at:new Date(te),allowWhileIdle:true}}]})}catch(e){}},1000);

/* ---------- Health Connect steps ---------- */
// Two ways in: Health Connect's daily totals (de-duplicated across phone + watch), and, when that call fails
// (it does on some Health Connect / Samsung versions), the raw step records summed per day here.
// The raw path also respects "Your day ends at". Per day it takes the source with the most steps, so a phone
// and a watch counting the same walk aren't added together.
async function hcSteps(start,end){
  try{const r=await HP.queryAggregated({startDate:start.toISOString(),endDate:end.toISOString(),dataType:'steps',bucket:'day'});
    // The plugin answers an empty list, not an error, when the Steps permission was taken away.
    const a=r.aggregatedData||[];if(!a.length)throw new Error('Steps permission is off. Tap Connect again or allow it in Health Connect.');
    const o={};a.forEach(b=>{o[ymd(new Date(b.startDate))]=Math.round(+b.value||0)});UI.hcErr=null;return o}
  catch(e1){const r=await HP.queryRecords({startDate:new Date(+start+dayEnd()*6e4).toISOString(),endDate:new Date(Math.min(Date.now(),+end+dayEnd()*6e4)).toISOString(),dataType:'steps'});
    const by={};(r.records||[]).forEach(x=>{const d=dayOf(Date.parse(x.startDate)),s=x.sourceBundleId||'?';(by[d]=by[d]||{})[s]=(by[d][s]||0)+(+x.value||0)});
    const o={};Object.keys(by).forEach(d=>{o[d]=Math.round(Math.max(...Object.values(by[d])))});UI.hcErr='daily totals failed, read raw records ('+String(e1.message||e1).slice(0,80)+')';return o}}
async function hcRead(quiet){if(!NATIVE||!HP)return;if(document.hidden)return;try{
  const end=parse(addDays(TODAY,1)),start=parse(addDays(TODAY,-6));
  const o=await hcSteps(start,end);
  Object.keys(o).forEach(d=>{const v=o[d];if(v>(S.steps[d]||0)||d===TODAY)S.steps[d]=v});
  UI.hcAt=nowHM();save();quiet?soft():render()}catch(e){UI.hcErr=String(e.message||e).slice(0,140);if(!quiet)toast('Could not read steps: '+(e.message||e));else soft()}}
// The plugin's Android side returns permissions as {READ_STEPS:true}, its docs say [{READ_STEPS:true}]. Accept both.
const granted=(r,k)=>{const p=r&&r.permissions;return Array.isArray(p)?p.some(x=>x&&x[k]):!!(p&&p[k])};
async function hcAsk(perms){const av=await HP.isHealthAvailable();if(!av.available){toast('Install Health Connect from the Play Store first');try{await HP.showHealthConnectInPlayStore()}catch(_){}return null}
  return HP.requestHealthPermissions({permissions:perms})}
async function hcOn(){if(!HP)return;try{const r=await hcAsk(['READ_STEPS']);if(!r)return;
  if(!granted(r,'READ_STEPS')){toast('Steps permission not given. Allow it in Health Connect.');try{await HP.openHealthConnectSettings()}catch(_){}return}
  S.profile.hcOn=true;save();UI.sheet=null;await hcRead();toast('Steps connected')}catch(e){toast('Health Connect: '+(e.message||e))}}
async function mfpOn(){if(!HP)return;try{const r=await hcAsk(['READ_NUTRITION']);if(!r)return;
  if(!granted(r,'READ_NUTRITION')){toast('Nutrition permission not given. Allow it in Health Connect.');try{await HP.openHealthConnectSettings()}catch(_){}return}
  S.profile.mfp=true;save();await mfpSync(false)}catch(e){toast('Health Connect: '+(e.message||e))}}
// Replace the last 3 days of imported entries with what Health Connect has now, so MFP edits and deletions carry over.
const MEAL={breakfast:'Breakfast',lunch:'Lunch',dinner:'Dinner',snack:'Snack'};
async function mfpSync(quiet){if(!NATIVE||!HP||!S.profile.mfp)return;try{
  const days=[0,1,2].map(i=>addDays(TODAY,-i));
  const r=await HP.queryNutrition({startDate:new Date(+parse(days[2])+dayEnd()*6e4).toISOString(),endDate:new Date(+parse(addDays(TODAY,1))+dayEnd()*6e4).toISOString()});
  // With the public diary also connected, MyFitnessPal's own entries come from the diary: taking them here too would count them twice.
  const diary=!!S.profile.mfpUser;impPrune();
  const by={};(r.entries||[]).forEach(e=>{if(/recomp/i.test(e.sourceBundleId||''))return;if(diary&&/myfitnesspal/i.test(e.sourceBundleId||''))return;const d=dayOf(Date.parse(e.startDate));(by[d]=by[d]||[]).push(e)});
  let n=0;days.forEach(d=>{const hcMfp=!diary&&(by[d]||[]).some(e=>/myfitnesspal/i.test(e.sourceBundleId||''));
    // Diary disconnected and MFP now comes through Health Connect: the old diary copies of that day go, or it counts twice.
    const own=(S.food[d]||[]).filter(x=>x.src!=='hc'&&!(hcMfp&&x.src==='mfp'));
    const add=(by[d]||[]).filter(e=>e.energyKcal>0).map(e=>{const m=e.macros||{},mfp=/myfitnesspal/i.test(e.sourceBundleId||'');
      return {n:(e.name||MEAL[e.mealType]||'Food')+(mfp?' · MFP':''),k:Math.round(e.energyKcal),pr:Math.round(m.proteinG||0),c:Math.round(m.carbohydratesG||0),f:Math.round(m.fatG||0),fi:Math.round(m.fiberG||0),x:1,src:'hc',hid:e.id,iid:e.id?'hc:'+e.id:undefined,g:'hc-'+d+'-'+(e.mealType||'x')}});
    if(add.length||own.length!==(S.food[d]||[]).length){S.food[d]=own.concat(impApply(d,add));n+=add.length}});
  UI.mfpAt=nowHM();UI.mfpErr=null;save();quiet?soft():render();if(!quiet)toast(n?n+' entries from MyFitnessPal':'Connected. Nothing logged in MyFitnessPal for the last 3 days yet.')}
  catch(e){UI.mfpErr=String(e.message||e).slice(0,140);if(!quiet)toast('MyFitnessPal sync: '+(e.message||e));else soft()}}

/* ---------- Backup through the share sheet ---------- */
X.exportFile=async(json,name)=>{try{const r=await FS.writeFile({path:name,data:json,directory:'CACHE',encoding:'utf8'});
  await SH.share({title:'Tally backup',text:'Tally backup '+TODAY,url:r.uri,dialogTitle:'Save backup to…'});return true}catch(e){if(!/cancel/i.test(e.message||''))toast('Backup failed: '+(e.message||e));return false}};

/* ---------- Automatic weekly backup (APK only) ----------
   Saved to Documents/RecompCoach on the phone, so it survives the app being uninstalled. Keeps the newest 4. */
const BK_DIR='RecompCoach';
async function autoBackup(force){if(!NATIVE||!FS)return;if(!force&&S.autoBk&&diffDays(S.autoBk,TODAY)<7)return;
  try{const json=JSON.stringify({app:'recomp-coach',key:KEY,saved:new Date().toISOString(),data:S},null,1);
    await FS.writeFile({path:BK_DIR+'/recomp-auto-'+TODAY+'.json',data:json,directory:'DOCUMENTS',encoding:'utf8',recursive:true});
    S.autoBk=TODAY;UI.bkErr=null;save();
    try{const r=await FS.readdir({path:BK_DIR,directory:'DOCUMENTS'});const names=(r.files||[]).map(f=>typeof f==='string'?f:f.name).filter(n=>/^recomp-auto-.*\.json$/.test(n)).sort();
      for(const n of names.slice(0,Math.max(0,names.length-4)))await FS.deleteFile({path:BK_DIR+'/'+n,directory:'DOCUMENTS'})}catch(_){}
    if(force)toast('Saved to Documents/'+BK_DIR)}catch(e){UI.bkErr=e.message||String(e);if(force)toast('Auto backup failed: '+UI.bkErr)}}
X.autoBkNote=()=>NATIVE?`<p class="small muted">Auto backup: every week to <b>Documents/${BK_DIR}</b> on this phone (newest 4 kept). Last: ${S.autoBk?fmtDate(S.autoBk):'not yet'}.${UI.bkErr?' <span style="color:var(--bad)">Last try failed: '+esc(UI.bkErr)+'</span>':''} <button class="btn sm ghost" data-a="autobk">Save one now</button></p>`:'';

/* ---------- Pending estimates: saved now, filled in when a model is free ----------
   S.aiq = [{id,d,desc,img,at,tries}]. The food entry carries pend:id until the numbers arrive; a meal photo waits in the
   photo database under 'q:'+id. Retries after 1, 2, 5, 10, then 15 minutes, and when the app is opened: 6 tries or 2 hours at most,
   and at once when the AI says the day's free quota is used up. Then the meal keeps its quick-match numbers (or asks for numbers). */
const hasPH=()=>typeof PH!=='undefined';
function queueMeal(desc,b64){const id=newG(),q=parseMeal(desc||''),sum=f=>Math.round(q.reduce((a,o)=>a+(o.f[f]||0)*o.x,0));
  pushFood({n:(desc||'Photo meal').slice(0,70),k:sum('k'),pr:sum('pr'),c:sum('c'),f:sum('f'),fi:sum('fi'),x:1,src:'ai',pend:id,g:id});
  const qi={id,d:foodDayNow(),desc:desc||'',img:!!b64&&hasPH(),at:Date.now(),tries:0};(S.aiq=S.aiq||[]).push(qi);
  // If the photo can't be stored, the meal waits on its words alone (or asks for numbers) instead of sending "(see photo)" with no photo.
  if(qi.img)PH.put('q:'+id,b64).catch(()=>{qi.img=false;save()});save();queueKick(60000)}
let qT=null,qBusy=false;
function queueKick(ms){clearTimeout(qT);if((S.aiq||[]).length)qT=setTimeout(queueRun,ms)}
async function queueRun(){if(qBusy||!(S.aiq||[]).length)return;
  const drop=q=>{S.aiq=S.aiq.filter(x=>x!==q);if(hasPH())PH.del('q:'+q.id).catch(()=>{})};
  // Always read the day fresh: a MyFitnessPal sync may have replaced S.food[day] while the AI was thinking.
  const unpend=q=>(S.food[q.d]||[]).forEach(x=>{if(x.pend===q.id){delete x.pend;if(!(x.k>0))x.nonum=1}});
  // Key removed since the meal was queued: keep the quick-match numbers and say so, instead of "Estimating" forever.
  if(!hasAI()){const qs=[...S.aiq];qs.forEach(q=>{unpend(q);drop(q)});save();soft();toast(qs.length+' meal'+(qs.length>1?'s':'')+' kept with rough numbers: no AI key. Tap to fix them.');return}
  qBusy=true;try{
  for(const q of [...S.aiq]){
    if(!(S.food[q.d]||[]).some(e=>e.pend===q.id)){drop(q);save();continue}                       // you deleted it
    try{const b64=q.img&&hasPH()?await PH.get('q:'+q.id):null;
      // A photo-only meal whose photo is gone isn't guessed blind.
      if(q.img&&!b64&&!(q.desc||'').trim()){unpend(q);drop(q);save();soft();toast('A queued meal photo was lost. Tap the meal to set its numbers.');continue}
      const r=await foodAI(q.desc,b64||undefined),ents=S.food[q.d]||[],i=ents.findIndex(e=>e.pend===q.id);if(i<0){drop(q);save();continue}
      const old=ents[i];ents.splice(i,1,...r.items.map(it=>({n:it.n,k:Math.round(it.k),pr:Math.round(it.pr),c:Math.round(it.c),f:Math.round(it.f),fi:Math.round(it.fi||0),x:old.x||1,src:'ai',g:old.g,t:old.t,ak:Math.round(it.k),...(it.g?{pg:it.g}:{})})));
      // The edit sheet open on the waiting entry follows it to the estimate instead of closing under your finger.
      if(UI.sheet&&UI.sheet.kind==='fedit'&&UI.sheet.e===old)UI.sheet.e=ents[i];
      drop(q);save();soft();toast('Estimate ready: '+fmt(r.items.reduce((a,it)=>a+it.k,0))+' kcal')}
    catch(e){if(!e.offline)q.tries++;q.err=e.quota?'no free AI quota left today':e.offline?'no connection':e.retry?'the AI is busy':short(e.message);
      if(e.quota||Date.now()-q.at>2*36e5||q.tries>=6||(!e.retry&&q.tries>=3)){unpend(q);drop(q);soft();toast('No estimate for "'+(q.desc||'photo meal').slice(0,30)+'" ('+q.err+'). Tap it in Food to set the numbers.')}
      save();if(e.offline||e.quota)break}}
  }finally{qBusy=false}soft();if((S.aiq||[]).length)queueKick([60,120,300,600,900][Math.min(4,Math.min(...S.aiq.map(q=>q.tries)))]*1000)}
// Pending entry: why it is still waiting, for the edit sheet.
X.aiLearn=aiLearn;X.aiForget=aiForget;
X.pendInfo=id=>{const q=(S.aiq||[]).find(x=>x.id===id);return q?{tries:q.tries,err:q.err||'',at:q.at}:null};
// Stop waiting: keep the numbers it has now.
X.unpend=(d,e)=>{const q=(S.aiq||[]).find(x=>x.id===e.pend);delete e.pend;if(!(e.k>0))e.nonum=1;if(q){S.aiq=S.aiq.filter(x=>x!==q);if(hasPH())PH.del('q:'+q.id).catch(()=>{})}save()};
// A copy of each progress photo in Documents, so photos survive the app being removed.
X.delPhoto=async id=>{if(!NATIVE||!FS)return;try{await FS.deleteFile({path:BK_DIR+'/photos/'+id+'.jpg',directory:'DOCUMENTS'})}catch(_){}};
// A copy of everything just before a restore, so a wrong file can be undone even after the app is closed.
X.saveBefore=async json=>{if(!NATIVE||!FS)return null;const n='recomp-before-restore-'+TODAY+'.json';try{await FS.writeFile({path:BK_DIR+'/'+n,data:json,directory:'DOCUMENTS',encoding:'utf8',recursive:true});return 'Documents/'+BK_DIR+'/'+n}catch(_){return null}};
X.savePhoto=async(id,blob)=>{if(!NATIVE||!FS)return;try{const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(blob)});
  await FS.writeFile({path:BK_DIR+'/photos/'+id+'.jpg',data:b64,directory:'DOCUMENTS',recursive:true})}catch(_){}};

/* ---------- Actions ---------- */
Object.assign(A,{
 aifood:async()=>{const d=UI.desc.trim(),ph=snapsB64();if(!d&&!ph)return toast('Add a photo or a few words first');const tok=UI.aiTok=(UI.aiTok||0)+1;UI.ai={busy:true};render();
   try{const r=await foodAI(d,ph);if(tok!==UI.aiTok)return;UI.ai=r;queueKick(2000)}
   catch(e){if(tok!==UI.aiTok)return;if(e.retry){queueMeal(d,ph);UI.ai={};UI.desc='';clearSnaps();if(UI.sheet&&UI.sheet.kind==='describe')UI.sheet=null;render();
       toast(e.offline?'No connection. Saved: it gets estimated when you are back online.':'The AI is busy. Saved: the numbers fill in by themselves shortly.');return}
     UI.ai={err:e.message,quota:!!e.quota}}render()},
 // Feedback on an estimate: the AI redoes it with what you said, and can remember lasting facts for next time.
 aifix:async()=>{const st=UI.ai;if(!st||!st.items)return;const el=$('#aiFix'),msg=((el&&el.value)||'').trim().slice(0,300),keep=!!($('#aiMemOn')||{}).checked;
   if(!msg)return toast('Say what looks wrong first');if(st.fixing)return;const ph=snapsB64(),fixes=[...(st.fixes||[]),msg],tok=UI.aiTok=(UI.aiTok||0)+1;
   if(keep){S.aiMem=[...aiMem().filter(m=>m!==msg),msg].slice(-25);save()}
   UI.ai={...st,fixing:true,fixErr:null};render();
   // A late answer is dropped if the meal was added, cleared or its photos changed meanwhile.
   try{const r=await foodAI(UI.desc.trim(),ph,{prev:st.items,msgs:fixes});if(tok!==UI.aiTok)return;UI.ai={...r,fixes};toast(keep?'Re-estimated · remembered for next time':'Re-estimated')}
   catch(e){if(tok!==UI.aiTok)return;UI.ai={...st,fixing:false,fixErr:e.retry?'The AI is busy right now. Try again in a minute, or fix the kcal yourself.':e.message}}render()},
 aifixdel:t=>{const fx=aiFixes();fx.splice(+t.dataset.i,1);S.aiFix=fx;save();renderSheet()},
 aimemdel:t=>{const m=aiMem();m.splice(+t.dataset.i,1);S.aiMem=m;save();renderSheet()},
 snapclear:()=>{clearSnaps();render()},
 snaprm:t=>{const s=UI.snaps||[],p=s.splice(+t.dataset.i,1)[0];if(p)URL.revokeObjectURL(p.url);UI.aiTok=(UI.aiTok||0)+1;if(UI.ai&&(UI.ai.busy||UI.ai.items))UI.ai={};render()},
 aidel:t=>{UI.ai.items.splice(+t.dataset.i,1);if(!UI.ai.items.length)UI.ai={};render()},
 aiadd:t=>{const st=UI.ai;if(!st||!st.items||st.fixing)return;const tot=st.items.reduce((a,i)=>a+i.k,0);if(bigAsk(tot,()=>A.aiadd({dataset:{ok:1}}),t))return;const g=newG(),d=foodDayNow(),fx0=Array.isArray(S.aiFix)?S.aiFix.slice():S.aiFix;let learned=0;
   // A kcal you changed before adding is a correction: the AI keeps it for next time. ak = the AI's own number, for fixes made later.
   st.items.forEach(i=>{if(i.k0>0&&Math.round(i.k)!==Math.round(i.k0)&&aiLearn(i.n,i.g,i.k0,i.k))learned++;
     pushFood({n:i.n,k:Math.round(i.k),pr:Math.round(i.pr),c:Math.round(i.c),f:Math.round(i.f),fi:Math.round(i.fi||0),x:1,src:'ai',g,ak:Math.round(i.k0>0?i.k0:i.k),...(i.g?{pg:i.g}:{})})});
   const n=st.items.length;UI.aiTok=(UI.aiTok||0)+1;UI.ai={};UI.desc='';clearSnaps();save();render();
   toast(n+' item'+(n>1?'s':'')+' added'+(learned?' · the AI will remember your fix':''),()=>{S.food[d]=(S.food[d]||[]).filter(e=>e.g!==g);if(learned)S.aiFix=fx0;save();render()})},
 offgo:()=>{const c=($('#offCode').value||'').replace(/\D/g,'');if(c.length<8)return toast('Enter the full barcode');offFind(c)},
 offadd:t=>{const p=UI.off.p,g=parseFloat($('#offG').value);if(!(g>0))return toast('Enter grams');const x=g/100;if(bigAsk(p.k*x,()=>A.offadd({dataset:{ok:1}}),t))return;rememberScan(UI.off.code,p,g);
   pushFood({n:p.n+' ('+g+' g)',k:p.k*x,pr:p.pr*x,c:p.c*x,f:p.f*x,fi:(p.fi||0)*x,x:1,src:'off'});UI.off={};save();render();toast('Added')},
 autobk:()=>autoBackup(true), hcon:hcOn, hcread:()=>hcRead(false),
 mfpdon:async()=>{const u=($('#mfpU').value||'').trim().replace(/^@/,'');if(!u)return toast('Type your MyFitnessPal username');S.profile.mfpUser=u;save();if(!await mfpDiary(false)){S.profile.mfpUser=null;save();render()}},
 mfpdsync:()=>mfpDiary(false), mfpdoff:()=>{S.profile.mfpUser=null;UI.mfpd={};save();render();toast('Disconnected. Imported entries stay.')},
 livescan:async()=>{try{const m=await BS.isGoogleBarcodeScannerModuleAvailable();
     if(!m.available){toast('Getting the scanner from Google Play (one time). Try again in a few seconds.');await BS.installGoogleBarcodeScannerModule();return}
     const r=await BS.scan({formats:['EAN_13','EAN_8','UPC_A','UPC_E']});const b=r&&r.barcodes&&r.barcodes[0];if(b&&b.rawValue)offFind(b.rawValue)}
   catch(e){if(!/cancel/i.test(e.message||''))toast('Scanner: '+(e.message||e))}},
 offmanual:t=>{const num=id=>parseFloat(($('#'+id)||{}).value),name=(($('#mnN')||{}).value||'').trim(),k=num('mnK'),g=num('mnG');
   if(!name)return toast('Add a name');if(!(k>0))return toast('Add kcal per 100 g');if(!(g>0))return toast('Add grams eaten');
   const p={n:name,k,pr:num('mnP')||0,c:num('mnC')||0,f:num('mnF')||0,fi:0},x=g/100;if(bigAsk(k*x,()=>A.offmanual({dataset:{ok:1}}),t))return;rememberScan(UI.off.code,p,g);
   pushFood({n:p.n+' ('+g+' g)',k:p.k*x,pr:p.pr*x,c:p.c*x,f:p.f*x,fi:0,x:1,src:'off'});UI.off={};save();render();toast('Saved. Next scan of it is instant.')},
 mfpon:mfpOn, mfpsync:()=>mfpSync(false), mfpoff:()=>{S.profile.mfp=false;save();render();toast('MyFitnessPal import off. Already imported entries stay.')},
 gemtest:aiTest,
 ntest:async()=>{try{const p=await LN.checkPermissions();UI.nPerm=p.display;if(p.display!=='granted'){renderSheet();return toast('Notifications are blocked for Tally in Android Settings')}await LN.schedule({notifications:[{id:99,title:'Tally',body:'Notifications work.',channelId:'remind',schedule:{at:new Date(Date.now()+2000)}}]});toast('Sending in 2 s')}catch(e){toast(e.message)}}
});
document.addEventListener('change',async e=>{const t=e.target,c=t.dataset.c;if(!c)return;
  if(c==='gemkey'){setGem({key:t.value.trim()});setAic({cool:{},gm:null});UI.gemT=null;renderSheet()}
  if(c==='fdckey'){setGem({fdc:t.value.trim()})}
  if(c==='gemmodel'){setGem({model:t.value.trim()})}
  if(c==='orkey'){setGem({or:t.value.trim()});const cl=aic().cool||{};Object.keys(cl).forEach(k=>{if(k.includes('/')||k===OR_ALL)delete cl[k]});setAic({cool:cl});UI.gemT=null;renderSheet()}
  if(c==='nweigh'&&t.value){S.profile.notif={...nset(),weigh:t.value};save()}
  if(c==='ntime'&&t.value){S.profile.notif={...nset(),[t.dataset.k]:t.value};save()}
  if(c==='ntog'){S.profile.notif={...nset(),[t.dataset.k]:t.checked};save();renderSheet()}
  if(c==='aik')render();
  if(c==='snapph'&&t.files[0]){const fs=[...t.files];if(UI.cam&&A.camclose)A.camclose();
    for(const f of fs){if((UI.snaps||[]).length>=SNAP_MAX){toast(SNAP_MAX+' photos is the most per meal');break}try{addSnap(URL.createObjectURL(f),await fileToJpeg(f))}catch(er){toast('Could not read that photo')}}
    UI.ai={};if(!UI.sheet)UI.sheet={kind:'describe'};render()}
  if(c==='bfaiph'&&t.files[0]){if(UI.cam&&A.camclose)A.camclose();try{X.bfRun(await fileToJpeg(t.files[0]))}catch(er){toast('Could not read that photo')}}
  if(c==='offscan'&&t.files[0]){try{offFind(await scanImage(t.files[0]))}catch(er){UI.off={err:er.message};render()}}});
// An item the AI gave 0 kcal can still be set: there is just nothing to scale the macros from.
document.addEventListener('input',e=>{const t=e.target;if(t.dataset.c!=='aik')return;const i=UI.ai.items[+t.dataset.i],v=+t.value;if(!i||!(v>=0)||t.value==='')return;
  // Scaled from the AI's own numbers, so passing through 0 while typing does not wipe the macros.
  if(!i.b)i.b={k:i.k,pr:i.pr,c:i.c,f:i.f,fi:i.fi||0};if(i.b.k>0){const k=v/i.b.k;i.pr=i.b.pr*k;i.c=i.b.c*k;i.f=i.b.f*k;i.fi=i.b.fi*k}i.k=v;
  const b=document.getElementById('aiAddB'),n=UI.ai.items.length;if(b)b.textContent='Add '+n+' item'+(n>1?'s':'')+' · '+fmt(UI.ai.items.reduce((a,x)=>a+x.k,0))+' kcal'});

/* ---------- Wire up ---------- */
window.NX=X;X.onSave=nSyncSoon;
setTimeout(()=>queueRun(),6000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueKick(1500)});
if(NATIVE){nInit();document.addEventListener('visibilitychange',()=>{if(!document.hidden){nSync();autoBackup();if(S.profile.hcOn)hcRead(true);if(S.profile.mfp)mfpSync(true);if(S.profile.mfpUser)mfpDiary(true)}});if(S.profile.hcOn)hcRead(true);if(S.profile.mfp)mfpSync(true);if(S.profile.mfpUser)mfpDiary(true);setTimeout(()=>autoBackup(),4000)}
render();
})();
