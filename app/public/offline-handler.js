self.addEventListener('install',event=>{event.waitUntil(caches.open('revel-offline-page').then(cache=>cache.add('/offline.html')));});
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));});
