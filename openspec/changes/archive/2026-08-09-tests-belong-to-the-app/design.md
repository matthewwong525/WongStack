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
