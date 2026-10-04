# Install on your own computer with one Cloudflare account

**Status:** in-progress

**Branch:** electric-fox

**Open questions:** none for you. Three facts are checked before anything is built; if one fails, the build stops and comes back to you with options.

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
