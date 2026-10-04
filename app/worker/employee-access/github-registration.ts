// One-use owner-bound manifest and installation callbacks. Private App keys stay sealed.
import { z } from "zod";
import { type Core, AccessError, audit, now, reply } from "./core.ts";
import { digest, encode } from "./seal.ts";
import { provider } from "./provider.ts";
import { publicationPlan } from "./publication.ts";
import { appPermissions, githubMaterial, saveGithub, checkGithubConnection } from "./github.ts";
const cookieName = "__Host-wong-github";
const random = () => encode(crypto.getRandomValues(new Uint8Array(32)));
const cookie = (request: Request) => request.headers.get("Cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);

export async function startGithub(core: Core): Promise<Response> {
  const existing = await core.db.prepare("SELECT provider FROM wong_access_connections WHERE installation_id = ? AND provider = 'github'")
    .bind(core.pin.installationId).first();
  const app = existing ? await githubMaterial(core) : null;
  const attempt = crypto.randomUUID(), state = `${attempt}.${random()}`, nonce = random();
  await core.db.prepare("INSERT INTO wong_access_attempts VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(attempt, core.pin.installationId, core.subject, await digest(state), await digest(nonce), app ? "install" : "register", new Date(Date.now() + 600_000).toISOString()).run();
  const manifest = { name: `WongStack ${core.pin.repositoryName.replace("/", " ")}`, url: core.pin.origin,
    setup_url: `${core.pin.origin}/api/access/github/install`,
    redirect_url: `${core.pin.origin}/api/access/github/register`, public: false,
    default_permissions: appPermissions, default_events: [], hook_attributes: { url: `${core.pin.origin}/api/access/github/webhook`, active: false } };
  const reviewed = publicationPlan(core);
  const account = core.pin.repositoryName.split("/")[0];
  const destination = reviewed.repositoryOwnerType === "Organization" ? `https://github.com/organizations/${account}/settings/apps/new` : "https://github.com/settings/apps/new";
  const url = app ? `https://github.com/apps/${app.slug}/installations/new?state=${encodeURIComponent(state)}` : `${destination}?state=${encodeURIComponent(state)}`;
  const response = reply({ kind: app ? "install" : "register", url, ...(app ? {} : { manifest }),
    expiresAt: new Date(Date.now() + 600_000).toISOString() });
  response.headers.set("Set-Cookie", `${cookieName}=${nonce}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`);
  return response;
}
async function consume(core: Core, request: Request, phase: "register" | "install"): Promise<string> {
  const state = new URL(request.url).searchParams.get("state"), nonce = cookie(request);
  if (!state || !nonce) throw new AccessError("github_attempt_invalid", 403);
  const id = state.split(".")[0];
  const row = await core.db.prepare(`UPDATE wong_access_attempts SET phase = 'consumed'
    WHERE attempt_id = ? AND installation_id = ? AND owner_subject = ? AND state_hash = ? AND cookie_hash = ?
      AND phase = ? AND expires_at > ? RETURNING attempt_id`)
    .bind(id, core.pin.installationId, core.subject, await digest(state), await digest(nonce), phase, now()).first<{ attempt_id: string }>();
  if (!row) throw new AccessError("github_attempt_expired", 403);
  return id;
}
export async function registerGithub(core: Core, request: Request): Promise<Response> {
  const code = new URL(request.url).searchParams.get("code");
  if (!code || !/^[A-Za-z0-9_-]{1,200}$/.test(code)) throw new AccessError("github_code_invalid", 400);
  const attempt = await consume(core, request, "register");
  const registered = z.object({ id: z.number().int().positive(), pem: z.string().min(1), slug: z.string().regex(/^[a-z0-9-]+$/),
    permissions: z.record(z.string(), z.string()) }).parse(await provider("https://api.github.com", `/app-manifests/${code}/conversions`, "", "POST"));
  if (Object.entries(appPermissions).some(([key, value]) => registered.permissions[key] !== value) ||
    Object.keys(registered.permissions).some(key => !(key in appPermissions) && (key !== "metadata" || registered.permissions[key] !== "read"))) throw new AccessError("github_permissions_invalid");
  await saveGithub(core, { appId: registered.id, privateKey: registered.pem, slug: registered.slug }, "pending", "github_installation_pending");
  // The install callback gets a fresh single-use state; registration cannot be replayed.
  const state = `${attempt}.${random()}`;
  await core.db.prepare("UPDATE wong_access_attempts SET phase = 'install', state_hash = ? WHERE attempt_id = ? AND phase = 'consumed'")
    .bind(await digest(state), attempt).run();
  await audit(core, "github_registered", 1);
  return new Response(null, { status: 303, headers: { Location: `https://github.com/apps/${registered.slug}/installations/new?state=${encodeURIComponent(state)}`,
    "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
export async function installGithub(core: Core, request: Request): Promise<Response> {
  const url = new URL(request.url);
  await consume(core, request, "install");
  if (url.searchParams.get("setup_action") === "request") return new Response(null, { status: 303, headers: { Location: `${core.pin.origin}/apps/access/?github=pending`,
    "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  const id = z.coerce.number().int().positive().safe().safeParse(url.searchParams.get("installation_id"));
  if (!id.success) throw new AccessError("github_installation_invalid", 400);
  const app = await githubMaterial(core);
  await saveGithub(core, { ...app, installationId: id.data }, "pending", "github_checking");
  await checkGithubConnection(core);
  await audit(core, "github_installation_checked", 1);
  const response = new Response(null, { status: 303, headers: { Location: `${core.pin.origin}/apps/access/?github=checked`,
    "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  response.headers.set("Set-Cookie", `${cookieName}=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  return response;
}
