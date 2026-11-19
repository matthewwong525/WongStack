<!-- openspec-archive v1 2026-09-14-update-ship-sync-main -->
<!-- file proposal.md utf8 6030 -->
# Leave the durable checkout in sync after a ship

**Status:** ready-to-ship
**Open questions:** none

## Why

`/ship` ends at the remote-branch delete, so every local checkout is left behind the commit it just merged. Work happens in throwaway worktrees, so the checkout that survives the session — the primary one — is the one that goes stale, and the next session starts by noticing `main` is behind and pulling by hand. The merge already told us the exact ref that moved; advancing it is one command and no judgment.

## What Changes

- **`/ship` gains a post-merge sync step**, between the merge and the report. It brings the default branch up to the just-merged commit and prunes the remote-tracking refs the branch delete made stale.
- **Two shapes, one intent, and neither switches a branch.** The step asks which checkout has `main` out. Some checkout does — the primary one, in a worktree session — so it fast-forwards `main` there. None does, as in a plain checkout sitting on the feature branch, so `git fetch origin main:main` advances the local ref in place. Nothing is ever checked out, switched, stashed, or reset.
- **Fast-forward only; an obstacle skips, never fails.** A dirty primary checkout, a primary checkout on another branch, or a diverged `main` leaves that checkout untouched. The ship has already merged, so the step reports why in one line and the run still succeeds.
- **The report names the result** — synced, or skipped with the reason.
- **Release ritual:** `VERSION` → 12.6.0 (minor), newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` passes.

**Non-goals:** no local branch is deleted (the `[gone]` backlog is a separate cleanup); no checkout, switch, stash, reset, or force of any kind; no change to `/save`, `/verify`, or the gate ladder; no new file in the payload manifest.

## Capabilities

### New Capabilities

- none.

### Modified Capabilities

- `delivery-gate`: adds the requirement that a completed `/ship` leaves the durable checkout's default branch at the merged commit, and that this sync can never fail the ship.

## Impact

- **Edited:** `.claude/skills/ship/SKILL.md` (a new step plus its report line and hard rule), `VERSION`, `CHANGELOG.md`.
- **Untouched:** `/save`, `/verify`, every `openspec-*` skill, the payload manifest (no new files).
- **Downstream repos:** the next `/wong-sync` proposes the `/ship` edit as an ordinary payload update. A target repo with no linked worktree gets the plain-checkout branch of the same step.
- **Risk:** the step writes to a checkout outside the active worktree — the one place `/ship` does. `--ff-only`, no checkout, and the skip-on-obstacle rule bound it: the worst outcome is that nothing moves and the report says so.

## Decision log

- **2026-09-14** — asked what a plain single checkout should do → chose fast-forward the local `main` ref too, with `git fetch origin main:main`, so the step has one intent in both shapes and still never switches the branch you are on. Ruled out checking out `main`, which changes where the user is standing after a ship. Asked what happens when the primary checkout cannot fast-forward → chose skip and report one line, because another session or worktree may be working in it and the merge has already succeeded; ruled out prompting (turns a finished ship into another question) and forcing (can clobber concurrent work). Asked about stale-ref cleanup → chose `--prune` of remote-tracking refs only; ruled out deleting merged local branches as wider than the request.
- **2026-09-14** — implemented all 9 tasks. `.agents/skills/ship/SKILL.md` gained **Step 6 — sync the durable checkout** (fetch/prune, a `git worktree list --porcelain` scan for the checkout holding `main`, a clean-tree precondition, then `merge --ff-only origin/main` there or `git fetch origin main:main` when nothing has it out); the report moved to Step 7 with a **Synced** bullet; one hard rule and the skill description were added to match. Design revised the proposal mid-flight: the `PRIMARY_ROOT` resolution from the secrets convention was dropped because it answers *where the durable file lives*, not *which checkout holds a branch* — the worktree scan answers the real question and also covers a primary checkout parked on a third branch, which the worktree-or-not test gets wrong. `VERSION` 12.6.0, newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` reports no dead links.
- **2026-09-14** — archived for shipping. Delta specs were already folded into `openspec/specs/delivery-gate/spec.md` at the previous checkpoint and re-verified requirement-for-requirement and scenario-for-scenario before the move; the change is now at `openspec/changes/archive/2026-09-14-update-ship-sync-main/`, ahead of the delegated final checkpoint and the squash-merge. This is the first change carried end to end by the `/ship <intent>` chain that v12.4.0 added — explore's question round, plan, apply, the completion save, archive, this save, then the merge — so the chain and the step it adds are exercised in the same run.
- **2026-09-14** — version collision at merge time. A sibling worktree shipped `hide-openspec-skills` as **12.5.0** (#75) while this change was in flight, so both branches claimed the same version and `CHANGELOG.md` conflicted. Resolved as the union of intent: this change becomes **12.6.0** and its entry sits above 12.5.0, newest-first; nothing was dropped from either entry. The merge also exposed a real gap in `/ship` Step 5 — piping `gh pr merge --squash` through `tail` masked its non-zero exit, so the branch delete ran after a failed merge and GitHub closed pull request #76. Recovered by re-pushing the branch and reopening the pull request; no commit was lost. The runbook's existing rule covers deleting a branch another PR is *based on*, not deleting the head branch of the PR being merged, and it does not say the merge's exit status must be checked before the delete. Both are worth a follow-up change.

<!-- end proposal.md -->
<!-- file design.md utf8 4674 -->
## Context

See [proposal.md](proposal.md) — Why. The constraint that shapes the whole design: the step runs **after** the merge, so it can never be a gate, and it writes to a checkout that another session may be standing in.

`/ship` Step 5 already ends with `git push origin --delete "$BRANCH"`. That leaves three refs stale everywhere: `origin/<branch>` (now `[gone]`), `origin/main` (behind the squash), and the local `main` of whatever checkout owns it. All three are fixed by the same short block.

## Goals / Non-Goals

**Goals:**

- One block, no branching on "am I in a worktree" — the question that actually decides the command is *which checkout has the default branch*.
- Offline after one fetch: worktrees share the object store and the ref namespace, so a single `git fetch` in the active worktree already updates `origin/main` for every sibling.
- Every failure mode is a one-line report, never a stop.

**Non-Goals:**

- Cleaning up the `[gone]` local branches. `git branch -vv` in this repo lists dozens; pruning them is its own change with its own safety question.
- Any behavior when the ship stops early. A run that never merged has nothing to sync.

## Decisions

**Scan the worktrees instead of testing for one.** The naive shape is `if in a worktree → primary root, else → local ref`. It gets the common case right and the interesting case wrong: a primary checkout sitting on some *other* feature branch is neither, and the naive shape would either skip it or try to fast-forward a branch that is not checked out there. Ask the question that determines the command instead:

```bash
git fetch origin --prune                  # refresh origin/main; drop the deleted branch's ref
MAIN_WT=$(git worktree list --porcelain \
  | awk '/^worktree /{p=$2} /^branch refs\/heads\/main$/{print p}')
```

- `$MAIN_WT` set → some checkout has `main` out; fast-forward it there.
- `$MAIN_WT` empty → nothing has it; advance the ref in place with `git fetch origin main:main`.

A plain single checkout on a feature branch takes the second path, and a linked-worktree session with a clean primary takes the first — the two shapes the proposal names, without either being special-cased. `git worktree list` prints one entry in a plain checkout, so the scan costs nothing there.

**Require a clean tree before touching another checkout.** `git merge --ff-only` aborts only when it would *clobber* a local change; unrelated modified files fast-forward right underneath whoever is editing them. That is exactly the surprise this step must not cause, so gate on `git -C "$MAIN_WT" status --porcelain` being empty and skip otherwise. The cost is skipping some syncs that would have been harmless; the alternative is moving files under a concurrent session.

**`merge --ff-only origin/main`, not `pull`.** The fetch already happened, the refs are shared, and `pull` in another worktree would open a second network round trip and could merge rather than fast-forward. Alternatives ruled out: `git pull --ff-only` (redundant fetch), `git update-ref` (skips the working-tree update entirely — the ref would move while the files did not).

**No `PRIMARY_ROOT` resolution.** [The secrets convention](../../../wiki/development/secrets.md) resolves the primary worktree from Git's common directory because it needs *the durable file location*. This step needs *the checkout holding a branch*, which `git worktree list` answers directly and more precisely. Naming the convention and then not using its snippet would be the confusing outcome; the proposal's reference to it is dropped in favor of the scan.

**Placement: a new Step 6, report becomes Step 7.** It has to follow the branch delete (that is what makes the prune meaningful) and precede the report (which names its outcome).

## Risks / Trade-offs

- **The step writes outside the active worktree — the only place `/ship` does.** → Fast-forward only, clean-tree precondition, no checkout/switch/stash/reset, no local-branch deletion. The worst case is that nothing moves.
- **A concurrent session commits to the primary `main` between the merge and the fetch, so the fast-forward is refused.** → Reported as a skip; the next `git pull` there resolves it. This is the pre-existing status quo, not a regression.
- **`awk` on `git worktree list --porcelain`.** → The porcelain format is a stability contract, unlike the human-readable form the old `git worktree list` output would need parsing from.
- **Repos whose default branch is not `main`.** → The runbook's existing "`main` stands for the repo's default branch — assume it" note already covers every command in the file, including these.

<!-- end design.md -->
<!-- file tasks.md utf8 1277 -->
## 1. The ship runbook

- [x] 1.1 Add **Step 6 — sync the durable checkout** to `.claude/skills/ship/SKILL.md`, after the merge step and before the report, carrying the fetch/prune, the `git worktree list --porcelain` scan, the clean-tree precondition, the `merge --ff-only origin/main` branch and the `git fetch origin main:main` branch, per design.md — Decisions.
- [x] 1.2 State in that step that any obstacle skips with a one-line reason and never fails the ship, and that nothing is checked out, switched, stashed, reset, or deleted.
- [x] 1.3 Renumber the report step to **Step 7** and add its **Synced** bullet — the checkout that advanced, or the reason it was skipped.
- [x] 1.4 Add the matching hard rule: the post-merge sync is fast-forward only, never a gate, and never deletes a local branch.
- [x] 1.5 Update the `/ship` description in the skill frontmatter so it names the post-merge sync.
- [x] 1.6 Re-read the whole edited runbook for coherence — no step number, cross-reference, or "Step N" mention left pointing at the old numbering.

## 2. Release ritual

- [x] 2.1 Bump `VERSION` to `12.6.0`.
- [x] 2.2 Add the newest-first `CHANGELOG.md` entry for 12.6.0.
- [x] 2.3 Run `node scripts/check-payload-links.mjs` and confirm it reports no dead links.

<!-- end tasks.md -->
<!-- file specs/delivery-gate/spec.md utf8 2696 -->
## ADDED Requirements

### Requirement: Ship leaves the durable checkout in sync

After the merge and the remote-branch delete, and before the report, `/ship` SHALL bring the default branch of the durable checkout up to the commit it just merged, and SHALL prune the remote-tracking refs the branch delete made stale.

The durable checkout is the primary worktree. When `/ship` runs from a linked worktree, it SHALL resolve the primary worktree from Git's common directory — the same resolution the secrets convention already defines — and fast-forward the default branch there. When `/ship` runs from a plain checkout, where the default branch is checked out nowhere, it SHALL advance the local default-branch ref in place by fetching the remote branch into it.

The sync SHALL be fast-forward only. `/ship` SHALL NOT check out, switch, stash, reset, or force any branch in any checkout, and SHALL NOT delete a local branch.

The sync SHALL NOT be able to fail the ship. When the default branch cannot be fast-forwarded — the target checkout is dirty, it has another branch checked out, or its default branch has diverged — `/ship` SHALL leave that checkout untouched, report the reason in one line, and still report the ship as successful. The merge has already happened, so nothing after it is a gate.

The ship report SHALL name the outcome of the sync: the checkout that advanced, or the reason it was skipped.

#### Scenario: Shipping from a linked worktree

- **WHEN** `/ship` merges from a linked worktree and the primary worktree is clean and on the default branch
- **THEN** the primary worktree's default branch is fast-forwarded to the merged commit
- **AND** the current worktree's branch is unchanged and no branch is checked out or switched anywhere

#### Scenario: Shipping from a plain checkout

- **WHEN** `/ship` merges from a checkout that has no linked worktree, with the feature branch still checked out
- **THEN** the local default-branch ref is advanced to the merged commit without switching branches
- **AND** the user is still standing on the same branch after the ship

#### Scenario: The target checkout cannot fast-forward

- **WHEN** the checkout that owns the default branch is dirty, has another branch checked out, or its default branch has diverged
- **THEN** that checkout is left untouched, with no stash, reset, or force
- **AND** `/ship` reports the skip and its reason in one line and still reports the ship as successful

#### Scenario: Stale remote-tracking refs are pruned

- **WHEN** `/ship` has deleted the merged branch from the remote
- **THEN** the remote-tracking refs the delete made stale are pruned
- **AND** no local branch is deleted

<!-- end specs/delivery-gate/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-14

~~~
<!-- end .openspec.yaml -->
