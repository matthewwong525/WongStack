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

The full unfinished feature remains in draft [PR #242](https://github.com/matthewwong525/WongStack/pull/242), branch `installation-owned-memory-devices`, created from main `3d9f248d439d7108ec0d56fa0ac352f7aa0cdaf9` and subsequently incorporating main `78022828c37f6cf5be01f246c5c653ef2954322a`. [PR #238](https://github.com/matthewwong525/WongStack/pull/238) retains Artifacts hosting and migration. The frontend has been removed. Inactive machine authorization, renewal, transcript and durable capture/deployment source slices have passed their independent full remote gates. Current work converts the strict production routes, privacy-filtered data and automatic private clients/hooks together; unattended trusted setup integration and safe cutover remain unfinished.

The next source checkpoint connects core authorization, credentials and every CLI/query/hook/transcript path without Devices or GitHub/email authority, including minimal fail-closed retirement of old installer effects. Later work completes unattended trusted setup, server provisioning, evidence-backed migration, payload and recovery documentation. No cloud account requirement, Git migration, provider execution, new credentials or production publication follows from this checkpoint. Existing schema11 and historical source snapshots remain inactive and unchanged; their gates do not prove the revised runtime.

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

- **2026-10-03** — Exactc41f26454e5dcf043db4c3c8c9b80f1405910858 passed required app build37104394714/test37104394737; payload37104394729 stopped before scripts on one unused test destructuring binding. Repair1 omits only that unused slot in memory-machine-runtime-operator.test.mjs, preserving all genuine signed competitor and failure assertions; other twelve frozen source files unchanged. No local suites/build/lint, weakened checks or live/caller activation. Task3.0 remains pending its full exact retry gate.

- **2026-10-03** — Exact18393b7a83e29a996bd0ee86a631479a6a61a676 passed required app build37104546382/test37104546330. Payload37104546332 ran1230 scripts:1225 passed/five failed; coverage93.25% statements/lines,89.90% branches,94.93% functions with unchanged floors. Repair2 corrects a wrong-digest fixture to respect its length constraint, gives two fresh scope/revocation assertions distinct correctly signed attempts while retaining exact replay denial, and coordinates one added historical Worker-test fixture path to construct genuine schema4 from empty isolated state. Production13 code/allSQL unchanged; no assertion removal, guard/constraint disable, local suites/build/lint or live/caller release. Source task3.0 remains pending the exact retry gate.

- **2026-10-03** — Task3.0a/3.0b exact source gate passed atf17ef882722447ac3535891842db5323fceebad6: actual PUSH build37105196699/payload37105196665/test37105196661 SUCCESS;1230/1230 scripts,zero failures/skips,93.32% statements/lines,89.93% branches,95.02% functions with unchanged floors. Mark only the inactive runtime source tasks checked. No source13 implementation or SQL changed during the two fixture repairs; no snapshot/provider/private/route/client/CLI/capture/live activation followed. Continue the full pending feature with a fresh read-only dependency review of coupled Worker/data/client/capture boundaries before new path reservations.

- 2026-10-03: Read-only runtime dependency review found that legacy capture counts provider success envelopes and uses global max(id) links, while immutable version-ID bootstrap pins would strand ordinary redeploys. Under the existing full /ship authorization, prepare a separately guarded inactive schema14 capture/lifecycle receipt prerequisite, then convert routes/data/clients together. Preserve all original receipts and SQL1–13; no automatic repinning, caller/provider/private/live activation follows. Exact paths and negative tests are recorded in design/tasks.

- **2026-10-03** — Prepared task3.0c/3.0d for its independent exact remote source gate: fifteen frozen paths add inactive schema14 durable per-fact/session/tag/run outcomes, signed own receipt/absence recovery and trusted append-only deployment successors. SQL0001–0013 and the old manifests remain byte-identical. Fresh capture uses the current bearer and machine proof; receipt-only recovery cannot grant access, resume partial writes or resurrect revocation. Future full public routes will require separate immutable schema13 activation hashes plus executing-version validation without rewriting the base14 contract. The source slice installs no caller, route, CLI, setup or provider resource; all later acceptance stays pending.

- **2026-10-03** — Exact7c1a77635d6da9e8aad86e50fdcc8d0e3532f107 passed required PUSH app build37108012716/test37108012653, while payload37108012649 failed two positive capture tests: mixed private/shared replacement and explicit data-admin correction. Scripts1305 total,1303 passed; unchanged floors,93.48% statements/lines,90.14% branches,95.13% functions. No source task is checked from this result. Static diagnosis/repair remains scoped to the new capture slice; preserve all privacy, foreign-owner, omitted-write and partial-failure assertions. No local suites/build/lint, provider/private or caller activation.

- **2026-10-03** — Repair1 statically identified a case-insensitive SQL name collision between json_each alias `old` and the trigger `OLD` pseudo-row. Rename only that alias/value reference to `superseded`; regenerate the exact compiledDDL and SQL14 manifest digest1aafd85829342c97702cc00568302c8bf82cfa4bb262ab9c0f9a20ef842cd1dd. All failed positive and negative/privacy/partial assertions remain byte-identical, as do SQL0001–0013 and prior manifests. The separate SQL14 checkpoint has never been applied live; task3.0c/3.0d remain pending the exact retry gate. No local suites/build/lint/SQL execution or live activation.

- **2026-10-03** — Task3.0c/3.0d exact source gate SUCCESS at903d38ef5bea12f9aed009ce5e46e3d4a3adc14c: required actual PUSH build37108389384, payload37108389389 and app test37108389365 passed; skipped duplicate PR entries excluded. Scripts1305/1305,zero failures/skips;93.48% statements/lines,90.13% branches,95.13% functions with unchanged floors. Repair1 renamed only the SQL14 alias and regenerated its exact compiledDDL/manifest; all tests and SQL0001–0013/prior manifests stayed byte-identical. Final SQL14 digest1aafd85829342c97702cc00568302c8bf82cfa4bb262ab9c0f9a20ef842cd1dd. Complete only the inactive capture/deployment source tasks. No route/client/CLI/setup/provider/private/snapshot/live activation; full feature and real acceptance remain pending. Continue the coherent strict-core/data/private-client/hook conversion with a fresh read-only dependency inventory.

- **2026-10-03** — Reviewed the next coherent64-path core/data/private-client/hook source reservation, with minimal pending-only legacy setup/installer retirement. Choose a conservative50-statement invocation ceiling, fresh request-local live guards and automatic bounded capture chunks; no new paid prerequisite or inactive schema gate. Preserve literal14 contract/SQL and13 proof/activation history. Manual/retag/consolidation use exact owned receipts and honest private bookkeeping; retained legacy Worker remains test-only. All provider/private/live authority stays closed and tasks3.1–3.4 remain unchecked until exact full remote checks.

- **2026-10-03** — Core/client source handoff frozen for tasks3.1–3.4:67 reserved paths, aggregateSHA256 `d602183e372d109913d47776836a6683797e4444abdac38e3a9e5286f8462f67`,45 static syntax/import checks and unchanged SQL1–14. Full remote gate is pending. The current full protocol pair is `f5904f7b0c2b4948d50770833e8b2f7375364e005fc9ce650dd8176abd069ebb` / `80b3d04240149f664bae0e6daa56565e44f9097bec6aa369f4d26929df3ee708`; fresh activation precedes grants, and incompatible activations refuse. No native Windows/provider/runtime acceptance, trusted setup/migration completion or live authority is inferred. Session facts are skipped because the actual memory connection is closed; this durable handoff records the decisions instead.
- **2026-10-03** — Check: replace positive GitHub/email/direct-SQL admission and obsolete `.env` memory-key expectations with strict machine-grant/route/receipt denial tests. Preserve old Worker bytes only in isolated historical fixtures and retain current CLI search/digest/capture/upkeep/privacy cases against the real core. Provider permission-propagation assertions remain intact; no coverage floor/include/exclusion or CI gate is loosened. Main capability reconciliation remains task4.3; do not publish unimplemented setup or migration promises.

- **2026-10-03** — Core checkpoint39d41d443359c7604e9edecf3e1183b6234e811e: build37116109859 passed; payload37116109872 stopped before script tests on one unused provisioning parameter; app117 tests passed but test37116109888 failed unchanged100% coverage floors on two reserved-route decoder branches. Repair1 is limited to the unused parameter and meaningful malformed/deep encoded-path tests. Tasks3.1–3.4 remain unchecked and no provider/live phase is released.

- **2026-10-03** — Core repair1 exact7b9d52ba267b58f1641bccd9d6a7e93257846e6a passed required PUSH app test37116414183 and build37116414240. Payload37116414310 passed lint but failed76 of1248 scripts (1172 passed), with unchanged coverage floors. Static review identified malformed generated snapshot column names, a real missing-bucket binding detection bug, the removed generic Cloudflare helper used by the browser skill, and remaining fixture/expectation mismatches. Repair2 must retain all privacy, revocation, exact-receipt and failure assertions; tasks3.1–3.4 remain unchecked. No local suites/build/lint/SQL, provider/private/live phase or merge is released.

- **2026-10-03** — Repair2 is scoped to nine previously reserved source/test paths. Correct all65 generated table maps against final compiled ordered columns, restore the browser-only generic API helper without memory-token fallback, detect real R2 bindings while preserving custom configs, and repair exact pending/no-email/network/registry/aborted-request fixtures. Retain seed-success, no-memory-SQL, privacy, revocation, deadline, unknown-route and receipt assertions. Immutable SQL1–14/compiled protection DDL/protocol pairs and coverage settings remain unchanged. Static checks do not complete tasks3.1–3.4; full pushed app/payload/script retry is required.

- **2026-10-03** — Repair2 exact1fed5e38c46e30a78013c822116568ac79ff8e97 passed required PUSH app test37117573069 and build37117573073. Payload37117573070 stopped before script execution on four prefer-endsWith warnings in the new no-memory-SQL assertions. Repair3 changes only those four exact suffix checks in provision/server-install tests, preserving assertion semantics, other source bytes, all schema/proof history and unchanged coverage gates. This is the third and final automatic repair of this core save; source tasks3.1–3.4 remain unchecked until the full exact gate succeeds. No live/provider/integration release.

- **2026-10-03** — The user invoked /apply to resume the full feature after the core save stopped at its three-repair cap. Exacte7c4cedce5f8561223c19f0a2f8b2f3baf348593 passed PUSH app37117813395/build37117813401; payload37117813404 ran1271 scripts,1264 passed/seven failed, with unchanged93.71% statements/lines,89.55% branches,94.25% functions. Read-only diagnosis found unawaited transcript delegation bypassing the denial catch, lost candidate-review labels/guidance, a search assertion phrase collision and missing test-only preload propagation to detached descendants. Resume a separately reviewed bounded source correction and a fresh full remote gate; tasks3.1–3.4 remain unchecked. All schema/proof history, source-only/private/provider boundaries and the full unfinished setup/migration/live tasks remain intact.

- **2026-10-03** — Reviewed the resumed five-path core correction: await both transcript dispatches inside the denial boundary, restore candidate headings/open-thread guidance, make the search exclusion target only actual noisy rows, and propagate the test-only preload through detached descendants. Strengthened existing raw rejection checks with exact codes and preserved object/data/revocation outcomes; a missing-bucket test covers both dispatch branches. No new shipped override, privilege, schema/proof change or relaxed assertion/floor. Task3.1–3.4 completion still requires a fresh exact full remote gate; all later setup/migration/live tasks stay incomplete. Session facts remain skipped because no real authorized machine connection exists here.
