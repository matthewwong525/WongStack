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
