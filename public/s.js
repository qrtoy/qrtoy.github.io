V="5"
skipWaiting()
oninstall=e=>e.waitUntil(caches.open(V).then(c=>c.add(new Request("/",{cache:"no-cache"}))))
onactivate=e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.map(n=>n!=V&&caches.delete(n)))))
onfetch=e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))
