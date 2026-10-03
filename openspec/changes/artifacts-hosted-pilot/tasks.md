# Tasks

## 1. Pilot harness and resource lifecycle

- [x] 1.1 Create `scripts/pilots/artifacts/` with pinned dependency declarations, project fixtures, preflight, and a resumable private run manifest; verify its files are outside the payload and the manifest records no reusable credential in committed output.
- [x] 1.2 Implement explicit-account provisioning and manifest-only cleanup for pilot Artifacts repos, Workers, D1, and pipeline resources; add contract tests under `scripts/tests/artifacts-pilot.test.mjs` for wrong-account rejection, pre-existing-resource rejection, interrupted provisioning, and retryable cleanup.
- [x] 1.3 Document pilot prerequisites and each harness operation in `scripts/pilots/artifacts/README.md`, including entitlement, credential delivery, estimated costs, run bounds, and teardown; verify every operation has a documented input and observable result.

## 2. Remote checks, previews, and publishing

- [x] 2.1 Implement the filtered Artifacts push event pipeline with exact-commit checkout, credential-free candidate checks/build, trusted pilot-only deployment configuration, and reported preview URLs; add tests for mismatched commit evidence, forged URLs, unexpected deployment targets, and duplicate events.
- [x] 2.2 Implement owner-authenticated approval records outside the candidate repo and serialized publication of the exact approved result; add tests proving failed or unreadable checks, unapproved main pushes, later commits, and outdated production bases cannot publish.
- [x] 2.3 Document the trial state transitions and the boundary between preview and publication in the pilot README; verify the fixture visibly reports its immutable commit and the D1 canary makes staging-to-production leakage detectable.

## 3. Trial identities, repository tokens, and memory

- [x] 3.1 Implement stable test subjects, signed scoped sessions, an owner-controlled roster, and tracked short-lived Git tokens; add tests for forged sessions, email-based impersonation, non-owner actions, expired sessions, and token scope selection.
- [x] 3.2 Implement the pilot-only memory join/roster wrapper around the unchanged shared memory handler against a disposable schema; add tests for shared/personal fact permissions, member writes under another identity, and GitHub-join fallthrough rejection.
- [x] 3.3 Implement complete member removal across all issued Git and memory keys and existing test sessions, with resumable partial revocation; add tests proving partial failure cannot report completion or issue fresh access while the owner remains active.
- [x] 3.4 Document test identity limitations, the real memory code exercised, and which hosted authentication, client, VM, and Access integrations remain untested; verify the README does not describe simulated identity as a customer login test.

## 4. Export and evidence tooling

- [x] 4.1 Implement full-ref Git export/restore into an independent local bare destination and non-secret evidence generation; add tests for a missing branch/tag, secret redaction, incomplete cleanup, and UNKNOWN outcomes never becoming PASS.
- [x] 4.2 Document export contents and excluded service metadata, plus the PASS/FAIL/UNKNOWN and cost-report formats; verify the report separates Artifacts usage from runner compute/cache usage and estimates from observed measurements.

## 5. Integrated live trial

- [x] 5.1 Run `/save` to complete the harness's CI coverage and required checks; verify the pushed commit's checks pass before relying on the harness and fix failures in this change.
- [x] 5.2 Preflight the explicitly selected platform account and present the exact disposable resource inventory, current cost estimate, and finite run bounds; verify access and paid entitlement without billing changes or token widening, and report any missing prerequisite without treating it as a passed trial.
- [x] 5.3 Run the live repository and pipeline cases: provision, clone/push, green exact-commit preview, red checks, staging D1 isolation, direct main push without approval, stale approval/base rejection, owner-approved publication, and duplicate-event handling; record safe provider evidence and commit identity for every case in this change's `evidence.md`.
- [x] 5.4 Run live identity/access cases with owner and member test sessions: read-only push rejection, cross-repository fetch rejection, real test-memory read/write/privacy, complete member removal, refusal of all previously issued credentials, and retained owner access; record actual propagation time and distinguish test identity from real hosted-service integration.
- [x] 5.5 Export and restore all project refs/history into a clean local destination, verify identical refs/object IDs and `git fsck`, then disable triggers and remove every manifest-owned resource; record deletion readbacks or exact leftovers in `evidence.md`.
- [x] 5.6 Write the adoption recommendation with case outcomes, provisioning/build/revocation timings, measured usage and cost assumptions, cleanup receipt, and remaining hosted-service integration work; verify no customer migration is triggered and report an untested or failed core case as a reason to defer adoption.

- [x] 5.7 Checkpoint the finished evidence and review page with `/save`, verify the final remote checks, and leave the tooling unmerged for the user to review.

## 6. Fresh bounded retry

- [x] 6.1 Inspect the pinned CI/Sandbox source and previous RPC failures; correct any demonstrated pilot integration defect with focused regression coverage, and record evidence versus hypotheses in the design.
- [x] 6.2 Run `/save` for any harness correction and require all remote checks to pass before live execution; if unchanged, verify the prior source gate.
- [x] 6.3 Preflight the same explicit platform account, show the fresh exact disposable inventory and current estimate, then attempt two consecutive passing unapproved main previews under the original finite bounds; verify commit identities and production state for actual outcomes, stop after repeated provider failures, and record any unproven passing case as UNKNOWN. Inspect runner cleanup between candidates.
- [x] 6.4 Exercise owner-approved exact publication when a passing candidate exists; otherwise record it as UNKNOWN and prove failed approval is refused. Export all refs/history, stop triggers and workflows, revoke all run credentials and verify manifest-only deletion; record every outcome and any leftover in `retry-evidence.md`.
- [x] 6.5 Update the adoption recommendation with both runs, refresh the review, and checkpoint the finished retry report remotely while keeping tooling unmerged.


## 7. Tests in CI, previews in Workers Builds

- [x] 7.1 Add an opt-in split backend and scoped managed-build lifecycle support, preserving the custom backend and previous evidence. Document configuration and credential boundaries; add meaningful contract coverage for failed tests never starting Builds, exact-commit build receipt/preview validation, no Sandbox deploy calls, production approval safeguards, and connection/trigger cleanup.
- [x] 7.2 Run `/save` and require every remote check to pass before relying on the revised harness in the live trial.
- [x] 7.3 Conclude the managed-build setup attempt as blocked, with execution cases UNKNOWN in `workers-builds-evidence.md`; this requested execution is superseded by the user-approved direct-API trial in section 8. No managed build or preview was proven.
- [x] 7.4 Write the split-trial recommendation and `workers-builds-evidence.md`, refresh the review page and checkpoint with `/save`; verify the final remote gate and keep tooling unmerged.


## 8. One runner and direct API deployment

- [x] 8.1 Implement the opt-in `direct-api` backend and trusted version-upload adapter; document configuration and add meaningful contracts for one credential-free runner, red checks causing no upload, artifact integrity, immutable preview identity/bindings, production approval and no second Sandbox deployment. Preserve prior backends.
- [x] 8.2 Run `/save` and require all remote checks before live execution; fix demonstrated source failures without local test/build gates.
- [x] 8.2a Harden direct preview confirmation for controller-side propagation as described in the design; add meaningful transient/permanent identity contracts without repeating uploads or weakening exact identity.
- [x] 8.2aa Correct direct publication to explicitly upload a version then deploy that exact version, following the design and actual API schema; test receipt validation and retained reservations.
- [x] 8.2b Run `/save` for the propagation correction and require the remote checks before deploying it.
- [x] 8.3 Run the fresh live trial in the authorized platform account; prove consecutive green previews, red-check/upload isolation, unchanged production before approval, failed/stale approval refusal, exact approved publication, D1 isolation, duplicate events and access removal. Diagnose and correct failures, repeat boundedly until a working route is proven or an intervention-only blocker remains; preserve actual evidence.
- [x] 8.4 Quiesce, export and restore all refs/history, revoke all issued credentials and delete only owned trial resources with absence readbacks. Write `direct-api-evidence.md` with timings, limits, failures, outcomes, adoption recommendation and exact leftovers if any.
- [x] 8.5 Refresh the review page and checkpoint the finished trial via `/save`, require final remote checks, and keep tooling unmerged for review.


## 9. Hosted runtime and representative pipeline

- [x] 9.0 Record Artifacts as the default for new hosted workspaces and honor an explicit GitHub request through the supported GitHub route. Update the route guidance, release note and current spec scenario; inspect runtime routing and add behavior coverage only if executable selection changes. Retain existing origins and the personal setup route.

- [x] 9.1 Implement the source-only hosted service and documented admin/client APIs with tenant-isolated lifecycle, scoped credentials and revocation; add meaningful remote contract coverage.
- [ ] 9.0b Reconcile published main and contract 4 without losing Artifacts jobs or GitHub preservation; use the configured workspace home throughout source loading, preparation and result acknowledgment. Add meaningful custom-user, background-job and existing-project refusal coverage; require the exact combined source gate.

- [ ] 9.2 Package and remotely build the real app with assets and migrations; verify memory is accurately unavailable/pending with no usable Devices or machine grants, and deploy exact immutable bundles using trusted runtime bindings and platform-managed Access and private site URLs, with regression tests for red checks, corruption, wrong tenant and stale approval/base. Ready-memory acceptance belongs to independent PR #242 and its later integration.
- [x] 9.3 Add bounded candidate queue/recovery, preserving ambiguous publication reservations; document service deployment, secrets, rollout and cleanup.

## 10. Prepared workspace and installed workflow

- [x] 10.1 Add contract-3 Artifacts preparation and verified GitHub mirror migration to the server agent, preserving existing jobs and private credentials; add meaningful bootstrap/reconnect/migration tests and server docs.
- [x] 10.2 Add the hosted client and route setup/save/ship/continue/apply/verify before GitHub-specific requirements; include installed context/credential handling, payload inventory, release entry and downstream contract tests.
- [x] 10.3 Update specs and wiki for one setup flow and hosted delivery; run payload links, OpenSpec config and context-budget checks.

## 11. Coordinated remote gate and live verification

- [ ] 11.1 Run /save for #238 and its cloud companion, require all remote checks, and fix failures.
- [ ] 11.2 Deploy isolated staging service/control-plane integration and run, on a fresh workspace, real empty-repo preparation → /wong-setup payload → remote actual-app build through the shared check entry point → private preview → owner-approved publish → next change; prove assets, tenant isolation, failed/stale publication safeguards and accurately unavailable/pending memory with no usable Devices or grants, using recorded exact heads. Ready-memory acceptance remains separate in PR #242 and its later integration.
- [ ] 11.3 Verify full-ref export/restore, scoped teammate access/removal and old-agent fallback, and that an existing GitHub staging workspace is refused by Artifacts preparation with its origin unchanged and still saves as a pull request whose checks pass; record PASS/FAIL/UNKNOWN, clean only owned trial resources with absence readbacks, and checkpoint final evidence. No workspace is moved.
- [ ] 11.4 Report both merge gates and rollout order, refresh review pages, and leave production publication/merge for the user.

## 12. New workspaces only, one set of checks

- [x] 12.1 Close the wh1003 staging move trial from its own chat: stop the move with GitHub still selected, export, clean only owned resources with absence readbacks, and mark `hosted-trial-plan.md` and `hosted-migration-evidence.md` historical. Verify the staging workspace's origin and cloud record are unchanged.
- [x] 12.2 Remove the GitHub-to-Artifacts move from `server/prepare-hosted.mjs`, the agent's `artifacts` job (`githubRepo`, `legacyRepo`) and the hosted client; a folder holding a GitHub clone is refused with its origin unchanged. Keep the batched full-ref restore for export and fresh clones. Replace the move tests in `scripts/tests/hosted-preparation.test.mjs` and the agent contract tests with refusal cases; keep the restore cases.
- [x] 12.3 Add `.github/scripts/checks.mjs` with `test` and `build` verbs that own suite and app location, install, change scope, `npm test`, loosened checks, wiki links, staging/production parity and the credential-free build, as the design describes; add it to the payload inventory. Cover in `scripts/tests/checks.test.mjs`: no suite, docs-only skip, a failing step's exit code, base taken from the environment, and an unconfigured app.
- [x] 12.4 Make `.github/workflows/test.yml` and `deploy.yml` call that entry point, keeping checkout, Node setup, run summaries and the token-holding migrate/deploy steps; add a contract test that neither workflow nor `server/hosted/pipeline.mjs` names a check command of its own.
- [x] 12.5 Make the hosted runner command in `server/hosted/pipeline.mjs` run the same entry point from the exact commit, passing the candidate's base; a missing entry point is a failed check, never a pass. Extend `scripts/tests/hosted-runtime.test.mjs`: red entry point uploads nothing, missing entry point fails, base is passed.
- [x] 12.6 Update `wiki/stack/hosted-workspaces.md` (new workspaces only; export and removal), the gate in `wiki/development/the-change-loop.md` (one check list, two callers), `server/README.md`, `server/hosted/README.md`, the payload manifest and the release entry; run payload links, OpenSpec config and context-budget checks.
- [x] 12.7 Run `/save` and require every remote check: this pull request's own Test and Deploy runs prove the GitHub route through the shared entry point before the hosted trial in section 11 relies on it.

- [x] 12.8 Configure the hosted service's authenticated public HTTPS probes to other Workers through `global_fetch_strictly_public`; keep the original authorization, project isolation and Access checks.
- [x] 12.9 Run `/save` and require this service routing configuration and wh1003 closeout's exact full remote source gate before provisioning the fresh actual-site trial.

wh1003 was closed on 2026-10-03 after the user's explicit switch to new installs only. See [actual closeout](hosted-migration-evidence.md#wh1003-actual-workspace-trial-closed): no Artifacts job queued, GitHub stayed selected, the empty diagnostic repository was independently exported/restored and checked before removal, all owned resources/credentials returned absence readbacks, original staging settings were restored, and account/subscription/old server history were unchanged. The trial VM is deleted history; no surviving local checkout is claimed as a fresh CLI-origin probe. New operations@claymoo.com human sign-in reached staging test checkout; fresh provisioning/setup/site acceptance has not run.

Exact routing/closeout checkpoint 9799aca10dba3f320f220325ed15515feeffae43 passed required push Deploy37099568385, Test37099568389 and Payload37099568376 (duplicate skipped PR entries excluded). This is source acceptance only. Cloud aac44e46bf535fecd8c87aafb789fee0390b8aaa also passed; a later support-preservation-contract deployment replaced the shared cloud staging route before fresh provisioning. The actual-site walkthrough is held before test checkout submission or any wh1004 resource/credential create, pending a stable exact checked deployment or separately reviewed isolated staging environment. The wh1004 private inventory is read-only planning; no setup/site/memory acceptance follows from these gates.

wh1004 partial actual acceptance (2026-10-03): fresh human cloud sign-in and Sandbox checkout, one receipt-owned contract3/source9799aca server, normal randomUUID project allocation, successful ordinary Artifacts preparation job, ready scoped grant/repository and actual Paseo pairing. Cloud cbe54e6 passed its exact Deploy37133853382/Test37133853414 gate with1995 app cases and100%coverage; manual redirects fixed the evidenced workerd transport incompatibility without following Location or forwarding credentials. Claude login remains human-pending, and tasks9.2 and integrated site/publication/privacy acceptance stay unchecked. All trial cleanup remains bounded to90minutes from its actual server creation; production and independent PR242 memory are excluded.

wh1004 is now CLOSED before its90minute bound. Exact owned Git export/restore/fsck, server/repository/shared-resource/credential absence and original staging binding/private-file restoration passed; external staging code was preserved and production matched the baseline. The external16:00:32 publish invalidates later checked-branch revocation acceptance; only controller/guarded operator closeout is proven. Claude login/shared setup/site/publication/privacy remain unverified. Full evidence: [wh1004 closeout](hosted-migration-evidence.md#wh1004-fresh-cloud-preparation-trial-closed). No incomplete acceptance box is ticked.

wh1005 renewed trial (2026-10-03) is LIVE on exact source1bb2bae/cloud9059b32 after user approval and confirmed fresh staging hold. Native Sandbox checkout, receipt-owned source-pinned contract3 CX23, normal cloud UUID allocation, successful sealed Artifacts preparation and fresh Paseo pairing passed. Claude private sign-in remains pending. One server deadline 19:29:44 UTC with independent cleanup reserve; old trial resources/credentials remain closed. Tasks9.2/11.1–11.4 remain unchecked until their actual required evidence; no candidate/site/publication or memory readiness is claimed. See [current trial boundary](hosted-trial-plan.md#wh1005-renewed-fresh-workspace-acceptance--2026-10-03).

Current wh1005 acceptance: user-dependent checks are explicitly waived and SKIPPED/UNVERIFIED. Automated shared setup is blocked by an actual HTTP 502 during protected hosting configuration; remaining automatic acceptance tasks stay unchecked. Exact staging code/config was restored after external drift, with production unchanged.

- [x] 12.10 Repair the observed Cloudflare Access code 12130 failure using exactly the protected canonical hostname anchor plus the three actual Worker IDs; require the exact remote source gate before isolated service update, then retry actual customer setup. Keep all negative protection assertions.

- [x] 12.11 Resolve the installed hosted CLI entry through its real filesystem path and prove direct and `.claude` directory-alias execution with a subprocess test; require an exact remote source gate.

wh1005 CLOSED before its bound: actual setup and repository push succeeded; actual remote app assertions passed but normal parser/Git context defects failed the candidate. Export/restore, native cancellation/revocation and full owned teardown passed. See [actual closeout](hosted-migration-evidence.md#wh1005-actual-shared-setup-trial-closed). No preview/publication or complete end-to-end acceptance is claimed.

- [x] 12.12 Repair the demonstrated Knip allocation and missing Git context failures; source-gate trusted metadata preparation, exact base selection, tracked/revoked read credentials, failure/stop handling and an independently credential-free build snapshot. Preserve every shared analysis/audit and run full checks for an initial main save.
- [ ] 12.13 Separately validate the corrected actual remote pipeline under a newly reviewed finite trial, then finish private preview, automated privacy/publication/next-change acceptance and cleanup. Human-participation cases stay waived and SKIPPED/UNVERIFIED. No closed wh1005 resources or credentials are reused.

Source gate for task12.12: exact `b715234c6bf28fb03881caf0a34d98dc111f7ef7` passed required push Deploy37149848860/Test37149848847/Payload37149848859; 1,141 script cases, zero failures/skips, 92.42% lines and 88.57% branches with unchanged floors/includes/exclusions. Real local Git and actual pinned SDK overlay regressions passed remotely. Corrected provider/R2 pipeline acceptance remains task12.13, unexecuted.

- [x] 12.14 Consume both successful SDK log streams for preparation and build receipt readers, preserving diagnostic-size bounds without exposing stderr; prove both stream completions remotely so SDK sandbox destruction can finish.

Task12.14 source gate: exact `10666521b0a43ef81c16847c4b594ca1640beb94` passed required push Deploy37150461654/Test37150461701/Payload37150461761. Both preparation/build SDK log-stream completion regressions passed remotely; no new live trial or resource was created. Task12.13 and overall integrated acceptance remain pending.
