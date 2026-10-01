# Try Cloudflare Artifacts for hosted projects

**Status:** in-progress

**Branch:** github-artifacts

**Open questions:** none

## Why

Hosted WongStack could create and manage a customer's project without asking them to set up GitHub. A disposable trial will show whether Cloudflare Artifacts can support the full change-and-publish flow before we move customer projects.

## What Changes

- **Try one project in the platform's Cloudflare account.** Use made-up people and data, with a second empty repository to check that access stays inside the right project. The trial does not change customer signup or existing projects.
  ```text
  public WongStack template
             │
             ▼
  disposable hosted project
             │
     agent makes a change
             │
             ▼
  checks ──▶ preview ──▶ owner approves
                              │
                              ▼
                      trial site updates
  ```
- **Prove publishing needs the owner's approval.** A passing preview must identify the exact change. A failed check, a newer change, or a direct push without approval must not update the trial's published site.
- **Prove access can be removed.** A trial teammate can work on the project and use its test memory without GitHub. Removing them must stop their existing project and memory keys while the owner keeps access.
- **Prove the project can leave Artifacts.** Export its branches, tags, and history with ordinary Git, check the restored copy, and remove only the resources the trial created.
- **Give a clear adoption report.** Record what passed, failed, or could not be tested, the observed build times and usage, and the remaining work to connect this to the hosted service. Recommend migration only from live evidence.

**Non-goals:** customer signup or billing changes; moving existing projects; replacing the public WongStack repository; shipping Artifacts support to ordinary installs; building a review dashboard; proving a production identity system with test people.

## Capabilities

### New Capabilities

None. This is internal experiment tooling, opted out of spec deltas with `skip_specs: true`; it creates no supported product contract.

### Modified Capabilities

None. The existing stack-pack, delivery-gate, memory, and managed-workspace-access promises continue to apply to supported installations. The experiment runs separately.

## Impact

- Meta-only experiment files under `scripts/pilots/artifacts/` and tests under `scripts/tests/`, outside the payload inventory. No release or payload change is needed.
- Disposable Artifacts repositories, a controller/pipeline Worker, trial production and staging Workers, test D1 databases, and any pipeline-owned cache/container/workflow resources, all recorded by ID in one run manifest.
- Existing Cloudflare deployment helpers and memory request handling may be imported without changing their supported behavior; the experiment supplies its own identity entry point and credentials.
- A future product migration belongs in `wongstack-cloud`; this plan neither edits that repo nor changes its login, team membership, or installer.

## Decision log

- **2026-10-01** — Asked where to use Artifacts → chose hosted customer projects, keeping the public WongStack template on GitHub.
- **2026-10-01** — Asked the next step → chose a pilot before migrating customers.
- **2026-10-01** — Asked how far the pilot should go → chose a disposable technical trial covering previews, checks, publishing, access removal, and export without customer signup changes.
- **2026-10-01** — Asked where the pilot repository should live → chose the platform's Cloudflare account, to test a service whose customers need no GitHub or Cloudflare setup.
- **2026-10-01** — Assumed: keep the trial tooling in WongStack's meta-repo, because this is an isolated infrastructure experiment rather than a hosted-service product change.
- **2026-10-01** — Assumed: use a custom event-driven Cloudflare pipeline, because the trial needs automated provisioning and exact-change approval, while the documented Workers Builds connection includes dashboard steps.
- **2026-10-01** — Assumed: issue signed test sessions for stable owner and member identities, because real customer authentication is outside the chosen technical trial; report that limit explicitly.
- **2026-10-01** — Assumed: keep measured evidence with this change and raw output in the ignored scratch folder, because the result explains this migration decision rather than a general wiki convention.
- **2026-10-01** — User approved building and running the disposable trial before reviewing whether to publish the tooling. Use the documented public Sandbox image, a separate expiring management token, and a bucket-scoped snapshot token; no existing token or billing plan is changed. Probe deletion of the empty run namespace and report any refusal as a leftover. Contract checks run remotely before live execution; the branch remains unmerged.
- **2026-10-01** — Check: `scripts/pilots/artifacts/fixture/package.json` adds the disposable fixture's Node test and build commands, because the remote trial needs a small project with deliberate failure injection. The check detector flags this new package as a settings change; no existing check is removed, skipped, or weakened.
- **2026-10-01** — Remote checks passed on `90404de`, including all 23 pilot cases and 946 script cases. Live deployment exposed a guide/tool mismatch: pinned Wrangler requires `filter.repo_name` and `targets` with a workflow target. Keep the custom pipeline and use the installed schema; preserve the original error in trial evidence.
- **2026-10-01** — The first live workflow checked and deployed its fixture successfully, then the controller rejected its global `fetch` receiver. Wrap the adapter call so the Workers runtime keeps its receiver; repeat the preview case with a fresh commit. Live member Git/memory/session revocation and retained owner access passed before credential expiry.
