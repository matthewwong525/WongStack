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
