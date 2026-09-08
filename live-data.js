// Données dynamiques indépendantes du cache GitHub Pages.
// GitHub Actions publie les trois fichiers JSON sur la branche live-data.
(function(){
  const BASE='https://raw.githubusercontent.com/Lucasrx08/3eAntonioGaudi/live-data';
  const AUTO_REFRESH_MS=60*1000;
  const targets={
    calendar:{file:'calendar.json',button:'#agenda-refresh',status:'#agenda-status',cacheKey:CALENDAR_CACHE_KEY,validate:()=>validCalendar,render:()=>renderCalendar,label:'agenda'},
    timetable:{file:'timetable.json',button:'#timetable-refresh',status:'#timetable-status',cacheKey:TIMETABLE_CACHE_KEY,validate:()=>validCalendar,render:()=>renderTimetable,label:'emploi du temps'},
    resources:{file:'resources.json',button:'#resources-refresh',status:'#resources-status',cacheKey:RESOURCES_CACHE_KEY,validate:()=>validResources,render:()=>renderResources,label:'ressources'}
  };
  let running=null;

  async function getJson(name){
    const response=await fetch(`${BASE}/${name}?t=${Date.now()}`,{
      cache:'no-store',
      headers:{Accept:'application/json'}
    });
    if(!response.ok)throw new Error(`${name}: ${response.status}`);
    return response.json();
  }

  function cachedValue(cacheKey){
    try{return JSON.parse(localStorage.getItem(cacheKey)||'null');}
    catch(_error){return null;}
  }

  function setBusy(target,busy){
    const button=document.querySelector(target.button);
    button?.classList.toggle('is-loading',busy);
    if(busy)button?.setAttribute('aria-busy','true');
    else button?.removeAttribute('aria-busy');
  }

  function manualMessage(target,previous,data){
    const status=document.querySelector(target.status);
    if(!status)return;
    const changed=JSON.stringify(previous)!==JSON.stringify(data);
    const date=data.updatedAt?statusFormatter.format(new Date(data.updatedAt)):null;
    if(target===targets.calendar){
      status.textContent=changed
        ?`Nouvelles dates chargées · synchronisation Apple du ${date}`
        :`Agenda vérifié · dernière synchronisation Apple : ${date}`;
    }else if(target===targets.timetable){
      status.textContent=changed
        ?`Nouveaux cours chargés · synchronisation ÉcoleDirecte du ${date}`
        :`Emploi du temps vérifié · dernière synchronisation : ${date}`;
    }else{
      status.textContent=changed
        ?`Nouvelles ressources chargées · ${date}`
        :`Ressources vérifiées · dernière publication : ${date}`;
    }
  }

  async function refreshLiveData({manual=false,only=null}={}){
    if(running)return running;
    const selected=only?[targets[only]]:Object.values(targets);
    selected.forEach(target=>{
      setBusy(target,true);
      if(manual){
        const status=document.querySelector(target.status);
        if(status)status.textContent=`Recherche de la dernière version de l’${target.label}…`;
      }
    });

    running=(async()=>{
      const results=await Promise.all(selected.map(async target=>{
        const previous=cachedValue(target.cacheKey);
        try{
          const data=await getJson(target.file);
          const validate=target.validate();
          if(typeof validate!=='function'||!validate(data))throw new Error(`Format ${target.file} incorrect`);
          localStorage.setItem(target.cacheKey,JSON.stringify(data));
          target.render()(data);
          if(manual)manualMessage(target,previous,data);
          return true;
        }catch(error){
          if(manual){
            const status=document.querySelector(target.status);
            if(status)status.textContent='Vérification impossible pour le moment · la dernière version reste affichée';
          }
          console.debug('Mise à jour temps réel indisponible',error);
          return false;
        }finally{
          setBusy(target,false);
        }
      }));
      return results.every(Boolean);
    })();

    try{return await running;}
    finally{running=null;}
  }

  Object.entries(targets).forEach(([key,target])=>{
    document.querySelector(target.button)?.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      refreshLiveData({manual:true,only:key});
    },{capture:true});
  });

  window.refreshClassData=refreshLiveData;
  refreshLiveData();
  window.setInterval(refreshLiveData,AUTO_REFRESH_MS);
  window.addEventListener('focus',()=>refreshLiveData());
  window.addEventListener('online',()=>refreshLiveData());
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')refreshLiveData();
  });
})();
