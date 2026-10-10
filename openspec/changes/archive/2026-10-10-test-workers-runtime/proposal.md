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
