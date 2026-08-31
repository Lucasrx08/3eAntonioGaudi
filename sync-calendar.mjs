import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const ROOT=dirname(fileURLToPath(import.meta.url));
const OUTPUT=join(ROOT,'calendar.json');
const DEFAULT_TIME_ZONE='Europe/Paris';
const DAY_MS=86400000;
const WINDOW_PAST_DAYS=45;
const WINDOW_FUTURE_DAYS=550;

function unfoldIcs(value){
  return String(value||'').replace(/\r?\n[ \t]/g,'').replace(/\r\n/g,'\n');
}

function decodeText(value=''){
  return value
    .replace(/\\[nN]/g,'\n')
    .replace(/\\,/g,',')
    .replace(/\\;/g,';')
    .replace(/\\\\/g,'\\')
    .trim();
}

function parseProperties(block){
  const properties={};
  unfoldIcs(block).split('\n').forEach(line=>{
    const colon=line.indexOf(':');
    if(colon<1)return;
    const head=line.slice(0,colon);
    const value=line.slice(colon+1);
    const [rawName,...rawParams]=head.split(';');
    const name=rawName.toUpperCase();
    const params={};
    rawParams.forEach(raw=>{
      const equals=raw.indexOf('=');
      if(equals>0)params[raw.slice(0,equals).toUpperCase()]=raw.slice(equals+1).replace(/^"|"$/g,'');
    });
    (properties[name]||(properties[name]=[])).push({value,params});
  });
  return properties;
}

function dateKeyFromParts({year,month,day}){
  return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function addDaysToKey(key,days){
  const [year,month,day]=key.split('-').map(Number);
  const date=new Date(Date.UTC(year,month-1,day+days));
  return date.toISOString().slice(0,10);
}

function zonedParts(date,timeZone){
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
  }).formatToParts(date);
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return {
    year:Number(values.year),month:Number(values.month),day:Number(values.day),
    hour:Number(values.hour),minute:Number(values.minute),second:Number(values.second)
  };
}

function zonedTimeToUtc(parts,timeZone){
  const guess=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour||0,parts.minute||0,parts.second||0);
  let result=guess;
  for(let iteration=0;iteration<2;iteration+=1){
    const actual=zonedParts(new Date(result),timeZone);
    const rendered=Date.UTC(actual.year,actual.month-1,actual.day,actual.hour,actual.minute,actual.second);
    result-=rendered-guess;
  }
  return new Date(result);
}

function parseDateValue(property,fallbackTimeZone=DEFAULT_TIME_ZONE){
  if(!property)return null;
  const raw=property.value.trim();
  const allDay=property.params.VALUE==='DATE'||/^\d{8}$/.test(raw);
  const match=raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/);
  if(!match)return null;
  const parts={
    year:Number(match[1]),month:Number(match[2]),day:Number(match[3]),
    hour:Number(match[4]||0),minute:Number(match[5]||0),second:Number(match[6]||0)
  };
  if(allDay){
    return {allDay:true,key:dateKeyFromParts(parts),parts,timeZone:fallbackTimeZone,date:null};
  }
  const timeZone=property.params.TZID||fallbackTimeZone;
  const date=match[7]?new Date(Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second)):zonedTimeToUtc(parts,timeZone);
  return {allDay:false,key:null,parts,timeZone,date};
}

function recurrenceIdentity(parsed){
  if(!parsed)return '';
  return parsed.allDay?parsed.key:parsed.date.toISOString();
}

function propertyValue(properties,name){
  return properties[name]?.[0]?.value||'';
}

function parseEvent(block){
  const properties=parseProperties(block);
  const start=parseDateValue(properties.DTSTART?.[0]);
  if(!start)return null;
  let end=parseDateValue(properties.DTEND?.[0],start.timeZone);
  if(!end){
    end=start.allDay
      ?{...start,key:addDaysToKey(start.key,1)}
      :{...start,date:new Date(start.date.getTime()+60*60*1000)};
  }
  const exdates=(properties.EXDATE||[]).flatMap(property=>property.value.split(',').map(value=>parseDateValue({...property,value},start.timeZone))).filter(Boolean);
  return {
    uid:propertyValue(properties,'UID')||createHash('sha1').update(block).digest('hex'),
    title:decodeText(propertyValue(properties,'SUMMARY'))||'Événement de la classe',
    description:decodeText(propertyValue(properties,'DESCRIPTION')),
    location:decodeText(propertyValue(properties,'LOCATION')),
    status:propertyValue(properties,'STATUS').toUpperCase(),
    start,end,
    recurrenceId:parseDateValue(properties['RECURRENCE-ID']?.[0],start.timeZone),
    rrule:propertyValue(properties,'RRULE'),
    exdates:new Set(exdates.map(recurrenceIdentity))
  };
}

function parseRule(value=''){
  const rule={};
  value.split(';').forEach(part=>{
    const [key,rawValue]=part.split('=');
    if(key&&rawValue)rule[key.toUpperCase()]=rawValue.toUpperCase();
  });
  return rule;
}

function daysBetweenKeys(first,second){
  const toUtc=key=>{
    const [year,month,day]=key.split('-').map(Number);
    return Date.UTC(year,month-1,day);
  };
  return Math.round((toUtc(second)-toUtc(first))/DAY_MS);
}

function weekdayCode(date){
  return ['SU','MO','TU','WE','TH','FR','SA'][date.getUTCDay()];
}

function matchesByDay(token,date){
  const match=token.match(/^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/);
  if(!match||weekdayCode(date)!==match[2])return false;
  if(!match[1])return true;
  const ordinal=Number(match[1]);
  const day=date.getUTCDate();
  if(ordinal>0)return Math.floor((day-1)/7)+1===ordinal;
  const lastDay=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  return -Math.floor((lastDay-day)/7)-1===ordinal;
}

function matchesMonthDay(values,date){
  if(!values.length)return true;
  const day=date.getUTCDate();
  const lastDay=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  return values.some(value=>value>0?day===value:day===lastDay+value+1);
}

function candidateMatches(rule,baseKey,candidate){
  const frequency=rule.FREQ;
  const interval=Math.max(1,Number(rule.INTERVAL)||1);
  const candidateKey=candidate.toISOString().slice(0,10);
  const difference=daysBetweenKeys(baseKey,candidateKey);
  const [baseYear,baseMonth,baseDay]=baseKey.split('-').map(Number);
  const monthDifference=(candidate.getUTCFullYear()-baseYear)*12+(candidate.getUTCMonth()+1-baseMonth);
  const byMonths=(rule.BYMONTH||'').split(',').filter(Boolean).map(Number);
  const byMonthDays=(rule.BYMONTHDAY||'').split(',').filter(Boolean).map(Number);
  const byDays=(rule.BYDAY||'').split(',').filter(Boolean);
  if(byMonths.length&&!byMonths.includes(candidate.getUTCMonth()+1))return false;
  if(!matchesMonthDay(byMonthDays,candidate))return false;
  if(byDays.length&&!byDays.some(token=>matchesByDay(token,candidate)))return false;
  if(frequency==='DAILY')return difference%interval===0;
  if(frequency==='WEEKLY'){
    if(Math.floor(difference/7)%interval!==0)return false;
    return byDays.length?true:candidate.getUTCDay()===new Date(Date.UTC(baseYear,baseMonth-1,baseDay)).getUTCDay();
  }
  if(frequency==='MONTHLY'){
    if(monthDifference%interval!==0)return false;
    if(byMonthDays.length||byDays.length)return true;
    return candidate.getUTCDate()===baseDay;
  }
  if(frequency==='YEARLY'){
    if((candidate.getUTCFullYear()-baseYear)%interval!==0)return false;
    if(!byMonths.length&&candidate.getUTCMonth()+1!==baseMonth)return false;
    if(!byMonthDays.length&&!byDays.length&&candidate.getUTCDate()!==baseDay)return false;
    return true;
  }
  return candidateKey===baseKey;
}

function categoryFor(event){
  const text=`${event.title} ${event.description}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
  if(/vacance|pont|ferie/.test(text))return 'vacances';
  if(/stage|entreprise|convention/.test(text))return 'stage';
  if(/orientation|metier|lycee|forum|odys|porte.? ouverte/.test(text))return 'orientation';
  if(/brevet|\bdnb\b|oral blanc/.test(text))return 'dnb';
  if(/pix|assr|ev@lang|certification|\bpsc\b/.test(text))return 'certification';
  if(/cross|sport|\beps\b|tournoi/.test(text))return 'sport';
  if(/document|fiche|a rendre|dossier/.test(text))return 'document';
  if(/vie de classe|delegue|photo.? de classe/.test(text))return 'classe';
  return 'etablissement';
}

function occurrenceFrom(event,start,sequence){
  const allDay=start.allDay;
  const duration=event.start.allDay
    ?Math.max(1,daysBetweenKeys(event.start.key,event.end.key))
    :Math.max(0,event.end.date-event.start.date);
  const startValue=allDay?start.key:start.date.toISOString();
  const endValue=allDay?addDaysToKey(start.key,duration):new Date(start.date.getTime()+duration).toISOString();
  const id=createHash('sha1').update(`${event.uid}|${startValue}|${sequence}`).digest('hex').slice(0,16);
  return {
    id,title:event.title,start:startValue,end:endValue,allDay,
    location:event.location,description:event.description,category:categoryFor(event)
  };
}

function expandEvent(event,overrideIds,windowStart,windowEnd){
  if(event.status==='CANCELLED')return [];
  if(!event.rrule){
    const occurrence=occurrenceFrom(event,event.start,0);
    const end=event.start.allDay?new Date(`${occurrence.end}T00:00:00Z`):new Date(occurrence.end);
    const start=event.start.allDay?new Date(`${occurrence.start}T00:00:00Z`):new Date(occurrence.start);
    return end>=windowStart&&start<=windowEnd?[occurrence]:[];
  }
  const rule=parseRule(event.rrule);
  const baseKey=event.start.allDay?event.start.key:dateKeyFromParts(event.start.parts);
  const [year,month,day]=baseKey.split('-').map(Number);
  const until=rule.UNTIL?parseDateValue({value:rule.UNTIL,params:{}},event.start.timeZone):null;
  const untilTime=until?(until.allDay?new Date(`${until.key}T23:59:59Z`):until.date):null;
  const countLimit=Math.max(0,Number(rule.COUNT)||0);
  const results=[];
  let matched=0;
  const finalDay=new Date(Date.UTC(windowEnd.getUTCFullYear(),windowEnd.getUTCMonth(),windowEnd.getUTCDate()));
  for(let cursor=new Date(Date.UTC(year,month-1,day));cursor<=finalDay;cursor=new Date(cursor.getTime()+DAY_MS)){
    if(!candidateMatches(rule,baseKey,cursor))continue;
    const candidateKey=cursor.toISOString().slice(0,10);
    const candidate=event.start.allDay
      ?{...event.start,key:candidateKey,parts:{...event.start.parts,year:cursor.getUTCFullYear(),month:cursor.getUTCMonth()+1,day:cursor.getUTCDate()}}
      :{...event.start,parts:{...event.start.parts,year:cursor.getUTCFullYear(),month:cursor.getUTCMonth()+1,day:cursor.getUTCDate()},date:zonedTimeToUtc({...event.start.parts,year:cursor.getUTCFullYear(),month:cursor.getUTCMonth()+1,day:cursor.getUTCDate()},event.start.timeZone)};
    if(candidate.allDay?candidate.key<baseKey:candidate.date<event.start.date)continue;
    matched+=1;
    if(countLimit&&matched>countLimit)break;
    const identity=recurrenceIdentity(candidate);
    const candidateTime=candidate.allDay?new Date(`${candidate.key}T00:00:00Z`):candidate.date;
    if(untilTime&&candidateTime>untilTime)break;
    if(event.exdates.has(identity)||overrideIds.has(`${event.uid}|${identity}`))continue;
    const occurrence=occurrenceFrom(event,candidate,matched);
    const occurrenceEnd=candidate.allDay?new Date(`${occurrence.end}T00:00:00Z`):new Date(occurrence.end);
    if(occurrenceEnd>=windowStart&&candidateTime<=windowEnd)results.push(occurrence);
  }
  return results;
}

async function calendarText(){
  if(process.env.APPLE_CALENDAR_FILE)return readFile(process.env.APPLE_CALENDAR_FILE,'utf8');
  const rawUrl=process.env.APPLE_CALENDAR_URL?.trim();
  if(!rawUrl)return null;
  const httpsUrl=rawUrl.replace(/^webcal:\/\//i,'https://');
  const url=new URL(httpsUrl);
  if(url.protocol!=='https:'||!url.hostname.endsWith('.icloud.com')||!url.pathname.startsWith('/published/')){
    throw new Error('Le lien doit être un calendrier public iCloud.');
  }
  const response=await fetch(url,{headers:{'user-agent':'Ma-3e-Calendar-Sync/1.0'},redirect:'follow'});
  if(!response.ok)throw new Error(`iCloud a répondu ${response.status}.`);
  const text=await response.text();
  if(!text.includes('BEGIN:VCALENDAR'))throw new Error('Le contenu reçu n’est pas un calendrier iCloud valide.');
  return text;
}

async function main(){
  const text=await calendarText();
  if(!text){
    console.log('APPLE_CALENDAR_URL absent : conservation du calendrier existant.');
    return;
  }
  const blocks=unfoldIcs(text).match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)||[];
  const parsed=blocks.map(parseEvent).filter(Boolean);
  const overrides=parsed.filter(event=>event.recurrenceId);
  const overrideIds=new Set(overrides.map(event=>`${event.uid}|${recurrenceIdentity(event.recurrenceId)}`));
  const now=new Date();
  const windowStart=new Date(now.getTime()-WINDOW_PAST_DAYS*DAY_MS);
  const windowEnd=new Date(now.getTime()+WINDOW_FUTURE_DAYS*DAY_MS);
  const events=parsed
    .filter(event=>!event.recurrenceId)
    .flatMap(event=>expandEvent(event,overrideIds,windowStart,windowEnd));
  overrides.filter(event=>event.status!=='CANCELLED').forEach(event=>events.push(...expandEvent({...event,rrule:''},new Set(),windowStart,windowEnd)));
  const unique=[...new Map(events.map(event=>[`${event.id}|${event.start}`,event])).values()]
    .sort((first,second)=>String(first.start).localeCompare(String(second.start))||first.title.localeCompare(second.title,'fr'));
  const output={version:1,updatedAt:new Date().toISOString(),timeZone:DEFAULT_TIME_ZONE,events:unique};
  await writeFile(OUTPUT,`${JSON.stringify(output,null,2)}\n`,'utf8');
  console.log(`${unique.length} événement(s) Apple synchronisé(s).`);
}

main().catch(error=>{
  console.error(`Synchronisation impossible : ${error.message}`);
  process.exitCode=1;
});
