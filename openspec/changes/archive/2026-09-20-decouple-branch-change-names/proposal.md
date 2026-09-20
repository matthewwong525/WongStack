# Decouple branch and OpenSpec change names

**Status:** ready-to-ship
**Branch:** clarify-branch-openspec-naming
**Open questions:** none

## Why

`/ship` stops when a feature branch and its OpenSpec change have different names, even when the change is present in the worktree. The same name rule also makes `/save` risk creating a second change instead of updating the one the user selected.

## What Changes

- Select the current change from explicit intent, then a unique changed OpenSpec folder in the worktree or branch diff. A different branch name is valid. Ask when multiple changes remain plausible. (review.html#/select/after/evidence)
- Let `/save` record the actual feature branch in the selected proposal so `/continue` can resume a saved change by name or PR after its files are committed. Keep the change name for its folder and note. (review.html#/resume/after/save)
- Let `/ship` validate and archive the selected change, then pass its exact archived path to `/save`. Update the repo rules and change loop to use this handoff.

**Non-goals:** Renaming existing branches or changes; merging unrelated changes from the same branch automatically.

## Capabilities

### New Capabilities

- `change-branch-association`: Resolve, save, and resume a change when its branch has a different name.

### Modified Capabilities

- `apply-plan-handoff`: An active change found in the current work takes priority over an unrelated sole active change.
- `ship-full-cycle`: A dirty or committed branch can ship its uniquely selected change regardless of name.

## Impact

The `/apply`, `/save`, `/continue`, `/ship`, and `/verify` skills; the change loop, repo conventions, note naming, OpenSpec config guidance, and payload release metadata.

## Decision log

- **2026-09-20** — Asked whether a unique OpenSpec change should ship when its name differs from the branch. The user chose yes. Use local and branch changes to select work, and persist the branch for cold resume after the working tree becomes clean.
- **2026-09-20** — Implemented the read-only changed-folder helper and updated the workflow skills and docs. Added fixture coverage for untracked, committed, and multiple changes; the OpenSpec and payload checks passed. `/save` records this change on feature branch `clarify-branch-openspec-naming`.
- **2026-09-20** — `/ship` confirmed all nine tasks complete, the default branch checks green, and each delta requirement equal to its main spec. Archived the change with `--skip-specs`; this `/save` checkpoints that archive on the existing feature branch before merge.
