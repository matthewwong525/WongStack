import { readFileSync } from "node:fs";
import { vi } from "vitest";
import { appPermissions, saveGithub, type GithubApp } from "./github.ts";
import { fixture, pin, privateKey } from "./connections.test-support.ts";
export async function githubFixture(f: ReturnType<typeof fixture>) {
  const app: GithubApp = { appId: 456, installationId: 789, slug: "business-assistant", privateKey: await privateKey() };
  const deploy = `name: Deploy
on:
  push: {branches: ['**']}
  pull_request:
jobs:
  preview:
    runs-on: ubuntu-latest
    environment: preview
    permissions: {contents: read, deployments: write}
    env: {CLOUDFLARE_API_TOKEN: '\${{ secrets.CLOUDFLARE_API_TOKEN }}'}
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
      - run: bash scripts/cf-build.sh && bash scripts/cf-deploy.sh
  production:
    runs-on: ubuntu-latest
    environment: production
    permissions: {contents: read}
    env: {CLOUDFLARE_API_TOKEN: '\${{ secrets.CLOUDFLARE_API_TOKEN }}'}
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
      - run: bash scripts/cf-build.sh && bash scripts/cf-deploy.sh
`;
  const workflows = [{ path: ".github/workflows/test.yml", sha: "a".repeat(40) }, { path: ".github/workflows/deploy.yml", sha: "b".repeat(40) }];
  f.env.WONG_GITHUB_PUBLICATION = JSON.stringify({ version: 1, ownerGithubId: 99, ownerGithubLogin: "business-owner", repositoryOwnerId: 77, repositoryOwnerType: "Organization",
    environments: [{ name: "production", branches: ["main"] }, { name: "preview", branches: ["*"] }], workflows });
  const responses = new Map<string, unknown>([
    ["/app", { id: app.appId, owner: { id: 77, type: "Organization" } }],
    [`/app/installations/${app.installationId}`, { id: app.installationId, app_id: app.appId, repository_selection: "selected", suspended_at: null,
      permissions: { ...appPermissions, metadata: "read" } }],
    ["/users/business-owner", { id: 99, type: "User" }],
    ["/repos/business/project/collaborators/business-owner/permission", { permission: "admin", user: { id: 99 } }],
    ["/repos/business/project", { id: pin.repositoryId, full_name: pin.repositoryName, default_branch: "main", archived: false, disabled: false, has_pages: false, owner: { id: 77, type: "Organization" } }],
    ["/repos/business/project/branches/main/protection", { enforce_admins: { enabled: true }, restrictions: { apps: [], teams: [], users: [{ id: 99 }] },
      allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false } }],
    ["/repos/business/project/rules/branches/main", []],
    ["/repos/business/project/actions/secrets", { total_count: 0, secrets: [] }],
    ["/repos/business/project/actions/organization-secrets", { total_count: 0, secrets: [] }],
    ["/repos/business/project/environments", { total_count: 2, environments: [{ name: "production" }, { name: "preview" }] }],
    ["/repos/business/project/actions/workflows", { total_count: 2, workflows: workflows.map(workflow => ({ path: workflow.path, state: "active" })) }],
  ]);
  for (const [name, branches] of [["production", ["main"]], ["preview", ["*"]]] as const) {
    responses.set(`/repos/business/project/environments/${name}`, { can_admins_bypass: false,
      deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
      protection_rules: [{ type: "required_reviewers", prevent_self_review: true, reviewers: [{ type: "User", reviewer: { id: 99 } }] }] });
    responses.set(`/repos/business/project/environments/${name}/deployment-branch-policies`, { total_count: 1,
      branch_policies: branches.map(name => ({ name, type: "branch" })) });
  }
  for (const workflow of workflows) {
    const content = workflow.path.endsWith("test.yml") ? readFileSync(new URL("../../../.github/workflows/test.yml", import.meta.url), "utf8") : deploy;
    responses.set(`/repos/business/project/contents/${workflow.path}`, { sha: workflow.sha, encoding: "base64", content: Buffer.from(content).toString("base64") });
  }
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname;
    if (init.method === "DELETE") return new Response(null, { status: 204 });
    if (path.endsWith("/access_tokens")) {
      const body = JSON.parse(String(init.body));
      return Response.json({ token: body.permissions.contents === "write" ? "employee-private-token" : "inspection-private-token",
        expires_at: new Date(Date.now() + 3_600_000).toISOString(), repositories: [{ id: pin.repositoryId }], permissions: body.permissions });
    }
    if (path.startsWith("/app-manifests/")) return Response.json({ id: app.appId, pem: app.privateKey, slug: app.slug, permissions: appPermissions });
    return responses.has(path) ? Response.json(responses.get(path)) : new Response("missing", { status: 404 });
  });
  vi.stubGlobal("fetch", fetch);
  await saveGithub(f.core, app, "ready", "Synthetic provider fixture; not evidence of live readiness");
  return { app, fetch, responses, workflows, deploy };
}
