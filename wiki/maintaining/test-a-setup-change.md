# Test a setup change on a real install

A change to [`/wong-setup`](../../.agents/skills/wong-setup/SKILL.md) or its runbook is proven only by a real install: its fake-tool tests pass while Cloudflare answers differently. Run one throwaway install before publishing, then remove it. This page is part of [maintaining WongStack](README.md).

## Install from the unpublished branch

Setup reads the source's default branch, so name the branch in the line you paste, in an empty folder:

```
Install WongStack from github.com/matthewwong525/WongStack, using its branch <branch> in place of the default branch. Read and follow https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/<branch>/.agents/skills/wong-setup/SKILL.md
```

The install record then names that branch, so the test install's later updates follow it. Keep the install throwaway: the branch is deleted when it publishes.

## What to walk

Ask first: the install makes billable resources in a real Cloudflare account.

1. Setup, on a machine without the tool the change claims not to need. A machine that already has `gh` or Docker proves nothing about skipping them.
2. A save: the checks pass, and the preview turns a signed-out visitor away (`node scripts/probe-private-access.mjs --url <preview>`).
3. A deliberately failing test: it comes back failed, with no preview.
4. *Publish it?*, then the live site. Read the live page twice: for a few seconds after a deploy it can still serve the previous version.
5. A second change from the new `main`.

Run it once from this machine, fix what breaks, then have the owner run it by hand on a Mac. Their chat log is the best review of the install wording: read it for retries, steps written by hand, and anything the assistant had to work around.

## Remove it

Follow [teardown](../stack/getting-started.md#teardown), and [the Artifacts route's](../stack/artifacts-route.md#teardown) for an install with no GitHub. List by exact name first, delete, then read each back as gone and fetch both addresses for a 404. Delete the folder's `.env` with it: it holds a copy of the token.
