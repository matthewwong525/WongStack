<!-- openspec-archive v1 2026-10-04-artifacts-own-account -->
<!-- file proposal.md utf8 19000 -->
# Install on your own computer with one Cloudflare account

**Status:** ready-to-ship

**Branch:** remove-hetzner-dependency

**Open questions:** none. Not yet tried on a real install: a person's email login in a browser, a free Cloudflare account, a second computer, and the save and publish commands main gained in 31.3.0.

## Why

Installing WongStack today needs a GitHub account and a Cloudflare account. The only way without GitHub lived inside the wongstack.com app, needed a Hetzner server, and is being removed. This change lets a person install and work from their own computer with one Cloudflare account and nothing else.

## What Changes

- **A new install needs one account.** You paste one Cloudflare token. Setup makes your project's home, your site, its login wall, its database and its checker, all in your own Cloudflare account. It asks for no GitHub account and no server.
  ```text
       BEFORE              AFTER
   GitHub account      Cloudflare account
   Cloudflare account  +paid plan
   or a server
  ```
- **It needs Cloudflare's paid plan, about $5 a month.** Setup looks first. On a free account it stops before making anything, says what to turn on and what it costs, and offers the free way through GitHub.
  ```text
   token ─▶ paid plan? ─▶ install
               │ no
               ▼
           say the cost ─▶ offer GitHub
  ```
- **Every change is still checked before it goes live, now inside Cloudflare.** You save a change, its tests and build run in your account, you get a private link to look at, and you answer *publish it?* A change that fails its checks never goes live.
  ```text
   save ─▶ checks ─▶ preview ─▶ publish? ─▶ live
             │ fail
             ▼
          say why ─▶ fix
  ```
- **These installs have no pull requests.** The plan's review page, the preview link and *publish it?* stay. There is no "change on GitHub" to open, and picking up saved work lists your saved changes by name.
- **One person per project for now.** You can work from more than one of your own computers. Adding a teammate to the same project comes later.
- **Mac and Linux first.** On Windows, setup says this way is not ready yet and offers GitHub.
- **Installs that already use GitHub do not change**, this repo included. Anyone who asks for GitHub still gets it, free.
- **Removing an install also removes its project home and checker.** That removal is asked for by name and can't be undone, as today.
- **You test it by hand at the end.** The last step is a real install in your own Cloudflare account under a throwaway name. I ask before starting it, and remove it afterwards.

**Non-goals:** moving an existing GitHub install to Artifacts; Windows; teammates on one project; review of a change by a second person; the landing page, the removal of the server pieces here, and the shutdown of the wongstack.com app, which three other workspaces plan.

## Capabilities

### New Capabilities

- `artifacts-install`: an install whose repository, checks, previews and publishing all live in the person's own Cloudflare account, set up and driven from their own computer.

### Modified Capabilities

- `dependencies`: the stack-pack tools requirement gains one exception, the check runner that setup installs from the pack's own pinned tools.

## Impact

- **Setup:** `/wong-setup` and its provisioning runbook, script and permission tables gain the Artifacts route: paid-plan preflight, repository, check runner, first publish.
- **Verbs:** `/save`, `/ship`, `/continue`, `/apply` and the other-work check pick their route from the checkout, and read results from the check runner where there is no GitHub.
- **Payload:** a new check runner and its helper scripts ship with the Cloudflare stack pack; a payload release (`CHANGELOG.md` entry, minor).
- **Docs:** a new stack page owns the route; the gate, required tools, getting started, credentials and README link to it.
- **Outside the repo:** the final hand test creates, then removes, real resources in the owner's Cloudflare account, only after he says go.
- **Not touched:** the managed hosted pieces and `server/`, which another workspace removes; the GitHub route's scripts and workflows.

## Decision log

- **2026-10-04** — Asked what should happen to Hetzner servers on wongstack.com → chose "Wongstack.com becomes a landing page only and we move it here remove the app."
- **2026-10-04** — Asked which computers must work for the first hand test → chose Mac and Linux first.
- **2026-10-04** — Asked where a person's project should live with the app gone → chose Artifacts in their own Cloudflare account, over GitHub as today and over GitHub now with Artifacts later.
- **2026-10-04** — Asked what should happen to the server pieces in this repo → chose "None of it should be in this repo for now just keep the wongstack-cloud as an archive." Another workspace plans that removal.
- **2026-10-04** — Asked where a change's tests and build should run → chose in Cloudflare, not on the person's computer.
- **2026-10-04** — Asked how to work the four parts → chose this part here and a new workspace for each of the other three.
- **2026-10-04** — Assumed: the GitHub route stays for installs that use it and for anyone who asks, because this repo and existing installs run on it and it is the only free way.
- **2026-10-04** — Assumed: a new install takes Artifacts unless the person asks for GitHub, is on Windows, or has a free Cloudflare account, because he chose Artifacts as where a project lives and those three cases can not use it yet.
- **2026-10-04** — Assumed: one person per project for now, because giving a teammate access to the project's home needs its own design.
- **2026-10-04** — Assumed: publishing is the main line moving forward, checked again before it goes live, with no separate approval record, because the account and the code are the person's own and the protections that guarded the wongstack.com account are not needed.
- **2026-10-04** — Assumed: nothing from the managed hosted route is reused, because it calls the wongstack.com app that is being removed, and another workspace deletes it.
- **2026-10-04** — Assumed: three facts are checked before building (the checker installs without extra software on the computer, check results can be read with the person's token, and the paid plan can be seen before anything is made), because the earlier trial ran in a different account and setting; a failed one stops the build and returns to him.
- **2026-10-04** — Fact 1, the checker installs with no container software on the computer: established. Cloudflare's [image docs](https://developers.cloudflare.com/containers/platform-details/image-management/) say a public Docker Hub image needs no registry setup; Wrangler 4.146.0's own code builds an image only for a local Dockerfile; the trial deployed `docker.io/cloudflare/sandbox:0.12.5` from a Linux host with no Docker (`scripts/pilots/artifacts/config.mjs` and `README.md` at `refs/pull/238/head`). The image is pinned by its exact version, as the trial did, not by digest: Cloudflare documents digest pins only for its own registry.
- **2026-10-04** — Fact 2, the person's token can read a check result: established. Cloudflare's [API reference for one Workflow instance](https://developers.cloudflare.com/api/resources/workflows/subresources/instances/methods/get/) accepts `Workers Scripts Read` or `Write`, which the token already holds, and returns each step's output. A run started by a push gets an id Cloudflare picks, so the runner starts a second run named for the commit and branch through its own Workflow binding, the way `@cloudflare/ci` 0.2.0's `startCiRun` does. No queue is needed.
- **2026-10-04** — Fact 3, the paid plan is visible before anything is created: established for a paid account. The trial read the account's subscriptions and saw Workers Paid three times (`provider.mjs` `preflight` and `evidence.md` at `refs/pull/238/head`). That read needs the `Billing Read` permission, which design.md did not list, so the token's widen adds it and reports it. What a free account answers was never observed, and a paid account can not show it, so setup treats anything but a seen paid plan as "not paid" and stops before it creates anything.
- **2026-10-04** — Fact 4, the push trigger and Git sign-in: established. Wrangler 4.146.0's own config schema takes `filter.repo_name` and `targets: [{ type: "workflow", workflow_name }]`, as the trial recorded. Cloudflare's [Git docs](https://developers.cloudflare.com/artifacts/api/git-protocol/) accept the token's secret as an HTTP Basic password under any username, which is what a Git credential helper sends; the full token carries its expiry after `?expires=`.
- **2026-10-04** — Assumed: no live probe runs before building, because all four facts are established from Cloudflare's docs, the pinned packages' own code and the trial, and none failed. What only a real install can show (a free account's answer, the exact plan name in another account, the runner in the owner's account) moves to the final hand test in task 7.2.
- **2026-10-04** — Read, creating nothing: Cloudflare's live permission list names the new groups `Artifacts Write`, `Workers Containers Write` and `Billing Read`. Cloudflare's public permissions page calls the second one `Containers Write`, which the live list does not hold.
- **2026-10-04** — Assumed: the runner's tests use a stand-in for the SDK's runner call, because `@cloudflare/ci` 0.2.0 publishes no test fixtures (its package leaves its tests out), as the trial's tests did.
- **2026-10-04** — Assumed: a check run has three stages, not two. The pinned SDK's checkout leaves the Git history out, and the shared checks need it, so a first stage rebuilds it with a read-only token for the one repository and runs none of the project's code. The checks stage still holds no credential, and the deploy stage only the deploy token.
- **2026-10-04** — Assumed: the runner uses the container image's own Node (24), not the repo's pinned 22, because installing with no container software means using Cloudflare's public image as it is.
- **2026-10-04** — Assumed: every install in an account shares one Artifacts namespace, `wongstack`, because Cloudflare can not delete a namespace: teardown then leaves one empty namespace behind, not one per install.
- **2026-10-04** — Assumed: `merge.sh` gets a short hand-over to a new publish script, as `wait-for-checks.sh` and `preview-url.sh` get their own branch, so `/ship`'s steps stay the same on both routes. The GitHub steps in it are unchanged.
- **2026-10-04** — Assumed: the new permission tables live on the route's wiki page, not in the setup skill's own table page, which links to them, because the skills' instruction text had three bytes of room; a test holds the script to the tables where they are.
- **2026-10-04** — Assumed: the saved-revision receipt is left as it is, so an Artifacts save writes none and `/verify` reads the gate again with the waiter, because that script's Artifacts branch belongs to the managed route another workspace removes.
- **2026-10-04** — Assumed: a failed check run is not rerun by the verbs, because Cloudflare's rerun call was not established; the runner itself retries once when Cloudflare interrupts a container.
- **2026-10-04** — Audited `cf-build.sh`, `cf-deploy.sh` and `cf-preview.sh`: they read only `CF_BRANCH`, `CF_PRODUCTION_BRANCH` and, for the address they report, the file named by `GITHUB_OUTPUT`. The runner sets those three, so no script changed.
- **2026-10-04** — Moved: the build's own test runs wait for the final save, with the live install test after it. Tests are written beside each part and not yet run.
- **2026-10-04** — Saved: the build is written and main's 31.0.1 is brought in, where the server and managed-hosting pieces are already removed; the verbs' text now names only the GitHub and Artifacts routes. A test helper's late report led to three fixes before the save: a waiting check run is timed from when its turn starts, not from when it queued; a run gets one retry in all, not one for each stage; and a push to the main line that fails while the main line stood still is no longer reported as a moved main line. Still open: the real install in the owner's Cloudflare account and its removal (tasks 7.2 and 7.3), which wait for his go-ahead.
- **2026-10-04** — Asked how the first real install should be tried → chose "I run it here first": one throwaway install from this machine in his Cloudflare account, fix what breaks, remove it, then hand him a one-line test.
- **2026-10-04** — Live test, before anything is created: the token gained `Artifacts Write`, `Workers Containers Write` and `Billing Read` and they took; the one account it reaches shows `Workers Paid`, so setup picks this route; every name for the throwaway `wong-art-test` is free.
- **2026-10-04** — Live test, setup: provisioning made the test install's stores, databases, login wall, repository and check runner on a machine with no container software, and a second run reused all of it. Two faults showed and are fixed: Cloudflare now issues repository tokens as `art_v2_x_…`, which the Git sign-in helper refused, so it now holds the token's shape, not one prefix; and the first save was compared with the project's empty first commit, so every check setting read as changed with no reason, so the runner now compares with nothing in that case, as a new GitHub repository does.
- **2026-10-04** — Live test, housekeeping: three unused repository tokens made while diagnosing were revoked, one of them a ten-minute read-only token that was shown in the session's output.
- **2026-10-04** — Live test, wording: following the install text for the first time found GitHub-only wording in the ignore fragment, `.env.example`, required tools, the wiki's terms and the runbook's no-commit rule; each now names the Artifacts route, and the ignore fragment covers the runner's installed tools and generated config.
- **2026-10-04** — Live test, the walk, in the owner's Cloudflare account under the throwaway name `wong-art-test`, from a Linux machine with no container software. Passed: setup with no GitHub sign-in; a save whose checks ran in the account and passed; a preview that turned a signed-out visitor to the login page and let the install's own login in; a deliberately failing test that came back as a failure with its output and no preview; *publish it?* moving the main line, whose own run passed and deployed; the live site behind its login wall; a second change from the new main line, checked, published and seen in the live page's title on a second read a few seconds after the deploy; the memory store answering. Not run: a person's email login in a browser, a free account's answer to the plan check, a Mac, and a second computer.
- **2026-10-04** — Live test, a third fault, fixed: Cloudflare answered a finished run with its whole result and an error flag beside it (`workflows.api.error.internal_server`, HTTP 200), which the reader took as unreadable. It now reads a finished run whose own output names the commit and branch, and still refuses anything less.
- **2026-10-04** — Live test, removal: the three Workers, the container application, the Workflow, the Access application and its service token, the three databases, the two buckets (38 snapshot objects emptied first), the two tokens and the repository were deleted and each read back as gone; both addresses answer 404; the test folder and its token cache are removed from this machine. Left as it was found: the shared `wongstack` namespace, now empty, which Cloudflare can not delete. Kept on purpose: the three permissions added to the owner's token, for his own test. The teardown text now names the Workflow, which outlives its Worker, how to empty the bucket, and how to find the service token.
- **2026-10-04** — Asked by the owner whether setup still installs GitHub's tool → it did: the tools page listed `gh`, named it in the one install question and ran the GitHub sign-in, and only one line on the route's page said to skip them. The tools page now leaves `gh` and the sign-in out on the Artifacts route and asks the person for the name and email on their saved changes; the live test missed it because that machine already had `gh`.
- **2026-10-04** — Saved: main's 31.2.1 is brought in. The build check had failed for a reason outside this change: main now declares a sign-in key that the live app holds and this branch did not yet know. Provisioning now gives the live app that key on the Artifacts route too, as main does on GitHub; that step has not been tried on a real Artifacts install, since main gained it after the live test.
- **2026-10-04** — Made main's two new commands work on this route. Main's 31.3.0 added one command that runs the routine steps of a save and one that runs those of a publish, and both asked GitHub directly, so they would have failed on an Artifacts install. Both now ask which route the install uses and, on this one, ask GitHub nothing: a save uploads the branch and reads its check run, and a publish reads the main line's own check run before and after. Their tests are written and not yet run, and neither command has been tried on a real Artifacts install, since main gained them after the live test.
- **2026-10-04** — The owner's own hand test, on his Mac, from this branch: a full install in 22 minutes with no GitHub sign-in asked, checks in his Cloudflare account, a private preview, publish, and a live site behind its login. His email sign-in was not reached before the log ended, so it stays untried. His test install `test-folder` was then removed at his word, each piece read back as gone.
- **2026-10-04** — From his log, fixed: the practice-data reset used a `timeout` command macOS lacks, so it now falls back to perl's alarm; the setup guide's `$P` command form fails in the Mac's default shell, so it is a shell function; `/verify`'s saved-revision read answered "unsupported" on this route, so it now reads the check run for the exact commit; facts written in an install's first chat were refused for lack of a session, so they now wait in the spool; and the publish commit was named for the branch's last commit, so it is named for the change's first commit and the version it ships.
- **2026-10-04** — From his log, not done here: installing is still done by hand each time (about ten guide pages read, a copy script and a plan written, 81 steps), and an install's checks run three full times. A small install program and skipping the middle run are separate work.
- **2026-10-04** — Asked what to do next → chose to finish the fixes, then "if tests pass go and publish."
- **2026-10-04** — Archive checkpoint: archived for publishing as 31.4.0, on the owner's word to publish if the checks pass.

<!-- end proposal.md -->
<!-- file design.md utf8 7458 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 6858 -->
# Tasks

Build by [design.md](design.md). Do not edit `server/`, the hosted delivery scripts or `wiki/stack/hosted-projects.md`; another workspace removes them.

## 1. Verify first (facts)

- [x] 1.1 Read Cloudflare's Artifacts, Containers, Workflows and `@cloudflare/ci` docs at the pinned versions, and the pilot at `refs/pull/238/head` (`scripts/pilots/artifacts/`). Record in the Decision log, one bullet each, what is established for design.md's four *Verify first* facts and what still needs a live probe. Verified when each fact is marked established, needs-probe, or failed, with its source.
- [x] 1.2 For each needs-probe fact, ask the owner once for a go-ahead to probe in his own Cloudflare account under one throwaway name (outward: creates billable resources), run the smallest probe, remove what it made, and log the readback. Verified when every fact is established or failed and the account holds nothing the probe made.
- [x] 1.3 If any fact failed, stop here: report it with the options design.md names and wait for the owner's choice. Verified when the Decision log holds his answer, or no fact failed.

## 2. Route switch and Git access (scripts)

- [x] 2.1 Add the route script that prints `github` or `artifacts` from the `origin` host and the install record, with tests for a GitHub origin, an Artifacts origin, a missing origin and a record that disagrees with the origin.
- [x] 2.2 Add the Git credential helper: mints a repo-scoped token from the primary worktree's `.env`, caches it mode 0600 under `~/.local/state/wongstack/`, renews on expiry, and never prints or passes the token as an argument. Tests cover first use, cached use, expiry, a missing `.env` token, a symlinked or wrong-mode cache, and a foreign remote.

## 3. Check runner (pack)

- [x] 3.1 Add the runner's folder to the stack pack: the Worker on pinned `@cloudflare/ci`, its config template, `package.json` and lockfile. It runs `checks.mjs` and the ordinary build in a runner with no credentials, then `cf-deploy.sh` in a chained runner holding only the deploy token; a failed first step ends with no deploy. Tests use the public SDK's fixtures for a passing branch, a failing check, a `main` push, a duplicate event and a Sandbox interruption (one retry).
- [x] 3.2 Give each run an instance id derived from its head commit and an output of commit, result and the preview address Wrangler printed. Test that a mismatched commit and a missing address are never read as passed.
- [x] 3.3 Apply the bounds from design.md (one run at a time, 30 minutes, snapshot retention and R2 lifecycle deletion) and test each.
- [x] 3.4 Audit `cf-build.sh`, `cf-deploy.sh` and `cf-preview.sh` for GitHub-only inputs; pass the runner's branch and commit through the variables they already accept, changing a script only where a test shows it needs it.
- [x] 3.5 List the runner's files in the payload inventory and the manifest's pack category, and extend the payload checks that pin pack files.

## 4. Setup (skill and provisioner)

- [x] 4.1 `provision.mjs`: add the paid-plan preflight, the Artifacts and Containers permission groups to the widen, repository creation, the deploy token stored as the runner's secret, the runner install with the pack's pinned tools, and the first push to `main`. Each step is safe to run again. Tests cover a free account (nothing created), a second run, a refused widen and a taken name.
- [x] 4.2 `references/cloudflare.md` and `permission-groups.md`: give the GitHub repository, CI deploy token and workflow steps their Artifacts twins, the new groups in the tables, and teardown for the repository, runner, its storage and tokens, naming what Cloudflare will not delete.
- [x] 4.3 `wong-setup/SKILL.md`: choose the route (Artifacts on Mac or Linux with a paid account; GitHub when asked, on Windows, or on a free account after saying the cost) in one linked clause, paid for by an equal cut. Record the route in the install record.
- [x] 4.4 The closing report says the monthly cost and that the install has no pull requests, in plain words.

## 5. Verbs (skills and their scripts)

- [x] 5.1 `/save`: `wait-for-checks.sh` and `preview-url.sh` gain an Artifacts branch that reads the run for the exact head and prints the same `SAVE_GATE_RESULT=` values; the pull-request body is skipped on that route. Tests cover passed, failed, timed out, unreadable (`UNKNOWN`) and an earlier commit's preview.
- [x] 5.2 `/ship`: on the Artifacts route, squash onto freshly fetched `main`, push without force, wait for `main`'s run, then the live look. Tests cover a clean publish, a moved `main` (refetch and re-gate), a red `main` run and an unreadable result (stop).
- [x] 5.3 `/continue` and `explore/scripts/other-work.mjs`: list remote branches with an unarchived change where there are no pull requests. Tests cover no branches, one saved change and a branch with no change.
- [x] 5.4 `/apply`, `/save`, `/ship`, `/continue` skill text: one linked clause each to the route page, each paid for by an equal cut; preconditions stop asking for `gh` on the Artifacts route.
- [x] 5.5 Run `node scripts/measure-context.mjs --check` and trim until it passes.

## 6. Docs and release

- [x] 6.1 Write `wiki/stack/artifacts-route.md`: what the route is, what it costs, setup, how a change is checked and published, renewing access, limits (one person, Mac and Linux, no pull requests) and teardown. Link it from `wiki/stack/README.md`.
- [x] 6.2 Point to it, without copying it, from the gate section of `wiki/development/the-change-loop.md`, `wiki/development/required-tools.md` (`gh` is not needed on this route), `wiki/stack/getting-started.md` (cost), `wiki/stack/cloudflare-credentials.md` (the wider token) and `README.md` (what you need).
- [x] 6.3 `CHANGELOG.md`: add `## Next (minor) — Install with one Cloudflare account` in plain words, with an **Updating.** note that GitHub installs need do nothing.
- [x] 6.4 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs` and `node scripts/check-openspec-config.mjs`; all pass.

## 7. Verification

- [x] 7.1 Run `/save`: every check passes on the exact head, with any `Check:` reason the guard asks for.
- [x] 7.2 Ask the owner for a go-ahead to run one real install in his own Cloudflare account under a throwaway name (outward: billable). Then, from a clean folder on Mac or Linux, he or the agent walks: setup with no GitHub sign-in → a small change → save → private preview refuses a signed-out visitor → a deliberately failing change is not published → *publish it?* → the live site shows the change → a second change from the new `main`. Record each step as passed, failed or not run in the Decision log.
- [x] 7.3 Run teardown for that install and read back that its repository, runner, storage and tokens are gone; name anything left behind.

<!-- end tasks.md -->
<!-- file specs/artifacts-install/spec.md utf8 5816 -->
# Spec Delta

## Purpose

Lets a person install and run WongStack from their own computer with only a Cloudflare account. The project's repository, checks, previews and publishing all live in that account, with no GitHub account and no hosting service in between.

## ADDED Requirements

### Requirement: Setup installs with one Cloudflare account

A new install on Mac or Linux SHALL complete from one Cloudflare user token and no GitHub account, with its repository, app hosting, login wall and check runner all in the person's own Cloudflare account. Setup SHALL confirm the account can hold them before it creates anything.

#### Scenario: A fresh computer

- **WHEN** a person whose Cloudflare account has the paid plan asks for an install in an empty folder
- **THEN** the install finishes with its repository and site in that account, and no GitHub sign-in is asked for

#### Scenario: The account is on the free plan

- **WHEN** the token's account lacks the paid plan
- **THEN** setup stops before creating any resource, says the plan is needed and what it costs, and offers the GitHub route

### Requirement: A person can still choose GitHub

The GitHub route SHALL remain available to a new install, and SHALL be the route offered wherever the Artifacts route can not run.

#### Scenario: Someone asks for GitHub

- **WHEN** a person asks for their install to use GitHub
- **THEN** setup follows the GitHub route unchanged

#### Scenario: Setup runs on Windows

- **WHEN** setup runs on Windows
- **THEN** it says the Artifacts route is not ready there and offers the GitHub route

### Requirement: Checks run in the person's Cloudflare account

Every saved commit's checks and build SHALL run in the person's Cloudflare account, never on their computer, and SHALL be the same checks the GitHub route runs.

#### Scenario: A change is saved

- **WHEN** a commit is saved to a branch of an Artifacts install
- **THEN** its checks run in the account and the save reports their result for that exact commit

#### Scenario: A check fails

- **WHEN** a saved commit fails a check
- **THEN** no preview is published for it and the save reports the failure

### Requirement: The preview is private and belongs to the commit

A passing commit SHALL get a preview behind the install's login wall, and the link a verb prints SHALL be the address the deployment reported for that commit.

#### Scenario: A passing branch

- **WHEN** a saved commit passes its checks
- **THEN** the save returns that commit's own preview address, and a signed-out visitor is refused

#### Scenario: Only an earlier commit has a preview

- **WHEN** the newest commit has no preview yet
- **THEN** no earlier commit's link is shown as this work

### Requirement: Only a checked commit goes live

Production SHALL serve only a commit whose checks passed in the account. Publishing SHALL move the main line forward without rewriting it.

#### Scenario: Publish is approved

- **WHEN** the person answers yes to *publish it?* for a change whose checks passed
- **THEN** the main line advances to that change and production serves it once the main line's own checks pass

#### Scenario: The main line moved meanwhile

- **WHEN** the main line has advanced since the change was checked
- **THEN** publishing takes in the new main line and checks again, and never overwrites it

#### Scenario: A failing commit reaches the main line

- **WHEN** a commit on the main line fails its checks
- **THEN** it is not deployed and production keeps serving the last passing commit

### Requirement: The verbs work without pull requests

On an Artifacts install every verb SHALL do its work without a pull request and without the GitHub command-line tool.

#### Scenario: Picking up saved work

- **WHEN** a person asks to continue saved work
- **THEN** the menu lists the saved changes on the repository's branches with their status

#### Scenario: A save

- **WHEN** a save runs on an Artifacts install
- **THEN** no pull request is created or looked for, and a missing GitHub tool stops nothing

### Requirement: A result is never guessed

A check result that can not be read SHALL be reported as unverifiable, never as passed or absent.

#### Scenario: The check runner can not be reached

- **WHEN** a verb can not read the result for the saved commit
- **THEN** a save reports it unverifiable and carries on, and a publish stops

### Requirement: Credentials stay out of the repository and out of the checks

Git access tokens SHALL never appear in history, in the repository's address, or in a command's arguments. The credential that deploys SHALL never reach the step that runs the project's own tests and build.

#### Scenario: A test prints its environment

- **WHEN** a project's test or build script reads its environment during checks
- **THEN** no Cloudflare credential is in it

#### Scenario: Git access has expired

- **WHEN** a verb reaches the repository after its access token expired
- **THEN** access is renewed from the token in the ignored `.env` without asking the person

### Requirement: Teardown removes what setup made

Teardown SHALL remove an Artifacts install's repository, check runner, and their storage and tokens, and nothing else in the account.

#### Scenario: A shared account

- **WHEN** teardown runs in an account that holds other projects
- **THEN** only this install's resources are removed, and anything Cloudflare will not remove is named as left behind

### Requirement: GitHub installs are untouched

An install on the GitHub route SHALL keep its repository, checks, pull requests and publishing as they were.

#### Scenario: A GitHub install updates

- **WHEN** an installed GitHub repo takes this release
- **THEN** its saves, pull requests and publishing behave as before, and nothing asks it to move

<!-- end specs/artifacts-install/spec.md -->
<!-- file specs/dependencies/spec.md utf8 956 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Stack-pack tools stay in the repo's build and CI

The Cloudflare stack pack's `node`, `npm`, and `wrangler` use SHALL run only in that repo's own build and CI, and provisioning SHALL use `curl` against the Cloudflare API so the person's machine needs no app dependency. The one exception is the check runner of an Artifacts install: setup installs it from the pack's own pinned and locked tools, outside the app, and adds nothing to the app's dependencies.

#### Scenario: Setup provisions Cloudflare

- **WHEN** setup provisions the app on a fresh computer
- **THEN** it reaches Cloudflare with `curl` and installs no app dependency

#### Scenario: Setup installs the check runner

- **WHEN** setup installs the check runner of an Artifacts install
- **THEN** it uses only the pack's pinned and locked tools, needs no container software on the computer, and leaves the app's dependencies unchanged

<!-- end specs/dependencies/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-04

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 55984 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-04-artifacts-own-account</title>
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
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-04-artifacts-own-account">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-04-artifacts-own-account</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Installing WongStack today needs a GitHub account and a Cloudflare account. The only way without GitHub lived inside the wongstack.com app, needed a Hetzner server, and is being removed. This change lets a person install and work from their own computer with one Cloudflare account and nothing else.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A new install needs one account.</b> You paste one Cloudflare token. Setup makes your project's home, your site, its login wall, its database and its checker, all in your own Cloudflare account. It asks for no GitHub account and no server.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">     BEFORE              AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0"> GitHub account      Cloudflare account</span>
<span class="ln" data-note="item-1-line-3" tabindex="0"> Cloudflare account  +paid plan</span>
<span class="ln" data-note="item-1-line-4" tabindex="0"> or a server</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>It needs Cloudflare's paid plan, about $5 a month.</b> Setup looks first. On a free account it stops before making anything, says what to turn on and what it costs, and offers the free way through GitHub.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0"> token ─▶ paid plan? ─▶ install</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">             │ no</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">             ▼</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">         say the cost ─▶ offer GitHub</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Every change is still checked before it goes live, now inside Cloudflare.</b> You save a change, its tests and build run in your account, you get a private link to look at, and you answer <i>publish it?</i> A change that fails its checks never goes live.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0"> save ─▶ checks ─▶ preview ─▶ publish? ─▶ live</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">           │ fail</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">           ▼</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">        say why ─▶ fix</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>These installs have no pull requests.</b> The plan's review page, the preview link and <i>publish it?</i> stay. There is no &quot;change on GitHub&quot; to open, and picking up saved work lists your saved changes by name.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>One person per project for now.</b> You can work from more than one of your own computers. Adding a teammate to the same project comes later.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Mac and Linux first.</b> On Windows, setup says this way is not ready yet and offers GitHub.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>Installs that already use GitHub do not change</b>, this repo included. Anyone who asks for GitHub still gets it, free.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Removing an install also removes its project home and checker.</b> That removal is asked for by name and can't be undone, as today.</div></div></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>You test it by hand at the end.</b> The last step is a real install in your own Cloudflare account under a throwaway name. I ask before starting it, and remove it afterwards.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> moving an existing GitHub install to Artifacts; Windows; teammates on one project; review of a change by a second person; the landing page, the removal of the server pieces here, and the shutdown of the wongstack.com app, which three other workspaces plan.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what should happen to Hetzner servers on wongstack.com → chose &quot;Wongstack.com becomes a landing page only and we move it here remove the app.&quot;</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked which computers must work for the first hand test → chose Mac and Linux first.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked where a person's project should live with the app gone → chose Artifacts in their own Cloudflare account, over GitHub as today and over GitHub now with Artifacts later.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what should happen to the server pieces in this repo → chose &quot;None of it should be in this repo for now just keep the wongstack-cloud as an archive.&quot; Another workspace plans that removal.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked where a change's tests and build should run → chose in Cloudflare, not on the person's computer.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked how to work the four parts → chose this part here and a new workspace for each of the other three.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the GitHub route stays for installs that use it and for anyone who asks, because this repo and existing installs run on it and it is the only free way.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: a new install takes Artifacts unless the person asks for GitHub, is on Windows, or has a free Cloudflare account, because he chose Artifacts as where a project lives and those three cases can not use it yet.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: one person per project for now, because giving a teammate access to the project's home needs its own design.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: publishing is the main line moving forward, checked again before it goes live, with no separate approval record, because the account and the code are the person's own and the protections that guarded the wongstack.com account are not needed.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: nothing from the managed hosted route is reused, because it calls the wongstack.com app that is being removed, and another workspace deletes it.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: three facts are checked before building (the checker installs without extra software on the computer, check results can be read with the person's token, and the paid plan can be seen before anything is made), because the earlier trial ran in a different account and setting; a failed one stops the build and returns to him.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Fact 1, the checker installs with no container software on the computer: established. Cloudflare's <a href="https://developers.cloudflare.com/containers/platform-details/image-management/">image docs</a> say a public Docker Hub image needs no registry setup; Wrangler 4.146.0's own code builds an image only for a local Dockerfile; the trial deployed <code>docker.io/cloudflare/sandbox:0.12.5</code> from a Linux host with no Docker (<code>scripts/pilots/artifacts/config.mjs</code> and <code>README.md</code> at <code>refs/pull/238/head</code>). The image is pinned by its exact version, as the trial did, not by digest: Cloudflare documents digest pins only for its own registry.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Fact 2, the person's token can read a check result: established. Cloudflare's <a href="https://developers.cloudflare.com/api/resources/workflows/subresources/instances/methods/get/">API reference for one Workflow instance</a> accepts <code>Workers Scripts Read</code> or <code>Write</code>, which the token already holds, and returns each step's output. A run started by a push gets an id Cloudflare picks, so the runner starts a second run named for the commit and branch through its own Workflow binding, the way <code>@cloudflare/ci</code> 0.2.0's <code>startCiRun</code> does. No queue is needed.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Fact 3, the paid plan is visible before anything is created: established for a paid account. The trial read the account's subscriptions and saw Workers Paid three times (<code>provider.mjs</code> <code>preflight</code> and <code>evidence.md</code> at <code>refs/pull/238/head</code>). That read needs the <code>Billing Read</code> permission, which design.md did not list, so the token's widen adds it and reports it. What a free account answers was never observed, and a paid account can not show it, so setup treats anything but a seen paid plan as &quot;not paid&quot; and stops before it creates anything.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Fact 4, the push trigger and Git sign-in: established. Wrangler 4.146.0's own config schema takes <code>filter.repo_name</code> and <code>targets: [{ type: &quot;workflow&quot;, workflow_name }]</code>, as the trial recorded. Cloudflare's <a href="https://developers.cloudflare.com/artifacts/api/git-protocol/">Git docs</a> accept the token's secret as an HTTP Basic password under any username, which is what a Git credential helper sends; the full token carries its expiry after <code>?expires=</code>.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: no live probe runs before building, because all four facts are established from Cloudflare's docs, the pinned packages' own code and the trial, and none failed. What only a real install can show (a free account's answer, the exact plan name in another account, the runner in the owner's account) moves to the final hand test in task 7.2.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Read, creating nothing: Cloudflare's live permission list names the new groups <code>Artifacts Write</code>, <code>Workers Containers Write</code> and <code>Billing Read</code>. Cloudflare's public permissions page calls the second one <code>Containers Write</code>, which the live list does not hold.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the runner's tests use a stand-in for the SDK's runner call, because <code>@cloudflare/ci</code> 0.2.0 publishes no test fixtures (its package leaves its tests out), as the trial's tests did.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: a check run has three stages, not two. The pinned SDK's checkout leaves the Git history out, and the shared checks need it, so a first stage rebuilds it with a read-only token for the one repository and runs none of the project's code. The checks stage still holds no credential, and the deploy stage only the deploy token.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the runner uses the container image's own Node (24), not the repo's pinned 22, because installing with no container software means using Cloudflare's public image as it is.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: every install in an account shares one Artifacts namespace, <code>wongstack</code>, because Cloudflare can not delete a namespace: teardown then leaves one empty namespace behind, not one per install.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: <code>merge.sh</code> gets a short hand-over to a new publish script, as <code>wait-for-checks.sh</code> and <code>preview-url.sh</code> get their own branch, so <code>/ship</code>'s steps stay the same on both routes. The GitHub steps in it are unchanged.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the new permission tables live on the route's wiki page, not in the setup skill's own table page, which links to them, because the skills' instruction text had three bytes of room; a test holds the script to the tables where they are.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the saved-revision receipt is left as it is, so an Artifacts save writes none and <code>/verify</code> reads the gate again with the waiter, because that script's Artifacts branch belongs to the managed route another workspace removes.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: a failed check run is not rerun by the verbs, because Cloudflare's rerun call was not established; the runner itself retries once when Cloudflare interrupts a container.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Audited <code>cf-build.sh</code>, <code>cf-deploy.sh</code> and <code>cf-preview.sh</code>: they read only <code>CF_BRANCH</code>, <code>CF_PRODUCTION_BRANCH</code> and, for the address they report, the file named by <code>GITHUB_OUTPUT</code>. The runner sets those three, so no script changed.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Moved: the build's own test runs wait for the final save, with the live install test after it. Tests are written beside each part and not yet run.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Saved: the build is written and main's 31.0.1 is brought in, where the server and managed-hosting pieces are already removed; the verbs' text now names only the GitHub and Artifacts routes. A test helper's late report led to three fixes before the save: a waiting check run is timed from when its turn starts, not from when it queued; a run gets one retry in all, not one for each stage; and a push to the main line that fails while the main line stood still is no longer reported as a moved main line. Still open: the real install in the owner's Cloudflare account and its removal (tasks 7.2 and 7.3), which wait for his go-ahead.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked how the first real install should be tried → chose &quot;I run it here first&quot;: one throwaway install from this machine in his Cloudflare account, fix what breaks, remove it, then hand him a one-line test.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Live test, before anything is created: the token gained <code>Artifacts Write</code>, <code>Workers Containers Write</code> and <code>Billing Read</code> and they took; the one account it reaches shows <code>Workers Paid</code>, so setup picks this route; every name for the throwaway <code>wong-art-test</code> is free.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Live test, setup: provisioning made the test install's stores, databases, login wall, repository and check runner on a machine with no container software, and a second run reused all of it. Two faults showed and are fixed: Cloudflare now issues repository tokens as <code>art_v2_x_…</code>, which the Git sign-in helper refused, so it now holds the token's shape, not one prefix; and the first save was compared with the project's empty first commit, so every check setting read as changed with no reason, so the runner now compares with nothing in that case, as a new GitHub repository does.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Live test, housekeeping: three unused repository tokens made while diagnosing were revoked, one of them a ten-minute read-only token that was shown in the session's output.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Live test, wording: following the install text for the first time found GitHub-only wording in the ignore fragment, <code>.env.example</code>, required tools, the wiki's terms and the runbook's no-commit rule; each now names the Artifacts route, and the ignore fragment covers the runner's installed tools and generated config.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Live test, the walk, in the owner's Cloudflare account under the throwaway name <code>wong-art-test</code>, from a Linux machine with no container software. Passed: setup with no GitHub sign-in; a save whose checks ran in the account and passed; a preview that turned a signed-out visitor to the login page and let the install's own login in; a deliberately failing test that came back as a failure with its output and no preview; <i>publish it?</i> moving the main line, whose own run passed and deployed; the live site behind its login wall; a second change from the new main line, checked, published and seen in the live page's title on a second read a few seconds after the deploy; the memory store answering. Not run: a person's email login in a browser, a free account's answer to the plan check, a Mac, and a second computer.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Live test, a third fault, fixed: Cloudflare answered a finished run with its whole result and an error flag beside it (<code>workflows.api.error.internal_server</code>, HTTP 200), which the reader took as unreadable. It now reads a finished run whose own output names the commit and branch, and still refuses anything less.</li>
<li class="decision card" id="decision-37" data-note="decision-37" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Live test, removal: the three Workers, the container application, the Workflow, the Access application and its service token, the three databases, the two buckets (38 snapshot objects emptied first), the two tokens and the repository were deleted and each read back as gone; both addresses answer 404; the test folder and its token cache are removed from this machine. Left as it was found: the shared <code>wongstack</code> namespace, now empty, which Cloudflare can not delete. Kept on purpose: the three permissions added to the owner's token, for his own test. The teardown text now names the Workflow, which outlives its Worker, how to empty the bucket, and how to find the service token.</li>
<li class="decision card" id="decision-38" data-note="decision-38" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked by the owner whether setup still installs GitHub's tool → it did: the tools page listed <code>gh</code>, named it in the one install question and ran the GitHub sign-in, and only one line on the route's page said to skip them. The tools page now leaves <code>gh</code> and the sign-in out on the Artifacts route and asks the person for the name and email on their saved changes; the live test missed it because that machine already had <code>gh</code>.</li>
<li class="decision card" id="decision-39" data-note="decision-39" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Saved: main's 31.2.1 is brought in. The build check had failed for a reason outside this change: main now declares a sign-in key that the live app holds and this branch did not yet know. Provisioning now gives the live app that key on the Artifacts route too, as main does on GitHub; that step has not been tried on a real Artifacts install, since main gained it after the live test.</li>
<li class="decision card" id="decision-40" data-note="decision-40" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Made main's two new commands work on this route. Main's 31.3.0 added one command that runs the routine steps of a save and one that runs those of a publish, and both asked GitHub directly, so they would have failed on an Artifacts install. Both now ask which route the install uses and, on this one, ask GitHub nothing: a save uploads the branch and reads its check run, and a publish reads the main line's own check run before and after. Their tests are written and not yet run, and neither command has been tried on a real Artifacts install, since main gained them after the live test.</li>
<li class="decision card" id="decision-41" data-note="decision-41" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The owner's own hand test, on his Mac, from this branch: a full install in 22 minutes with no GitHub sign-in asked, checks in his Cloudflare account, a private preview, publish, and a live site behind its login. His email sign-in was not reached before the log ended, so it stays untried. His test install <code>test-folder</code> was then removed at his word, each piece read back as gone.</li>
<li class="decision card" id="decision-42" data-note="decision-42" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>From his log, fixed: the practice-data reset used a <code>timeout</code> command macOS lacks, so it now falls back to perl's alarm; the setup guide's <code>$P</code> command form fails in the Mac's default shell, so it is a shell function; <code>/verify</code>'s saved-revision read answered &quot;unsupported&quot; on this route, so it now reads the check run for the exact commit; facts written in an install's first chat were refused for lack of a session, so they now wait in the spool; and the publish commit was named for the branch's last commit, so it is named for the change's first commit and the version it ships.</li>
<li class="decision card" id="decision-43" data-note="decision-43" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>From his log, not done here: installing is still done by hand each time (about ten guide pages read, a copy script and a plan written, 81 steps), and an install's checks run three full times. A small install program and skipping the middle run are separate work.</li>
<li class="decision card" id="decision-44" data-note="decision-44" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what to do next → chose to finish the fixes, then &quot;if tests pass go and publish.&quot;</li>
<li class="decision card" id="decision-45" data-note="decision-45" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Archive checkpoint: archived for publishing as 31.4.0, on the owner's word to publish if the checks pass.</li>
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
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
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
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
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
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
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
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
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
    fit(d);
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
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
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
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
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
