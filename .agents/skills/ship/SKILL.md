---
name: ship
description: Ship a finished change: archive, save, pass CI or review, check the preview, squash-merge; runs /apply first if unfinished.
user-invocable: true
---

# /ship

Invoking `/ship` authorizes every step below unprompted: archive, checkpoint, walk, merge, remote-branch deletion, sync, the pull-in with any save a task needs, and [safe picks](../../../wiki/development/the-change-loop.md#inside-ship). Confirm anything else (a force push, `--no-verify`, `git reset --hard`, `checkout .`) in [the shared ask format](../explore/references/asking-the-user.md).

[The change loop](../../../wiki/development/the-change-loop.md) owns the record, the pull-in, and [the gate](../../../wiki/development/the-change-loop.md#the-gate). `main` means [the default branch](../save/references/git-gate.md#the-default-branch).

Each command ends with a `NEXT:` line; follow it:

```bash
SHIP="$(git rev-parse --show-toplevel)/.claude/skills/ship/scripts/ship.mjs"
node "$SHIP" prepare --change "$CHANGE_NAME"
node "$SHIP" finish
```

## Step 1 — preflight

Attached review notes → [apply them to the existing change](../plan/SKILL.md#review-notes) first, then keep publishing.

Check [preconditions](../save/references/preconditions.md), then run `prepare`. Uncommitted changes on the default branch go on in the same tree; Step 3's save cuts the feature branch.

### The pull-in: nothing to ship yet

**Invoke the [`apply` skill](../apply/SKILL.md)**, saying it runs inside `/ship`, then go to Step 2 in the same tree.

- **`/ship <intent>`** → pass the intent **verbatim**.
- **No argument** → invoke `/apply` bare when [its resolve order](../apply/SKILL.md#resolve-the-plan-first) lands before `sole-active`, or the session states clear intent with no change yet.
- **The cold stop.** Landing on `sole-active` or nothing → **say** there is nothing to continue and `/ship <intent>` starts a new change, then stop: a cold `/ship` never publishes the only open plan.

`/plan` pauses, tasks stay pending, or a task-driven `/save` fails or is unverifiable → report the blocker and stop before Step 2: [no verb merges to stop](../../../wiki/development/the-change-loop.md).

**Work that changes no repo file** finishes in `/apply`: say so in one line and stop; no git change.

## Step 2 — archive the change

Run `node .claude/skills/explore/scripts/step-title.mjs set SHIP --task "<plan title>"`, again after each `apply` until `finish` merges, then `set DONE`. `CHANGE_NAME` is separate from `BRANCH`. Pass `--change` for a change the person or this chat named; without it `prepare` picks by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs). None selects → follow `NEXT:`; a new change comes from [the new-plan fallback](../save/references/new-plan.md).

`prepare` archives by [the CLI contract](../plan/references/openspec-cli.md#validate-and-archive), which owns `--skip-specs`, after two stops:

- **Other changes the branch adds** → rerun with `--move-others`; `--allow-others` only if the person asked to ship all.
- **Unchecked tasks** → invoke `apply` for that change inside `/ship`, then rerun; still pending → report and stop.

## Step 3 — delegate the checkpoint to /save

`prepare` numbers the `## Next` changelog entry, merging `main` first when behind, then reruns the local checks: allow 15 minutes. `NEXT:` carries any repair.

**Invoke the `save` skill once (plus one after Step 4's fix) as ordinary `/save` inside `/ship` and follow it verbatim**, with `prepare`'s `CHANGE` and `ARCHIVE` if any. Proceed only on `SUCCESS` or `NONE`. Any other result → stop before merge and report `/save`'s reason; never repeat, bypass, or reinterpret the gate.

## Step 4 — verify the preview (evidence, not a gate)

**Invoke `verify` once with Step 3's exact checkpoint receipt**, plus one with the fix's receipt, never for a better verdict. No `verify` skill → say so in one line and go on; never install it.

Any verdict but `FAILURE` → report it and merge. `FAILURE` after `/verify`'s own fixes → one fix: `apply` inside `/ship` with `ARCHIVE` and the failures, then `/save` as in Step 3, and `verify`. Still `FAILURE`, or the fix must stop → say what fails and **ask**: fix more *(Recommended)*, or *publish anyway*, recorded. If the walk's fixes, or its one `/save` of [kept checks](../verify/references/walkthrough.md#g--kept-checks), advanced `HEAD`, merge that commit only when that `/save` returns `SUCCESS` or `NONE`.

## Step 5 — merge and sync

Run `finish` once; allow 12 minutes. It merges the gated commit, promotes deferred [secret edits](../../../wiki/development/secrets.md), and looks at the live app. A skipped sync or a secrets error is one report line, never a failed ship. Not merged → report the error and stop, unless `NEXT:` gives a recovery; then `finish` again only on `SUCCESS` or `NONE`.

Merge, not rebase, unless asked. Never check out, switch, stash, reset, or force a branch to make the sync succeed, or delete a local branch.

### Look at the live app

`LIVE_LOOK=ok`/`unknown` → `REASON` as one report line. `failed` → say what fails, then invoke `apply` **once** with `REASON` and `URL` as the request; it ends at its preview and *publish it?*. No retry or revert.

## Step 6 — report

Lead with the outcome in plain words: *it is live*, what changed for the person, the live link, then [the plan's link](../explore/references/asking-the-user.md#print-the-plans-link) to the archived `review.html`. Always add **Checks loosened**, each `Check:` bullet in the archived Decision log, and **Choices I made**, each `Assumed` line this ship added and each `MOVED=` plan, one plain line each; omit when none. Only when asked, add `finish`'s and `/save`'s lines, the archive path, the walk's verdict and evidence (a merged-anyway `FAILURE` says the person chose it), and the secret key names.

Then end by [next work](../plan/references/new-workspace.md#next-work). A failed live look, or a `/ship` that `/close` invoked, does not close.
