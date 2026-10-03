# Tasks

Current intent: automatic machine-private memory and shared team memory, with no Devices mini app or human approval workflow. Draft PR #242 remains the full unfinished feature. Current authorization covers UI removal/planning and its remote source gate only; shared schema/operator/runtime dependencies and all provider/private phases require their next exact coordinated boundary. No local suites/build/lint. Old foundations are historical source preparation, not checked completion of the new machine model.

## 1. Retire approval UI and update the active plan

- [x] 1.1 Remove app/src/apps/devices/ including its UI-specific tests, restore the payload and mini-app guide to the hello example, and verify no live frontend/manifest registration remains. Do not change generic registry/routing tests or expose memory bindings.
- [x] 1.2 Refresh machine-first proposal/design/specs/tasks/review, retirement inventory and Next major release entry; verify strict change validation, current review generation and whitespace. Preserve all historical decision/source/snapshot receipts and SQL0001–0011 bytes.
- [x] 1.3 Run /save on PR #242 and pass exact remote app build/test and full payload/scripts gates for removal; record revision/check receipts without claiming machine runtime or live readiness. No main spec reconciliation/areas changes in this preparatory slice.

## 2. Machine authorization schema and operator contract

- [ ] 2.1 Coordinate exact next schema/operator/manifest/probe paths and trusted provisioning authority before edits. Deliver a forward compatibility plan for fresh/completed10/completed11 stores, stable machine principals, one-use grants, revocation generations, maintenance barriers and durable exact-attempt receipts; preserve prior immutable snapshots.
- [ ] 2.2 Implement the reviewed forward migration, machine authorization and trusted setup exports with source fixtures/tests and contract docs. Verify private namespace isolation, scope ceilings, partial/foreign/future schema refusal, expired/replayed/wrong-target grants, stale authority and nontransactional partial failure at every authority mutation point through /save.
- [ ] 2.3 Test competing/identical attempts and exact lost-response recovery without resurrecting removed authority; pass a full exact remote source gate before extracting a new digest-bound SQL/assets snapshot. Keep provider success separate from completed receipt proof.

## 3. Memory runtime and automatic capture

- [ ] 3.1 Implement strict production machine-auth route allowlist, pinned installation/repository/resource checks and immediate revision-based revocation across queries/R2/renewal. Land all route/method/encoding/unknown-origin/service-token/anonymous tests and runtime contract docs; verify via /save.
- [ ] 3.2 Convert facts/sessions/transcripts/search/digest/custom SQL to machine-private ownership and existing shared/read-only/admin policies. Test two machines, last-machine privacy, forged authors, cross-machine supersede/write attempts, private reader threads and shared facts without raw transcript disclosure via /save.
- [ ] 3.3 Replace GitHub auto-join/key lookup in CLI and hooks with trusted setup and private OS-user machine state. Preserve stable namespace across worktrees/restarts/rotation; test no implicit cloning admission, file locks/permissions/symlinks, wrong pins, removal denial and no legacy account-token fallback via /save. Land CLI/hook docs with this slice.
- [ ] 3.4 Preserve automatic chat capture, startup digest and credential filtering; add background renewal and machine-bound queue/retry/quarantine. Test normal chat without app interaction, offline/expiry/rotation failures, no false saved result, revocation during capture and no silent reenrollment via /save.

## 4. Setup, migration and distribution

- [ ] 4.1 Coordinate installer/setup/provisioning consumers for version2 machine-scoped pending-setup/ready/blocked result, exact IDs/origins and no secrets/retired action URL; implement unattended trusted enrollment and safe retries with tests/docs, verify no blanket admin key or cloud-role admission via /save.
- [ ] 4.2 Implement evidence-backed legacy fact/session/transcript mappings and maintenance cutover. Test email/label-only refusal, unmapped quarantine, immutable history, queued-write bindings, legacy Worker/key denial and rollback retaining revocations; deliver migration/recovery docs and remote gate.
- [ ] 4.3 Reconcile main capability specs and areas only when runtime promises are implemented; validate payload closure and fresh/update compatibility, custom app preservation, missing R2 behavior and no hosted/GitHub dependency via /save. Keep VERSION unchanged until ship.

## 5. Separately coordinated live acceptance

- [ ] 5.1 Obtain original-owned disposable memory target, exact active Worker/Access/binding/origin receipts and reviewed new snapshot/phase inputs before provider execution. Record every phase's authority and no inheritance from old unexecuted probes.
- [ ] 5.2 Probe actual REST transport rollback/concurrency, then initializer and grant mutation/receipt/lost-response behavior as separate reviewed phases. Retain incomplete/refused outcomes and observed-behavior limitation; no automatic integration handoff from PASS.
- [ ] 5.3 Verify trusted setup → automatic private/shared chat capture → second-machine shared read and private denial → unattended renewal → revoke → data/renewal denied, using disposable data. Verify all routes, preview isolation and operator recovery, without Devices/login/email steps for memory.
- [ ] 5.4 Run final independent full remote gates and documented recovery, publish an honest review/preview handoff, then request final ship only when the full feature is ready. No merge/archive now.

## Historical source receipts (not current task completion)

The previous schema/human-identity/operator/probe source checks below remain historical; their task numbers refer to the superseded checklist. No live phase ran, and no machine-only acceptance is inherited.

Remote schema checkpoint: `15338e5eb8625260bafb6eafd89bf7df83a2be9b` passed all required checks on 2026-10-02, including 983 script tests, coverage, lint and release checks. [Payload evidence](https://github.com/matthewwong525/WongStack/actions/runs/37023723281). This proves task 1.1 only; runtime and human acceptance remain pending.

Task 1.2 passed the required remote app test/build checks at `8b7795318905c112c8bae3e042f45294329aade0` on 2026-10-02. The checkpoint owner subsequently confirmed all required source checks passed at `58d4ebc5b59ccaae165f0148748f1bed2fbf487b`. This does not imply Devices acceptance. The generic operator exports and their activation gates are specified in [operator-contract.md](operator-contract.md).

Task 1.3 passed all required remote checks at `f4d71f35df5ebfa66708d6bb26cb1f16ad0e2437`: [payload/script run 37030645368](https://github.com/matthewwong525/WongStack/actions/runs/37030645368), app test run 37030645357 and build run 37030645434. All thirteen handed-over paths were unchanged from c4d4a0c. No public routes or device flow are activated by this slice. Initialization/status passed task 1.3a at `b2ba7f45cdfa7c0b9bd2c3b2d3b7298ae009b7b1`: build 37036518938, [full payload/scripts 37036518981](https://github.com/matthewwong525/WongStack/actions/runs/37036518981), app test 37036518884, all successful. The script gate passed 1160/1160 tests with 92.36% statements/lines, 88.65% branches and 94.33% functions. Live invocation remains blocked on the separately coordinated disposable probe below.

The probe source gate passed at `3a6b9b6f1241cc926b9b9fb48b6a8cd3a0198614`: [build 37039809409](https://github.com/matthewwong525/WongStack/actions/runs/37039809409), [payload/scripts 37039809449](https://github.com/matthewwong525/WongStack/actions/runs/37039809449), and [app tests 37039809448](https://github.com/matthewwong525/WongStack/actions/runs/37039809448), all required push checks successful. Skipped duplicate PR runs are not gate evidence. Task 1.3b remains unchecked: neither live phase has run, and the exact owned memory target/active pins are still awaiting the provider-owning session. No source result releases consumer integration.

The independent split source gate passed at32a61b9c686905c09a2778dea8ec388265cd08f0 (1104 scripts, app build/test). The former Devices UI source gate passed ate9b5db6378c422355183cfe27b1aabbf309c8195: push build37093784686, app test37093784742 (148 tests,100% coverage), payload37093784828 attempt2 (1104 tests). The first payload attempt hit an existing review-page browser timeout; exact failed-job rerun passed without source changes. These receipts remain true but the UI is now intentionally retired.

Removal source gate passed at6ebd11d61ef3edf533b66f5f2fe09225e8bb5722: actual push build37098029358, app test37098029362 (117 tests,100% coverage), payload37098029380 (1104 tests,0 failures), all SUCCESS. Duplicate skipped PR runs are excluded. This completes current task1.3 only; all machine-runtime and live acceptance tasks remain pending. The three inactive version1 URL references are explicitly scoped exceptions in the retirement inventory until reviewed version2 replacement. No runtime, provider, new snapshot or consumer activation followed.
