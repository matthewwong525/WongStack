<!-- openspec-archive v1 2026-10-25-line-in-its-own-worker -->
<!-- file proposal.md utf8 9493 -->
# App changes get their preview link back: the live line moves to its own small Worker

**Status:** ready-to-ship
**Branch:** greedy-whale
**Open questions:** none.

## Why

Since 44.11.0, a change to your app makes no link to look at before it goes live. Cloudflare makes no preview link for an app that holds a live object of its own, and the live line, which wakes your computer when you tap in the inbox, is one. So building and checking an app change now skips the step where you see it first. It showed in WongOS on 2026-10-25.

## What Changes

- **Every app change gets its own link again.** The app stops holding the line itself and only points at it, so Cloudflare makes a link for each change, as it did before 44.11.0.
  ```mermaid
  flowchart LR
    change["app change"] --> before{"holds<br/>the line?"}
    before -->|"yes, now"| none["no link"]
    before -->|"no, after"| link["a link"]
  ```
- **A quick test comes first.** Cloudflare's page doesn't say whether an app that only points at a line in another Worker gets a link. Before anything else is built, two throwaway Workers in your Cloudflare account answer it, then get deleted. If there's still no link, the work stops and comes back to you with other options.
  ```mermaid
  flowchart LR
    test["throwaway test"] --> got{"link?"}
    got -->|yes| build["build the rest"]
    got -->|no| stop["stop, ask you"]
  ```
- **The live line moves into its own small Worker.** It does what it does today: wakes your computer and your open inbox, and keeps the schedule clock, writing to the same database. It has no web address, so only your app can reach it. Your computer still connects to the app, signed in as you, and the app passes the line through.
  ```svg
  <svg viewBox="0 0 560 120">
    <rect x="8" y="40" width="120" height="40" fill="card" stroke="line"/>
    <text x="22" y="65">your computer</text>
    <rect x="200" y="40" width="120" height="40" fill="card" stroke="line"/>
    <text x="236" y="65">the app</text>
    <rect x="392" y="8" width="160" height="40" fill="card" stroke="fg"/>
    <text x="410" y="33">the line Worker</text>
    <rect x="392" y="72" width="160" height="40" fill="card" stroke="line"/>
    <text x="428" y="97">the database</text>
    <path d="M128 60h64m-8-6 8 6-8 6" fill="none" stroke="fg"/>
    <text x="134" y="52" fill="muted">sign-in</text>
    <path d="M320 54l64-22m-10-2 10 2-6 8" fill="none" stroke="fg"/>
    <path d="M320 66l64 22m-6-8 6 8-10 2" fill="none" stroke="line"/>
    <path d="M472 48v16m-6-8 6 8 6-8" fill="none" stroke="muted"/>
  </svg>
  ```
- **Publishing puts the line out first, then the app.** Every save and every publish does it in that order, so the app never points at a line that isn't there. A change to the line's own code shows on the shared test copy of the app, not on that change's own link: the line has no link of its own.
  ```mermaid
  flowchart LR
    save["publish"] --> line["line Worker"] --> app["app"] --> link["link"]
    line -->|fails| stop["stop; app<br/>unchanged"]
  ```
- **Setup and updates make the line Worker for you.** A new app gets its live and test line Workers at setup. An app that already has the line gets them when it takes this update, before its first save. The update deletes the line's old saved state inside the app, and that can't be undone. It holds only who the line belongs to and when it next wakes; your computer reconnects within a minute and puts both back. Your schedules, their runs, and your inbox live in the database and stay as they are.

Non-goals: a link of its own for the line's code; Cloudflare's four-step move that keeps the old saved state; changing what the line or schedules do; WongOS taking this update (a later sync, there).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `live-line`: the line runs in its own Worker with no address of its own, and the app keeps per-change preview links.
- `stack-pack`: deploys put the line Worker out before the app, from the default branch's settings; the staging app points only at the staging line.
- `cloudflare-provisioning`: setup and the update create both line Workers before the first save.

## Impact

- **App:** `app/wrangler.jsonc` (the binding becomes `LIVE_LINE` with a `script_name` per environment; migration `line-2` deletes `Line`), new `app/wrangler.line.jsonc` and `app/worker/line-worker.ts`, `app/worker/index.ts` stops exporting `Line`, `app/vite.config.ts` runs the line beside the app in local dev.
- **Pack scripts:** `scripts/cf-build.sh`, `scripts/cf-deploy.sh`, `scripts/cf-preview.sh`, `scripts/lib-wrangler-config.mjs`/`.sh`, `scripts/cf-secrets.mjs`, `scripts/check-private-access.mjs`, and their tests.
- **Setup:** `.agents/skills/wong-setup/scripts/provision.mjs`, `.agents/skills/wong-sync/references/stack-pack-fragments.md` and a new `wrangler.line.template.jsonc` beside it, `payload-files.json` and the manifest.
- **Docs:** `wiki/stack/live-line.md`, `wiki/stack/d1-pipeline.md`, `wiki/stack/staging-bindings.md`, `CHANGELOG.md` (minor).
- **Cloudflare:** two new Workers per install (`<app>-line`, `<app>-line-staging`); the `Line` namespace in the app's Workers is deleted.

## Decision log

- **2026-10-25** — Asked (Matthew, in the request) how to get preview links back → chose moving the live line into its own small Worker that the app points at, fixed in WongStack first and taken by WongOS in a later sync.
- **2026-10-25** — Asked (Matthew, in the request) whether to trust the Cloudflare page or test → chose a throwaway test before building the rest, since the page doesn't cover an app that only points at another Worker's line.
- **2026-10-25** — Assumed: the old line state is deleted, not moved with Cloudflare's transfer, because it holds only the owner's name and the next wake time, both rewritten when the computer reconnects (every deploy drops the sockets anyway), while a transfer takes four ordered deploys per Worker and fails on a fresh install with nothing to move.
- **2026-10-25** — Assumed: the line Worker lives in the app's folder with its own settings file, not in a separate pack folder, because it shares the app's schedule and inbox code and its tools.
- **2026-10-25** — Assumed: setup creates both line Workers from this computer before the update's first save, because that save's preview runs the default branch's older deploy scripts, which don't know the line Worker.
- **2026-10-25** — Assumed: the line Worker's settings always come from the default branch, and only its built code from a branch, because a branch must not pick which Worker or database the deploy key writes to.
- **2026-10-25** — Assumed: a change to the line's own code is checked on the staging copy, not its own link, because Cloudflare makes no link for a Worker that holds a live object, which is the whole cause.
- **2026-10-25** — Fixed: the probe passed with one change. Cloudflare refused step 3's class delete while a binding kept the name `PROBE`, even pointed at the other Worker (code 10061); a renamed binding passed, and steps 3 and 4 printed links that reached the other Worker's object. So the app's binding is `LIVE_LINE`; the class keeps the name `Line`. Side answers: a binding to a missing Worker fails the deploy (10061), and `versions upload` refuses a pending Durable Object migration.
- **2026-10-25** — Assumed: the line's config template is a `.jsonc` file beside the fragments page, not a block in it, because the skills' instruction bytes sit at their recorded ceiling; provisioning reads the file the same way. For the same reason the page adds no rule line for the staging line: its rule to point every staging binding at its twin covers it, and `secrets:check` enforces it.
- **2026-10-25** — Assumed: provisioning makes only the line Workers Cloudflare doesn't list, so a rerun never sends this computer's line code over the published one; a failed line deploy is a to-do, as a failed types refresh is a warning, and the line names join setup's name-clash check so it never overwrites another project's Worker.
- **2026-10-25** — Assumed: `LINE` is not added to the retired names, because the line Worker's own binding to its class keeps that name.
- **2026-10-25** — Check: `app/knip.jsonc` gains an entry, `worker/line-worker.ts`, because the line's own Worker is a new entry point Wrangler loads from `wrangler.line.jsonc`, which knip can't see; nothing is loosened.
- **2026-10-25** — Fixed: running the two Workers together locally showed the line Worker crashing at start on Vite-only `import.meta.glob`, reached through the inbox's shared file; the line now imports a small file of its own, and a test fails if it reaches a glob again. `npm run dev` fails before this change too (a blocked import outside the app folder), so the local check used `wrangler dev`, and the tap is walked on the preview.
- **2026-10-25** — Fixed (second look): an existing Worker with a line name counts as this install's only when its setup record lists it, else setup leaves a step for the person; the update note now says to make the line Workers before the update's first save; the deploy docs' preview row names the line step. Both line Workers were made from this host before the first save, and the host's preview printed a link.
- **2026-10-25** — Archive checkpoint: the preview walk passed (a tap reached the computer through the staging line in 0.3 seconds); archived as 44.12.0 for `/ship`.

<!-- end proposal.md -->
<!-- file design.md utf8 12897 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 5687 -->
# Tasks

## 1. Prove the link first (stop here if it fails)

- [x] 1.1 Run the throwaway probe from design decision 1 in this account with the primary worktree's `.env` token, from a scratch folder in `.scratch/`: steps 1–5, then delete all three `wong-probe-*` Workers. Done when the probe's output shows a version URL for steps 3 and 4 and `wrangler deployments list` no longer finds any `wong-probe-*` Worker; record the two side answers in the chat and in task 5.1's wiki text
- [x] 1.2 If step 3 or 4 printed no URL: stop, report the evidence and the options to the person, and build nothing else. Otherwise tick this box and go on

## 2. App: the line in its own Worker

- [x] 2.1 Add `app/worker/line-worker.ts` and `app/wrangler.line.jsonc` (design 2); stop exporting `Line` from `app/worker/index.ts`; give `LINE` its `script_name` per environment and add migration `line-2` in `app/wrangler.jsonc`. Verify with `npx wrangler deploy --dry-run --config wrangler.line.jsonc` and `--env staging` from `app/`
- [x] 2.2 Run the line beside the app in local dev: `auxiliaryWorkers` in `app/vite.config.ts` for `serve` only (design 4). Verified instead with `wrangler dev` on the local build plus `wrangler.line.jsonc`: both Workers start and `LIVE_LINE` resolves to `wongstack-line-local`. `npm run dev` fails before this change too (`Denied ID …/scripts/employee-bootstrap.mjs?raw`), and the line route refuses the local stand-in sign-in (`dev@example.com`) as before, so the tap is walked on the preview (6.4). That run caught the line Worker crashing on `import.meta.glob` via `store.ts`; `rows.ts` now holds what the line reads, and `line-worker.test.ts` fails if the line reaches a glob again
- [x] 2.3 Tests: the line Worker's entry exports `Line` and answers 404 to any request; the app's build redirect lists no auxiliary Worker; `npm test` in `app/` passes

## 3. Pack scripts: build, deploy, preview

- [x] 3.1 `scripts/cf-build.sh`: bundle the line into `dist/line/` keyless when `wrangler.line.jsonc` exists, staging off the production branch (design 4)
- [x] 3.2 `scripts/cf-deploy.sh`: deploy the line from the trusted config and the built entry before the app, on both branches; skip when the trusted checkout has no line config (design 5)
- [x] 3.3 `scripts/lib-wrangler-config.mjs`: add `lineProblem` for the trusted line config, and refuse a preview build whose Durable Object `script_name` isn't the trusted staging line Worker; keep `copyBuild` from copying a branch's `wrangler.line.jsonc`; expose what `cf-deploy.sh` needs through `lib-wrangler-config.sh` (design 5)
- [x] 3.4 `scripts/cf-preview.sh`: build, deploy the staging line, upload the app's version; deploy staging once and retry on a pending-migration refusal (design 6)
- [x] 3.5 `scripts/cf-secrets.mjs`: a `script_name` Durable Object binding must be twinned in staging; `scripts/check-private-access.mjs`: the line config keeps no address (design 8)
- [x] 3.6 Tests in `scripts/tests/` (`wrangler-config.test.mjs`, `cf-preview.test.mjs`, `cf-secrets.test.mjs`, `private-access-probe.test.mjs`, and a deploy-order test): line before app on both branches, a failed line deploy stops the app, no line config deploys the app alone, a branch's line config and a staging `script_name` pointing at production are refused, a staging twin missing fails secrets check, a line config with an address is refused. Verify with `node --test scripts/tests/`

## 4. Setup and the update

- [x] 4.1 `.agents/skills/wong-sync/references/stack-pack-fragments.md`: add the `wrangler.line.jsonc` fragment, the `script_name` lines and `line-2` in the app fragment, and one rule line on the staging line twin (design 7)
- [x] 4.2 `.agents/skills/wong-setup/scripts/provision.mjs`: write the line config when absent, patch the app config's `LINE` and `line-2` (a to-do when it can't), deploy both line Workers from this computer before reporting (design 7)
- [x] 4.3 `payload-files.json` and `payload-manifest.md`: ship `app/worker/line-worker.ts`; name `wrangler.line.jsonc` target-owned
- [x] 4.4 Tests in `scripts/tests/provision.test.mjs`: a new install gets a filled line config with no placeholder left; an app config holding the line gets `script_name` and `line-2` once, and a rerun changes nothing; the line deploys run before the report, staging and production

## 5. Docs and release

- [x] 5.1 `wiki/stack/live-line.md`, `wiki/stack/d1-pipeline.md`, `wiki/stack/staging-bindings.md` per design 9, with the probe's answers; verify with `node scripts/check-payload-links.mjs`
- [x] 5.2 `CHANGELOG.md`: `## Next (minor) — App changes get their preview link back` with the plain-words **Updating.** note, saying the old line state is deleted and can't be undone, and what restores it (design 9)

## 6. Before the first save, then check

- [x] 6.1 From this host, with the token: run provisioning's line step for `wongstack-line` and `wongstack-line-staging`; verify both exist in `wrangler deployments list --name <each>` and have no `workers.dev` address
- [x] 6.2 Run `node .github/scripts/checks.mjs --worktree` and `bash scripts/cf-preview.sh --alias line-in-its-own-worker`: it prints a preview URL
- [x] 6.3 `/save`; CI passes and posts a preview link for the branch
- [x] 6.4 On the preview link, signed in: open the inbox, make a test item, tap it, and see the computer's helper pick it up within seconds through the staging line; close the test item after. Walked on the branch's CI preview by a script standing in for the helper (signed in with `cloudflared access token`): line open as a computer, item put, tap sent, `look` arrived 291 ms later through `wongstack-line-staging`; test item closed

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 871 -->
## ADDED Requirements

### Requirement: Setup creates the line Workers before the first save

Setup SHALL create the live and staging line Workers, with their databases bound and no web address, before the app's config points at them, so the first save's deploy, which runs the default branch's scripts, finds them. An install that already holds the line in its app SHALL get the same on its update, and rerunning setup SHALL change nothing that is already right.

#### Scenario: A new install

- **WHEN** setup provisions a new app
- **THEN** both line Workers exist before the first save, and the first save prints a preview link

#### Scenario: An install updating from an app that holds the line

- **WHEN** the update's setup step runs on an install whose app holds the line
- **THEN** both line Workers are created from this computer before the update's first save

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/live-line/spec.md utf8 1561 -->
## ADDED Requirements

### Requirement: The line lives in its own Worker, so app changes keep their preview link

The live line SHALL run in a Worker of its own, beside the app, with a staging twin, and the app SHALL only point at it. The line's Worker SHALL have no web address of its own: a computer or a page reaches the line only through the app's signed-in route. A change to the app SHALL get a per-change preview link.

#### Scenario: An app change gets its link

- **WHEN** a change to the app is saved or previewed from the agent host
- **THEN** a per-change preview link is printed for it
- **AND** a tap made from that link wakes the person's computer through the staging line

#### Scenario: The line can't be reached directly

- **WHEN** anyone requests the line's Worker on any web address
- **THEN** no address answers, and the line is reachable only through the app's signed-in route

### Requirement: Moving the line keeps schedules and the inbox

Moving the line out of the app SHALL leave every schedule, run, and inbox item as it was, and the update SHALL say in plain words that the line's old saved state inside the app is deleted and can't be undone, and what puts it back.

#### Scenario: An app that already has the line takes the update

- **WHEN** an install whose app holds the line publishes this update
- **THEN** its schedules and runs are unchanged, its computer reconnects to the new line, and the schedule clock resumes
- **AND** the update note says the old line state is deleted and that the computer's reconnect restores it

<!-- end specs/live-line/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 1568 -->
## ADDED Requirements

### Requirement: The line Worker deploys before the app

Every deploy that sends the app SHALL first send the line's Worker for the same environment: production before the production app, staging before the staging app and its preview. When the line's deploy fails, the app SHALL NOT be deployed. A repo whose config has no line Worker yet SHALL deploy the app alone, as before.

#### Scenario: A branch push

- **WHEN** a branch is pushed
- **THEN** the staging line deploys, then the staging app, then the branch's preview is uploaded

#### Scenario: The line fails to deploy

- **WHEN** the line's Worker fails to deploy
- **THEN** the deploy stops and the app stays on its previous version

### Requirement: A branch picks the line's code, never its Worker or database

A preview deploy SHALL take the line's built code from the branch and its settings (Worker name, database, address) from the default branch's own config. The staging app SHALL point only at the staging line, never at the production line.

#### Scenario: A branch renames the line's Worker or database

- **WHEN** a branch's line settings name another Worker or the production database
- **THEN** the deploy still sends the line to the default branch's staging line Worker with the staging database

#### Scenario: Staging points at the live line

- **WHEN** a branch's staging app points its line at the production line Worker, or at any Worker but the default branch's staging line
- **THEN** the deploy refuses the build before uploading anything and names the binding

<!-- end specs/stack-pack/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-25

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 80702 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-25-line-in-its-own-worker</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

/* Tailwind's shadow-xs, shadow-sm and shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the
   bottom, so a layer reads as above the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --look-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --look-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; }
  .item > .drawing:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 var(--pad); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--foreground); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--border); background:var(--muted); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen .skeleton { animation:none; min-height:1em; } .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .sk-bar { display:block; height:.75em; border-radius:.375em; background:color-mix(in oklab, var(--muted-foreground) 25%, transparent); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  .item > .table { grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; overflow-x:auto; border-top:1px solid var(--border); }
  .item > .table:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:var(--pad); min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted-foreground); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--background); }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--muted); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { grid-template-columns:repeat(3, minmax(0, 1fr)); padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-10-25-line-in-its-own-worker">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-25-line-in-its-own-worker</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Since 44.11.0, a change to your app makes no link to look at before it goes live. Cloudflare makes no preview link for an app that holds a live object of its own, and the live line, which wakes your computer when you tap in the inbox, is one. So building and checking an app change now skips the step where you see it first. It showed in WongOS on 2026-10-25.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Every app change gets its own link again.</b> The app stops holding the line itself and only points at it, so Cloudflare makes a link for each change, as it did before 44.11.0.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-1-picture-1" tabindex="0" style="width:42.154em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 548 152" width="548" height="152" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_change_before_0"><path d="M127.62,76L168.62,76"/><path class="pele-marker" d="M175.62,76L167.62,79.36L167.62,72.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_before_none_0"><path d="M328.9,68C345.55,68 345.55,32 362.2,32L449.94,32"/><path class="pele-marker" d="M456.94,32L448.94,35.36L448.94,28.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_before_link_0"><path d="M328.9,84C345.55,84 345.55,120 362.2,120L449.94,120"/><path class="pele-marker" d="M456.94,120L448.94,123.36L448.94,116.64Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_before_none_0"><rect x="364.2" y="21.5" width="63.24" height="21" rx="3" fill="var(--_bg)"/><text x="395.82" y="36.9" text-anchor="middle">yes, now</text></g><g class="pele-edge-label" data-id="L_before_link_0"><rect x="366.14" y="109.5" width="59.37" height="21" rx="3" fill="var(--_bg)"/><text x="395.82" y="124.9" text-anchor="middle">no, after</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="change" transform="translate(67.81,76)"><rect x="-59.81" y="-24" width="119.62" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">app change</text></g><g class="pele-node pele-shape-diam" data-id="before" transform="translate(258.66,76)"><polygon points="0,-51.9 83.04,0 0,51.9 -83.04,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" text-anchor="middle" xml:space="preserve"><tspan x="0" y="-6.4">holds</tspan><tspan x="0" y="17.6">the line?</tspan></text></g><g class="pele-node pele-shape-rect" data-id="none" transform="translate(498.06,32)"><rect x="-41.12" y="-24" width="82.24" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">no link</text></g><g class="pele-node pele-shape-rect" data-id="link" transform="translate(493.61,120)"><rect x="-36.67" y="-24" width="73.34" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">a link</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A quick test comes first.</b> Cloudflare's page doesn't say whether an app that only points at a line in another Worker gets a link. Before anything else is built, two throwaway Workers in your Cloudflare account answer it, then get deleted. If there's still no link, the work stops and comes back to you with other options.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-2-picture-1" tabindex="0" style="width:39.923em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 519 152" width="519" height="152" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_test_got_0"><path d="M150.7,76L191.7,76"/><path class="pele-marker" d="M198.7,76L190.7,79.36L190.7,72.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_got_build_0"><path d="M286,68C302.65,68 302.65,32 319.3,32L373.58,32"/><path class="pele-marker" d="M380.58,32L372.58,35.36L372.58,28.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_got_stop_0"><path d="M286,84C302.65,84 302.65,120 319.3,120L373.58,120"/><path class="pele-marker" d="M380.58,120L372.58,123.36L372.58,116.64Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_got_build_0"><rect x="321.3" y="21.5" width="29.78" height="21" rx="3" fill="var(--_bg)"/><text x="336.19" y="36.9" text-anchor="middle">yes</text></g><g class="pele-edge-label" data-id="L_got_stop_0"><rect x="324.41" y="109.5" width="23.57" height="21" rx="3" fill="var(--_bg)"/><text x="336.19" y="124.9" text-anchor="middle">no</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="test" transform="translate(79.35,76)"><rect x="-71.35" y="-24" width="142.7" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">throwaway test</text></g><g class="pele-node pele-shape-diam" data-id="got" transform="translate(248.75,76)"><polygon points="0,-31.28 50.05,0 0,31.28 -50.05,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">link?</text></g><g class="pele-node pele-shape-rect" data-id="build" transform="translate(444.38,32)"><rect x="-63.8" y="-24" width="127.6" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">build the rest</text></g><g class="pele-node pele-shape-rect" data-id="stop" transform="translate(445.72,120)"><rect x="-65.14" y="-24" width="130.27" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">stop, ask you</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The live line moves into its own small Worker.</b> It does what it does today: wakes your computer and your open inbox, and keeps the schedule clock, writing to the same database. It has no web address, so only your app can reach it. Your computer still connects to the app, signed in as you, and the app passes the line through.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic sketch" data-note="item-3-picture-1" tabindex="0" style="width:43.077em"><svg viewBox="0 0 560 120">
  <rect class="f-card s-line" x="8" y="40" width="120" height="40"/>
  <text x="22" y="65">your computer</text>
  <rect class="f-card s-line" x="200" y="40" width="120" height="40"/>
  <text x="236" y="65">the app</text>
  <rect class="f-card s-fg" x="392" y="8" width="160" height="40"/>
  <text x="410" y="33">the line Worker</text>
  <rect class="f-card s-line" x="392" y="72" width="160" height="40"/>
  <text x="428" y="97">the database</text>
  <path class="s-fg" d="M128 60h64m-8-6 8 6-8 6" fill="none"/>
  <text class="f-muted" x="134" y="52">sign-in</text>
  <path class="s-fg" d="M320 54l64-22m-10-2 10 2-6 8" fill="none"/>
  <path class="s-line" d="M320 66l64 22m-6-8 6 8-10 2" fill="none"/>
  <path class="s-muted" d="M472 48v16m-6-8 6 8 6-8" fill="none"/>
</svg></div></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Publishing puts the line out first, then the app.</b> Every save and every publish does it in that order, so the app never points at a line that isn't there. A change to the line's own code shows on the shared test copy of the app, not on that change's own link: the line has no link of its own.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-4-picture-1" tabindex="0" style="width:44.308em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 576 176" width="576" height="176" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_save_line_0"><path d="M94.69,82L135.69,82"/><path class="pele-marker" d="M142.69,82L134.69,85.36L134.69,78.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_line_app_0"><path d="M259.58,74C308.65,74 308.65,32 357.72,32L363.72,32"/><path class="pele-marker" d="M370.72,32L362.72,35.36L362.72,28.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_app_link_0"><path d="M433.4,32L500.64,32"/><path class="pele-marker" d="M507.64,32L499.64,35.36L499.64,28.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_line_stop_0"><path d="M259.58,90C269.83,90 269.83,132 280.08,132L337.48,132"/><path class="pele-marker" d="M344.48,132L336.48,135.36L336.48,128.64Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_line_stop_0"><rect x="282.08" y="121.5" width="32.89" height="21" rx="3" fill="var(--_bg)"/><text x="298.53" y="136.9" text-anchor="middle">fails</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="save" transform="translate(51.34,82)"><rect x="-43.34" y="-24" width="86.69" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">publish</text></g><g class="pele-node pele-shape-rect" data-id="line" transform="translate(201.14,82)"><rect x="-58.45" y="-24" width="116.9" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">line Worker</text></g><g class="pele-node pele-shape-rect" data-id="app" transform="translate(402.06,32)"><rect x="-31.34" y="-24" width="62.69" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">app</text></g><g class="pele-node pele-shape-rect" data-id="link" transform="translate(537.64,32)"><rect x="-30" y="-24" width="60" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">link</text></g><g class="pele-node pele-shape-rect" data-id="stop" transform="translate(402.06,132)"><rect x="-57.58" y="-36" width="115.17" height="72" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" text-anchor="middle" xml:space="preserve"><tspan x="0" y="-6.4">stop; app</tspan><tspan x="0" y="17.6">unchanged</tspan></text></g></g></svg></div></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Setup and updates make the line Worker for you.</b> A new app gets its live and test line Workers at setup. An app that already has the line gets them when it takes this update, before its first save. The update deletes the line's old saved state inside the app, and that can't be undone. It holds only who the line belongs to and when it next wakes; your computer reconnects within a minute and puts both back. Your schedules, their runs, and your inbox live in the database and stay as they are.</div></div></li>
</ol>
<p class="aside">Non-goals: a link of its own for the line's code; Cloudflare's four-step move that keeps the old saved state; changing what the line or schedules do; WongOS taking this update (a later sync, there).</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-25</p>Asked (Matthew, in the request) how to get preview links back → chose moving the live line into its own small Worker that the app points at, fixed in WongStack first and taken by WongOS in a later sync.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-25</p>Asked (Matthew, in the request) whether to trust the Cloudflare page or test → chose a throwaway test before building the rest, since the page doesn't cover an app that only points at another Worker's line.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-25</p>Assumed: the old line state is deleted, not moved with Cloudflare's transfer, because it holds only the owner's name and the next wake time, both rewritten when the computer reconnects (every deploy drops the sockets anyway), while a transfer takes four ordered deploys per Worker and fails on a fresh install with nothing to move.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-25</p>Assumed: the line Worker lives in the app's folder with its own settings file, not in a separate pack folder, because it shares the app's schedule and inbox code and its tools.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-25</p>Assumed: setup creates both line Workers from this computer before the update's first save, because that save's preview runs the default branch's older deploy scripts, which don't know the line Worker.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-25</p>Assumed: the line Worker's settings always come from the default branch, and only its built code from a branch, because a branch must not pick which Worker or database the deploy key writes to.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-25</p>Assumed: a change to the line's own code is checked on the staging copy, not its own link, because Cloudflare makes no link for a Worker that holds a live object, which is the whole cause.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-25</p>Fixed: the probe passed with one change. Cloudflare refused step 3's class delete while a binding kept the name <code>PROBE</code>, even pointed at the other Worker (code 10061); a renamed binding passed, and steps 3 and 4 printed links that reached the other Worker's object. So the app's binding is <code>LIVE_LINE</code>; the class keeps the name <code>Line</code>. Side answers: a binding to a missing Worker fails the deploy (10061), and <code>versions upload</code> refuses a pending Durable Object migration.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-25</p>Assumed: the line's config template is a <code>.jsonc</code> file beside the fragments page, not a block in it, because the skills' instruction bytes sit at their recorded ceiling; provisioning reads the file the same way. For the same reason the page adds no rule line for the staging line: its rule to point every staging binding at its twin covers it, and <code>secrets:check</code> enforces it.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-25</p>Assumed: provisioning makes only the line Workers Cloudflare doesn't list, so a rerun never sends this computer's line code over the published one; a failed line deploy is a to-do, as a failed types refresh is a warning, and the line names join setup's name-clash check so it never overwrites another project's Worker.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-25</p>Assumed: <code>LINE</code> is not added to the retired names, because the line Worker's own binding to its class keeps that name.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-25</p>Check: <code>app/knip.jsonc</code> gains an entry, <code>worker/line-worker.ts</code>, because the line's own Worker is a new entry point Wrangler loads from <code>wrangler.line.jsonc</code>, which knip can't see; nothing is loosened.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-25</p>Fixed: running the two Workers together locally showed the line Worker crashing at start on Vite-only <code>import.meta.glob</code>, reached through the inbox's shared file; the line now imports a small file of its own, and a test fails if it reaches a glob again. <code>npm run dev</code> fails before this change too (a blocked import outside the app folder), so the local check used <code>wrangler dev</code>, and the tap is walked on the preview.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-25</p>Fixed (second look): an existing Worker with a line name counts as this install's only when its setup record lists it, else setup leaves a step for the person; the update note now says to make the line Workers before the update's first save; the deploy docs' preview row names the line step. Both line Workers were made from this host before the first save, and the host's preview printed a link.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-25</p>Archive checkpoint: the preview walk passed (a tap reached the computer through the staging line in 0.3 seconds); archived as 44.12.0 for <code>/ship</code>.</li>
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
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line or picture to note it</p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" hidden>
    <button type="button" data-ready="build"><span class="spinner" hidden aria-hidden="true"></span><span>Build it</span></button>
    <button type="button" data-ready="publish" aria-expanded="false" aria-controls="ready-confirm">Build and publish</button>
    <div id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><p>Goes live, can't be undone.</p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span>Yes, publish</span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
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
  function load(text) {
    try {
      const saved = JSON.parse(text || 'null');
      if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
      if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
    } catch (e) { /* unreadable notes start empty */ }
  }
  load(store ? store.getItem(KEY) : null);
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: 'Change #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot.
    // A screen's words sit in many small boxes: join every piece of text with a space.
    const row = el.tagName === 'TR', cells = row ? c.querySelectorAll('td') : el.classList.contains('screen') ? texts(c)
      : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = Array.prototype.map.call(cells, function (n) { return n.textContent.replace(/\s+/g, ' ').trim(); }).join(row ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
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
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
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
    bar();
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
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
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
    fit(d); bar();
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
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return { id: n.id, label: n.label, text: n.text }; }); }
  function acknowledge(notes) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
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
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    if (hosted) return hostedAsk(path, body);
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), n = notes.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: bullets(notes).join('\n') });
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (r.status === 409) { says('The plan changed. Reload to read it first.'); toast('The plan changed. Reload to read it first.'); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes);
      says('Sent ' + plural(n) + ' to the chat.');
      toast('Sent ' + plural(n) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── visible build choices, with publish confirmation above the footer ──
  let version = null;
  const publishButton = $('ready').querySelector('[data-ready="publish"]');
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    publishButton.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen && !$('ready').hidden) publishButton.focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready');
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(pending === (step === 'yes' ? 'publish' : step) && step !== 'publish'));
      const spinner = b.querySelector('.spinner');
      if (spinner) {
        const active = pending === (step === 'yes' ? 'publish' : step);
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : step === 'yes' ? 'Yes, publish' : 'Build it';
      }
    });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length) body.text = bullets(notes).join('\n');
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
        : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || step === 'publish') {
      says('');
      $('ready-confirm').hidden = step === 'cancel';
      publishButton.setAttribute('aria-expanded', String(step === 'publish'));
      bar();
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  // ── hosted: in the live app's inbox, a sealed frame that reaches the inbox only through the port its first greeting carries ──
  let hosted = null, port = null;
  const CODES = { sent: 200, changed: 409, done: 409, soon: 429, closed: 410, expired: 410 };
  function post(message) { port.postMessage(message); }
  // The inbox answers a tap only once the chat has it, or once it is refused, cancelled or failed.
  function hostedAsk(path, body) {
    return new Promise(function (resolve) {
      hosted.reply = function (state) {
        const status = Object.prototype.hasOwnProperty.call(CODES, state) ? CODES[state] : 502;
        const answer = status === 200 ? { sent: true } : state === 'changed' ? { changed: true } : state === 'done' ? { done: true } : { sent: false };
        resolve({ ok: status === 200, status: status, json: function () { return Promise.resolve(answer); } });
      };
      post({ type: 'inbox:tap', action: path === 'send' ? 'send' : body.action, text: body.text || '' });
    });
  }
  // The inbox's switch owns the look: this frame can't remember a choice, so its own switch goes. Unknown looks change nothing.
  function look(theme) { if (theme === 'light' || theme === 'dark') document.documentElement.classList.toggle('dark', theme === 'dark'); }
  function heard(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'inbox:theme') look(m.theme);
    else if (m.type === 'inbox:notes' && (typeof m.value === 'string' || m.value === null)) { load(m.value); render(); }
    else if (hosted.reply && m.type === 'inbox:result') { const reply = hosted.reply; hosted.reply = null; reply(m.state); }
  }
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (hosted || window.parent === window || e.source !== window.parent || !e.ports || !e.ports[0] || !m || m.type !== 'inbox:hello'
      || typeof m.version !== 'string' || !Array.isArray(m.actions)) return;
    hosted = { reply: null };
    port = e.ports[0];
    port.onmessage = function (ev) { heard(ev.data); };
    document.querySelectorAll('.theme-toggle').forEach(function (button) { button.remove(); });
    look(m.theme);
    // Notes live with the inbox page: this frame has no storage of its own.
    store = { setItem: function (key, value) { post({ type: 'inbox:notes-set', key: key, value: value }); } };
    post({ type: 'inbox:notes-get', key: KEY });
    setLive('inbox'); offer(m); render();
  });
  // In a frame, a link opens its own tab: the frame never leaves this page.
  document.addEventListener('click', function (e) {
    const a = window.parent !== window && e.target.closest ? e.target.closest('a[href]') : null;
    if (a && a.getAttribute('href').charAt(0) !== '#') { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  }, true);
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
