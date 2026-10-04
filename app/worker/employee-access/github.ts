// Reviewed GitHub App permissions; employee tokens never inherit installation-wide rights.
import { z } from "zod";
import { type Core, AccessError, now } from "./core.ts";
import { provider } from "./provider.ts";
import { decode, encode, seal, unseal } from "./seal.ts";
import { publicationPlan, verifyPublication } from "./publication.ts";
export const editorPermissions = { contents: "write", pull_requests: "write", checks: "read", actions: "read",
  statuses: "read", deployments: "read" } as const;
export const appPermissions = { ...editorPermissions, administration: "read", secrets: "read", environments: "read" } as const;
const api = "https://api.github.com";
const appSchema = z.object({ appId: z.number().int().positive(), privateKey: z.string(), slug: z.string().regex(/^[a-z0-9-]+$/),
  installationId: z.number().int().positive().optional() }).strict();
export type GithubApp = z.infer<typeof appSchema>;
const tokenSchema = z.object({ token: z.string().min(1), expires_at: z.iso.datetime(),
  permissions: z.record(z.string(), z.string()), repositories: z.array(z.object({ id: z.number() })) });
export type RepositoryToken = z.infer<typeof tokenSchema>;
const pemBytes = (pem: string) => decode(pem.replace(/-----[^-]+-----/g, "").replaceAll(/\s/g, ""));
const derLength = (length: number) => length < 128 ? [length] : length < 256 ? [129, length] : [130, length >> 8, length & 255];
// GitHub manifest keys can be PKCS#1; WebCrypto imports the wrapped PKCS#8 form.
function privateDer(pem: string): Uint8Array {
  const bytes = pemBytes(pem);
  if (!pem.includes("BEGIN RSA PRIVATE KEY")) return bytes;
  const prefix = [2, 1, 0, 48, 13, 6, 9, 42, 134, 72, 134, 247, 13, 1, 1, 1, 5, 0, 4, ...derLength(bytes.length)];
  return new Uint8Array([48, ...derLength(prefix.length + bytes.length), ...prefix, ...bytes]);
}
export async function appJwt(app: GithubApp): Promise<string> {
  const time = Math.floor(Date.now() / 1000);
  const body = `${encode(new TextEncoder().encode('{"alg":"RS256","typ":"JWT"}'))}.${encode(new TextEncoder()
    .encode(JSON.stringify({ iat: time - 60, exp: time + 540, iss: String(app.appId) })))}`;
  const key = await crypto.subtle.importKey("pkcs8", privateDer(app.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(body));
  return `${body}.${encode(new Uint8Array(signed))}`;
}
export async function githubMaterial(core: Core): Promise<GithubApp> {
  const row = await core.db.prepare("SELECT sealed_material FROM wong_access_connections WHERE installation_id = ? AND provider = 'github'")
    .bind(core.pin.installationId).first<{ sealed_material: string }>();
  if (!row) throw new AccessError("github_owner_setup_required");
  return appSchema.parse(JSON.parse(await unseal(row.sealed_material, core.env.WONG_ACCESS_SEAL_KEY, `${core.pin.installationId}:github`)));
}
export async function saveGithub(core: Core, app: GithubApp, status: "pending" | "ready" | "blocked", detail: string): Promise<void> {
  const material = await seal(JSON.stringify(appSchema.parse(app)), core.env.WONG_ACCESS_SEAL_KEY, `${core.pin.installationId}:github`);
  await core.db.prepare(`INSERT INTO wong_access_connections (installation_id, provider, status, generation, sealed_material, verified_at, detail)
    VALUES (?, 'github', ?, 1, ?, ?, ?) ON CONFLICT(installation_id, provider) DO UPDATE SET status = excluded.status,
    generation = generation + 1, sealed_material = excluded.sealed_material, verified_at = excluded.verified_at, detail = excluded.detail`)
    .bind(core.pin.installationId, status, material, status === "ready" ? now() : null, detail).run();
}
function exactPermissions(actual: Record<string, string>, expected: Record<string, string>): boolean {
  return Object.entries(expected).every(([permission, grant]) => actual[permission] === grant) &&
    Object.keys(actual).every(permission => permission === "metadata" && actual[permission] === "read" || permission in expected);
}
export async function createRepositoryToken(core: Core, app: GithubApp, permissions: Record<string, string>): Promise<RepositoryToken> {
  if (!app.installationId) throw new AccessError("github_approval_pending");
  const token = tokenSchema.parse(await provider(api, `/app/installations/${app.installationId}/access_tokens`, await appJwt(app), "POST",
    { repository_ids: [core.pin.repositoryId], permissions }));
  if (token.repositories.length !== 1 || token.repositories[0].id !== core.pin.repositoryId || !exactPermissions(token.permissions, permissions) ||
    Date.parse(token.expires_at) <= Date.now() || Date.parse(token.expires_at) > Date.now() + 3_660_000) {
    // If provider restriction readback disagrees, do not let the unexpected token escape.
    await revokeRepositoryToken(token.token);
    throw new AccessError("github_token_scope_invalid");
  }
  return token;
}
export async function revokeRepositoryToken(token: string): Promise<void> {
  await provider(api, "/installation/token", token, "DELETE");
}

/** Independently inspect the provider boundary. Missing inspection rights fail closed. */
export async function verifyGithub(core: Core, app: GithubApp): Promise<void> {
  if (!app.installationId) throw new AccessError("github_approval_pending");
  const profile = z.object({ id: z.number(), owner: z.object({ id: z.number(), type: z.enum(["User", "Organization"]) }) }).parse(await provider(api, "/app", await appJwt(app)));
  if (profile.id !== app.appId) throw new AccessError("github_installation_mismatch");
  const installed = z.object({ id: z.number(), app_id: z.number(), repository_selection: z.literal("selected"),
    suspended_at: z.null(), permissions: z.record(z.string(), z.string()) }).parse(await provider(api,
    `/app/installations/${app.installationId}`, await appJwt(app)));
  if (installed.id !== app.installationId || installed.app_id !== app.appId || !exactPermissions(installed.permissions, appPermissions)) {
    throw new AccessError("github_installation_mismatch");
  }
  const token = await createRepositoryToken(core, app, { contents: "read", administration: "read", actions: "read", secrets: "read", environments: "read" });
  try {
    const path = `/repos/${core.pin.repositoryName}`;
    const repo = z.object({ id: z.number(), full_name: z.string(), default_branch: z.string(), archived: z.literal(false), disabled: z.literal(false), has_pages: z.literal(false), owner: z.object({ id: z.number(), type: z.enum(["User", "Organization"]) }) })
      .parse(await provider(api, path, token.token));
    if (repo.id !== core.pin.repositoryId || repo.full_name !== core.pin.repositoryName) throw new AccessError("github_repository_mismatch");
    const reviewed = publicationPlan(core);
    if (repo.owner.id !== reviewed.repositoryOwnerId || repo.owner.type !== reviewed.repositoryOwnerType ||
      profile.owner.id !== repo.owner.id || profile.owner.type !== repo.owner.type) throw new AccessError("github_owner_mismatch");
    const protection = z.object({ enforce_admins: z.object({ enabled: z.literal(true) }),
      restrictions: z.object({ apps: z.array(z.unknown()).length(0), teams: z.array(z.unknown()).length(0),
        users: z.array(z.object({ id: z.number().positive() })).min(1) }),
      allow_force_pushes: z.object({ enabled: z.literal(false) }), allow_deletions: z.object({ enabled: z.literal(false) }) })
      .safeParse(await provider(api, `${path}/branches/${encodeURIComponent(repo.default_branch)}/protection`, token.token));
    if (!protection.success) throw new AccessError("publication_boundary_unverified");
    const rules = z.array(z.object({ type: z.string() })).parse(await provider(api,
      `${path}/rules/branches/${encodeURIComponent(repo.default_branch)}`, token.token));
    // Unreviewed inherited rules/bypass configurations cannot establish readiness.
    if (rules.length) throw new AccessError("publication_rules_review_required");
    await verifyPublication(core, token.token, repo.default_branch);
  } finally {
    await revokeRepositoryToken(token.token);
  }
}
export async function checkGithubConnection(core: Core): Promise<void> {
  const app = await githubMaterial(core);
  try {
    await verifyGithub(core, app);
    await saveGithub(core, app, "ready", "Provider inspection passed. GitHub attributes operations to this App; editor tokens expose the whole repository. Owner publication remains required.");
  } catch (error) {
    await saveGithub(core, app, "blocked", error instanceof AccessError ? error.code : "github_inspection_unavailable");
  }
}
