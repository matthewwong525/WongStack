# Move hosted WongStack projects to Artifacts

**Status:** in-progress

**Branch:** github-artifacts

**Open questions:** none; live deployment evidence is required before merge readiness.

## Why

Hosted setup should get a person into their repo and AI quickly. They should finish with `/wong-setup`, the same entry point used on their own computer, and save and publish without connecting GitHub.

## What Changes

- **Store hosted projects in Artifacts.** New cloud workspaces get their own project and scoped access. Existing GitHub projects can move with all branches, tags, and history verified before their remote changes.
  ```text
  cloud sign-in ──▶ personal Artifacts repo
                              │
                              ▼
                        repo + AI ready
  ```
- **Use one setup flow.** The cloud prepares the empty repo and coding agents. The person signs into their AI and sends `/wong-setup`; that installs the assistant and starts its site and memory. Personal computers use the same setup command with their own hosting.
  ```text
  cloud workspace       personal computer
          │                     │
          └─────────┬───────────┘
                    ▼
               /wong-setup
                    │
                    ▼
          assistant + site + memory
  ```
- **Save and publish the real app.** Remote checks build the actual site, including its assets and memory bindings. A passing preview identifies its exact commit; only an owner-approved passing result can publish. Failed or uncertain work stays unpublished.
  ```text
  save ──▶ remote checks ──▶ private preview
                                   │ owner approves
                                   ▼
                               publish
  ```
- **Keep each workspace private and removable.** Each project's login protects its site and previews. Project credentials cannot reach another project; removing a cloud teammate revokes repository and site access. Memory membership and device revocation remain explicit installation-owner actions.
- **Prove the migration before merging.** Keep the disposable pilot reports and add representative setup, build, preview, publication, migration, revocation and cleanup evidence. Failed and untested cases remain visible.

**Non-goals:** moving the public template off GitHub, changing billing, deleting existing customer GitHub repositories, or merging before the integrated checks and live trial pass.

## Capabilities

### New Capabilities

- `hosted-workspaces`: Artifacts-backed setup, remote checks, approval, privacy, and portable project access.

### Modified Capabilities

- `install-onboarding`: hosted setup uses its prepared empty repo and service authority.
- `server-agent`: contract 3 adds scoped Artifacts workspace preparation.
- `delivery-gate`: hosted repositories use the service gate while retaining exact-commit and approval guarantees.

## Impact

Payload client, setup and delivery skills; server agent and source-only hosted service runtime; representative app build packaging; release notes. The companion `artifacts-storage-onboarding` change in wongstack-cloud owns dashboard, tenant membership and orchestration. Both releases form one coordinated migration; this PR alone is not ready until that integration is verified.

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
- **2026-10-01** — Corrected SDK checkpoint `a5d2a7b` passed all remote gates, including both actual-installed RPC lifecycle regressions and 951 script cases. Recreate only the removed run-owned container application through the acknowledged controller deployment and repeat live previews with SDK/image 0.12.5.
- **2026-10-01** — Two patched candidates passed their tests but failed trusted previews with `OperationInterruptedError: The sandbox container stopped while the operation was pending`. Canonical readbacks found all patched-run instances inactive, unlike the original orphan. Stop after these two patched attempts; preserve the actual SDK regression fix but defer customer adoption because passing main previews and a repeat approved publication remain unproven. Final refs/history were restored successfully after trigger disable; finish full manifest cleanup and the retry report.
- **2026-10-01** — The retry is complete: three candidate attempts (one unchanged, two patched) all failed previews after green fixture checks. All fifteen logical resources, both old/new container applications and all eleven tracked credentials were verified removed/revoked, with no leftovers. Export restored branches, tag and object integrity. Keep customer adoption deferred and checkpoint the tooling plus both reports for review; no live trial preview remains.

- **2026-10-02** — User chose tests in CI Workflows and builds/previews in Workers Builds, and authorized implementing and running that split against fresh disposable resources. This supersedes the earlier restriction against pipeline substitution for the new run only. Preserve both prior reports and their failures. Keep the same explicit platform account, no customer changes, finite attempts, owner approval and full cleanup; tooling stays unmerged.
- **2026-10-02** — The revised harness passed every remote check at `e71b364` (959 script cases). Fresh split run `a1002b7e4` reached native repository connection setup, then the exact Artifacts request returned HTTP 400 / error 12002, `Invalid request body`, without a connection ID. The public provider enum omits Artifacts, but the response does not prove which field failed and the dashboard guide documents Artifacts support. Available browser routes stopped at security challenges without an authenticated session. Stop setup and keep green/red previews and publication UNKNOWN until an observed native connection path is available. All advertised Git refs/history were restored; all three created resources and four issued credentials were removed/revoked, with no leftovers. See [the split report](workers-builds-evidence.md); keep the tooling unmerged and adoption deferred.

- **2026-10-02** — The later permission probe verified an expanded temporary token could read the actual Artifacts repository, but the legacy Builds connection still returned 400/12002. A new Worker build-configuration POST also returned 400/12002 for the user-created `wongstack` namespace; its readback was 404. All owned trial resources and issued credentials were removed; the user namespace was preserved. These refusals do not identify the offending field or establish an entitlement defect.
- **2026-10-02** — User accepted the proposed single-container tests/build plus direct Workers API upload and asked to keep trying until a solution is found. Implement an opt-in `direct-api` backend, preserve previous reports, and replace the uncompleted managed-build execution task with this trial. Correct demonstrated failures and repeat with fresh exact commits within finite per-run limits; do not stop solely because two attempts failed. No customer changes, billing changes, dashboard steps, migration or merge is authorized. Temporary API credentials and manifest-owned resource creation/cleanup remain authorized; preserve the user's namespace.

- **2026-10-02** — Direct-backend source gate `0dfcd9e` passed all checks and 966 script cases. Fresh run `a1002d4f7` built its first commit in 6.182 seconds, then Workflows rejected the upload step configuration before any API upload. The installed runtime schema requires `retries.delay` whenever `retries` is supplied, even with limit zero. Add the missing delay while retaining zero retries and validate the actual installed schema in the regression; repeat with a fresh commit after the remote gate.

- **2026-10-02** — Corrected source `bbb7ea3` passed its remote gate. Its first live candidate built and uploaded successfully; the Workflow observed the correct preview identity after one wait, but the controller's separate immediate verification failed. A later fetch matched the SHA, and a new candidate completed all checks in 8.843 seconds. Add bounded retries only around the controller's identity-readiness rejection, preserving both identity checks, zero upload retries and exact approval safeguards.

- **2026-10-02** — Two consecutive main previews passed (8.843s and 9.214s); deliberate red checks caused no upload, stale approval was refused, staging writes stayed out of production, and Git/memory removal passed. Approved publication exposed a legacy upload-response mismatch: the successful production PUT returned `deployment_id` but no `version_id`, so the adapter retained its reservation and did not finish publication. Switch only the direct backend to explicit version upload and exact-version deployment; prove the final source in a fresh run after cleanup rather than resetting the existing reservation.

- **2026-10-02** — Source `215dc0d` passed all checks and 972 script cases. Fresh run `a1002e8k6` passed its first-ever preview in 27.794s, the next in 9.761s, red checks without upload and a third preview in 12.881s. The exact approved production version was deployed, but the API returned an ID-only POST acknowledgment, which our validator rejected before its detailed GET. Independent GET showed the expected version at 100%. Accept that observed response shape and retain mandatory exact-ID/version/percentage readback; preserve and clean the diagnostic reservation, then repeat from fresh resources.

- **2026-10-02** — Final source `e43c070` passed all remote gates and 972 script cases. Fresh run `a1002f9m2` proved two consecutive previews, blocked red/stale/outdated-base publication, exact owner-approved publication through the Workers API with no deployment runner, isolated databases, duplicate suppression, access removal and full-ref export. One candidate suffered a Sandbox interruption; a fresh commit passed without source changes. This proves feasibility, not production reliability. All fifteen resources and fourteen credentials were removed with no leftovers. Keep the tooling unmerged for review and recommend a representative hosted-app pilot before customer migration. A separate WongStack fork adds no useful isolation over this branch plus disposable Artifacts repositories; hosted-service integration belongs in its own repository.

- **2026-10-02** — Asked whether this work should adopt Artifacts or keep customer repositories on GitHub → the user confirmed merging #238 must be the storage migration, superseding the disposable-only scope.
- **2026-10-02** — Assumed: keep the public source on GitHub and preserve existing customer repositories as migration backups, because the request replaces hosted storage rather than the source distribution.
- **2026-10-02** — Assumed: use a source-only hosted backend with scoped service APIs and an installed client, because the platform's deployment authority must never enter candidate builds or customer VMs.
- **2026-10-02** — Assumed: cloud login protects proxied hosted sites and previews, with a trusted entry wrapper denying direct Worker access, because customer business content must remain private without per-customer Cloudflare setup.

- **2026-10-02** — Assumed: use platform-managed Cloudflare Access on isolated project Worker origins, because source verified app login supports installation-owned Devices and candidate JavaScript must never share the dashboard origin.
- **2026-10-02** — Assumed: memory starts pending owner/device approval through the concurrent installation-owned-memory-devices change, because cloud or service grants are not memory membership authority.

- **2026-10-02** — Check: `.github/workflows/payload.yml` installs the hosted service’s locked SDK without install scripts so its remote contracts exercise the pinned runtime. Existing checks and thresholds remain in place.

- **2026-10-02** — Checkpoint the prepared workspace/client and strict human Access adapter together to validate contract 3, hosted workflow routing and signed human evidence remotely. The dedicated hosted service, operator library, memory handler/Devices and integrated live acceptance remain incomplete; this slice is not merge readiness. Memory-owned files are included only from the explicit seven-path frozen handoff.
- **2026-10-02** — The preparation slice at 8b77953 passed app test/build but payload found four defects: contract-3 documentation fixtures and the new hosted capability's missing area mapping. Correct them without changing thresholds. The new source-only service will enter the next exact remote gate; its memory operator integration and real-app trial remain incomplete.
- **2026-10-02** — Check: scripts/tests/.c8rc.json includes server/hosted/*.mjs in measured code so service contracts cannot leave the new runtime unmeasured. Existing coverage floors are unchanged.
- **2026-10-02** — Bounded staging inventory and provider preflight are recorded in hosted-trial-plan.md. Use isolated resources and temporary credentials; all live acceptance and cleanup outcomes still require observed evidence.
- **2026-10-02** — Check: `scripts/tests/.c8rc.json` expands measured source to `server/hosted/*.mjs`, because the production service must be covered alongside existing scripts. Existing coverage floors and exclusions are unchanged. The preceding entry omitted the required backticks, so the remote check did not recognize that explanation; this entry supplies the exact path.
- **2026-10-02** — Checkpoint `7554b851a4e9a5ad6dbeee7e3f6d60b0f285d2d2` passed the app build; payload lint stopped on two hosted runtime warnings and app tests stopped before execution on the unrecognized coverage explanation. The installation-owned-memory adapter retains its successful exact app gate at `8b7795318905c112c8bae3e042f45294329aade0`; overall migration readiness remains incomplete. The companion cloud checkpoint passed 1,840 tests and its build, with unchanged coverage floors requiring further cases.
- **2026-10-02** — Checkpoint `58d4ebc` passed every required remote check after correcting the hosted lint warnings and coverage-reason format. Static walkthrough then found two first-install defects: planning-owned folders were rejected and an install record could precede trusted configuration. The initial owner/device URL also targets production, so an explicitly requested new-site install must finish its first exact private publication before enrollment; preparation alone and existing-site changes retain their publication limits. Memory readiness remains separate and requires this machine’s valid grant. Cloudflare’s documented 30-second Durable Object initialization gate cannot serialize long setup/publication requests; use a bounded operation queue while retaining durable reservations and checkpoints.
- **2026-10-02** — The first hosted save in a verified empty repository writes the initial commit on `main`; later changes use normal feature branches. This avoids relying on an unproven missing-main API response and permits an independently observed already-exact default-ref acknowledgment at first publication. Fresh Git authorship uses the verified requesting subject’s email; existing clone identity remains intact. Full cloud memory setup currently requires explicit platform-operator assistance, not an implied self-service owner grant.
- **2026-10-02** — Checkpoint `c4d4a0c97027fc48a3fc619c811b458969d679b4` passed app test/build. Payload stopped before script execution on one lint warning in the new queue fixture’s spread iteration; preserve its snapshot semantics with `Array.from` and rerun the exact script gate. No memory-owned file is changed by this repair, and task 1.3 remains pending script evidence.
- **2026-10-02** — Checkpoint `f4d71f35df5ebfa66708d6bb26cb1f16ad0e2437` passed every required remote check: 1,077 script tests, zero failures, coverage above unchanged floors, and app test/build. Release the memory core slice for its owner’s next initialization/operator task. Static route review found that plain folders outside Git were blocked before personal setup, while an Artifacts clone lacking private context could fall through to personal setup. Correct only the positively known plain-folder case; hosted origin/install hints must stop for reconnect and never become credentials or authority. Fresh local hosted clones currently require a verified private cloud/operator handoff; no self-service local grant endpoint exists.
- **2026-10-02** — Companion cloud checkpoint `2b9a2a5591b70e381a6c53ea00075a80e1864312` passed every required remote check after the explicitly continued selector repair. The next source checkpoint validates fail-closed setup routing and initial protected memory bindings. Generic initializer exports and canonical machine routes remain pending; native Access stays fully closed until the reviewed machine handler and exact exception can be proved on isolated resources. Read-only existing Access metadata confirms the documented narrow Worker-ID plus canonical-hostname override shape, without proving the new protocol or human login.
- **2026-10-02** — Source prerequisite `de16273c9901a8723ddfdeefeca73cd7855aad3b` passed all required remote checks. Static teammate walkthrough found an installed clone incorrectly calling owner-only setup. Same-project owners and teammates now resume through verified read-only workspace/status checks; mismatched projects stop, fresh members wait for the owner, and global device state never proves this machine ready. Preserve current main’s Windows setup release in the next serialized checkpoint. Canonical memory runtime, live acceptance and final rollout remain incomplete.
