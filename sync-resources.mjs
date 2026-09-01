import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const ROOT=dirname(fileURLToPath(import.meta.url));
const OUTPUT=join(ROOT,'resources.json');
const REPOSITORY=process.env.GITHUB_REPOSITORY||'Lucasrx08/3eAntonioGaudi';
const PUBLICATION_AUTHOR=(process.env.PUBLICATION_AUTHOR||process.env.GITHUB_REPOSITORY_OWNER||REPOSITORY.split('/')[0]).toLocaleLowerCase('fr');
const ALLOWED_CATEGORIES=new Set(['Vie de classe','Orientation','DNB','Stage','Certifications','Autre']);
const ALLOWED_TYPES=new Set(['PDF','Présentation Canva','Lien','Formulaire','Vidéo']);

function escapeRegExp(value){
  return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}

function issueSection(body,label){
  const pattern=new RegExp(`###\\s+${escapeRegExp(label)}\\s*\\n+([\\s\\S]*?)(?=\\n###\\s+|$)`,'i');
  const value=String(body||'').match(pattern)?.[1]?.trim()||'';
  return value==='_No response_'?'':value;
}

function plainText(value){
  return String(value||'')
    .replace(/<!--[^]*?-->/g,'')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g,'$1')
    .replace(/[*_~`>#]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,600);
}

function publicUrl(value){
  const markdown=String(value||'').match(/\]\((https:\/\/[^\s)]+)\)/i)?.[1];
  const bare=String(value||'').match(/https:\/\/[^\s)>]+/i)?.[0];
  const candidate=(markdown||bare||'').replace(/[.,;]+$/,'');
  if(!candidate)return '';
  try{
    const url=new URL(candidate);
    return url.protocol==='https:'?url.href:'';
  }catch(_error){
    return '';
  }
}

function resourceFromIssue(issue){
  const title=String(issue.title||'').replace(/^\[Publication\]\s*/i,'').trim().slice(0,140);
  const category=plainText(issueSection(issue.body,'Rubrique'));
  const type=plainText(issueSection(issue.body,'Type de ressource'));
  const url=publicUrl(issueSection(issue.body,'Lien ou fichier'));
  if(!title||!url)return null;
  return {
    id:`issue-${issue.number}`,
    title,
    category:ALLOWED_CATEGORIES.has(category)?category:'Autre',
    type:ALLOWED_TYPES.has(type)?type:'Lien',
    description:plainText(issueSection(issue.body,'Description')),
    url,
    publishedAt:issue.created_at,
    updatedAt:issue.updated_at
  };
}

async function loadIssues(){
  if(process.env.RESOURCES_ISSUES_FILE){
    return JSON.parse(await readFile(process.env.RESOURCES_ISSUES_FILE,'utf8'));
  }
  const token=process.env.GITHUB_TOKEN;
  if(!token)throw new Error('Le jeton GitHub est absent.');
  const response=await fetch(`https://api.github.com/repos/${REPOSITORY}/issues?state=open&per_page=100`,{
    headers:{
      accept:'application/vnd.github+json',
      authorization:`Bearer ${token}`,
      'x-github-api-version':'2022-11-28',
      'user-agent':'Ma-3e-Resources-Sync/1.0'
    }
  });
  if(!response.ok)throw new Error(`GitHub a répondu ${response.status}.`);
  return response.json();
}

async function main(){
  const issues=await loadIssues();
  const resources=issues
    .filter(issue=>!issue.pull_request)
    .filter(issue=>String(issue.title||'').startsWith('[Publication]'))
    .filter(issue=>String(issue.user?.login||'').toLocaleLowerCase('fr')===PUBLICATION_AUTHOR)
    .map(resourceFromIssue)
    .filter(Boolean)
    .sort((first,second)=>String(second.publishedAt).localeCompare(String(first.publishedAt)));
  const output={version:1,source:'GitHub Issues',updatedAt:new Date().toISOString(),resources};
  await writeFile(OUTPUT,`${JSON.stringify(output,null,2)}\n`,'utf8');
  console.log(`${resources.length} ressource(s) commune(s) publiée(s).`);
}

main().catch(error=>{
  console.error(`Publication des ressources impossible : ${error.message}`);
  process.exitCode=1;
});
