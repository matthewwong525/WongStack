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
