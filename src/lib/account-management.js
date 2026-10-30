import {createServerFn} from '@tanstack/react-start';
import {requireUser} from './auth-middleware.js';
import {updateOwnProfile,listAccounts,assignAccountRole,inviteAccount} from './account-management.server.js';
export const updateProfile=createServerFn({method:'POST'}).middleware([requireUser]).validator(input=>input).handler(({data})=>updateOwnProfile(data));
export const getAccounts=createServerFn({method:'GET'}).middleware([requireUser]).handler(()=>listAccounts());
export const setAccountRole=createServerFn({method:'POST'}).middleware([requireUser]).validator(input=>input).handler(({data})=>assignAccountRole(data));
export const inviteAgriWiserAccount=createServerFn({method:'POST'}).middleware([requireUser]).validator(input=>input).handler(({data})=>inviteAccount(data));
