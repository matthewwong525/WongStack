// GET <prefix>keys/seal, and PUT <prefix>keys/<NAME> or keys/<key id>/<part>: the owner or an Admin sends a sealed key
// to the live app alone; only the next publish opens it. wiki/stack/connect-your-tools.md
import { AccessError } from './errors.mjs';

const NAME = /^[A-Z][A-Z0-9_]{0,99}$/;
/** The app's own names, Cloudflare's and the sign-in's: setup or the publish sets these, never a send. */
const OWN = /^(?:WONG_|CLOUDFLARE_|CF_)/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Whether a person sends a key's secrets: never one setup makes or the server's own route uses. */
export const pasted = key => !key.setup && !key.alone;

/** The secret a send names, by its own name or, as Access sends it, by its key's id and its place among the key's
 *  secrets; null for any name a project key or a tool added from a chat does not declare. */
function secretOf(registry, path) {
  const [, id, part] = /^([a-z][a-z0-9-]*)\/(\d)$/.exec(path) ?? [];
  const name = id === undefined ? path : Object.hasOwn(registry, id) ? registry[id].secrets[Number(part)] : undefined;
  return name !== undefined && NAME.test(name) && !OWN.test(name) &&
    Object.values(registry).some(key => pasted(key) && key.secrets.includes(name)) ? name : null;
}

const exactly = (value, fields) => typeof value === 'object' && value !== null && !Array.isArray(value) &&
  Object.keys(value).length === fields.length && fields.every(name => Object.hasOwn(value, name));
/** A sealed key, as screen/seal.mjs makes it, and the last four characters the person may see again. */
const sent = value => exactly(value, ['sealed', 'ends']) && exactly(value.sealed, ['v', 'wrapped', 'iv', 'data']) && value.sealed.v === 1 &&
  ['wrapped', 'iv', 'data'].every(name => typeof value.sealed[name] === 'string' && BASE64.test(value.sealed[name])) &&
  typeof value.ends === 'string' && /^[\x21-\x7e]{1,4}$/.test(value.ends);

/** The keys/ routes, for a caller the module has already found to manage Access. */
export async function keysRoute(ctx) {
  const { request, pass, store, slots, reply, refuse } = ctx;
  try {
    const path = ctx.path.slice('keys/'.length);
    const publicKey = slots.sealing?.publicKey;
    if (path === 'seal' && request.method === 'GET') return publicKey ? reply({ publicKey }) : refuse('no_seal', 409);
    if (request.method !== 'PUT') return refuse('not_found', 404);
    // A preview runs branch code, so it never takes a key.
    if (!pass.live) return refuse('live_only', 409);
    if (!publicKey) return refuse('no_seal', 409);
    const name = secretOf(await ctx.registry, path);
    if (!name) return refuse('bad_name', 400);
    const value = await ctx.json(16_384);
    if (!sent(value)) return refuse('bad_key', 400);
    const { sealed, ends } = value;
    // A newer key for the same name replaces a waiting one. The record names the key and who sent it, never its value.
    await store.saveSealed({ name, sealed: JSON.stringify(sealed), ends, actor: pass.actor });
    return reply({ name, ends, waiting: true });
  } catch (error) {
    return error instanceof AccessError ? refuse(error.code, error.status) : refuse('access_unavailable', 503);
  }
}

/** Each key name waiting for the next publish, with its last four characters. */
export const waitingKeys = store => store.sealed();
