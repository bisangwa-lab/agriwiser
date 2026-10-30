import {createFileRoute} from '@tanstack/react-router';
import {supabaseRequestClient} from '@/lib/supabase.server';
export const Route=createFileRoute('/auth/callback')({server:{handlers:{GET:async({request})=>{
 const url=new URL(request.url),code=url.searchParams.get('code');
 if(!code||code.length>4096)return Response.redirect(new URL('/login?error=invalid-link',url.origin),303);
 const {error}=await supabaseRequestClient().auth.exchangeCodeForSession(code);
 const next=url.searchParams.get('next')==='reset-password'?'/reset-password':'/';
 return Response.redirect(new URL(error?'/login?error=expired-link':next,url.origin),303);
}}}});
