---
slug: tests-belong-to-the-app
started: 2026-08-09
updated: 2026-08-09
consolidated:
---

# tests belong to the app

Implementation session for the `tests-belong-to-the-app` change. The plan arrived already written
(proposal, design, two delta specs, 15 tasks); this session executed it end to end and shipped
`10.1.0`. Why the change is shaped the way it is lives in its proposal and design — not repeated
here.

## What the repo looks like afterwards

- The repo root has **no `package.json`, no lockfile, no `vitest.config.js`, no `tests/`**. The only
  root files WongStack keeps for itself are `VERSION` and `CHANGELOG.md`.
- The suite is `app/worker/index.test.ts` (3 tests) and `app/worker/access.test.ts` (14 tests), run
  by `npm test` from `app/` against `app/vitest.config.ts`.
- `core.files` in `payload-files.json` no longer lists `package.json`. `.github/workflows/test.yml`
  is byte-identical and still core.

## Things worth knowing that the change docs don't carry

- **`app/vite.config.ts` cannot serve as the test config.** It loads `@cloudflare/vite-plugin`,
  which builds and serves the Worker; vitest picks up `vite.config.ts` by default, so a separate
  `vitest.config.ts` is what keeps the run free of dev-server machinery. Anyone adding tests to a
  Cloudflare Vite app will hit this.
- **`access.ts`'s `keyCache` is module-level with no reset hook, and shouldn't get one.** The module
  ships to adopters; exporting internals so a test can poke them is a worse trade than
  `vi.resetModules()` + `await import("./access")` inside `beforeEach`. That idiom is the general
  answer for module-scoped caches in shipped code.
- **The `scaffold` payload category copies `app/` as a whole directory** (`dirs: ["app"]`, with only
  `app/wrangler.jsonc` excluded). New files under `app/` need no manifest entry — a fact that is
  easy to get wrong, since `core` and `pack` are explicit file lists.
- **A test file under `worker/` breaks `tsc -b` until the build project excludes it.** `tsconfig.worker.json` extends the Node config, so it resolves modules as `node16` and demands a file extension on every relative import (`TS2835`); vitest resolves the Vite way and demands none. The two only meet because the build typechecks the whole `worker` directory. Excluding `worker/**/*.test.ts` from the build project is the fix — writing `./access.js` in the imports would bend the tests to a compiler that never compiles them. The same collision is waiting for the first test added under `app/src/` and `tsconfig.app.json`. This is only visible in CI, since nothing local runs `tsc -b`.
- **Node 22 runs the Worker's dependencies unmodified** — `atob`, `TextDecoder`, `crypto.subtle`,
  `Request`/`Response` are all global, so the suite needs no Worker runtime and `environment: "node"`
  is enough.
- **Replaying `test.yml`'s discovery shell locally is a cheap way to verify CI wiring** before
  pushing: paste the `has_test` loop into bash and check what it resolves to. Used here to confirm
  `app/` is found with no root manifest.

## Loose ends

- `.github/workflows/deploy.yml` carries ~20 lines of comment describing a `test` job that v10.0.0
  moved out into `test.yml`. The job is gone; the prose stayed. Out of scope here, worth a
  tidy-up.
- The `lib-wrangler-config.mjs` staging-vs-production database test is gone with `tests/` and has no
  replacement. The design records this as the change's one real coverage loss; whether the pipeline
  scripts get a suite of their own is deliberately left open.
