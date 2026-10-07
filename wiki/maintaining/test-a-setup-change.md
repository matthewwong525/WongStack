# Test a setup change on a real install

A change to [`/wong-setup`](../../.agents/skills/wong-setup/SKILL.md) or its runbook is proven only by a real install: its fake-tool tests pass while Cloudflare answers differently. Run one throwaway install before publishing, then remove it. This page is part of [maintaining WongStack](README.md).

## What a check here already covers

[`check-target-app.mjs`](../../scripts/check-target-app.mjs) builds the app from only the files an install receives, set up as an install kept in Cloudflare, and runs its tests. It runs in CI when `app/` or [the payload inventory](../../.agents/skills/wong-sync/references/payload-files.json) changed, and in the local pre-check. It catches two faults WongStack's own copy hides:

- **A shipped test that needs a file that does not ship**, such as a sample app only this repository holds.
- **An app that stops compiling once the project's repository connection is set up**, because Cloudflare types that connection its own way.

It reaches nothing live. **Still needs a real install:** setup itself, [the check runner](../stack/artifacts-route.md#the-check-runner) and its restart, the preview's login wall, publishing, and anything Cloudflare answers.

## Install from the unpublished branch

Setup reads the source's default branch, so name the branch in the line you paste, in an empty folder:

```
Install WongStack from github.com/matthewwong525/WongStack, using its branch <branch> in place of the default branch. Read and follow https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/<branch>/.agents/skills/wong-setup/SKILL.md
```

The install record then names that branch, so the test install's later updates follow it. Keep the install throwaway: the branch is deleted when it publishes.

**Name the throwaway folder so it can not match a real install** in the same account: never `~/wongstack` on a machine that holds WongStack. Setup names the Worker, the database and the repository after the folder, and teardown deletes by that name.

## What to walk

Ask first: the install makes billable resources in a real Cloudflare account.

1. Setup, on a machine without the tool the change claims not to need. A machine that already has `gh` or Docker proves nothing about skipping them.
2. A save: the checks pass, and the preview turns a signed-out visitor away (`node scripts/probe-private-access.mjs --url <preview>`).
3. A deliberately failing test: it comes back failed, with no preview.
4. *Publish it?*, then the live site. Read the live page twice: for a few seconds after a deploy it can still serve the previous version.
5. A second change from the new `main`.
6. A teammate's Connect, **under a separate `HOME`**. A saved sign-in to the same Cloudflare login connects silently as the owner, and proves nothing about a teammate.
7. Each step an update runs alone, such as [`provision.mjs access`](../../.agents/skills/wong-setup/scripts/provision.mjs), against the real account, then `node scripts/cf-secrets.mjs check`. A step that stores a key in the live app but not the preview app passes its fake-Cloudflare tests and then fails [the parity check](../stack/staging-bindings.md#what-the-gate-can-and-cant-see) on every branch.

Run it once from this machine, fix what breaks, then have the owner run it by hand on a Mac. Their chat log is the best review of the install wording: read it for retries, steps written by hand, and anything the assistant had to work around.

## Remove it

Follow [teardown](../stack/getting-started.md#teardown), and [the Artifacts route's](../stack/artifacts-route.md#teardown) for an install with no GitHub. List by exact name first, delete, then read each back as gone and fetch both addresses for a 404. Delete the folder's `.env` with it: it holds a copy of the token.
