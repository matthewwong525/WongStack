# Automatic memory for each machine and the team

**Status:** in-progress

**Branch:** installation-owned-memory-devices

**Open questions:** none

## Why

Memory should be captured during normal chats without a separate approval app. Each authorized machine needs its own private notes and access to shared team knowledge, independent of GitHub or a hosted WongStack account.

## What Changes

- **Just use your assistant.** Normal chats load and save memory automatically. Trusted setup connects the machine once; later sessions reuse and renew its private credential without browser approval or repeated sign-in.
  ```text
  trusted setup ──▶ connected machine
                          │
                    normal chats
                          │
                  load + save memory
  ```

- **Private to the machine, shared with the team.** Preferences, personal notes and private conversations belong to the machine. Shared work notes are available to other authorized machines in the same repository. An optional employee label helps attribution but grants no access and does not combine private histories.
  ```text
  Ana's laptop                  Bo's desktop
  private notes                 private notes
        │                             │
        └──────── team notes ─────────┘
                   this repository
  ```

- **Remove Devices.** No device list, matching-code screen or approval mini app is needed for ordinary memory use. A new machine receives access through trusted setup; an arbitrary clone or machine name cannot open team memory. The installation operator can revoke a machine, which immediately stops access and renewal.
  ```text
  authorized setup ──▶ machine credential ──▶ memory
  arbitrary clone  ──▶ no credential       ──▶ denied
  revoke machine   ──▶ old credential      ──▶ denied
  ```

- **Keep history safe when updating. BREAKING:** replace GitHub/email-derived access with installation-owned machine grants. Preserve authored notes and transcripts; review evidence before attaching old private history to a machine. Uncertain history stays restricted. The new runtime and safe cutover remain unfinished.
  ```text
  old notes + transcripts
           │
       preserve history
           │
    evidence-backed mapping
       ┌───┴────┐
       ▼        ▼
    machine   restricted review
  ```

## Capabilities

### New Capabilities

- `installation-identity`: stable machine principals and installation-controlled machine authorization; employee labels are optional metadata.
- `memory-devices`: unattended machine enrollment, scoped credentials, renewal and revocation; this capability has no Devices UI.

### Modified Capabilities

- `memory`: machine ownership, team privacy, automatic capture and safe replacement of GitHub/email authority.
- `cloudflare-provisioning`: pinned production-only memory routes and trusted machine setup.
- `install-onboarding`: unattended enrollment and honest readiness for the initiating machine.
- `payload-layout`: ship the complete machine-memory dependency set without an approval mini app.

## Impact

The full unfinished feature remains in draft [PR #242](https://github.com/matthewwong525/WongStack/pull/242), branch `installation-owned-memory-devices`, based on main `3d9f248d439d7108ec0d56fa0ac352f7aa0cdaf9`. [PR #238](https://github.com/matthewwong525/WongStack/pull/238) retains Artifacts hosting and migration. The frontend has been removed. Current work prepares the schema and trusted setup contracts for machine-only authorization; the core routes, client capture, setup integration and safe cutover remain unfinished.

The next source checkpoint adds a separate fresh-schema12 manifest, trusted initializer and one-use machine-grant operations, with durable completion and revocation guards. Later work connects core authorization, credentials, every CLI/query/hook/transcript path, trusted setup, server provisioning, migration, payload and recovery documentation. No cloud account requirement, Git migration, provider execution, new credentials or production publication follows from this checkpoint. Existing schema11 and historical source snapshots remain inactive and unchanged; their gates do not prove the revised runtime.

## Decision log

- **2026-10-02** — Asked where this belongs → chose regular WongStack; the user's correction explicitly excludes a hosted-service dependency.
- **2026-10-02** — Asked how far this work should go → chose a validated plan and review page only, in a separate workspace, then wait for review.
- **2026-10-02** — Asked whether the approval link should use whoever signs into the installation → chose the signed-in person and matching code, with no email prompt. This supersedes the earlier email-routing idea.
- **2026-10-02** — Assumed: this clean workspace at current local main is the requested separate workspace, because it is already isolated from the Artifacts experiment and other work.
- **2026-10-02** — Assumed: only owners change membership or link identities; memory admins retain all-memory visibility and global device revocation, because separating those powers limits accidental privilege transfer.
- **2026-10-02** — Assumed: first owner setup uses verified app login plus local installation-operator confirmation, because first-visitor or email-only ownership is unsafe.
- **2026-10-02** — Assumed: login-off installations pause memory enrollment, because they have no authenticated human to approve a computer.
- **2026-10-02** — Assumed: requests last 10 minutes, credentials 30 days, and human approval at most 90 days, because short enrollment and bounded unattended access balance usability and recovery.
- **2026-10-02** — Assumed: membership invitations grant prospective access only, and old ownership needs a separate reviewed mapping, because matching emails cannot establish historic ownership.
- **2026-10-02** — Assumed: this uses deterministic code for enrollment, renewal, membership and migration checks, because no model judgment should decide access.
- **2026-10-02** — Assumed: cutover invalidates old keys rather than accepting two authorization systems indefinitely, because removed people must not retain access through a legacy route.

- **2026-10-02** — Asked when an approved machine should require login again → chose approval expiry or revoked access; browser logout alone leaves the machine connected.

- **2026-10-02** — Asked whether to include this in #238 and work off its branch → chose to move this change to `github-artifacts` and implement with `/apply`; the feature remains regular WongStack, and the existing pilot evidence remains intact.

- **2026-10-02** — Agreed the hosted integration seam: platform-operated per-project Access uses the ordinary verified-human adapter; no cloud roles or email headers seed memory. Accepted version-1 nonsecret setup status/action fields, separate pinned app/memory origins and machine-scoped readiness. This session owns the next schema-only save; other implementation stays unstaged.

- **2026-10-02** — Schema checkpoint scope: only migrations, their tests/fixtures, migration guidance, release note and this active change. The user explicitly limited staged paths; full capability reconciliation and its areas mapping remain for the implementation checkpoint, so planned runtime behavior is not presented as completed. Task 1.1 remains unchecked until its remote gate passes. Session facts skipped because decisions are recorded here.

- **2026-10-02** — Schema gate passed at `15338e5eb8625260bafb6eafd89bf7df83a2be9b`: 983 script tests, zero failures, all required checks green; task 1.1 complete. No runtime or human acceptance claim. Gate result recorded locally for the next agreed checkpoint; no additional commit after handing back save ownership.

- **2026-10-02** — Defined the future trusted-process integration in [operator-contract.md](operator-contract.md): initialization, no-proof pending status, candidate inspection and explicit target/code owner confirmation. Signatures remain planned, not callable. Task 1.2 now has a strict human Access adapter and signed-token tests prepared for the other session’s serialized remote checkpoint; keep it unchecked until that revision passes. No shared installer/setup prose changed.

- **2026-10-02** — The checkpoint owner confirmed the required app test/build gates passed at `8b7795318905c112c8bae3e042f45294329aade0` and released dependent task 1.3. Mark only task 1.2 complete; overall payload/save result remains pending. Continue disjoint memory core work while that session retains all git and PR ownership.

- **2026-10-02** — Task 1.3 preparation adds atomic live-authorization guards, explicit membership/invitation/review controls, role ceilings and immutable identity-review evidence in forward migration 0009; 0007/0008 remain unchanged. New-person review does not inherit the retired person's history. Regression tests are written; task stays unchecked until the next remote gate.
- **2026-10-02** — Hosted bootstrap requires publication of the first private app before Devices is reachable. The planned initial owner-confirmation mechanism is the generic trusted-process CLI run by a platform operator with exact target/identity/code review through private input; hosted setup has a manual operator step until a separately reviewed customer interface exists. Initialization/status exports are the next prioritized operator/provisioning handoff, not callable yet.

- **2026-10-02** — The checkpoint owner reported all required source checks successful at `58d4ebc5b59ccaae165f0148748f1bed2fbf487b`. Freeze the prepared task 1.3 core, migration, fixtures/tests and five plan files for its next coordinated checkpoint; only syntax/static review and plan validation have run for that new slice. Task 1.3 remains unchecked.

- **2026-10-02** — Task 1.3 passed at `f4d71f35df5ebfa66708d6bb26cb1f16ad0e2437` with all thirteen approved paths unchanged and all required checks successful; mark that core slice complete. Initialization/status is the next dependency, without activating owner or device routes.
- **2026-10-02** — Prepared generic Node-free initialization/status exports, release-SQL digest checks, active deployment/resource/Access readbacks and forward migration 0010 with a final immutable bootstrap-completion receipt. The [operator contract](operator-contract.md) now distinguishes implemented inactive exports from planned owner commands. Exact paired memory Worker/hostname overrides are recognized, but closed placeholders stay closed until handler activation/probes.
- **2026-10-02** — Source fixtures cannot prove D1 REST rollback. Keep live initializer integration blocked on both the exact source gate and a manifest-owned disposable REST DDL/metadata rollback/concurrency probe; passing live observations are not an official future API guarantee. Partial writes without a complete receipt fail closed and require explicit inspection. All git/PR ownership remains with the coordinating session; no shared installer/setup/wiki edits or live initialization in this slice.

- **2026-10-02** — Task 1.3a passed at `b2ba7f45cdfa7c0b9bd2c3b2d3b7298ae009b7b1` (1160 script tests and all required app/build checks). Released only source probe preparation. [The exact disposable probe runbook](rest-probe.md) separates read-only planning, transport observations, and a separately coordinated initializer concurrency/retry phase. Use only the planned memory D1 DB with its original creation receipt, never either business DB; no extra resources or VM. Root retains provider/git ownership and adds the narrow probe coverage include without changing floors/exclusions. Probe PASS never releases integration or asserts an official REST guarantee.

- **2026-10-02** — Probe source gate passed at `3a6b9b6f1241cc926b9b9fb48b6a8cd3a0198614` with all required push build/payload/app checks successful. Updated the evidence records after source freeze release; task 1.3b stays unchecked pending separately coordinated transport and canonical initializer phases against the original-receipt-owned memory DB. Parent retains git/provider ownership and will supply the actual normalized target and protected active pins. No probe, live initialization, memory owner claim or integration handoff follows from this source PASS.

- **2026-10-02** — User requested moving the full memory/Devices change out of #238 because the combined PR is too large. Transplant all54 memory-only additions and four memory-only modified-file diffs onto fresh main `3d9f248`; split coverage and release notes, preserving all implementation bytes, prior source receipts and both accepted postgate documents. This is the complete unfinished feature, not a finished-foundation rescope. Keep status in-progress and remaining tasks unchecked; open a separate draft PR and require its independent exact remote gate. Merge only when the feature and human/live acceptance are ready. Artifacts hosting and Git storage stay in #238.

- **2026-10-02** — Check: `scripts/tests/.c8rc.json` adds only `scripts/pilots/memory-rest/*.mjs` to measured source for this standalone memory change. Existing source roots, includes, exclusions and coverage floors remain unchanged; the Artifacts-only hosted service include stays in #238.

- **2026-10-02** — User confirmed Devices should remain a mini app and asked for less screen text, then `/apply`. Keep signed-in account, matching code, requested access and expiry visible; use short actions and optional details for lifetime/logout explanations. Implement the frontend independently while core/runtime/live gates remain pending; absent protected handlers show unavailable and never a simulated grant.

- **2026-10-03** — User transferred saves and remote checks for separate PR #242 to this session. Checkpoint the concise Devices frontend, its tests/distribution docs and the three previously accepted postgate documents. Include open-page deadline updates and exact displayed code/scope confirmation; keep source gates distinct from runtime/human acceptance. Full capability reconciliation and areas mapping stay deferred with unfinished runtime, preserving the previously agreed source-only checkpoint boundary. Provider/private snapshots/live phases remain unreleased; no owner/device grant or full-feature readiness follows from this save. Session facts skipped because these decisions are recorded here.

- **2026-10-03** — Checkpoint `1dd61e55ca5b6ed141bf1b74c74760c9d5a28f2a` passed payload/script and release checks (1,104 tests), but app lint/type checks failed before UI tests ran. Repair by separating focused request/list screens, using keyed screen lifetimes and captured render time, and correcting the test selector; retain all existing limits and failure assertions. Tasks 5.1–5.3 remain unchecked pending their exact remote gate and UI evidence.

- **2026-10-03** — Repair checkpoint `d25479662f8ac427634843db4bc50319af313511` passed app lint with zero warnings/errors and ran 147 app tests: 143 passed; four Devices cases exposed incomplete lazy-route waiting and fake-clock test scheduling. Its build also found a request-status narrowing error. Correct the type branch and deterministic test setup without removing expiry, loading, revocation or privacy assertions; retain the remote gate and unchanged coverage floors.

- **2026-10-03** — User chose machine-private memory with shared team memory and asked to remove Devices because approval adds friction. This supersedes person-owned private memory, mandatory app login, matching-code approval and the 90-day human reapproval rule; remove the mini app and revise the full unfinished feature in place.
- **2026-10-03** — Assumed: machine identity is durable private OS-user state scoped to installation/repository, not a hardware fingerprint, because names and fingerprints do not prove access. Optional employee labels never authorize or merge memory.
- **2026-10-03** — Assumed: trusted setup enrolls the initiating machine and normal sessions renew automatically while its grant remains active, because the requested low-friction flow must still protect shared memory from arbitrary clones. Revocation requires fresh authorized setup, not automatic reenrollment.
- **2026-10-03** — Check: retire the Devices frontend together with its frontend-specific tests because that feature is explicitly removed. Keep generic mini-app routing/registry tests and all app/payload coverage floors, includes and exclusions; no test configuration is loosened.
- **2026-10-03** — Preserve schema0001–0011, source fixtures, immutable3a/2206/32a snapshots and private authority byte-for-byte. Their human-owner contracts are historical preparation; a separately coordinated forward schema/manifest/probe design is required before machine-only runtime activation. Current source slice is removal and planning only; all provider/private phases remain reserved.

- **2026-10-03** — Removal checkpoint: source-only scope is the retired frontend, payload/docs/release/retirement inventory and the revised active plan. Existing source/runtime/operator/schema files are unchanged. Main spec reconciliation and areas stay deferred until the new runtime is implemented; memory session facts are skipped because the old join-capable client must not be invoked during this authorization redesign.

- **2026-10-03** — Removal source gate57398f01ff853fd48c26402f9a1f306f237bf3cd passed app build/test (117 tests,100% coverage) and script tests, but release retirement lint caught three old approval-URL references in the preserved inactive version1 setup contract/tests. Check: allow exactly those three files under the new retired-route entry until coordinated version2 replacement; keep the frontend retired, generic tests/coverage unchanged, and do not mutate reserved operator source or relabel historical contracts.

- **2026-10-03** — Removal gate passed at6ebd11d61ef3edf533b66f5f2fe09225e8bb5722: required push build37098029358, app test37098029362 and payload37098029380 all SUCCESS (117 app tests,1104 scripts,zero failures). Complete only removal tasks1.1–1.3. Machine-only backend, forward compatibility and live phases remain unfinished; no caller/provider activation or new memory connection is implied.

- **2026-10-03** — User invoked /ship for the full separate change. Resume /apply to complete pending source tasks before any archive/merge, preserving explicit private/provider phase limits. This is not authority to mark runtime or live acceptance complete. The isolated source branch is owned by this session; coordinate its next source reservation below without contacting the other session or modifying its files.
- **2026-10-03** — Assumed: the next source slice introduces fresh schema12 machine setup/grants with separate append-only receipts, while historical schema11 initializer/exports and SQL0001–0011 remain unchanged. Completed10/11 refuse without writes in this slice; their explicitly reviewed upgrade/adoption remains task4.2. New SQL is additive/inactive, so ordinary migration discovery cannot silently retire live legacy access.

- **2026-10-03** — Task2.2/2.3 source is prepared for its exact remote gate: additive SQL0012 and separate schema12 initializer/manifest, guarded one-use grants, reader private capture policy, machine principal ownership and retained revocation evidence. The full schema12 test covers every SQL while the historical11 test verifies its original eleven-file manifest. Pending tasks remain unticked until checks pass. No route/caller/cutover or private/provider phase is activated. Main-spec/areas reconciliation remains task4.3 so unfinished runtime promises are not published as shipped. Session facts are skipped because the current memory CLI can still automatically join through the retired GitHub flow; decisions are preserved here.

- **2026-10-03** — Exact38b73b1873543d660eaea6ff70e8fdc87b4c3c00 app test/build passed. Payload37101063701 reached1147 scripts:1146 passed and one new expiry fixture failed before its denial assertion because it placed expires_at before created_at. Coverage92.93% statements/lines,89.77% branches,94.68% functions; floors unchanged. Repair1 adjusts only that synthetic grant timeline, retaining SQL constraints and all security assertions. Task2.2/2.3 remains pending; no runtime or private/provider release.

- **2026-10-03** — Machine source gate passed at7a5c4a3231b7477cb03dac5e7539fc8f902bdf3a: full payload/scripts1147/1147, app test and build. The initial build retry failed during Cloudflare asset upload(code10013); only its exact failed job was rerun and passed on attempt2. Mark task2.2/2.3 complete as source preparation, preserving all private/live prerequisites. Continue task3 through a fresh build helper; its exact runtime/schema dependencies must be reviewed before edits. No merge/archive or sourcePASS-to-ready inference.

- **2026-10-03** — Read-only task3 dependency review found schema12 deliberately excludes renewal/activation and freezes its receipts. Chose a separate inactive forward schema13/runtime primitive gate before the coupled Worker/query/client conversion, because wiring hash-only trusted operators into public routes would bypass proof and authority boundaries. Exact thirteen-path reservation and contracts are recorded in design; routine signing choice is P-256/SHA-256 WebCrypto. Keep full pending runtime/capture/setup/migration/live tasks, original12 IDs/receipts and all SQL0001–0012 bytes. No provider/private phase or handler/caller activation follows from this source preparation.

- **2026-10-03** — Added one parent-owned dependency to the runtime reservation: the schema12 migration inventory test filters to its original twelve files; the new13 test must cover all bundled files/hashes. All previous denial/assertion cases and floors remain. A helper accidentally ran the old `memory.mjs areas --change` context lookup despite the explicit source-only prohibition. Read-only code inspection confirms SELECT queries and possible ignored team-header cache update, with no join/enrollment/provision/migration or durable memory writes on that path. No further memoryCLI lookup is allowed; no new target/private phase was invoked.

- **2026-10-03** — Prepared task3.0a for its exact remote gate: thirteen frozen source paths add inactive schema13, branded trusted/D1 contexts, raw capability plus canonical P-256 proof, signed self-refresh, append-only renewal, fresh-only activation/legacy reissuance guards and durable private transcript receipts. All thirteen hashes verified; SQL0001–0012 byte-identical to gated7a5. Tests include continuing-batch omitted-key failure, meaningful completed12 upgrade, valid signed competing attempts, expired/lost-response discovery and two-machine raw privacy. Task3.0a/3.0b remain unchecked until full remote checks pass; no route/client/CLI/provider/private/live activation.

- **2026-10-03** — Incorporated published main78022828c37f6cf5be01f246c5c653ef2954322a (29.11.0 workspace preservation; required main checks green) via forward merge6ebcb33. Resolved only the release-note conflict as the union of the memory Next major entry and shipped29.11.0 entry; VERSION and areas changes are inherited exactly from main, with no planned memory area mapping or manual numbering. Gate the resulting exact source head before continuing dependent work.
