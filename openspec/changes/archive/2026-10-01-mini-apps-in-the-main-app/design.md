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
