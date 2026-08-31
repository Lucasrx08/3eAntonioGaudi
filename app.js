const CALENDAR_FILE='./calendar.json';
const CALENDAR_CACHE_KEY='ma3e_calendar_cache_v1';
const DISPLAY_TIME_ZONE='Europe/Paris';
const CALENDAR_REFRESH_MS=5*60*1000;

const views=[...document.querySelectorAll('.view')];
function showView(id){
  views.forEach(view=>view.classList.toggle('active-view',view.id===id));
  document.querySelectorAll('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===id));
  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
document.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.go)));

const dialog=document.querySelector('#resource-dialog');
const dialogTitle=document.querySelector('#dialog-title');
document.querySelectorAll('[data-resource]').forEach(button=>button.addEventListener('click',()=>{
  dialogTitle.textContent=button.dataset.resource;
  dialog.showModal();
}));
document.querySelector('.dialog-close')?.addEventListener('click',()=>dialog.close());
document.querySelector('.dialog-secondary')?.addEventListener('click',()=>dialog.close());
document.querySelector('.dialog-primary')?.addEventListener('click',()=>dialog.close());

const categoryStyles={
  classe:{label:'VIE DE CLASSE',color:'green',tag:'green-tag'},
  etablissement:{label:'ÉTABLISSEMENT',color:'green',tag:'green-tag'},
  document:{label:'DOCUMENT',color:'orange',tag:'orange-tag'},
  orientation:{label:'ORIENTATION',color:'blue',tag:'blue-tag'},
  dnb:{label:'OBJECTIF DNB',color:'orange',tag:'orange-tag'},
  stage:{label:'STAGE',color:'blue',tag:'blue-tag'},
  certification:{label:'CERTIFICATION',color:'blue',tag:'blue-tag'},
  vacances:{label:'CALENDRIER',color:'green',tag:'green-tag'},
  sport:{label:'SPORT',color:'green',tag:'green-tag'},
  autre:{label:'AGENDA',color:'green',tag:'green-tag'}
};

const monthShortFormatter=new Intl.DateTimeFormat('fr-FR',{month:'short',timeZone:DISPLAY_TIME_ZONE});
const monthLongFormatter=new Intl.DateTimeFormat('fr-FR',{month:'long',timeZone:DISPLAY_TIME_ZONE});
const weekdayFormatter=new Intl.DateTimeFormat('fr-FR',{weekday:'long',timeZone:DISPLAY_TIME_ZONE});
const hourFormatter=new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:DISPLAY_TIME_ZONE});
const statusFormatter=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:DISPLAY_TIME_ZONE});

function titleCase(value){
  return String(value||'').replace(/^./,letter=>letter.toLocaleUpperCase('fr-FR'));
}

function createElement(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
}

function localDateFromKey(value){
  const [year,month,day]=String(value).slice(0,10).split('-').map(Number);
  return new Date(year,month-1,day,12,0,0);
}

function eventDate(event,field='start'){
  const value=event[field];
  if(event.allDay&&/^\d{4}-\d{2}-\d{2}$/.test(value||''))return localDateFromKey(value);
  const date=new Date(value);
  return Number.isNaN(date.getTime())?new Date(0):date;
}

function dateKey(date){
  const parts=new Intl.DateTimeFormat('en-CA',{
    year:'numeric',month:'2-digit',day:'2-digit',timeZone:DISPLAY_TIME_ZONE
  }).formatToParts(date);
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function startOfKey(key){
  const [year,month,day]=key.split('-').map(Number);
  return Date.UTC(year,month-1,day);
}

function daysUntil(event){
  const today=dateKey(new Date());
  const eventKey=event.allDay?event.start.slice(0,10):dateKey(eventDate(event));
  return Math.round((startOfKey(eventKey)-startOfKey(today))/86400000);
}

function dayAndMonth(date){
  return {
    day:new Intl.DateTimeFormat('fr-FR',{day:'2-digit',timeZone:DISPLAY_TIME_ZONE}).format(date),
    month:monthShortFormatter.format(date).replace('.','').toLocaleUpperCase('fr-FR')+'.'
  };
}

function categoryFor(event){
  return categoryStyles[event.category]||categoryStyles.autre;
}

function eventIsUpcoming(event,now=new Date()){
  if(event.allDay)return event.end.slice(0,10)>dateKey(now);
  return eventDate(event,'end').getTime()>=now.getTime();
}

function eventDurationDays(event){
  if(!event.allDay)return 0;
  return Math.max(1,Math.round((eventDate(event,'end')-eventDate(event,'start'))/86400000));
}

function previousDay(date){
  return new Date(date.getFullYear(),date.getMonth(),date.getDate()-1,12);
}

function formatEventWhen(event){
  const start=eventDate(event,'start');
  const end=eventDate(event,'end');
  if(event.allDay){
    const duration=eventDurationDays(event);
    if(duration>1){
      const finish=previousDay(end);
      const from=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',timeZone:DISPLAY_TIME_ZONE}).format(start);
      const to=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',timeZone:DISPLAY_TIME_ZONE}).format(finish);
      return `Du ${from} au ${to}`;
    }
    return `${titleCase(weekdayFormatter.format(start))} · Toute la journée`;
  }
  const weekday=titleCase(weekdayFormatter.format(start));
  const sameDay=dateKey(start)===dateKey(end);
  return sameDay?`${weekday} · ${hourFormatter.format(start)} – ${hourFormatter.format(end)}`:`${weekday} · ${hourFormatter.format(start)}`;
}

function eventDetail(event){
  if(event.location)return event.location.replace(/\s*\n\s*/g,' · ');
  if(event.description)return event.description.replace(/\s*\n\s*/g,' · ');
  return formatEventWhen(event);
}

function renderToday(){
  const label=document.querySelector('#today-label');
  if(!label)return;
  label.textContent=new Intl.DateTimeFormat('fr-FR',{
    weekday:'long',day:'numeric',month:'long',timeZone:DISPLAY_TIME_ZONE
  }).format(new Date()).toLocaleUpperCase('fr-FR');
}

function renderHero(event){
  const heroDate=document.querySelector('#hero-date');
  const title=document.querySelector('#hero-title');
  const category=document.querySelector('#hero-category');
  const meta=document.querySelector('#hero-meta');
  const countdownPrefix=document.querySelector('#countdown-prefix');
  const countdownValue=document.querySelector('#countdown-value');
  const countdownUnit=document.querySelector('#countdown-unit');
  if(!event){
    heroDate.replaceChildren(document.createTextNode('—'),createElement('small','', 'AGENDA'));
    category.textContent='CALENDRIER APPLE';
    title.textContent='Aucune date à venir';
    meta.textContent='Le prochain événement apparaîtra automatiquement ici.';
    countdownPrefix.textContent='À';
    countdownValue.textContent='—';
    countdownUnit.textContent='VENIR';
    return;
  }
  const parts=dayAndMonth(eventDate(event));
  heroDate.replaceChildren(document.createTextNode(parts.day),createElement('small','',parts.month));
  category.textContent=categoryFor(event).label;
  title.textContent=event.title;
  meta.textContent=eventDetail(event);
  const difference=daysUntil(event);
  countdownPrefix.textContent=difference<=0?'AUJ.':'DANS';
  countdownValue.textContent=String(Math.max(0,difference));
  countdownUnit.textContent=difference===1?'JOUR':'JOURS';
}

function renderTimeline(events){
  const container=document.querySelector('#timeline-strip');
  container.replaceChildren();
  const upcoming=events.filter(event=>eventIsUpcoming(event)).slice(0,3);
  if(!upcoming.length){
    const empty=createElement('article','calendar-loading');
    empty.append(createElement('div','empty-calendar-mark','✓'));
    const copy=createElement('div');
    copy.append(createElement('strong','', 'Aucun rendez-vous prochainement'),createElement('small','', 'L’agenda se mettra à jour automatiquement.'));
    empty.append(copy);
    container.append(empty);
    return;
  }
  upcoming.forEach(event=>{
    const style=categoryFor(event);
    const parts=dayAndMonth(eventDate(event));
    const article=createElement('article','calendar-event-card');
    article.tabIndex=0;
    article.setAttribute('role','button');
    article.setAttribute('aria-label',`Voir ${event.title} dans l’agenda`);
    const time=createElement('time');
    time.append(createElement('b','',parts.day),createElement('span','',parts.month));
    const dot=createElement('div',`event-dot ${style.color}`);
    const copy=createElement('div','event-copy');
    copy.append(createElement('span','',style.label),createElement('strong','',event.title),createElement('small','',formatEventWhen(event)));
    article.append(time,dot,copy,createElement('b','arrow','→'));
    const open=()=>showView('agenda');
    article.addEventListener('click',open);
    article.addEventListener('keydown',keyEvent=>{if(keyEvent.key==='Enter'||keyEvent.key===' '){keyEvent.preventDefault();open();}});
    container.append(article);
  });
}

function monthKeyFor(event){
  const date=eventDate(event);
  const year=new Intl.DateTimeFormat('fr-FR',{year:'numeric',timeZone:DISPLAY_TIME_ZONE}).format(date);
  const month=new Intl.DateTimeFormat('fr-FR',{month:'2-digit',timeZone:DISPLAY_TIME_ZONE}).format(date);
  return `${year}-${month}`;
}

function agendaTag(event){
  if(event.allDay){
    const duration=eventDurationDays(event);
    return duration>1?`${duration} JOURS`:'JOURNÉE';
  }
  return hourFormatter.format(eventDate(event));
}

function renderAgenda(events){
  const root=document.querySelector('#agenda-root');
  root.replaceChildren();
  const visible=events.filter(event=>eventDate(event,'end').getTime()>=Date.now()-30*86400000);
  if(!visible.length){
    const empty=createElement('div','calendar-empty');
    empty.append(createElement('strong','', 'Agenda prêt à être synchronisé'),createElement('p','', 'Les événements du calendrier Apple apparaîtront ici après la première mise à jour GitHub.'));
    root.append(empty);
    return;
  }
  const groups=new Map();
  visible.forEach(event=>{
    const key=monthKeyFor(event);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(event);
  });
  groups.forEach(group=>{
    const monthDate=eventDate(group[0]);
    const section=createElement('section','agenda-month-section');
    const banner=createElement('div','month-banner');
    banner.append(
      createElement('span','',monthLongFormatter.format(monthDate).toLocaleUpperCase('fr-FR')),
      createElement('b','',new Intl.DateTimeFormat('fr-FR',{year:'numeric',timeZone:DISPLAY_TIME_ZONE}).format(monthDate)),
      createElement('i')
    );
    const list=createElement('div','agenda-list');
    group.forEach(event=>{
      const style=categoryFor(event);
      const parts=dayAndMonth(eventDate(event));
      const article=createElement('article');
      const time=createElement('time');
      time.append(createElement('b','',parts.day),createElement('span','',parts.month));
      const copy=createElement('div');
      copy.append(createElement('small','',style.label),createElement('strong','',event.title),createElement('p','',eventDetail(event)));
      article.append(time,copy,createElement('span',`tag ${style.tag}`,agendaTag(event)));
      list.append(article);
    });
    section.append(banner,list);
    root.append(section);
  });
}

function validCalendar(data){
  return data&&Array.isArray(data.events)&&data.events.every(event=>event&&event.title&&event.start&&event.end);
}

function sortEvents(events){
  return [...events].sort((first,second)=>eventDate(first)-eventDate(second)||first.title.localeCompare(second.title,'fr'));
}

function renderCalendar(data,{offline=false}={}){
  const events=sortEvents(data.events||[]);
  renderHero(events.find(event=>eventIsUpcoming(event))||null);
  renderTimeline(events);
  renderAgenda(events);
  const status=document.querySelector('#agenda-status');
  if(offline){
    status.textContent='Version enregistrée hors connexion';
    status.closest('.agenda-sync-bar')?.classList.add('is-offline');
  }else if(data.updatedAt){
    status.textContent=`Mis à jour le ${statusFormatter.format(new Date(data.updatedAt))}`;
    status.closest('.agenda-sync-bar')?.classList.remove('is-offline');
  }else{
    status.textContent='En attente de la première synchronisation';
  }
}

function readCachedCalendar(){
  try{
    const cached=JSON.parse(localStorage.getItem(CALENDAR_CACHE_KEY)||'null');
    return validCalendar(cached)?cached:null;
  }catch(_error){
    return null;
  }
}

let calendarLoading=false;
async function loadCalendar({manual=false}={}){
  if(calendarLoading)return;
  calendarLoading=true;
  const refreshButton=document.querySelector('#agenda-refresh');
  const status=document.querySelector('#agenda-status');
  refreshButton?.classList.add('is-loading');
  if(manual&&status)status.textContent='Actualisation…';
  try{
    const response=await fetch(`${CALENDAR_FILE}?v=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`Calendrier indisponible (${response.status})`);
    const data=await response.json();
    if(!validCalendar(data))throw new Error('Format de calendrier incorrect');
    localStorage.setItem(CALENDAR_CACHE_KEY,JSON.stringify(data));
    renderCalendar(data);
  }catch(error){
    const cached=readCachedCalendar();
    if(cached)renderCalendar(cached,{offline:true});
    else renderCalendar({events:[]},{offline:true});
    console.warn(error);
  }finally{
    calendarLoading=false;
    refreshButton?.classList.remove('is-loading');
  }
}

document.querySelector('#agenda-refresh')?.addEventListener('click',()=>loadCalendar({manual:true}));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadCalendar();});
window.setInterval(()=>loadCalendar(),CALENDAR_REFRESH_MS);

renderToday();
loadCalendar();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
