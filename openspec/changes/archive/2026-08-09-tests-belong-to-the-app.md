<!-- openspec-archive v1 2026-08-09-tests-belong-to-the-app -->
<!-- file proposal.md utf8 6629 -->
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

- **2026-08-09** — All 15 tasks implemented; released as `10.1.0`. **`app/vitest.config.ts` was added rather than reusing `app/vite.config.ts`** (task 1.1 left this open): the Vite config loads `@cloudflare/vite-plugin`, which builds and serves the Worker, and the suite imports the Worker's modules directly and needs no runtime around them. **The `keyCache` reset (task 1.5) is `vi.resetModules()` plus a dynamic re-import per test block**, not a new export — `access.ts` ships to adopters, and widening its public surface for a test is a worse trade than the two-line helper. The service-token test asserts the four arguments `crypto.subtle.verify` was called with (algorithm, the imported key object, the token's own signature bytes, the `header.payload` signing input), so an always-true stub cannot mask a path that never ran; the no-crypto rejection cases are 8 of the 17 tests. **No `payload-files.json` edit was needed for the new test files**: the `scaffold` category copies `app/` as a whole directory, so `vitest.config.ts`, `worker/index.test.ts`, and `worker/access.test.ts` ship with it automatically — only the `core.files` removal of `package.json` was required. Verified: `npm ci && npm test` green in `app/` (17 tests), `check-payload-links.mjs` reports zero dead links across all four install shapes, and the workflow's discovery script replayed locally resolves to `app/` with its lockfile present. **One CI failure and its fix:** `tsc -b` typechecks `tsconfig.worker.json`, which extends the Node config and so resolves modules under `node16` — where a relative import needs a file extension (`TS2835`). Vitest resolves the Vite way and needs none. Rather than write `./access.js` in the imports to satisfy a compiler that never compiles the tests, `tsconfig.worker.json` now excludes `worker/**/*.test.ts`. That also satisfies the `app-scaffold` scenario requiring the runner to stay out of the built output. The trade is that the tests are not typechecked by the build; vitest still type-strips and runs them. Anyone adding a test elsewhere in the scaffold (`src/`) should expect the same collision with `tsconfig.app.json`. Noted but deliberately not fixed here: `.github/workflows/deploy.yml` still carries a long comment describing a `test` job that v10.0.0 moved out to `test.yml` — stale prose, pre-existing, and outside this change's scope.
- **2026-08-09** — Shipped. `/ship` archived the change to `openspec/changes/archive/2026-08-09-tests-belong-to-the-app/`; delta specs were already folded into `openspec/specs/ci-tests/` and `openspec/specs/app-scaffold/` by the preceding save, so the archive step re-synced nothing. This entry is the delegated checkpoint that carries the archive move onto the branch before the squash merge.

<!-- end proposal.md -->
<!-- file design.md utf8 7895 -->
## Context

v10.0.0 added a repo-root `package.json` + `vitest.config.js` + `tests/`, and put `package.json` in the payload's **core** category. Two things are wrong with that:

1. **Every target repo gets a root manifest**, including repos with no npm anything. The same release rejected Playwright as `/walk`'s engine on the grounds that a `devDependencies` entry presumes a `package.json` and forces a Node toolchain into non-JS repos — then shipped that manifest anyway.
2. **The tests test the toolkit, not the app.** `check-payload-links.mjs`, `lib-wrangler-config.mjs`, and the walk shell scripts. Meanwhile `app/` — the thing this repo builds, deploys, and ships to adopters — has no tests at all.

The enabling fact that makes the fix free: `test.yml` already discovers a `test` script **root-first, then in each immediate subdirectory**. An app in `app/` is found with no root manifest. Nothing about the workflow changes.

## Goals / Non-Goals

**Goals:**
- Tests live with the app and test the app.
- No repo receives a package manifest it didn't ask for.
- The scaffold an adopter inherits comes with a runner and a starting suite for the code they're most likely to get wrong.

**Non-Goals:**
- Coverage targets. A starting suite over shipped code, not a percentage.
- Any change to `test.yml`, `/walk`, or the `/plan`-plans-tests convention.
- A test runner for repos that never took the app scaffold.

## Decisions

### D1 — Vitest belongs to `app/package.json`

The app already has a manifest, a build, a lint script, and a deploy — a test script is the missing one, not a new imposition. `vitest` joins its `devDependencies` beside `vite`, which it shares config machinery with.

*Alternative rejected — keep the root manifest and add `app/` tests to it.* That preserves the defect this change exists to remove, and it makes the app's tests unrunnable from the app directory where every other app script runs.

### D2 — The payload ships no root `package.json`

`package.json` leaves `core.files`. WongStack keeps its own — wait, it does not: this repo's root manifest is **deleted outright**, because with the suite in `app/` there is nothing at the root to run. Only `VERSION` and `CHANGELOG.md` remain as source-repo-only files.

The "payload ships a working default suite" promise moves to the **scaffold** category, which is the only category where a `package.json` is already expected and already shipped. A repo taking the scaffold gets a runner plus example tests; a repo declining it gets nothing new.

### D3 — What the app's suite covers first

Ranked by what a silent failure costs, not by what is easy:

**`app/worker/access.ts` — the identity module.** It ships inert to every scaffold repo and is the file the wiki records an adopter rewriting incorrectly: the header-trust version reads as simpler and silently locks out every machine caller, including CI and `/walk`. Its cheap, high-value cases need no network and no crypto, because `getAccessIdentity` returns before fetching keys:

| Case | Expected | Why it matters |
|---|---|---|
| `SKIP_AUTH` set | dev identity | the local-dev bypass reads from **env**, never from the request |
| no `CF_ACCESS_TEAM_DOMAIN`/`CF_ACCESS_AUD` | `null` | **unconfigured is not "allow"** — the failure that would turn a misconfigured deploy into an open door |
| no assertion header and no cookie | `null` | |
| malformed token (not three segments) | `null` | |
| `alg` other than `RS256`, or no `kid` | `null` | rejects before any key fetch — an `alg: none` token must never reach verification |

The **service-token case** — a valid assertion carrying `common_name` and no `email`, which must resolve to a `service` identity — is the headline behaviour and needs a stubbed key fetch plus a stubbed `crypto.subtle.verify`. It is worth the setup: this is precisely the path the header-trust mistake breaks.

**`app/worker/index.ts` — routing.** `/api/*` returns JSON; anything else is `404`. Small, but it is the contract the SPA fallback sits in front of.

*Module state to handle:* `access.ts` holds a module-level `keyCache`. Tests that stub key fetching must reset it between cases or a cached key leaks across tests and makes a later failure look like a pass.

### D4 — The toolkit tests are dropped, and one loss is real

All three root test files go. Being honest about what each was worth:

- **Walk-script tests** — partly ceremonial. Several asserted that a regex appears in a shell script, which tests source text rather than behaviour. Small loss.
- **`check-payload-links.mjs` tests** — invoked the checker and asserted it passed. Nearly redundant: the checker is already a mandatory release step, run by hand every version bump and named in the change loop. Small loss.
- **`lib-wrangler-config.mjs` tests** — **a real loss.** They pinned `readDatabaseName(config, "staging")` against silently answering with the *production* database, and `cf-build.sh` implements the same rule in bash, so the two must agree. A wrong answer here migrates or resets the wrong database and nothing errors.

The rule holds anyway: tests follow the app, and this helper is a pipeline script, not app code. Porting it into `app/` would mean the app's suite reaching up into `../scripts/` — re-muddying exactly the boundary this change draws. It is dropped, and the risk is recorded below rather than hidden. If it should come back, the honest home is a separate pipeline-script suite, decided on its own merits.

### D5 — `test.yml` is untouched

Root-first-then-subdirectory discovery is what makes a root manifest unnecessary. Deleting the root manifest changes which suite it finds in this repo (root → `app/`) and nothing else. A repo with no `test` script anywhere still gets an honest green.

## Risks / Trade-offs

- **The staging-vs-production database rule loses its automated check (D4)** → recorded here and in the change's Decision log; the deploy exercising it in CI is the remaining cover, and a pipeline-script suite is the clean fix if it recurs.
- **`access.ts` is inert in this repo, so its tests exercise code nothing imports** → that is the point: it ships to adopters who *will* import it, and shipping it untested is what produced the documented mistake.
- **Stubbing `crypto.subtle.verify` can make a test pass against a verification path that never truly runs** → keep the stub narrow, assert the verify call's arguments, and keep the no-crypto rejection cases as the majority of the suite.
- **The scaffold gains a dependency** → `vitest` is a devDependency of a repo that already carries `vite`, `wrangler`, and TypeScript; it changes no runtime output and does not touch the Worker bundle.
- **This repo's `Test` check changes what it covers** → from toolkit scripts to app code. It stays green and stays meaningful; the change log says so plainly so a reader doesn't assume the old coverage still exists.

## Migration Plan

1. Add `vitest` + `test` script to `app/package.json`; add the app's tests.
2. Delete the root `package.json`, `package-lock.json`, `vitest.config.js`, and `tests/`.
3. Remove `package.json` from `core.files`; move the default-suite statement to the scaffold in the prose manifest.
4. Amend the `ci-tests` and `app-scaffold` specs.
5. Release: `VERSION`, `CHANGELOG.md`, link check, and confirm CI's `Test` job finds `app/` and runs green.

**Rollback:** restoring the root manifest and `tests/` is a single revert; nothing is migrated and no repo state changes.

## Open Questions

None blocking. One deferred: whether the pipeline scripts (`lib-wrangler-config.mjs`, `cf-secrets.mjs`, `check-payload-links.mjs`) deserve a suite of their own. This change deliberately does not answer that — it removes them from a suite where they didn't belong, and the answer should be argued on its own terms rather than inherited.

<!-- end design.md -->
<!-- file tasks.md utf8 2384 -->
## 1. The app's suite

- [x] 1.1 Add `vitest` to `app/package.json` `devDependencies` and a `"test": "vitest run"` script; add a vitest config under `app/` only if the app's existing Vite config doesn't already serve.
- [x] 1.2 Test `app/worker/index.ts` routing: `/api/*` returns the JSON payload, anything else is `404`.
- [x] 1.3 Test `app/worker/access.ts`'s no-network rejection paths (design.md D3): `SKIP_AUTH` yields the dev identity; unset team domain or audience yields `null`; missing assertion header and cookie yields `null`; a malformed token yields `null`; a non-`RS256` `alg` or absent `kid` yields `null` **before** any key fetch.
- [x] 1.4 Test the service-token identity — a verified assertion with `common_name` and no `email` resolves to a `service` identity — with a narrow stub for key fetching and `crypto.subtle.verify`, asserting the verify call's arguments so the stub can't mask a path that never ran.
- [x] 1.5 Reset the module-level `keyCache` between tests so a stubbed key cannot leak across cases and turn a later failure into a pass.
- [x] 1.6 Run `npm test` from `app/` and confirm it is green.

## 2. Remove the root suite

- [x] 2.1 Delete the repo-root `package.json`, `package-lock.json`, `vitest.config.js`, and `tests/`.
- [x] 2.2 Confirm nothing else references them — `.gitignore`, workflow files, skills, or wiki pages.

## 3. Manifest

- [x] 3.1 Remove `package.json` from `core.files` in `.claude/skills/wong-sync/references/payload-files.json`.
- [x] 3.2 Update the prose manifest: the default suite ships with the **scaffold**, not the repo root, and state why a root manifest is never copied (design.md D2).
- [x] 3.3 Confirm `.github/workflows/test.yml` stays in `core.files` and its content is unchanged.

## 4. Wiki

- [x] 4.1 Update any page that describes the test pipeline as running a root suite — `wiki/development/the-change-loop.md` and the walkthrough runbook's line distinguishing CI tests from the walk.

## 5. Release

- [x] 5.1 Bump `VERSION` and add the `CHANGELOG.md` entry: the root manifest is gone, the suite lives with the app, what coverage was dropped and what replaced it.
- [x] 5.2 Run `node scripts/check-payload-links.mjs`; confirm zero dead links in all four install shapes.
- [x] 5.3 Confirm CI's `Test` job discovers `app/` and runs the app's suite green, and that the `Deploy` job is unaffected.

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 2252 -->
## ADDED Requirements

### Requirement: The scaffold ships a test runner and a starting suite

The app scaffold SHALL declare a test runner in its own `package.json` with a `test` script, so a repo that takes the scaffold can run `npm test` immediately and the payload's test workflow discovers it without any repo-root file.

The scaffold SHALL ship a starting suite over the code it hands the adopter, rather than an empty example. Coverage SHALL be chosen by what a silent failure costs: the **Access identity module** first, because it ships inert, is the file an adopter is most likely to reimplement by hand, and the incorrect reimplementation fails silently for machine callers while appearing to work in a browser.

That suite SHALL cover at minimum the module's rejection paths that require no network and no cryptography — an unset configuration resolving to *deny* rather than *allow*, a missing or malformed assertion, and an unacceptable signing algorithm — plus the service-token identity, which carries no email and is the case the incorrect implementation breaks.

The runner SHALL be a development dependency only, changing no runtime output and adding nothing to the deployed bundle.

#### Scenario: A scaffolded repo can test immediately

- **WHEN** a repo takes the app scaffold and installs its dependencies
- **THEN** `npm test` runs the shipped suite from the app directory
- **AND** the test workflow finds and runs it with no repo-root manifest present

#### Scenario: Unconfigured identity denies rather than allows

- **WHEN** the Access identity module runs with no team domain or audience configured
- **THEN** the shipped suite asserts it resolves to no identity
- **AND** the test fails if that path is ever changed to allow the request

#### Scenario: The service-token identity is covered

- **WHEN** a verified assertion carries a service-token subject and no email claim
- **THEN** the shipped suite asserts a service identity is returned rather than a rejection
- **AND** the case is present because the header-trust reimplementation rejects it

#### Scenario: The runner does not reach the bundle

- **WHEN** the scaffolded app is built for deployment
- **THEN** the test runner is absent from the built output

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/ci-tests/spec.md utf8 2728 -->
## RENAMED Requirements

- FROM: `### Requirement: The payload ships a working default suite`
- TO: `### Requirement: The default suite ships with the app, not with the repo root`

## MODIFIED Requirements

### Requirement: The default suite ships with the app, not with the repo root

The payload SHALL NOT ship a repository-root `package.json`. A repo that has no npm toolchain SHALL receive no package manifest, no lockfile, and no test runner on WongStack's behalf. This follows the same rule that governs the walkthrough's browser: a dependency entry presumes a manifest, and presuming a manifest forces a language toolchain into repos that never chose one.

The default suite SHALL instead ship **with the app scaffold**, in the app's own `package.json` — the one category where a manifest is already expected and already shipped. A repo that takes the scaffold SHALL receive a test runner and a starting suite for the code it just inherited; a repo that declines the scaffold SHALL receive neither.

The test pipeline SHALL remain able to find that suite without any root manifest, through the subdirectory discovery the workflow already performs. A repo whose application lives in a subdirectory SHALL be covered with no configuration and no file at its root.

WongStack SHALL use the suite on **its own application** — the Worker code the scaffold ships, whose identity module is the file an adopter is most likely to reimplement incorrectly. It SHALL NOT be required to test its own toolkit scripts; whether those deserve a suite of their own is a separate question this capability does not answer.

#### Scenario: A repo with no npm toolchain receives no manifest

- **WHEN** WongStack is installed or synced into a repo that has no `package.json` and no JavaScript
- **THEN** no root `package.json`, lockfile, or test runner is written to it
- **AND** the test workflow reports that no test script exists and exits green

#### Scenario: A repo with its own manifest keeps it

- **WHEN** WongStack is synced into a repo that already has a root `package.json`
- **THEN** that file is not modified or replaced
- **AND** the workflow runs whatever `test` script it declares

#### Scenario: The suite is found in a subdirectory

- **WHEN** a repo's application and its `test` script live in a subdirectory, with no root manifest
- **THEN** the workflow's discovery finds that suite and runs it
- **AND** nothing is added at the repo root to make it discoverable

#### Scenario: WongStack tests its own application

- **WHEN** WongStack's own CI runs
- **THEN** the suite exercises the Worker code the scaffold ships, including the Access identity module's rejection paths
- **AND** a regression in it fails the check

<!-- end specs/ci-tests/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-09

~~~
<!-- end .openspec.yaml -->
