# Source checks

## Owner activation slice

2026-10-04: commit `8ba9ab9` on `smooth-repo-selection`, [draft change #264](https://github.com/matthewwong525/WongStack/pull/264). Integrated merged #259 baseline `c22d448`.

- App tests and coverage: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37215721936).
- App build/staging: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37215721938).
- Payload, script tests, generated hosted starter and release checks: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37215721956).
- No checks loosened. Corrected routing complexity without changing behavior, preserved hosted-starter transformation anchors, and indexed the new capability.
- Preview discovered through deployment readback: https://smooth-repo-selection-wongstack-staging.matthewwong525.workers.dev

Task 2.1 is complete. Source inventories 1.1/1.2 record live trust gaps; actual owner/GitHub/employee acceptance remains unchecked in 7.2. Employee enforcement, provider credentials, repository issuance and Access UI are not yet implemented/enabled.

Session fact recording was skipped: this checkout has no registered current session hook. No credential values were read or recorded for this slice.

## Current app authorization slice

2026-10-04: commit `37288ef` on `smooth-repo-selection`. Integrated merged memory-recall baseline #263 `1a7e238` alongside #259.

- App tests, coverage and quality checks: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37217406295).
- Build/staging: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37217406303).
- Script coverage, generated hosted starter and release checks: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37217406307).
- Two gate fixes: dependent-row cleanup in an empty-policy fixture, and a wiki reference to generated installed configuration. No schema or check was weakened.
- Preview discovered by deployment readback: https://smooth-repo-selection-wongstack-staging.matthewwong525.workers.dev

Task 2.2 is complete. Current primary reads guard described/bare dispatch and core self-identity; acknowledged grants/member removal affects subsequent requests with the same JWT. The committed runtime rollout latch remains absent; owner policy activation and provider/live acceptance are still pending. Discovery/readback is the next source task.

## Discovery and app readback slice

2026-10-04: commit `40a7a4c5`; merged current verification baseline #261 `cb6fae84` without changing source checks.

- App tests/coverage/quality: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37218387301).
- Build/staging: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37218387318).
- Payload/script coverage/generated starter/release checks: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37218387296).
- No gate fixes or loosened checks. Source review kept the client-only-app fixture independent of meta-only Tips, which does not ship.
- Preview discovered by deployment readback: https://smooth-repo-selection-wongstack-staging.matthewwong525.workers.dev

Task 2.3 is complete. Every discovery representation evaluates current membership/scopes before a conditional response; ETags include the caller, policy revision and exact response. Core readback includes frontend manifests and returns no authority before rollout. Provider connections, bootstrap, screens and live acceptance remain pending.

## Owner/provider source slice 3.1–3.4

Prepared the source, colocated SQLite/provider/form-identity tests, private owner consumer and owning setup guidance for the shared remote gate. No local tests/builds, provider mutations or live connection material were used. Tasks 3.1–3.4 remain unchecked until `/save` passes their required app/build/distribution checks.

The implementation keeps strict owner pins independent of the legacy policy latch, seals Access/GitHub material, filters all new private mini-app bindings, and requires reviewed routes/grants before login reconciliation. Durable policy intents prevent a crashed/unknown old write being ignored by later removal readiness; leases/generations constrain new mutations. Session acceptance, policy readback and token revocation/unknown expiry remain independent.

GitHub registration handles customer-owned organization Apps, distinct manifest/install callbacks, disabled webhooks and one-use current-owner/CSRF checks; pending organization approval resumes the same sealed App. Owner-only read metadata permissions are excluded from employee tokens. The supported synthetic fixture retains WongStack read-only CI and owner-approved protected preview/production jobs; the current shared-secret/dynamic-environment workflow is explicitly denied. These fixtures establish neither live endpoint permission support nor actual provider publication readiness; task 7.2 remains separate.

Continuation: `/api/access/setup` now supplies authenticated caller-only API/editing/provider availability for 4.x/5.x. Bootstrap must independently prove local connection and memory state. The explicit payload inventory includes the new migration and owner consumer. Task 6.x must additionally enforce production/staging management-secret separation in secret distribution tooling; current owning guidance requires a separate staging file with all production connection authority explicitly empty. Source runtime management already rejects staging. No scheduler was installed; owner retries drive durable work and existing schedules/config remain unchanged.

### Shared gate corrections (not yet passed)

First correction at `63f10b7`: split high-complexity functions, escaped workflow expressions in the synthetic fixture, and retained the remote coverage map for diagnosis. No limit or failure was relaxed.

Second correction responds to all failing checks at that head:

- App tests: all 172 passed; strict coverage exposed missing authority/race/failure cases. Added tests for those runtime cases and removed an unreachable optional-holder fallback after lease admission.
- Build/staging: Node-only SQLite/crypto fixture helpers were included by the Worker TypeScript project; moved them into `app/tests/employee-access/` outside runtime source, keeping their test consumers and unchanged build/coverage configuration. Added Cloudflare's required `ignoreBOM` decoder option.
- Payload/generated starter: all 166 generated-app tests passed; the same runtime coverage gaps failed its gate. The shared source fixes apply to the generated starter.
- The workflow-setting detector required a formal Check record for the diagnostic artifact step; recorded that addition in the proposal without lowering any gate.

These are source-related failures; no unrelated failed run was rerun. Provider authority, local execution and task completion remain unchanged until the remote checks pass.

Third correction at this shared gate fixes the two new test-fixture errors at `e20a371c`: the manifest assertion uses the helper's already-parsed response, and the deadline-race fixture advances sixty seconds beyond the ten-minute admission bound instead of depending on millisecond scheduling. Build/staging passed at that head. The app failure is limited to those two fixture errors; generated-starter checks failed on the same two fixture errors after script tests passed. All failed checks were read before this correction was pushed. Runtime authority and check thresholds are unchanged.

### Shared gate stopped after three corrections

At pushed head `f281e02cacaad1c72db4704a4726f675774a98f2`, all 181 app tests and all four 100% coverage metrics passed. Build/staging passed ([run](https://github.com/matthewwong525/WongStack/actions/runs/37223182155)). The app quality check failed ([run](https://github.com/matthewwong525/WongStack/actions/runs/37223182133)): `jscpd found too many duplicates (0.3%) over threshold (0.0%)`, identifying six lines in `app/worker/api/contract.ts:135` and `app/worker/employee-access/json.ts:14`. This is within the source diff, so an unrelated-run rerun is not applicable. No check was weakened.

The `/save` git-gate cap of three correction attempts has been reached for this checkpoint. No fourth source fix or new checkpoint was started. Tasks 3.1–3.4 remain unchecked; next authorized continuation should consolidate bounded decoding without changing API/access error behavior, then run a fresh gate before starting 4.x. Bootstrap and Access UI are still unbuilt; the deployed preview shows the existing shell only. Controlled provider acceptance remains unchecked. This final stop record is kept locally pending the next authorized continuation.

The generated-starter gate also passed all 175 tests and all four 100% coverage metrics, then failed on the same six-line duplication ([run](https://github.com/matthewwong525/WongStack/actions/runs/37223182201)). Script tests and coverage passed. Final waiter result: `FAILURE` for app test and payload checks. Exact-head deployment readback returned `https://smooth-repo-selection-wongstack-staging.matthewwong525.workers.dev` via deployment `6844702486`; this contains no Access UI/bootstrap. Branch `smooth-repo-selection`, draft PR #264, Status `in-progress`; session facts skipped because no current session hook is registered.

## Authorized continuation

The person approved continuing. The new checkpoint consolidates the bounded stream reader shared by API and access JSON parsing. Both callers preserve their existing size-limit and decoding errors; limits, malformed UTF-8 handling and reader cancellation remain unchanged. Existing tests exercise both wire contracts; no test or threshold was relaxed.

Continued checkpoint `d325c4cd`: app, build/staging, script checks and both generated starters passed. Payload release checks alone failed the instruction byte ceiling (`190955 >= 190845`): this branch adds owner-consumer distribution wording and merged #267 consumes the prior headroom. The first correction condenses only this change's Pack inventory sentence, retaining the helper/owner links and memory separation. This failure intersects the change; no unrelated rerun applies.

The first inventory trim at `5b30f919` remained 47 bytes over the ceiling; it was pushed before that static result was correctly handled. The corrective trim was verified before commit: instruction bytes `190806 < 190845`, with all helper links retained. This is the second correction in this resumed checkpoint; no threshold changed.

## Continued connection gate passed

2026-10-04, exact head `512e59a8dc24e330325ec77e106121308e726655`, branch `smooth-repo-selection`, draft #264, Status `in-progress`. Integrated #267 staging baseline `da9e7895` (VERSION 30.8.0) while retaining this change's Next minor entry.

- App tests/100% coverage/quality: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37226925438).
- Build/staging: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37226925447).
- Payload/scripts/generated starters/release checks: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37226925633).
- Bounded stream reading is shared, with original caller errors preserved. Two instruction-inventory corrections kept the merged context within unchanged limits; no checks were weakened.

Tasks 3.1–3.4 are complete at the source gate. Provider acceptance remains pending in 7.2; rollout and live issuance were not enabled. Bootstrap and UI follow next. Session facts remain skipped because there is no registered current session hook.


## Bootstrap source slice 4.1–4.3

Prepared a standalone built-in-only Node artifact and reused its transport from installed company calls. API setup works before a clone with zero apps; finite owner identity is distinct from authenticated employee readiness. Private state has 0700/0600 modes and lives outside checkouts. A private nonsecret folder locator preserves the canonical-origin connection after clone, including a different recorded public install alias, while later public-routing changes still require reconnection. No credential enters the prompt, Git argv/URL/remotes, tracked files or hook/build environment.

Synthetic source tests cover independent app-only status, headless/expired login (the existing transport tests), missing connections, redirect refusal, issuance/renewal/removal races, same-origin employee identity changes and lost-response receipts, callback destination checks, protected private file modes, clone/fetch/feature push, conflicting/dirty folders, encoded REST lookup/create/update, exact-head checks/status pagination and settled-gate semantics, preview commit evidence, unsupported endpoints, and unchanged personal delivery gates. These tests have not been run locally. Tasks 4.1–4.3 remain unchecked until the parent completes the remote gate.

Static payload links, OpenSpec configuration, JavaScript syntax and context checks pass. Instruction headroom is 121 bytes at this source state; the new transport link and employee `/ship` guard were offset inside their touched guidance. No source check was loosened. The artifact is supplied by an exact passed public source commit and digest; the later setup-prompt slice must pin that actual passed artifact. No live provider credential was read, created or changed. Controlled empty-folder/provider acceptance remains separate in 7.2.
