import { createMiddleware } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { localSessionUser } from './local-auth.server.js';
// Identity is resolved from AgriWiser's HttpOnly session cookie on the server.
export const authMiddleware=createMiddleware({type:'function'}).server(({next})=>next());
export const appRequestMiddleware=createMiddleware({type:'request'}).server(({next})=>next());
async function currentUser(){try{return await localSessionUser();}catch(error){if(error.status===401)return null;throw error;}}
export const requireUser=createMiddleware({type:'function'}).server(async({next})=>{
 const user=await currentUser();
 if(!user){setResponseStatus(401);throw Object.assign(new Error('Sign in to continue.'),{status:401,code:'UNAUTHORIZED'});}
 return next({context:{user}});
});
export const requireUserRoute=createMiddleware({type:'request'}).server(async({next})=>{
 const user=await currentUser();if(!user)return Response.json({error:'Sign in to continue.'},{status:401});return next({context:{user}});
});
