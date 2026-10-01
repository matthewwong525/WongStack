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
- [ ] 6.2 Run `/save` for any harness correction and require all remote checks to pass before live execution; if unchanged, verify the prior source gate.
- [ ] 6.3 Preflight the same explicit platform account, show the fresh exact disposable inventory and current estimate, then run two consecutive passing unapproved main previews under the original finite bounds; verify reported commit identities, production unchanged, and runner cleanup between candidates.
- [ ] 6.4 Exercise owner-approved exact publication, export all refs/history, stop triggers and workflows, revoke all run credentials and verify manifest-only deletion; record every outcome and any leftover in `retry-evidence.md`.
- [ ] 6.5 Update the adoption recommendation with both runs, refresh the review, and checkpoint the finished retry report remotely while keeping tooling unmerged.
