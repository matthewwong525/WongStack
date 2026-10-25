# Design

## Context

See proposal.md, Why. Today `app/worker/index.ts` re-exports `Line` from `app/worker/apps/inbox/line.ts`, and `app/wrangler.jsonc` binds `LINE` to that class in production, staging and local, with migration `line-1` (`new_sqlite_classes`). Cloudflare: *"Version URLs are not generated for Workers that implement a Durable Object"* ([previews](https://developers.cloudflare.com/workers/configuration/previews/)); the page says nothing about a Worker that only binds another Worker's class with `script_name`.

What shapes the approach:

- **The deploy key never meets branch code.** `deploy.yml` builds the branch keyless, then runs the *default branch's* `cf-deploy.sh --take-build`, which copies in `dist/` and the build's redirect and refuses a build that names another Worker, a route, a build command, a stray path, or `auxiliaryWorkers` (`buildProblem` in `scripts/lib-wrangler-config.mjs`). So a change to the deploy scripts takes effect only once published, including in each install's update branch.
- **`Line` reads only `DB`** (`Pick<Env, "DB">`) and imports `schedule-store.ts` and `store.ts`. Its storage holds `who` (installation, email) and the alarm; every schedule and run is in D1. `connect` and `/wake` rewrite `who` and re-arm.
- **The app reaches the line by stub `fetch`** (`wake.ts`, the line route forwarding the WebSocket upgrade to `/connect`), which works the same across Workers. `wake` already tolerates a missing binding.
- **Durable Object migrations:** Cloudflare's [migrations page](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/) says deleting a class destroys its data permanently, and a transfer between Workers takes four ordered deploys and fails when the source has no namespace. `wrangler versions upload` refuses pending migrations. The new `exports` field can't be mixed with `migrations`, and a Worker can't return to `migrations` after it, so this change stays on `migrations`.

## Goals / Non-Goals

**Goals:** a per-change preview link for every app change; the line's behavior unchanged; one config fragment that serves both a new install and an install whose app holds the line; the deploy key's trust boundary unchanged.

**Non-Goals:** a preview link for the line's own code (it runs on the staging line Worker); keeping the old Durable Object storage; moving to `exports`.

## Decisions

### 1. Prove the link first, with throwaway Workers

Before any other task, in this account, with the host's token:

1. Deploy `wong-probe-line` exporting a tiny SQLite class `Probe`.
2. Deploy `wong-probe-app` exporting its own `Probe` (migration `p-1` new), as an existing install's app does today; `versions upload --preview-alias probe` should print no URL, which confirms the cause.
3. Redeploy `wong-probe-app` with no class, migration `p-2` `deleted_classes`, and binding `PROBE` with `script_name: wong-probe-line`; run `versions upload --preview-alias probe`. **Pass:** a URL prints, and fetching it reaches the probe object through the binding.
4. Deploy a fresh `wong-probe-app2` straight from the step-3 config (both migrations at once), as a new install would, and upload a version. **Pass:** deploy succeeds and a URL prints.
5. Record two side answers: whether deploying a binding whose `script_name` names a missing Worker fails, and whether `versions upload` refuses a pending `deleted_classes` migration.
6. Delete all three Workers.

Result: passed once the app's binding took a new name, `LIVE_LINE` (proposal decision log). Step 3 or 4 printing no URL stops the change: report to the person with the evidence and the remaining options (live with staging-only checks, or a different split); build nothing else. The results go in the wiki (decision 9), not here. Alternative: trust the page's silence. Rejected; the person asked for the test.

### 2. The line Worker sits in `app/` with its own config

- `app/worker/line-worker.ts`: `export { Line } from "./apps/inbox/line.ts"` and a default `fetch` answering 404.
- `app/wrangler.line.jsonc`: `name: "<worker>-line"`, `main: "worker/line-worker.ts"`, the app's `compatibility_date` and flags, `workers_dev: false`, `preview_urls: false`, no routes, no crons; `DB` bound to production's database; `durable_objects` binding `LINE` to `Line`; migration `line-1` `new_sqlite_classes: ["Line"]`. `env.staging`: `name: "<worker>-line-staging"`, `DB` the staging database, its own `LINE` binding. `env.local`: `name: "<worker>-line-local"`, `DB` the same local database id as the app's local env, so both share one local database.
- `app/wrangler.jsonc`: the binding becomes `LIVE_LINE`, with `script_name` per environment (`<worker>-line`, `-line-staging`, `-line-local`), since Cloudflare refuses to delete a class while a binding keeps its old name (probe, code 10061); migrations become `line-1` (new) then `line-2` (`deleted_classes: ["Line"]`); `index.ts` stops exporting `Line`. A new install applies both migrations on its first deploy (probe step 4 proves it).
- The line's import graph stays free of Vite-only `import.meta.glob`, because Wrangler bundles the line alone: `app/worker/apps/inbox/rows.ts` holds `Scope`, `mine` and `seen`, which `line.ts` and `schedule-store.ts` import instead of `store.ts` (whose actions reach the app's mini-app list). `line-worker.test.ts` walks the graph and fails on a glob.

Alternative: a pack folder like the check runner's. Rejected: the line shares the app's code and `node_modules`, and the runner folders own their own `package.json`.

### 3. Delete the old namespace, don't transfer it

`line-2` deletes `Line` in the app Worker and its staging twin. What's lost is `who` and the alarm; on deploy every socket drops, the helper reconnects within a minute, and `connect` rewrites both and re-arms. Schedules come due in D1 regardless; a run that came due while no line held an alarm is ticked on that first `hello`, by the existing `missed`/late rules. Alternative: the four-step transfer, rejected in the proposal's Decision log.

### 4. Builds: the line's code is built keyless, beside the app

- `app/vite.config.ts` adds `auxiliaryWorkers: [{ configPath: "./wrangler.line.jsonc" }]` only when `command === "serve"`, so local dev runs both and a build's redirect lists no auxiliary Worker (the existing refusal stays as it is).
- `cf-build.sh --build-only` (and the no-flag path) also bundles the line: `wrangler deploy --dry-run --outdir dist/line --config wrangler.line.jsonc` with `--env staging` off the production branch. `copyBuild` already copies all of `dist/`, so the default branch's older scripts carry it and ignore it.
- A repo with no `wrangler.line.jsonc` skips the line everywhere: the pack scripts stay byte-identical across installs at either stage.

### 5. Deploys: the line first, always from the default branch's settings

`cf-deploy.sh`, when the trusted checkout has `wrangler.line.jsonc`:

- **Production branch:** `wrangler deploy dist/line/<entry> --no-bundle --config wrangler.line.jsonc`, then the app as today.
- **Other branches:** the same with `--env staging`, then `wrangler deploy --env staging`, then `versions upload`.

The line's config is never taken from a branch: `copyBuild` doesn't copy `wrangler.line.jsonc`, and a new `lineProblem` check refuses a trusted line config whose staging name equals production's, whose staging `DB` isn't the app's staging database, or that sets `workers_dev`/`preview_urls` true or a route. The built entry is checked to sit inside `dist/line/` (the existing `strayPath`/`linkOnTheWay` rules). `buildProblem` also refuses a preview build whose Durable Object bindings name a `script_name` other than the default branch's staging line Worker, so a branch can't point the staging app at the live line. A failed line deploy exits non-zero before the app deploys (`set -e`).

Alternative: vite `auxiliaryWorkers` in builds too, with `buildProblem` loosened to allow the line. Rejected: it loosens a check, and the default branch's older scripts would refuse every update branch's build.

### 6. Previews from the agent host

`cf-preview.sh` builds as above, deploys the staging line Worker from the host's checkout before uploading (creating it when missing), then uploads the app's version. When the upload is refused for a pending Durable Object migration (probe side answer), it deploys the staging app once and uploads again, as it already does for a missing Worker. Staging is the shared playground, so a line change shows there.

### 7. Setup and the update create the line Workers first

`provision.mjs`:

- Writes `app/wrangler.line.jsonc` from a second fragment in `stack-pack-fragments.md` (heading `wrangler.line.jsonc`), filled from the app config's Worker and database names and ids, when absent.
- Updates `app/wrangler.jsonc`: each environment's binding becomes `LIVE_LINE` with its `script_name`, and `line-2` is appended when `line-1` is there and `line-2` isn't, noting `updated`; a config it can't patch becomes a to-do line, as the bucket and Access updaters do.
- Deploys both line Workers from this computer (`wrangler deploy --config wrangler.line.jsonc` and `--env staging`) before reporting, so the update branch's first deploy, run by the default branch's older scripts, binds to Workers that exist. Rerun: a deploy of unchanged code is harmless.

The app fragment in `stack-pack-fragments.md` gets the `LIVE_LINE` bindings and `line-2`; the line's template is `wrangler.line.template.jsonc` beside it. An existing Worker with a line name counts as this install's only when the install record lists it under `components.liveLine.workers`; otherwise provisioning leaves a clash to-do and writes and deploys nothing for the line.

### 8. Checks that keep staging off the live line

- `cf-secrets.mjs`: a Durable Object binding with `script_name` must be twinned: staging's `script_name` must differ from production's, else the check fails naming the binding. Same-Worker classes stay exempt, as today.
- `check-private-access.mjs`: the line Worker has no address, so it needs no Access app; the check confirms the line config keeps `workers_dev` and `preview_urls` false and no route, else refuses.

### 9. Docs

- `wiki/stack/live-line.md`: the line runs in its own Worker; how to change and test it (staging line, not the change's link); the probe's answers.
- `wiki/stack/d1-pipeline.md`: a short section *A Worker that holds a Durable Object gets no preview link*, the fact and the split, linked from the two-URLs table; the deploy order.
- `wiki/stack/staging-bindings.md`: the Durable Objects row says a `script_name` binding needs its staging twin.
- `CHANGELOG.md`: `## Next (minor) — App changes get their preview link back`, with an **Updating.** note in plain words: the update makes two small Cloudflare Workers for the live line; the line's old saved state in the app is deleted and can't be undone, and your computer puts it back when it reconnects; schedules and the inbox are unchanged; publish the update as usual.
- `payload-files.json` and `payload-manifest.md`: `app/worker/line-worker.ts` ships with the scaffold; `wrangler.line.jsonc` is target-owned, written by provisioning like `wrangler.jsonc`.

## Risks / Trade-offs

- [The probe fails] → the change stops at task 1; nothing else is built or deployed.
- [An update branch's first save fails because setup's line deploy was skipped] → provisioning runs in the update plan before the first save, and the deploy error names the missing Worker; the fix is rerunning setup's Cloudflare step.
- [A line code change isn't on its own link] → it is on staging, which every branch push redeploys; the wiki says to check line changes there.
- [Two branches race on the staging line] → as today with the staging app: last push wins.
- [Local dev and the runtime tests] → local dev runs both Workers; `app/tests/runtime/setup.ts` builds the app with no `LIVE_LINE` binding, which `wake` already tolerates, so it needs no change.
- [An install on Workers Builds] → the same `cf-deploy.sh` runs as its deploy command and deploys both Workers in order.

## Migration Plan

1. In WongStack: the probe; then the build; then, from this host before the first save, provisioning's line deploy for `wongstack-line` and `wongstack-line-staging`.
2. First save: CI (main's older scripts) deploys the staging app pointing at `wongstack-line-staging` and prints a link.
3. Publish: main's new `cf-deploy.sh` deploys `wongstack-line`, then `wongstack` with `line-2`.
4. Installs: `/wong-sync` merges both fragments and runs provisioning, which creates their line Workers before the update's first save.

Rollback: revert the release. The app Worker would then need `Line` back with a new `new_sqlite_classes` migration (`line-3`), since `line-2` deleted it; its storage starts empty, which costs the same reconnect.
