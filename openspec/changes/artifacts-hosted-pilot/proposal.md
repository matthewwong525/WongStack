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

- Meta-only experiment files under `scripts/pilots/artifacts/` and tests under `scripts/tests/`, outside the payload inventory. The retry adds one dependency-install step to the meta-only payload check workflow so its regression exercises the real pinned SDK. No shipped workflow, release or payload change is needed.
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
- **2026-10-01** — Live readbacks showed Artifacts history resolves a short branch name, while the ledger keeps its canonical `refs/heads/` form. Normalize that API input and reject non-branch refs. Workers supports manual redirects, so reject non-success identity responses without following them. Add regression cases and repeat the preview after both corrections.

- **2026-10-01** — Completed the bounded live cases with seven candidate attempts. Exact-commit previews, approved publication, access removal, real memory permissions and final Git restore passed. Both unapproved main previews failed in sandbox RPC; one left a running container, and a passing main preview remains unproven. Defer customer adoption and finish manifest-only teardown before reviewing publication of this experiment tooling.
- **2026-10-01** — All fifteen manifest-owned resources were removed. The namespace DELETE returned HTTP 204 and independent GET/list readbacks proved absence; update the provider parser to accept that acknowledgment while keeping absence readback mandatory, with a regression case. The final checkpoint records the completed experiment for review; publishing the tooling is separate from adopting Artifacts for customers.
- **2026-10-01** — Final source checkpoint `b9b94a7` passed every remote gate, including 26 pilot cases and 949 script cases. Trial report and cleanup are complete; retain the unmerged branch for the user’s review.
- **2026-10-01** — User asked to try again. Reopen the same experiment for a fresh bounded run focused on sandbox lifecycle reliability, two successful unapproved main previews, exact owner-approved publication, export and full cleanup. Preserve the first report; record the retry separately. Diagnose the pinned SDK before execution and correct a demonstrated integration defect without changing the custom pipeline, customer signup or publication safeguards.
- **2026-10-01** — Pinned source inspection found no demonstrated pilot defect. Keep source and dependencies unchanged, verify successful source gate `b9b94a7` and clean final gate `000c0b9`, and retry from fresh resources while observing container absence between candidates. Internal configuration/disconnect races are hypotheses only.
- **2026-10-01** — The fresh unchanged trial reproduced disposed-stub failure after green candidate checks. Upstream Sandbox PR #799 documents an idle-disconnect race matching the installed source; release 0.12.5 is the first patch containing its active-call guard. Apply only that compatible pilot SDK patch, force the CI dependency to the same version and match its public container image; keep the CI SDK, Wrangler, pipeline and run bounds unchanged. Prove the actual installed idle-call behavior remotely before redeployment, then compare live outcomes without claiming the prior root cause is established.
- **2026-10-01** — Check: the meta-only payload check workflow installs the locked pilot dependencies without install scripts before the script suite, because the pending-RPC regression must exercise actual SDK code. It uses the existing docs-only condition; no test or existing check is skipped, removed or weakened. The payload manifest explicitly excludes this workflow from installations.
- **2026-10-01** — Check: `.github/workflows/payload.yml` adds a locked pilot dependency install under the existing docs-only condition, because the regression must execute the real corrected SDK. No existing check is disabled or weakened.
