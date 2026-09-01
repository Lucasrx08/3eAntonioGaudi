const CACHE='ma3e-v6-enseignant';
const FILES=['./','./index.html','./styles.css','./app.js','./calendar.json','./timetable.json','./resources.json','./manifest.webmanifest','./logo-bon-sauveur.png'];
const CALENDAR_REQUEST=new Request(new URL('./calendar.json',self.location).href);
const TIMETABLE_REQUEST=new Request(new URL('./timetable.json',self.location).href);
const RESOURCES_REQUEST=new Request(new URL('./resources.json',self.location).href);

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);

  if(url.pathname.endsWith('/calendar.json')||url.pathname.endsWith('/timetable.json')||url.pathname.endsWith('/resources.json')){
    const storedRequest=url.pathname.endsWith('/timetable.json')
      ?TIMETABLE_REQUEST
      :url.pathname.endsWith('/resources.json')?RESOURCES_REQUEST:CALENDAR_REQUEST;
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          if(response.ok)caches.open(CACHE).then(cache=>cache.put(storedRequest,response.clone()));
          return response;
        })
        .catch(()=>caches.match(storedRequest))
    );
    return;
  }

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          if(response.ok)caches.open(CACHE).then(cache=>cache.put('./index.html',response.clone()));
          return response;
        })
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      const update=fetch(event.request).then(response=>{
        if(response.ok&&url.origin===self.location.origin)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));
        return response;
      }).catch(()=>cached||Response.error());
      return cached||update;
    })
  );
});
