<!-- openspec-archive v1 2026-10-01-mini-apps-in-the-main-app -->
<!-- file proposal.md utf8 9683 -->
# Mini apps live in the main app

**Status:** ready-to-ship

**Branch:** setup-without-paseo

**Open questions:** none

## Why

A mini app is built a different way from the rest of your app: plain pages, its own tests, its own rules, and it can reach only the database. Most real tools need more than that, such as a saved key for an outside service or knowing who's signed in. That leaves two ways to build the same thing, plus a choice of which to use. One way is simpler to build, check and explain.

## What Changes

- **A mini app is part of the main app.** It's written like every other page, checked by the same tests, and built in the same build. Each app still has its own folder, its own address at `/apps/<name>/`, and its own card on the home page. The separate mini-app machinery goes away.
  ```text
  BEFORE                   AFTER
  ┌──────────────────┐     ┌──────────────────┐
  │ main app         │     │ main app         │
  │  pages, API      │     │  pages, API      │
  │  React, tests    │     │  React, tests    │
  └──────────────────┘     │  apps/hello      │
  ┌──────────────────┐     │  apps/tips       │
  │ mini apps        │     └──────────────────┘
  │  plain pages     │      one way to build,
  │  own tests       │      one set of checks
  │  copy step, list │
  └──────────────────┘
  ```
- **A mini app can reach everything except memory.** Its server side gets the database, any saved keys for outside services, and who's signed in. Your memory store stays out of reach, as today.
- **Every app gets the main app's checks.** Every line of an app's code has tests, the same as the rest of the app. A change to one app runs the whole app's checks, so it takes a little longer than before.
- **The home page knows its apps at build time.** The list is part of the page, so it no longer shows *Loading your apps…* or *could not load*. An app with no title or description fails the checks and names the folder.
- **Your existing mini apps move over in the next update.** The update plan rewrites each one into the main app's shape, at the same address, keeping its data. You see each one in the preview before anything is published. The example app, Hello, comes over the same way.

**Non-goals:** No change to the memory store or how it's protected, to the main app's own pages, or to how a change is planned, previewed and published. No new kind of app, and no faster preview.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mini-apps`: a mini app is main-app code in `app/src/apps/<name>/` and `app/worker/apps/<name>/`, at the same addresses; its handler gets every binding but memory, plus the verified identity; its tests run in the main suite; the home list is compiled in; existing installs convert their apps on update; the separate test-file rule is retired.
- `stack-pack`: the main Worker routes `/apps/<name>/api/*` to app handlers it bundles itself; any app change deploys like any main-app change; the payload ships only the example app's folders.
- `ci-tests`: a branch that changes only docs skips the suite; `mini-apps/apps/` is no longer a skip path, and the separate mini-app test step goes.
- `app-scaffold`: the code rule says where a mini app's page, API and metadata go inside `app/`.
- `payload-checks`: the script quality bar no longer names a mini-app router.

## Impact

- **App:** new `app/src/apps/` (pages, `app.json`, list registry) and `app/worker/apps/` (handler registry and per-app routes); `app/src/router.tsx`, `app/worker/index.ts`, `app/src/lib/apps.ts`, `AppList`, `Home`, their tests; `app/wrangler.jsonc` comment; `knip.jsonc` if it can't follow the globs.
- **Removed:** `mini-apps/` (router, routes, type declarations, test-file rule, `hello/`, and the source-only `tips/`, which moves into `app/`), `scripts/mini-dashboard.mjs`, the copy step in `scripts/cf-build.sh`.
- **CI:** `.github/scripts/app-untouched.sh` and `change-scope` drop `mini_apps` and `mini_changed`; `test.yml` drops the mini-app test step; `deploy.yml` deploys on `untouched=false` alone; `loosened-checks.mjs` takes its test-file rule from `.github/scripts/`; `payload.yml` lint paths.
- **Sync and setup:** `payload-files.json`, the payload manifest, a new catch-up reason `mini-apps-folder` in `preflight.mjs` and `catch-up.md`, `stack-pack-fragments.md`, setup's `cloudflare.md`, `/apply`'s preview skip line.
- **Docs and rules:** `wiki/stack/mini-apps.md` rewritten; `the-change-loop.md`, `memory.md`, `d1-pipeline.md`, `getting-started.md`, `wiki/README.md`, `wiki/stack/README.md`, `README.md`, `AGENTS.md`; `.agents/rules/code.md` and `payload.md` paths; `scripts/retired-names.json`.
- **Release:** a major release; existing installs convert their mini apps through the sync plan.

## Decision log

- **2026-10-01** — Asked how a mini app should be written once it lives in the main app → like any main-app page: the same code, tests and build, each app still in its own folder and listed on the home page.
- **2026-10-01** — Asked what a mini app should be able to reach → everything except memory: the database, saved keys for outside services, and who's signed in.
- **2026-10-01** — Asked what happens to mini apps already in installed repos → convert them in the update, each one reviewed and previewed before it's published.
- **2026-10-01** — Assumed: keep every app's address, `/apps/<name>/` for its page and `/apps/<name>/api/...` for its server side, because bookmarks and outside services such as payment webhooks may already call them.
- **2026-10-01** — Assumed: an app's page sits in `app/src/apps/<name>/` and its server side in `app/worker/apps/<name>/`, because the main app already splits pages from its server code, and each half is type-checked for its own runtime.
- **2026-10-01** — Assumed: the main app's own `/api/` routes keep the full environment, because this change is about mini apps, and narrowing the main API is a separate decision.
- **2026-10-01** — Assumed: the home list is compiled into the page, not fetched, because both now come from one build; this drops the loading and could-not-load states.
- **2026-10-01** — Assumed: existing installs are found by a check in the update's preflight, not by reading the changelog, because a repo with a `mini-apps/apps/` folder must convert whatever version it skips from.
- **2026-10-01** — Assumed: this repo's own tip calculator converts too and stays out of what ships, because it's source-only today.
- **2026-10-01** — Check: `.github/scripts/app-untouched.sh`, `.github/workflows/test.yml`, `.github/workflows/deploy.yml`, and `.github/workflows/payload.yml` drop the separate mini-app scope, test step, and lint paths, because mini apps now run in the main app's suite and deploy with it; nothing is skipped that ran before.
- **2026-10-01** — Check: `.github/scripts/loosened-checks.mjs` and `.github/scripts/test-file.mjs` keep the same test-file rule, moved beside the guard because its old home, `mini-apps/`, is gone.
- **2026-10-01** — Check: `mini-apps/apps/hello/api.test.mjs`, `mini-apps/apps/hello/page.test.mjs`, and `mini-apps/apps/tips/tip.test.mjs` are deleted because they moved to Vitest beside the converted apps (`app/worker/apps/hello/api.test.ts`, `app/src/apps/hello/App.test.tsx`, `app/src/apps/tips/tip.test.ts`); `scripts/tests/mini-apps.test.mjs` goes with the code it tested, and its preview tests live on in `scripts/tests/cf-preview.test.mjs`.
- **2026-10-01** — Check: `app/knip.jsonc` lists each app's `App.tsx` and `api.ts` as entries, because Vite loads them by glob where knip can't follow; this adds files to the check and loosens nothing.
- **2026-10-01** — Check: `scripts/tests/.c8rc.json` stops measuring `mini-apps/`, because that folder is deleted; the coverage floor is unchanged.
- **2026-10-01** — Assumed: save the whole build at gate task 1.1, because the app's tests, type checks and coverage run only in CI; the spec deltas were applied to the main specs at this save, which clears the retired-names check (task 5.3), and the build helper's staged deletions of `mini-apps/` and `scripts/mini-dashboard.mjs` are kept as intended.
- **2026-10-01** — Assumed: tasks 1.1–3.4 and 4.2 are done, because CI passed on the branch after one fix: the app page lookup now builds its element outside the component (oxlint's components-during-render rule), and the `/apps/` redirect passes a string URL, as the Workers types require.
- **2026-10-01** — Assumed: the preview walk (task 6.2) passed on https://mini-apps-in-the-main-app-wongstack-staging.matthewwong525.workers.dev. GET `/`, `/apps/hello/` and `/apps/tips/` return the page; `/apps/` redirects home for GET and POST; `/apps/hello/api/greeting?name=Sam` answers `Hello, Sam!` and 404s on POST; `/apps/hello/api.mjs` returns the page, not source; `/api/health` answers; `/_memory/` answers staging's no-store 404 for both methods. In the browser, Hello greeted Sam at 320px and kept the name; Tips gave $30.00 each for $100, 4 people, 20% at 390px; the home list showed Hello (Example) and Tip calculator; dark mode at 320px read clearly; no page scrolled sideways.
- **2026-10-01** — Asked whether to publish after the preview walk → ran `/ship`. Archived the complete change with the spec deltas already applied at the first save, and numbered this major release 29.0.0.

<!-- end proposal.md -->
<!-- file design.md utf8 9468 -->
# Design

## Context

Since 24.0.0 the main Worker serves mini apps, but they are still a second code base: plain HTML and `.mjs` under `mini-apps/apps/<name>/`, tested by `node --test`, routed by `mini-apps/router.mjs` (which hands a handler only `{ DB }`), found by `mini-apps/routes.mjs` (a Vite glob), copied into the build's assets by `scripts/mini-dashboard.mjs` after `vite build`, and listed through a generated `/apps/apps.json`. CI carries a mini-app scope: `app-untouched.sh` prints `mini_apps` and `mini_changed`, `test.yml` runs a separate Node test step, and `deploy.yml` deploys on `mini_changed`. `mini-apps/is-test-file.mjs` is shared by that step, the copy, the router, and `loosened-checks.mjs`.

The main app is React + TypeScript + Vite, with `app/src/` (DOM, `tsconfig.app.json`) and `app/worker/` (Workers, `tsconfig.worker.json`) typechecked separately, and an `npm test` chain of oxlint, Vitest at 100% coverage, knip, and jscpd. `app/` is scaffold payload: sync updates files the target hasn't changed and protects the rest (`locally-adapted`). The design note in the 24.0.0 archive that "`/wong-sync` does not update `app/`" is out of date.

`app/worker/index.ts` already verifies the Access identity before it routes `/apps/`, so the caller is known when a mini app runs. Production binds `MEMORY_DB` and `MEMORY_BUCKET`; staging binds neither.

## Goals / Non-Goals

**Goals:**
- One way to build a page or tool: a mini app is main-app code, in the main build, under the main checks.
- Same addresses: `/apps/<name>/` and `/apps/<name>/api/*`.
- A mini app's server side gets every binding and secret but memory, plus the verified identity.
- Adding an app needs no edit outside its own folders.
- Existing installs convert their apps through the sync plan, found deterministically.

**Non-Goals:**
- Narrowing the main app's own `/api/` routes, which keep the full environment.
- Changing the memory store, its routing, or its protection.
- A faster preview, or a per-app CI shortcut.

## Decisions

**Two folders per app, matching the main app's split.** The page is `app/src/apps/<name>/`: `App.tsx` (the page component, named export `App`), `app.json` (`title`, `description`), its parts and CSS beside it, and `*.test.tsx`. The server side, when there is one, is `app/worker/apps/<name>/`: `api.ts` exporting a `routes` map keyed `"METHOD route"`, handler files beside it, and `*.test.ts`. *Alternative:* one folder holding both. Rejected: `api.ts` under `src/` would be typechecked with DOM types and no `Env`, and moving it into the worker project needs include/exclude globs in both tsconfigs that every app inherits.

**Globs, not a hand-kept list.** `app/src/apps/index.ts` reads `import.meta.glob("./*/app.json", { eager: true })` for the list and `import.meta.glob("./*/App.tsx")` for lazy pages, and validates each folder name (`^[a-z0-9]+(-[a-z0-9]+)*$`) and manifest. `app/src/router.tsx` adds one route, `apps/:name/*`, whose element looks the app up and renders it inside `Layout` (or `NotFound`). `app/worker/apps/index.ts` reads `import.meta.glob("./*/api.ts", { eager: true })` into a name → routes table. Vite resolves both in the build and in Vitest, so no generate step. A test over the real registry fails the `test` check on a bad name or manifest and names the folder.

**The Worker hands an app everything but memory.** `app/worker/apps/index.ts` exports `handleApp(request, env, identity)`. It matches `/apps/<name>/api/<route>`, then calls the handler with `(request, appEnv, { url, route, identity })`, where `appEnv` is a copy of `env` without `MEMORY_DB` and `MEMORY_BUCKET`, typed `AppEnv = Omit<Env, "MEMORY_DB" | "MEMORY_BUCKET">`. `identity` is the verified `AccessIdentity` from `access.ts`, or `null` on an open workspace. An unknown app or route answers JSON 404, like `/api/`. `disallow_importable_env` stays, so a handler can't import the full env. `app/worker/index.ts` keeps `/_memory/` first, the identity check second, then routes `/apps/` (the bare `/apps/` still redirects to `/`) and `/api/`.

**Pages render through the single-page app.** With `run_worker_first: true` and SPA `not_found_handling`, a page path under `/apps/<name>/` falls to `ASSETS.fetch`, which returns `index.html`; React Router renders the app. A request for an old static path such as `/apps/hello/api.mjs` gets `index.html`, never the source, so the "source file by path" scenario still holds.

**The list is compiled in.** `app/src/lib/apps.ts` exports the registry's list synchronously; `Home` and `AppList` drop `Suspense`, `use()`, and the loading and failed states, keeping the empty state and the Example label. *Alternative:* keep fetching a generated `apps.json`. Rejected: the page and the list come from one build, so a fetch only adds a failure mode.

**Hello and Tips convert in place.** Hello becomes `app/src/apps/hello/App.tsx` + `Hello.css` and `app/worker/apps/hello/api.ts` + `greeting.ts`, keeping its markup classes, phone layout, announced result, and retry text. Its tests move to Vitest and Testing Library. Tips becomes `app/src/apps/tips/` with `tip.ts` and its tests; it stays out of the payload through `scaffold.exclude`. Both keep the brand header from `Layout`, so their own copies of the header go.

**Delete the separate machinery.** Remove `mini-apps/` entirely and `scripts/mini-dashboard.mjs`, and the copy block in `scripts/cf-build.sh`. `app-untouched.sh` keeps `untouched`, `base`, and `docs_only`, where `untouched` now means every path is under `wiki/` or `openspec/` or ends in `.md`; it drops `mini_apps` and `mini_changed`, and the `change-scope` action drops those outputs. `test.yml` drops the mini-app steps; `deploy.yml` gates on `untouched != 'true'` alone; `/apply`'s preview skip reads `untouched=true` alone. `loosened-checks.mjs` imports `TEST_FILE` from a moved `.github/scripts/test-file.mjs`, the same pattern without the CLI. *Alternative:* keep `mini_changed` as an always-false output for older workflows. Rejected: the workflows ship in the same release.

**Find existing installs in preflight.** `preflight.mjs`'s `catchUpNeeds` adds `{ code: "mini-apps-folder", paths: [<each mini-apps/apps/<name>>] }` when `mini-apps/apps/` exists in the target. `catch-up.md` gains step 8: for each listed app, convert its page and handler into the two new folders by the same shape as Hello (plain `.mjs` logic becomes `.ts`, `node --test` tests become Vitest), keep its address and tables, show it in the preview, then remove `mini-apps/`, the old `mini-dashboard.mjs`, and any `/apps/apps.json` reader the target added. A target's `hello` that equals the shipped one is replaced by the new Hello; an edited one converts like any other app. The `CHANGELOG.md` **Updating.** note says this in plain words. *Alternative:* the changelog note alone. Rejected: an install skipping several releases must still convert, and the check is deterministic.

**Payload inventory.** `scaffold.dirs` drops `mini-apps/apps/hello` (the `app` dir already carries `app/src/apps/hello` and `app/worker/apps/hello`); `scaffold.files` drops the five `mini-apps/` files; `scaffold.exclude` adds `app/src/apps/tips` and `app/worker/apps/tips`; `pack.files` drops `scripts/mini-dashboard.mjs`. `retired-names.json` adds `mini-apps/apps/`, `mini-dashboard.mjs`, `is-test-file.mjs`, `mini_changed`, and `apps.json`, allowing the catch-up page, the changelog, and archives.

**Docs follow the code.** `wiki/stack/mini-apps.md` is rewritten around the two folders, the reach, and the checks; its *When to move an app into the main app* section goes, because nothing is left to move to and no page links its anchor. `the-change-loop.md`'s *Mini apps* and gate paragraphs, `memory.md`'s cost paragraph, the `d1-pipeline.md` script table, `getting-started.md`, both wiki hubs, `README.md`, `AGENTS.md`, `.agents/rules/code.md` (paths and *Where things go*), `.agents/rules/payload.md` paths, setup's `cloudflare.md` and `stack-pack-fragments.md` comments, `cf-preview.sh` and workflow comments all drop the old folder.

## Risks / Trade-offs

- **[Slower checks for small apps]** → Every app change runs the whole suite. Accepted in the exit round; the suite is minutes, not hours.
- **[100% coverage applies to apps]** → Agents must test every line of an app. This is the main app's bar; no exception is added.
- **[A wider blast radius]** → An app's handler can now call outside services with real keys and read the signed-in person. Memory stays out by the env copy and the import flag; review before publishing covers the rest, as for any Worker code.
- **[Knip can't see glob-loaded files]** → If knip reports `App.tsx` or `api.ts` files unused, list `src/apps/*/App.tsx` and `worker/apps/*/api.ts` as entries in `app/knip.jsonc`. That adds entries; it loosens no check.
- **[Conversion is agent work in someone else's repo]** → A converted app may behave differently. Each app shows in the update's preview, and the plan names every app it moves; the old folder is removed only in the same reviewed change.
- **[Old links to static files]** → `/apps/<name>/app.js` or `style.css` stop existing. Only the page and API addresses are promised.
- **[Routing regressions]** → 24.0.0 broke `/_memory/` through routing. The Worker test probes `/`, `/apps/`, `/apps/hello/`, `/apps/hello/api/greeting`, `/api/health`, and `/_memory/` with GET and POST, and the preview walk repeats it.

<!-- end design.md -->
<!-- file tasks.md utf8 7104 -->
# Tasks

## 1. App: the registries and routing

- [x] 1.1 Add `app/src/apps/index.ts`: globs `./*/app.json` (eager) and `./*/App.tsx` (lazy), validates each folder name and manifest, and exports the list (`name`, `title`, `description`, `href`) and a page lookup; add `index.test.ts` covering the real registry plus a bad name, a missing title, and a missing description, each failing with the folder named. Verify in CI through `/save`.
- [x] 1.2 In `app/src/router.tsx`, add the `apps/:name/*` route that renders the looked-up app inside `Layout`, or `NotFound` for an unknown name; extend `router.test.tsx` for both. Verify in CI through `/save`.
- [x] 1.3 Add `app/worker/apps/index.ts`: globs `./*/api.ts`, exports `AppEnv`, the handler type, and `handleApp(request, env, identity)`, which strips `MEMORY_DB` and `MEMORY_BUCKET`, passes `{ url, route, identity }`, and answers JSON 404 for an unknown app, route, or method; add `index.test.ts` proving a handler sees `DB` and a secret but no memory binding, gets the identity, and 404s on `constructor`/`__proto__` routes. Verify in CI through `/save`.
- [x] 1.4 In `app/worker/index.ts`, replace the `mini-apps/` imports with `handleApp`, pass the verified identity, and keep `/_memory/` first and the `/apps/` redirect; update `index.test.ts` to probe `/`, `/apps/`, `/apps/hello/`, `/apps/hello/api/greeting`, `/apps/hello/api.mjs`, `/api/health`, and `/_memory/` with GET and POST. Update the `disallow_importable_env` comment in `app/wrangler.jsonc` and `stack-pack-fragments.md`. Verify in CI through `/save`.
- [x] 1.5 Make `app/src/lib/apps.ts` return the compiled list; drop `Suspense`, `use()`, and the loading and failed states from `Home.tsx` and `AppList.tsx`, keeping the empty state and the Example label; update `Home.test.tsx` and any `AppList` test. Verify in CI through `/save`.

## 2. App: Hello and Tips

- [x] 2.1 Convert Hello to `app/src/apps/hello/` (`app.json`, `App.tsx`, `Hello.css`) and `app/worker/apps/hello/` (`api.ts`, `greeting.ts`), keeping the label above the field, the announced greeting, the retry text, and the phone layout; port `page.test.mjs` and `api.test.mjs` to `App.test.tsx` and `api.test.ts`. Verify in CI through `/save`, then on the preview at 320px and 390px.
- [x] 2.2 Convert Tips to `app/src/apps/tips/` (`app.json`, `App.tsx`, `Tips.css`, `tip.ts`), keeping immediate recalculation, labels, selected tip state, the announced result, and the empty and invalid guidance; port `tip.test.mjs` and add a page test. Verify in CI through `/save`, then on the preview.
- [x] 2.3 Delete `mini-apps/` and `scripts/mini-dashboard.mjs`, and the copy block in `scripts/cf-build.sh`; if knip then reports app pages or handlers unused, add them as entries in `app/knip.jsonc`. Verify `npm test` passes in CI through `/save`.

## 3. CI and scripts

- [x] 3.1 In `.github/scripts/app-untouched.sh`, drop `mini_apps`, `mini_changed`, and the `mini-apps/apps/` skip path, and update its header; in `.github/actions/change-scope/action.yml`, drop those outputs; update `scripts/tests/app-untouched.test.mjs`. Verify in CI through `/save`.
- [x] 3.2 In `test.yml`, drop the mini-app Node and test steps and their header text; in `deploy.yml`, gate on `untouched != 'true'` alone, drop `mini_changed=false` from `skip-when`, and update its header; in `payload.yml`, drop the `mini-apps/` lint paths. Verify the workflows run green on the branch through `/save`.
- [x] 3.3 Move the test-file pattern to `.github/scripts/test-file.mjs` (no CLI), import it in `loosened-checks.mjs`, and update `scripts/tests/loosened-checks.test.mjs`; add the new file to `payload-files.json` core. Verify in CI through `/save`.
- [x] 3.4 Update the remaining script tests that name `mini-apps/` or `mini-dashboard.mjs` (`mini-apps.test.mjs` removed, `payload-rule-paths`, `cli-conventions`, `checkpoint-helpers`, `wrangler-config`, `.c8rc.json`, and any other `grep -rl mini scripts/tests` hit), and the `cf-preview.sh` header. Verify in CI through `/save`.

## 4. Sync and setup

- [x] 4.1 In `payload-files.json`, drop `mini-apps/apps/hello` from `scaffold.dirs`, the five `mini-apps/` files from `scaffold.files`, and `scripts/mini-dashboard.mjs` from `pack.files`; add `app/src/apps/tips` and `app/worker/apps/tips` to `scaffold.exclude`. Verify a `wong-sync-preflight` test that `tips` paths are never selected and `hello` paths are.
- [x] 4.2 In `preflight.mjs`'s `catchUpNeeds`, add the `mini-apps-folder` reason listing each `mini-apps/apps/<name>`; cover present and absent folders in `scripts/tests/wong-sync-preflight.test.mjs`. Verify in CI through `/save`.
- [x] 4.3 Add step 8, `mini-apps-folder`, to `catch-up.md` by design.md's *Find existing installs in preflight*, and add the code to the payload manifest's `catchUp` list; rewrite the manifest's mini-app paragraph and the scaffold paragraph's `/apps/apps.json` sentence. Verify `node scripts/check-payload-links.mjs` passes.
- [x] 4.4 In `/apply`'s preview step, skip the upload on `untouched=true` alone; in setup's `cloudflare.md`, update the `/apps/` sentence and the *Moving older mini apps* paragraph to point at the catch-up step. Verify `node scripts/measure-context.mjs --check` passes, trimming the same files if it does not.

## 5. Docs and rules

- [x] 5.1 Rewrite `wiki/stack/mini-apps.md` by design.md's decisions: the two folders, the tree, the reach (everything but memory, plus the signed-in person), the checks, build-preview-publish, and the home list. Verify it against the spec delta and `node scripts/check-payload-links.mjs`.
- [x] 5.2 Update `.agents/rules/code.md` (`paths:` and the *A mini app* line), `.agents/rules/payload.md` paths, `the-change-loop.md` (*Mini apps* and the gate's skip paragraph), `memory.md`'s cost paragraph, the `d1-pipeline.md` script table, `getting-started.md`, `wiki/README.md`, `wiki/stack/README.md`, `README.md`, `AGENTS.md`, and the `style.css` and `style.test.ts` comments. Verify `grep -rn "mini-apps/" --exclude-dir=archive --exclude-dir=node_modules .` finds only the catch-up page, the changelog, and this change.
- [x] 5.3 Add `mini-apps/apps/`, `mini-dashboard.mjs`, `is-test-file.mjs`, `mini_changed`, and `apps.json` to `scripts/retired-names.json` with replacements, allowing the catch-up page and changelog. Verify `node scripts/check-retired-names.mjs` passes.

## 6. Release and preview

- [x] 6.1 Add `## Next (major) — Mini apps live in the main app` at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note saying the update moves each mini app into the main app at the same address, keeping its data, and shows each in the preview before publishing. Verify `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs` pass.
- [x] 6.2 On the `/apply` preview, open `/`, `/apps/hello/`, and `/apps/tips/` at 320px and 390px in light and dark, submit Hello's form, compute $100 / 4 people / 20% in Tips, and probe `/apps/`, `/apps/hello/api/greeting`, `/api/health`, and `/_memory/` with GET and POST. Record the result in the Decision log.

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 480 -->
## MODIFIED Requirements

### Requirement: The code rule says where things go

The code rule SHALL load when an agent edits the main app, mini apps included, and SHALL say where a new page, API route, mini app, shared part, helper, and style go, pointing at the files that already follow it.

#### Scenario: A second page

- **WHEN** the agent adds a page to the main app
- **THEN** it adds a folder under the pages folder and one entry in the route list, following the home page

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/ci-tests/spec.md utf8 772 -->
## MODIFIED Requirements

### Requirement: A change that leaves the main app untouched skips its suite

When everything a branch changes against the default branch is under `wiki/` or `openspec/`, or ends in `.md`, the check SHALL pass without running the main app's suite. A change to a mini app SHALL run the suite, like any main-app change. The comparison SHALL cover the whole branch, and when it cannot be made, the suite SHALL run.

#### Scenario: A docs-only branch

- **WHEN** a branch changes only wiki pages and a `README.md`
- **THEN** the check passes with a note that the change is docs-only

#### Scenario: A docs commit on top of code

- **WHEN** a branch's last commit changes only a `.md` file but an earlier commit changed code
- **THEN** the suite runs

<!-- end specs/ci-tests/spec.md -->
<!-- file specs/mini-apps/spec.md utf8 5894 -->
## MODIFIED Requirements

### Requirement: A mini app lives in its own folder, served by the main app

Each mini app SHALL be part of the main app: written, built, and tested the same way as the main app's own pages, with its page in its own folder and its optional server side in a matching folder, and a manifest holding a title and description. The main app SHALL serve its page at `/apps/<name>/` and its server side at `/apps/<name>/api/*`; there SHALL be no separate mini-app Worker, build step, or copy step.

#### Scenario: A saved app goes live

- **WHEN** the mini app `tips` is published and production deploys
- **THEN** `https://<app>/apps/tips/` serves it from the main app's Worker

### Requirement: A mini app carries its own tests

A mini app's plan SHALL include tests for its logic in its own folders. The main app's test suite SHALL run them, under the same checks and limits as the rest of the main app, in the required `test` check.

#### Scenario: A failing test

- **WHEN** a pull request changes a mini app whose test fails
- **THEN** the `test` check fails and `/ship` cannot merge it

### Requirement: The example mini app is set up to grow

The example mini app SHALL keep its page, its parts, and its server side in separate files, and its server side SHALL dispatch through a route list. An unknown API route SHALL answer 404.

#### Scenario: A copied app gains a route

- **WHEN** the agent adds an API route to a mini app copied from the example
- **THEN** it adds one entry to the route list and a handler, without touching the page

## REMOVED Requirements

### Requirement: A mini app reaches only the app database

**Reason**: A mini app is now main-app code and needs saved keys and the signed-in person; only the memory store stays out of reach.

**Migration**: See "A mini app reaches everything but memory".

### Requirement: The landing page lists every mini app

**Reason**: The list is compiled into the home page from the same build, so `/apps/apps.json` and the build-time manifest check go.

**Migration**: See "The home page lists every mini app".

### Requirement: One rule names a mini app's test files

**Reason**: Mini app tests run in the main app's suite, whose own configuration names its test files; no Node-only runner, copy step, or source-file guard remains to share a rule with.

**Migration**: The loosened-check guard keeps its own test-file rule for every changed file.

### Requirement: The starter app list guides first use

**Reason**: The compiled list has no loading or could-not-load state.

**Migration**: See "The home page's app list guides first use".

## ADDED Requirements

### Requirement: A mini app reaches everything but memory

A mini app's server side SHALL receive every binding and secret the main app's Worker has, except the memory store's bindings, and SHALL receive the verified identity of the caller: a person's email, or a service token's name. The Worker SHALL keep every other runtime route to its bindings, such as importing them, turned off. The docs SHALL say a mini app shares the Worker with the memory store, so the limit stops mistakes, not code written to get around it. A preview SHALL use staging data and staging keys, never production.

#### Scenario: Production binds memory

- **WHEN** a mini app's handler runs on the production Worker, which binds the memory store
- **THEN** it gets the app database, the app's saved keys, and the signed-in person, and no memory binding

#### Scenario: A handler imports the Worker's bindings

- **WHEN** a handler imports the environment from the Workers runtime
- **THEN** the runtime refuses, and no memory binding reaches it

### Requirement: The home page lists every mini app

The home page SHALL list every mini app in the build, each with its title, description, and link, and `/apps/` SHALL redirect to `/`. A preview SHALL list the app it previews. A mini app whose manifest lacks a title or description, or whose folder name is not lowercase letters, digits, and hyphens, SHALL fail the `test` check and name the folder.

#### Scenario: A malformed manifest

- **WHEN** a mini app's manifest has no title
- **THEN** the `test` check fails and names the folder

### Requirement: The home page's app list guides first use

The home page SHALL present each mini app as a clearly focused link with its title and description, and SHALL identify the supplied example as an example. With no apps it SHALL explain how to ask for a first tool. The list SHALL remain readable and operable at phone widths and with keyboard navigation.

#### Scenario: Apps are available

- **WHEN** a person opens the home page of a workspace with apps
- **THEN** each app has a title, description, and keyboard-accessible link, and the supplied example is visibly labeled

#### Scenario: No apps yet

- **WHEN** a workspace has no mini apps
- **THEN** the person sees a first-tool request to copy into their chat

### Requirement: Existing mini apps move into the main app on update

When an installed repo still has mini apps in the old separate folder, its next update SHALL plan moving each one into the main app, at the same addresses and with the same data, and SHALL then remove the old folder. Each moved app SHALL appear in the update's preview before anything is published. An app the person changed SHALL keep its behavior; the plan SHALL name every app it moves.

#### Scenario: An install with two mini apps updates

- **WHEN** a repo with mini apps `hello` and `runs` in the old folder syncs to this release
- **THEN** the update plan moves both into the main app, the preview serves `/apps/hello/` and `/apps/runs/`, and the old folder is gone once it is published

#### Scenario: An app's data survives

- **WHEN** the moved `runs` app reads the table its old version wrote
- **THEN** it finds the same rows, because the move changes no database table

<!-- end specs/mini-apps/spec.md -->
<!-- file specs/payload-checks/spec.md utf8 678 -->
## MODIFIED Requirements

### Requirement: WongStack's scripts meet a quality bar

Every JavaScript file WongStack's own tests exercise, the memory worker and the check scripts included, SHALL meet a committed coverage floor that only rises, and pass the scaffold's linter; its shell scripts SHALL pass a static shell checker at warning severity.

#### Scenario: Coverage drops

- **WHEN** a change takes script coverage below the floor
- **THEN** the checks fail and name the measured and required figures

#### Scenario: A lint error in the memory worker

- **WHEN** a change leaves an unused variable in the memory worker
- **THEN** the payload checks fail and name the file

<!-- end specs/payload-checks/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 2082 -->
## MODIFIED Requirements

### Requirement: The main Worker answers its own routes

The main Worker SHALL handle `/api/`, `/_memory/`, and `/apps/<name>/api/` itself, never the single-page fallback, and SHALL never serve a mini app's source or test files. The main app SHALL bundle every mini app's server side itself, so adding an app needs no edit outside its folders.

#### Scenario: An API path in a browser tab

- **WHEN** a person opens `/apps/hello/api/greeting`
- **THEN** the hello app's handler answers

#### Scenario: A source file by path

- **WHEN** a client requests a mini app's `api.mjs` or test file
- **THEN** the Worker does not return its contents

## REMOVED Requirements

### Requirement: An untouched main app is not redeployed

**Reason**: Mini apps are main-app code, so a mini-app change is a main-app change; the mini-app scenario no longer applies.

**Migration**: See "A docs-only change is not redeployed".

### Requirement: A sync ships only the example mini app

**Reason**: Mini apps moved into `app/`; the old folder path no longer exists.

**Migration**: See "A sync ships only the example mini app's folders".

## ADDED Requirements

### Requirement: A docs-only change is not redeployed

When a branch changes only docs, CI SHALL skip the main app's migration, build, and deploy and say so. Any change to the main app, a mini app included, SHALL deploy it.

#### Scenario: A docs-only branch

- **WHEN** a branch changes only `wiki/` and `openspec/`
- **THEN** the check is green and no main-app deploy ran

#### Scenario: A mini-app change

- **WHEN** a push to the default branch changes only one mini app's folders
- **THEN** CI deploys the production main app with that change in it

### Requirement: A sync ships only the example mini app's folders

The payload SHALL carry the example mini app `hello` and no other mini app, so an app made in the source repo never reaches a target.

#### Scenario: An app in the source repo

- **WHEN** the source has the mini app `tips` and a target syncs
- **THEN** no path of the `tips` app is selected

<!-- end specs/stack-pack/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-01

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 41213 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-01-mini-apps-in-the-main-app</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
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
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-01-mini-apps-in-the-main-app">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-01-mini-apps-in-the-main-app</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A mini app is built a different way from the rest of your app: plain pages, its own tests, its own rules, and it can reach only the database. Most real tools need more than that, such as a saved key for an outside service or knowing who's signed in. That leaves two ways to build the same thing, plus a choice of which to use. One way is simpler to build, check and explain.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A mini app is part of the main app.</b> It's written like every other page, checked by the same tests, and built in the same build. Each app still has its own folder, its own address at <code>/apps/&lt;name&gt;/</code>, and its own card on the home page. The separate mini-app machinery goes away.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">BEFORE                   AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">┌──────────────────┐     ┌──────────────────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│ main app         │     │ main app         │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│  pages, API      │     │  pages, API      │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│  React, tests    │     │  React, tests    │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">└──────────────────┘     │  apps/hello      │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">┌──────────────────┐     │  apps/tips       │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">│ mini apps        │     └──────────────────┘</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">│  plain pages     │      one way to build,</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">│  own tests       │      one set of checks</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">│  copy step, list │</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">└──────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A mini app can reach everything except memory.</b> Its server side gets the database, any saved keys for outside services, and who's signed in. Your memory store stays out of reach, as today.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Every app gets the main app's checks.</b> Every line of an app's code has tests, the same as the rest of the app. A change to one app runs the whole app's checks, so it takes a little longer than before.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The home page knows its apps at build time.</b> The list is part of the page, so it no longer shows <i>Loading your apps…</i> or <i>could not load</i>. An app with no title or description fails the checks and names the folder.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Your existing mini apps move over in the next update.</b> The update plan rewrites each one into the main app's shape, at the same address, keeping its data. You see each one in the preview before anything is published. The example app, Hello, comes over the same way.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> No change to the memory store or how it's protected, to the main app's own pages, or to how a change is planned, previewed and published. No new kind of app, and no faster preview.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked how a mini app should be written once it lives in the main app → like any main-app page: the same code, tests and build, each app still in its own folder and listed on the home page.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked what a mini app should be able to reach → everything except memory: the database, saved keys for outside services, and who's signed in.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked what happens to mini apps already in installed repos → convert them in the update, each one reviewed and previewed before it's published.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: keep every app's address, <code>/apps/&lt;name&gt;/</code> for its page and <code>/apps/&lt;name&gt;/api/...</code> for its server side, because bookmarks and outside services such as payment webhooks may already call them.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: an app's page sits in <code>app/src/apps/&lt;name&gt;/</code> and its server side in <code>app/worker/apps/&lt;name&gt;/</code>, because the main app already splits pages from its server code, and each half is type-checked for its own runtime.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the main app's own <code>/api/</code> routes keep the full environment, because this change is about mini apps, and narrowing the main API is a separate decision.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the home list is compiled into the page, not fetched, because both now come from one build; this drops the loading and could-not-load states.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: existing installs are found by a check in the update's preflight, not by reading the changelog, because a repo with a <code>mini-apps/apps/</code> folder must convert whatever version it skips from.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: this repo's own tip calculator converts too and stays out of what ships, because it's source-only today.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-01</p>Check: <code>.github/scripts/app-untouched.sh</code>, <code>.github/workflows/test.yml</code>, <code>.github/workflows/deploy.yml</code>, and <code>.github/workflows/payload.yml</code> drop the separate mini-app scope, test step, and lint paths, because mini apps now run in the main app's suite and deploy with it; nothing is skipped that ran before.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-01</p>Check: <code>.github/scripts/loosened-checks.mjs</code> and <code>.github/scripts/test-file.mjs</code> keep the same test-file rule, moved beside the guard because its old home, <code>mini-apps/</code>, is gone.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-01</p>Check: <code>mini-apps/apps/hello/api.test.mjs</code>, <code>mini-apps/apps/hello/page.test.mjs</code>, and <code>mini-apps/apps/tips/tip.test.mjs</code> are deleted because they moved to Vitest beside the converted apps (<code>app/worker/apps/hello/api.test.ts</code>, <code>app/src/apps/hello/App.test.tsx</code>, <code>app/src/apps/tips/tip.test.ts</code>); <code>scripts/tests/mini-apps.test.mjs</code> goes with the code it tested, and its preview tests live on in <code>scripts/tests/cf-preview.test.mjs</code>.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-01</p>Check: <code>app/knip.jsonc</code> lists each app's <code>App.tsx</code> and <code>api.ts</code> as entries, because Vite loads them by glob where knip can't follow; this adds files to the check and loosens nothing.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-01</p>Check: <code>scripts/tests/.c8rc.json</code> stops measuring <code>mini-apps/</code>, because that folder is deleted; the coverage floor is unchanged.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: save the whole build at gate task 1.1, because the app's tests, type checks and coverage run only in CI; the spec deltas were applied to the main specs at this save, which clears the retired-names check (task 5.3), and the build helper's staged deletions of <code>mini-apps/</code> and <code>scripts/mini-dashboard.mjs</code> are kept as intended.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: tasks 1.1–3.4 and 4.2 are done, because CI passed on the branch after one fix: the app page lookup now builds its element outside the component (oxlint's components-during-render rule), and the <code>/apps/</code> redirect passes a string URL, as the Workers types require.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the preview walk (task 6.2) passed on https://mini-apps-in-the-main-app-wongstack-staging.matthewwong525.workers.dev. GET <code>/</code>, <code>/apps/hello/</code> and <code>/apps/tips/</code> return the page; <code>/apps/</code> redirects home for GET and POST; <code>/apps/hello/api/greeting?name=Sam</code> answers <code>Hello, Sam!</code> and 404s on POST; <code>/apps/hello/api.mjs</code> returns the page, not source; <code>/api/health</code> answers; <code>/_memory/</code> answers staging's no-store 404 for both methods. In the browser, Hello greeted Sam at 320px and kept the name; Tips gave $30.00 each for $100, 4 people, 20% at 390px; the home list showed Hello (Example) and Tip calculator; dark mode at 320px read clearly; no page scrolled sideways.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked whether to publish after the preview walk → ran <code>/ship</code>. Archived the complete change with the spec deltas already applied at the first save, and numbered this major release 29.0.0.</li>
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
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
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
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
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
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
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
    fit(d);
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
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
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
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
