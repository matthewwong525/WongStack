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
