// Each person's sign-in to an MCP: register this copy of the app, send the person to the service, swap the code,
// and renew before it ends. One renewal at a time per sign-in, so a single-use refresh token never signs anyone out.
import { McpRefusal, readJson, type Send } from "./discover.ts";
import { seal, unseal } from "./seal.ts";
import { now, type Caller, type Server } from "./store.ts";

/** What the app keeps of a sign-in, sealed. `expires` is when the access token ends, in milliseconds; `origin` is the
 *  copy of the app whose client got it, as staging's previews share one database. */
export type Tokens = { access: string; refresh?: string; expires?: number; origin: string };
type Client = { client_id: string; client_secret?: string };

/** The sign-in ended at the service: the person connects again. `busy`: another call is renewing it right now. */
export class SignInEnded extends Error {}
export class SignInBusy extends Error {}

const EARLY = 5 * 60_000;
const LEASE = 30_000;
const SIGN_IN_AGE = 10 * 60_000;
const random = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const challenge = async (verifier: string) => btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)))))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const where = (caller: Caller, id: string) => `${caller.installationId}/${id}`;
export const tokensPlace = (caller: Caller, id: string, email: string) => `${where(caller, id)}/${email}/tokens`;
const callback = (origin: string) => `${origin}/api/mcp/callback`;

/** This copy of the app's client at the service, registered the first time anyone here presses Connect. */
async function client(caller: Caller, server: Server, send: Send, origin = caller.origin): Promise<Client> {
  const place = `${where(caller, server.id)}/registration`;
  const kept = (await unseal<Record<string, Client>>(caller.env, place, server.registration)) ?? {};
  if (kept[origin]) return kept[origin];
  if (origin !== caller.origin) throw new SignInEnded();
  const { status, value } = await readJson(send, server.registration_endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_name: `WongStack (${new URL(caller.origin).host})`, redirect_uris: [callback(caller.origin)],
      grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: server.auth_method }) });
  const made = (value ?? {}) as Partial<Client>;
  if (status >= 300 || typeof made.client_id !== "string") throw new McpRefusal(`${server.name} would not register this app's address.`);
  const registered: Client = { client_id: made.client_id, ...(typeof made.client_secret === "string" && { client_secret: made.client_secret }) };
  await caller.db.prepare("UPDATE wong_mcp_servers SET registration = ? WHERE installation_id = ? AND id = ?")
    .bind(await seal(caller.env, place, { ...kept, [caller.origin]: registered }), caller.installationId, server.id).run();
  return registered;
}

/** The address of the service's own sign-in page, good once, for this person, for ten minutes. */
export async function startSignIn(caller: Caller, server: Server, send: Send): Promise<string> {
  const { client_id } = await client(caller, server, send);
  const [state, verifier] = [random(), random()];
  await caller.db.batch([
    caller.db.prepare("DELETE FROM wong_mcp_sign_ins WHERE created_at < ?").bind(new Date(Date.now() - SIGN_IN_AGE).toISOString()),
    caller.db.prepare("INSERT INTO wong_mcp_sign_ins VALUES (?, ?, ?, ?, ?, ?, ?)").bind(state, caller.installationId, server.id,
      await seal(caller.env, `sign-in/${state}`, verifier), caller.origin, caller.email, now()),
  ]);
  const url = new URL(server.authorize_endpoint);
  for (const [name, value] of Object.entries({ response_type: "code", client_id, redirect_uri: callback(caller.origin), state,
    code_challenge: await challenge(verifier), code_challenge_method: "S256", resource: server.resource, ...(server.scopes && { scope: server.scopes }) })) {
    url.searchParams.set(name, value);
  }
  return url.href;
}

/** The sign-in a Connect left, once: `expired` when unknown or too old, `wrong_person` when someone else pressed it. */
export async function takeSignIn(caller: Caller, state: string): Promise<{ server: string; verifier: string } | "expired" | "wrong_person"> {
  const row = await caller.db.prepare("SELECT * FROM wong_mcp_sign_ins WHERE state = ? AND installation_id = ?").bind(state, caller.installationId)
    .first<{ server_id: string; code_verifier: string; origin: string; email: string; created_at: string }>();
  if (!row) return "expired";
  if (row.email !== caller.email || row.origin !== caller.origin) return "wrong_person";
  await caller.db.prepare("DELETE FROM wong_mcp_sign_ins WHERE state = ?").bind(state).run();
  const verifier = await unseal<string>(caller.env, `sign-in/${state}`, row.code_verifier);
  return verifier && Date.parse(row.created_at) > Date.now() - SIGN_IN_AGE ? { server: row.server_id, verifier } : "expired";
}

/** One request to the token endpoint. Throws SignInEnded when the service says the grant is gone. */
async function tokenRequest(caller: Caller, server: Server, send: Send, grant: Record<string, string>, old?: Tokens): Promise<{ tokens: Tokens; label: string | null }> {
  const origin = old?.origin ?? caller.origin;
  const { client_id, client_secret } = await client(caller, server, send, origin);
  const form = new URLSearchParams({ ...grant, client_id, resource: server.resource,
    ...(server.auth_method === "client_secret_post" && client_secret && { client_secret }) });
  const { status, value } = await readJson(send, server.token_endpoint, { method: "POST", body: form,
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" } });
  const answer = (value ?? {}) as Record<string, unknown>;
  if (answer.error === "invalid_grant") throw new SignInEnded();
  if (status !== 200 || typeof answer.access_token !== "string") throw new McpRefusal(`${server.name} did not finish the sign-in.`);
  const refresh = typeof answer.refresh_token === "string" ? answer.refresh_token : old?.refresh;
  return { tokens: { access: answer.access_token, ...(refresh && { refresh }), origin,
    ...(typeof answer.expires_in === "number" && { expires: Date.now() + answer.expires_in * 1000 }) }, label: accountLabel(answer.id_token) };
}

/** Who the service says signed in, for the row's label only: the claim is never trusted for anything else. */
function accountLabel(idToken: unknown): string | null {
  try {
    const claims = JSON.parse(atob(String(idToken).split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    const label = claims.email ?? claims.name;
    return typeof label === "string" ? label.slice(0, 120) : null;
  } catch { return null; }
}

/** Swaps the code the service returned for this person's sign-in, and keeps it sealed. A share they had stays. */
export async function finishSignIn(caller: Caller, server: Server, send: Send, code: string, verifier: string): Promise<Tokens> {
  const { label, tokens } = await tokenRequest(caller, server, send, { grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: callback(caller.origin) });
  await caller.db.prepare(`INSERT INTO wong_mcp_connections (installation_id, server_id, email, tokens, account_label, connected_at, state)
    VALUES (?, ?, ?, ?, ?, ?, 'connected') ON CONFLICT (installation_id, server_id, email) DO UPDATE SET tokens = excluded.tokens,
    account_label = excluded.account_label, connected_at = excluded.connected_at, state = 'connected', refresh_lease_until = NULL`)
    .bind(caller.installationId, server.id, caller.email, await seal(caller.env, tokensPlace(caller, server.id, caller.email), tokens), label, now()).run();
  return tokens;
}

/** The service ended this sign-in: nothing is sent with it again, and its share ends, until the person connects. */
async function ended(caller: Caller, id: string, email: string): Promise<void> {
  await caller.db.prepare(`UPDATE wong_mcp_connections SET state = 'reconnect', tokens = NULL, share = 'none', refresh_lease_until = NULL
    WHERE installation_id = ? AND server_id = ? AND email = ?`).bind(caller.installationId, id, email).run();
}

const live = (tokens: Tokens | null, margin = EARLY): tokens is Tokens => !!tokens && (tokens.expires === undefined || tokens.expires - Date.now() > margin);
const pause = () => new Promise(resolve => setTimeout(resolve, 200));

/** A live access token for `email`'s sign-in, renewed first when it ends within five minutes, or when `force`d after
 *  the MCP refused it. One caller takes the lease and renews; the others wait for its result. */
export async function accessToken(caller: Caller, server: Server, email: string, send: Send, force = false): Promise<Tokens> {
  const place = tokensPlace(caller, server.id, email);
  const pk = [caller.installationId, server.id, email];
  const read = async () => {
    const row = await caller.db.prepare("SELECT state, tokens FROM wong_mcp_connections WHERE installation_id = ? AND server_id = ? AND email = ?")
      .bind(...pk).first<{ state: string; tokens: string | null }>();
    return row?.state === "connected" ? unseal<Tokens>(caller.env, place, row.tokens) : null;
  };
  const current = await read();
  if (!current) throw new SignInEnded();
  if (!force && live(current)) return current;
  if (!current.refresh) {
    if (!force && live(current, 0)) return current;
    await ended(caller, server.id, email);
    throw new SignInEnded();
  }
  const leased = await caller.db.prepare(`UPDATE wong_mcp_connections SET refresh_lease_until = ? WHERE installation_id = ? AND server_id = ? AND email = ?
    AND state = 'connected' AND (refresh_lease_until IS NULL OR refresh_lease_until < ?) RETURNING tokens`)
    .bind(new Date(Date.now() + LEASE).toISOString(), ...pk, now()).first<{ tokens: string | null }>();
  if (!leased) return waitForRenewal(read, current);
  try {
    const { tokens: renewed } = await tokenRequest(caller, server, send, { grant_type: "refresh_token", refresh_token: current.refresh }, current);
    await caller.db.prepare("UPDATE wong_mcp_connections SET tokens = ?, refresh_lease_until = NULL WHERE installation_id = ? AND server_id = ? AND email = ?")
      .bind(await seal(caller.env, place, renewed), ...pk).run();
    return renewed;
  } catch (error) {
    if (error instanceof SignInEnded) { await ended(caller, server.id, email); throw error; }
    await caller.db.prepare("UPDATE wong_mcp_connections SET refresh_lease_until = NULL WHERE installation_id = ? AND server_id = ? AND email = ?").bind(...pk).run();
    if (!force && live(current, 0)) return current;
    throw error;
  }
}

/** Another call holds the lease: wait briefly for the sign-in it renews, never asking the service ourselves. */
async function waitForRenewal(read: () => Promise<Tokens | null>, before: Tokens): Promise<Tokens> {
  for (let tries = 0; tries < 10; tries++) {
    await pause();
    const now = await read();
    if (!now) throw new SignInEnded();
    if (now.access !== before.access) return now;
  }
  if (live(before, 0)) return before;
  throw new SignInBusy();
}
