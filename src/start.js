import { createCsrfMiddleware,createStart } from '@tanstack/react-start';
import { authMiddleware,appRequestMiddleware } from '@/lib/auth-middleware';
const csrfMiddleware=createCsrfMiddleware({filter:context=>context.handlerType==='serverFn'});
export const startInstance=createStart(()=>({requestMiddleware:[csrfMiddleware,appRequestMiddleware],functionMiddleware:[authMiddleware]}));
