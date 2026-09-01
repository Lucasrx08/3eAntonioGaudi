const CACHE_VERSION='ma3e-clean-20260901';
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
// Aucun fetch intercepté : Safari et les autres navigateurs chargent directement
// les fichiers depuis GitHub Pages. Le cache local des données reste géré par app.js.
