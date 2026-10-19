---
name: ship
description: Ship a finished change: archive, save, pass CI or review, check the preview, squash-merge; runs /apply first if unfinished.
user-invocable: true
---

# /ship

Invoking `/ship` authorizes every step below unprompted: archive, checkpoint, walk, merge, remote-branch deletion, sync, and the pull-in with any save a task needs. It never authorizes archiving unchecked tasks; Step 2 finishes them. Confirm anything else (a force push, `--no-verify`, `git reset --hard`, `checkout .`) in [the shared ask format](../explore/references/asking-the-user.md).

[The change loop](../../../wiki/development/the-change-loop.md) owns the record, the pull-in, and [the gate](../../../wiki/development/the-change-loop.md#the-gate); PR review owns cleanliness, consolidation, and downstream breakage. `main` means [the default branch](../save/references/git-gate.md#the-default-branch).

Each command ends with a `NEXT:` line; do what it says:

```bash
SHIP="$(git rev-parse --show-toplevel)/.claude/skills/ship/scripts/ship.mjs"
node "$SHIP" prepare --change "$CHANGE_NAME"
node "$SHIP" finish
```

## Scheduled records

A selected routine definition or finite goal follows [record-only delivery](../save/references/schedule-records.md) before code preflight. Use `prepare` and `finish` with `--schedule-record <reference>`; terminal goals use `prepare --archive-record <reference>`. Keep the normal checkpoint and gate. Ordinary ship leaves published operational records alone and rejects either kind selected as code.

## Step 1 — preflight

Attached review notes → [apply them to the existing change](../plan/SKILL.md#review-notes) first, then keep publishing.

Check [preconditions](../save/references/preconditions.md), then run `prepare`. Uncommitted changes on the default branch go on in the same tree; Step 3's save cuts the feature branch.

### The pull-in: nothing to ship yet

**Invoke the [`apply` skill](../apply/SKILL.md)**, saying it runs inside `/ship`, then go on to Step 2 in the same tree.

- **`/ship <intent>`** → pass the intent **verbatim**.
- **No argument** → invoke `/apply` bare when [its resolve order](../apply/SKILL.md#resolve-the-plan-first) lands before `sole-active`, or the session states clear intent with no change yet.
- **The cold stop.** Landing on `sole-active` or nothing → **say** there is nothing to continue and `/ship <intent>` starts a new change, then stop: a cold `/ship` never publishes the only open plan.

A feature branch with work runs the ordinary runbook, intent or not; `/ship` resolves nothing itself.

`/plan` pauses, tasks stay pending, or a task-driven `/save` fails or is unverifiable → report the blocker and stop before Step 2: [no verb merges to stop](../../../wiki/development/the-change-loop.md).

**Work that changes no repo file** finishes in `/apply`: say so in one line and stop, with no git change.

## Step 2 — archive the change

`CHANGE_NAME` is separate from `BRANCH`. Pass `--change` for a change the person or this chat named; without it `prepare` picks by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs). None selects → apply [`/save`'s route table](../save/SKILL.md#1-protect-credentials-and-select-the-route) to the branch diff: code or a plan for code gets a change by [the new-plan fallback](../save/references/new-plan.md), passed as `--change`; anything else passes `--no-change`.

`prepare` archives by [the CLI contract](../plan/references/openspec-cli.md#validate-and-archive), which owns `--skip-specs`, after two stops:

- **Several active change folders** → the merge would carry them all. Ask, naming them: move the others off the branch *(Recommended)*, or ship all on purpose.
- **Unchecked tasks** → invoke `apply` for that change inside `/ship`, then rerun; still pending → report and stop.

## Step 3 — delegate the checkpoint to /save

`prepare` numbers `CHANGELOG.md`'s `## Next` entry from `main`'s version, merging `main` in first when behind, so two changes in flight never share a number. After a merge it reruns the local checks, so allow 15 minutes; `NEXT:` carries any repair.

**Invoke the `save` skill exactly once as ordinary `/save` and follow it verbatim**, with `prepare`'s `CHANGE` and `ARCHIVE` if any. Proceed only on `SUCCESS` or `NONE`. Any other result → stop before merge and report `/save`'s reason; never repeat, bypass, or reinterpret the gate.

## Step 4 — verify the preview (evidence, not a gate)

**Invoke `verify` once with Step 3's exact checkpoint receipt**, never again for a better verdict. No `verify` skill → say so in one line and go on; never install it.

Any verdict but `FAILURE` → report it and merge. `FAILURE` after `/verify`'s own fixes → **stop and ask** [two options](../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks): fix it first *(Recommended)*, or *publish anyway* and record that the walk failed. Say plainly what fails on the preview. If the walk's fixes, or its one `/save` of [kept checks](../verify/references/walkthrough.md#g--kept-checks), advanced `HEAD`, merge that commit only when that `/save` result is `SUCCESS` or `NONE`.

## Step 5 — merge and sync

Run `finish` once; allow 12 minutes. It merges exactly the gated commit, promotes the branch's deferred [secret edits](../../../wiki/development/secrets.md) to the primary, and looks at the live app. A skipped sync or a secrets error is one report line, never a failed ship. Not merged → report the error and stop, unless `NEXT:` gives a recovery; then `finish` again only on `SUCCESS` or `NONE`.

Merge, not rebase, unless asked. Never check out, switch, stash, reset, or force a branch to make the sync succeed, or delete a local branch.

### Look at the live app

`LIVE_LOOK=ok`/`unknown` → `REASON` as one report line. `failed` → say what is not working, then invoke `apply` **once** with `REASON` and `URL` as the request; it ends at its preview and *publish it?*. No retry or revert.

## Step 6 — report

Lead with the outcome in plain words: *it is live*, what changed for the person, the live link, then [the plan's link](../explore/references/asking-the-user.md#print-the-plans-link) to the archived `review.html`. Always add **Checks loosened**: each `Check:` bullet in the archived Decision log, one plain line; omit when none. Only when asked, add `finish`'s `key=value` lines, the archive path or that no change was needed, `/save`'s result with its CI outcome and auto-fix pushes, the walk's verdict and evidence link (a merged-anyway `FAILURE` says the user chose it), and the secret key names promoted, skipped, or unresolved.

Ask [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step) with the question tool; [next work](../plan/references/new-workspace.md#next-work) owns its options and order.
