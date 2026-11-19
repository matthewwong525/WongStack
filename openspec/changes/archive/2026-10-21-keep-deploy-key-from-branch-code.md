<!-- openspec-archive v1 2026-10-21-keep-deploy-key-from-branch-code -->
<!-- file proposal.md utf8 13307 -->
# Proposal

**Status:** ready-to-ship
**Branch:** cranky-alpacka
**Open questions:** none

## Why

The key that puts the app and the landing page live can change anything on the Cloudflare account. Today a branch's own code runs while that key is in reach: on every branch push, during the landing page's deploy, and in the check runner. So a teammate who may only save, not publish, can put their change live or copy the key with one edited file. A bad package update can do the same. The Cloudflare security check reproduced all three with dummy keys.

## What Changes

- **Branch code builds with no key.** A saved change is installed, tested and built in a step that has no deploy key, on GitHub and on the check runner alike. Its packages' install scripts get no key either.
  ```mermaid
  flowchart TD
    push["a branch is saved"] --> build["build: branch code, no key"]
    build -->|"built files only"| deploy["deploy: main's scripts + key"]
    deploy --> staging["staging preview"]
  ```

- **Only the published version's scripts hold the key.** A second step takes the deploy scripts from the main version, never from the branch. It checks the built files, then sends them to Cloudflare. A branch can still change the app and preview it as before. A change to the deploy scripts themselves takes effect once it's published, not in its preview.

- **A preview can only land on staging.** Before it deploys anything, the deploy step checks the branch's build against the main version's settings. The Worker's name must be staging's exact name, and the build may claim no web address and run no build command of its own. Every database it binds, memory's included, is one of staging's own, by the main version's names and ids, and only staging's is migrated. A change that adds a database previews once published; other new settings still preview. Anything else stops the preview with a plain reason.

- **The live deploy gets the same file checks.** On main, the build may run no build command of its own and read no file outside the project. Its databases and web addresses must match the main version's own settings, or it stops before any upload. The live deploy keeps the main version's own settings and database changes, and takes only the built files.

- **The key gets a new name.** Only the new workflow reads it, as `CLOUDFLARE_DEPLOY_TOKEN`, in its deploy steps. A branch started before this update still carries the old workflow, which reads the old name `CLOUDFLARE_API_TOKEN` where branch code runs. Setup gives the key a new value under the new name and deletes the old one, so an old branch finds no key and only builds.

- **The check runner builds a branch as staging.** Its fallback build, for a branch whose scripts predate the keyless build, now selects staging too.

- **The landing page works the same way.** Its branch preview is built with no key and can only go to the staging site. It deploys with the main version's settings, so a branch can't point it at wongstack.com or at the app's own Worker. A change to the landing page's settings applies when it's published.

- **A fork can never go live.** A pull request from someone's fork only builds, whatever its branch is called, even one named `main`. Only a save to your own main branch reaches the live app.

- **The docs say who holds the key.** A teammate given the app's save tick can't reach it. A person you add as a GitHub collaborator with write access still can, because they can edit the workflows themselves. The docs say to give teammates the app's tick instead.

Updating needs one hand step. While the sync builds the update, before publish, it runs setup's deploy key step once: it gives the key a new value under its new name and deletes the old one. From then until the update is published, live deploys pause. Deleting the old key can't be undone.

**Non-goals:** moving the key into GitHub's protected environments, or a second workflow that only main defines. That would also lock out GitHub collaborators, but only on public repos or paid GitHub plans. Keeping staging's own secrets apart from production's is the part "Keep staging apart from production". Cloudflare's own Workers Builds route is out of scope too.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cloudflare-provisioning`: CI's narrow token is only ever in reach of the default branch's deploy scripts, never of a branch's install, test or build. It is stored as `CLOUDFLARE_DEPLOY_TOKEN`, and the old secret is deleted. A preview deploy refuses a branch build aimed off staging or binding any database but staging's own. A production deploy refuses a build command, stray paths, and databases or routes that differ from main's, and keeps main's config.
- `artifacts-install`: the check runner's deploy stage runs the default branch's scripts, deploys only what the checks stage built, and runs no project package code while the token is held. Its fallback build on a branch selects staging.
- `landing-site`: a branch preview is built with no token and deployed only to `wongstack-site-staging` with no routes, from the default branch's config.
- `wong-sync`: the catch-up also reports a `deploy.yml` that reads the old secret name, and plans the deploy key step during the update's build, before publish.
- `ci-tests`: tests pin each boundary. Each workflow's credentialed job runs no branch file. The runner's deploy stage runs no branch package code. A fork pull request named like the default branch never selects production. No workflow reads the old secret name.

## Impact

- Workflows: `.github/workflows/deploy.yml` (ships) split into a `build` job with no secret and a `deploy` job. The `deploy` job checks out the default branch's scripts, downloads the build artifact, and gets the token only in its credentialed steps. `.github/workflows/site.yml` (meta-only) gets the same split.
- Scripts: `scripts/cf-build.sh` (a keyless build mode, split from migrations), `scripts/cf-deploy.sh` and `scripts/lib-wrangler-config.sh`/`.mjs` (deploy a prebuilt artifact, plus the new refusals), and `scripts/check-runner/pipeline.mjs` (CHECKS builds the deploy bundle; DEPLOY fetches the default branch into a trusted folder and runs only from it).
- Provisioning: `.agents/skills/wong-setup/scripts/provision.mjs` keeps the repo-level secrets, now named `CLOUDFLARE_DEPLOY_TOKEN`. It rolls the `<repo>-deploy` token when that secret is missing and deletes the old `CLOUDFLARE_API_TOKEN` secret once no local workflow reads it. The check runner reinstalls on the next sync (`--route artifacts --keep-config`).
- Sync: `.agents/skills/wong-sync/scripts/preflight.mjs` raises `deploy-key-name` when `deploy.yml` still reads the old name, and `.agents/skills/wong-sync/references/catch-up.md` plans the deploy key step during the update's build, before publish.
- Tests: `scripts/tests/check-runner.test.mjs`, `wrangler-config.test.mjs`, `landing-site.test.mjs`, `untrusted-build.test.mjs`, `provision.test.mjs`, `wong-sync-preflight.test.mjs`, `downstream-contract.test.mjs`, and a new `deploy-workflow.test.mjs` (after `guard-workflow.test.mjs`).
- Docs: `wiki/stack/github-actions.md`, `wiki/stack/artifacts-route.md`, `wiki/stack/d1-pipeline.md`, `wiki/stack/employee-project.md`, `wiki/stack/cloudflare-credentials.md`, `wiki/stack/getting-started.md`, `wiki/maintaining/landing-page.md`, `.agents/skills/wong-setup/references/cloudflare.md`, `SECURITY.md`, `.env.example`, `CHANGELOG.md`.
- This repo's own secret moves by hand: set `CLOUDFLARE_DEPLOY_TOKEN` on `matthewwong525/WongStack` before the merge, and delete the old one after it.
- Overlaps "Keep staging apart from production", which may also touch `deploy.yml`; whichever publishes second catches up.

## Decision log

- **2026-10-21** — Asked who must be unable to reach the deploy key → chose teammates saving through the app and outside package code, on every GitHub plan, with the key left where it is; GitHub write collaborators stay trusted and the docs say so.
- **2026-10-21** — Assumed: the credentialed step uses the default branch's scripts, not the branch's, because any branch-supplied script or config holding the key is the bug. A preview of a deploy-script change therefore runs main's scripts.
- **2026-10-21** — Assumed: build and deploy run as separate GitHub jobs, not separate steps, because steps share one machine: a branch step can leave a background process or edit `$GITHUB_ENV` and reach a later step's key.
- **2026-10-21** — Assumed: the app's preview keeps the branch's own wrangler settings, checked by main's guards (exact staging name, no routes, no build command, no production database), because a change that adds a binding must still preview. The landing page, which has no bindings, uses main's config outright.
- **2026-10-21** — Assumed: the trusted deploy job installs main's packages fresh with install scripts off and no shared cache, because a branch job can write the branch's cache entries.
- **2026-10-21** — Assumed: the check runner fetches the default branch fresh in its deploy stage, with the read-only repo token, because only `/workspace` carries over between stages and the checks stage may have changed anything in it.
- **2026-10-21** — Assumed: the fork lead (`CF_BRANCH` from `head_ref`) is fixed here, because the deploy job now runs only for `push` events in this repo and takes its target from the event, not a branch name.
- **2026-10-21** — Assumed: binding parity beyond the database (buckets, service bindings, secrets) stays with "Keep staging apart from production", because that part owns what staging may reach.
- **2026-10-21** — Assumed: the refusal also requires a plugin build's redirect with no extra Workers, and refuses any path outside the project, because otherwise `assets.directory` or `main` could upload `/proc/self/environ` from the deploy job.
- **2026-10-21** — Assumed: the "preview after publish" test sits in the deploy job and reads main's `cf-deploy.sh` for `--take-build`, because main's scripts, not the branch's, decide whether a build can be taken.
- **2026-10-21** — Check: `scripts/tests/checks.test.mjs` no longer refuses every `needs:` in `deploy.yml`. It allows exactly `needs: build` and still refuses `workflow_run` and a wait on Test, because the deploy job must wait on its own build job.
- **2026-10-21** — Check: `scripts/tests/check-runner.test.mjs`'s two `INSTALL` tests go with `INSTALL`. A run of the real deploy command replaces them: no planted script and no install script runs, and a production-named build fails.
- **2026-10-21** — Check: `.github/workflows/deploy.yml` splits its one job into `build` and `deploy`, and only a push deploys, because the deploy key must never share a machine with branch code. The build still runs for every push and fork pull request, and both jobs still report.
- **2026-10-21** — Check: `.github/workflows/site.yml` moves the site's deploy into its own `deploy` job, because the key must never share a machine with the branch's install, tests and build. The `site` job keeps every check it ran.
- **2026-10-21** — Asked whether to close old branches, which still carry the old workflow with the key at job level, by renaming the key → chose to rename it: only the new workflow reads the new name, each install's sync mints a fresh key under it and deletes the old one. This reverses the first answer's "key left where it is, no hand step".
- **2026-10-21** — Asked whether a preview may migrate any database but production's → chose staging's own database only, named by the default branch's config.
- **2026-10-21** — Asked whether to run the throwaway live test before publishing → chose to run it, confirming each create and delete.
- **2026-10-21** — Asked when an install's update renames the key → chose during the update, before publish, so no window leaves the old key live; main's deploys pause until the update is published.
- **2026-10-21** — Asked whether a live publish checks the build's databases and web addresses against the main version's settings → chose to check them and stop on a difference.
- **2026-10-21** — Checkpoint: caught up with 44.0.0 (staging apart from production); the workflow test fixture now copies `lib-staging-secrets.mjs`. Throwaway live test (6.2) passed in a private copy: the branch install printed `TOKEN_SET=no` with no process holding the key, and the deploy job published the preview on the throwaway staging Worker. The repo, key, Worker and database were deleted afterwards.
- **2026-10-21** — Asked whether to move this repo's own key around the merge → chose both: `wongstack-deploy` was rolled into `CLOUDFLARE_DEPLOY_TOKEN` on `matthewwong525/WongStack` before the merge, and the old `CLOUDFLARE_API_TOKEN` secret is deleted right after it.
- **2026-10-21** — Archive checkpoint: archived as 44.1.0 after main's 44.0.2 came in; the two specs that promise the old secret name is refused are allowed in `scripts/retired-names.json`.
- **2026-10-21** — Checkpoint: with the new key set, the landing page's deploy ran main's old scripts, which can't take a build. `site.yml` now says *preview after publish* in that case, as `deploy.yml` does; `landing-site.test.mjs` pins it.

<!-- end proposal.md -->
<!-- file design.md utf8 19495 -->
# Design

## Context

See proposal.md for why. The three findings, reproduced at `08f9788e` (`/root/security-audit-skill/WongStack/run-1/FINDINGS-DETAIL.md`):

- `github-workflows/deploy.yml:CLOUDFLARE_API_TOKEN:repo-level-job-env-branch-code`: `deploy.yml` puts `CLOUDFLARE_API_TOKEN` at job level (lines 109-110) for a push to any branch. The steps that run with it are all branch files: the local action `./.github/actions/change-scope` (120), `npm ci` with lifecycle scripts (172), and `cf-secrets.mjs`, `cf-build.sh` and `cf-deploy.sh` (199, 203, 208). The token is repo-level (`provision.mjs:788`), with account-wide Workers Scripts Write and D1 Write. A Project code Read holder pushes branches through the app's git proxy (`code.ts:190, 230`); GitHub refuses only `.github/workflows/` edits from the app's key (`provision.mjs:96`).
- `github/workflows/site.yml:branch-push-deploys-branch-controlled-site-config-with-repo-token`: `site.yml` has the same job-level token (58-59). It runs `npm ci`/`test`/`build` from the branch's `site/package.json`, then deploys with the branch's `site/wrangler.site.jsonc`. `wong_refuse_production_worker` compares two names from that same file.
- `check-runner/pipeline.mjs:deploy-install-scrub-shares-workspace-and-process-tree`: the deploy stage starts from `checked.runner` (198) and runs the branch's `cf-build.sh`/`cf-deploy.sh` (85-86). The `INSTALL` scrub (75) only unsets env names, so a lifecycle script can still read an ancestor's `/proc/<pid>/environ`, or plant an untracked file such as `app/.npmrc`. That file carries over in `/workspace`.
- Lead `github-workflows/deploy.yml:CF_BRANCH:fork-head-ref-production-selection` (`NEEDS-VALIDATION.md` n6): `CF_BRANCH` is `github.head_ref` on a fork PR, so a fork branch named `main` selects production in `cf-build.sh:97` and `cf-deploy.sh:82`. It is reachable only where fork PRs receive secrets.

What the SDK guarantees (`@cloudflare/ci` 0.2.0, read from the published package): each runner is a fresh container, and only `/workspace` is restored from the previous runner's snapshot. The source is overlaid from `/tmp/ci-source`, so tracked files are reset to the commit and untracked ones stay. `cloudflareCredentials` puts `CLOUDFLARE_API_TOKEN` in the env of the stage's top-level process.

The same pattern already exists in the repo: `guard.yml` runs the default branch's copy against a pull request's files and executes none of them, and `guard-workflow.test.mjs` pins it.

## Goals / Non-Goals

**Goals:** the token exists only on a machine or container that runs default-branch files and tools installed with scripts off; a branch build is data to that machine, never code; each finding gets a regression test that fails on today's code.

**Non-Goals:** GitHub environments or a `workflow_run` deploy, which a GitHub write collaborator can't bypass but which need a public repo or paid plan (Decision log); staging's own secrets and non-database bindings ("Keep staging apart from production"); the agent-host preview `cf-preview.sh` and `/continue` running branch code locally ("Stop teammate branches running code on pickup"); Cloudflare Workers Builds; refusing app-saved pushes by path in `code.ts` (the boundary above makes it unnecessary).

## Decisions

### Two GitHub jobs, not two steps

`deploy.yml` becomes:

```text
build   (no secret; contents: read)
  checkout branch → change-scope → locate app → npm ci → cf-build.sh --build-only
  → on a push: copy-build the allowlist, upload artifact "app-build"
deploy  (needs: build; deployments: write)
  if: event == push && build said configured
  checkout trusted ref → path trusted/, persist-credentials: false
  locate the app with main's scripts; main can't take a build yet → "preview after publish", stop
  setup-node (no cache) → npm ci --ignore-scripts in trusted/app
  download app-build → cf-deploy.sh --take-build: copy the allowlist in, then refuse a bad build
  [token, step env only] cf-secrets.mjs check → [HAS_TOKEN] cf-build.sh --migrate → cf-deploy.sh
  publish preview / record release
```

Steps on one runner share a machine. A branch step can leave a background process that reads a later step's `/proc` env, or write `$GITHUB_ENV`/`$GITHUB_PATH`, for example `NODE_OPTIONS=--require ...`. Only a separate job stops that.

- **Trusted ref.** It is `github.sha` on a push to the default branch, where the commit is main itself, and `github.event.repository.default_branch` otherwise.
- **The token gate.** The job-level env holds only `HAS_DEPLOY_TOKEN: ${{ secrets.CLOUDFLARE_DEPLOY_TOKEN != '' }}`, a yes or no. The token is set in each credentialed step's own `env:`, as `CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_DEPLOY_TOKEN }}`.
- **Build job outputs.** The deploy job reads them only as `== 'true'` booleans. It never uses one as a path or a name: `dir` comes from running `trusted/scripts/cf-build.sh --app-dir` again.
- **No local action in `deploy`.** `change-scope` runs in `build` only.
- **No npm cache in `deploy`.** A branch job can save cache entries in the branch's scope, which the deploy job would restore.

Alternative: one job that drops the token for the branch steps. Rejected for the shared-machine reasons above.

### The key gets a new secret name

GitHub runs the pushed commit's own workflow file. A branch started before this release carries the old `deploy.yml`, which reads `secrets.CLOUDFLARE_API_TOKEN` at job level while branch code runs. Renaming the secret closes that: only the new workflow reads `CLOUDFLARE_DEPLOY_TOKEN`, and once the old secret is deleted an old workflow finds an empty value and only builds. The variable handed to wrangler stays `CLOUDFLARE_API_TOKEN`, so no script changes.

- **Provisioning.** `provision.mjs` sets `CLOUDFLARE_DEPLOY_TOKEN`. With that secret missing it rolls the `<repo>-deploy` token, because the old secret's value can't be read back. Once the new secret is set it deletes `CLOUDFLARE_API_TOKEN`, unless a local `.github/workflows/` file still reads it. The roll already made that value dead; the to-do asks the person to rename the reader first, because the delete can't be undone.
- **Rolling cuts the old value.** The old secret's key stops working the moment the token rolls. So `/wong-sync`'s catch-up step `deploy-key-name` runs during the update's build, before publish: its local workflows are already the new ones, so the old secret is deleted at once and no window leaves it live. Main's deploys pause until the update is published, and the person is told so.
- **Raised by content.** The preflight raises `deploy-key-name` when `deploy.yml` reads `secrets.CLOUDFLARE_API_TOKEN`, not by version: the release number isn't known until `/ship`.
- **This repo.** Setting the new secret on `matthewwong525/WongStack` rolls the token, so main's own deploys fail until the merge. The task sets it right before the merge and deletes the old one right after.

Alternative: keep the name and rely on GitHub's workflow-scope refusal. Rejected: a branch from an old commit edits no workflow, so nothing refuses it.

### The target comes from the event

`CF_BRANCH` in the deploy job is `github.ref_name`, and the job runs only for `push` in this repo. A fork pull request runs `build` alone, so `head_ref` never reaches a script that picks production. This closes lead n6 without changing `cf-build.sh`/`cf-deploy.sh`'s string test. `build`'s `CF_BRANCH` is the branch on a push and `pull-<n>` on a fork's pull request, so even a fork branch named `main` builds staging. `cf-build.sh --build-only` picks `CLOUDFLARE_ENV` from it as today; the workflow sets no `CLOUDFLARE_ENV` of its own.

### Split `cf-build.sh` into build and migrate

- **`--build-only`** (no token): regenerate types, then build with `CLOUDFLARE_ENV` chosen from `CF_BRANCH` and `CF_PRODUCTION_BRANCH` exactly as today. It runs in `build` and in the runner's checks stage.
- **`--migrate`** (token): on a branch, migrate the database named by main's kept config (`migrate-database`), never one the branch names; on the default branch, main's own config's `database-name`. Then `wrangler d1 migrations apply --remote`.
- **No flag** keeps today's build-then-migrate, for Workers Builds and `cf-preview.sh`.

Migration SQL from the branch is data run against main's staging database only. The check below makes sure the build binds that same database.

### The artifact is an allowlist of files, checked before use

The deploy job copies in only these paths:

- `app/dist/**`
- `app/.wrangler/deploy/config.json`, uploaded with `include-hidden-files: true`
- `app/wrangler.jsonc`
- the config's `migrations_dir`

It never copies `package.json`, lockfiles, `node_modules`, `.npmrc`, `.env` or `scripts/`. The copy refuses a link anywhere on the way, so a build can't point a file at `/proc` or a secret. Main's own `app/wrangler.jsonc` is kept aside as `trusted/.wong/trusted-wrangler.jsonc` before the copy, once: a second take is refused.

One command does the copy and the check: `cf-deploy.sh --take-build <folder>`, through `lib-wrangler-config.mjs take-build`. The build job packs the same allowlist with `copy-build`, and only on a push. The check, `wong_refuse_untrusted_build` in `lib-wrangler-config.sh`/`.mjs`, runs right after the copy, before `cf-secrets.mjs` makes its first wrangler call. `cf-deploy.sh` and `cf-build.sh --migrate` run it again before their own wrangler calls; it is a no-op in a checkout that took no build. On a branch it requires all of these:

- the generated config's Worker name equals main's `env.staging` name exactly, not merely differs from production's;
- no `routes` or `route`, and no custom domain;
- no `build` key, because `wrangler deploy` runs `build.command`;
- every bound D1 database, memory's included, in the generated config and the branch's `env.staging`, is one of main's own `env.staging` databases by name and id. Production's is refused first with its own reason. A branch that adds a database previews once published; any other new binding still passes;
- a plugin build's redirect inside the app folder, with no `auxiliaryWorkers`, so the generated config is the one checked;
- no path in either config that is absolute, starts with `~`, or leaves the project, so `assets.directory` or `main` can't upload `/proc/self/environ`.

On the default branch it requires the production name from main's config, and applies the redirect, `auxiliaryWorkers`, `build` key and path refusals too: a push to main is branch code until it is built. Wrangler deploys the generated `dist/<name>/wrangler.json`, not main's config, so its D1 entries (name and id) and its routes and custom domains must equal main's top level. There `take-build` keeps main's own config and migrations and copies only `dist/**` and the redirect, so a production deploy migrates main's SQL. Every credentialed wrangler call uses `WONG_WRANGLER`, set to main's `<app>/node_modules/.bin/wrangler`, never `npx` resolution from a copied folder; `cf-secrets.mjs` honours it too.

Alternative for the database: refuse only production's and allow any other. Rejected: a branch could bind and migrate any database the token reaches.

### The landing page uses main's config outright

`site.yml` gets the same split. `build` runs the branch's `npm ci`/`test`/`build` with no secret and uploads `site/dist`. `deploy` checks out the trusted ref, installs main's `site/` with `--ignore-scripts` and copies only `dist/` in. It then deploys with main's `wrangler.site.jsonc`, and on a branch it asserts the literal `wongstack-site-staging` with `routes: []` first. The site has no bindings, so a branch never needs its own settings in a preview. The live publish stays a default-branch push.

### The check runner deploys from a fresh copy of main

- **CHECKS** also runs `cf-build.sh --build-only`. It already holds no credential.
- **DEPLOY** still starts from `checked.runner`, because it needs the built files. It now runs nothing from `/workspace`:
  - It gets `sourceControlCredentials: true` (the read-only repo token prepare already uses) and fetches `refs/heads/main` into a fresh `/tmp/trusted` outside `/workspace`, then checks it out there. A push to main fetches `WONG_HEAD` itself and checks the fetched commit is it. It runs no git in `/workspace`: a planted `.git/config` could run code.
  - It runs `npm ci --ignore-scripts` in `/tmp/trusted/app`, then `cf-deploy.sh --take-build /workspace` copies the same allowlist in.
  - It unsets the git token right after the fetch, then runs `/tmp/trusted/scripts/...` with `CF_BRANCH=$WONG_BRANCH`. `WONG_BRANCH` comes from the push event's ref, which the pipeline validates.
  - When main has no app yet, or its `cf-deploy.sh` has no `--take-build`, it prints `WONG_DEPLOY after-publish` and deploys nothing; the pipeline returns `deploy: 'after-publish'` with `deployed: false`.
- **CHECKS** keeps `npm run build:app` for a branch whose `cf-build.sh` predates `--build-only`. It exports `CLOUDFLARE_ENV=staging` first when `WONG_BRANCH` isn't `main`, so that build is a staging build too.
- **`INSTALL`** goes away. No project package script runs in the deploy stage, so there is nothing to scrub.

Alternative: start the deploy stage from `prepared.runner` and rebuild there as a lower-privilege user. Rejected: it depends on the Sandbox image's users and `setpriv`, which can't be checked offline, and it still runs branch build code beside the token.

### Regression tests, one per finding

| Finding | Test | Fails today because |
|-|-|-|
| deploy.yml token | new `scripts/tests/deploy-workflow.test.mjs`: parse `deploy.yml` (a small YAML reader already in the test deps, else `yaml` as a devDependency of `scripts/tests`). Assert: no secret at job level in either job; `build` references no `secrets.`; every `deploy` step checks out or runs only under `trusted/`, uses no `./` action, and installs with `--ignore-scripts`. Then run the deploy job's commands against a fixture whose branch `package.json` has a token-printing `preinstall`, with stub `wrangler` and dummy token: no marker line. | token at job level; `npm ci` runs lifecycle scripts |
| site.yml config | `landing-site.test.mjs`: the same shape checks for `site.yml`. Run the deploy step body with each audit variant (staging named `wongstack-site`, named `wongstack`, routes dropped): every stub wrangler call targets `wongstack-site-staging` with no routes. | branch config picks the target |
| check runner | `check-runner.test.mjs`: capture `runPipeline`'s deploy command. In a fixture, a checks-stage stand-in plants a line in `scripts/cf-deploy.sh` and an `app/.npmrc`, then the deploy command runs with dummy `CLOUDFLARE_API_TOKEN`. The planted line never prints, and no package script runs (a token-printing `postinstall` that walks `/proc/*/environ` prints nothing). The deploy command runs no path under `/workspace` except the copy. | deploy stage runs branch scripts; install runs lifecycle scripts |
| fork lead | `deploy-workflow.test.mjs`: evaluate `deploy`'s `if` and `CF_BRANCH` for `pull_request` from a fork with `head_ref: main`: the job does not run. | `head_ref` reaches the scripts |
| refusal | new `untrusted-build.test.mjs`: `wong_refuse_untrusted_build` refuses wrong name, routes, custom domain, a `build` key, production's database, a path outside the project, a missing redirect and extra Workers, and passes a new staging-only binding; the copy refuses links. | no such check |
| production refusals | `untrusted-build.test.mjs`: on main, a `build.command` and `assets.directory: "/proc/self"` stop at `take-build` before any wrangler call, and main's config and migrations are kept. | production checked only the name |
| staging database | `untrusted-build.test.mjs`: a preview binding another database, main's name with another id, or another database as `MEMORY_DB` is refused; a main whose staging binds two databases lets a preview bind either; `migrate-database` names main's. | any non-production database passed; memory's entry was skipped; only the first was compared |
| production bindings | `untrusted-build.test.mjs`: on main, a build adding another app's database, a route or a custom domain stops at `take-build`; an unchanged one deploys. | production checked only the name |
| checks fallback | `check-runner.test.mjs`: a branch whose `cf-build.sh` has no `--build-only` builds `demo-staging`; main builds `demo`. | the fallback built production's config |
| old secret | `deploy-workflow.test.mjs`: no workflow reads `secrets.CLOUDFLARE_API_TOKEN`, and only the old name set builds without deploying. `provision.test.mjs`: sets the new name, deletes the old, reuses on a rerun. | the workflows read the old name |

The workflow tests play each job's steps on the machine through `scripts/tests/fixtures/workflow.mjs`: GitHub's expressions, `if`s, env and outputs, stand-ins for the actions, and fake `npm`, `npx`, `wrangler` and `gh`. `yaml` is a new exact devDependency of `scripts/tests`.

## Risks / Trade-offs

- [A preview of a deploy-script change runs main's scripts] → The script tests cover those scripts with stub wrangler. The changelog and `github-actions.md` say a deploy-script change is proven on publish.
- [`npm ci --ignore-scripts` leaves a tool wrangler needs unbuilt] → esbuild and workerd ship their binaries as optional platform packages, and the install script is a fallback. The real staging run in tasks proves it. If it fails, add `npm rebuild <tool>` for that named tool only, without the token.
- [The deploy job's fresh install adds about a minute] → Accepted. A shared cache is the hole it closes.
- [GitHub write collaborators can still edit a workflow and read the token] → Documented in `github-actions.md` and `employee-project.md`: give teammates the app's save tick, not GitHub write access.
- [An install whose main predates this change previews its update branch with old scripts] → The deploy job finds main's `cf-deploy.sh` has no `--take-build`, deploys nothing and says *preview after publish*; the check runner does the same. `/wong-sync`'s plan notes it through the changelog.
- [A branch based on an old commit carries the old `deploy.yml`] → Closed by the rename: that workflow reads `CLOUDFLARE_API_TOKEN`, which is deleted once the new secret is set, so it builds without a key.
- [Deleting the old secret can't be undone] → It holds only the rolled, dead value by then. Provisioning keeps it while a local workflow still reads it.
- [From the deploy key step until publish, the live app doesn't update] → The catch-up runs the step during the update's build and tells the person plainly; publishing ends the pause. The changelog's **Updating.** says so.
- [The upload drops hidden files] → `include-hidden-files: true`. The test asserts `.wrangler/deploy/config.json` is in the allowlist.

## Migration Plan

A `minor` release. `/wong-sync` brings `deploy.yml`, the scripts and the check runner's files. The runner reinstalls through `provision --route artifacts --keep-config`, as today. One hand step: during the update's build, before publish, the deploy key step (`provision.mjs`, or the catch-up's `deploy-key-name`) rolls the token into `CLOUDFLARE_DEPLOY_TOKEN` and deletes `CLOUDFLARE_API_TOKEN`; live deploys pause until the update is published. Rollback is reverting the release and setting `CLOUDFLARE_API_TOKEN` again from a rolled token: the old secret is gone.

<!-- end design.md -->
<!-- file tasks.md utf8 11001 -->
# Tasks

## 1. The pack scripts

- [x] 1.1 `scripts/cf-build.sh`: add `--build-only` (types and build, no wrangler call that needs a token) and `--migrate` (database resolution and `d1 migrations apply --remote` only). No flag keeps today's build-then-migrate. Tests in the new `scripts/tests/untrusted-build.test.mjs`, with stub `npx`/`wrangler` and no token: `--build-only` makes no remote call, `--migrate` builds nothing, no flag runs both.
- [x] 1.2 `scripts/lib-wrangler-config.mjs`/`.sh`: add `wong_refuse_untrusted_build`, which takes main's config aside (`trusted/.wong/trusted-wrangler.jsonc`) and the copied build. On a branch it refuses a name other than main's exact `env.staging` name, any `route`/`routes`/custom domain, and a `build` key, and it keeps the existing production-database refusal. It also requires the plugin build's redirect with no `auxiliaryWorkers`, and refuses a path outside the project. On the default branch it requires the production name. Add `take-build`/`copy-build`/`copy-tree`/`routes`/`refuse-untrusted-build` to the CLI; the copy refuses links. Tests in `untrusted-build.test.mjs`: each refusal names its reason, and a new staging-only binding passes.
- [x] 1.3 `scripts/cf-deploy.sh`: add `--take-build <folder>` (keep main's config aside, copy the build in, check it), call `wong_refuse_untrusted_build` before any wrangler call here and in `cf-build.sh --migrate`, and run wrangler from `WONG_WRANGLER` (the trusted install's `.bin/wrangler`) when set, else `npx` as today. `cf-secrets.mjs` honours `WONG_WRANGLER` too. Tests in `untrusted-build.test.mjs`: a branch build named `wongstack` or claiming a route stops before any stub wrangler call, and the default branch still deploys production.

## 2. The app's deploy workflow

- [x] 2.1 `.github/workflows/deploy.yml`: split into `build` (no secret, `contents: read`, `CF_BRANCH` from the event, `cf-build.sh --build-only` choosing `CLOUDFLARE_ENV`, and on a push packs and uploads the allowlist with `include-hidden-files: true`) and `deploy` (`needs: build`, push-only, `HAS_DEPLOY_TOKEN` gate, trusted-ref checkout with `persist-credentials: false`, says *preview after publish* when main's `cf-deploy.sh` has no `--take-build`, no-cache `npm ci --ignore-scripts`, `cf-deploy.sh --take-build`, token only in step `env:`, then `cf-secrets.mjs check`, `cf-build.sh --migrate`, `cf-deploy.sh`, and the two Deployment steps). Rewrite the header and the comment at the old lines 89-92 to state the boundary. Verify with `npx --yes @action-validator/cli .github/workflows/deploy.yml`.
- [x] 2.2 New `scripts/tests/deploy-workflow.test.mjs`, after `guard-workflow.test.mjs`. It checks the shape: no job-level secret, no `secrets.` in `build`, and in `deploy` no `./` action, no command outside `trusted/`, and `--ignore-scripts` on every install. It also checks the fork lead: `deploy` never runs for a fork `pull_request` with `head_ref: main`. Its run tests play both jobs through `scripts/tests/fixtures/workflow.mjs` on a fixture whose branch `app/package.json` has a token-printing `preinstall`, with stub wrangler and a dummy token, and asserts no marker and a staging-only target. Add it to `downstream-contract.test.mjs` if that file pins `deploy.yml`'s names. Verify the test fails on `08f9788e`'s `deploy.yml` and passes on the new one.

## 3. The landing page's workflow

- [x] 3.1 `.github/workflows/site.yml`: the same split. `build` runs the branch's site install, test and build with no secret and uploads `site/dist`. `deploy` installs main's `site/` with `--ignore-scripts`, copies only `dist/`, and deploys with main's `wrangler.site.jsonc`. On a branch it first asserts `wongstack-site-staging` with `routes: []`; on a default-branch push it publishes live. Verify with `@action-validator/cli`.
- [x] 3.2 `scripts/tests/landing-site.test.mjs`: shape checks for `site.yml` as in 2.2, and a run of the deploy step body with the audit's three branch configs (staging named `wongstack-site`, named `wongstack`, routes dropped). Every stub wrangler call targets `wongstack-site-staging` with no routes, and a token-printing site `postinstall` prints nothing. Verify it fails on `08f9788e`'s `site.yml`.

## 4. The check runner

- [x] 4.1 `scripts/check-runner/pipeline.mjs`: CHECKS runs `cf-build.sh --build-only` after the plain checks. DEPLOY gets `sourceControlCredentials: true`, fetches `refs/heads/main` (on main, `WONG_HEAD`, checked) into a fresh `/tmp/trusted`, runs `npm ci --ignore-scripts` there and copies the allowlist from `/workspace` with `cf-deploy.sh --take-build`. It runs no git in `/workspace`, prints `WONG_DEPLOY after-publish` when main can't take a build, and unsets the git token after the fetch and runs only `/tmp/trusted/scripts/...` with `WONG_WRANGLER` set. Remove `INSTALL` and its export, and update `worker.mjs` if it names it.
- [x] 4.2 `scripts/tests/check-runner.test.mjs`: replace the `INSTALL` env test. A checks-stage stand-in plants a line in `scripts/cf-deploy.sh` and an `app/.npmrc`. A `postinstall` walks `/proc/*/environ` for `CLOUDFLARE_API_TOKEN`. The captured DEPLOY command then runs with a dummy token against a fixture remote whose `main` holds clean scripts. Assert no planted line runs, no `postinstall` runs, a branch build named for production fails the deploy stage, and the deploy runs from `/tmp/trusted`. Verify it fails on `08f9788e`'s `pipeline.mjs`.

## 5. Docs and release

- [x] 5.1 Update `wiki/stack/github-actions.md` (the two jobs, who can reach the key, and that a GitHub write collaborator can still reach it), `wiki/stack/artifacts-route.md` (the deploy stage line about the `CLOUDFLARE_*` scrub), `wiki/stack/d1-pipeline.md` (`--build-only`/`--migrate`), `wiki/stack/employee-project.md` (*nothing skips the checks* now holds against the key too), and `wiki/maintaining/landing-page.md`. Verify with `node scripts/check-payload-links.mjs` and the wiki-links check.
- [x] 5.2 Add `## Next (minor) — Branch code never holds the deploy key` at the top of `CHANGELOG.md`. Its **Updating.** note: the deploy key step during the update's build, before publish (7.4); a change to the deploy scripts now shows on publish, not in its preview; the update's own branch previews after publish. Verify it sits above every numbered entry.

## 7. The key's new name

- [x] 7.1 `.github/workflows/deploy.yml` and `site.yml`: read the secret `CLOUDFLARE_DEPLOY_TOKEN`, in step `env:` and the `HAS_DEPLOY_TOKEN` gate, handed to wrangler as `CLOUDFLARE_API_TOKEN`. `deploy-workflow.test.mjs`: no workflow names `secrets.CLOUDFLARE_API_TOKEN`, and only the old name set builds without deploying. Update `landing-site.test.mjs` and `downstream-contract.test.mjs`.
- [x] 7.2 `.agents/skills/wong-setup/scripts/provision.mjs`: set `CLOUDFLARE_DEPLOY_TOKEN`, rolling `<repo>-deploy` when it is missing, then delete the old `CLOUDFLARE_API_TOKEN` secret unless a local workflow still reads it (then a to-do). `provision.test.mjs`: set-new, delete-old, keep-while-read and reuse; the fake `gh` learns `secret delete`.
- [x] 7.3 `/wong-sync`: the preflight raises `deploy-key-name` when `deploy.yml` reads the old name (`wong-sync-preflight.test.mjs`), and `catch-up.md` plans the deploy key step during the update's build, before publish, and says live deploys pause until it is published. Update the payload manifest.
- [x] 7.4 Docs: `wiki/stack/cloudflare-credentials.md`, `.agents/skills/wong-setup/references/cloudflare.md` §4d, `wiki/stack/github-actions.md`, `wiki/stack/getting-started.md`, `SECURITY.md`, `.env.example`, and the CHANGELOG **Updating.** note in plain words. Retire `secrets.CLOUDFLARE_API_TOKEN` in `scripts/retired-names.json`.
- [x] 7.5 (outward, confirm first) This repo, `matthewwong525/WongStack`: right before the merge, set `CLOUDFLARE_DEPLOY_TOKEN`, minting or rolling `<repo>-deploy` through `provision.mjs` or the CI deploy token step. That roll makes the old secret's value dead, so main's deploys fail until the merge. Right after the merge, delete the old `CLOUDFLARE_API_TOKEN` secret; it can't be undone. Without both, the meta repo's production deploy and landing page publish stop.

## 8. Production and database refusals

- [x] 8.1 `scripts/lib-wrangler-config.mjs`/`.sh`, `cf-deploy.sh`: `take-build` and `refuse-untrusted-build` take the mode. On the default branch, refuse a `build` key, a stray path, a missing redirect and `auxiliaryWorkers` too, and keep main's config and migrations, copying only `dist/**` and the redirect. `untrusted-build.test.mjs`: a `build.command` and `assets.directory: "/proc/self"` on main stop before any wrangler call, and main's config and migrations are kept.
- [x] 8.2 A preview binds only main's `env.staging` D1, by name and id, and `cf-build.sh --migrate` targets it through the new `migrate-database`. `untrusted-build.test.mjs`: a match passes; another database, the name with another id, the id with another name and a branch `env.staging` naming another are refused; a main with no staging database says so; `migrate-database` names main's.
- [x] 8.3 `scripts/check-runner/pipeline.mjs`: CHECKS exports `CLOUDFLARE_ENV=staging` when `WONG_BRANCH` isn't `main`, for a branch whose `cf-build.sh` predates `--build-only`. `check-runner.test.mjs`: that branch builds `demo-staging`, main builds `demo`.
- [x] 8.4 `stagingDatabaseProblem`: compare every D1 entry, `MEMORY_DB` included, against all of main's `env.staging` databases by name and id. `untrusted-build.test.mjs`: another database bound as `MEMORY_DB` is refused; a main whose staging binds two databases lets a preview bind either.
- [x] 8.5 Production mode: refuse before any wrangler call when the generated config's D1 entries (name and id) or routes and custom domains differ from main's top level. `untrusted-build.test.mjs`: a production build adding another app's database, a route or a custom domain is refused; an unchanged one deploys.
- [x] 8.6 The deploy key step moves before publish: `catch-up.md` step 6, the preflight comment, the design's migration plan and the CHANGELOG **Updating.** note; `provision.mjs`'s to-do says the old value is already dead.

## 6. Verification

- [x] 6.1 Run `node .github/scripts/checks.mjs --worktree`, `node scripts/measure-context.mjs --check` and `openspec validate keep-deploy-key-from-branch-code --strict --no-interactive`; all pass.
- [x] 6.2 (outward, confirm first) In a throwaway GitHub install whose `main` is this branch, with a dummy-free but disposable deploy token: push a branch whose `app/package.json` `preinstall` prints whether `CLOUDFLARE_API_TOKEN` is set. The run log shows it unset, the preview link publishes on the staging Worker, and `npm ci --ignore-scripts` left wrangler working. Delete the throwaway repo, Worker and token afterwards, each confirmed.
- [x] 6.3 `/save` this change and wait for CI. This change's own preview runs main's old scripts, so it is proven by 6.2 and by the first branch push after publish.

<!-- end tasks.md -->
<!-- file specs/artifacts-install/spec.md utf8 2252 -->
# Spec Delta

## ADDED Requirements

### Requirement: The deploy stage runs only the main line's scripts

The check runner's deploy stage SHALL take its deploy scripts and tools from a fresh copy of the main line, fetched in that stage. It SHALL run no file the commit or the checks stage left behind, and SHALL use what the checks built only as files to send. The project's own build SHALL run in the checks stage, which holds no credential, and SHALL select staging on any branch but the main line. A change to the deploy scripts SHALL take effect once it reaches the main line.

#### Scenario: The checks stage plants a line in a deploy script

- **WHEN** a package running in the checks stage edits `scripts/cf-deploy.sh` or adds an `.npmrc` in the workspace
- **THEN** the deploy stage runs the main line's copy, and the planted line never runs with the token

#### Scenario: A branch's scripts predate the keyless build

- **WHEN** the checks stage builds a branch whose `cf-build.sh` has no `--build-only`
- **THEN** its fallback build selects the staging environment, never production's config

#### Scenario: A branch aims its build at production

- **WHEN** a branch's build names the production Worker for its preview
- **THEN** the deploy stage stops before deploying and the run fails at `deploy` with that reason

## MODIFIED Requirements

### Requirement: A passing commit is built from complete packages

The checks stage SHALL install the project's packages itself and build the files a preview or the live site serves. It SHALL never fail a commit because files carried over from an earlier stage arrived incomplete. The deploy stage SHALL install its own tools fresh from the main line with install scripts off. No project package code SHALL run while the credential that deploys is held.

#### Scenario: Carried-over files are incomplete

- **WHEN** a commit passed its checks and the files carried to the deploy stage are missing a package
- **THEN** the deploy stage still installs its own tools and the preview is published

#### Scenario: A package runs a script while installing

- **WHEN** a package's install script reads its own environment, or any other process's, in any stage
- **THEN** no Cloudflare credential is in it

<!-- end specs/artifacts-install/spec.md -->
<!-- file specs/ci-tests/spec.md utf8 1498 -->
# Spec Delta

## ADDED Requirements

### Requirement: Credential boundaries are tested without Cloudflare

Tests SHALL prove, with no network and dummy credentials, that each deploy workflow's job that holds the token checks out and runs only default-branch files and installs with scripts off. They SHALL prove that each job running branch code references no Cloudflare secret, and that a fork pull request never selects production. They SHALL prove the check runner's deploy stage runs no workspace file and no package install script while the token is held, that a preview whose build leaves staging or binds another database is refused, and that no workflow reads the old deploy secret name `CLOUDFLARE_API_TOKEN`.

#### Scenario: A workflow edit hands branch code the token

- **WHEN** a change puts the token at job level, references a secret in the build job, or runs a branch script, local action or `npm ci` without `--ignore-scripts` in the credentialed job
- **THEN** the workflow test fails naming the job and step

#### Scenario: The runner's deploy stage reaches the token

- **WHEN** a stand-in install script in the deploy stage reads its ancestors' `/proc` environment, or a checks-stage script edits a workspace deploy script
- **THEN** the check runner test fails, because no token is found and no edited file runs

#### Scenario: A workflow reads the old secret name

- **WHEN** a workflow names `secrets.CLOUDFLARE_API_TOKEN`
- **THEN** the workflow test fails naming the file

<!-- end specs/ci-tests/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 5488 -->
# Spec Delta

## ADDED Requirements

### Requirement: Branch code never holds the deploy token

On the GitHub route, the deploy token SHALL be in reach only of the default branch's own deploy scripts and the tools they install with install scripts off. A branch's own install, tests, build, local actions and scripts SHALL run where no Cloudflare credential exists, on a separate machine from the steps that hold it. A pull request from a fork SHALL only build, and SHALL never select production, whatever its branch is named. Only a push to the repository's default branch SHALL deploy production.

#### Scenario: A branch's package reads its environment

- **WHEN** a branch saved through the app adds an install script that prints the deploy token and runs a production deploy
- **THEN** the script finds no Cloudflare credential, and nothing it runs reaches the production Worker or database

#### Scenario: A fork's branch is named like the default branch

- **WHEN** a pull request from a fork whose branch is named `main` runs the deploy workflow
- **THEN** it builds without deploying, and no production migration or deploy runs

#### Scenario: A branch started before the split

- **WHEN** a branch whose commit carries the old workflow, which reads the old secret name `CLOUDFLARE_API_TOKEN` at job level, is pushed after the update's deploy key step ran
- **THEN** that workflow finds no deploy token and builds without deploying

### Requirement: A preview deploy lands only on staging

Before a branch's build is deployed, the default branch's copy of the deploy scripts SHALL check it. The preview SHALL stop with a plain reason, before any migration or deploy, unless the build names the staging Worker's exact name from the default branch's config. It SHALL also stop when the build claims a route or custom domain, carries a build command of its own, reads a path outside the project, or binds any D1 database, memory's included, other than the default branch's own staging databases, each matched by name and id. Its migration SHALL run only against that database, named by the default branch's config. A new binding of any other kind SHALL still preview.

#### Scenario: A branch renames staging to production

- **WHEN** a branch's build names its Worker after the production Worker or another Worker
- **THEN** the preview stops naming the expected staging Worker, and nothing is migrated or deployed

#### Scenario: A branch adds a binding

- **WHEN** a branch's build adds a new staging-only binding and keeps staging's name
- **THEN** the preview deploys with that binding

#### Scenario: A branch binds another database

- **WHEN** a branch's build binds a database other than the default branch's staging ones, that database's name with another id, or another database under the memory binding
- **THEN** the preview stops naming the expected staging database, and nothing is migrated or deployed

### Requirement: A production deploy keeps the default branch's config

A push to the default branch SHALL be checked like a preview before any wrangler call: no build command of its own, no path outside the project, a finished plugin build with no extra Workers, and the production Worker's name. The generated config's D1 databases, by name and id, and its routes and custom domains SHALL equal the default branch's own top-level config. The deploy SHALL keep the default branch's own config and migrations and take only the built files and the build's redirect.

#### Scenario: A default-branch build runs a command or reads `/proc`

- **WHEN** a build on the default branch carries `build.command`, or `assets.directory: "/proc/self"`
- **THEN** the deploy stops at taking the build, before any wrangler call

#### Scenario: A default-branch build adds a database or a web address

- **WHEN** a build on the default branch binds a database or claims a route or custom domain that the default branch's own config does not
- **THEN** the deploy stops at taking the build, before any wrangler call, and an unchanged build still deploys

## MODIFIED Requirements

### Requirement: CI deploys with its own narrow token

CI SHALL deploy with a separate `<repo>-deploy` token limited to deploying Workers and databases on the chosen account, plus storage only when the app binds a bucket and Access read permission for coverage checks. It SHALL be unable to manage tokens or change Access policies. Its value MUST go straight to the GitHub secret `CLOUDFLARE_DEPLOY_TOKEN`, never to a file or the screen; a later run SHALL reuse it and roll it only when that secret is missing or the person asks. Once it is set, provisioning SHALL delete the old `CLOUDFLARE_API_TOKEN` secret, unless a workflow in the repo still reads that name: then it SHALL keep it and report a to-do.

#### Scenario: Secrets reach GitHub

- **WHEN** CI is wired
- **THEN** the GitHub secret `CLOUDFLARE_DEPLOY_TOKEN` holds the deploy token, and no GitHub secret holds the user token

#### Scenario: An install has the old secret name

- **WHEN** provisioning runs where only the old `CLOUDFLARE_API_TOKEN` secret is set and no workflow reads it
- **THEN** it rolls the deploy token into `CLOUDFLARE_DEPLOY_TOKEN`, then deletes the old secret, and a rerun reuses the token

#### Scenario: Protection is missing

- **WHEN** CI cannot establish that the workspace is protected
- **THEN** it refuses to publish business content or a new reachable preview, and does not try to change Access policies

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/landing-site/spec.md utf8 993 -->
# Spec Delta

## ADDED Requirements

### Requirement: A landing page preview can only reach the staging site

A branch's landing page SHALL be installed, tested and built with no Cloudflare token. Its preview SHALL be deployed by the default branch's copy of the workflow's steps and the site's deploy settings, only to `wongstack-site-staging` with no routes. A branch's edits to the site's deploy settings SHALL apply when published, never in a preview. Only a push to the default branch SHALL publish wongstack.com.

#### Scenario: A branch points staging at the live site

- **WHEN** a branch sets the site's staging name to `wongstack-site` or `wongstack`, or drops staging's empty routes
- **THEN** its preview still deploys only to `wongstack-site-staging` with no routes

#### Scenario: A branch's site script reads the token

- **WHEN** a branch's site `package.json` adds a script that prints `CLOUDFLARE_API_TOKEN`
- **THEN** the script finds no token during install, test or build

<!-- end specs/landing-site/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 1458 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: An old install catches up in place

Sync SHALL plan the update of an install from before 19.0.0 in place, keeping every local edit, and SHALL NOT route it to a fresh setup. The comparison SHALL report, from the repo's layout, its install record and the secret name its `deploy.yml` reads, each move the install missed: the agent folder, the rules file in either link direction, WongStack pages kept outside `wiki/`, leftover generated OpenSpec skills, parts the record opted out of, the CI deploy token, and the deploy token's old secret name. The plan SHALL include each reported move and list opted-out parts as left out until the person asks for them.

#### Scenario: A months-old, edited install

- **WHEN** a person runs `/wong-sync` in a 16.x install with a real `.claude/` folder and edited skills
- **THEN** the plan moves the folder, keeps every edited file's local text, and brings the payload up to date

#### Scenario: A part the person turned down

- **WHEN** the install record says the repo declined the starter app
- **THEN** the plan lists the starter app as left out, with that reason, and adds none of its files

#### Scenario: The deploy key has its old name

- **WHEN** the install's `deploy.yml` reads `secrets.CLOUDFLARE_API_TOKEN`
- **THEN** the plan runs the deploy key step during the update's build, before publish, and says live deploys pause until the update is published

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-21

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 74381 fence=~~~ -->
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
<title>Review · 2026-10-21-keep-deploy-key-from-branch-code</title>
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
<body data-change="2026-10-21-keep-deploy-key-from-branch-code">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-21-keep-deploy-key-from-branch-code</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The key that puts the app and the landing page live can change anything on the Cloudflare account. Today a branch's own code runs while that key is in reach: on every branch push, during the landing page's deploy, and in the check runner. So a teammate who may only save, not publish, can put their change live or copy the key with one edited file. A bad package update can do the same. The Cloudflare security check reproduced all three with dummy keys.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Branch code builds with no key.</b> A saved change is installed, tested and built in a step that has no deploy key, on GitHub and on the check runner alike. Its packages' install scripts get no key either.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-1-picture-1" tabindex="0" style="width:19.077em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 248 377" width="248" height="377" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_push_build_0"><path d="M123.78,56L123.78,97"/><path class="pele-marker" d="M123.78,104L120.42,96L127.14,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_build_deploy_0"><path d="M123.78,152L123.78,218"/><path class="pele-marker" d="M123.78,225L120.42,217L127.14,217Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_deploy_staging_0"><path d="M123.78,273L123.78,314"/><path class="pele-marker" d="M123.78,321L120.42,313L127.14,313Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_build_deploy_0"><rect x="77.77" y="174.5" width="92.03" height="21" rx="3" fill="var(--_bg)"/><text x="123.78" y="189.9" text-anchor="middle">built files only</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="push" transform="translate(123.78,32)"><rect x="-80.7" y="-24" width="161.39" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">a branch is saved</text></g><g class="pele-node pele-shape-rect" data-id="build" transform="translate(123.78,128)"><rect x="-111.38" y="-24" width="222.77" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">build: branch code, no key</text></g><g class="pele-node pele-shape-rect" data-id="deploy" transform="translate(123.78,249)"><rect x="-115.78" y="-24" width="231.57" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">deploy: main's scripts + key</text></g><g class="pele-node pele-shape-rect" data-id="staging" transform="translate(123.78,345)"><rect x="-73.58" y="-24" width="147.15" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">staging preview</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Only the published version's scripts hold the key.</b> A second step takes the deploy scripts from the main version, never from the branch. It checks the built files, then sends them to Cloudflare. A branch can still change the app and preview it as before. A change to the deploy scripts themselves takes effect once it's published, not in its preview.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A preview can only land on staging.</b> Before it deploys anything, the deploy step checks the branch's build against the main version's settings. The Worker's name must be staging's exact name, and the build may claim no web address and run no build command of its own. Every database it binds, memory's included, is one of staging's own, by the main version's names and ids, and only staging's is migrated. A change that adds a database previews once published; other new settings still preview. Anything else stops the preview with a plain reason.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The live deploy gets the same file checks.</b> On main, the build may run no build command of its own and read no file outside the project. Its databases and web addresses must match the main version's own settings, or it stops before any upload. The live deploy keeps the main version's own settings and database changes, and takes only the built files.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The key gets a new name.</b> Only the new workflow reads it, as <code>CLOUDFLARE_DEPLOY_TOKEN</code>, in its deploy steps. A branch started before this update still carries the old workflow, which reads the old name <code>CLOUDFLARE_API_TOKEN</code> where branch code runs. Setup gives the key a new value under the new name and deletes the old one, so an old branch finds no key and only builds.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The check runner builds a branch as staging.</b> Its fallback build, for a branch whose scripts predate the keyless build, now selects staging too.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>The landing page works the same way.</b> Its branch preview is built with no key and can only go to the staging site. It deploys with the main version's settings, so a branch can't point it at wongstack.com or at the app's own Worker. A change to the landing page's settings applies when it's published.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>A fork can never go live.</b> A pull request from someone's fork only builds, whatever its branch is called, even one named <code>main</code>. Only a save to your own main branch reaches the live app.</div></div></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>The docs say who holds the key.</b> A teammate given the app's save tick can't reach it. A person you add as a GitHub collaborator with write access still can, because they can edit the workflows themselves. The docs say to give teammates the app's tick instead.</div></div></li>
</ol>
<p class="aside">Updating needs one hand step. While the sync builds the update, before publish, it runs setup's deploy key step once: it gives the key a new value under its new name and deletes the old one. From then until the update is published, live deploys pause. Deleting the old key can't be undone.</p>
<p class="aside"><b>Non-goals:</b> moving the key into GitHub's protected environments, or a second workflow that only main defines. That would also lock out GitHub collaborators, but only on public repos or paid GitHub plans. Keeping staging's own secrets apart from production's is the part &quot;Keep staging apart from production&quot;. Cloudflare's own Workers Builds route is out of scope too.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked who must be unable to reach the deploy key → chose teammates saving through the app and outside package code, on every GitHub plan, with the key left where it is; GitHub write collaborators stay trusted and the docs say so.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the credentialed step uses the default branch's scripts, not the branch's, because any branch-supplied script or config holding the key is the bug. A preview of a deploy-script change therefore runs main's scripts.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: build and deploy run as separate GitHub jobs, not separate steps, because steps share one machine: a branch step can leave a background process or edit <code>$GITHUB_ENV</code> and reach a later step's key.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the app's preview keeps the branch's own wrangler settings, checked by main's guards (exact staging name, no routes, no build command, no production database), because a change that adds a binding must still preview. The landing page, which has no bindings, uses main's config outright.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the trusted deploy job installs main's packages fresh with install scripts off and no shared cache, because a branch job can write the branch's cache entries.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the check runner fetches the default branch fresh in its deploy stage, with the read-only repo token, because only <code>/workspace</code> carries over between stages and the checks stage may have changed anything in it.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the fork lead (<code>CF_BRANCH</code> from <code>head_ref</code>) is fixed here, because the deploy job now runs only for <code>push</code> events in this repo and takes its target from the event, not a branch name.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: binding parity beyond the database (buckets, service bindings, secrets) stays with &quot;Keep staging apart from production&quot;, because that part owns what staging may reach.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the refusal also requires a plugin build's redirect with no extra Workers, and refuses any path outside the project, because otherwise <code>assets.directory</code> or <code>main</code> could upload <code>/proc/self/environ</code> from the deploy job.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the &quot;preview after publish&quot; test sits in the deploy job and reads main's <code>cf-deploy.sh</code> for <code>--take-build</code>, because main's scripts, not the branch's, decide whether a build can be taken.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-21</p>Check: <code>scripts/tests/checks.test.mjs</code> no longer refuses every <code>needs:</code> in <code>deploy.yml</code>. It allows exactly <code>needs: build</code> and still refuses <code>workflow_run</code> and a wait on Test, because the deploy job must wait on its own build job.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-21</p>Check: <code>scripts/tests/check-runner.test.mjs</code>'s two <code>INSTALL</code> tests go with <code>INSTALL</code>. A run of the real deploy command replaces them: no planted script and no install script runs, and a production-named build fails.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-21</p>Check: <code>.github/workflows/deploy.yml</code> splits its one job into <code>build</code> and <code>deploy</code>, and only a push deploys, because the deploy key must never share a machine with branch code. The build still runs for every push and fork pull request, and both jobs still report.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-21</p>Check: <code>.github/workflows/site.yml</code> moves the site's deploy into its own <code>deploy</code> job, because the key must never share a machine with the branch's install, tests and build. The <code>site</code> job keeps every check it ran.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked whether to close old branches, which still carry the old workflow with the key at job level, by renaming the key → chose to rename it: only the new workflow reads the new name, each install's sync mints a fresh key under it and deletes the old one. This reverses the first answer's &quot;key left where it is, no hand step&quot;.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked whether a preview may migrate any database but production's → chose staging's own database only, named by the default branch's config.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked whether to run the throwaway live test before publishing → chose to run it, confirming each create and delete.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked when an install's update renames the key → chose during the update, before publish, so no window leaves the old key live; main's deploys pause until the update is published.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked whether a live publish checks the build's databases and web addresses against the main version's settings → chose to check them and stop on a difference.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-21</p>Checkpoint: caught up with 44.0.0 (staging apart from production); the workflow test fixture now copies <code>lib-staging-secrets.mjs</code>. Throwaway live test (6.2) passed in a private copy: the branch install printed <code>TOKEN_SET=no</code> with no process holding the key, and the deploy job published the preview on the throwaway staging Worker. The repo, key, Worker and database were deleted afterwards.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked whether to move this repo's own key around the merge → chose both: <code>wongstack-deploy</code> was rolled into <code>CLOUDFLARE_DEPLOY_TOKEN</code> on <code>matthewwong525/WongStack</code> before the merge, and the old <code>CLOUDFLARE_API_TOKEN</code> secret is deleted right after it.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-21</p>Archive checkpoint: archived as 44.1.0 after main's 44.0.2 came in; the two specs that promise the old secret name is refused are allowed in <code>scripts/retired-names.json</code>.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-21</p>Checkpoint: with the new key set, the landing page's deploy ran main's old scripts, which can't take a build. <code>site.yml</code> now says <i>preview after publish</i> in that case, as <code>deploy.yml</code> does; <code>landing-site.test.mjs</code> pins it.</li>
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
