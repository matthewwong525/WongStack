// GET /api/access/keys/seal, and PUT /api/access/keys/<NAME> or /<key id>/<part>: the owner or an Admin sends a sealed
// key to the live app alone; only the next publish opens it. wiki/stack/connect-your-tools.md
import { z } from "zod";
import type { AccessIdentity } from "../access.ts";
import { type ConnectionEnv, AccessError, ownerCore, reply } from "./core.ts";
import { boundedJson } from "./json.ts";
import { registryFor, type KeyEntry, type Registry } from "./key-levels.ts";
import { audit } from "./sets.ts";

export const KEYS = "/api/access/keys/";
const NAME = /^[A-Z][A-Z0-9_]{0,99}$/;
/** The app's own names, Cloudflare's and the sign-in's: setup or the publish sets these, never a send. */
const OWN = /^(?:WONG_|CLOUDFLARE_|CF_)/;
const base64 = z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/);
/** A sealed key, as app/src/lib/seal.ts makes it, and the last four characters the person may see again. */
const sent = z.strictObject({ sealed: z.strictObject({ v: z.literal(1), wrapped: base64, iv: base64, data: base64 }),
  ends: z.string().regex(/^[\x21-\x7e]{1,4}$/) });

const refuse = (code: string, status: number) => reply({ error: { code } }, status);

/** Whether a person sends a key's secrets: never one setup makes or the Worker's own route uses. */
export const pasted = (key: KeyEntry) => !key.setup && !key.alone;

/** The secret a send names, by its own name or, as Access sends it, by its key's id and its place among the key's
 *  secrets; null for any name a key in the code or a tool added from a chat does not declare. */
function secretOf(registry: Registry, path: string): string | null {
  const [, id, part] = /^([a-z][a-z0-9-]*)\/(\d)$/.exec(path) ?? [];
  const name = id === undefined ? path : Object.hasOwn(registry, id) ? registry[id].secrets[Number(part)] : undefined;
  return name !== undefined && NAME.test(name) && !OWN.test(name) &&
    Object.values(registry).some(key => pasted(key) && key.secrets.includes(name)) ? name : null;
}

export async function keysRoute(request: Request, env: ConnectionEnv, identity: AccessIdentity | null): Promise<Response> {
  try {
    const core = await ownerCore(request, env, identity);
    const path = new URL(request.url).pathname.slice(KEYS.length);
    const publicKey = env.WONG_KEY_SEAL_PUBLIC;
    if (path === "seal" && request.method === "GET") return publicKey ? reply({ publicKey }) : refuse("no_seal", 409);
    if (request.method !== "PUT") return refuse("not_found", 404);
    // A preview runs branch code, so it never takes a key.
    if (!core.live) return refuse("live_only", 409);
    if (!publicKey) return refuse("no_seal", 409);
    const name = secretOf(await registryFor(env), path);
    if (!name) return refuse("bad_name", 400);
    const parsed = sent.safeParse(await boundedJson(request, 16_384));
    if (!parsed.success) return refuse("bad_key", 400);
    const { sealed, ends } = parsed.data;
    // A newer key for the same name replaces a waiting one. The audit names the key and who sent it, never its value.
    await core.db.batch([core.db.prepare(`INSERT INTO sealed_keys VALUES (?, ?, ?, ?, ?) ON CONFLICT(name) DO UPDATE SET
      sealed = excluded.sealed, ends = excluded.ends, sent_by = excluded.sent_by, sent_at = excluded.sent_at`)
      .bind(name, JSON.stringify(sealed), ends, core.actor, Date.now()), audit(core, `key_sent:${name}`)]);
    return reply({ name, ends, waiting: true });
  } catch (error) {
    return error instanceof AccessError ? refuse(error.code, error.status) : refuse("access_unavailable", 503);
  }
}

/** Each key name waiting for the next publish, with its last four characters. */
export async function waitingKeys(db: D1DatabaseSession): Promise<Map<string, string>> {
  const rows = await db.prepare("SELECT name, ends FROM sealed_keys").all<{ name: string; ends: string }>();
  return new Map(rows.results.map(row => [row.name, row.ends]));
}
