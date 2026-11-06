# Evidence

## 1.1 Feasibility gate: runtime coverage (2026-11-06): failed

**Result: the gate fails.** workerd refuses precise coverage, so a line that only a runtime case reaches can't be counted honestly. The build stopped here; nothing below 1.1 was built, and the probe's source edits were reverted.

Tools: Wrangler 4.143.1 (the copy under `@cloudflare/vite-plugin`), workerd 1.20260926.1, Node 22.23.4. The probe diff is kept, git-ignored, at `.scratch/move-pretend-database-tests-probe.diff`; the conversion script is `.scratch/move-pretend-database-tests-coverage.mjs`.

### What was tried

1. **Inspector port through `createTestHarness`.** The harness has no inspector option: it sets `dev.inspector: false` for every Worker (`wrangler-dist/cli.js`, `resolveWorkerInputs`). The probe replaced `wrangler.unstable_DevEnv` with a subclass that sets `dev.inspector: { port: 0 }`, because the harness builds its dev environment through that export. With this, workerd started with an inspector.
2. **Direct connection to workerd** (`ws://127.0.0.1:<port>/core:user:runtime-test`). workerd closed the socket at the first message. Wrangler's DevTools proxy already holds workerd's one inspector client.
3. **Connection through Wrangler's DevTools proxy** (`ws://<proxy>/ws`, `Origin: http://127.0.0.1`). This connected, and `Schema.getDomains` lists `Profiler`. But:

   | CDP call | Answer |
   |---|---|
   | `Profiler.enable` | workerd answers it itself, with no `result`; V8's profiler agent stays off |
   | `Profiler.startPreciseCoverage` `{ callCount: true, detailed: true }` | error `-32000 Profiler is not enabled` |
   | `Profiler.getBestEffortCoverage` | works, but every function has `isBlockCoverage: false` |
   | `Profiler.stop` | works (workerd's own CPU profiler) |

   workerd takes `Profiler.enable` for its CPU profiler and never passes it to V8, so precise (block) coverage can't start.

### Best-effort coverage is not enough

The probe took best-effort coverage after all 7 runtime cases and converted it with `ast-v8-to-istanbul` and `oxc-parser`. The built script had 1,487 functions, 0 with block coverage. In `app/worker/employee-access/members.ts`:

| Line | What runs it | Statement hits |
|---|---|---|
| 56 `const member = parsed.data;` | the runtime save case | `[1]` |
| 55 `throw … "invalid_person"` | no runtime case | `[1, 1]` |
| 57 `throw … "owner_cannot_be_changed"` | no runtime case | `[1, 1]` |

A runtime-only line shows a hit, but so do throws no case reaches: best-effort counts a whole function once it runs. A 100% gate on these counts would call untested lines tested, so it fails the gate's purpose.

### Restart time (design 4)

One `server.update` restart with other vars (`WONG_ENVIRONMENT: "production"`), including migrations: **741 ms**. The restarted Worker read `production`.
