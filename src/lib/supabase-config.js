export function supabaseConfig(values){
 const url=values.SUPABASE_URL?.trim(),publishableKey=values.SUPABASE_PUBLISHABLE_KEY?.trim(),secretKey=values.SUPABASE_SECRET_KEY?.trim();
 if(!url||!publishableKey)throw Object.assign(new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY on the server.'),{status:503,code:'BACKEND_NOT_CONFIGURED'});
 let parsed;try{parsed=new URL(url);}catch{throw new Error('Invalid Supabase project URL.');}
 if(parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/'||!(parsed.protocol==='https:'||parsed.protocol==='http:'&&['127.0.0.1','localhost'].includes(parsed.hostname)))throw new Error('Use the HTTPS Supabase project origin.');
 if(publishableKey.startsWith('sb_secret_'))throw new Error('The publishable-key setting must not contain a server secret key.');
 if(publishableKey.startsWith('eyJ')){let payload;try{payload=JSON.parse(atob(publishableKey.split('.')[1].replaceAll('-','+').replaceAll('_','/')));}catch{throw new Error('Invalid legacy public API key.');}if(payload.role!=='anon')throw new Error('Only a publishable or legacy anon key may be used for user requests.');}
 return {url:parsed.origin,publishableKey,secretKey};
}
export function selectedBackend(values,development=false){
 if(values.SUPABASE_URL||values.APP_BACKEND==='supabase')return 'supabase';
 if(development&&values.APP_BACKEND==='local')return 'local';
 return 'supabase';
}
