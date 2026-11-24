# CI on GitHub Actions

How the [deploy and data pipeline](d1-pipeline.md) runs in CI, part of the [Cloudflare stack](README.md). The pack ships `.github/workflows/deploy.yml`, and it is deliberately thin — it sets the branch and runs the two [pack scripts](d1-pipeline.md#the-scripts), `cf-build.sh` and `cf-deploy.sh`:

```yaml
CF_BRANCH: ${{ github.ref_name }}
CF_PRODUCTION_BRANCH: ${{ github.event.repository.default_branch }}
```

**The scripts own every deploy decision, not the workflow.** That's the point: production, the staging Worker, and the per-commit preview alias behave identically whichever CI invokes them, and switching backends is a matter of where the scripts are called from.

| Variable | Set by | If absent |
|---|---|---|
| `CF_BRANCH` | the workflow: the pushed branch, or `pull-<n>` for a fork's pull request, which only builds | falls back to `WORKERS_CI_BRANCH`; neither set → local mode, migrate and deploy nothing |
| `CF_PRODUCTION_BRANCH` | the workflow, from the repo's default branch | `main` |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | the deploy job's credentialed steps, from the GitHub repository secrets `CLOUDFLARE_DEPLOY_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` ([why that name](cloudflare-credentials.md#store-it)) | no secrets → build-only |

`WORKERS_CI_BRANCH` is still honored, so a repo on Cloudflare Workers Builds keeps working unchanged and a repo mid-migration can run both.

**An unprovisioned repo gets a real pull-request check instead of a permanently red one**, at both of the two stages adoption passes through:

- **No wrangler config yet** — the state the pack ships in. The workflow detects it, reports *"run `/wong-sync` to plan Cloudflare provisioning"* in the job summary, and exits green. Nothing is built, because there is nothing to build.
- **Config but no secrets** — the workflow builds without deploying, so you get a genuine check (types, build errors) on every PR.

[Setup's provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) writes the config and sets the secrets; after it runs, the workflow deploys.

## Where the deploy key is

The workflow runs two jobs, so a branch's own code never shares a machine with the deploy key:

1. **`build`** checks out the branch, installs it, and runs `cf-build.sh --build-only`. It holds no secret: the branch's package scripts, tests and local actions run here and nowhere else. On a push it uploads only the built files, the build's redirect, the wrangler config and its migrations.
2. **`deploy`** runs on a push only. It checks out the default branch into `trusted/`, installs its tools with `npm ci --ignore-scripts` and no cache, and copies the build in with `cf-deploy.sh --take-build`. That copy refuses a build that carries a `build` command, names a file outside the project, or isn't a finished plugin build. A preview is also refused when it names any Worker but the default branch's staging one, claims a route, or binds any database but the default branch's own staging ones. On the default branch it is refused when its databases or web addresses differ from main's own, and the copy keeps main's config and migrations and takes only the built files. Then the default branch's own scripts migrate and deploy, with the key in each step's own `env:`.

Two jobs, not two steps: steps share one machine, so a branch step could leave a process that reads a later step's environment, or write `$GITHUB_ENV`.

What follows from it:

- **A change to the deploy scripts or the config's Worker name shows on publish, never in its own preview.** The preview runs the default branch's scripts.
- **A default branch whose scripts can't take a build yet previews a change after it is published.** The deploy job says so in its summary and deploys nothing. The update that brings this split previews this way once.
- **A branch started before this split gets no key.** Its old workflow reads the key at job level as `CLOUDFLARE_API_TOKEN`, and that secret is deleted once [setup](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4d-the-ci-deploy-token) sets `CLOUDFLARE_DEPLOY_TOKEN`. Such a branch builds without deploying.
- **A preview can't add a database.** It migrates only the default branch's staging database, so a change that binds a new one previews once published.
- **Anyone who can edit a workflow on GitHub can still reach the key.** A GitHub write collaborator can push a workflow that prints it. Give teammates [the app's save access](employee-project.md), not GitHub write access. A push through the app can't change `.github/workflows/`.

**One commit deploys once.** `push` and `pull_request` both fire for a commit on a branch with an open PR, so the workflow keys its concurrency group on the event *and* the branch, and runs the build only for `push` plus fork pull requests. Both parts are needed: GitHub evaluates concurrency **before** a job's `if`, so a run destined to be skipped can still cancel the run doing the work — and a cancelled run is what `gh pr checks` reports as `fail`, which would block [`/ship`](../../.agents/skills/ship/SKILL.md). `push` stays the deploying event, so the preview URL attaches to the branch head SHA that `/save` and `/verify` look it up by.

**A job cancelled with no step run never started.** GitHub cancels a job that waits out its time limit in the runner queue, and reports it as failed with an empty log. Nothing in the change caused it: rerun it with `gh run rerun <id> --failed`, on the default branch too, where a red check holds every publish and a cancelled deploy leaves the release not live.

**A run that fails with no job means the workflow file doesn't load.** GitHub says *This run likely failed because of a workflow file issue* and keeps no log. A `run:` value holding `: ` is the usual cause: plain YAML reads it as a key. Write that command as a block, `run: |` with the command on the next line. Check a workflow before pushing with `npx --yes @action-validator/cli <file>`.

## Why not Cloudflare's own Workers Builds

It can't be automated. Cloudflare's Builds API triggers builds, patches existing triggers, and reads logs, but **cannot create the repository connection, set the production branch, or create the first trigger** — and the GitHub App it needs requires browser OAuth consent that `gh` cannot grant. That's three dashboard steps per repo, forever.

Actions is `gh secret set` plus this file. It also produces a real pull-request check, and a red build is `gh run view --log-failed` — the surface `/save` reads for ordinary checkpoints and on `/ship`'s behalf, with no Cloudflare credential involved. The costs, plainly: Actions minutes are billable on private repos (2,000/month free; public unlimited), and the credentials also live in GitHub secrets. To see where the minutes go, sum each workflow's run times from `gh run list -R <repo> --json workflowName,event,startedAt,updatedAt`; an organization's minutes per repo come from `gh api /organizations/<id>/settings/billing/usage`.

Staying on Workers Builds is supported and needs no changes — point its build command at `scripts/cf-build.sh` and its deploy command at `scripts/cf-deploy.sh`, and don't add the workflow.

## Next

- The scripts the workflow runs: [deploy and data pipeline](d1-pipeline.md#the-scripts).
- The narrow CI deploy token: [Cloudflare credentials](cloudflare-credentials.md).
- Back to the stack overview: [Cloudflare stack](README.md).
