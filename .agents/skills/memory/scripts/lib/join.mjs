// Renewal is unattended for an existing grant. Clones never admit themselves.
import { loadConfig, StoreError } from './store.mjs';
import { refreshMachine } from './machine-client.mjs';
export const RENEW_DAYS=7;
export async function joinStore(ctx) {
 try{await refreshMachine(ctx,loadConfig(ctx).installation);return {status:'connected'};}
 catch(error){throw new StoreError(error.code||'trusted machine setup is pending',{kind:error.kind||'auth'});}
}
export const JOIN_COMMANDS={join:async ctx=>{await joinStore(ctx);console.log('Machine memory credential refreshed.');}};
