<!-- openspec-archive v1 2026-09-26-serve-mini-apps-from-main-app -->
<!-- file proposal.md utf8 9919 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 7432 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 3754 -->
## 1. Router and build (scripts, mini-apps)

- [x] 1.1 Add `mini-apps/router.mjs` and `router.d.mts`: `MINI_PREFIX`, `handleMiniApp` (strip `/apps`, route `/<name>/api/*` with `{ DB }` only, else `ASSETS`), carrying over `worker.ts`'s source-path refusal
- [x] 1.2 Add `mini-apps/routes.mjs` (a Vite glob over `apps/*/api.mjs`); change `scripts/mini-dashboard.mjs` to `--into <assets-dir>`: copy pages (no `api.mjs`, `*.test.*`, `*.ts`, dotfiles) and write `index.html` and `apps.json` under `apps/`
- [x] 1.3 Run it from `scripts/cf-build.sh`, locally and in CI, with the assets folder from a new `assets-dir` read in `lib-wrangler-config`
- [x] 1.4 Add `scripts/cf-preview.sh` (install when missing, staging-name check, alias rule, staging migrations, create staging on first use, build, `versions upload`, print URL); delete `scripts/cf-mini.sh`
- [x] 1.5 Delete `mini-apps/worker.ts`, `mini-apps/wrangler.jsonc`, `mini-apps/tsconfig.json`, `mini-apps/.gitignore`, and `mini-apps/apps/.assetsignore`
- [x] 1.6 Drop the `mini-apps/` skip from `scripts/lib-wrangler-config.mjs` and `.sh`
- [x] 1.7 Tests: rewrite `scripts/tests/mini-apps.test.mjs` for the router (routing, `{ DB }` only, source refused, asset fallback), both dashboard modes, and `cf-preview.sh` (alias refusal, staging-name check, no production deploy); update `wrangler-config.test.mjs`

## 2. Main app (app/)

- [x] 2.1 `app/worker/index.ts`: send `MINI_PREFIX` paths to `handleMiniApp`; `app/wrangler.jsonc`: `assets.binding: "ASSETS"` and `run_worker_first: ["/apps/*"]`
- [x] 2.2 Landing page: replace the Vite template in `App.tsx` with `AppList` and `Tutorial` components, and trim `App.css`
- [x] 2.3 Tests: `App.test.tsx` and component tests for loading, empty, error, and list states, and the tutorial; a Worker test that `/apps/` reaches the router; keep 100% coverage

## 3. CI (.github)

- [x] 3.1 `app-untouched.sh`: only `mini-apps/apps/*` counts as untouched; update `scripts/tests/app-untouched.test.mjs`
- [x] 3.2 `deploy.yml`: run the main-app steps when `mini_changed` is true; delete the mini block and its `staging-mini` publication; rewrite the header and summary lines
- [x] 3.3 `test.yml`: update the header and summary wording

## 4. Skills and setup (.agents)

- [x] 4.1 `/apply` mini-app path: call `cf-preview.sh --alias mini-<name>`, report `/apps/<name>/` on the preview, and drop the expiry line
- [x] 4.2 `save/references/mini-app-save.md`: CI deploys the main Worker; the app is live at `/apps/<name>/` when it finishes; update the fallback paths
- [x] 4.3 `/ship` mini-app merge: the dashboard entry is `/apps/` on the main app
- [x] 4.4 `wong-setup/references/cloudflare.md`: remove the mini Workers from the names table and the config step; add "Moving older mini apps" with the post-deploy Worker delete
- [x] 4.5 `wong-sync`: update `payload-files.json`, the payload manifest, and `stack-pack-fragments.md` (remove the mini fragment; add `ASSETS` and `run_worker_first` to the main fragment); update `wong-sync-preflight.test.mjs`

## 5. Docs

- [x] 5.1 Rewrite `wiki/stack/mini-apps.md` for one Worker, the full-build preview, and `/apps/`
- [x] 5.2 Update `wiki/development/the-change-loop.md`, `wiki/stack/cloudflare-access.md`, `wiki/stack/README.md`, `wiki/ux-principles.md`, `README.md`, and the `WONG-STACK` block in `AGENTS.md`

## 6. Release

- [x] 6.1 Bump `VERSION` to 24.0.0 and add the `CHANGELOG.md` entry
- [x] 6.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`
- [x] 6.3 Local evidence before the ship checkpoint: every script test, and the app's lint, `tsc -b`, Vitest at 100% coverage, and Stryker at 100% on the changed files; CI and the preview walk come from `/ship`'s one checkpoint

<!-- end tasks.md -->
<!-- file specs/ci-tests/spec.md utf8 4813 -->
## MODIFIED Requirements

### Requirement: A core workflow runs the test suite in every repo

The payload SHALL ship `.github/workflows/test.yml` in the **core** category, so a repo receives a test pipeline whether or not it took the stack pack. The workflow SHALL run the repo's `test` script, discovered root-first and then in each immediate subdirectory, so a repo whose application lives in a subdirectory is covered without configuration. When no `package.json` declares a `test` script, the job SHALL print why and exit green — a real check, never a permanently red one.

**A change that leaves the main app untouched runs no suite.** When every path that a feature branch changes compared with the default branch — or, on the default branch, every path the push changed — is under `wiki/`, `openspec/`, or `mini-apps/apps/`, or ends in `.md`, the job SHALL say so and SHALL NOT install or run the main app's suite. A change to a shared file under `mini-apps/` outside `mini-apps/apps/` touches the main app, because the main app's Worker imports it. When such a branch changes mini apps, the job SHALL run the tests of the changed mini apps only, as `mini-apps` defines; otherwise it SHALL exit green. The comparison SHALL cover the whole branch, never only the last commit. When the comparison can not be made, the job SHALL run the suite. One core script SHALL make this decision, and the pack's deploy workflow SHALL use the same script. The deploy workflow SHALL still build and deploy the main app when the change touches `mini-apps/apps/`, because the main app's Worker serves the mini apps. The skip SHALL happen inside the job, so a required `test` check still reports.

The workflow SHALL carry the same event condition the deploy workflow uses to collapse the `push`/`pull_request` double-fire, so one commit produces one test run.

`npm test` SHALL be the entire contract: any runner behind that script satisfies the job. Vitest SHALL be what the payload ships and configures by default, and SHALL NOT be required.

The pack's `deploy.yml` SHALL NOT contain a `test` job, so a pack repo runs its suite once rather than twice. The `deploy` job SHALL remain independent of the test result: a staging deploy of red code is harmless (staging is a fixture and the walk observes it), and red code cannot reach production because merges require green CI.

#### Scenario: A repo with no stack pack gets a test pipeline

- **WHEN** WongStack is synced into a repo whose `components.stackPack` is absent or false
- **THEN** `.github/workflows/test.yml` is among the files it receives
- **AND** the suite runs on the next push with no Cloudflare configuration present

#### Scenario: A pack repo runs its suite once

- **WHEN** a commit is pushed to a repo that has both workflows
- **THEN** exactly one job runs the test suite
- **AND** the deploy finishes no later than it would without it

#### Scenario: No test script is honest green

- **WHEN** a commit is pushed to a repo where no `package.json` declares a `test` script
- **THEN** the job states that no suite exists and exits green
- **AND** the check is not reported as a failure

#### Scenario: A different runner satisfies the job

- **WHEN** a repo's `test` script invokes a runner other than vitest
- **THEN** the job runs it unchanged
- **AND** nothing in the workflow assumes vitest

#### Scenario: A red suite holds the save, not the deploy

- **WHEN** the test job fails on a feature-branch push in a pack repo
- **THEN** the staging deploy still completes
- **AND** `/save`'s existing CI wait reports the failure and enters its auto-fix path, and `/ship` cannot merge until the check is green

#### Scenario: A docs-only branch

- **WHEN** a branch changes only `wiki/` pages and a `README.md`
- **THEN** the `test` check reports green with a note that the change is docs-only
- **AND** the suite is not installed or run

#### Scenario: A mini-app branch

- **WHEN** a branch changes only files under `mini-apps/apps/tips/`
- **THEN** the `test` check runs the tests in that folder and not the main app's suite

#### Scenario: A mini-app push to the default branch

- **WHEN** a direct save pushes a change under `mini-apps/apps/tips/` to the default branch
- **THEN** the `test` check on that push runs the tests in that folder

#### Scenario: A docs commit on top of code

- **WHEN** a branch's last commit changes only a `.md` file but an earlier commit on the branch changed code
- **THEN** the job runs the suite

#### Scenario: The comparison fails

- **WHEN** the job can not find the default branch to compare with
- **THEN** it runs the suite

#### Scenario: A shared mini-app file

- **WHEN** a branch changes only a file under `mini-apps/` that is outside `mini-apps/apps/`
- **THEN** the job runs the main app's suite

<!-- end specs/ci-tests/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 3448 -->
## MODIFIED Requirements

### Requirement: No local build fallback

The skills SHALL NOT build or test the project locally as a prerequisite for `/save` or `/ship`, whether or not CI is present. The absence of CI SHALL NOT trigger a local-verify gate. No skill SHALL run a compile, a unit-test suite, a linter, or a type-check as a condition of saving or shipping, with one exception: the mini-app direct save runs that one app's own tests on the agent host before it pushes to the default branch, because that route has no pull request for CI to gate. CI runs those tests again after the push. Test suites run in CI (the `ci-tests` capability), where they are ordinary checks on the existing ladder.

**The boundary is building versus exercising.** Driving a browser — or issuing HTTP requests and existing-command state queries — against an already-deployed staging environment is not a local build: nothing is compiled, nothing is installed, and the artifact under test is the one CI itself published. The opt-in staging walkthrough (`staging-walkthrough`) is therefore permitted, and is bounded by three properties that keep it from becoming a local-verify gate by another name — it SHALL run only against a deployment CI has already published, it SHALL never install a dependency, and it SHALL be absent entirely unless the repo adopted it. It is reached by invoking `/verify`, or by `/ship`'s single evidence step. Its verdict SHALL NOT function as a gate rung: an unrunnable or absent walk never blocks anything, and a walk `FAILURE` at ship time is surfaced as a user decision (fix or merge anyway) rather than consulted as a merge condition.

**A mini-app preview is not a gate.** The mini-app path (`mini-apps`) builds the main app on the agent host and uploads a preview version of the staging main Worker. That build and upload SHALL NOT be a prerequisite or a condition of `/save` or `/ship`, SHALL NOT replace a CI check, and SHALL NOT deploy production.

The gate ladder is: **CI when present → merge.** A rung is skipped when its condition does not hold, and a skipped rung SHALL NOT be reported as a failure. Where no rung applies, PR review is the gate.

#### Scenario: No CI present does not trigger a local build

- **WHEN** a repo has no CI and `/ship` is invoked
- **THEN** the skill does not run a local build or test as a gate; it relies on PR review

#### Scenario: The walkthrough is not a local build

- **WHEN** an adopted repo runs `/verify`, whatever mix of browser journeys and non-browser probes its scenarios produce
- **THEN** it compiles nothing, installs nothing, and runs no unit-test suite
- **AND** it exercises the deployment CI already published rather than a locally produced artifact

#### Scenario: The walk verdict is not a gate rung

- **WHEN** an adopted repo ships and the ship-time walk is `UNKNOWN`, `TIMEOUT`, or `NONE`
- **THEN** `/ship` merges on green CI (or PR review) alone
- **AND** the walk is reported, never counted as a failed check

#### Scenario: A skipped rung is not a failure

- **WHEN** a repo has CI configured
- **THEN** `/ship` merges on green CI alone, reporting no gap

#### Scenario: A preview upload is not a gate

- **WHEN** a mini app was previewed from the agent host and the person saves it
- **THEN** the save pushes to the default branch only after the app's tests pass on the host
- **AND** production deploys from CI on the default branch, not from the host

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/mini-apps/spec.md utf8 8399 -->
## MODIFIED Requirements

### Requirement: A mini app lives apart from the main app

Each mini app SHALL live in its own folder, `mini-apps/apps/<name>/`, beside the main app, with a manifest `app.json` that holds at least a title and a one-line description. The main app's Worker SHALL serve every mini app: its pages under `/apps/<name>/`, and its optional handler under `/apps/<name>/api/*`. A handler SHALL receive the repo's app database and no other binding, so a mini app can never read the memory store. A mini app's pages SHALL need no build step of their own. The main app's lint and tests SHALL NOT include `mini-apps/apps/`. There SHALL be no separate mini-app Worker.

#### Scenario: A large main app

- **WHEN** the repo's `app/` holds a very large codebase and the person asks for a mini app
- **THEN** the mini app is written under `mini-apps/apps/<name>/`, and its preview builds the whole main app with the mini app in it

#### Scenario: A mini app is served at the main address

- **WHEN** the mini app `tips` is saved and production deploys
- **THEN** `https://<app>/apps/tips/` serves its page from the main app's Worker

#### Scenario: A mini app stores data

- **WHEN** a mini app's API writes a row on its preview
- **THEN** the row is written to the staging database, never the production one

#### Scenario: A handler can not reach memory

- **WHEN** a mini app's handler runs on the production Worker, which binds the memory store
- **THEN** the handler's environment holds the app database and no memory binding

### Requirement: The mini-app preview comes from the agent host

After each build of a mini app, `/apply` SHALL upload a preview version of the staging main Worker from the agent host, under the alias `mini-<name>`, and SHALL report the preview URL without waiting for CI. The upload SHALL build the whole main app, with the mini apps in it, and SHALL install the main app's dependencies first when they are missing. When the staging Worker does not exist yet, the upload SHALL create it first. When the upload can not run — no stack pack or no credential — `/apply` SHALL state the reason in one line. `/apply` SHALL NOT save on its own: saving puts the app live on production, so the person saves when the preview is right.

#### Scenario: Change the app by chatting

- **WHEN** the person asks for a different color on a mini app that has a preview
- **THEN** `/apply` builds and uploads again and reports the new preview URL, with no CI wait

#### Scenario: A fresh worktree

- **WHEN** the main app has no installed dependencies on the agent host
- **THEN** the upload installs them, builds the app, and then uploads the preview

#### Scenario: The first mini app in a repo

- **WHEN** the staging main Worker does not exist
- **THEN** the first preview upload creates it and then uploads the preview

### Requirement: A mini app saves straight to the default branch

When a save's whole diff is inside one app's folder, `mini-apps/apps/<name>/`, `/save` SHALL run that app's tests on the agent host, then commit and push to the default branch, with no branch, no pull request, and no CI wait. This is a direct route like the prose route, and it SHALL have the same limits: the pushed commits hold only that folder, and a push is never forced. When the push is rejected only because the default branch moved, the save SHALL fetch it, rebase once, run the app's tests again, and push once more. It SHALL fall back to the normal route with a pull request when that rebase, those tests, or that second push fails, or when the push is refused for any other reason. CI on the default branch SHALL run the app's tests again, skip the main app's suite, and build and deploy the production main Worker. The save SHALL say that the app goes live on production at `/apps/<name>/` when that deploy finishes, and that it uses production data. The folder on the default branch and the app list SHALL be the record; no memory fact is needed for the app.

#### Scenario: Save a mini app

- **WHEN** the person saves `mini-apps/apps/tips/` and its tests pass on the host
- **THEN** one commit is pushed to the default branch, and the save reports that the app goes live at `/apps/tips/`
- **AND** no branch or pull request is created

#### Scenario: The diff leaves the folder

- **WHEN** a mini-app save also changes a file under `schema/migrations/`, `app/`, or a shared file under `mini-apps/` outside `mini-apps/apps/`
- **THEN** the save takes the normal route with a branch and a pull request

#### Scenario: The push is rejected

- **WHEN** the push to the default branch is refused by branch rules the person can not bypass
- **THEN** the save does not force it or retry it, and takes the normal route with a pull request

#### Scenario: Main moved during the save

- **WHEN** another change reached the default branch between the save's fetch and its push, and touched other files
- **THEN** the save rebases once, runs the app's tests again, and pushes, with no pull request

#### Scenario: The rebase does not apply

- **WHEN** the default branch moved and the rebase conflicts with a change to the same app
- **THEN** the save leaves no rebase in progress and takes the normal route with a pull request

### Requirement: A mini-app pull request merges through the short path

When a mini-app save fell back to a pull request, `/ship` SHALL merge it with no OpenSpec change, no archive, and no walk, on its CI result. The pull request body SHALL come from the app's `app.json`. Production SHALL receive a mini app only through a push or a merge to the default branch, never from the agent host.

#### Scenario: A mini app with a migration

- **WHEN** a mini app's save added a migration and fell back to a pull request
- **THEN** `/ship` merges it after CI runs the app's tests, with no OpenSpec change and no walk
- **AND** the production main Worker deploys from the merge, not from the host

### Requirement: A dashboard lists every mini app

A script SHALL build the mini-app list from the `app.json` of each folder under `mini-apps/apps/`, each time the main app is built, with no model step. It SHALL write the list twice: as a page at `/apps/` and as data at `/apps/apps.json`. Each entry SHALL show the title and description and link to the app. The production list SHALL therefore hold every saved mini app, and a preview's list SHALL also hold the app being previewed.

#### Scenario: A saved app appears

- **WHEN** a mini app reaches the default branch
- **THEN** the production `/apps/` page and `/apps/apps.json` list it with its title, description, and link

#### Scenario: A malformed manifest

- **WHEN** a folder's `app.json` is missing a title
- **THEN** the script names the folder and fails the build

## ADDED Requirements

### Requirement: The starter landing page lists the mini apps and teaches the loop

The starter app's landing page SHALL open with a tutorial message whose one task is to remove itself: it SHALL tell the person to ask the agent to remove the tutorial message, and walk them through the steps that follow — read the plan, build it, try the preview, publish it. Removing it is the person's first change, so it teaches the loop by doing. The tutorial SHALL be one part of the page that can be removed with no other change. Below it, the page SHALL list the mini apps from `/apps/apps.json`, each with its title, description, and a link to it. With no mini apps, it SHALL say how to ask for one.

#### Scenario: A fresh install

- **WHEN** a person opens the production app of a new install
- **THEN** the landing page opens with the tutorial message, and lists the example app below it

#### Scenario: The list can not load

- **WHEN** `/apps/apps.json` fails to load
- **THEN** the landing page still shows the tutorial and a link to `/apps/`

#### Scenario: The tutorial is done

- **WHEN** the person asks the agent to remove the tutorial message and publishes the change
- **THEN** the landing page shows only the app list, and nothing else on it changes

## REMOVED Requirements

### Requirement: A mini-app preview expires

**Reason**: A mini-app preview is now an ordinary preview version of the staging main Worker, like every pull-request preview, which never expired.

**Migration**: None. An old preview link on the removed `<repo>-mini-staging` Worker stops answering when that Worker is deleted.

<!-- end specs/mini-apps/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 5785 -->
## MODIFIED Requirements

### Requirement: The main app is not deployed when it is untouched

The pack's deploy job SHALL use the core check that `ci-tests` defines. When the branch leaves the main app untouched and changes no mini app, the job SHALL skip the main app's migration, build, and deploy and say so. When the branch changes mini apps, the job SHALL build and deploy the main app, because its Worker serves them. A merge to the default branch that leaves the main app untouched and changes no mini app SHALL NOT redeploy the production main app.

#### Scenario: A docs-only branch

- **WHEN** a branch changes only `wiki/` and `openspec/` files
- **THEN** the deploy check is green and no main-app staging deploy or preview upload runs

#### Scenario: A mini-app push

- **WHEN** a push to the default branch changes only files under `mini-apps/apps/`
- **THEN** CI builds and deploys the production main app, with the mini apps in it

## ADDED Requirements

### Requirement: The main Worker serves the mini apps

The pack's app scaffold SHALL serve every mini app from the main app's Worker. Its build SHALL copy each app's pages into the Worker's static assets under `/apps/<name>/`, and SHALL copy no handler, test, or TypeScript file. Its Worker SHALL run first for every path under `/apps/`, send `/apps/<name>/api/*` to that app's handler when it has one, and serve the static assets for every other path. The pack SHALL ship this routing as a module the scaffold's Worker imports, so `/wong-sync` keeps it current.

#### Scenario: Source stays private

- **WHEN** a client requests a mini app's `api.mjs` or a test file by path
- **THEN** the Worker does not return the file's contents

#### Scenario: An API path opened in a browser

- **WHEN** a person opens `/apps/hello/api/greeting` in a browser tab
- **THEN** the hello app's handler answers, not the main app's single-page fallback

### Requirement: The pack ships a host preview script for the main app

The pack SHALL ship one script, byte-identical across repos, that uploads a preview of the main app from the agent host. Run outside CI with a Cloudflare credential and an alias, it SHALL install the main app's dependencies when they are missing, apply pending staging migrations, build the app for staging, create the staging Worker when it does not exist, upload a preview version of the staging Worker under the alias, and print the preview URL that wrangler reports. It SHALL fail closed when the resolved staging name equals the production name. It SHALL never deploy production. The caller MAY name the alias; without a named alias, it SHALL derive the alias from the current branch and SHALL refuse the default branch.

#### Scenario: Upload from the agent host

- **WHEN** the agent runs the script with the alias `mini-tips` and a credential
- **THEN** a preview version of the staging Worker is uploaded under the `mini-tips` alias and its URL is printed
- **AND** the production Worker is unchanged

#### Scenario: On the default branch

- **WHEN** the script runs on the default branch with no named alias
- **THEN** it refuses and uploads nothing

#### Scenario: A staging config named like production

- **WHEN** the staging environment resolves to the production name
- **THEN** the script stops before any upload

### Requirement: The scaffold ships only the mini-app router and its example app

The payload manifest SHALL list the mini-app scaffold file by file: the router and route-table modules with their type declarations, and the example app folder `mini-apps/apps/hello/`. It SHALL NOT list `mini-apps/` or `mini-apps/apps/` as a whole folder. An app folder added to the source repo SHALL therefore never reach a target through setup or sync.

#### Scenario: An app made in the source repo stays there

- **WHEN** the source repo gains `mini-apps/apps/tips/` and a target syncs
- **THEN** the sync selects no path under `mini-apps/apps/tips/`
- **AND** it still selects the example app and the router module

### Requirement: Older installs retire the mini Workers

A `/wong-sync` plan for an install that has `mini-apps/wrangler.jsonc` SHALL add the `/apps/` route and its config to the main app, and SHALL delete `mini-apps/wrangler.jsonc`, `mini-apps/worker.ts`, `mini-apps/tsconfig.json`, `mini-apps/.gitignore`, and `mini-apps/apps/.assetsignore`. Only after the production main Worker serves `/apps/` SHALL the plan's runbook delete the `<repo>-mini` and `<repo>-mini-staging` Workers.

#### Scenario: The sync merges

- **WHEN** the sync's pull request merges and production deploys
- **THEN** each saved mini app answers at `/apps/<name>/` on the main address
- **AND** only then are the two mini Workers deleted

#### Scenario: Production has not deployed yet

- **WHEN** the production main Worker does not answer `/apps/` yet
- **THEN** the runbook deletes no Worker

## REMOVED Requirements

### Requirement: The pack ships the mini-app Worker

**Reason**: The main app's Worker serves the mini apps; "The main Worker serves the mini apps" replaces this.

**Migration**: "Older installs retire the mini Workers" moves an existing install.

### Requirement: The mini-app script previews from the host and deploys in CI

**Reason**: There is no mini Worker to preview or deploy. "The pack ships a host preview script for the main app" replaces the preview mode, and the main app's deploy covers CI.

**Migration**: `/apply` calls the new script; `/wong-sync` removes `scripts/cf-mini.sh`.

### Requirement: The scaffold ships only the mini Worker and its example app

**Reason**: Replaced by "The scaffold ships only the mini-app router and its example app".

**Migration**: `/wong-sync` removes the mini Worker's files, as "Older installs retire the mini Workers" says.

<!-- end specs/stack-pack/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-26

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 37956 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds zoom, pan, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-26-serve-mini-apps-from-main-app</title>
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
  .item { display:flex; gap:10px; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .drawing { margin:10px 0 0; }
  .zoom { display:flex; align-items:center; gap:6px; margin:0 0 4px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  .frame { box-sizing:content-box; position:relative; overflow:auto; max-height:70vh; border:1px solid var(--line); border-radius:4px; background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; }
  .frame.zoomed { touch-action:none; cursor:grab; -webkit-user-select:none; user-select:none; }
  .art { display:block; width:max-content; margin:0; padding:8px 10px; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; transform-origin:0 0; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:5; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; border-width:2px 0 0; border-radius:0; padding:10px 12px calc(10px + env(safe-area-inset-bottom)); }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar { display:none; }
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-26-serve-mini-apps-from-main-app">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-26-serve-mini-apps-from-main-app</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap any paragraph, item, drawing line, or decision to add a note.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Mini apps run on a second Worker, <code>&lt;repo&gt;-mini</code>, at a second address. That Worker has its own config, deploy step, preview script, and expiry logic. Its only benefit is a preview that never builds <code>app/</code>, and that speed does not justify a second Worker. Memory already moved into the main Worker in 23.0.0. Mini apps can move there too, so each repo has one Worker and one address.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>One Worker serves the app and every mini app.</b> The main build copies each app's pages into its assets under <code>/apps/&lt;name&gt;/</code>. The main Worker sends <code>/apps/&lt;name&gt;/api/*</code> to that app's <code>api.mjs</code>, the same way it sends <code>/_memory/</code> to memory. A handler gets only the app database, <code>DB</code>, and never the memory bindings.</div><figure class="drawing"><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">wongstack.&lt;you&gt;.workers.dev</span>
<span class="ln" data-note="item-1-line-2" tabindex="0"> │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0"> ├─ /            landing page (React)</span>
<span class="ln" data-note="item-1-line-4" tabindex="0"> ├─ /apps/       generated app list</span>
<span class="ln" data-note="item-1-line-5" tabindex="0"> ├─ /apps/tips/  mini app pages</span>
<span class="ln" data-note="item-1-line-6" tabindex="0"> ├─ /apps/tips/api/*  ─▶ tips/api.mjs</span>
<span class="ln" data-note="item-1-line-7" tabindex="0"> └─ /_memory/*        ─▶ memory route</span></pre></div></figure></div></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A mini-app preview builds the whole app.</b> <code>/apply</code> runs <code>scripts/cf-preview.sh --alias mini-&lt;name&gt;</code>. The script installs <code>app/</code> when it has no <code>node_modules</code>, builds the app, and uploads a preview version of the staging main Worker under that alias. The preview uses staging data. It takes longer than today's upload, because it now builds the whole app.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A mini-app save deploys the main Worker.</b> The direct save to <code>main</code> does not change. CI on <code>main</code> still runs only the changed app's tests, and skips the main app's suite. It now builds and deploys the main Worker, so the app goes live at <code>/apps/&lt;name&gt;/</code>.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>BREAKING: the mini Worker is gone.</b> <code>mini-apps/wrangler.jsonc</code>, <code>mini-apps/worker.ts</code>, <code>scripts/cf-mini.sh</code>, the mini deploy step, and the seven-day preview expiry are removed. The <code>&lt;repo&gt;-mini</code> and <code>&lt;repo&gt;-mini-staging</code> Workers are deleted, and the old <code>&lt;repo&gt;-mini.&lt;you&gt;.workers.dev</code> address stops answering. <code>/wong-sync</code> plans the same move for older installs.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The landing page lists the apps and teaches the loop.</b> The starter app's Vite template page becomes a tutorial message at the top and a list of the mini apps, read from a generated <code>/apps/apps.json</code>. The tutorial's one task is to remove itself, which walks the person through the loop.</div><figure class="drawing"><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">│ Start here: remove this      │</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">│ message                      │</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">│ 1 Tell the agent: &quot;remove    │</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">│   the tutorial message&quot;      │</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">│ 2 Read the plan, say yes     │</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">│ 3 Try the preview, say yes   │</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">│ 4 The message is gone        │</span>
<span class="ln" data-note="item-5-line-9" tabindex="0">│                              │</span>
<span class="ln" data-note="item-5-line-10" tabindex="0">│ Your apps                    │</span>
<span class="ln" data-note="item-5-line-11" tabindex="0">│ ┌──────────────────────────┐ │</span>
<span class="ln" data-note="item-5-line-12" tabindex="0">│ │ Tips                     │ │</span>
<span class="ln" data-note="item-5-line-13" tabindex="0">│ │ Split a bill with a tip  │ │</span>
<span class="ln" data-note="item-5-line-14" tabindex="0">│ ├──────────────────────────┤ │</span>
<span class="ln" data-note="item-5-line-15" tabindex="0">│ │ Hello                    │ │</span>
<span class="ln" data-note="item-5-line-16" tabindex="0">│ │ Say hello from the API   │ │</span>
<span class="ln" data-note="item-5-line-17" tabindex="0">│ └──────────────────────────┘ │</span>
<span class="ln" data-note="item-5-line-18" tabindex="0">└──────────────────────────────┘</span></pre></div></figure></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> no change to the mini-app folder, <code>app.json</code>, or where the tests live. No change to the direct save route or its fallback to a pull request. No move of a mini app into the React app. No new landing page for older installs: they keep their own and get the generated <code>/apps/</code> page.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Found: memory thread #201 deferred serving mini apps at <code>/apps/*</code> through a service binding. 23.0.0 moved memory into the main Worker at <code>/_memory/</code>.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked how the main app should serve mini apps → the user chose <b>preview only the mini app, but ship it as part of the main app</b>, over a service binding or a dashboard page only.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked what happens to <code>&lt;repo&gt;-mini.&lt;you&gt;.workers.dev</code> → chose <b>turn it off</b>.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked whether the main app links to the apps → chose <b>the landing page shows the apps, with a tutorial whose last step removes the tutorial</b>.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked whether a preview can skip the mini Worker with a smaller build → the user said <b>build the whole app for a preview and keep it together</b>, rather than keep a second Worker for preview speed.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: a mini-app handler gets only <code>DB</code>, because a direct save reaches production with no review, and the production Worker also binds <code>MEMORY_DB</code> and <code>MEMORY_BUCKET</code>.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: mini-app previews no longer expire, because they are now ordinary preview versions of the staging main Worker, like every pull-request preview.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the generated <code>/apps/</code> page stays beside the React landing page, because older installs keep their own <code>app/src</code> and need a list too.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the host preview script is general (<code>cf-preview.sh</code>, not a mini script), because it uploads the whole main app under any alias.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: <code>app-untouched.sh</code> keeps its outputs, and <code>deploy.yml</code> also deploys when <code>mini_changed</code> is true, because the test job still skips the main suite for mini-app-only pushes.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: <code>/wong-sync</code> deletes the two mini Workers only after production serves <code>/apps/</code>, with a runbook step like 23.0.0's token cleanup, because an early delete takes saved apps offline.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: this also closes memory thread #200 (a commit that changes both apps publishes one preview), because there is only one Worker to preview.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: release 24.0.0.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed during apply: the route table is a Vite <code>import.meta.glob</code> in <code>mini-apps/routes.mjs</code>, not a generated <code>routes.gen.mjs</code>, because the main app's test job imports the Worker before any build runs.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed during apply: the copy replaces <code>&lt;assets&gt;/apps/</code> rather than refusing an existing one, because <code>/apps/</code> belongs to the mini apps and a rebuild must not fail on its own earlier copy.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed during apply: <code>mini-apps/.gitignore</code> goes too, because nothing writes into <code>mini-apps/</code> any more.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the check of production <code>/apps/</code> and the delete of <code>wongstack-mini</code> and <code>wongstack-mini-staging</code> happen after the merge, outside the task list, because an archived change can not hold a post-merge task. The design's Migration Plan owns the steps, and each delete gets a confirm.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Apply evidence on the host: 258 script tests pass; the app's lint, <code>tsc -b</code>, Vitest (30 tests, 100% coverage), and Stryker on the changed files (34 mutants, 100%) pass. CI stays the gate.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Distilled facts at ship: the store holds no live fact for this change or its branch, so no repeatable fact moved. The wiki edits ride in this change: <code>wiki/stack/mini-apps.md</code>, the change loop, the Access page, and the stack hub.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Archive checkpoint: every task checked, the change archived with its deltas synced into <code>openspec/specs/</code> (mini-apps, stack-pack, ci-tests, delivery-gate), and three session facts stored.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked after the first walk (the user, mid-ship): &quot;Tutorial should be to remove the tutorial message&quot; → the tutorial moved to the top as one message whose only task is to remove itself, walking the plan, preview, and publish steps. The spec, design, sketch, docs, and tests follow.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Merged <code>origin/main</code> (23.1.0 #128 and 23.2.0 #129) into the branch: VERSION stays 24.0.0, the changelog keeps both entries, and the README and <code>WONG-STACK</code> block take main's new wording with the mini-app lines updated for <code>/apps/</code>.</li>
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
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard draft</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="session" hidden>Notes last for this session only.</p>
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
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item' };
    return { at: '#/decisions/' + m[2], kind: 'decision' };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, counts, and the notes list ──
  function render() {
    all('.pin', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
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
    drawings.forEach(measure);
  }

  // ── tap to note: a still pointer on a data-note element shows the chip ──
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
    if (t.target.closest('a, button, input, textarea, select, label, #editor')) return;
    const el = t.target.closest('[data-note]');
    if (el) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : null;
    if (el && t.classList.contains('entry')) el.scrollIntoView({ block: 'center' });
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeEditor(false); hideChip();
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
    if (docked) {
      editor.style.left = editor.style.top = '';
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      if (open.el) {
        const r = open.el.getBoundingClientRect(), limit = window.innerHeight - editor.offsetHeight - 8;
        if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - 8, r.bottom - limit));
      }
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  function dock() {
    const vv = window.visualViewport;
    editor.style.bottom = vv && open && editor.classList.contains('docked') ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) + 'px' : '';
  }
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', dock); window.visualViewport.addEventListener('scroll', dock); }
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
  });

  // ── drawings: fit to the frame, then zoom by 1.25 up to 4, pinch, Ctrl or Cmd wheel, and pan ──
  const drawings = [];
  function measure(d) {
    const atFit = d.s <= d.fit + 0.001, fw = d.frame.clientWidth;
    d.w = d.art.offsetWidth; d.h = d.art.offsetHeight;
    d.fit = fw > 0 && d.w > 0 ? Math.min(1, fw / d.w) : 1;
    zoom(d, atFit ? d.fit : d.s, 0, 0);
  }
  function zoom(d, s, cx, cy) {
    s = Math.max(d.fit, Math.min(4, s));
    d.x = cx - (cx - d.x) * s / d.s; d.y = cy - (cy - d.y) * s / d.s; d.s = s;
    const zoomed = s > d.fit + 0.001, fh = Math.min(d.h * s, window.innerHeight * 0.7);
    d.frame.style.height = Math.ceil(fh) + 'px';
    d.x = Math.min(0, Math.max(d.frame.clientWidth - d.w * s, d.x));
    d.y = Math.min(0, Math.max(fh - d.h * s, d.y));
    d.art.style.transform = 'translate(' + d.x + 'px,' + d.y + 'px) scale(' + s + ')';
    d.frame.classList.toggle('zoomed', zoomed);
    d.level.textContent = (zoomed ? '' : 'Fit · ') + Math.round(s * 100) + '%' + (zoomed ? ' · drag to pan' : '');
    d.out.disabled = !zoomed; d.in.disabled = s >= 4;
  }
  function gap(d) { const p = Object.keys(d.ptrs).map(function (k) { return d.ptrs[k]; }); return { a: p[0], b: p[1], dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1 }; }
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), bar = document.createElement('div');
    bar.className = 'zoom';
    bar.innerHTML = '<span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button>';
    fig.insertBefore(bar, frame);
    const b = bar.querySelectorAll('button');
    const d = { frame: frame, art: fig.querySelector('.art'), level: bar.firstChild, out: b[0], in: b[2], s: 1, fit: 1, x: 0, y: 0, w: 0, h: 0, ptrs: {}, pinch: null };
    drawings.push(d);
    bar.addEventListener('click', function (e) {
      const i = Array.prototype.indexOf.call(b, e.target);
      if (i >= 0) zoom(d, [d.s / 1.25, d.fit, d.s * 1.25][i], frame.clientWidth / 2, frame.clientHeight / 2);
    });
    frame.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = frame.getBoundingClientRect();
      zoom(d, d.s * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    frame.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      d.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      const two = Object.keys(d.ptrs).length === 2;
      if (two) d.pinch = { s: d.s, dist: gap(d).dist };
      if (two || d.s > d.fit + 0.001) {
        Object.keys(d.ptrs).forEach(function (k) { try { frame.setPointerCapture(Number(k)); } catch (err) { /* capture is optional */ } });
      }
    });
    frame.addEventListener('pointermove', function (e) {
      const p = d.ptrs[e.pointerId];
      if (!p) return;
      if (e.pointerType === 'mouse' && !e.buttons) { delete d.ptrs[e.pointerId]; return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (d.pinch && Object.keys(d.ptrs).length === 2) {
        const g = gap(d), r = frame.getBoundingClientRect();
        zoom(d, d.pinch.s * g.dist / d.pinch.dist, (g.a.x + g.b.x) / 2 - r.left, (g.a.y + g.b.y) / 2 - r.top);
      } else if (d.s > d.fit + 0.001) { d.x += dx; d.y += dy; zoom(d, d.s, 0, 0); }
    });
    ['pointerup', 'pointercancel'].forEach(function (type) {
      frame.addEventListener(type, function (e) { delete d.ptrs[e.pointerId]; d.pinch = null; });
    });
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

  // ── copy: saved notes only, as a /continue instruction ──
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from review.html (' + data.notes.length + '):'];
    data.notes.forEach(function (n, i) { lines.push((i + 1) + '. ' + where(n.id).at + ' · ' + n.label + ' — ' + n.text.replace(/\s*\n\s*/g, ' ')); });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) { width = root.clientWidth; hideChip(); }
    drawings.forEach(measure);
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
