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
