// Recognize reviewed CI plus owner-approved deployment jobs; unknown shapes block editing.
import { z } from "zod";
import { parseDocument } from "yaml";
import { type Core, AccessError } from "./core.ts";
import { provider } from "./provider.ts";
import { decode } from "./seal.ts";
const api = "https://api.github.com";
const pinSchema = z.object({ version: z.literal(1), ownerGithubId: z.number().int().positive(), ownerGithubLogin: z.string().regex(/^[a-zA-Z0-9-]+$/),
  repositoryOwnerId: z.number().int().positive(), repositoryOwnerType: z.enum(["User", "Organization"]),
  environments: z.array(z.object({ name: z.string().regex(/^[a-zA-Z0-9_-]+$/), branches: z.array(z.string()).min(1) }).strict()).min(1),
  workflows: z.array(z.object({ path: z.string().regex(/^\.github\/workflows\/[a-zA-Z0-9_-]+\.ya?ml$/),
    sha: z.string().regex(/^[a-f0-9]{40}$/) }).strict()).min(1) }).strict();
const record = z.record(z.string(), z.unknown());
function permissions(value: unknown, guarded: boolean): void {
  const granted = z.record(z.string(), z.string()).parse(value);
  if (granted.contents !== "read" || Object.entries(granted).some(([key, permission]) =>
    permission !== "read" && !(guarded && key === "deployments" && permission === "write"))) {
    throw new AccessError("publication_workflow_permissions_unsafe");
  }
}
function inspectWorkflow(text: string, environments: ReadonlySet<string>): void {
  const document = parseDocument(text, { uniqueKeys: true });
  if (document.errors.length) throw new AccessError("publication_workflow_unrecognized");
  const workflow = record.parse(document.toJS({ maxAliasCount: 0 }));
  const triggers = record.parse(workflow.on);
  if (!Object.keys(triggers).length || Object.keys(triggers).some(event => !["push", "pull_request", "workflow_dispatch"].includes(event)) ||
    (JSON.stringify(workflow.env) ?? "").includes("secrets") || workflow.defaults) throw new AccessError("publication_trigger_unrecognized");
  const jobs = record.parse(workflow.jobs);
  if (!Object.keys(jobs).length) throw new AccessError("publication_workflow_unrecognized");
  if (workflow.permissions !== undefined) permissions(workflow.permissions, false);
  for (const value of Object.values(jobs)) inspectJob(value, workflow.permissions, environments);
}
function inspectJob(value: unknown, workflowPermissions: unknown, environments: ReadonlySet<string>): void {
  const job = record.parse(value);
  if (job.uses || job.strategy || job.container || job.services) throw new AccessError("publication_workflow_unrecognized");
  const environment = typeof job.environment === "string" ? job.environment :
    job.environment === undefined ? null : z.object({ name: z.string() }).strict().parse(job.environment).name;
  const guarded = environment !== null && environments.has(environment);
  if (environment !== null && !guarded || !guarded && /\bsecrets\b/i.test(JSON.stringify(job))) throw new AccessError("publication_job_unguarded");
  permissions(job.permissions ?? workflowPermissions, guarded);
  z.array(record).min(1).parse(job.steps);
}

export async function verifyPublication(core: Core, token: string, branch: string): Promise<void> {
  if (!core.env.WONG_GITHUB_PUBLICATION) throw new AccessError("publication_review_required");
  const reviewed = publicationPlan(core);
  const path = `/repos/${core.pin.repositoryName}`;
  const human = z.object({ id: z.number(), type: z.literal("User") }).parse(await provider(api, `/users/${reviewed.ownerGithubLogin}`, token));
  const administrator = z.object({ permission: z.literal("admin"), user: z.object({ id: z.number() }) })
    .parse(await provider(api, `${path}/collaborators/${reviewed.ownerGithubLogin}/permission`, token));
  if (human.id !== reviewed.ownerGithubId || administrator.user.id !== reviewed.ownerGithubId) throw new AccessError("publication_owner_mismatch");
  for (const suffix of ["actions/secrets", "actions/organization-secrets"]) {
    const secrets = z.object({ total_count: z.literal(0), secrets: z.array(z.unknown()).length(0) })
      .safeParse(await provider(api, `${path}/${suffix}?per_page=100`, token));
    if (!secrets.success) throw new AccessError("publication_secrets_review_required");
  }
  const listed = z.object({ total_count: z.number(), environments: z.array(z.object({ name: z.string() })) })
    .parse(await provider(api, `${path}/environments?per_page=100`, token));
  if (listed.total_count !== reviewed.environments.length || listed.environments.length !== listed.total_count ||
    listed.environments.some(environment => !reviewed.environments.some(pin => pin.name === environment.name))) throw new AccessError("publication_environments_review_required");
  for (const environment of reviewed.environments) await verifyEnvironment(path, token, environment, reviewed.ownerGithubId);
  // At least one publication environment is default-branch-only; preview jobs
  // can use another owner-approved environment, never unguarded production keys.
  if (!reviewed.environments.some(environment => environment.branches.length === 1 && environment.branches[0] === branch)) throw new AccessError("publication_branch_policy_unverified");
  const workflows = z.object({ total_count: z.number(), workflows: z.array(z.object({ path: z.string(), state: z.literal("active") })) })
    .parse(await provider(api, `${path}/actions/workflows?per_page=100`, token));
  if (workflows.total_count !== reviewed.workflows.length || workflows.workflows.length !== workflows.total_count ||
    workflows.workflows.some(workflow => !reviewed.workflows.some(pin => pin.path === workflow.path))) throw new AccessError("publication_workflows_review_required");
  for (const workflow of reviewed.workflows) {
    const file = z.object({ sha: z.string(), encoding: z.literal("base64"), content: z.string() }).parse(await provider(api,
      `${path}/contents/${workflow.path}?ref=${encodeURIComponent(branch)}`, token));
    if (file.sha !== workflow.sha) throw new AccessError("publication_workflow_changed");
    inspectWorkflow(new TextDecoder().decode(decode(file.content.replaceAll(/\s/g, ""))), new Set(reviewed.environments.map(environment => environment.name)));
  }
}

async function verifyEnvironment(path: string, token: string, environment: z.infer<typeof pinSchema>["environments"][number], ownerGithubId: number): Promise<void> {
  const url = `${path}/environments/${encodeURIComponent(environment.name)}`;
  const protection = z.object({ can_admins_bypass: z.literal(false), deployment_branch_policy: z.object({
    protected_branches: z.literal(false), custom_branch_policies: z.literal(true) }),
    protection_rules: z.array(z.object({ type: z.string(), prevent_self_review: z.boolean().optional(),
      reviewers: z.array(z.object({ type: z.string(), reviewer: z.object({ id: z.number() }) })).optional() })) }).parse(await provider(api, url, token));
  const required = protection.protection_rules.find(rule => rule.type === "required_reviewers");
  if (!required?.prevent_self_review || !required.reviewers?.length || required.reviewers.some(reviewer => reviewer.type !== "User" ||
    reviewer.reviewer.id !== ownerGithubId)) throw new AccessError("publication_owner_approval_required");
  const branches = z.object({ total_count: z.number(), branch_policies: z.array(z.object({ name: z.string(), type: z.literal("branch") })) })
    .parse(await provider(api, `${url}/deployment-branch-policies?per_page=100`, token));
  if (branches.total_count !== branches.branch_policies.length || JSON.stringify(branches.branch_policies.map(rule => rule.name).sort()) !==
    JSON.stringify([...environment.branches].sort()) || !environment.branches.length) throw new AccessError("publication_branch_policy_unverified");
}

export function publicationPlan(core: Core) {
  if (!core.env.WONG_GITHUB_PUBLICATION) throw new AccessError("publication_review_required");
  return pinSchema.parse(JSON.parse(core.env.WONG_GITHUB_PUBLICATION));
}
