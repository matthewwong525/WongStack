import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fixture } from "./connections.test-support";
import { githubFixture } from "./github.test-support";
import { verifyPublication } from "./publication";
let f: ReturnType<typeof fixture>;
let g: Awaited<ReturnType<typeof githubFixture>>;
beforeEach(async () => { f = fixture(); g = await githubFixture(f); });
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); });
const check = () => verifyPublication(f.core, "inspection-private-token", "main");
const path = "/repos/business/project/contents/.github/workflows/deploy.yml";
const setWorkflow = (text: string, sha = "b".repeat(40)) => g.responses.set(path, { sha, encoding: "base64", content: Buffer.from(text).toString("base64") });
const yaml = (job: string, top = "", trigger = "push: {}") => `on:\n  ${trigger}\n${top}\njobs:\n  build:\n${job}`;
const readJob = "    runs-on: ubuntu-latest\n    permissions: {contents: read}\n    steps: [{run: npm test}]\n";

it("requires independently pinned human owner with actual repository administration", async () => {
  await check();
  const saved = f.env.WONG_GITHUB_PUBLICATION;
  f.env.WONG_GITHUB_PUBLICATION = undefined;
  await expect(check()).rejects.toMatchObject({ code: "publication_review_required" });
  f.env.WONG_GITHUB_PUBLICATION = saved;
  g.responses.set("/users/business-owner", { id: 100, type: "User" });
  await expect(check()).rejects.toMatchObject({ code: "publication_owner_mismatch" });
  g.responses.set("/users/business-owner", { id: 99, type: "User" });
  g.responses.set("/repos/business/project/collaborators/business-owner/permission", { permission: "read", user: { id: 99 } });
  await expect(check()).rejects.toThrow();
});

it("rejects secret exposure, unknown environments, bypass, missing owner review and unsafe branch policy", async () => {
  const cases: [string, unknown][] = [
    ["actions/secrets", { total_count: 1, secrets: [{ name: "CLOUDFLARE_API_TOKEN" }] }],
    ["actions/organization-secrets", { total_count: 1, secrets: [{ name: "PRODUCTION" }] }],
    ["environments", { total_count: 3, environments: [{ name: "production" }, { name: "preview" }, { name: "unsafe" }] }],
    ["environments", { total_count: 2, environments: [{ name: "production" }, { name: "unsafe" }] }],
    ["environments/production", { can_admins_bypass: true }],
    ["environments/production", { can_admins_bypass: false, deployment_branch_policy: { protected_branches: false, custom_branch_policies: true }, protection_rules: [] }],
    ["environments/production", { can_admins_bypass: false, deployment_branch_policy: { protected_branches: false, custom_branch_policies: true }, protection_rules: [{ type: "required_reviewers", prevent_self_review: false, reviewers: [] }] }],
    ["environments/production", { can_admins_bypass: false, deployment_branch_policy: { protected_branches: false, custom_branch_policies: true }, protection_rules: [{ type: "required_reviewers", prevent_self_review: true, reviewers: [{ type: "Team", reviewer: { id: 99 } }] }] }],
    ["environments/production/deployment-branch-policies", { total_count: 1, branch_policies: [{ name: "*", type: "branch" }] }],
    ["environments/production/deployment-branch-policies", { total_count: 2, branch_policies: [{ name: "main", type: "branch" }] }],
    ["actions/workflows", { total_count: 1, workflows: [{ path: ".github/workflows/unreviewed.yml", state: "active" }] }],
    ["actions/workflows", { total_count: 2, workflows: [{ path: ".github/workflows/unreviewed.yml", state: "active" }, { path: ".github/workflows/deploy.yml", state: "active" }] }],
  ];
  for (const [suffix, value] of cases) {
    const key = `/repos/business/project/${suffix}`, original = g.responses.get(key);
    g.responses.set(key, value); await expect(check()).rejects.toThrow(); g.responses.set(key, original);
  }
  const blueprint = JSON.parse(f.env.WONG_GITHUB_PUBLICATION!);
  f.env.WONG_GITHUB_PUBLICATION = JSON.stringify({ ...blueprint, environments: blueprint.environments.map((environment: object) => ({ ...environment, branches: ["*"] })) });
  g.responses.set("/repos/business/project/environments/production/deployment-branch-policies", { total_count: 1, branch_policies: [{ name: "*", type: "branch" }] });
  await expect(check()).rejects.toMatchObject({ code: "publication_branch_policy_unverified" });
});

it("accepts read-only CI and literal owner-guarded deployment jobs while rejecting unrecognized YAML and unsafe permissions", async () => {
  for (const text of [yaml(readJob), yaml(readJob.replace("permissions: {contents: read}", ""), "permissions: {contents: read}"),
    yaml(readJob.replace("permissions: {contents: read}", "environment: {name: production}\n    permissions: {contents: read}"))]) {
    setWorkflow(text); await check();
  }
  const cases = [
    "on: [\ninvalid", "on: {push: {}, push: {}}", "on: {}\njobs: {}", "on: {push: {}}\njobs: {}",
    yaml(readJob, "", "pull_request_target: {}"), yaml(readJob, "defaults: {run: {shell: bash}}"),
    yaml(readJob, "env: {TOKEN: '${{ secrets.PRODUCTION }}'}"),
    yaml(readJob.replace("contents: read", "contents: write")),
    yaml(readJob.replace("contents: read", "contents: read, id-token: write")),
    yaml(readJob.replace("permissions: {contents: read}", "env: {TOKEN: '${{ secrets.PRODUCTION }}'}\n    permissions: {contents: read}")),
    yaml(readJob.replace("runs-on: ubuntu-latest", "uses: other/repo/.github/workflows/deploy.yml@main")),
    yaml(readJob.replace("runs-on: ubuntu-latest", "strategy: {matrix: {env: [production]}}")),
    yaml(readJob.replace("runs-on: ubuntu-latest", "container: node:latest")),
    yaml(readJob.replace("runs-on: ubuntu-latest", "services: {db: {image: postgres}}")),
    yaml(readJob.replace("runs-on: ubuntu-latest", "environment: '${{ github.ref }}'")),
  ];
  for (const text of cases) { setWorkflow(text); await expect(check()).rejects.toThrow(); }
  setWorkflow(g.deploy, "c".repeat(40));
  await expect(check()).rejects.toMatchObject({ code: "publication_workflow_changed" });
});
