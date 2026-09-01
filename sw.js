const CACHE='ma3e-v8-fast-20260901';
const SHELL=['./','./index.html','./styles.css','./overrides.css','./app.js','./overrides.js','./manifest.webmanifest'];
const DATA=['calendar.json','timetable.json','resources.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const dataName=DATA.find(name=>url.pathname.endsWith('/'+name));
  if(dataName){
    const canonical=new Request(new URL('./'+dataName,self.location).href);
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const cached=await cache.match(canonical);
      const network=fetch(new Request(event.request,{cache:'no-store'})).then(response=>{if(response.ok)cache.put(canonical,response.clone());return response;}).catch(()=>null);
      if(cached){network.catch(()=>{});return cached;}
      return (await network)||new Response(JSON.stringify({events:[],resources:[]}),{headers:{'Content-Type':'application/json'}});
    })());
    return;
  }
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const cached=await cache.match('./index.html');
      const network=fetch(event.request).then(response=>{if(response.ok)cache.put('./index.html',response.clone());return response;}).catch(()=>null);
      return cached||(await network)||Response.error();
    })());
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok&&url.origin===self.location.origin)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));return response;})));
});
