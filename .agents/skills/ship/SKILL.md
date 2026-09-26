---
name: ship
description: Ship a completed change through archive, /save checkpoint, CI or PR review, preview evidence, and squash merge. If the change is unfinished, invoke /apply first; /apply can invoke /plan and /explore. Use when you want work shipped, merged, and archived.
user-invocable: true
---

# /ship

Ship runbook. Every action it authorizes is taken without a prompt; a question it does have to ask uses [the shared ask format](../explore/references/asking-the-user.md). Invoking it authorizes the archive of a **complete** change, the delegated `/save` checkpoint, the walk, the merge, the remote-branch deletion, and the post-merge sync below — don't re-prompt. It also authorizes the [pulled-in stage](#the-pull-in-nothing-to-ship-yet) — explore, plan, implement, and their saves — with or without an intent and with no re-prompt between stages. It does **not** authorize archiving a change with unchecked tasks: that confirmation is the user's, and [Step 2](#step-2--archive-the-change-opsxarchive) removes the need to ask it. Confirm anything outside this runbook (force push, hard reset).

`/ship` is the **archive + merge** step of the loop (`/explore → /plan → /apply → /save → /continue → /ship`): it archives the active change, invokes ordinary `/save` exactly once so the archive and code receive one pushed PR/CI checkpoint, walks the preview for evidence, then squash-merges that exact commit. **The archived change is the record of what shipped** — no GitHub summary issue. The one automatic docs step is [distilling the change's facts](#distill-the-changes-facts-into-the-wiki) into the wiki, reviewed in the same PR.

The merge rides the [gate ladder](../../../wiki/development/the-change-loop.md#the-gate) and nothing else: merge only on `/save`'s `SUCCESS` or `NONE`, and a rung the repo lacks is skipped, never failed. `/ship` is the merge, not the review — cleanliness, consolidation, and downstream breakage belong in PR review.

> `main` stands for the repo's default branch — **assume it**. Every repo `/wong-setup` creates is on `main`, and `git symbolic-ref refs/remotes/origin/HEAD` fails on a freshly created one. Only where `main` doesn't exist, resolve the real name with `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` and substitute it.

Read the helper fields and root/base options in [the evidence contract](../save/references/checkpoint-evidence.md) only when using structured evidence. `active`, `archive`, `recorded`, and `legacy` are evidence; retain the selection order below. Inspection errors stop selection.

## Step 1 — preflight

```bash
git rev-parse --abbrev-ref HEAD
git status
git log origin/main..HEAD --oneline
# the default branch's own CI must be green before we add to it:
gh api repos/:owner/:repo/commits/main/check-runs \
  --jq '[.check_runs[]] | map(.conclusion) | (if (index("failure") or index("cancelled")) then "failure" else "ok" end)'
```
- On the default branch → nothing to ship yet; go to [the pull-in](#the-pull-in-nothing-to-ship-yet) (`/ship` runs on a feature branch).
- Clean tree and 0 commits ahead → nothing to ship yet; go to [the pull-in](#the-pull-in-nothing-to-ship-yet). A dirty feature branch with 0 commits is valid: the delegated `/save` below will create its first commit.
- Default branch's CI is `failure` → **stop**; fix it first (`ok`/empty = proceed). An intent does **not** override this one.
- Record `BRANCH=$(git rev-parse --abbrev-ref HEAD)`. Do not commit, push, open a PR, or wait on branch checks here — those are `/save`'s single checkpoint after the archive move.

### The pull-in: nothing to ship yet

**When either stop condition above holds** — on the default branch, or a clean tree with 0 commits ahead — there is nothing to ship *yet*, so make it: **invoke the [`apply` skill](../apply/SKILL.md)**, then **re-run this preflight** on the branch `/save` created and continue to Step 2. Two forms:

- **An intent was given** (`/ship <intent>`) → invoke `/apply` with the argument **verbatim**.
- **No argument** → invoke `/apply` **with no argument**, when [`/apply`'s resolve order](../apply/SKILL.md#resolve-the-plan-first) lands on a change you named, a change created or discussed in this session, or a change evidenced by this branch's files, recorded Branch line, or legacy name — or on its separate branch for a session that states clear implementation intent with no change yet.

**The cold stop.** Where that resolution would instead fall through to item 4 — a sole active change the conversation does not establish — or resolve nothing at all, **stop**, and **say so**: report that you found nothing to continue and that `/ship <intent>` starts a new one. A stray `openspec list` entry never starts a merge. Never do nothing silently.

`/ship` resolves nothing itself. The test above is one question — *which item of `/apply`'s written order applies?* — not a second resolver, and it never overrides that order. `/apply` resolves the work under its own rules, invokes [`/plan`](../plan/SKILL.md) — and therefore [`/explore`](../explore/SKILL.md)'s question round — when no apply-ready change exists, works the tasks, and hands completion to `/save`. `/ship` adds no planning, implementation, or git behavior of its own.

This is the loop's one rule, applied one verb further out: **when a verb's precondition is missing, it invokes the verb before it to produce it** — `/ship` → `/apply` → `/plan` → `/explore`. [The change loop](../../../wiki/development/the-change-loop.md) owns the rule.

- **A bare `/ship` finishes the thread you are on**, and stops cold when there is no thread. Those are the same rule, not an exception to it: `/ship` merges what this session established, never what it found lying around.
- **A feature branch that already has work** (commits ahead or a dirty tree) runs the ordinary runbook; the pull-in doesn't fire, whether or not an intent was given. An unfinished change on that branch is [Step 2's guard](#step-2--archive-the-change-opsxarchive), not this one.

**Never merge as a way of stopping.** If `/plan` pauses on unclear intent, `/apply` ends with tasks pending, or any `/save` inside the chain returns a failing or unverifiable result, **report that blocker and stop before Step 2**. Do not archive, checkpoint, or merge a partial change. The chain either reaches a complete implementation or it reports why it didn't.

## Step 2 — archive the change (/opsx:archive)

Keep `BRANCH` from Step 1 and resolve a separate `CHANGE_NAME`. Prefer an existing change named by the user or selected in this session. Otherwise run `bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/change-candidates.sh" --json`: one changed active folder selects that change, whether or not its name matches `BRANCH`. If none, use a unique active proposal whose `**Branch:**` equals `BRANCH`, then a legacy active folder named `BRANCH`. If none resolves, stop and report that this branch has no identifiable change record; `/save` can author one. A sole unrelated `openspec list` entry never authorizes a cold merge.

If the branch diff or working tree contains **more than one active change folder**, stop before archive even when one was explicitly selected: the merge would carry the other too. Name the folders and ask the user to separate or intentionally reconcile that work, [as options](../explore/references/asking-the-user.md) — ship the selected change alone by moving the other out of the branch *(Recommended)*, or ship both together on purpose. Require `openspec/changes/$CHANGE_NAME/` to exist before proceeding. Keep `CHANGE_NAME` fixed through archive and checkpoint.

**Then read its `tasks.md` before you archive anything.** Unchecked tasks (`- [ ]`) mean the change is not finished, so **finish it**: invoke the [`apply` skill](../apply/SKILL.md) for that exact change name, let it work the list and hand completion to `/save`, then re-read the file. Archive only when every task is checked.

An incomplete change is never archived. The archive step itself warns and **asks you to confirm** — a question this runbook's standing authorization would otherwise answer on your behalf, which is how a change at 7 of 20 tasks used to reach a squash-merge with nobody deciding to. The guard removes the condition rather than the question. If `/apply` ends with tasks still pending, report that work and stop here — the [never merge as a way of stopping](#hard-rules) rule, at the second place it applies.

Follow the shared [CLI contract](../plan/references/openspec-cli.md). Read `openspec status --change "$CHANGE_NAME" --json` and require its schema-defined artifacts to be complete or deliberately skipped. Run `openspec validate "$CHANGE_NAME" --strict --no-interactive`; stop on failure. Read `openspec instructions archive --change "$CHANGE_NAME" --json` for any applicable context. Run `openspec archive "$CHANGE_NAME" --yes` only after the task check, validation, and the distillation below. If the deltas were already synced by `/save` and equality is confirmed, `--skip-specs` avoids a second main-spec edit; otherwise the CLI archives and syncs them. Capture the archive path and verify exactly one `openspec/changes/archive/*-$CHANGE_NAME/` exists. Do **not** commit the move here.

### Distill the change's facts into the wiki

Before the archive, read the change's live facts:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" show "$CHANGE_NAME"
```

Keep only **reusable process facts** — a convention or pitfall that applies to future work, not this change's specifics. Edit the wiki page that owns each one, under [the wiki rules](../../rules/wiki.md): extend the owner, link, never restate. Append one Decision-log line naming the pages changed, or `no reusable fact`. When the store does not answer, log that the step was skipped and continue. The edits ride in the archive checkpoint below, so a person reviews them in this PR. No other step writes the wiki automatically.

## Step 3 — delegate the checkpoint to /save

**Invoke the `save` skill exactly once as ordinary `/save` and follow it verbatim.** Hand it the exact `CHANGE_NAME` and archive path selected above. It redacts named session secrets, captures the note, stages the implementation plus archive move, commits, pushes, regenerates the PR body from that archive, and waits/auto-fixes CI. It never recreates an active change, and `/ship` implements none of that itself.

Consume its exact final result:

- `SUCCESS` → proceed. `NONE` → proceed; invoking `/ship` is the PR-review approval where no checks exist.
- `UNKNOWN`, `TIMEOUT`, or `FAILURE` → stop before merge and report `/save`'s reason. Do not repeat, bypass, or reinterpret the gate.

## Step 4 — verify the preview (evidence, not a gate)

**If this repo has the `verify` skill, invoke it once** and follow it verbatim. It scouts first, so a change with nothing any probe can reach costs nothing; when there are journeys it drives them against the commit `/save` just published and posts the evidence to the PR.

**No `verify` skill** (a repo that hasn't synced since the verb landed) → say so in one line and go to Step 5. A rung the repo lacks is skipped, never failed — and never installed to repair it.

- `SUCCESS`, `NONE`, `UNKNOWN`, `TIMEOUT` → report it and continue to the merge.
- `FAILURE`, after `/verify`'s own two fix attempts → **stop and ask the user** as [a two-option question](../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks): fix the failure first *(Recommended)*, or merge anyway and record that the walk failed.

**The verdict is not a rung.** An unrunnable walk never blocks a merge — the property whose absence made the old walk-*gate* worth removing. A `FAILURE` pause is a decision surfaced to the user, not a gate applied to them: *merge anyway* is a first-class answer, and the report records that it was taken.

If the walk's fix loop advanced `HEAD`, its own delegated `/save` already re-gated the new commit — confirm that result is `SUCCESS` or `NONE`, and merge that commit.

## Step 5 — merge (worktree-safe)

Merge via the API, then delete the **remote** branch explicitly. **Never `gh pr merge --delete-branch`** — it switches the local checkout to delete the local branch, which fails in a worktree where the default branch is checked out elsewhere.
```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
gh pr merge --squash
# Retarget anything stacked on this branch BEFORE deleting it (see below):
for n in $(gh pr list --state open --base "$BRANCH" --json number --jq '.[].number'); do
  gh api -X PATCH "repos/:owner/:repo/pulls/$n" -f base=main --jq '.number'
done
git push origin --delete "$BRANCH"
```
The squash carries the archived change onto the default branch.

**Retarget before you delete, always.** Deleting a branch that an open PR still uses as its base **closes that PR**, and the loss is unrecoverable: GitHub will not reopen a PR whose base branch is gone, nor retarget a closed one. Do not rely on GitHub's own auto-retarget — the delete races it, and the race has no completion signal to wait on. Name every PR you retargeted in the report.

On **conflict**: `git fetch origin main` → `git merge origin/main` (merge, not rebase, unless asked); resolve each file as the **union of intent**, then invoke ordinary `/save` again so the changed merge commit receives the same checkpoint and gate. Retry the merge only on its `SUCCESS` or `NONE`. Other failure (branch protection, draft) → surface the exact `gh` error.

## Step 6 — sync the durable checkout

The merge moved `main` on the remote, and the delete made `origin/$BRANCH` stale. Bring the checkout that owns `main` up to the commit you just merged:

```bash
git fetch origin --prune                  # refresh origin/main; drop the deleted branch's ref
MAIN_WT=$(git worktree list --porcelain \
  | awk '/^worktree /{p=$2} /^branch refs\/heads\/main$/{print p}')

if [ -n "$MAIN_WT" ]; then
  # some checkout has main out — fast-forward it there, but only if it is clean
  [ -z "$(git -C "$MAIN_WT" status --porcelain)" ] && git -C "$MAIN_WT" merge --ff-only origin/main
else
  # nothing has main out — advance the ref in place, without switching branches
  git fetch origin main:main
fi
```

Ask **which checkout has `main` out**, not whether you are in a worktree — a primary checkout parked on some other branch is neither shape. Worktrees share the object store, so the one `git fetch` above already refreshed `origin/main` for every sibling; the merge needs no network.

**Any obstacle skips, and the skip is one line.** A dirty target checkout, a diverged `main`, a `merge --ff-only` that refuses — leave that checkout alone and say why in the report. The pull request is already merged, so **nothing after Step 5 can fail the ship**. Never check out, switch, stash, reset, or force a branch to make the sync succeed, and never delete a local branch.

### Promote the branch's secret edits

A linked worktree keeps its own copy of each live secrets file. The branch wrote its adds and rotations to the primary already; its deletions and branch-only values waited for this merge. Apply them now, from the worktree you shipped:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/ship/scripts/worktree-secrets.mjs" promote
```

It compares the worktree copy, the primary, and the baseline recorded at seed. It changes only the keys this branch changed, skips and names a key the primary also changed, and prints key names, never values. In the primary checkout it does nothing. The [secrets convention](../../../wiki/development/secrets.md) owns the lifecycle. The same skip rule applies: any error is one line in the report, and it cannot fail the ship.

## Step 7 — report

- PR number + URL, **merged (squash)** to the default branch.
- **Archived** — the change is now at `openspec/changes/archive/YYYY-MM-DD-<name>/` on the default branch (`openspec list` no longer shows it; `openspec/specs/` holds the synced result).
- **Checkpoint** — `/save` result and CI outcome, including auto-fix pushes.
- **Walk** — the verdict, the evidence comment link, and — when a `FAILURE` was merged anyway — that the user chose to. Where the skill was absent, one line saying so.
- **Retargeted** — any pull request moved to the default branch before the branch was deleted.
- **Synced** — the checkout whose `main` advanced to the merged commit, or the one-line reason the sync was skipped.
- **Secrets** — the promoted, skipped, and unresolved key names from the promote, never a value, or the one-line reason it was skipped.

Close with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): the work the merge makes possible — normally start the next change, walk the merged app, or stop here. A ship that stopped before the merge closes with the supported ways to clear the blocker instead.

## Hard rules
- Never ship onto a red default branch (when it has checks). **Never merge on an `UNKNOWN` check result** — unverified is not the same as no checks. Never `--force`/`--no-verify`. Never `git reset --hard` / `checkout .` without confirmation. **Never build or test locally** — CI is the gate when present, else PR review; the app's own suite runs there as an ordinary check.
- **Never implement checkpoint mechanics.** Archive first, then delegate once to ordinary `/save`; merge only on its `SUCCESS` or `NONE` result.
- **Never merge as a way of stopping.** A pulled-in `/plan` that pauses, an `/apply` that ends with tasks pending, or a chain `/save` that comes back failing or unverifiable stops `/ship` before the archive. A partial change is never archived, checkpointed, or merged. The two checkpoints of a one-go run — `/apply`'s completion save and this runbook's archive save — both stand; never collapse them.
- **Never archive a change with unchecked tasks.** Finish it through `/apply` first. This runbook's authorization covers the archive of a complete change and nothing else — never treat it as the answer to the archive step's incomplete-task confirmation.
- **A bare `/ship` continues this session's thread, and stops cold when there isn't one.** A sole active change the conversation does not establish never starts a merge, and a stop is always reported rather than silent.
- **The walk informs, never blocks.** Run it once, report every verdict, and let no verdict but a user-answered `FAILURE` change what happens next. Never skip it to save time, and never re-run it hunting a greener result.
- **Merge worktree-safely:** `gh pr merge --squash` then `git push origin --delete`, never `--delete-branch`.
- **Never delete a branch another open PR is based on.** Retarget dependents to the default branch first; a closed-by-deletion PR cannot be recovered.
- **The post-merge sync is fast-forward only, and never a gate.** It touches one other checkout, so it requires a clean tree there and skips with a reason on any obstacle. It deletes no local branch, and it cannot fail a ship that has already merged. The secrets promote follows the same rule, and runs only after a successful merge.
- No GitHub summary issue. The only automatic wiki edit is the distillation of this change's facts before the archive; every other wiki update is explicit work.
