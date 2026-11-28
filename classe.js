'use strict';
const $=id=>document.getElementById(id);
const folders={classe:'Vie de classe',orientation:'Orientation',dnb:'DNB',certifications:'Certifications'};
const sections=['accueil','agenda','documents','enseignant'];
const backend='https://qafwwsxmhiesbfaydcih.supabase.co';
const apiKey='sb_publishable_BGl5FFyuBCLYFiS2zBjRLQ_ml4T86VN';
const source='https://raw.githubusercontent.com/Lucasrx08/3eAntonioGaudi/live-data/';
let resources=[],events=[],guides={},deposits=[],reminder=null,token='',email='',loadError='';
let familyKey=sessionStorage.getItem('ma3e_family')||'';
const invitation=new URLSearchParams(location.hash.slice(1)).get('classe');
if(invitation){familyKey=invitation;sessionStorage.setItem('ma3e_family',familyKey);history.replaceState(null,'','#accueil');}
localStorage.removeItem('ma3e_timetable_cache_v1');
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
function node(tag,label){const item=document.createElement(tag);if(label)item.textContent=label;return item;}
function link(label,url){const a=node('a',label);a.href=url;return a;}
function safe(url){try{return new URL(url).protocol==='https:';}catch{return false;}}
function day(value){return new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);}
function format(value,options){return new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',...options}).format(new Date(value));}
function upcoming(){const now=new Date();return events.filter(e=>e.allDay?(e.end?e.end>day(now):e.start>=day(now)):new Date(e.end||e.start)>=now).sort((a,b)=>new Date(a.start)-new Date(b.start));}
function dateRow(e){
 const row=node('div');row.className='row';
 const label=format(e.start,{day:'numeric',month:'short'});
 const end=e.allDay&&e.end?new Date(new Date(e.end)-86400000):null;
 const when=node('time',end&&day(end)>e.start?label+' – '+format(end,{day:'numeric',month:'short'}):label);
 when.dateTime=e.start;const copy=node('span',e.title);
 const extra=[e.allDay?'':format(e.start,{hour:'2-digit',minute:'2-digit'}),e.location].filter(Boolean).join(' · ');
 if(extra)copy.append(node('small',extra));row.append(when,copy);return row;
}
function renderDates(){
 const rows=upcoming();$('dates').replaceChildren(...rows.slice(0,3).map(dateRow));$('calendar').replaceChildren();
 if(!rows.length){$('dates').textContent=$('calendar').textContent='Aucune date à venir.';return;}
 let last='';for(const e of rows){const month=format(e.start,{month:'long',year:'numeric'});if(month!==last){$('calendar').append(node('h2',month));last=month;}$('calendar').append(dateRow(e));}
}
function renderReminder(){
 const r=reminder;const exam=r?.id==='issue-7';
 $('rappel').hidden=!r||(exam&&day(new Date())>'2026-12-04');if(!r)return;
 $('r-title').textContent=r.title;$('r-date').textContent=[r.detail,r.deadline].filter(Boolean).join(' ');
 const actions=$('r-links');actions.replaceChildren();
 if(exam){for(const [label,file] of [['Planning des épreuves','MA3E_Brevet_blanc.pdf'],['Fournitures à prévoir','MA3E_Fournitures_DNB_blanc.pdf']])actions.append(link(label,'documents/'+file));}
 else actions.append(link('Voir les documents',safe(r.url)?r.url:'#documents/'+categoryOf(r.category)));
}
function categoryOf(label){return Object.keys(folders).find(k=>folders[k]===label)||(label==='Stage'?'orientation':'classe');}
function route(){const [name,folder]=location.hash.slice(1).split('/');return [name==='ressources'?'documents':sections.includes(name)?name:'accueil',Object.hasOwn(folders,folder)?folder:'classe'];}
function renderFiles(){
 const folder=route()[1];$('folder-title').textContent=folders[folder];$('folders').replaceChildren();
 for(const [key,label] of Object.entries(folders)){const a=link(label,'#documents/'+key);if(key===folder)a.setAttribute('aria-current','true');$('folders').append(a);}
 const rows=[...deposits,...resources.filter(d=>safe(d.url)).map(d=>({...d,category:categoryOf(d.category)}))].filter(d=>d.category===folder);
 $('files').replaceChildren();
 for(const d of rows){const a=link('',d.url||'#documents/'+folder);a.className='row';a.append(node('span',d.title),node('small',d.type||'PDF'));if(!d.url)a.addEventListener('click',e=>{e.preventDefault();download(d);});$('files').append(a);}
 if(!rows.length)$('files').textContent='Aucun document déposé dans cette rubrique.';
 $('load-state').textContent=loadError;$('guide').replaceChildren();
 const list=folder==='orientation'?['Orientation','Stage']:[folders[folder]];
 for(const key of list){const g=guides[key];if(!g)continue;const box=node('details');box.append(node('summary',g.title),node('p',g.intro));for(const item of g.items){box.append(node('h3',item.title),node('p',item.text));}for(const item of g.links){if(safe(item.url)){const p=node('p');p.append(link(item.label,item.url));box.append(p);}}$('guide').append(box);}
}
function render(){const [view]=route();for(const id of sections)$(id).hidden=id!==view;for(const a of document.querySelectorAll('nav a')){if(a.hash==='#'+view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}renderDates();renderReminder();renderFiles();}
window.addEventListener('hashchange',()=>{render();scrollTo(0,0);});
async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error();return r.json();}
async function sync(){
 for(const prefix of ['./',source]){const [c,r]=await Promise.allSettled([json(prefix+'calendar.json'),json(prefix+'resources.json')]);if(c.status==='fulfilled')events=c.value.events;if(r.status==='fulfilled'){resources=r.value.resources;reminder=r.value.reminder;}render();}
}
async function api(path,data){
 const headers={apikey:apiKey,'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;
 const res=await fetch(backend+path,{method:'POST',headers,body:JSON.stringify(data)});
 if(!res.ok)throw Error(String(res.status));return res.json();
}
const rpc=(name,args)=>api('/rest/v1/rpc/ma3e_'+name,args);
async function refreshDocs(){
 if(!familyKey&&!token){deposits=[];renderFiles();return;}
 try{deposits=await rpc('list',{k:familyKey});loadError='';}catch{loadError='Impossible de charger les dépôts. Rouvre le lien de classe ou réessaie dans un instant.';}renderFiles();
}
async function download(d){
 try{const raw=await rpc('read',{doc:d.id,k:familyKey});if(!raw)throw Error();
 const blob=new Blob([Uint8Array.from(atob(raw),c=>c.charCodeAt(0))],{type:'application/pdf'});
 const url=URL.createObjectURL(blob);const a=link('',url);a.download=d.title+'.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch{$('load-state').textContent='Téléchargement interrompu. Réessaie depuis le lien de classe.';}
}
function bind(form,handler){$(form).addEventListener('submit',async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;$('feedback').textContent='';try{await handler(new FormData(e.target));}catch{$('feedback').textContent=form==='upload'?'Publication interrompue. Vérifie ta connexion et reconnecte-toi si nécessaire.':'Connexion impossible. Vérifie ton adresse et ton code.';}finally{button.disabled=false;}});}
bind('identity',async data=>{email=data.get('email').trim();await api('/auth/v1/otp',{email,create_user:false});$('verify').hidden=false;$('feedback').textContent='Consulte ta messagerie pour obtenir ton code.';});
bind('verify',async data=>{const session=await api('/auth/v1/verify',{email,token:data.get('code').trim(),type:'email'});token=session.access_token;try{if(!await rpc('teacher',{}))throw Error();}catch{token='';throw Error();} $('identity').hidden=$('verify').hidden=true;$('upload').hidden=false;await refreshDocs();});
for(const [value,label] of Object.entries(folders))$('upload').elements.category.add(new Option(label,value));
$('upload').elements.pdf.onchange=e=>{const file=e.target.files[0];if(file)$('upload').elements.title.value=file.name.replace(/\.pdf$/i,'').replace(/[_-]/g,' ').slice(0,100);};
bind('upload',async data=>{const file=data.get('pdf');if(!file.size||file.size>5242880){$('feedback').textContent='Choisis un PDF de 5 Mo maximum.';return;}
 const title=data.get('title').trim(),category=data.get('category');if(deposits.some(d=>d.title===title&&d.category===category)&&!confirm('Remplacer le document qui porte déjà ce titre ?'))return;
 const content=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
 await rpc('publish',{doc_title:title,doc_category:category,content});$('feedback').textContent='Document publié dans « '+folders[category]+' ».';$('upload').reset();await refreshDocs();});
$('logout').onclick=()=>{token='';$('upload').hidden=$('verify').hidden=true;$('identity').hidden=false;$('verify').reset();$('feedback').textContent='Déconnexion effectuée.';refreshDocs();};
render();sync();refreshDocs();json('./guides.json').then(data=>{guides=data;renderFiles();}).catch(()=>{});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshDocs();sync();}});
setInterval(()=>{if(!document.hidden){sync();refreshDocs();}},300000);
