'use strict';
const $=id=>document.getElementById(id);
const folders={classe:'Vie de classe',orientation:'Orientation',dnb:'DNB',certifications:'Certifications'};
const sections=['accueil','agenda','documents','enseignant'];
const backend='https://qafwwsxmhiesbfaydcih.supabase.co';
const apiKey='sb_publishable_BGl5FFyuBCLYFiS2zBjRLQ_ml4T86VN';
const source='https://raw.githubusercontent.com/Lucasrx08/3eAntonioGaudi/live-data/';
let editorial=[],orientationFeed=[];
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
function allEvents(){
 const authored=editorial.filter(x=>x.kind==='event').map(x=>({...x,start:x.starts,end:new Date(Date.parse(x.ends)+86400000).toISOString().slice(0,10),allDay:true,important:x.priority}));
 return [...events,...orientationFeed,...authored];
}
function upcoming(){const now=new Date();return allEvents().filter(e=>e.allDay?(e.end?e.end>day(now):e.start>=day(now)):new Date(e.end||e.start)>=now).sort((a,b)=>new Date(a.start)-new Date(b.start));}
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
 const rows=upcoming();
 const priority=rows.find(e=>e.important)||rows.find(e=>['dnb','orientation','stage'].includes(e.category));
 const panel=$('priority');panel.hidden=!priority;panel.replaceChildren();
 if(priority){
   const days=Math.round((Date.parse(day(new Date(priority.start)))-Date.parse(day(new Date())))/86400000);
   panel.append(node('small','Prochaine échéance'),node('strong',format(priority.start,{day:'2-digit',month:'short'})),node('h2',priority.title),node('p',days>0?'Dans '+days+' jour'+(days>1?'s':''):'En cours'));
   panel.append(link('Documents associés →','#documents/'+(priority.category==='dnb'?'dnb':priority.category==='orientation'||priority.category==='stage'?'orientation':'classe')));
 }
 const monthly=$('period').value==='month';$('month-wrap').hidden=!monthly;
 const month=$('month').value||day(new Date()).slice(0,7);
 const filtered=monthly?allEvents().filter(e=>{
   const start=day(new Date(e.start));
   const end=e.end?day(new Date(Date.parse(e.end)-(e.allDay?86400000:0))):start;
   return start.slice(0,7)<=month && end.slice(0,7)>=month;
 }).sort((a,b)=>new Date(a.start)-new Date(b.start)):rows;
 $('calendar').replaceChildren();
 for(const category of ['classe','orientation']){
   if($('stream').value!=='all'&&$('stream').value!==category)continue;
   const box=node('article');box.className='calendar-panel '+category;
   box.append(node('h2',category==='classe'?'Vie de classe':'Orientation'));
   const list=filtered.filter(e=>(e.category==='orientation')===(category==='orientation'));
   if(!list.length)box.append(node('p','Aucun événement sur cette période.'));
   for(const e of list){const detail=node('details');const summary=node('summary');summary.append(dateRow(e));detail.append(summary,node('p',format(e.start,{weekday:'long',day:'numeric',month:'long',year:'numeric'})),link('Voir les documents','#documents/'+(e.category==='dnb'?'dnb':category)));box.append(detail);}
   $('calendar').append(box);
 }
}
function renderReminder(){
 const now=day(new Date());
 const custom=editorial.filter(e=>e.kind==='notice'&&e.starts<=now&&e.ends>=now).sort((a,b)=>Number(b.priority)-Number(a.priority)||b.starts.localeCompare(a.starts))[0];
 const r=custom?{...custom,deadline:format(custom.ends,{day:'numeric',month:'long'}),category:folders[custom.category]}:reminder;const exam=r?.id==='issue-7';
 $('rappel').hidden=!r||(exam&&day(new Date())>'2026-12-04');if(!r)return;
 $('r-title').textContent=r.title;$('r-date').textContent=[r.detail,r.deadline].filter(Boolean).join(' ');
 const actions=$('r-links');actions.replaceChildren();
 if(exam){for(const [label,file] of [['Planning des épreuves','MA3E_Brevet_blanc.pdf'],['Fournitures à prévoir','MA3E_Fournitures_DNB_blanc.pdf']])actions.append(link(label,'documents/'+file));}
 else {const d=deposits.find(d=>d.id===r.document);const a=link(d?.title||'Voir les documents',safe(r.url)?r.url:'#documents/'+categoryOf(r.category));if(d)a.onclick=e=>{e.preventDefault();download(d);};actions.append(a);}
}
function categoryOf(label){return Object.keys(folders).find(k=>folders[k]===label)||(label==='Stage'?'orientation':'classe');}
function route(){const [name,folder]=location.hash.slice(1).split('/');return [name==='ressources'?'documents':sections.includes(name)?name:'accueil',Object.hasOwn(folders,folder)?folder:'classe'];}
function renderFiles(){
 const folder=route()[1];$('folder-title').textContent=folders[folder];$('folders').replaceChildren();
 for(const [key,label] of Object.entries(folders)){const a=link(label,'#documents/'+key);if(key===folder)a.setAttribute('aria-current','true');$('folders').append(a);}
 const all=[...deposits,...resources.filter(d=>safe(d.url)).map(d=>({...d,category:categoryOf(d.category)}))].sort((a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt)));
 const query=$('search').value.trim().toLocaleLowerCase('fr');
 const rows=all.filter(d=>d.category===folder&&d.title.toLocaleLowerCase('fr').includes(query));
 if($('sort').value==='alpha')rows.sort((a,b)=>a.title.localeCompare(b.title,'fr'));
 $('folder-title').textContent=folders[folder]+' · '+rows.length;
 function docCard(d){
   const box=node('article');box.className='doc-card';
   box.append(node('small',folders[d.category]+(d.publishedAt?' · '+format(d.publishedAt,{day:'numeric',month:'short',year:'numeric'}):'')),node('h3',d.title));
   if(d.url){const a=link('Consulter ↗',d.url);box.append(a);if(d.url.startsWith(location.origin+location.pathname.replace(/[^/]*$/,''))){const save=link('Télécharger',d.url);save.download='';box.append(save);}}
   else{const save=node('button','Télécharger');save.onclick=()=>download(d);box.append(save);}
   return box;
 }
 $('latest').replaceChildren(...all.slice(0,3).map(docCard));
 $('files').replaceChildren(...rows.map(docCard));
 if(!rows.length)$('files').textContent=query?'Aucun résultat.':'Aucun document dans cette rubrique.';
 $('load-state').textContent=loadError;$('guide').replaceChildren();
 const list=folder==='orientation'?['Orientation','Stage']:[folders[folder]];
 for(const key of list){const g=guides[key];if(!g)continue;const box=node('details');box.append(node('summary',g.title),node('p',g.intro));for(const item of g.items){box.append(node('h3',item.title),node('p',item.text));}for(const item of g.links){if(safe(item.url)){const p=node('p');p.append(link(item.label,item.url));box.append(p);}}$('guide').append(box);}
}
function render(){const [view]=route();for(const id of sections)$(id).hidden=id!==view;for(const a of document.querySelectorAll('nav a')){if(a.hash==='#'+view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}renderDates();renderReminder();renderFiles();}
window.addEventListener('hashchange',()=>{render();scrollTo(0,0);});
async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error();return r.json();}
async function sync(){
 const optional=json(source+'orientation.json').then(data=>{orientationFeed=data.events.map(e=>({...e,category:'orientation'}));renderDates();}).catch(()=>{});
 for(const prefix of ['./',source]){const [c,r]=await Promise.allSettled([json(prefix+'calendar.json'),json(prefix+'resources.json')]);if(c.status==='fulfilled')events=c.value.events;if(r.status==='fulfilled'){resources=r.value.resources;reminder=r.value.reminder;}render();}
}
async function api(path,data){
 const headers={apikey:apiKey,'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;
 const res=await fetch(backend+path,{method:'POST',headers,body:JSON.stringify(data)});
 if(!res.ok)throw Error(String(res.status));return res.json();
}
const rpc=(name,args)=>api('/rest/v1/rpc/ma3e_'+name,args);
async function refreshEditorial(){
 try{editorial=await rpc('editorial',{});render();}catch{}
}
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
let factor='',inventory=[];
bind('verify',async data=>{
 const session=await api('/auth/v1/verify',{email,token:data.get('code').trim(),type:'email'});
 token=session.access_token;
 if(!await rpc('member',{})){token='';throw Error();}
 const existing=session.user?.factors?.find(f=>f.factor_type==='totp'&&f.status==='verified');
 if(existing){factor=existing.id;$('setup').textContent='';}
 else{const f=await api('/auth/v1/factors',{factor_type:'totp',friendly_name:'MA 3E '+Date.now()});
 factor=f.id;$('setup').textContent='Ajoute cette clé à ton application d’authentification : '+f.totp.secret;}
 $('verify').hidden=$('identity').hidden=true;$('mfa').hidden=false;
});
bind('mfa',async data=>{
 const challenge=await api('/auth/v1/factors/'+factor+'/challenge',{});
 const verified=await api('/auth/v1/factors/'+factor+'/verify',{challenge_id:challenge.id,code:data.get('otp').trim()});
 token=verified.access_token;if(!await rpc('teacher',{}))throw Error();
 $('setup').textContent='';$('mfa').reset();$('mfa').hidden=true;$('upload').hidden=false;
 await loadInventory();await refreshDocs();await refreshEditorial();$('editor').hidden=false;fillEditor();
});
async function loadInventory(){
 inventory=await rpc('inventory',{});const f=$('upload').elements;
 f.existing.replaceChildren(new Option('Nouveau document',''));
 for(const d of inventory){const state=d.state==='archived'?'Archivé':d.state==='draft'?'Brouillon':new Date(d.publication)>new Date()?'Programmé':'Publié';f.existing.add(new Option(state+' · '+d.title,d.id));}
 $('upload').reset();selectDocument();fillEditor();
}
const editor=$('editor').elements;
for(const [key,label] of Object.entries(folders))editor.category.add(new Option(label,key));
function fillEditor(){
 editor.item.replaceChildren(new Option('Nouvel élément',''),...editorial.map(d=>new Option(d.title,d.id)));
 editor.document.replaceChildren(new Option('Aucun',''),...inventory.map(d=>new Option(d.title,d.id)));
 selectItem();
}
function selectItem(){
 const item=editorial.find(d=>d.id===editor.item.value);
 for(const key of ['title','detail','kind','starts','ends','category','document'])editor[key].value=item?.[key]||({kind:'event',category:'orientation',starts:day(new Date()),ends:day(new Date())}[key]||'');
 editor.priority.checked=Boolean(item?.priority);$('delete-item').hidden=!item;
}
editor.item.onchange=selectItem;
async function saveItem(remove){
 const args={item:editor.item.value||null,remove_item:remove,priority:editor.priority.checked};
 for(const key of ['title','detail','kind','starts','ends','category','document'])args[key]=editor[key].value|| (key==='document'?null:'');
 await rpc('save_item',args);await refreshEditorial();fillEditor();$('feedback').textContent=remove?'Élément supprimé.':'Élément enregistré.';
}
bind('editor',()=>saveItem(false));
$('delete-item').onclick=()=>{if(confirm('Supprimer cet élément ?'))saveItem(true).catch(()=>{$('feedback').textContent='Suppression interrompue.';});};
function selectDocument(){
 const f=$('upload').elements;const d=inventory.find(item=>item.id===f.existing.value);
 f.title.value=d?.title||'';f.category.value=d?.category||'classe';f.description.value=d?.description||'';f.state.value=d?.state||'draft';
 f.pdf.value='';f.pdf.required=!d;$('remove').hidden=!d;
 const when=new Date(d?.publication||Date.now());f.publication.value=new Date(when-when.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
$('upload').elements.existing.onchange=selectDocument;
$('preview').onclick=()=>{const f=$('upload').elements;if(f.pdf.files[0]){const url=URL.createObjectURL(f.pdf.files[0]);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);}else if(f.existing.value)download({id:f.existing.value,title:f.title.value});};
$('remove').onclick=async()=>{const f=$('upload').elements;if(!f.existing.value||!confirm('Supprimer définitivement ce PDF ?'))return;
 try{await rpc('edit',{doc:f.existing.value,t:'',c:'',s:'delete',p:null,descr:'',pdf:null});await loadInventory();await refreshDocs();$('feedback').textContent='Document supprimé.';}catch{$('feedback').textContent='Suppression interrompue.';}};
for(const [value,label] of Object.entries(folders))$('upload').elements.category.add(new Option(label,value));
$('upload').elements.pdf.onchange=e=>{const file=e.target.files[0];if(file)$('upload').elements.title.value=file.name.replace(/\.pdf$/i,'').replace(/[_-]/g,' ').slice(0,100);};
bind('upload',async data=>{
 const file=data.get('pdf');if(file.size>5242880){$('feedback').textContent='Choisis un PDF de 5 Mo maximum.';return;}
 const content=file.size?await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);}):null;
 await rpc('edit',{doc:data.get('existing')||null,t:data.get('title').trim(),c:data.get('category'),descr:data.get('description'),s:data.get('state'),p:new Date(data.get('publication')||Date.now()).toISOString(),pdf:content});
 await loadInventory();await refreshDocs();$('feedback').textContent='Document enregistré.';
});
$('logout').onclick=async()=>{try{await api('/auth/v1/logout?scope=local',{});}catch{} token='';inventory=[];editorial=[];$('editor').hidden=true;refreshEditorial();$('upload').reset();$('upload').hidden=$('verify').hidden=$('mfa').hidden=true;$('identity').hidden=false;$('verify').reset();$('feedback').textContent='Déconnexion effectuée.';refreshDocs();};
$('month').value=day(new Date()).slice(0,7);
for(const id of ['month','period','stream'])$(id).onchange=renderDates;
$('today').onclick=()=>{$('month').value=day(new Date()).slice(0,7);$('period').value='month';renderDates();};
$('search').oninput=renderFiles;$('sort').onchange=renderFiles;
render();sync();refreshDocs();refreshEditorial();json('./guides.json').then(data=>{guides=data;renderFiles();}).catch(()=>{});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshDocs();refreshEditorial();sync();}});
setInterval(()=>{if(!document.hidden){sync();refreshDocs();refreshEditorial();}},300000);
