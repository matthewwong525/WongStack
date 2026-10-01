# CI on GitHub Actions

How the [deploy and data pipeline](d1-pipeline.md) runs in CI, part of the [Cloudflare stack](README.md). The pack ships `.github/workflows/deploy.yml`, and it is deliberately thin — it sets the branch and runs the two [pack scripts](d1-pipeline.md#the-scripts), `cf-build.sh` and `cf-deploy.sh`:

```yaml
CF_BRANCH: ${{ github.head_ref || github.ref_name }}
CF_PRODUCTION_BRANCH: ${{ github.event.repository.default_branch }}
```

**The scripts own every deploy decision, not the workflow.** That's the point: production, the staging Worker, and the per-commit preview alias behave identically whichever CI invokes them, and switching backends is a matter of where the scripts are called from.

| Variable | Set by | If absent |
|---|---|---|
| `CF_BRANCH` | the workflow | falls back to `WORKERS_CI_BRANCH`; neither set → local mode, migrate and deploy nothing |
| `CF_PRODUCTION_BRANCH` | the workflow, from the repo's default branch | `main` |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | GitHub repository secrets | no secrets → build-only |

`WORKERS_CI_BRANCH` is still honored, so a repo on Cloudflare Workers Builds keeps working unchanged and a repo mid-migration can run both.

**An unprovisioned repo gets a real pull-request check instead of a permanently red one**, at both of the two stages adoption passes through:

- **No wrangler config yet** — the state the pack ships in. The workflow detects it, reports *"run `/wong-sync` to plan Cloudflare provisioning"* in the job summary, and exits green. Nothing is built, because there is nothing to build.
- **Config but no secrets** — the workflow builds without deploying, so you get a genuine check (types, build errors) on every PR.

[Setup's provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) writes the config and sets the secrets; after it runs, the workflow deploys.

**One commit deploys once.** `push` and `pull_request` both fire for a commit on a branch with an open PR, so the workflow keys its concurrency group on the event *and* the branch, and runs the job only for `push` plus fork pull requests. Both parts are needed: GitHub evaluates concurrency **before** a job's `if`, so a run destined to be skipped can still cancel the run doing the work — and a cancelled run is what `gh pr checks` reports as `fail`, which would block [`/ship`](../../.agents/skills/ship/SKILL.md). `push` stays the deploying event, so the preview URL attaches to the branch head SHA that `/save` and `/verify` look it up by.

## Why not Cloudflare's own Workers Builds

It can't be automated. Cloudflare's Builds API triggers builds, patches existing triggers, and reads logs, but **cannot create the repository connection, set the production branch, or create the first trigger** — and the GitHub App it needs requires browser OAuth consent that `gh` cannot grant. That's three dashboard steps per repo, forever.

Actions is `gh secret set` plus this file. It also produces a real pull-request check, and a red build is `gh run view --log-failed` — the surface `/save` reads for ordinary checkpoints and on `/ship`'s behalf, with no Cloudflare credential involved. The costs, plainly: Actions minutes are billable on private repos (2,000/month free; public unlimited), and the credentials also live in GitHub secrets.

Staying on Workers Builds is supported and needs no changes — point its build command at `scripts/cf-build.sh` and its deploy command at `scripts/cf-deploy.sh`, and don't add the workflow.

## Next

- The scripts the workflow runs: [deploy and data pipeline](d1-pipeline.md#the-scripts).
- The narrow CI deploy token: [Cloudflare credentials](cloudflare-credentials.md).
- Back to the stack overview: [Cloudflare stack](README.md).
