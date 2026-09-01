const CALENDAR_FILE='./calendar.json';
const CALENDAR_CACHE_KEY='ma3e_calendar_cache_v1';
const TIMETABLE_FILE='./timetable.json';
const TIMETABLE_CACHE_KEY='ma3e_timetable_cache_v1';
const RESOURCES_FILE='./resources.json';
const RESOURCES_CACHE_KEY='ma3e_resources_cache_v2';
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

document.querySelectorAll('[data-resource]').forEach(button=>button.addEventListener('click',()=>{
  setResourceFilter(button.dataset.resource);
  showView('resources');
}));
document.querySelectorAll('[data-resource-filter]').forEach(button=>button.addEventListener('click',()=>setResourceFilter(button.dataset.resourceFilter)));
document.querySelector('#resource-search')?.addEventListener('input',()=>renderResources());

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
const timetableDayFormatter=new Intl.DateTimeFormat('fr-FR',{weekday:'short',timeZone:DISPLAY_TIME_ZONE});
const timetableDateFormatter=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',timeZone:DISPLAY_TIME_ZONE});
const timetableEndFormatter=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',year:'numeric',timeZone:DISPLAY_TIME_ZONE});
const timetableTimePartsFormatter=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:DISPLAY_TIME_ZONE});

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

function addDaysToDateKey(key,days){
  const [year,month,day]=key.split('-').map(Number);
  return new Date(Date.UTC(year,month-1,day+days)).toISOString().slice(0,10);
}

function dateFromKeyAtNoon(key){
  const [year,month,day]=key.split('-').map(Number);
  return new Date(Date.UTC(year,month-1,day,12));
}

function mondayFromKey(key){
  const date=dateFromKeyAtNoon(key);
  const offset=(date.getUTCDay()+6)%7;
  return addDaysToDateKey(key,-offset);
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

const resourceTypeDetails={
  PDF:{mark:'PDF',action:'Ouvrir le PDF'},
  'Présentation Canva':{mark:'C',action:'Voir la présentation'},
  Lien:{mark:'↗',action:'Ouvrir le lien'},
  Formulaire:{mark:'✓',action:'Ouvrir le formulaire'},
  Vidéo:{mark:'▶',action:'Voir la vidéo'}
};
const INFOGRAPHIC_URL='https://lucasrigaux.my.canva.site/monanneeen3emegaudi';
const pathwayGuides={
  Orientation:{
    order:'02',mark:'↗',tone:'blue',eyebrow:'MON ORIENTATION',title:'Construire mon projet après la 3e',
    intro:'En 3e, je prépare un choix important : la voie générale et technologique, la voie professionnelle ou un CAP. Élève, famille et équipe éducative avancent ensemble, étape par étape.',
    stats:[
      {value:'3',label:'voies à explorer'},
      {value:'4',label:'demi-journées dédiées'},
      {value:'1',label:'dialogue continu'}
    ],
    notice:'Le calendrier ci-dessous reprend l’infographie de la classe. Les dates exactes de saisie des intentions, des vœux et de l’affectation 2027 seront communiquées par l’établissement et l’académie.',
    sectionTitle:'Le calendrier de mon orientation',
    items:[
      {meta:'OCT. — NOV.',title:'Je m’informe et je réfléchis',text:'Je découvre les métiers et les formations, j’identifie mes goûts et mes points forts, puis j’en parle en vie de classe et à la maison.'},
      {meta:'DÉC. — JANV.',title:'Premier bilan scolaire',text:'Je prends connaissance du bilan du conseil de classe. Les mini-stages en lycée professionnel et les premières portes ouvertes peuvent commencer.'},
      {meta:'FÉVRIER',title:'Intentions d’orientation',text:'Ma famille indique les premières intentions sur le service ou la fiche de dialogue transmis par l’établissement.'},
      {meta:'MARS',title:'Avis provisoire',text:'Le conseil de classe formule une proposition provisoire. Je poursuis mes recherches et je participe aux portes ouvertes.'},
      {meta:'AVRIL — MAI',title:'Choix et vœux définitifs',text:'Ma famille confirme la voie demandée et renseigne les formations et établissements souhaités selon la procédure Affelnet.'},
      {meta:'JUIN',title:'Décision, affectation et inscription',text:'Après la décision d’orientation, je consulte mon affectation puis je m’inscris rapidement dans le lycée indiqué.'}
    ],
    highlights:[
      {title:'Seconde générale et technologique',text:'Pour préparer un bac général ou technologique après une seconde commune.'},
      {title:'Seconde professionnelle',text:'Pour préparer un bac professionnel, sous statut scolaire ou en apprentissage.'},
      {title:'CAP ou CAP agricole',text:'Une formation professionnelle généralement préparée en deux ans.'}
    ],
    links:[
      {label:'Comprendre l’orientation en 3e',detail:'Ministère de l’Éducation nationale',url:'https://www.education.gouv.fr/reussir-au-lycee/l-orientation-en-3e-et-l-affectation-en-lycee-9257'},
      {label:'Explorer Avenir(s)',detail:'Onisep · élèves et parents',url:'https://www.onisep.fr/avenir-s'},
      {label:'Voir l’infographie de la classe',detail:'Support complet de M. Rigaux',url:INFOGRAPHIC_URL}
    ]
  },
  DNB:{
    order:'03',mark:'60%',tone:'dark',eyebrow:'MON PREMIER DIPLÔME',title:'Objectif DNB 2027',
    intro:'Le brevet est obtenu avec une moyenne finale d’au moins 10/20. Le contrôle continu valorise le travail de toute l’année et les épreuves terminales comptent pour 60 %.',
    stats:[
      {value:'40%',label:'contrôle continu'},
      {value:'60%',label:'épreuves finales'},
      {value:'10/20',label:'pour être admis'}
    ],
    notice:'Nouveauté session 2027 : les sujets des épreuves écrites portent sur les programmes de la classe de 3e. Les dates nationales seront ajoutées lorsqu’elles seront publiées.',
    sectionTitle:'Les cinq épreuves terminales',
    items:[
      {meta:'3 H · COEF. 2',title:'Français',text:'Compréhension et interprétation, grammaire, dictée et rédaction.'},
      {meta:'2 H · COEF. 2',title:'Mathématiques',text:'Automatismes, raisonnement et résolution de problèmes.'},
      {meta:'2 H · COEF. 2',title:'Histoire-géographie et EMC',text:'Histoire-géographie coefficient 1,5 et EMC coefficient 0,5.'},
      {meta:'1 H · COEF. 2',title:'Sciences',text:'Deux disciplines parmi physique-chimie, SVT et technologie.'},
      {meta:'15 OU 25 MIN · COEF. 2',title:'Épreuve orale',text:'Présentation individuelle ou collective d’un projet, puis entretien avec le jury.'}
    ],
    highlights:[
      {title:'Assez bien',text:'À partir de 12/20'},
      {title:'Bien',text:'À partir de 14/20'},
      {title:'Très bien',text:'À partir de 16/20'},
      {title:'Félicitations du jury',text:'À partir de 18/20'}
    ],
    links:[
      {label:'Tout savoir sur le DNB',detail:'Ministère de l’Éducation nationale',url:'https://www.education.gouv.fr/le-diplome-national-du-brevet-10613'},
      {label:'Détail officiel des épreuves',detail:'Éduscol · durées et coefficients',url:'https://eduscol.education.gouv.fr/5607/les-epreuves-du-dnb'},
      {label:'Voir l’infographie de la classe',detail:'Support complet de M. Rigaux',url:INFOGRAPHIC_URL}
    ]
  },
  Stage:{
    order:'04',mark:'▰',tone:'orange',eyebrow:'MON PREMIER STAGE',title:'Préparer mon stage de 3e',
    intro:'Cette séquence d’observation obligatoire permet de découvrir le quotidien de professionnels, de gagner en autonomie et de préciser un projet d’orientation.',
    stats:[
      {value:'30 h',label:'de découverte'},
      {value:'1 sem.',label:'au maximum'},
      {value:'4',label:'signatures requises'}
    ],
    notice:'La période du stage 2026-2027 doit être confirmée par l’établissement. La convention doit être complétée et signée par l’élève, ses responsables, la structure d’accueil et le collège avant le début du stage.',
    sectionTitle:'Avant, pendant et après le stage',
    items:[
      {meta:'1 · AVANT',title:'Je cherche et je prépare',text:'Je cible des secteurs qui m’intéressent, je contacte des structures et je prépare une courte présentation de ma demande.'},
      {meta:'2 · CONVENTION',title:'Je sécurise mon accueil',text:'Je vérifie les horaires, les missions, le tuteur et les quatre signatures. Sans convention finalisée, le stage ne peut pas commencer.'},
      {meta:'3 · PENDANT',title:'J’observe comme un professionnel',text:'Je suis ponctuel, curieux et respectueux. Je prends des notes, je pose des questions et je respecte la confidentialité.'},
      {meta:'4 · APRÈS',title:'Je fais le bilan',text:'Je remercie la structure, je trie mes observations et je prépare le compte rendu ou l’oral demandé par le collège.'}
    ],
    highlights:[
      {title:'À préparer',text:'CV simple, message de demande et liste de contacts.'},
      {title:'À vérifier',text:'Dates, horaires, trajet, repas, tenue et nom du tuteur.'},
      {title:'À conserver',text:'Convention, notes quotidiennes et coordonnées utiles.'}
    ],
    links:[
      {label:'Télécharger la convention',detail:'Exemplaire fourni dans l’infographie',url:'https://drive.google.com/file/d/1YxK5yJz-CRDWgvJDtSp2kNBqBs7SqeVv/view?usp=sharing'},
      {label:'Trouver une offre de stage',detail:'1élève1stage · service du ministère',url:'https://1eleve1stage.education.gouv.fr/offres-de-stage'},
      {label:'Connaître les règles du stage',detail:'Service-Public.fr',url:'https://www.service-public.gouv.fr/particuliers/vosdroits/F1882'},
      {label:'Voir l’infographie de la classe',detail:'Support complet de M. Rigaux',url:INFOGRAPHIC_URL}
    ]
  },
  Certifications:{
    order:'05',mark:'✦',tone:'green',eyebrow:'MES TESTS ET CERTIFICATIONS',title:'Quatre repères en classe de 3e',
    intro:'Ces évaluations attestent des compétences utiles pour la poursuite d’études, la citoyenneté, la mobilité et la vie quotidienne.',
    stats:[
      {value:'PIX',label:'compétences numériques'},
      {value:'ASSR2',label:'sécurité routière'},
      {value:'PSC',label:'premiers secours'}
    ],
    notice:'Pour 2026-2027, la certification Pix des collèges est organisée entre le 15 mars et le 18 juin 2027. Les dates précises des autres passations seront communiquées par l’établissement.',
    sectionTitle:'Ce que chaque évaluation vérifie',
    items:[
      {meta:'ANGLAIS · 1 H',title:'Ev@lang',text:'Test de positionnement 100 % en ligne. Il situe le niveau d’anglais de A1 à B1+ avant l’entrée en seconde.'},
      {meta:'NUMÉRIQUE',title:'Pix',text:'Certification des compétences numériques en 3e. Le niveau de maîtrise attendu est « indépendant 1 ».'},
      {meta:'ROUTE',title:'ASSR2',text:'Attestation passée en 3e. Elle est notamment obligatoire pour la délivrance d’un premier permis aux moins de 21 ans.'},
      {meta:'SECOURS',title:'PSC ou gestes qui sauvent',text:'Le PSC atteste la capacité à prévenir les risques et à réaliser les gestes élémentaires de secours. À défaut, une sensibilisation GQS est prévue.'}
    ],
    highlights:[
      {title:'Ev@lang',text:'Compréhension orale, compréhension écrite, grammaire et lexique.'},
      {title:'Pix',text:'S’entraîner régulièrement sur son compte avant la certification.'},
      {title:'ASSR2',text:'Conserver précieusement l’attestation après sa délivrance.'},
      {title:'PSC',text:'Une formation pratique, pas seulement un questionnaire.'}
    ],
    links:[
      {label:'Comprendre Ev@lang',detail:'Éduscol · test de positionnement',url:'https://eduscol.education.gouv.fr/4824/evlang-college'},
      {label:'M’entraîner sur Pix',detail:'Plateforme officielle Pix',url:'https://pix.org/fr/'},
      {label:'Calendrier et certification Pix',detail:'Éduscol · année 2026-2027',url:'https://eduscol.education.gouv.fr/5520/evaluer-developper-et-certifier-les-competences-numeriques'},
      {label:'Tout savoir sur l’ASSR2',detail:'Éduscol · sécurité routière',url:'https://eduscol.education.gouv.fr/4728/l-education-la-securite-routiere-au-college'},
      {label:'M’entraîner à l’ASSR2',detail:'Plateforme nationale',url:'https://e-assr.education-securite-routiere.fr/preparer/assr/2/ASSR2'},
      {label:'Comprendre le PSC',detail:'Éduscol · premiers secours',url:'https://eduscol.education.gouv.fr/4716/sensibilisation-aux-premiers-secours-dans-le-second-degre-au-college-et-au-lycee'},
      {label:'Voir l’infographie de la classe',detail:'Support complet de M. Rigaux',url:INFOGRAPHIC_URL}
    ]
  }
};
const resourceDateFormatter=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',year:'numeric',timeZone:DISPLAY_TIME_ZONE});
let selectedResourceCategory='Tous';
let currentResourcesData={resources:[],updatedAt:null};

function normalizeSearch(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
}

function validResources(data){
  return data&&Array.isArray(data.resources)
    &&data.resources.every(resource=>resource&&resource.title&&resource.category&&resource.type&&resource.url)
    &&(!data.reminder||Boolean(data.reminder.title));
}

function safeResourceUrl(value){
  try{
    const url=new URL(value);
    return url.protocol==='https:'?url.href:'';
  }catch(_error){
    return '';
  }
}

function pathwayLink(link){
  const url=safeResourceUrl(link.url);
  const anchor=createElement('a','pathway-link');
  anchor.href=url||'#';
  anchor.target='_blank';
  anchor.rel='noopener noreferrer';
  const copy=createElement('span');
  copy.append(createElement('strong','',link.label),createElement('small','',link.detail));
  anchor.append(copy,createElement('b','', '↗'));
  return anchor;
}

function renderPathwayGuide(category='Tous'){
  const root=document.querySelector('#pathway-guide-root');
  if(!root)return;
  root.replaceChildren();
  const guide=pathwayGuides[category];
  if(!guide){
    const intro=createElement('div','pathway-overview-head');
    const introCopy=createElement('div');
    introCopy.append(
      createElement('span','', 'LES QUATRE GRANDS REPÈRES'),
      createElement('h3','', 'Comprendre mon année, étape par étape'),
      createElement('p','', 'Contenu adapté de l’infographie de la classe et vérifié à partir des ressources officielles pour l’année 2026-2027.')
    );
    const source=pathwayLink({label:'Infographie complète',detail:'Ouvrir le support Canva',url:INFOGRAPHIC_URL});
    intro.append(introCopy,source);
    const grid=createElement('div','pathway-overview-grid');
    Object.entries(pathwayGuides).forEach(([key,item])=>{
      const button=createElement('button',`pathway-overview-card tone-${item.tone}`);
      button.type='button';
      button.setAttribute('aria-label',`Ouvrir la rubrique ${key}`);
      const top=createElement('div','pathway-overview-top');
      top.append(createElement('span','',item.order),createElement('b','',item.mark));
      button.append(top,createElement('small','',item.eyebrow),createElement('h3','',item.title),createElement('p','',item.intro),createElement('strong','', 'Découvrir →'));
      button.addEventListener('click',()=>setResourceFilter(key));
      grid.append(button);
    });
    root.append(intro,grid);
    return;
  }

  const article=createElement('article',`pathway-detail tone-${guide.tone}`);
  const hero=createElement('header','pathway-detail-hero');
  const back=createElement('button','pathway-back','← Toutes les rubriques');
  back.type='button';
  back.addEventListener('click',()=>setResourceFilter('Tous'));
  const heading=createElement('div','pathway-detail-heading');
  heading.append(createElement('span','',guide.eyebrow),createElement('h3','',guide.title),createElement('p','',guide.intro));
  const mark=createElement('div','pathway-detail-mark',guide.mark);
  hero.append(back,heading,mark);
  const stats=createElement('div','pathway-stats');
  guide.stats.forEach(stat=>{
    const item=createElement('div');
    item.append(createElement('strong','',stat.value),createElement('span','',stat.label));
    stats.append(item);
  });
  hero.append(stats);

  const notice=createElement('div','pathway-notice');
  notice.append(createElement('b','', 'À RETENIR'),createElement('p','',guide.notice));

  const layout=createElement('div','pathway-layout');
  const main=createElement('section','pathway-main');
  main.append(createElement('span','pathway-section-kicker','LE PARCOURS'),createElement('h4','',guide.sectionTitle));
  const steps=createElement('div','pathway-steps');
  guide.items.forEach(item=>{
    const step=createElement('article','pathway-step');
    step.append(createElement('span','',item.meta));
    const copy=createElement('div');
    copy.append(createElement('h5','',item.title),createElement('p','',item.text));
    step.append(copy);
    steps.append(step);
  });
  main.append(steps);

  const side=createElement('aside','pathway-side');
  side.append(createElement('span','pathway-section-kicker','REPÈRES RAPIDES'),createElement('h4','', 'L’essentiel en un coup d’œil'));
  const highlights=createElement('div','pathway-highlights');
  guide.highlights.forEach(item=>{
    const highlight=createElement('article');
    highlight.append(createElement('strong','',item.title),createElement('p','',item.text));
    highlights.append(highlight);
  });
  side.append(highlights,createElement('span','pathway-section-kicker pathway-links-kicker','LIENS UTILES'));
  const links=createElement('div','pathway-links');
  guide.links.forEach(link=>links.append(pathwayLink(link)));
  side.append(links);
  layout.append(main,side);
  article.append(hero,notice,layout);
  root.append(article);
}

function setResourceFilter(category='Tous'){
  selectedResourceCategory=category;
  document.querySelectorAll('[data-resource-filter]').forEach(button=>button.classList.toggle('active',button.dataset.resourceFilter===category));
  renderPathwayGuide(category);
  renderResources();
}

function resourceStatus(data,{offline=false}={}){
  const status=document.querySelector('#resources-status');
  const bar=status?.closest('.resource-publish-bar');
  if(!status)return;
  if(offline){
    status.textContent='Version enregistrée hors connexion';
    bar?.classList.add('is-offline');
  }else if(data.updatedAt){
    status.textContent=`Publications vérifiées le ${statusFormatter.format(new Date(data.updatedAt))}`;
    bar?.classList.remove('is-offline');
  }else{
    status.textContent='Aucune publication pour le moment';
    bar?.classList.remove('is-offline');
  }
}

function renderReminder(reminder){
  const card=document.querySelector('#reminder-card');
  const title=document.querySelector('#reminder-title');
  const detail=document.querySelector('#reminder-detail');
  const action=document.querySelector('#reminder-action');
  const editLink=document.querySelector('#reminder-edit-link');
  const badge=card?.querySelector('.focus-badge');
  if(!card||!title||!detail||!action)return;
  const newReminderUrl='https://github.com/Lucasrx08/3eAntonioGaudi/issues/new?template=reminder.yml';
  if(!reminder){
    badge.textContent='À JOUR';
    title.textContent='Aucun rappel important';
    detail.textContent='Tout est à jour pour le moment.';
    action.hidden=true;
    if(editLink){editLink.href=newReminderUrl;editLink.textContent='Créer un rappel ↗';}
    return;
  }
  badge.textContent='À FAIRE';
  title.textContent=reminder.title;
  detail.replaceChildren(document.createTextNode(reminder.detail||'À retenir'));
  if(reminder.deadline){
    detail.append(document.createTextNode(' '),createElement('strong','',reminder.deadline));
  }
  action.hidden=false;
  const linkedUrl=safeResourceUrl(reminder.url);
  if(linkedUrl){
    action.textContent='Ouvrir le lien →';
    action.onclick=()=>window.open(linkedUrl,'_blank','noopener,noreferrer');
  }else{
    action.textContent='Voir les ressources →';
    action.onclick=()=>{setResourceFilter(reminder.category||'Tous');showView('resources');};
  }
  if(editLink){
    const manageUrl=safeResourceUrl(reminder.manageUrl);
    editLink.href=manageUrl||newReminderUrl;
    editLink.textContent='Modifier le rappel ↗';
  }
}

function renderResources(data=currentResourcesData,{offline=false}={}){
  currentResourcesData={...data,resources:[...(data.resources||[])]};
  renderReminder(currentResourcesData.reminder||null);
  resourceStatus(currentResourcesData,{offline});
  const root=document.querySelector('#resources-root');
  if(!root)return;
  root.replaceChildren();
  const query=normalizeSearch(document.querySelector('#resource-search')?.value);
  const resources=currentResourcesData.resources.filter(resource=>{
    const categoryMatches=selectedResourceCategory==='Tous'||resource.category===selectedResourceCategory;
    const searchMatches=!query||normalizeSearch(`${resource.title} ${resource.description} ${resource.category} ${resource.type}`).includes(query);
    return categoryMatches&&searchMatches;
  });
  if(!resources.length){
    const empty=createElement('div','calendar-empty');
    const hasPublications=currentResourcesData.resources.length>0;
    empty.append(
      createElement('strong','',hasPublications?'Aucune ressource ne correspond à ce filtre':'Aucune ressource commune publiée'),
      createElement('p','',hasPublications?'Essayez une autre rubrique ou effacez votre recherche.':'L’enseignant peut publier le premier PDF, lien Canva, formulaire ou vidéo depuis le bouton ci-dessus.')
    );
    root.append(empty);
    return;
  }
  resources.forEach(resource=>{
    const url=safeResourceUrl(resource.url);
    if(!url)return;
    const type=resourceTypeDetails[resource.type]||resourceTypeDetails.Lien;
    const article=createElement('article','resource-card');
    const mark=createElement('div',`resource-mark type-${normalizeSearch(resource.type).replace(/[^a-z0-9]+/g,'-')}`,type.mark);
    const copy=createElement('div','resource-card-copy');
    copy.append(createElement('small','',`${resource.category} · ${resource.type}`),createElement('h3','',resource.title));
    if(resource.description)copy.append(createElement('p','',resource.description));
    const footer=createElement('div','resource-card-footer');
    const published=resource.publishedAt?`Publié le ${resourceDateFormatter.format(new Date(resource.publishedAt))}`:'Ressource de la classe';
    const link=createElement('a','resource-open',`${type.action} →`);
    link.href=url;
    link.target='_blank';
    link.rel='noopener noreferrer';
    footer.append(createElement('span','',published),link);
    copy.append(footer);
    article.append(mark,copy);
    root.append(article);
  });
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

let selectedTimetableWeek=mondayFromKey(dateKey(new Date()));
let currentTimetableData={events:[]};

function timetableEventKey(event){
  return event.allDay?String(event.start).slice(0,10):dateKey(eventDate(event));
}

function timetableMinutes(event,field){
  const date=eventDate(event,field);
  const parts=timetableTimePartsFormatter.formatToParts(date);
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return Number(values.hour)*60+Number(values.minute);
}

function timetableRange(event){
  const start=timetableMinutes(event,'start');
  let end=timetableMinutes(event,'end');
  if(dateKey(eventDate(event,'start'))!==dateKey(eventDate(event,'end')))end=24*60;
  if(end<=start)end=start+60;
  return {start,end};
}

function timetableTone(title){
  const hash=[...String(title)].reduce((value,character)=>(value*31+character.codePointAt(0))>>>0,7);
  return `tone-${hash%4}`;
}

function timetableCourseDetail(event){
  return [...new Set([event.location,event.description]
    .filter(Boolean)
    .map(value=>value.replace(/\s*\n\s*/g,' · ').trim())
    .filter(Boolean))].join(' · ');
}

function timetableDays(events){
  const days=[0,1,2,3,4].map(offset=>addDaysToDateKey(selectedTimetableWeek,offset));
  [5,6].forEach(offset=>{
    const key=addDaysToDateKey(selectedTimetableWeek,offset);
    if(events.some(event=>timetableEventKey(event)===key))days.push(key);
  });
  return days;
}

function timetableWeekEvents(events){
  const end=addDaysToDateKey(selectedTimetableWeek,6);
  return sortEvents(events.filter(event=>{
    const key=timetableEventKey(event);
    return key>=selectedTimetableWeek&&key<=end;
  }));
}

function timetableWeekLabel(){
  const start=dateFromKeyAtNoon(selectedTimetableWeek);
  const end=dateFromKeyAtNoon(addDaysToDateKey(selectedTimetableWeek,6));
  return `${timetableDateFormatter.format(start)} — ${timetableEndFormatter.format(end)}`;
}

function timetableEmpty(message){
  const empty=createElement('div','calendar-empty');
  const detail=currentTimetableData.status==='empty-feed'
    ?'Le lien iCal ÉcoleDirecte a bien été vérifié, mais il ne contient actuellement aucun cours. Une nouvelle vérification aura lieu automatiquement.'
    :'Choisissez une autre semaine ou attendez la prochaine synchronisation ÉcoleDirecte.';
  empty.append(createElement('strong','',message),createElement('p','',detail));
  return empty;
}

function renderTimetableDesktop(events,days){
  const root=document.querySelector('#timetable-board');
  root.replaceChildren();
  if(!events.length){
    root.append(timetableEmpty('Aucun cours cette semaine'));
    return;
  }

  const timed=events.filter(event=>!event.allDay);
  const earliest=timed.length?Math.min(...timed.map(event=>timetableRange(event).start)):8*60;
  const latest=timed.length?Math.max(...timed.map(event=>timetableRange(event).end)):18*60;
  const startHour=Math.max(6,Math.min(8,Math.floor(earliest/60)));
  const endHour=Math.min(21,Math.max(18,Math.ceil(latest/60)));
  const hourHeight=72;
  const bodyHeight=(endHour-startHour)*hourHeight;
  const today=dateKey(new Date());
  const scroll=createElement('div','timetable-scroll');
  const grid=createElement('div','timetable-grid');
  grid.style.setProperty('--day-count',String(days.length));
  grid.style.minWidth=`${64+days.length*150}px`;
  grid.append(createElement('div','timetable-corner','HEURE'));

  days.forEach(key=>{
    const header=createElement('div',`timetable-day-head${key===today?' is-today':''}`);
    header.append(
      createElement('small','',timetableDayFormatter.format(dateFromKeyAtNoon(key)).replace('.','').toLocaleUpperCase('fr-FR')),
      createElement('strong','',timetableDateFormatter.format(dateFromKeyAtNoon(key)))
    );
    events.filter(event=>event.allDay&&timetableEventKey(event)===key).forEach(event=>{
      header.append(createElement('span','timetable-all-day',event.title));
    });
    grid.append(header);
  });

  const rail=createElement('div','timetable-time-rail');
  rail.style.height=`${bodyHeight}px`;
  for(let hour=startHour;hour<=endHour;hour+=1){
    const label=createElement('span','',`${String(hour).padStart(2,'0')}:00`);
    label.style.top=`${(hour-startHour)*hourHeight}px`;
    rail.append(label);
  }
  grid.append(rail);

  days.forEach(key=>{
    const column=createElement('div',`timetable-day-column${key===today?' is-today':''}`);
    column.style.height=`${bodyHeight}px`;
    column.style.setProperty('--hour-height',`${hourHeight}px`);
    events.filter(event=>!event.allDay&&timetableEventKey(event)===key).forEach(event=>{
      const range=timetableRange(event);
      const clippedStart=Math.max(range.start,startHour*60);
      const clippedEnd=Math.min(range.end,endHour*60);
      if(clippedEnd<=clippedStart)return;
      const top=(clippedStart-startHour*60)/60*hourHeight;
      const height=Math.max(30,(clippedEnd-clippedStart)/60*hourHeight-4);
      const card=createElement('article',`timetable-course ${timetableTone(event.title)}${height<52?' is-compact':''}`);
      card.style.top=`${top+2}px`;
      card.style.height=`${height}px`;
      const detail=timetableCourseDetail(event);
      card.title=[event.title,detail].filter(Boolean).join(' · ');
      card.append(
        createElement('span','',`${hourFormatter.format(eventDate(event,'start'))} – ${hourFormatter.format(eventDate(event,'end'))}`),
        createElement('strong','',event.title)
      );
      if(detail)card.append(createElement('small','',detail));
      column.append(card);
    });
    grid.append(column);
  });

  scroll.append(grid);
  root.append(scroll);
}

function renderTimetableMobile(events,days){
  const root=document.querySelector('#timetable-mobile');
  root.replaceChildren();
  if(!events.length){
    root.append(timetableEmpty('Aucun cours cette semaine'));
    return;
  }
  const today=dateKey(new Date());
  days.forEach(key=>{
    const dayEvents=events.filter(event=>timetableEventKey(event)===key);
    const section=createElement('section',`timetable-day-card${key===today?' is-today':''}`);
    const heading=createElement('header');
    heading.append(
      createElement('span','',timetableDayFormatter.format(dateFromKeyAtNoon(key)).replace('.','').toLocaleUpperCase('fr-FR')),
      createElement('strong','',timetableDateFormatter.format(dateFromKeyAtNoon(key)))
    );
    section.append(heading);
    if(!dayEvents.length){
      section.append(createElement('p','timetable-day-empty','Aucun cours'));
    }else{
      dayEvents.forEach(event=>{
        const article=createElement('article',timetableTone(event.title));
        const time=createElement('time','',event.allDay?'Journée':hourFormatter.format(eventDate(event,'start')));
        const copy=createElement('div');
        copy.append(createElement('strong','',event.title));
        const details=[];
        if(!event.allDay)details.push(`${hourFormatter.format(eventDate(event,'start'))} – ${hourFormatter.format(eventDate(event,'end'))}`);
        const detail=timetableCourseDetail(event);
        if(detail)details.push(detail);
        if(details.length)copy.append(createElement('small','',details.join(' · ')));
        article.append(time,copy);
        section.append(article);
      });
    }
    root.append(section);
  });
}

function renderTimetableWeek(){
  const events=timetableWeekEvents(currentTimetableData.events||[]);
  const days=timetableDays(events);
  const label=document.querySelector('#timetable-week-label');
  if(label)label.textContent=timetableWeekLabel();
  document.querySelector('#timetable-today')?.classList.toggle('is-current',selectedTimetableWeek===mondayFromKey(dateKey(new Date())));
  renderTimetableDesktop(events,days);
  renderTimetableMobile(events,days);
}

function renderTimetable(data,{offline=false}={}){
  currentTimetableData={...data,events:sortEvents(data.events||[])};
  renderTimetableWeek();
  const status=document.querySelector('#timetable-status');
  const bar=status?.closest('.agenda-sync-bar');
  if(offline){
    status.textContent='Version enregistrée hors connexion';
    bar?.classList.add('is-offline');
  }else if(data.updatedAt&&data.status==='empty-feed'){
    status.textContent=`Flux vérifié le ${statusFormatter.format(new Date(data.updatedAt))} · aucun cours transmis`;
    bar?.classList.remove('is-offline');
  }else if(data.updatedAt){
    status.textContent=`Dernière synchronisation ÉcoleDirecte : ${statusFormatter.format(new Date(data.updatedAt))}`;
    bar?.classList.remove('is-offline');
  }else{
    status.textContent='En attente de la première synchronisation';
    bar?.classList.remove('is-offline');
  }
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
    status.textContent=`Dernière synchronisation Apple : ${statusFormatter.format(new Date(data.updatedAt))}`;
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

function readCachedTimetable(){
  try{
    const cached=JSON.parse(localStorage.getItem(TIMETABLE_CACHE_KEY)||'null');
    return validCalendar(cached)?cached:null;
  }catch(_error){
    return null;
  }
}

function readCachedResources(){
  try{
    const cached=JSON.parse(localStorage.getItem(RESOURCES_CACHE_KEY)||'null');
    return validResources(cached)?cached:null;
  }catch(_error){
    return null;
  }
}

function sameItems(previous,next,key){
  return JSON.stringify(previous?.[key]||[])===JSON.stringify(next?.[key]||[]);
}

let calendarLoading=false;
async function loadCalendar({manual=false}={}){
  if(calendarLoading)return;
  calendarLoading=true;
  const previous=readCachedCalendar();
  const refreshButton=document.querySelector('#agenda-refresh');
  const status=document.querySelector('#agenda-status');
  refreshButton?.classList.add('is-loading');
  refreshButton?.setAttribute('aria-busy','true');
  if(manual&&status)status.textContent='Vérification de la dernière version publiée…';
  try{
    const response=await fetch(`${CALENDAR_FILE}?v=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`Calendrier indisponible (${response.status})`);
    const data=await response.json();
    if(!validCalendar(data))throw new Error('Format de calendrier incorrect');
    localStorage.setItem(CALENDAR_CACHE_KEY,JSON.stringify(data));
    renderCalendar(data);
    if(manual&&status&&data.updatedAt){
      status.textContent=sameItems(previous,data,'events')
        ?`Aucun changement · calendrier vérifié le ${statusFormatter.format(new Date(data.updatedAt))}`
        :`Nouveautés chargées · synchronisation du ${statusFormatter.format(new Date(data.updatedAt))}`;
    }
  }catch(error){
    const cached=readCachedCalendar();
    if(cached)renderCalendar(cached,{offline:true});
    else renderCalendar({events:[]},{offline:true});
    console.warn(error);
  }finally{
    calendarLoading=false;
    refreshButton?.classList.remove('is-loading');
    refreshButton?.removeAttribute('aria-busy');
  }
}

let timetableLoading=false;
async function loadTimetable({manual=false}={}){
  if(timetableLoading)return;
  timetableLoading=true;
  const previous=readCachedTimetable();
  const refreshButton=document.querySelector('#timetable-refresh');
  const status=document.querySelector('#timetable-status');
  refreshButton?.classList.add('is-loading');
  refreshButton?.setAttribute('aria-busy','true');
  if(manual&&status)status.textContent='Vérification de la dernière version publiée…';
  try{
    const response=await fetch(`${TIMETABLE_FILE}?v=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`Emploi du temps indisponible (${response.status})`);
    const data=await response.json();
    if(!validCalendar(data))throw new Error('Format de l’emploi du temps incorrect');
    localStorage.setItem(TIMETABLE_CACHE_KEY,JSON.stringify(data));
    renderTimetable(data);
    if(manual&&status&&data.updatedAt){
      if(data.status==='empty-feed')status.textContent=`Aucun cours transmis · flux vérifié le ${statusFormatter.format(new Date(data.updatedAt))}`;
      else status.textContent=sameItems(previous,data,'events')
        ?`Aucun changement · emploi du temps vérifié le ${statusFormatter.format(new Date(data.updatedAt))}`
        :`Nouveaux cours chargés · synchronisation du ${statusFormatter.format(new Date(data.updatedAt))}`;
    }
  }catch(error){
    const cached=readCachedTimetable();
    if(cached)renderTimetable(cached,{offline:true});
    else renderTimetable({events:[]},{offline:true});
    console.warn(error);
  }finally{
    timetableLoading=false;
    refreshButton?.classList.remove('is-loading');
    refreshButton?.removeAttribute('aria-busy');
  }
}

let resourcesLoading=false;
async function loadResources({manual=false}={}){
  if(resourcesLoading)return;
  resourcesLoading=true;
  const previous=readCachedResources();
  const refreshButton=document.querySelector('#resources-refresh');
  const status=document.querySelector('#resources-status');
  refreshButton?.classList.add('is-loading');
  refreshButton?.setAttribute('aria-busy','true');
  if(manual&&status)status.textContent='Vérification des dernières publications…';
  try{
    const response=await fetch(`${RESOURCES_FILE}?v=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`Ressources indisponibles (${response.status})`);
    const data=await response.json();
    if(!validResources(data))throw new Error('Format des ressources incorrect');
    localStorage.setItem(RESOURCES_CACHE_KEY,JSON.stringify(data));
    renderResources(data);
    if(manual&&status&&data.updatedAt){
      const unchanged=sameItems(previous,data,'resources')&&JSON.stringify(previous?.reminder||null)===JSON.stringify(data.reminder||null);
      status.textContent=unchanged
        ?`Aucune nouvelle publication · vérifié le ${statusFormatter.format(new Date(data.updatedAt))}`
        :`Nouvelles ressources chargées · ${statusFormatter.format(new Date(data.updatedAt))}`;
    }
  }catch(error){
    const cached=readCachedResources();
    if(cached)renderResources(cached,{offline:true});
    else renderResources({resources:[]},{offline:true});
    console.warn(error);
  }finally{
    resourcesLoading=false;
    refreshButton?.classList.remove('is-loading');
    refreshButton?.removeAttribute('aria-busy');
  }
}

document.querySelector('#agenda-refresh')?.addEventListener('click',()=>loadCalendar({manual:true}));
document.querySelector('#timetable-refresh')?.addEventListener('click',()=>loadTimetable({manual:true}));
document.querySelector('#resources-refresh')?.addEventListener('click',()=>loadResources({manual:true}));
document.querySelector('#timetable-prev')?.addEventListener('click',()=>{
  selectedTimetableWeek=addDaysToDateKey(selectedTimetableWeek,-7);
  renderTimetableWeek();
});
document.querySelector('#timetable-next')?.addEventListener('click',()=>{
  selectedTimetableWeek=addDaysToDateKey(selectedTimetableWeek,7);
  renderTimetableWeek();
});
document.querySelector('#timetable-today')?.addEventListener('click',()=>{
  selectedTimetableWeek=mondayFromKey(dateKey(new Date()));
  renderTimetableWeek();
});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){
    loadCalendar();
    loadTimetable();
    loadResources();
  }
});
window.setInterval(()=>{
  loadCalendar();
  loadTimetable();
  loadResources();
},CALENDAR_REFRESH_MS);

renderToday();
renderPathwayGuide();
loadCalendar();
loadTimetable();
loadResources();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
