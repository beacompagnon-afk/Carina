const CACHE='carina-v1';
importScripts('./assets.js');
const A=self.CARINA_ASSETS||{cats:[],moments:[]};
const CORE=['./','./index.html','./assets.js','./manifest.json','./icon-192.png','./icon-512.png','./carina.jpg'];
const FALLBACK=A.cats.slice(0,6).map(f=>'./cats/'+f).concat(A.moments.slice(0,6).map(f=>'./moments/'+f));
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE.concat(FALLBACK)).catch(()=>{})).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.open(CACHE).then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(rsp=>{try{c.put(e.request,rsp.clone());}catch(_){}; return rsp;}).catch(()=>r))));
});
self.addEventListener('push', e=>{
  let body='something’s been delivered.';
  try{ if(e.data) body=e.data.text(); }catch(_){}
  e.waitUntil(self.registration.showNotification('Carina', {body, icon:'icon-192.png', badge:'icon-192.png'}));
});
self.addEventListener('notificationclick', e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(cl=>{for(const c of cl){if('focus' in c) return c.focus();} return clients.openWindow('./');}));
});
