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

- [x] 9.1 Implement the source-only hosted service and documented admin/client APIs with tenant-isolated lifecycle, scoped credentials and revocation; add meaningful remote contract coverage.
- [ ] 9.2 Package and remotely build the real app with assets and migrations; verify memory is accurately unavailable/pending with no usable Devices or machine grants, and deploy exact immutable bundles using trusted runtime bindings and platform-managed Access and private site URLs, with regression tests for red checks, corruption, wrong tenant and stale approval/base. Ready-memory acceptance belongs to independent PR #242 and its later integration.
- [x] 9.3 Add bounded candidate queue/recovery, preserving ambiguous publication reservations; document service deployment, secrets, rollout and cleanup.

## 10. Prepared workspace and installed workflow

- [x] 10.1 Add contract-3 Artifacts preparation and verified GitHub mirror migration to the server agent, preserving existing jobs and private credentials; add meaningful bootstrap/reconnect/migration tests and server docs.
- [x] 10.2 Add the hosted client and route setup/save/ship/continue/apply/verify before GitHub-specific requirements; include installed context/credential handling, payload inventory, release entry and downstream contract tests.
- [x] 10.3 Update specs and wiki for one setup flow and hosted delivery; run payload links, OpenSpec config and context-budget checks.

## 11. Coordinated remote gate and live verification

- [ ] 11.1 Run /save for #238 and its cloud companion, require all remote checks, and fix failures.
- [ ] 11.2 Deploy isolated staging service/control-plane integration and run real empty-repo preparation → /wong-setup payload → remote actual-app build → private preview → owner-approved publish → next change; prove assets, tenant isolation, failed/stale publication safeguards and accurately unavailable/pending memory with no usable Devices or grants, using recorded exact heads. Ready-memory acceptance remains separate in PR #242 and its later integration.
- [ ] 11.3 Verify GitHub-to-Artifacts full-ref migration/export, scoped teammate access/removal and old-agent fallback; record PASS/FAIL/UNKNOWN, clean only owned trial resources with absence readbacks, and checkpoint final evidence.
- [ ] 11.4 Report both merge gates and rollout order, refresh review pages, and leave production publication/merge for the user.
