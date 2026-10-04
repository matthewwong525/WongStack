---
name: ship
description: Ship a finished change: archive, save, pass CI or review, check the preview, squash-merge; runs /apply first if unfinished.
user-invocable: true
---

# /ship

Invoking `/ship` authorizes every step below without a prompt: archive, checkpoint, walk, merge, remote-branch deletion, sync, and [the pull-in](#the-pull-in-nothing-to-ship-yet) with any save a task needs. It never authorizes archiving unchecked tasks; [Step 2](#step-2--archive-the-change) finishes them. Confirm anything else (a force push, `--no-verify`, `git reset --hard`, `checkout .`) in [the shared ask format](../explore/references/asking-the-user.md).

[The change loop](../../../wiki/development/the-change-loop.md) owns the record, the pull-in, and [the gate](../../../wiki/development/the-change-loop.md#the-gate); PR review owns cleanliness, consolidation, and downstream breakage. `main` means [the default branch](../save/references/git-gate.md#the-default-branch).

## Step 1 — preflight

Check [preconditions](../save/references/preconditions.md); [Artifacts](../../../wiki/stack/artifacts-route.md#how-the-verbs-differ) differs. Otherwise:

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git status
git log origin/main..HEAD --oneline
gh api repos/:owner/:repo/commits/main/check-runs \
  --jq '[.check_runs[]] | map(.conclusion) | (if (index("failure") or index("cancelled")) then "failure" else "ok" end)'
```
- Default branch with uncommitted changes → [Step 2](#step-2--archive-the-change) in the same tree; Step 3's save cuts the feature branch.
- Clean default branch, or a clean tree 0 commits ahead → [the pull-in](#the-pull-in-nothing-to-ship-yet). A dirty feature branch with 0 commits is valid.
- Proceed only on `ok` default-branch CI, even with an intent. **Stop** on `failure` (fix it first) or `UNKNOWN` (an empty answer or failed `gh` call; report gh's message).
- Commit, push, PR, and checks wait for `/save`.

### The pull-in: nothing to ship yet

**Invoke the [`apply` skill](../apply/SKILL.md)**, saying it runs inside `/ship`: it returns with **no** preview upload or `/save`, and you go on to Step 2 in the same tree.

- **`/ship <intent>`** → pass the intent **verbatim**.
- **No argument** → invoke `/apply` bare when [its resolve order](../apply/SKILL.md#resolve-the-plan-first) lands before `sole-active`, or the session states clear intent with no change yet.
- **The cold stop.** Landing on `sole-active` or nothing → **say** there is nothing to continue and `/ship <intent>` starts a new change, then stop.

A feature branch with work runs the ordinary runbook, intent or not; `/ship` resolves nothing itself.

`/plan` pauses, tasks stay pending, or a task-driven `/save` fails or is unverifiable → report the blocker and stop before Step 2 ([no verb merges to stop](../../../wiki/development/the-change-loop.md)). A one-go run has **one** checkpoint: Step 3's.

**Work that changes no repo file** finishes in `/apply`: say so in one line and stop, with no git change.

## Step 2 — archive the change

Resolve `CHANGE_NAME`, separate from `BRANCH`, by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs) `explicit`, `session`, `changed-active`, then `recorded-branch`; `sole-active` never authorizes a cold merge. None selects → apply [`/save`'s route table](../save/SKILL.md#1-protect-credentials-and-select-the-route) to the branch diff. Code or a plan for code → author the change from the session and diff by [the new-plan fallback](../save/references/new-plan.md) and select it as `explicit`. Anything else needs no change: skip to Step 3 with no `CHANGE_NAME`.

**Several active change folders** in the branch diff or tree → stop before archive, even with an explicit selection: the merge would carry them all. Ask [as options](../explore/references/asking-the-user.md), naming them: move the others off the branch *(Recommended)*, or ship all on purpose. Require `openspec/changes/$CHANGE_NAME/`; keep `CHANGE_NAME` fixed through archive and checkpoint.

**Read `tasks.md` first.** Unchecked tasks (`- [ ]`) → invoke [`apply`](../apply/SKILL.md) for that change inside `/ship`, then re-read; still pending → report and stop.

[The CLI contract](../plan/references/openspec-cli.md#validate-and-archive) owns `--skip-specs`. Stop unless `openspec status --change "$CHANGE_NAME" --json` shows every schema artifact complete or deliberately skipped and `openspec validate "$CHANGE_NAME" --strict --no-interactive` passes. Then run `openspec archive "$CHANGE_NAME" --yes`, verify exactly one `openspec/changes/archive/*-$CHANGE_NAME/` exists, and keep its path.

## Step 3 — delegate the checkpoint to /save

First, number `CHANGELOG.md`'s `## Next (patch|minor|major) — <Title>` entry from `main`'s version, so two changes in flight never share one:

```bash
git fetch origin main
node "$(git rev-parse --show-toplevel)/.claude/skills/ship/scripts/number-release.mjs"
```

- `release=none` → nothing to number.
- `release=X.Y.Z from=A.B.C` → `VERSION` and the heading are written; they ride in this checkpoint.
- `behind=yes` → `git merge origin/main`, resolve `CHANGELOG.md` as the union of intent with this branch's entry on top, and rerun the script.
- Exit 1 → report its message and stop before `/save`.

**Invoke the `save` skill exactly once as ordinary `/save` and follow it verbatim**, with the exact `CHANGE_NAME` and archive path if any. Proceed only on `SUCCESS` or `NONE` (with no checks, invoking `/ship` is the approval). On `UNKNOWN`, `TIMEOUT`, or `FAILURE`, stop before merge and report `/save`'s reason; never repeat, bypass, or reinterpret the gate.

## Step 4 — verify the preview (evidence, not a gate)

**Invoke `verify` once with Step 3's exact checkpoint receipt.** It checks identity and reuses the gate without another save; fresh walkthrough evidence remains required. Never rerun for a better verdict. No `verify` skill → say so in one line and go on; never install it.

- `SUCCESS`, `NONE`, `UNKNOWN`, `TIMEOUT` → report it and merge.
- `FAILURE` after `/verify`'s own fixes → **stop and ask** [two options](../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks): fix it first *(Recommended)*, or *publish anyway* and record that the walk failed. Say in [plain words](../explore/references/asking-the-user.md#write-in-plain-words) what they would see not working on the preview.

If the walk's fixes advanced `HEAD`, confirm their `/save` result is `SUCCESS` or `NONE` and merge that commit.

## Step 5 — merge and sync

Run the merge script once; it merges exactly the gated commit:

```bash
bash "$(git rev-parse --show-toplevel)/.claude/skills/ship/scripts/merge.sh"
```

- **Exit 0** → merged; a skipped sync is one report line, never a failure.
- **Exit 1** → not merged, nothing deleted: report the error and stop, except the two cases below.
- **Exit 2** → merged, but a retarget or delete failed; the branch and its stacked PRs stay. Report it.

Both recover the same way: `git fetch origin main` → `git merge origin/main`, rerun the numbering script from [Step 3](#step-3--delegate-the-checkpoint-to-save), invoke ordinary `/save`, and rerun the merge script only on `SUCCESS` or `NONE`.

- **`stale_version=<version>`**: another release took this number.
- **A merge conflict**: merge, not rebase, unless asked; resolve each file as the **union of intent**. Never check out, switch, stash, reset, or force a branch to make the sync succeed, or delete a local branch.

### Promote the branch's secret edits

From the shipped worktree, promote deferred secret edits to the primary:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/ship/scripts/worktree-secrets.mjs" promote
```

It prints key names, never values, and skips and names a key the primary also changed; [the secrets convention](../../../wiki/development/secrets.md) owns the rest. An error is one report line, never a failed ship.

### Look at the live app

Once, after a merge; allow 12 minutes:

```bash
bash "$(git rev-parse --show-toplevel)/.claude/skills/ship/scripts/live-look.sh" "$(gh pr view <pr> --json mergeCommit --jq .mergeCommit.oid)"
```

`LIVE_LOOK=ok`/`unknown` → `REASON` as one report line. `failed` → say what is not working, then invoke [`apply`](../apply/SKILL.md) **once** with `REASON` and `URL` as the request; it ends at its preview and *publish it?*. No retry or revert.

## Step 6 — report

Lead with the outcome in [plain words](../explore/references/asking-the-user.md#write-in-plain-words): *it is live*, what changed for the person, the live link, then [the plan's link](../explore/references/asking-the-user.md#print-the-plans-link) to the archived `review.html`. Always add **Checks loosened**: each `Check:` bullet in the archived Decision log, one plain line; omit when none ([why](../../../wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason)). Only when asked, add `merge.sh`'s `key=value` lines and:

- **Archived** — the path, or one line that no change was needed.
- **Checkpoint** — `/save`'s result and CI outcome, auto-fix pushes included.
- **Walk** — verdict and evidence link; a merged-anyway `FAILURE` says the user chose it.
- **Secrets** — promoted, skipped, and unresolved key names, or why it was skipped.

Close with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step), whose options and order [next work](../plan/references/new-workspace.md#next-work) owns; after a stop, the ways to clear the blocker.
