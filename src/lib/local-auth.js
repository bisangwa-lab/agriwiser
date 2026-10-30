import { createServerFn } from "@tanstack/react-start";
import { runLocalAuth, localSessionUser } from "./local-auth.server.js";
import {backendMode} from './supabase.server.js';
import {validateAccount} from './local-auth-service.js';
import {getRequest} from '@tanstack/react-start/server';

const credentials = (data) => {
  if (!data || typeof data !== "object" || typeof data.email !== "string" || typeof data.password !== "string") throw new Error("Email and password are required.");
  if (data.email.length > 254 || data.password.length > 128) throw new Error("Account details are too long.");
  return data;
};

export const localLogin = createServerFn({ method: "POST" }).validator(credentials).handler(({ data }) => runLocalAuth("login", data));
export const localRegister = createServerFn({ method: "POST" }).validator(input=>{if(!input||Object.keys(input).some(key=>!['email','password','full_name'].includes(key)))throw new Error('Only name, email and password may be supplied.');return validateAccount(input);}).handler(({ data }) => runLocalAuth("register", data));
export const localMe = createServerFn({ method: "GET" }).handler(() => runLocalAuth("me"));
export const localLogout = createServerFn({ method: "POST" }).handler(() => runLocalAuth("logout"));
export const localQuickLogin = createServerFn({ method: "POST" }).validator((data) => {
  if (!data || Object.keys(data).length !== 1 || typeof data.account !== "string" || data.account.length > 32) throw new Error("Choose a listed local account.");
  return data.account;
}).handler(({ data }) => runLocalAuth("quickLogin", data));

export const accountConfiguration=createServerFn({method:'GET'}).handler(()=>({backend:backendMode(),quickLogin:import.meta.env.DEV&&import.meta.env.VITE_LOCAL_QUICK_LOGIN==='true'&&['localhost','127.0.0.1','[::1]'].includes(new URL(getRequest().url).hostname)}));
export const requestPasswordReset=createServerFn({method:'POST'}).validator(input=>{if(!input||typeof input.email!=='string'||input.email.length>254)throw new Error('Enter a valid email.');return {email:input.email};}).handler(({data})=>runLocalAuth('requestReset',data));
export const resetAccountPassword=createServerFn({method:'POST'}).validator(input=>{if(!input||typeof input.password!=='string'||input.password.length<12||input.password.length>128)throw new Error('Use 12–128 characters.');return {password:input.password};}).handler(({data})=>runLocalAuth('resetPassword',data));

// Unknown collections remain authenticated empty states.
export const localEmptyCollection = createServerFn({ method: "GET" }).handler(async () => {
  await localSessionUser();
  return { items: [], total: 0, has_more: false };
});
