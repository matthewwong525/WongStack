## Context

Today `mini-apps/worker.ts` serves `mini-apps/apps/` as its own Worker, `<repo>-mini`, with `scripts/cf-mini.sh` for host previews and CI deploys. The main Worker, `app/worker/index.ts`, already imports one outside module: the memory route from `.agents/skills/memory/worker/`. The main build is `scripts/cf-build.sh` → `npm run build:app` (`tsc -b && vite build`). `@cloudflare/vite-plugin` writes the client assets and a generated `dist/<worker>/wrangler.json`. `app/wrangler.jsonc` uses SPA `not_found_handling` and sets no `run_worker_first`. CI previews come from `scripts/cf-deploy.sh` (`wrangler versions upload --env staging --preview-alias <branch>`), which does nothing outside CI. See proposal.md for why.

## Goals / Non-Goals

**Goals:**
- One Worker per repo, with the mini-app code updated by `/wong-sync` like the memory route.
- The fewest target-owned edits in `app/`: one import and branch in the Worker, two config keys, and the landing page.

**Non-Goals:**
- No faster preview. A preview builds the whole app; the user chose this over a second Worker.
- No test of the main app's suite on a mini-app-only push.

## Decisions

**The router is a plain module under `mini-apps/`, imported by the main Worker.** `mini-apps/router.mjs` exports `MINI_PREFIX = "/apps/"` and `handleMiniApp(request, env, ctx, routes)`. It matches `/apps/<name>/api/*` against the route table, and falls back to `env.ASSETS.fetch(request)`. A `router.d.mts` gives `app/worker/index.ts` its types, like `memory-worker.d.mts`. Plain JS keeps `tsc -b` free of a new `include`. *Alternative:* the router in `app/worker/` — rejected, because `/wong-sync` does not update `app/`.

**The route table is a Vite glob, not a generated file.** `mini-apps/routes.mjs` maps each `apps/*/api.mjs` to its folder name with `import.meta.glob`. Vite resolves it in the Worker bundle and in Vitest, so the app's tests and `tsc -b` need no generate step first. *Alternative:* a generated `routes.gen.mjs` — rejected during apply, because the main app's test job would import a file that only the build writes.

**A handler gets `{ DB: env.DB }`, not `env`.** Production binds `MEMORY_DB` and `MEMORY_BUCKET`, and a direct save reaches production with no review. *Alternative:* pass `env` — rejected, because any mini app could read every transcript.

**`cf-build.sh` copies the mini apps after `build:app`.** `mini-dashboard.mjs --into <assets>` gets the assets folder from `wong_config assets-dir`, which reads the generated `dist/<worker>/wrangler.json` through the build's redirect. It replaces `<assets>/apps/` with each app's pages, skipping `api.mjs`, `*.test.*`, `*.ts`, and dotfiles, and writes `index.html` and `apps.json` there. The whole copy is in `scripts/`, so `/wong-sync` owns it. *Alternative:* a Vite plugin in `app/vite.config.ts` — rejected, because that file is target-owned. `npm run dev` does not serve `/apps/`; nothing depends on local dev.

**`run_worker_first: ["/apps/*"]` plus `assets.binding: "ASSETS"`.** Without them, the SPA fallback answers a browser navigation to `/apps/<name>/api/...` with `index.html`. `/_memory/` needs neither, because its callers send no navigation header.

**The deploy uses the existing `mini_changed` output.** `deploy.yml` gates the main-app steps on `untouched != 'true' || mini_changed == 'true'` and deletes the mini block. `app-untouched.sh` changes one case: only `mini-apps/apps/*` counts as untouched, so a change to `router.mjs` runs the main suite. *Alternative:* a new output — rejected, because the existing pair already says everything.

**`scripts/cf-preview.sh` replaces `cf-mini.sh`.** It reuses `lib-wrangler-config.sh` and the checks from `cf-mini.sh`'s preview mode: the staging-name check, the alias rule, staging migrations, and creating the staging Worker on first use. It runs `npm ci` in `app/` when `node_modules` is missing, then `CLOUDFLARE_ENV=staging` `cf-build.sh`, then `wrangler versions upload --env staging --preview-alias <alias>`. It reads the URL from wrangler's output, like `cf-deploy.sh`.

**The landing page reads `/apps/apps.json` at runtime.** `App.tsx` renders an `AppList` and a `Tutorial` component, each in its own file. Removing the tutorial means deleting one import and one element. The build never bakes the app list into the React bundle, so a mini-app save needs no change in `app/src`.

## Risks / Trade-offs

- [A mini-app save now waits for `npm ci` and a full build in CI] → Accepted by the user. The save reports "live when the deploy finishes" rather than live at once.
- [A broken main build blocks every mini-app save] → `main` is green by the gate. A red build shows in the deploy check, and the app stays on its preview.
- [The first host preview in a worktree pays for `npm ci`] → The script says it is installing, so the wait is explained.
- [An older install's own landing page] → It keeps the page it has, and `/apps/` lists the apps. The sync plan offers the new page as an optional task.
- [A mini app at `/apps/<name>/` shares the main app's origin, cookies, and storage] → Accepted: the same repo owns both, and a person who puts the main app behind Access now gates the mini apps too.

## Migration Plan

1. The change's PR deploys staging with `/apps/`. The PR preview shows the landing page and `/apps/hello/`.
2. The merge deploys production. Check `/apps/tips/` and `/apps/hello/api/greeting` on `wongstack.matthewwong525.workers.dev`.
3. Only then delete `wongstack-mini` and `wongstack-mini-staging` with `DELETE /accounts/{id}/workers/scripts/<name>`, and remove the `staging-mini` GitHub environment.
4. Older installs: `/wong-sync` plans the same steps, with the Worker delete in setup's runbook as a new "Moving older mini apps" section.

Rollback: revert the merge. The mini Workers are deleted only after step 2 passes, so a revert before step 3 finds them still serving.

## UX

### Brief

- **Who:** a person who just installed WongStack and opens their app for the first time, often on a phone from the setup's final message.
- **The job:** see what they have, open an app, and learn the next thing to ask the agent.
- **Done:** they opened an app, or they know the words to type next.
- **Context:** used a few times a week at first. After the tutorial is removed, it is mostly the app list. With zero or one app it is common; with more than twenty it is rare.
- **Mirror:** the generated `/apps/` page — the same list, in the React app.

### Flow

Open the app → read the tutorial message → ask the agent to remove it, which is the first change. Or scroll to the list → tap an app.

### Hierarchy

On a new install the primary action is **the first change**, so the tutorial message comes first; once it is removed, the list is the whole page. The one thing to type is set as code so the person can copy it.

### Components

- `AppList`: loading, empty ("No mini apps yet. Ask the agent: make me a tip calculator"), error (a link to `/apps/`), and a list of rows with a title and a description.
- `Tutorial`: a heading, "Start here: remove this message", and four steps: ask the agent to remove it, say yes to the plan, say yes to the preview, and see it gone.
- The Vite template's hero, counter, and social links are removed.

### Review

[review.html](review.html) — the item "The landing page lists the apps and teaches the loop" sketches the phone screen.
