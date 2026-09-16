const CACHE_PREFIX='ma3e-';
const CACHE_NAME='ma3e-shell-20260916';
const APP_SHELL=[
  './',
  './index.html',
  './styles.css',
  './overrides.css',
  './app.js',
  './overrides.js',
  './live-data.js',
  './manifest.webmanifest',
  './logo-bon-sauveur.webp',
  './favicon-32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './calendar.json',
  './timetable.json',
  './resources.json'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

async function cacheResponse(request,response){
  if(response?.ok){
    const cache=await caches.open(CACHE_NAME);
    await cache.put(request,response.clone());
  }
  return response;
}

async function networkFirst(request,fallback){
  try{
    return await cacheResponse(request,await fetch(request));
  }catch(_error){
    return (await caches.match(request,{ignoreSearch:true}))||(fallback&&await caches.match(fallback,{ignoreSearch:true}))||Response.error();
  }
}

async function staleWhileRevalidate(request){
  const cached=await caches.match(request,{ignoreSearch:true});
  const network=fetch(request)
    .then(response=>cacheResponse(request,response))
    .catch(()=>null);
  return cached||(await network)||Response.error();
}

self.addEventListener('fetch',event=>{
  const {request}=event;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(networkFirst(request,'./index.html'));
    return;
  }
  if(url.pathname.endsWith('.json')){
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});
