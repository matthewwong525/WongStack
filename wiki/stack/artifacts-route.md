# The Artifacts route

The Artifacts route is an install that needs one account: your project's files, its checks, its previews and its publishing all live in your own Cloudflare account, with no GitHub. It is the default for a new install on Mac or Linux; [the GitHub route](github-actions.md) stays for everyone else. This page owns the route, part of the [Cloudflare stack](README.md).

```text
   save ─▶ checks ─▶ preview ─▶ publish? ─▶ live
             │ fail
             ▼
          say why ─▶ fix
```

| | Artifacts route | GitHub route |
|---|---|---|
| Accounts | Cloudflare | Cloudflare and GitHub |
| Cost | Cloudflare's paid plan | free |
| Where checks run | your Cloudflare account | GitHub Actions |
| A change is reviewed as | the plan's page and a preview | a pull request too |
| People per project | one | a team |
| Computers | Mac, Linux | Mac, Linux, Windows |

## What it costs

Cloudflare's **Workers Paid plan, about $5 a month**. [Artifacts](https://developers.cloudflare.com/artifacts/platform/pricing/), which holds the project's files, runs only on that plan. The plan includes an allowance of repository use, [container time](https://developers.cloudflare.com/containers/pricing/) for checks, and storage; use beyond it is billed by Cloudflare. Three limits keep a check run small: [one run at a time](#the-check-runner), 30 minutes a run, and working files deleted after two days.

Setup looks at the plan before it creates anything. On a free account it stops and asks: turn the plan on, or use the GitHub route, which is free.

## Setup

[`/wong-setup`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/SKILL.md) takes this route for a new install on Mac or Linux, unless the person asks for GitHub. It follows [the provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) with these changes, in order:

1. **No GitHub tool or sign-in.** Skip `gh` and the GitHub sign-in when readying the computer. When `git config user.name` or `user.email` is unset, ask the person for a name and email and set them.
2. **Step 1a makes no GitHub repository.** Run only `[ -e .git ] || git init -b main`.
3. **Step 2 widens for this route**: `$P widen --route artifacts`. It adds [three permissions](cloudflare-credentials.md#how-two-permission-rows-become-enough) to a normal provision: the repository, the check runner's container, and a read of the account's plan. Report them with the rest.
4. **After Step 3 picks the account, look at the plan**: `$P plan`. It creates nothing.
   - `"route": "artifacts"` → go on.
   - `"reason": "free-plan"` → **stop before creating anything.** Say: *"Keeping your project in Cloudflare needs its paid plan, about $5 a month. I can wait while you turn it on, or set you up with GitHub, which is free."* Offer both as [a choice](../../.agents/skills/explore/references/asking-the-user.md). GitHub → the runbook from its own Step 1a, unchanged.
   - `"reason": "windows"` → say this route is not ready on Windows yet, and offer GitHub the same way.
5. **Step 4 names and provisions with the route**: `$P names --route artifacts --repo <folder name>`, then `$P provision --route artifacts --repo <folder name> --base <base> …` with the runbook's other flags. In place of the CI deploy token secret (4d) and the workflow (4e), it makes:
   - the project's repository, `<base>`, in the account's `wongstack` Artifacts namespace, and points `origin` at it;
   - [Git access](#renewing-access) that renews itself;
   - [the check runner](#the-check-runner), `<base>-checks`, installed from `scripts/check-runner/` with that folder's own pinned tools. It needs no Docker and adds nothing to the app's dependencies;
   - the `<base>-deploy` token, the same narrow one as on GitHub, stored as the runner's secret, and a storage key that reaches only the runner's bucket;
   - `components.delivery` in `.claude/.wong-stack.json`, which records the route;
   - one empty first commit on `main`, so the first change has a `main` to be published onto.
6. **The first deploy (4f) comes with the first publish.** `/save` pushes the install as a branch and returns its preview; *publish it?* puts it on `main`, and `main`'s checks deploy production.
7. **The closing report (Step 5) adds two lines**: *"This costs about $5 a month, for Cloudflare's paid plan."* and *"Your project lives in your Cloudflare account. There are no pull requests: you review the plan and the preview, then I publish."*

A stop with `error.reason` `plan` is the free-plan stop, reached late: nothing was created.

## How a change is checked and published

1. **Save.** `/save` commits and pushes the branch to your repository. The push starts a check run for that exact commit.
2. **Checks.** The run does [the same checks](../development/the-change-loop.md#the-gate) as the GitHub route, [in three stages](#the-check-runner). A failed stage ends the run: nothing is deployed, and the save reports the failing output.
3. **Preview.** A passing branch is deployed to staging behind [the login wall](cloudflare-access.md). The link `/save` prints is the address that deploy reported for that commit, never an earlier commit's.
4. **Publish.** A yes to *publish it?* puts the branch's files on `main` as one commit, on top of the `main` just fetched, pushed without force. `main` moved meanwhile → the push is refused; bring `main` in, save, and check again.
5. **Live.** `main`'s own run checks that commit, applies database changes, and deploys production. A failing commit on `main` is not deployed: production keeps the last passing one.

A result that can not be read is **unverified**: a save reports it and carries on, a publish stops. It is never read as passed, or as "no checks".

`main` has no branch protection: a push made by hand can put an unchecked commit in its history. It still does not go live, because `main`'s run deploys only after its checks pass.

## How the verbs differ

[`delivery-route.mjs`](../../.agents/skills/save/scripts/delivery-route.mjs) prints `artifacts` or `github` from where `origin` points and what the install record says. Every verb's scripts ask it, so the steps below are the only differences. A record and an origin that disagree stop the verb.

- **Preconditions.** No `gh` check. `origin` and `openspec` are checked as before.
- **`/save`.** Push the branch (`git push -u origin HEAD`); open no pull request and render no body. [`wait-for-checks.sh`](../../.agents/skills/save/scripts/wait-for-checks.sh) and [`preview-url.sh`](../../.agents/skills/save/scripts/preview-url.sh) read the check run and print what they print on GitHub. A `FAILURE` lists the failing stage's output; fix from it. There is no rerun: a failure outside the change is reported. The saved-revision receipt is not written, so `/verify` reads the gate again with the waiter.
- **`/ship`.** Read `main`'s checks with `node .claude/skills/save/scripts/artifacts-run.mjs result "$(git rev-parse origin/main)" refs/heads/main`: `SUCCESS` or `NONE` is `ok`, `FAILURE` stops, anything else is `UNKNOWN`. [`merge.sh`](../../.agents/skills/ship/scripts/merge.sh) hands over to [`publish-artifacts.sh`](../../.agents/skills/ship/scripts/publish-artifacts.sh), which prints `merged=`, `commit=` and `main=`. `moved=yes` → `git merge origin/main`, `/save`, and rerun on `SUCCESS` or `NONE`. Exit 3 → `main` is red or unread: report it and stop. Give `live-look.sh` the `commit=` value.
- **`/continue`.** A handle is a change name. With none, [`other-work.mjs`](../../.agents/skills/explore/scripts/other-work.mjs) lists `savedBranches`: each remote branch holding an unarchived change, with its Status. The drift check counts commits only.
- **`/apply`** previews from this host as on GitHub.
- **Reports** name the preview, never *the change on GitHub*.

## Renewing access

Git reaches the repository with a token that lasts a day. [`artifacts-credential.mjs`](../../.agents/skills/save/scripts/artifacts-credential.mjs), a Git credential helper, makes a new one when Git asks, from `CLOUDFLARE_API_TOKEN` in [the primary worktree's `.env`](../development/secrets.md). Nobody is asked. The token is kept in a private file under `~/.local/state/wongstack/`, never in the repository, its address, or a command.

**A second computer of yours.** Put the Cloudflare token in an `.env` there, clone once with a token made by hand, then let the helper take over:

```bash
REMOTE=https://<account id>.artifacts.cloudflare.net/git/wongstack/<repo>.git
TOKEN=$(curl -s -X POST -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H 'Content-Type: application/json' \
  --data '{"repo":"<repo>","scope":"read","ttl":600}' \
  "https://api.cloudflare.com/client/v4/accounts/<account id>/artifacts/namespaces/wongstack/tokens" | jq -r .result.plaintext)
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.extraHeader GIT_CONFIG_VALUE_0="Authorization: Bearer $TOKEN" git clone "$REMOTE"
node <repo>/.claude/skills/save/scripts/artifacts-credential.mjs install <repo>
```

## The check runner

One Worker in your account, [`scripts/check-runner/`](../../scripts/check-runner/worker.mjs), built on Cloudflare's [`@cloudflare/ci`](https://www.npmjs.com/package/@cloudflare/ci) at a pinned version. A push starts a run named for its commit and branch, so a repeated push event starts nothing twice. [`pipeline.mjs`](../../scripts/check-runner/pipeline.mjs) owns the three stages, each in a fresh container:

1. **prepare**, with a read-only token for this one repository: rebuilds the Git history the checks compare against. It runs none of the project's code.
2. **checks**, with no credential: [`checks.mjs`](../../.github/scripts/checks.mjs), then the plain build. A test that prints its environment finds no Cloudflare credential.
3. **deploy**, with the deploy token only: [`cf-build.sh`](../../scripts/cf-build.sh) and [`cf-deploy.sh`](../../scripts/cf-deploy.sh), told the branch through the variables they take on GitHub. It starts only when checks pass and the app changed.

The bounds: one run at a time for the repository, a later run waiting its turn; 30 minutes of stages a run; one automatic retry, only when Cloudflare interrupts a container; snapshots kept a day, and the bucket's own rule deleting them after two.

The runner's Node is the container image's, not [`.nvmrc`](../../.nvmrc)'s: the public Sandbox image at the SDK's version ships Node 24.

`/wong-sync` reinstalls the runner when its files change: run setup's `provision` again with `--route artifacts --keep-config`.

## The permissions it adds

[The widen](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/permission-groups.md) grants these on top of a normal provision, resolved by name; a test holds setup's script to these tables. Read from Cloudflare's live list on 2026-10-04. Cloudflare's public permissions page calls the second one `Containers Write`; the live list does not.

### An Artifacts install

| Name | Scope | For | Id |
|---|---|---|---|
| `Artifacts Write` | account | the repository and its Git tokens | `f9e1ba803b8d4d52b4d4184825b07a28` |
| `Workers Containers Write` | account | the check runner's container | `bdbcd690c763475a985e8641dddc09f7` |
| `Billing Read` | account | seeing the paid plan before anything is made | `7cf72faf220841aabcfdfab81c43c4f6` |

### The check runner's storage key

Setup makes this key for the runner alone. It reaches the objects of the runner's one bucket, and nothing else.

| Name | Scope | For | Id |
|---|---|---|---|
| `Workers R2 Storage Bucket Item Write` | `com.cloudflare.edge.r2.bucket` | the runner's one bucket | `2efd5506f9c8494dacb1fa10a3e7d5b6` |

## Limits

- **One person per project.** You can work from several of your own computers. Adding a teammate is not built yet.
- **Mac and Linux.** On Windows, setup offers the GitHub route.
- **No pull requests**, and no second person's review of a change.
- **New installs only.** Moving a GitHub install here is not built.

## Teardown

Removal is asked for by name and can't be undone. After [the stack's teardown](getting-started.md#teardown) lists and confirms, delete, with the same user token, what this install made:

1. The check runner: `DELETE /accounts/{account_id}/workers/scripts/<base>-checks?force=true`, which removes its containers' Durable Objects. Its container application and its Workflow outlive it, so delete both by name: `DELETE /accounts/{account_id}/containers/applications/<id>` for the application named `<base>-checks`, and `DELETE /accounts/{account_id}/workflows/<base>-checks`.
2. Its storage: empty, then delete, the `<base>-checks` bucket: list with `GET /accounts/{account_id}/r2/buckets/<base>-checks/objects`, `DELETE` each object by key, then `DELETE /accounts/{account_id}/r2/buckets/<base>-checks`. A bucket that still holds a check run's snapshots refuses to go.
3. Its tokens: `DELETE /accounts/{account_id}/tokens/<id>` for `<base>-deploy` and `<base>-checks-storage`.
4. The repository: `DELETE /accounts/{account_id}/artifacts/namespaces/wongstack/repos/<base>`. This deletes the project's files and history; export a copy first with `git clone --mirror`.
5. On this computer: the token cache under `~/.local/state/wongstack/`.

Read each one back as gone. **Left behind:** the empty `wongstack` namespace, which Cloudflare has no way to delete and which other installs in the account share. Nothing else in the account is touched: a name that does not match this install is skipped and named.
