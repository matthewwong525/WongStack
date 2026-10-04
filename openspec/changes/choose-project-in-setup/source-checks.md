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


## Reduced app/API-only final source gate

2026-10-04, exact head `33762826f3352c8841d96c665cb27009bb80ac8b`, branch `smooth-repo-selection`, draft #264, Status `in-progress`. All remaining 2.x–5.x source, tests and documentation were completed before this single checkpoint. Automatic repository integration/editing/issuance was withdrawn; all repository authority is manual. Additive customer schema/data and independent memory remain intact.

- App: 173 tests, all four coverage metrics 100%, lint/unused/duplication checks PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37231798571).
- Build/staging PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37231798606).
- Payload: all 1,303 script tests, script coverage, generated installs and 37 release checks PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37231798585).
- Initial complete-source check failed two lint conditions/three rejection-message assertions. Repair 1 exposed consumer fixtures and asynchronous reload timing; repair 2 grouped those fixes plus zero-app/missing-installation checks. No limits or checks were weakened; no local implementation tests/builds ran.
- Immutable bootstrap ancestor `3e739ca8f82f7df90916ba0d31c078948682b5ba`, SHA-256 `2182ca2abac0e9b4163b60cedac38a830e1646a76dfa4fd717a6d45a1f4e35c4`. Anonymous public raw readback after the gate returned HTTP 200/17,173 bytes with that digest and refused redirects; download was not executed locally.
- Finished-preview walkthrough is ongoing. Task 6.3 needs independently verified controlled-installation authority; source checks and browser simulations establish no live email admission/session propagation. Session facts skipped: no current session hook.

These post-gate completion records remain local for the next publication checkpoint; no metadata-only push or duplicate branch-wide gate was added.


## Finished preview evidence and live acceptance boundary

Safe walkthrough at unchanged checked head `33762826f3352c8841d96c665cb27009bb80ac8b`: actual preview reports owner setup unavailable (setup 403; management 503) and withdrawn repository routes 404. Staging was rebuilt safely under an owned turn. Browser-only synthetic responses exercised owner add/readback/share/removal/retry, employee copy/fallback/allowed-denied navigation and zero-app setup on the deployed UI. Phone width/document width were both 390px; keyboard reached app selection and selected all fallback text. Private pictures and a detailed verification comment are attached to PR #264.

Overall verification is UNKNOWN for live authority, not a failure of the observed UI: no independently verified controlled owner/session/configuration exists for deployed current-grant API/discovery/call probes or actual email admission/expiry/removal/provider convergence. Task 6.2's safe UI portion is complete; its deployed-human API portion and 6.3 remain unchecked. The person was asked for a controlled app URL and independently verified owner email only; credentials must use the existing private setup flow. No response, approval or skip is inferred. No production provider mutation or fresh memory enrollment occurred.

Journey repairs corrected two guide/runtime command mismatches and a render wait; no source revision or implementation test rerun was needed. Six response-cookie text captures were scrubbed; later simulation captures needed no redaction. Post-gate completion/evidence records stay local until the next authorized publication checkpoint; no extra branch-wide gate was introduced for metadata.


## Selected live target prerequisite

The person selected existing WongStack and confirmed themselves as expected owner. Readonly machine-authenticated probes to `https://wongstack.matthewwong525.workers.dev/api/access/identity` and `/api/access/setup` both returned HTTP 404/application JSON. Public `main` contains no employee-access identity module. Thus this checked, unmerged change must be installed before actual owner identity/setup can be verified on that target. Those requests establish no signed-human authority. No production writes occurred; two response-cookie captures were scrubbed and the temporary probe folder was cleaned. Publishing approval was requested once after the finished source/preview work; it remains pending.


## Owner-first revision gate

2026-10-04, branch `smooth-repo-selection`, draft #264, Status `in-progress`. Source commit `a53d1e4b` holds tasks 7.1–9.2, built with their tests and not run locally. Merge `d2658dd4` integrates main through 31.0.1; conflicts in `CHANGELOG.md`, `scripts/retired-names.json`, `wiki/stack/README.md` and `openspec/specs/cloudflare-provisioning/spec.md` kept both sides, and `scripts/tests/server-install.test.mjs` followed main's removal of the server installer. Local static checks on the merged tree passed: payload links, OpenSpec config, retired names, spec validation and the context measure. The remote result for this head is recorded in PR #264's checks.
