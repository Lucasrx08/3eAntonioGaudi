// Données dynamiques indépendantes du cache GitHub Pages.
// Les fichiers sont publiés par GitHub Actions sur la branche live-data.
(function(){
  const BASE='https://raw.githubusercontent.com/Lucasrx08/3eAntonioGaudi/live-data';
  const REFRESH_MS=60*1000;
  let running=false;

  async function getJson(name){
    const response=await fetch(`${BASE}/${name}?t=${Date.now()}`,{
      cache:'no-store',
      headers:{'Accept':'application/json'}
    });
    if(!response.ok)throw new Error(`${name}: ${response.status}`);
    return response.json();
  }

  async function refreshLiveData(){
    if(running)return;
    running=true;
    try{
      const [calendar,timetable,resources]=await Promise.allSettled([
        getJson('calendar.json'),
        getJson('timetable.json'),
        getJson('resources.json')
      ]);
      if(calendar.status==='fulfilled'&&typeof validCalendar==='function'&&validCalendar(calendar.value)){
        localStorage.setItem(CALENDAR_CACHE_KEY,JSON.stringify(calendar.value));
        renderCalendar(calendar.value);
      }
      if(timetable.status==='fulfilled'&&typeof validCalendar==='function'&&validCalendar(timetable.value)){
        localStorage.setItem(TIMETABLE_CACHE_KEY,JSON.stringify(timetable.value));
        renderTimetable(timetable.value);
      }
      if(resources.status==='fulfilled'&&typeof validResources==='function'&&validResources(resources.value)){
        localStorage.setItem(RESOURCES_CACHE_KEY,JSON.stringify(resources.value));
        renderResources(resources.value);
      }
    }catch(error){
      console.debug('Mise à jour temps réel indisponible',error);
    }finally{
      running=false;
    }
  }

  // Supprime définitivement les anciens service workers et leurs caches.
  async function cleanupLegacyCache(){
    try{
      if('serviceWorker' in navigator){
        const registrations=await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg=>reg.unregister()));
      }
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.map(key=>caches.delete(key)));
      }
    }catch(_error){}
  }

  cleanupLegacyCache().finally(refreshLiveData);
  window.setInterval(refreshLiveData,REFRESH_MS);
  window.addEventListener('focus',refreshLiveData);
  window.addEventListener('online',refreshLiveData);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')refreshLiveData();
  });
})();
