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
