// Ajustements éditoriaux et démarrage rapide sans modifier le moteur principal.
(function(){
  const OFFICIAL_DNB=[
    {date:'10 juin 2027',label:'Épreuve orale du DNB'},
    {date:'26 juin 2027',label:'Épreuves écrites du DNB'},
    {date:'29 juin 2027',label:'Épreuves écrites du DNB'},
    {date:'30 juin 2027',label:'Épreuves écrites du DNB'}
  ];

  // Le formulaire de rappel peut contenir plusieurs lignes à afficher sur la carte orange.
  if(typeof renderReminder==='function'){
    const baseRenderReminder=renderReminder;
    renderReminder=function(reminder){
      const card=document.querySelector('#reminder-card');
      card?.querySelector('.focus-reminder-list')?.remove();
      baseRenderReminder(reminder);
      if(!card||!reminder||!Array.isArray(reminder.items)||!reminder.items.length)return;
      const list=document.createElement('ul');
      list.className='focus-reminder-list';
      reminder.items.forEach(text=>{
        const item=document.createElement('li');
        item.textContent=text;
        list.append(item);
      });
      const detail=document.querySelector('#reminder-detail');
      if(detail)detail.insertAdjacentElement('afterend',list);
    };
  }

  try{
    const calendar=typeof readCachedCalendar==='function'?readCachedCalendar():null;if(calendar&&typeof renderCalendar==='function')renderCalendar(calendar);
    const timetable=typeof readCachedTimetable==='function'?readCachedTimetable():null;if(timetable&&typeof renderTimetable==='function')renderTimetable(timetable);
    const resources=typeof readCachedResources==='function'?readCachedResources():null;if(resources&&typeof renderResources==='function')renderResources(resources);
  }catch(error){console.debug('Cache local indisponible',error);}

  function cleanOldInfographicReferences(){
    document.querySelectorAll('a').forEach(a=>{const text=(a.textContent||'').toLowerCase();const href=(a.getAttribute('href')||'').toLowerCase();if(text.includes('infographie')||text.includes('m. rigaux')||href.includes('lucasrigaux.my.canva.site'))a.remove();});
    document.querySelectorAll('.pathway-board *').forEach(el=>{if(el.children.length===0&&/infographie de la classe|support complet de m\. rigaux/i.test(el.textContent||'')){el.textContent=(el.textContent||'').replace(/Le calendrier ci-dessous reprend l’infographie de la classe\.?/i,'Retrouvez ci-dessous les étapes importantes à connaître.').replace(/Support complet de M\. Rigaux/i,'');}});
  }
  function removeDecorativeDnb60(){
    const board=document.querySelector('#pathway-guide-root');if(!board||!board.textContent.includes('Objectif DNB 2027'))return;
    [...board.querySelectorAll('*')].forEach(el=>{
      if(el.children.length===0&&(el.textContent||'').trim()==='60%'){
        const parent=el.parentElement;
        if(parent&&!/épreuves finales/i.test(parent.textContent||'')&&parent.children.length<=2)parent.remove();
      }
    });
  }
  function addDnbDates(){
    const board=document.querySelector('#pathway-guide-root');if(!board||!board.textContent.includes('DNB 2027')||board.querySelector('.official-dnb-dates'))return;
    const section=document.createElement('section');section.className='official-dnb-dates';section.innerHTML=`<div class="official-title"><div><span class="eyebrow">DATES À RETENIR</span><h3>DNB 2027</h3></div><button type="button" data-go="agenda">Voir dans l’agenda →</button></div><div class="official-dnb-grid">${OFFICIAL_DNB.map(d=>`<div class="official-dnb-day"><b>${d.date}</b><span>${d.label}</span></div>`).join('')}</div>`;board.prepend(section);section.querySelector('[data-go]')?.addEventListener('click',()=>document.querySelector('[data-view="agenda"]')?.click());
  }
  function refreshEnhancements(){cleanOldInfographicReferences();removeDecorativeDnb60();addDnbDates();}
  const board=document.querySelector('#pathway-guide-root');if(board){let pending=false;const observer=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refreshEnhancements();});});observer.observe(board,{childList:true,subtree:true});}
  refreshEnhancements();
})();
