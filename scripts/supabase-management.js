import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
export async function serverSettings(){return parseEnv(await readFile(new URL('../.dev.vars',import.meta.url),'utf8'));}
export async function saveServerSettings(values){
 let text=await readFile(new URL('../.dev.vars',import.meta.url),'utf8').catch(()=> '');
 for(const [key,value]of Object.entries(values)){if(!/^[A-Z_]+$/.test(key))throw new Error('Invalid setting name.');text=text.replace(new RegExp('^\\s*'+key+'\\s*=.*\\r?\\n?','gm'),'');text=text.trimEnd()+'\n'+key+'='+JSON.stringify(value)+'\n';}
 await writeFile(new URL('../.dev.vars',import.meta.url),text);
}
export async function managementRequest(path,{method='GET',body}={}){
 if(!path.startsWith('/v1/'))throw new Error('Invalid management API path.');
 const settings=await serverSettings();if(!settings.SUPABASE_ACCESS_TOKEN)throw new Error('Configure SUPABASE_ACCESS_TOKEN in .dev.vars.');
 const response=await fetch('https://api.supabase.com'+path,{method,headers:{Authorization:'Bearer '+settings.SUPABASE_ACCESS_TOKEN,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw new Error('Supabase management request failed with HTTP '+response.status+'.');
 return response.status===204?null:response.json();
}
export async function projectRef(){const settings=await serverSettings();return settings.SUPABASE_PROJECT_REF??(await readFile(new URL('../data/private/supabase-project-ref.txt',import.meta.url),'utf8')).trim();}
export async function queryDatabase(query){return managementRequest('/v1/projects/'+await projectRef()+'/database/query',{method:'POST',body:{query}});}
