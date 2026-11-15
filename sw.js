/* Tally offline cache (web / iPhone only; the Android app doesn't use it).
   Code and the page: network first, so updates arrive as soon as there's a connection; the cached copy when offline.
   Pictures and fonts: from the cache once seen. Other sites (AI, food databases) are never cached. */
const V='tally-202611151320';
const CORE=['./','index.html','app.css','poses.js','tips.js','native.js','ui-core.js','ui-more.js','manifest.webmanifest',
  'icon.svg','icon-180.png','icon-192.png','icon-512.png',
  'fonts/BigShouldersDisplay-latin.woff2','fonts/BigShouldersDisplay-latin-ext.woff2','fonts/Manrope-latin.woff2','fonts/Manrope-latin-ext.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin)return;
  const code=r.mode==='navigate'||/\.(js|css|html|webmanifest)$/.test(u.pathname)||u.pathname.endsWith('/');
  if(code){e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res})
    .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))));return}
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(m=>m||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res})))});
