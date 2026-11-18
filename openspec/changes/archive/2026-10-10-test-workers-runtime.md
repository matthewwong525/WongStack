<!-- openspec-archive v1 2026-10-10-test-workers-runtime -->
<!-- file proposal.md utf8 7227 -->
# Check the app in the Workers runtime

**Status:** ready-to-ship
**Branch:** testing-with-ai
**Open questions:** none.

## Why

Our app tests run in Node and imitate the database interface. They can pass while missing a difference in how the deployed app handles a request or commits a database change.

## What Changes

- **Check important requests in the same runtime the app uses.** Add a small local suite for signed requests, people access, and database saves, using a temporary database with the project's real migrations.
  ```text
  existing tests ─▶ local Workers checks ─▶ result
                          │
                          ▼
                 requests + temporary database
  ```
- **Reuse Wrangler and keep the added work short.** Use the tools the app already has, start one local runtime for the suite, and aim for the extra checks to take under 30 seconds on this host. Measure their time and memory before calling the change finished.
- **Run these checks whenever the app is tested.** They join the existing automatic checks and also travel with the starter app. A failure blocks publishing through the same checks as today.
- **Check that the new tests can catch a mistake.** A deliberately failing sample must make the runtime check fail for the expected reason. Record how much time the extra checks take.

Non-goals: changing app behavior, replacing existing tests, changing coverage limits, adding browser checks, optimizing the script suite, or calling live services.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-scaffold`: the starter's normal test command includes credential-free local Workers-runtime checks of request authorization and D1 state changes.

## Impact

- `app/`: a separate Node test configuration, temporary Worker build and database fixtures, a small request/D1 suite, and package scripts. No new dependency or runtime binary.
- `scripts/check-app-checks.mjs` and its tests: prove the additional gate catches a deliberately wrong runtime expectation; retain the existing coverage proof.
- The existing install-shaped app check exercises the new suite using only shipped files. No new workflow or deploy step.
- A short testing guide linked from the stack wiki, and a minor release entry in `CHANGELOG.md`; `/ship` numbers `VERSION`.

## Decision log

- **2026-10-10** — Asked whether to plan a small suite in Cloudflare's Workers runtime → chose Plan it, to catch runtime and database differences the current tests can miss.
- **2026-10-10** — Assumed: add a focused second suite, because the existing Node and DOM tests provide useful fast coverage and need not be migrated to address this gap.
- **2026-10-10** — Assumed: ship the suite with the starter app and run it through the normal test command, because the same runtime assumptions apply to installed projects and both delivery routes already use that command.
- **2026-10-10** — Assumed: use temporary local D1 bindings and synthetic signed identities, because these checks need neither a deployment nor a person's login.
- **2026-10-10** — Assumed: preserve the app's compatibility settings, including its ban on importing bindings globally; a test-only entry can pass bindings explicitly to the app and provide database setup/readback.
- **2026-10-10** — Assumed: leave the coverage policy and broader speed work for separate changes, because only the small runtime suite was selected.
- **2026-10-10** — Asked which dependency tradeoff to plan for → chose reusing Wrangler, avoiding another large runtime binary.
- **2026-10-10** — Asked about the finished plan → requested generally short test runs and a look at ClaymooApp for improvements. Keep this runtime addition small and measured; audit ClaymooApp separately without changing its code.
- **2026-10-10** — Assumed: target a focused-suite median below 30 seconds, including its Worker build, because the person wants short runs but gave no numeric limit. The target must be measured during implementation, not presented as achieved.
- **2026-10-10** — Assumed: use Wrangler's existing test harness and host-side binding access instead of the earlier test facade, because the locked Wrangler exports that API and it preserves explicit production bindings with less test infrastructure.

- **2026-10-10 — Check:** `app/package.json` adds a required runtime step after coverage and a focused command, without dependencies or changed coverage limits.
- **2026-10-10 — Check:** `app/vitest.config.runtime.ts` selects one sequential suite with bounded hooks and cases, no retries and no success when tests are absent.
- **2026-10-10 — Check:** `app/tsconfig.node.json` includes the runtime config. The existing Node test project already includes `tests/`, so assertions and helpers remain typechecked.
- **2026-10-10 — Check:** `app/knip.jsonc` reads both Vitest configs so new runtime entries are recognized while production unused-source checks remain.
- **2026-10-10** — Implementation and test authoring finish before the final local pre-check; acceptance evidence is recorded after that pre-check rather than running intermediate test gates.

- **2026-10-10** — Measured the first three credential-free runs at52.7s,36.8s and43.8s, above the30s budget. Reuse the Vite plugin's already-installed Wrangler instance, whose harness API was confirmed in the locked package, instead of loading a second large CLI module. Keep one build/session and all six behavior cases; expose phase timings directly for diagnosis.

- **2026-10-10** — Shared Wrangler reduced duplicate module memory but the busy-host median remained45.2s. Batch complete snapshots and fixture resets through real D1 calls, cache migration-derived table names within the session, and enable Node's built-in bytecode cache inside ignored `app/node_modules/.cache/runtime`. This adds no dependency or runtime binary; preserve every behavior assertion and temporary-runtime cleanup.
- **2026-10-10** — Check: `app/package.json` adds a required runtime step and focused command, because normal app checks must exercise workerd and D1; no existing coverage threshold or gate is removed.
- **2026-10-10** — Check: `app/vitest.config.runtime.ts` selects one sequential runtime suite, because one shared temporary runtime limits preparation cost; missing tests fail, retries are disabled and no existing suite is excluded.
- **2026-10-10** — Check: `app/tsconfig.node.json` includes the additional runtime configuration, because its Node setup must be type checked alongside existing configuration; no source exemption is added.
- **2026-10-10** — Check: `app/knip.jsonc` recognizes both Vitest configurations, because test-only runtime helpers are reachable through the new suite; production unused-source detection stays enabled.

- **2026-10-10** — The user authorized publishing this runtime-testing change and planning ClaymooApp speed improvements in its own workspace. Claymoo implementation remains a separate decision.

- **2026-10-10** — Archive checkpoint: implemented and locally verified on `testing-with-ai`; publishing the archived change as release 40.1.0 through the existing CI gate.

<!-- end proposal.md -->
<!-- file design.md utf8 14514 -->
# Workers runtime test design

## Context

See [proposal.md](proposal.md) for the motivation and scope.

`app/vitest.config.ts` runs Worker modules in Node and screen tests in a DOM. `app/tests/employee-access/connections.ts` applies actual migrations to Node SQLite but implements the D1 interface itself. That gives meaningful behavior coverage while leaving workerd and D1 binding semantics unchecked.

`app/package.json` has one sequential `npm test` chain. `.github/scripts/checks.mjs` runs it on GitHub, in the hosted runner, and locally. It also invokes `scripts/check-target-app.mjs` when the app changes. That script builds an install-shaped copy from the payload inventory and runs the same command. `scripts/check-app-checks.mjs` proves existing gates fail on bad samples when their settings change.

The scaffold inventory includes `app/` but excludes `app/wrangler.jsonc` and source-only sample apps. A runtime suite must work against both this repo and a provisioned install. Compatibility settings include `nodejs_compat` and `disallow_importable_env`; the latter deliberately requires bindings to flow through explicit request arguments. No product screen changes.

## Goals / Non-Goals

**Goals:** exercise the app's actual request entry and Access save logic inside workerd with a real local D1 binding; keep fixtures repeatable; add a failing-sample proof and record incremental runtime cost.

**Non-goals:** migrate the existing suites, add another coverage collection, test the deployed Cloudflare login wall or provider control plane, build the SPA for these checks, or introduce a general integration-test framework.

## Decisions

### 1. Reuse Wrangler, keep Node assertions

Use `createTestHarness()` from the app's existing Wrangler dependency. The published type declarations for the locked Wrangler 4.144.0 were checked on 2026-10-10 and export the harness, host-side binding access, and D1 migration support. Setup resolves Wrangler from the Vite plugin's existing module path, sharing its locked installed CLI rather than loading both installed versions. Its harness API was confirmed in the package declarations and exercised during implementation. No new Cloudflare test plugin, dependency upgrade, or lockfile change is required. The plugin alternative was rejected after the person chose to avoid another runtime binary.

Add a normal Node Vitest configuration at `app/vitest.config.runtime.ts`, selecting only `tests/runtime/runtime.test.ts`. Add `test:runtime` as `vitest run --config vitest.config.runtime.ts` immediately after the existing coverage run in `npm test`. Assertions and fixtures run in Node; requests run in workerd through the harness. Keep the original Node/DOM configuration and 100% coverage thresholds. Missing tests and startup failures are errors; retries are disabled. No second coverage collection, browser, new CI workflow or optional gate.

Use one test file and one harness session for all scenarios, with sequential cases. Build the Worker once, initialize migrations once, then reset only the suite-owned business rows and failure trigger before each case. Use one real D1 batch per reset or snapshot, and cache the migration-derived table names for the session. Node's built-in bytecode cache lives in ignored `app/node_modules/.cache/runtime`, reducing repeated parsing of the installed toolchain without another package. Bound hooks and request tests with explicit timeouts; never hide a startup failure behind a retry or skip. Await teardown even when setup or assertions fail.

The config filename intentionally starts with `vitest.config.` so shared settings classification recognizes it. Preserve the coverage proof's selection of the first Vitest step; the runtime proof selects the runtime step specifically.

### 2. Build only the real Worker, with isolated configuration

The production app registry uses `import.meta.glob`, so handing raw TypeScript to Wrangler's bundler is insufficient. Use the existing Vite and Cloudflare Vite plugin to build only the Worker environment through `createBuilder()` and `builder.build(workerEnvironment)`. Use a programmatic configuration with `configFile: false`, `envDir: false`, and an explicit temporary test Wrangler config. Select the Worker environment explicitly and fail if absent. Do not invoke the normal full app build, frontend transforms, type checking again, dev watchers, or browser asset compilation. Output lives in a temporary directory, never production `dist`.

Read only `compatibility_date` and `compatibility_flags` from the installed app's Wrangler JSONC through the existing `stripJsonc()` parser in `scripts/lib-wrangler-config.mjs`. Configure the real `worker/index.ts` entry, synthetic variables and local D1 directly. The temporary config has no deployed identifiers, remote bindings, custom build command or assets binding. Missing or invalid compatibility settings fail with a useful message. Point the harness at the generated temporary Worker config with an isolated root and explicit test values; neither build nor harness may load the app's secret files. Verify the configuration path and secret-loading behavior against the existing package APIs during implementation.

Give the suite a temporary local `DB`, synthetic owner email and Access audience/domain, and `WONG_ENVIRONMENT=staging`. Set the D1 migration directory to the project's actual `schema/migrations/`, and call `worker.applyD1Migrations('DB')`. Tests access D1 through `worker.getEnv()` for seeding and readback. Preserve `disallow_importable_env`: the unchanged production Worker receives explicit request bindings, and tests need no global Workers `env` import or test facade. There is no SQL setup route or identity bypass. These tests need no memory database, bucket, repository binding or deploy credentials. Fixtures use shipped apps such as `hello`, not source-only samples.

Close the harness, release build resources and remove temporary output/storage in teardown. Keep persistence out of the app's existing `.wrangler` state. Implementation must establish that the Worker-only output runs under the preserved flags before treating the behavior cases as verified; no switch to another runtime or new dependency is implicit.

### 3. Small set of observable checks

Organize tests into request authorization and Access/D1 behavior, with shared synthetic fixtures kept under `app/tests/runtime/`.

| Check | Request or action | Required observation |
| --- | --- | --- |
| Signed routing | Unsigned/forged-email requests; valid human and service assertions signed by a generated key | Protected API denies unsigned/forged callers; valid callers reach health; an unknown API answers 404 |
| First Access open | Owner requests `/api/access/status` on a newly migrated database | Response names the owner and practice environment; installation/catalogue records are created through the real D1 binding |
| Persist a member | Owner posts a new person with `hello` access, then reads status | Response and D1 member/grant/audit/revision records agree; the app granted is one that ships |
| Refused mutation | Ordinary signed employee posts a management change; owner posts without the required Origin | Both saves are refused; member/grant/audit/revision snapshots match the state before the request |
| Atomic failure | A test-only SQLite trigger aborts the audit insert for a member save, after earlier batch statements would have written | Save returns the existing failure response; revision, member, grant and audit records all remain as before the batch |
| Fixture isolation | A scenario writes a member; fixture reset precedes another scenario | The subsequent scenario starts from the documented baseline, and a second suite run gets the same result |

Generate signed tokens with Node's Web Crypto; the real Worker verifies them using workerd's Web Crypto. Stub only JWKS retrieval with the generated public key; the app still verifies signatures, issuer, audience and expiry. Fail on other outbound requests. Do not mock the application router, Access authorization, D1 sessions, prepared statements, batch execution, or migrations. Response assertions are paired with state readbacks so a success-shaped response cannot conceal a missing write.

The harness session shares local storage: reset the suite-owned business fixture rows before each test and await every setup/write/readback. Apply migrations to fresh temporary storage before fixture setup. Do not restart the harness or rebuild between cases. Retain a single generated signing key and known JWKS across cases; database state is the isolation boundary for this suite. A failure trigger must be removed by reset and teardown even after a failing assertion. Avoid importing Node SQLite helpers or the existing hand-built D1 adapter into this suite.

### 4. Type checks, quality tools, and a proof that runs

The runtime assertions are Node tests, so use the existing `app/tsconfig.tests.json` project rather than introduce conflicting Workers test declarations. Include the additional Vitest config in the config type check. Teach Knip about both Vitest configs and the build/setup helpers, retaining unused-source detection. Existing lint and duplication checks continue to run; helper code belongs under the test folder.

Extend `scripts/check-app-checks.mjs` with a runtime gate whose disposable fixture uses the shipped runtime settings and helpers, a minimal Worker at the expected entry path, a synthetic Wrangler compatibility config, and a minimal migration. Reuse the same temporary Worker builder and Wrangler harness as the real suite. Its runtime test successfully reaches that Worker, then makes an intentionally wrong assertion with a stable marker. The gate is proven only if the command fails naming that sample and marker. A build or harness startup error, no-test exit, or missing config must not count as proof. Regressions of gate discovery, missing runtime steps, and false proof results belong in `scripts/tests/check-app-checks.test.mjs`.

Maintain the old coverage bad sample independently. Document each changed check-setting file with a `Check:` Decision-log line during implementation, including the package scripts, new Vitest config, TypeScript projects and Knip settings.

### 5. Shipped acceptance and cost

Run the suite with the app and in the install-shaped copy, using only inventoried files and generated target configuration. Include a no-credentials/poisoned-credentials configuration check: unexpected environment keys and secret files must not enter runtime bindings. Verify the deployed build graph omits runtime fixtures and test configuration.

Record three focused local runtime runs, their individual wall times and median, plus one full normal test run. Include Worker build, startup, migrations, assertions and cleanup in focused timings, with phase timings to identify overhead. Target a median below 30 seconds on this host; this is an implementation budget, not an achieved result or portable timing assertion. If exceeded, reduce repeated setup or narrow redundant scenarios and report the remaining cost before presenting the change as finished. Record peak memory for the test process tree, including workerd, and verify no child process or temporary storage remains. Do not substitute parent-process RSS for total memory.

Use no fixed sleeps or real retry backoffs in fixtures. Unexpected outbound fetches fail, and only JWKS retrieval is stubbed. Keep runtime startup count at one. Broad script-suite optimization and ClaymooApp implementation stay separate; no additional packages or full test-suite runs are needed for this planning audit.

## Risks / Trade-offs

- Local workerd/D1 cannot prove hosted Access configuration, real JWKS availability or provider behavior → retain deployed verification and clearly label local evidence.
- Worker-only builds add preparation time and use Vite's environment API → build only the actual Worker once, keep production module transforms and measure the complete cost.
- A shared harness retains module state such as JWKS caches → keep identity fixtures fixed, explicitly reset business data and triggers, and verify repeat runs and fixture isolation.
- Secret-loading defaults could pull in app values → isolated temporary config/root, disabled Vite env loading, explicit synthetic bindings, and poisoned-value verification.
- Future migrations can introduce fixture dependencies → discover the actual migration directory and fail setup rather than maintain a hard-coded subset.
- Reusing dependencies avoids another binary download but still consumes CPU and memory while running → one runtime, bounded hooks, awaited cleanup and measured process-tree memory.

## Migration Plan

This is a minor payload release. Add the new files and package scripts together without changing dependencies; add a `## Next (minor)` changelog entry and leave `VERSION` for `/ship`. The Updating note says that normal app tests gain local request/database checks with no extra service login. Existing installs receive additions and reviewed adaptations through the normal sync process; locally edited test settings keep their normal protection. Removal, if later requested, is one coherent change to the script, runtime files and proof gate. No deployed data migration is introduced.

Add a short `wiki/stack/testing.md` page linked from `wiki/stack/README.md`, covering when to use unit tests, runtime checks and deployed journeys; the focused command; fixture reset; and the limits of local evidence.

## References

- [Wrangler integration test harness](https://developers.cloudflare.com/workers/testing/test-harness/)
- [Harness configuration](https://developers.cloudflare.com/workers/testing/test-harness/configure/)
- [Bindings, D1 migrations and outbound mocks](https://developers.cloudflare.com/workers/testing/test-harness/prepare-test-state/)
- [Vite builds of individual environments](https://vite.dev/guide/api-environment-frameworks#building-programmatically-with-createbuilder)
- [The restriction on importable bindings](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#disallowing-importable-environment)

## Review

The generated [review page](review.html) presents the proposal. Implementation and local acceptance are recorded in [evidence.md](evidence.md). The required local runner could not acquire the shared check lock; CI and the remaining publication gate stay with the parent.

<!-- end design.md -->
<!-- file tasks.md utf8 5195 -->
# Tasks

Complete implementation and test authoring in groups 1–3 before running automatic verification in group 4. Implementation boxes record source review, not passing checks. See [design.md](design.md) for fixture and assertion details.

## 1. App runtime configuration and fixtures

- [x] 1.1 Add Node `vitest.config.runtime.ts` and `test:runtime` using the existing Wrangler harness, called after existing coverage in `npm test`. Source review confirms no dependency or lockfile change, one sequential test file/session, separate discovery, explicit hook/test timeouts, no retries, no missing-test success, unchanged coverage limits and recognized config naming.
- [x] 1.2 Implement Worker-only Vite build and Wrangler setup/readback helpers under `app/tests/runtime/`. Source review confirms the actual Worker entry/glob transforms, one build/startup, isolated temporary configuration/storage, disabled secret loading, local D1 through host binding access, preserved compatibility flags, migration discovery, fixture reset and awaited cleanup without frontend build or dev watchers.
- [x] 1.3 Use the existing Node test TypeScript project for runtime assertions/helpers, include the additional config in config type checking and teach Knip about its entries. Source review confirms all test code/config are checked and no deployed source is newly exempt.

## 2. App runtime behavior tests

- [x] 2.1 Author signed-request tests using generated Node Web Crypto keys and a JWKS-only outbound stub: unsigned and forged-email denial, valid human/service health requests, and unknown API routing. Review confirms calls enter the real Worker logic and unexpected outbound requests fail.
- [x] 2.2 Author Access first-open, member-save/readback, employee denial and missing-Origin tests. Review confirms response assertions are paired with real D1 installation/member/grant/audit/revision readbacks and only shipped app names are used.
- [x] 2.3 Author the trigger-induced batch failure and fixture-isolation cases. Review confirms earlier writes would have occurred before the trigger, the asserted snapshots cover rollback of the whole save, and reset removes the trigger and prior scenario data.

## 3. Check proof and documentation

- [x] 3.1 Extend `scripts/check-app-checks.mjs` and `scripts/tests/check-app-checks.test.mjs` for the runtime gate, retaining the independent coverage gate. Review confirms the disposable fixture starts workerd before its marked wrong assertion, missing runtime steps/config fail, and unrelated startup errors cannot count as a caught sample.
- [x] 3.2 Extend the type gate's bad-sample proof to cover runtime assertions/helpers. Review confirms a wrong runtime-test type is detected in the existing Node test project alongside the existing source and Node-test type samples.
- [x] 3.3 Write `wiki/stack/testing.md` and link it from the stack hub; add the minor changelog entry with its Updating note. Review confirms commands and evidence limits match the implementation; leave `VERSION` unchanged and append `Check:` reasons for every changed settings file.

## 4. Verification after implementation

- [x] 4.1 Run the focused runtime suite three times and record whole-command durations, phase timings and median in the change's evidence. Confirm one build/startup per run, fresh migrations, consistent reset, preserved flags and no live requests; use poisoned synthetic secret/environment values to prove they are not loaded. Target a median below 30 seconds; reduce redundant preparation if exceeded and report the remaining cost. Measure peak process-tree memory including workerd and confirm no leftover processes, build files or storage after success or failure.
- [x] 4.2 In a throwaway app copy, introduce an authorization bypass and confirm the new refused-request case fails at its expected assertion. Remove the fault and confirm the same case passes. Keep the fault out of the working app and record evidence; this is one bounded proof, not a new mutation-testing tool.
- [x] 4.3 Run the normal app test command and `npm run test:checks`; verify both runtime assertion and runtime type bad samples fail for their intended reasons, existing coverage proof still works, and no required suite silently skips. Repair failures before reporting completion.
- [x] 4.4 Run `scripts/check-target-app.mjs` with its install-shaped copy and inspect a built app to confirm no runtime fixtures/configuration are deployed and no additional runtime package was installed. Record credential-free shipped acceptance and normal-suite wall time; no hosted login or live database operation is required.
- [x] 4.5 Run the repository's required local pre-check with `.github/scripts/checks.mjs --worktree`, including payload checks, and validate this change strictly. Keep CI as the publication gate through the normal save/ship flow; report local evidence as local only.

Evidence: [local verification](evidence.md). The required local pre-check completed; its payload lint issue was repaired and the failed check's prescribed rerun passed. Shellcheck is unavailable locally and remains a CI check. Strict change validation passed; CI remains the publication gate.

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 1481 -->
## ADDED Requirements

### Requirement: The scaffold checks requests and database changes in the Workers runtime

The scaffold's normal test command SHALL include a focused suite in the local Workers runtime, using temporary D1 storage initialized from the project's migrations. It SHALL check signed-request authorization and the committed or rolled-back state of an Access save. The suite SHALL reuse the existing app toolchain without introducing another test-runtime dependency. Running the suite SHALL require no Cloudflare credentials, contact no live service, and leave deployed data untouched. The suite SHALL fail on a broken expectation, failed initialization, or missing tests, and its test entry points SHALL remain outside the deployed app. It SHALL close its runtime and remove its temporary build and storage after execution.

#### Scenario: Runtime requests and saves work

- **WHEN** the shipped app's normal test command runs in a freshly installed project with no service credentials
- **THEN** the runtime suite exercises signed requests and Access saves against temporary D1 storage and passes only when responses and database readbacks agree with the expected behavior

#### Scenario: A runtime regression is introduced

- **WHEN** an app change admits a caller that should be refused or leaves a partially committed Access save after a database failure
- **THEN** the runtime suite fails the normal test command and the existing test check blocks publishing

<!-- end specs/app-scaffold/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-10

~~~
<!-- end .openspec.yaml -->
<!-- file evidence.md utf8 5972 -->
# Local verification — 2026-10-10

Implementation adds no dependency and makes no lockfile change. The same installed Wrangler used by the Vite plugin supplies the harness. A native Node bytecode cache under ignored `app/node_modules/.cache/runtime` occupied 6.5MiB after verification.

## Focused command

Three complete `npm run test:runtime` runs, including Worker-only build, runtime startup, real migrations, all six scenarios and cleanup:

| Run | Whole command | Build/start | Migrations | Peak process-tree RSS | Remaining child PIDs | Remaining temp directories |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 10.113s | 1926ms | 838ms | 849.6MiB | 0 | 0 |
| 2 | 10.509s | 1816ms | 1024ms | 832.8MiB | 0 | 0 |
| 3 | 8.836s | 1505ms | 745ms | 851.0MiB | 0 | 0 |

Median: **10.113 seconds**, below the 30-second implementation budget. Each run passed all six cases, built once and started one harness session. The emitted graph contained 61 production modules and no runtime fixtures or Vitest. Existing compatibility flags, including `disallow_importable_env`, were preserved.

A Linux `/proc` sampler followed all descendants of the command and summed their RSS, including workerd, at approximately 100ms intervals. This is aggregate process-tree RSS, not parent-only memory; shared pages can be counted in more than one process. No observed descendant or temporary runtime directory remained. Timings are host-specific, and the host load varied during verification; they are not a portable duration assertion.

The initial implementation loaded both installed Wrangler copies and read snapshots one statement at a time. Its first median was 43.783s. Sharing Wrangler alone still exceeded the budget on the busy host. Final setup shares Wrangler, batches complete snapshots/resets through real D1 and enables built-in bytecode caching. No cases, assertions, compatibility flags, coverage thresholds or retries were removed to meet the budget.

All three focused runs injected `RUNTIME_POISON_SECRET`, `SKIP_AUTH` and `CLOUDFLARE_INCLUDE_PROCESS_ENV` into the host process. Binding readbacks found neither the poison secret nor auth-bypass binding. Only synthetic test values were used, and the outbound stub accepted only the generated JWKS response.

## Behavior and gate proofs

- A throwaway app copy changed the actual Worker's unsigned-request guard to allow passage. The signed-routing case failed at its expected assertion: received 200, expected 401. Restoring the guard made the full six-case suite pass with poisoned `.env` and `.dev.vars` files in that copy. Binding assertions confirmed those files were not loaded.
- The failure/repaired-copy process tree left no child PIDs or temporary runtime directories. The whole two-command proof took 11.309s; its aggregate peak RSS was 912.2MiB, including the proof's Node wrapper. The mutation never entered the working app.
- `npm run test:checks` passed all seven gates: lint, four type samples (including a runtime helper), independent coverage sample, a marked wrong assertion after a successful workerd request, unused code, duplication and saved keys.
- All ten `scripts/tests/check-app-checks.test.mjs` tests passed. These include missing runtime settings/steps, startup errors and a source excerpt containing the readiness marker: none may falsely prove a runtime assertion was reached.
- Lint, `tsc -b`, Knip, duplication, saved-key and skill-action checks passed. No deployed source or original coverage limit was newly exempted.

## Normal and install-shaped checks

Two normal app runs on the busy host reached the existing Node/DOM suite and timed out in two unchanged Access screen files:47 of 49 files passed. Whole-command durations were 127.05s and 181.46s, the latter with the supported two-worker cap. Both existing screen files then passed a scoped one-worker retry:39 of 39 cases, 27.90s. No screen code, tests, assertions or timeouts were changed.

The install-shaped check passed: **TARGET_APP=pass**. It copied 416 shipped files, regenerated the bindings and ran the complete normal app command at its existing coverage limits, including the new runtime suite. It needed no credentials or live services. That check used `VITEST_MAX_WORKERS=2` on this host; its full runner took approximately 67.3s based on the log's creation/final-write timestamps, including copying and type generation. The standalone root command's earlier failure remains recorded above; it is not rewritten as an uninterrupted pass.

Payload links, wiki links, OpenSpec configuration and strict change validation passed. The repository-wide local pre-check returned exit7: **LOCAL_CHECKS=not run (another chat's checks held the turn for over 600 seconds)**. Nothing ran through that locked runner, and neither its lock nor the other chat's processes were changed. CI remains the publication gate; the parent retains the repository-wide payload/loosened-check gate.

## Final repository pre-check

The parent reran the required repository pre-check after the earlier lock wait. The root app command passed uninterrupted: 49 files and 361 tests, with 100% coverage, followed by all six runtime cases and the existing static checks. The Node/DOM phase took 43.15s; the runtime phase reported 5.24s inside Vitest (focused whole-command timing remains the table above). All seven bad-sample gates and the install-shaped app check passed again. Wiki links, skill-action checks and the complete payload script suite passed.

Payload lint found two unnecessary quote escapes in the new proof-test fixture. Removing the escapes preserves the fixture string. The prescribed rerun, `node .github/scripts/checks.mjs --worktree --only payload:lint`, passed with **LOCAL_CHECKS=pass**; no other checks were repeated. Shellcheck is not installed on this host and was explicitly skipped by the local runner; CI remains responsible for it and remains the publication gate. Strict change validation passed before archiving.

<!-- end evidence.md -->
<!-- file review.html utf8 47591 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its Ready section
  asks the chat to build, or to build and publish, by an action's name alone.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-10-test-workers-runtime</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:var(--bar, 76px); background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready, #ready .row { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
  #ready-says, #ready-confirm span { margin:0; font-size:14px; }
  #ready-says { font-weight:600; }
  @media (max-width:700px) {
    #ready, #ready .row, #ready-says, #ready-confirm span { flex:1 1 100%; }
    #ready button { flex:1; }
  }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-10-test-workers-runtime">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-10-test-workers-runtime</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Our app tests run in Node and imitate the database interface. They can pass while missing a difference in how the deployed app handles a request or commits a database change.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Check important requests in the same runtime the app uses.</b> Add a small local suite for signed requests, people access, and database saves, using a temporary database with the project's real migrations.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">existing tests ─▶ local Workers checks ─▶ result</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">                        │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">                        ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">               requests + temporary database</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Reuse Wrangler and keep the added work short.</b> Use the tools the app already has, start one local runtime for the suite, and aim for the extra checks to take under 30 seconds on this host. Measure their time and memory before calling the change finished.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Run these checks whenever the app is tested.</b> They join the existing automatic checks and also travel with the starter app. A failure blocks publishing through the same checks as today.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Check that the new tests can catch a mistake.</b> A deliberately failing sample must make the runtime check fail for the expected reason. Record how much time the extra checks take.</div></div></li>
</ol>
<p class="aside">Non-goals: changing app behavior, replacing existing tests, changing coverage limits, adding browser checks, optimizing the script suite, or calling live services.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-10</p>Asked whether to plan a small suite in Cloudflare's Workers runtime → chose Plan it, to catch runtime and database differences the current tests can miss.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-10</p>Assumed: add a focused second suite, because the existing Node and DOM tests provide useful fast coverage and need not be migrated to address this gap.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-10</p>Assumed: ship the suite with the starter app and run it through the normal test command, because the same runtime assumptions apply to installed projects and both delivery routes already use that command.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-10</p>Assumed: use temporary local D1 bindings and synthetic signed identities, because these checks need neither a deployment nor a person's login.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-10</p>Assumed: preserve the app's compatibility settings, including its ban on importing bindings globally; a test-only entry can pass bindings explicitly to the app and provide database setup/readback.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-10</p>Assumed: leave the coverage policy and broader speed work for separate changes, because only the small runtime suite was selected.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-10</p>Asked which dependency tradeoff to plan for → chose reusing Wrangler, avoiding another large runtime binary.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-10</p>Asked about the finished plan → requested generally short test runs and a look at ClaymooApp for improvements. Keep this runtime addition small and measured; audit ClaymooApp separately without changing its code.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-10</p>Assumed: target a focused-suite median below 30 seconds, including its Worker build, because the person wants short runs but gave no numeric limit. The target must be measured during implementation, not presented as achieved.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-10</p>Assumed: use Wrangler's existing test harness and host-side binding access instead of the earlier test facade, because the locked Wrangler exports that API and it preserves explicit production bindings with less test infrastructure.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag log">log</span></p><b>2026-10-10 — Check:</b> <code>app/package.json</code> adds a required runtime step after coverage and a focused command, without dependencies or changed coverage limits.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span></p><b>2026-10-10 — Check:</b> <code>app/vitest.config.runtime.ts</code> selects one sequential suite with bounded hooks and cases, no retries and no success when tests are absent.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span></p><b>2026-10-10 — Check:</b> <code>app/tsconfig.node.json</code> includes the runtime config. The existing Node test project already includes <code>tests/</code>, so assertions and helpers remain typechecked.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span></p><b>2026-10-10 — Check:</b> <code>app/knip.jsonc</code> reads both Vitest configs so new runtime entries are recognized while production unused-source checks remain.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-10</p>Implementation and test authoring finish before the final local pre-check; acceptance evidence is recorded after that pre-check rather than running intermediate test gates.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-10</p>Measured the first three credential-free runs at52.7s,36.8s and43.8s, above the30s budget. Reuse the Vite plugin's already-installed Wrangler instance, whose harness API was confirmed in the locked package, instead of loading a second large CLI module. Keep one build/session and all six behavior cases; expose phase timings directly for diagnosis.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-10</p>Shared Wrangler reduced duplicate module memory but the busy-host median remained45.2s. Batch complete snapshots and fixture resets through real D1 calls, cache migration-derived table names within the session, and enable Node's built-in bytecode cache inside ignored <code>app/node_modules/.cache/runtime</code>. This adds no dependency or runtime binary; preserve every behavior assertion and temporary-runtime cleanup.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-10</p>Check: <code>app/package.json</code> adds a required runtime step and focused command, because normal app checks must exercise workerd and D1; no existing coverage threshold or gate is removed.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-10</p>Check: <code>app/vitest.config.runtime.ts</code> selects one sequential runtime suite, because one shared temporary runtime limits preparation cost; missing tests fail, retries are disabled and no existing suite is excluded.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-10</p>Check: <code>app/tsconfig.node.json</code> includes the additional runtime configuration, because its Node setup must be type checked alongside existing configuration; no source exemption is added.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-10</p>Check: <code>app/knip.jsonc</code> recognizes both Vitest configurations, because test-only runtime helpers are reachable through the new suite; production unused-source detection stays enabled.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-10</p>The user authorized publishing this runtime-testing change and planning ClaymooApp speed improvements in its own workspace. Claymoo implementation remains a separate decision.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-10</p>Archive checkpoint: implemented and locally verified on <code>testing-with-ai</code>; publishing the archived change as release 40.1.0 through the existing CI gate.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button>
  <div id="ready" hidden>
    <div class="row" id="ready-choose"><button type="button" data-ready="build">Build it</button><button type="button" data-ready="publish">Build and publish</button></div>
    <div class="row" id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><span>Goes live, can't be undone.</span><button type="button" data-ready="yes">Yes, publish</button><button type="button" data-ready="cancel">Cancel</button></div>
    <p id="ready-says" role="status" hidden></p>
  </div>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, sending = false;
  function setLive(key) {
    live = key;
    if (!key) $('ready').hidden = true;
    $('copy').textContent = key ? 'Send notes' : 'Copy notes';
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  function sendNotes() {
    const notes = unsent(), n = notes.length;
    if (sending || nothing('sent')) return;
    sending = true;
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      sending = false; setLive(null);
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    ask('send', live, { text: bullets(notes).join('\n') }).then(function (r) {
      if (r.status === 429) { sending = false; toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      r.json().then(function (answer) {
        if (!answer || answer.sent !== true) { closed(); return; }
        sending = false;
        notes.forEach(function (note) { note.sent = true; });
        persist();
        toast('Sent ' + plural(n) + ' to the chat.');
      }, closed);
    }, closed);
  }
  $('copy').addEventListener('click', function () {
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── ready: on a reply link that offers both, the bar's second row asks the chat to build, or to build and publish ──
  // The page sends an action's name and the version of the plan it read; the link's opener fixed each message.
  let version = null, acting = false;
  function says(text) { $('ready-says').textContent = text; $('ready-says').hidden = !text; bar(); }
  function readyStep(step) {
    $('ready-choose').hidden = step !== 'choose';
    $('ready-confirm').hidden = step !== 'confirm';
    bar();
  }
  // One primary button in the bar: the notes button while a note is unsent or no build button shows, else the build one.
  // The page's bottom padding follows the bar's height, so a taller bar never covers the end of the page.
  function bar() {
    const el = $('copy').parentNode, ready = $('ready');
    const build = !ready.hidden && !unsent().length && !($('ready-choose').hidden && $('ready-confirm').hidden);
    $('copy').classList.toggle('primary', !build);
    all('[data-ready="build"], [data-ready="yes"]', function (b) { b.classList.toggle('primary', build); });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  // Unsent notes would change the plan the chat is about to build: say so. True when it spoke.
  function notesFirst() {
    if (!unsent().length) return false;
    says('Send or delete your notes first.');
    return true;
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  function act(name) {
    if (acting || !live || notesFirst()) return;
    acting = true; says('');
    const closed = function () { acting = false; $('ready').hidden = true; bar(); toast('This link has closed. Choose in the chat.'); };
    ask('act', live, { action: name, version: version }).then(function (r) {
      if (r.status === 429) { acting = false; says('Wait a few seconds, then tap again.'); return; }
      r.json().then(function (answer) {
        const a = answer || {};
        const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
          : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
          : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
        if (!line) { closed(); return; }
        acting = false; readyStep('done'); says(line);
      }, closed);
    }, closed);
  }
  $('ready').addEventListener('click', function (e) {
    const step = e.target.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || (step === 'publish' && !notesFirst())) {
      says(''); readyStep(step === 'cancel' ? 'choose' : 'confirm');
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) ask('alive', key).then(function (r) {
    if (!r.ok) return;
    setLive(key);
    r.json().then(offer, function () { /* no actions: notes only */ });
  }, function () { /* not live: the page copies */ });
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
