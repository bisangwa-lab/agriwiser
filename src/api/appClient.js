// AgriWiser's browser data adapter. All operations call our authenticated
// server functions; account sessions are HttpOnly cookies, never browser tokens.
export { localClient as appClient } from './localClient';
export const usesAppData = true;
