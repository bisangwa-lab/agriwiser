import {env} from 'cloudflare:workers';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {getCookies,getRequest,setCookie,setResponseHeader} from '@tanstack/react-start/server';
import {selectedBackend,supabaseConfig} from './supabase-config.js';
import {QUICK_LOCAL_ACCOUNTS,quickLoginAllowed} from './local-quick-login.js';

const clients=new WeakMap();
export const backendMode=()=>selectedBackend(env,import.meta.env.DEV);
const unavailable=()=>Object.assign(new Error('The Supabase service is unavailable. Check the server configuration and schema.'),{status:503,code:'BACKEND_UNAVAILABLE'});
export function assertSupabase(result){if(result.error)throw unavailable();return result.data;}
export function supabaseRequestClient(){
 const request=getRequest();if(clients.has(request))return clients.get(request);
 const {url,publishableKey}=supabaseConfig(env),secure=new URL(request.url).protocol==='https:';
 setResponseHeader('Cache-Control','private, no-store');
 const client=createServerClient(url,publishableKey,{
  cookieOptions:{path:'/',httpOnly:true,sameSite:'lax',secure},
  cookies:{getAll:()=>Object.entries(getCookies()).map(([name,value])=>({name,value})),setAll:(cookies,headers)=>{
   for(const {name,value,options}of cookies)setCookie(name,value,{...options,path:'/',httpOnly:true,sameSite:'lax',secure});
   for(const [name,value]of Object.entries(headers??{}))setResponseHeader(name,value);
   setResponseHeader('Cache-Control','private, no-store');
  }},
 });clients.set(request,client);return client;
}
export function supabaseAdminClient(){
 const {url,secretKey}=supabaseConfig(env);
 if(!secretKey)throw Object.assign(new Error('Configure SUPABASE_SECRET_KEY as a server-only secret for administrative operations.'),{status:503,code:'BACKEND_NOT_CONFIGURED'});
 return createClient(url,secretKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export async function supabaseSessionUser(){
 const client=supabaseRequestClient(),{data,error}=await client.auth.getUser();
 if(error||!data.user){if(!error||error.status===400||error.status===401||error.status===403)throw Object.assign(new Error('Sign in to continue.'),{status:401});throw unavailable();}
 const result=await client.from('hingasmart_profiles').select('id,full_name,workspace_role,active,created_at').eq('id',data.user.id).maybeSingle();
 if(result.error)throw unavailable();
 let profile=result.data;
 if(!profile){
  // The server creates a least-privilege profile. User-editable Auth metadata
  // can supply a display name, never an authorization role.
  assertSupabase(await supabaseAdminClient().from('hingasmart_profiles').upsert({id:data.user.id,full_name:String(data.user.user_metadata?.full_name??'').slice(0,100),workspace_role:'public_viewer'},{onConflict:'id',ignoreDuplicates:true}));
  profile=assertSupabase(await client.from('hingasmart_profiles').select('id,full_name,workspace_role,active,created_at').eq('id',data.user.id).single());
 }
 if(!profile.active)throw Object.assign(new Error('This account has been disabled.'),{status:403});
 return {id:data.user.id,email:data.user.email,full_name:profile.full_name||data.user.email,workspace_role:profile.workspace_role,role:profile.workspace_role==='super_admin'?'admin':'user',created_date:profile.created_at};
}

// One-click demo panel access for competition judging. Uses Supabase admin magic
// links entirely server-side — no passwords or tokens are exposed to the browser.
// The established session is an HttpOnly cookie, same as normal sign-in.
async function demoPanelLogin(accountKey){
 if(!Object.hasOwn(QUICK_LOCAL_ACCOUNTS,accountKey))throw Object.assign(new Error('Choose a listed demo panel.'),{status:403});
 const account=QUICK_LOCAL_ACCOUNTS[accountKey],admin=supabaseAdminClient();
 const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});
 const existing=listed.data?.users.find(user=>user.email===account.email);
 if(listed.error||!existing)throw Object.assign(new Error('This demo account is unavailable.'),{status:403});
 const profile=await admin.from('hingasmart_profiles').select('workspace_role,active').eq('id',existing.id).single();
 if(profile.error||!profile.data.active||profile.data.workspace_role!==account.role)throw Object.assign(new Error('The demo account is disabled or has a different assigned role.'),{status:403});
 const {data,error}=await admin.auth.admin.generateLink({type:'magiclink',email:account.email});
 if(error||!data.properties?.hashed_token)throw Object.assign(new Error('This demo account is unavailable.'),{status:403});
 const verified=await client.auth.verifyOtp({type:'magiclink',token_hash:data.properties.hashed_token});
 if(verified.error)throw Object.assign(new Error('The demo session could not be established.'),{status:401});
 const user=await supabaseSessionUser();if(user.workspace_role!==account.role){await client.auth.signOut({scope:'local'});throw Object.assign(new Error('The demo account does not have the expected assigned role.'),{status:403});}
 return {user};
}

export async function runSupabaseAuth(action,input){
 const client=supabaseRequestClient(),origin=new URL(getRequest().url).origin;
 if(action==='me')return {user:await supabaseSessionUser()};
 if(action==='logout'){const result=await client.auth.signOut({scope:'local'});if(result.error)throw unavailable();return {ok:true};}
 if(action==='quickLogin'){
  if(!quickLoginAllowed({development:import.meta.env.DEV,authMode:'local',enabled:import.meta.env.VITE_LOCAL_QUICK_LOGIN,hostname:new URL(getRequest().url).hostname})||!Object.hasOwn(QUICK_LOCAL_ACCOUNTS,input))throw Object.assign(new Error('Quick sign-in is available only during loopback development.'),{status:403});
  return demoPanelLogin(input);
 }
 if(action==='demoPanelLogin')return demoPanelLogin(input);
 let result;
 if(action==='login')result=await client.auth.signInWithPassword({email:input.email.trim(),password:input.password});
 else if(action==='register')result=await client.auth.signUp({email:input.email.trim(),password:input.password,options:{data:{full_name:input.full_name??''},emailRedirectTo:origin+'/auth/callback'}});
 else if(action==='requestReset'){result=await client.auth.resetPasswordForEmail(input.email,{redirectTo:origin+'/auth/callback?next=reset-password'});if(result.error)throw Object.assign(new Error('Password recovery could not be requested. Please retry later.'),{status:503});return {ok:true};}
 else if(action==='resetPassword'){await supabaseSessionUser();result=await client.auth.updateUser({password:input.password});if(result.error)throw Object.assign(new Error('The new password was rejected. Use 12–128 characters and retry.'),{status:400});return {ok:true};}
 else throw new Error('Unsupported account operation.');
 if(result.error)throw Object.assign(new Error(action==='login'?'Invalid email or password':'Registration could not be completed. Check the email, password and project signup settings.'),{status:result.error.status===429?429:400});
 if(action==='register'&&!result.data.session)return {requiresEmailConfirmation:true};
 return {user:await supabaseSessionUser()};
}
