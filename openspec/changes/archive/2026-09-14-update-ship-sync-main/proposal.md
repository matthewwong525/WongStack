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
- **Release ritual:** `VERSION` → 12.5.0 (minor), newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` passes.

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
- **2026-09-14** — implemented all 9 tasks. `.agents/skills/ship/SKILL.md` gained **Step 6 — sync the durable checkout** (fetch/prune, a `git worktree list --porcelain` scan for the checkout holding `main`, a clean-tree precondition, then `merge --ff-only origin/main` there or `git fetch origin main:main` when nothing has it out); the report moved to Step 7 with a **Synced** bullet; one hard rule and the skill description were added to match. Design revised the proposal mid-flight: the `PRIMARY_ROOT` resolution from the secrets convention was dropped because it answers *where the durable file lives*, not *which checkout holds a branch* — the worktree scan answers the real question and also covers a primary checkout parked on a third branch, which the worktree-or-not test gets wrong. `VERSION` 12.5.0, newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` reports no dead links.
- **2026-09-14** — archived for shipping. Delta specs were already folded into `openspec/specs/delivery-gate/spec.md` at the previous checkpoint and re-verified requirement-for-requirement and scenario-for-scenario before the move; the change is now at `openspec/changes/archive/2026-09-14-update-ship-sync-main/`, ahead of the delegated final checkpoint and the squash-merge. This is the first change carried end to end by the `/ship <intent>` chain that v12.4.0 added — explore's question round, plan, apply, the completion save, archive, this save, then the merge — so the chain and the step it adds are exercised in the same run.
