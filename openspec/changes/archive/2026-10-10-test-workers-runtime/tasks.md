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
