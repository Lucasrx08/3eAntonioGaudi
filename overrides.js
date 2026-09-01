// Ajustements éditoriaux et de fraîcheur sans modifier le moteur principal.
(function(){
  const OFFICIAL_DNB=[
    {date:'10 juin 2027',label:'Épreuve orale du DNB',note:'Date indiquée dans l’agenda de la classe.'},
    {date:'26 juin 2027',label:'Épreuves écrites du DNB',note:'Date indiquée dans l’agenda de la classe.'},
    {date:'29 juin 2027',label:'Épreuves écrites du DNB',note:'Date indiquée dans l’agenda de la classe.'},
    {date:'30 juin 2027',label:'Épreuves écrites du DNB',note:'Date indiquée dans l’agenda de la classe.'}
  ];

  function cleanOldInfographicReferences(){
    document.querySelectorAll('a').forEach(a=>{
      const text=(a.textContent||'').toLowerCase();
      const href=(a.getAttribute('href')||'').toLowerCase();
      if(text.includes('infographie')||text.includes('m. rigaux')||href.includes('lucasrigaux.my.canva.site'))a.remove();
    });
    document.querySelectorAll('.pathway-board *').forEach(el=>{
      if(el.children.length===0&&/infographie de la classe|support complet de m\. rigaux/i.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Le calendrier ci-dessous reprend l’infographie de la classe\.?/i,'Retrouvez ci-dessous les étapes importantes à connaître.').replace(/Support complet de M\. Rigaux/i,'');
      }
    });
  }

  function addDnbDates(){
    const board=document.querySelector('#pathway-guide-root');
    if(!board||!board.textContent.includes('DNB 2027')||board.querySelector('.official-dnb-dates'))return;
    const section=document.createElement('section');
    section.className='official-dnb-dates';
    section.innerHTML=`<div class="official-title"><div><span class="eyebrow">DATES À RETENIR</span><h3>DNB 2027</h3></div><button type="button" data-go="agenda" style="border:0;background:#0076ac;color:#fff;border-radius:999px;padding:11px 16px;font-weight:800;cursor:pointer">Voir dans l’agenda →</button></div><div class="official-dnb-grid">${OFFICIAL_DNB.map(d=>`<div class="official-dnb-day"><b>${d.date}</b><span>${d.label}</span></div>`).join('')}</div>`;
    board.prepend(section);
    section.querySelector('[data-go]')?.addEventListener('click',()=>document.querySelector('[data-view="agenda"]')?.click());
  }

  function refreshEnhancements(){cleanOldInfographicReferences();addDnbDates();}
  const observer=new MutationObserver(()=>refreshEnhancements());
  const board=document.querySelector('#pathway-guide-root');
  if(board)observer.observe(board,{childList:true,subtree:true});
  refreshEnhancements();

  // Demande une donnée fraîche à chaque retour sur l'onglet et à chaque reprise de l'app.
  let lastRefresh=0;
  function requestFreshCalendar(){
    const now=Date.now(); if(now-lastRefresh<15000)return; lastRefresh=now;
    if(typeof loadCalendar==='function')loadCalendar({manual:true});
  }
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')requestFreshCalendar();});
  window.addEventListener('focus',requestFreshCalendar);
  window.addEventListener('online',requestFreshCalendar);
})();
