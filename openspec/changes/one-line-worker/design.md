# Design

## Context

See proposal.md, Why. Since 44.12.0 the line runs in `<worker>-line` (`app/wrangler.line.jsonc`, entry `worker/line-worker.ts`) with a staging twin `<worker>-line-staging` and a local one. `app/wrangler.jsonc` binds `LIVE_LINE` with a `script_name` per environment. What shapes the approach:

- **The default branch runs every CI check.** The parity step runs main's `cf-secrets.mjs` on a preview's copied-in `app/wrangler.jsonc`; before [staging-may-skip-the-line](../archive/2026-10-25-staging-may-skip-the-line/design.md) it fails a staging app with no `LIVE_LINE`. So this change builds only once that release is live, here and in each install.
- **Wrangler doesn't inherit bindings into an environment.** Leaving `durable_objects` out of `env.staging` gives the staging app no binding. `wake` and the `line` route already handle none: no wake, and `503` *This app has no line yet; the inbox keeps checking*. The page and helper fall back to polling, and `claim` ticks due schedule runs, so schedules on staging still come due on the 10-second check.
- **Main's older scripts deploy the staging line on every push of an update branch**, from main's own `wrangler.line.jsonc`. They stop only once the update is published, so the old staging line can't be deleted before that.
- **ClaymooApp** (`~/ClaymooApp/apps/line/`) runs one `claymoo-line` from `main` only, over a service binding, and gates previews in code on the database id; its previews answer `503` and its wiki tests line changes on the live app. WongStack's separate staging Worker lets it leave the binding out instead.

## Goals / Non-Goals

**Goals:** one line Worker per install, for production; no preview binds any line; `env.local` keeps its line for local dev; each install's update strips its test line from its settings.

**Non-Goals:** a service binding; deleting the old staging line by script; changing the line's code; the real helper reaching a local app.

## Decisions

### 1. Config: production and local only

- `app/wrangler.jsonc`: drop `durable_objects` from `env.staging`, with a one-line comment saying previews have no line (wiki link). Production and `env.local` keep `LIVE_LINE`. Migrations `line-1`/`line-2` stay, so a fresh staging Worker applies both and holds no class.
- `app/wrangler.line.jsonc` and `wrangler.line.template.jsonc`: drop `env.staging`; keep `env.local`.
- `stack-pack-fragments.md`: the app fragment drops staging's `LIVE_LINE` line.
- `app/worker-configuration.d.ts`: regenerate with `npm run cf-typegen`.

### 2. Builds and deploys: the line on the default branch only

- `cf-build.sh`: keep bundling `dist/line/` on every build, keyless, previews too. An install's update runs its old default branch's `cf-deploy.sh`, which deploys a preview's test line from that bundle; without it the update's own preview fails (`the build has no dist/line/line-worker.js`). After the update, a preview's bundle goes unused.
- `cf-deploy.sh`: drop the preview branch's `wong_deploy_line cf-deploy --env staging` and its header lines; production keeps `wong_deploy_line cf-deploy` before the app.
- `cf-preview.sh`: drop step 5 and its call. The pending-migration retry stays: a new staging Worker still applies `line-1`/`line-2`.
- `lib-wrangler-config.sh`: `wong_deploy_line` takes no environment.

### 3. Checks: staging reaches no other Worker's objects

- `lineProblem` refuses a line config with an `env.staging` ("previews have no line; remove env.staging"); checks only production's database against the app's; `lineAddressProblem` checks the top level and `env.local`, so a local block can't add an address either.
- `stagingLineProblem` becomes: a preview build or the source's `env.staging` refused for any Durable Object binding with a `script_name`, naming it.
- `cf-secrets.mjs`: `checkDurableObjectTwins` becomes a check that `env.staging` binds no Durable Object with a `script_name`, whatever production binds; the message names the binding and says staging must reach no other Worker's objects. Same-Worker classes stay exempt. Rename it to what it now checks.

Alternative: refuse only names matching a line Worker. Rejected in the proposal's Decision log: the deploy already refused every other `script_name`, so a narrower `secrets:check` would only disagree with it.

### 4. Setup: settings only, and the clash check

`provision.mjs`:

- `lineConfig` fills production's placeholders only.
- `lineInConfig`: the wanted shape is `LIVE_LINE` at the top level and in `env.local`, none in `env.staging`, plus `line-2`. It patches a pre-44.12 `LINE` binding in production and local, deletes staging's `LINE` or `LIVE_LINE` block by text, reparses, and restores with `LINE_TODO` on an unknown shape. `LINE_TODO`'s text follows.
- A new `lineFileCurrent` step does the same for `app/wrangler.line.jsonc`: delete `env.staging` by text, keeping comments, reparse, restore with a to-do when unknown; note `updated`.
- `liveLine`: one wanted name, `<worker>-line`; the clash check against Cloudflare's list and `components.liveLine.workers` stays; the record becomes `{ workers: ["<worker>-line"] }`. No deploy: `lineWorkers` and the `lines` option go, and so do its to-do and the `created … live line Workers` note.

Alternative: keep deploying the live line from setup. Rejected in the proposal's Decision log.

### 5. Local try: the app, its line, and a stand-in computer

Why it fails today: `npm run dev` stops on `Denied ID …/scripts/employee-bootstrap.mjs?raw`, because `app/worker/employee-access/setup-file.ts` imports a file outside `app/` and Vite's dev server refuses it. And `humanEmail` (`app/worker/employee-access/policy.ts`) refuses `DEV_IDENTITY` in `app/worker/access.ts`, which has no `sub` and `exp: 0`, so every person-only route, the line and the inbox included, answers as signed out locally.

- **`npm run dev` starts.** `app/vite.config.ts` lets the dev server read exactly that one file (`server.fs.allow`: the workspace root plus `../scripts/employee-bootstrap.mjs`), serve only. Alternative: move the import. Rejected: the build already bundles it, and the file is the one setup hands to employees.
- **The stand-in counts as a person, locally only.** `DEV_IDENTITY` becomes a function giving `sub: "local"` and `exp` an hour ahead of now, still returned only when `WONG_ENVIRONMENT=local`, `SKIP_AUTH=true` and a loopback hostname all hold. `hasSignIn` stays false locally.
- **A stand-in computer.** A small script in `scripts/` opens the local line as a computer (`/apps/inbox/api/line?computer=<random 32 hex>`, no `Origin`), prints each message with the time since it joined, and closes on Ctrl-C. It refuses any address that isn't `localhost`, `127.0.0.1` or `[::1]`, so it can never point at a live app. It needs no package: Node's own `WebSocket`.
- **Local data.** The walk applies the local database's migrations first (`npm run db:migrate:local` or its equivalent), so the inbox has its tables and an installation id.
- The walk: `npm run dev`, open the local inbox (the page joins), run the stand-in, make a test item the way a chat does, tap it, and see the stand-in print *look* within a second. If `auxiliaryWorkers` under `npm run dev` doesn't run the line, the `wrangler dev` pair with both configs is the documented path instead.

### 6. Docs and release

- `wiki/stack/live-line.md`, *Its own Worker*: one Worker, `<worker>-line`, for the live app; **previews have no line** (the `503`, the fallback checks, never a live computer); the first publish makes it; the clash check. *Change or test it*: replace the staging walk with **try a line change on this computer** (decision 5's walk, as checked while building) and **then on the live app**, after publishing: `helper.mjs status`, tap a test plan in the live inbox and time it, see the tap in `~/.wong-stack/helper/log.jsonl`, close the test item and any test schedule (ClaymooApp's recipe).
- `wiki/stack/d1-pipeline.md`: the `cf-deploy.sh` and `cf-preview.sh` rows lose the staging line.
- `wiki/stack/staging-bindings.md`: the Durable Objects row says staging binds no other Worker's Durable Object; `secrets:check` fails on one.
- `wiki/people/matthew-wong.md`: the live line joins memory and kept pictures as live-only.
- `scripts/retired-names.json`: `-line-staging` → "no test line: previews have none", allowing `provision.mjs` and its test, which still read an install's leftover.
- `CHANGELOG.md`: `## Next (minor) — One live line, for the live app only`. **Updating.**, plain: publish 44.13.0, *The test copy may run without the live line*, first if your live app doesn't have it, or this update's first save fails a check; previews' inbox checks every few seconds instead of updating at once; after publishing, delete the old test line from Cloudflare, `<your-app>-line-staging` (in `app/`, `npx wrangler delete --name <your-app>-line-staging`), which can't be undone and held only test state.

## Risks / Trade-offs

- [An install takes both releases in one update] → main's old parity check fails the update's first save; the **Updating.** note says to publish the small one first.
- [Cloudflare refuses to delete the old staging line while older staging versions bind it] → WongStack deletes its own first (after publishing, in the Decision log) and the wiki and **Updating.** note take whatever step that needed.
- [A line change breaks the live line] → computers and inboxes fall back to the 10-second check; revert the release. Tests and the local run are the check before merging.
- [Open branches made before publishing] → after publishing their pushes run the new scripts and deploy no staging line; a branch still carrying the old staging binding is refused by the deploy until it brings in `main`.

## Migration Plan

1. [staging-may-skip-the-line](../archive/2026-10-25-staging-may-skip-the-line/proposal.md) is live.
2. Build; `/save`: CI (that release's checks) deploys the staging app with no binding and prints a link. Main's scripts still deploy `wongstack-line-staging` on these pushes, harmlessly.
3. Publish: the new `cf-deploy.sh` deploys `wongstack-line`, then `wongstack`.
4. Delete `wongstack-line-staging`, with Matthew's yes.
5. Installs: `/wong-sync` merges the fragments and runs setup, which strips the test line from their settings; after publishing, the sync plan's step deletes `<app>-line-staging`. WongOS does this in its sync after this ships.

Rollback: revert the release; the next preview needs `<worker>-line-staging` again, which the restored scripts redeploy.
