const C='pib-polos-v5',Q='?v=5',F=['./','index.html','style.css'+Q,'app.js'+Q,'icon.svg','manifest.webmanifest','vendor/jspdf.umd.min.js'+Q,'vendor/jszip.min.js'+Q];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(u=>new Request(u,{cache:'reload'})))))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;const nav=r.mode==='navigate';
e.respondWith(fetch(r,{cache:nav?'no-store':'no-cache'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(nav?'index.html':r,cp))}return res}).catch(()=>nav?caches.match('index.html'):caches.match(r).then(m=>m||caches.match(r,{ignoreSearch:true}))))});
