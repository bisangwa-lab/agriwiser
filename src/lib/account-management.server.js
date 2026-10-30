import {getRequest} from '@tanstack/react-start/server';
import {backendMode,supabaseRequestClient,supabaseAdminClient,assertSupabase} from './supabase.server.js';
import {localSessionUser} from './local-auth.server.js';
import {normalizeRole,ROLES} from './rbac.js';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export async function updateOwnProfile(input){
 const user=await localSessionUser();if(backendMode()!=='supabase')throw fail('Profile editing requires the configured Supabase backend.',503);
 if(!input||Object.keys(input).some(key=>key!=='full_name')||typeof input.full_name!=='string'||!input.full_name.trim()||input.full_name.length>100)throw fail('Provide only a name of 1–100 characters. Roles are assigned by an administrator.');
 assertSupabase(await supabaseRequestClient().from('hingasmart_profiles').update({full_name:input.full_name.trim()}).eq('id',user.id));return {ok:true};
}
async function administrator(){const user=await localSessionUser();if(normalizeRole(user)!=='super_admin')throw fail('Only a super administrator can manage accounts.',403);if(backendMode()!=='supabase')throw fail('Account management requires Supabase.',503);return supabaseAdminClient();}
export async function listAccounts(){
 const admin=await administrator(),profiles=assertSupabase(await admin.from('hingasmart_profiles').select('id,full_name,workspace_role,active,created_at').order('created_at').limit(500));
 const {data,error}=await admin.auth.admin.listUsers({page:1,perPage:500});if(error)throw fail('Accounts could not be loaded.',503);const emails=new Map(data.users.map(user=>[user.id,user.email]));return profiles.map(profile=>({...profile,email:emails.get(profile.id)??''}));
}
export async function assignAccountRole(input){
 const admin=await administrator();if(!input||Object.keys(input).some(key=>!['id','workspace_role'].includes(key))||typeof input.id!=='string'||!/^[\da-f-]{36}$/i.test(input.id)||!ROLES.some(role=>role.key===input.workspace_role))throw fail('Choose a valid account and role.');
 const {error}=await admin.rpc('hs_assign_account_role',{p_id:input.id,p_role:input.workspace_role});if(error)throw fail('The role could not be changed. At least one active super administrator must remain.',400);return {ok:true};
}
export async function inviteAccount(input){
 const admin=await administrator();if(!input||typeof input.email!=='string'||input.email.length>254||!/^\S+@\S+\.\S+$/.test(input.email)||!ROLES.some(role=>role.key===input.workspace_role))throw fail('Enter a valid email and role.');
 const {data,error}=await admin.auth.admin.inviteUserByEmail(input.email.trim(),{redirectTo:new URL('/auth/callback',getRequest().url).toString()});
 if(error)throw fail('The invitation could not be sent. Check Supabase Auth email-delivery settings.',503);
 assertSupabase(await admin.from('hingasmart_profiles').upsert({id:data.user.id,full_name:'',workspace_role:input.workspace_role},{onConflict:'id',ignoreDuplicates:true}));return {ok:true};
}
