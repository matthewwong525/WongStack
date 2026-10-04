# Design

## Context

See [proposal.md](proposal.md) for why. What shapes the approach:

- **The personal route already calls no service.** `/wong-setup` provisions with `curl` from one user token ([runbook](../../../.agents/skills/wong-setup/references/cloudflare.md)); GitHub supplies the repository, pull requests and Actions.
- **The pipeline scripts are runner-agnostic.** `scripts/cf-build.sh`, `cf-deploy.sh` and `cf-preview.sh` decide production, staging and preview themselves ([CI on GitHub Actions](../../../wiki/stack/github-actions.md)); `.github/scripts/checks.mjs` owns check discovery on every route.
- **An earlier pilot proved the path** (closed PR #238, remote branch `github-artifacts`, `scripts/pilots/artifacts/`): Artifacts push → `@cloudflare/ci` 0.2.0 Workflow → one Sandbox 0.12.5 container runs tests and build → Worker upload → publish. One run needed a retry. Connecting Artifacts to Workers Builds by API returns HTTP 400, so Builds is out.
- **The managed route is not a base.** Its private context, sealed tokens, observer and three-fact publication protect a platform account from a customer's code and call the wongstack.com app. In a person's own account the trust is that of GitHub Actions secrets today.
- **Skill instruction text has 1 byte of headroom** against `scripts/measure-context.mjs --check`.
- **Another workspace removes** `server/`, the hosted delivery adapter and `wiki/stack/hosted-projects.md`. This change neither reuses nor edits them.

## Goals / Non-Goals

**Goals:** one route switch the verbs share; the same checks and deploy scripts on both routes; no new approval state; a hand test in the owner's account.

**Non-Goals:** a second writer on one repository; branch protection on Artifacts; dependency-update automation; moving an existing install; hostile-code isolation between a project's code and its owner's account.

## Verify first

Each is read from Cloudflare's docs and the pilot code first. A live probe that creates anything is an outward step: ask the owner once, in his own account, under a throwaway name. A failed fact stops the build and returns to him with the options named here.

1. **The check runner installs with no container software on the computer.** The Worker's container must come from the public Sandbox image by digest. If Cloudflare requires a local image build, the options are a prebuilt image this repo's CI publishes, or checks on the person's computer.
2. **The person's token can read a check result.** Expected: the Workflows instance REST read, covered by Workers Scripts permissions. Otherwise the runner serves one status route behind the install's Access wall.
3. **The paid plan is visible before anything is created.** Expected: a read on the account's subscriptions or a refused Artifacts read. Otherwise create the namespace first and treat its refusal as the signal.
4. **The push trigger shape** for the pinned Wrangler (`filter.repo_name`, `targets`, as the pilot recorded) and **the Git auth form** Artifacts accepts from a credential helper.

## Decisions

- **One route switch.** A small script prints `github` or `artifacts` from the checkout's `origin` host and the install record. Every verb asks it; none infers the route another way. *Over* per-verb detection, which drifts.
- **Repository and Git access.** Setup creates one Artifacts repository for the install, default branch `main`. A Git credential helper shipped in the payload mints a repo-scoped token from `CLOUDFLARE_API_TOKEN` in the primary worktree's ignored `.env`, caches it in a mode-0600 file under `~/.local/state/wongstack/`, and renews it on expiry. *Over* a token in the remote URL or a config include written once, which expires within a day.
- **The check runner is one Worker in the person's account**, built on pinned `@cloudflare/ci`, triggered by this repository's push events. One Workflow instance per pushed head:
  1. a runner with no credentials checks out the commit and runs `checks.mjs`, then the ordinary build;
  2. a second runner, chained from the first's output and holding only the narrow deploy token, runs the existing `cf-deploy.sh`. A branch uploads the staging preview; `main` migrates and deploys production.
  A failed first step ends the run with no deploy. *Over* the managed controller (platform trust model, calls a removed service) and over checks on the computer (the owner chose Cloudflare).
- **Reading a result.** The instance id is derived from the head commit. `/save`'s wait script gains an Artifacts branch that polls that instance with the user token and prints the same `SAVE_GATE_RESULT=` line; the preview address is the one Wrangler printed, carried in the run's output. A missing or mismatched instance is `UNKNOWN`.
- **Publishing is `main` moving.** After `SUCCESS` on the exact head, `/ship` squashes the change onto freshly fetched `main` and pushes it without force; the runner checks `main` and deploys; `/ship` waits for that run, then looks at the live app as today. A rejected push refetches and re-gates. *Over* a release ref and approval record, which exist to stop a platform deploying unapproved customer code.
- **Handoff without pull requests.** The proposal's Status and Decision log on the branch are already the handoff. `/continue`'s menu and the other-work check list remote branches with an unarchived change; the pull-request body is skipped.
- **Setup's route choice.** Artifacts for a new install on Mac or Linux with a paid account; GitHub when asked, on Windows, or on a free account after saying the cost. The runbook's GitHub repository, CI deploy token and workflow steps each get an Artifacts twin; the rest is shared. The token widens by the existing protocol with the Artifacts and Containers groups, and Queues only if the trigger needs it.
- **The runner is installed from the host with the pack's pinned tools**, in its own folder with its own lockfile, as the host preview already uses them. `/wong-sync` reinstalls it when its files change.
- **Bounds.** One run at a time per repository, 30 minutes per run, one automatic retry only for a Sandbox interruption, short snapshot retention with an R2 lifecycle rule that deletes them. The closing report names the monthly cost in plain words.
- **Words live in the wiki, not the skills.** A new `wiki/stack/artifacts-route.md` owns the route. Each verb's skill gets at most one linked clause, paid for by an equal cut.

## Risks / Trade-offs

- [Artifacts and the CI SDK are new and pinned to versions the pilot used] → Verify first, pinned lockfile, one retry, and results never guessed.
- [`main` has no branch protection, so an unchecked commit can land in history] → the runner still checks `main` before it deploys; one owner per repository.
- [The user token gains Artifacts and Containers permissions] → the widen reports what it granted; the deploy token stays narrow.
- [Cloudflare documents no way to delete an Artifacts namespace] → teardown names it as left behind.
- [A run costs container minutes and storage] → bounds above; cost stated at setup.
- [The other workspace edits the same verb skills] → whichever publishes second catches up; this change adds new files where it can.

## Migration Plan

Additive: existing installs keep the GitHub route and receive the new files unused. Rollback is removing the route from setup's choice; installs already on Artifacts keep working from their own account.
