# Serve mini apps from the main app

**Status:** ready-to-ship
**Branch:** explain-wongstack-and-app
**Open questions:** none

## Why

Mini apps run on a second Worker, `<repo>-mini`, at a second address. That Worker has its own config, deploy step, preview script, and expiry logic. Its only benefit is a preview that never builds `app/`, and that speed does not justify a second Worker. Memory already moved into the main Worker in 23.0.0. Mini apps can move there too, so each repo has one Worker and one address.

## What Changes

- **One Worker serves the app and every mini app.** The main build copies each app's pages into its assets under `/apps/<name>/`. The main Worker sends `/apps/<name>/api/*` to that app's `api.mjs`, the same way it sends `/_memory/` to memory. A handler gets only the app database, `DB`, and never the memory bindings.
  ```text
  wongstack.<you>.workers.dev
   │
   ├─ /            landing page (React)
   ├─ /apps/       generated app list
   ├─ /apps/tips/  mini app pages
   ├─ /apps/tips/api/*  ─▶ tips/api.mjs
   └─ /_memory/*        ─▶ memory route
  ```
- **A mini-app preview builds the whole app.** `/apply` runs `scripts/cf-preview.sh --alias mini-<name>`. The script installs `app/` when it has no `node_modules`, builds the app, and uploads a preview version of the staging main Worker under that alias. The preview uses staging data. It takes longer than today's upload, because it now builds the whole app.
- **A mini-app save deploys the main Worker.** The direct save to `main` does not change. CI on `main` still runs only the changed app's tests, and skips the main app's suite. It now builds and deploys the main Worker, so the app goes live at `/apps/<name>/`.
- **BREAKING: the mini Worker is gone.** `mini-apps/wrangler.jsonc`, `mini-apps/worker.ts`, `scripts/cf-mini.sh`, the mini deploy step, and the seven-day preview expiry are removed. The `<repo>-mini` and `<repo>-mini-staging` Workers are deleted, and the old `<repo>-mini.<you>.workers.dev` address stops answering. `/wong-sync` plans the same move for older installs.
- **The landing page lists the apps and teaches the loop.** The starter app's Vite template page becomes a tutorial message at the top and a list of the mini apps, read from a generated `/apps/apps.json`. The tutorial's one task is to remove itself, which walks the person through the loop.
  ```text
  ┌──────────────────────────────┐
  │ Start here: remove this      │
  │ message                      │
  │ 1 Tell the agent: "remove    │
  │   the tutorial message"      │
  │ 2 Read the plan, say yes     │
  │ 3 Try the preview, say yes   │
  │ 4 The message is gone        │
  │                              │
  │ Your apps                    │
  │ ┌──────────────────────────┐ │
  │ │ Tips                     │ │
  │ │ Split a bill with a tip  │ │
  │ ├──────────────────────────┤ │
  │ │ Hello                    │ │
  │ │ Say hello from the API   │ │
  │ └──────────────────────────┘ │
  └──────────────────────────────┘
  ```

**Non-goals:** no change to the mini-app folder, `app.json`, or where the tests live. No change to the direct save route or its fallback to a pull request. No move of a mini app into the React app. No new landing page for older installs: they keep their own and get the generated `/apps/` page.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mini-apps`: mini apps are served by the main Worker under `/apps/`; the preview builds the whole app; the preview no longer expires; a save deploys the main Worker; the landing page lists the apps.
- `stack-pack`: the main app deploys when mini apps change; the pack no longer ships a mini Worker or its script; it ships a host preview script for the main app; older installs delete the mini Workers.
- `ci-tests`: a mini-app-only push skips the main app's suite but no longer skips its deploy.
- `delivery-gate`: a mini-app preview is a preview version of the staging main Worker, not of a mini Worker.

## Impact

- **Code:** `app/worker/index.ts` gains the `/apps/` route; a router module replaces `mini-apps/worker.ts`; `scripts/mini-dashboard.mjs` also writes `apps.json` and copies the pages into the build; `scripts/cf-build.sh` runs it; `scripts/cf-preview.sh` replaces `scripts/cf-mini.sh`.
- **Config:** `app/wrangler.jsonc` and its stack-pack fragment gain an `ASSETS` binding and `run_worker_first` for `/apps/*`. `mini-apps/wrangler.jsonc` and its fragment are removed.
- **CI:** `deploy.yml` builds and deploys the main app when `mini-apps/` changed, and loses the mini-app block and the `staging-mini` environment.
- **App:** `app/src/App.tsx` becomes the landing page with the app list and the tutorial, with tests.
- **Skills:** `/apply`'s mini-app path, the mini-app save reference, `/ship`'s mini-app merge, setup's provisioning runbook, and `/wong-sync`'s manifest and move step.
- **Cloudflare:** two Workers fewer per repo. A mini-app save now waits for a CI build of the main app before it is live.
- **Docs:** `wiki/stack/mini-apps.md`, the change loop, the Access page, the stack hub, `README.md`, and the `WONG-STACK` block.
- **Release:** 24.0.0, because the mini Worker and its address are removed.

## Decision log

- **2026-09-26** — Found: memory thread #201 deferred serving mini apps at `/apps/*` through a service binding. 23.0.0 moved memory into the main Worker at `/_memory/`.
- **2026-09-26** — Asked how the main app should serve mini apps → the user chose **preview only the mini app, but ship it as part of the main app**, over a service binding or a dashboard page only.
- **2026-09-26** — Asked what happens to `<repo>-mini.<you>.workers.dev` → chose **turn it off**.
- **2026-09-26** — Asked whether the main app links to the apps → chose **the landing page shows the apps, with a tutorial whose last step removes the tutorial**.
- **2026-09-26** — Asked whether a preview can skip the mini Worker with a smaller build → the user said **build the whole app for a preview and keep it together**, rather than keep a second Worker for preview speed.
- **2026-09-26** — Assumed: a mini-app handler gets only `DB`, because a direct save reaches production with no review, and the production Worker also binds `MEMORY_DB` and `MEMORY_BUCKET`.
- **2026-09-26** — Assumed: mini-app previews no longer expire, because they are now ordinary preview versions of the staging main Worker, like every pull-request preview.
- **2026-09-26** — Assumed: the generated `/apps/` page stays beside the React landing page, because older installs keep their own `app/src` and need a list too.
- **2026-09-26** — Assumed: the host preview script is general (`cf-preview.sh`, not a mini script), because it uploads the whole main app under any alias.
- **2026-09-26** — Assumed: `app-untouched.sh` keeps its outputs, and `deploy.yml` also deploys when `mini_changed` is true, because the test job still skips the main suite for mini-app-only pushes.
- **2026-09-26** — Assumed: `/wong-sync` deletes the two mini Workers only after production serves `/apps/`, with a runbook step like 23.0.0's token cleanup, because an early delete takes saved apps offline.
- **2026-09-26** — Assumed: this also closes memory thread #200 (a commit that changes both apps publishes one preview), because there is only one Worker to preview.
- **2026-09-26** — Assumed: release 24.0.0.
- **2026-09-26** — Assumed during apply: the route table is a Vite `import.meta.glob` in `mini-apps/routes.mjs`, not a generated `routes.gen.mjs`, because the main app's test job imports the Worker before any build runs.
- **2026-09-26** — Assumed during apply: the copy replaces `<assets>/apps/` rather than refusing an existing one, because `/apps/` belongs to the mini apps and a rebuild must not fail on its own earlier copy.
- **2026-09-26** — Assumed during apply: `mini-apps/.gitignore` goes too, because nothing writes into `mini-apps/` any more.
- **2026-09-26** — Assumed: the check of production `/apps/` and the delete of `wongstack-mini` and `wongstack-mini-staging` happen after the merge, outside the task list, because an archived change can not hold a post-merge task. The design's Migration Plan owns the steps, and each delete gets a confirm.
- **2026-09-26** — Apply evidence on the host: 258 script tests pass; the app's lint, `tsc -b`, Vitest (30 tests, 100% coverage), and Stryker on the changed files (34 mutants, 100%) pass. CI stays the gate.
- **2026-09-26** — Distilled facts at ship: the store holds no live fact for this change or its branch, so no repeatable fact moved. The wiki edits ride in this change: `wiki/stack/mini-apps.md`, the change loop, the Access page, and the stack hub.
- **2026-09-26** — Archive checkpoint: every task checked, the change archived with its deltas synced into `openspec/specs/` (mini-apps, stack-pack, ci-tests, delivery-gate), and three session facts stored.
- **2026-09-26** — Asked after the first walk (the user, mid-ship): "Tutorial should be to remove the tutorial message" → the tutorial moved to the top as one message whose only task is to remove itself, walking the plan, preview, and publish steps. The spec, design, sketch, docs, and tests follow.
- **2026-09-26** — Merged `origin/main` (23.1.0 #128 and 23.2.0 #129) into the branch: VERSION stays 24.0.0, the changelog keeps both entries, and the README and `WONG-STACK` block take main's new wording with the mini-app lines updated for `/apps/`.
