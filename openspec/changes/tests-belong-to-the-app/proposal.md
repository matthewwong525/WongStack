# tests-belong-to-the-app

**Status:** ready-to-ship
**Open questions:** none

## Why

v10.0.0 put a `package.json` at the repo root and shipped it in the **core** payload, so every target repo receives a root manifest declaring vitest — including a Python, Rust, or Go repo that has no npm anything.

That contradicts the rule the same release was built on. `/walk`'s engine was chosen over Playwright *precisely because* a `devDependencies` entry presumes a `package.json` and would force a Node toolchain into non-JS repos; three tasks later the change shipped exactly that manifest to those repos. It also buys nothing: `.github/workflows/test.yml` already discovers a `test` script root-first **and then in each immediate subdirectory**, so an app in `app/` is found with no root manifest at all.

The tests themselves landed in the wrong place for the same reason. They test toolkit scripts — the payload link checker, the wrangler-config helper, the walk scripts — when the thing this repo builds and ships to adopters is the **app**. `app/worker/access.ts` is 196 lines of identity code that ships to every repo taking the scaffold, and it is the one file the wiki records an adopter getting wrong by hand: writing the header-trust version, which reads as simpler and silently locks out every machine caller including CI and `/walk`. That is where a test earns its keep.

## What Changes

- **Vitest moves into the app.** `app/package.json` gains `vitest` and a `test` script; the suite lives in `app/` and tests the app's own code — `app/worker/index.ts`'s routing and `app/worker/access.ts`'s signed-assertion verification, including the service-token case that carries no email header.
- **The repo-root `package.json`, `vitest.config.js`, `package-lock.json`, and `tests/` are removed.** **BREAKING (internal):** the toolkit-script tests go away with them.
- **The payload stops shipping a root `package.json`.** It comes out of `core.files`, so no repo receives a manifest it didn't ask for.
- **The default suite ships with the app scaffold instead.** A repo that takes the scaffold gets a working `npm test` and example tests for the Worker code it just inherited — the same "a working default suite" promise, relocated to the only category where a `package.json` is already expected.
- **`.github/workflows/test.yml` is unchanged.** Its subdirectory discovery is what makes this work, and it stays in core: any repo with an `npm test` script anywhere gets the check, and a repo with none gets an honest green.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ci-tests`: the payload's default suite ships with the app scaffold rather than as a repo-root manifest, and WongStack tests its app rather than its own toolkit scripts.
- `app-scaffold`: the scaffold gains a test runner and a starting suite for the Worker code it ships, so an adopter inherits tests along with the code they are most likely to get wrong.

## Impact

- **Removed** — `package.json`, `package-lock.json`, `vitest.config.js`, `tests/` at the repo root.
- **Added** — `vitest` in `app/package.json` with a `test` script, and `app/worker/*.test.ts` (or the scaffold's chosen test path).
- **Manifest** — `package.json` leaves `core.files`; the scaffold category covers the app's manifest and tests as it already does.
- **CI** — no workflow edit. This repo's `Test` check keeps running, now against the app's suite.
- **No change** to `/walk`, the walkthrough scripts, `test.yml`, or the `/plan`-plans-tests convention.

## Non-goals

Not adding a test runner to any repo that didn't take the app scaffold. Not making the app's suite a merge gate beyond the CI rung it already is. Not writing exhaustive coverage of the scaffold — a starting suite over the code that ships, not a target percentage.

## Decision log

- **2026-08-09** — All 15 tasks implemented; released as `10.1.0`. **`app/vitest.config.ts` was added rather than reusing `app/vite.config.ts`** (task 1.1 left this open): the Vite config loads `@cloudflare/vite-plugin`, which builds and serves the Worker, and the suite imports the Worker's modules directly and needs no runtime around them. **The `keyCache` reset (task 1.5) is `vi.resetModules()` plus a dynamic re-import per test block**, not a new export — `access.ts` ships to adopters, and widening its public surface for a test is a worse trade than the two-line helper. The service-token test asserts the four arguments `crypto.subtle.verify` was called with (algorithm, the imported key object, the token's own signature bytes, the `header.payload` signing input), so an always-true stub cannot mask a path that never ran; the no-crypto rejection cases are 8 of the 17 tests. **No `payload-files.json` edit was needed for the new test files**: the `scaffold` category copies `app/` as a whole directory, so `vitest.config.ts`, `worker/index.test.ts`, and `worker/access.test.ts` ship with it automatically — only the `core.files` removal of `package.json` was required. Verified: `npm ci && npm test` green in `app/` (17 tests), `check-payload-links.mjs` reports zero dead links across all four install shapes, and the workflow's discovery script replayed locally resolves to `app/` with its lockfile present. Noted but deliberately not fixed here: `.github/workflows/deploy.yml` still carries a long comment describing a `test` job that v10.0.0 moved out to `test.yml` — stale prose, pre-existing, and outside this change's scope.
