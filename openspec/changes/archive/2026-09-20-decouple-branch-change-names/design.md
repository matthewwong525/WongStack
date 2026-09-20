## Context

The current skills use one slug as branch, change, and note name. A branch can now carry a plan whose OpenSpec folder has another name. Working-tree status alone loses the association after `/save` commits it. Existing saved changes have no branch field.

## Goals / Non-Goals

**Goals:** Select one change on the current branch without a name match; preserve that association across saves, cold resume, and archive; reject ambiguous or mixed handoffs.

**Non-Goals:** A registry outside the change, automatic branch renames, or a new runtime dependency.

## Decisions

1. **Use one resolution order in each workflow.** An explicit user change or current-session selected change comes first. Then inspect active change folders added or modified in the working tree, index, and branch diff against the default branch. A unique folder is evidence; multiple folders require clarification. When none changed, use a proposal's saved `**Branch:**` value, then the legacy same-name convention. A sole unrelated active change is not evidence for a cold `/ship`. A small shell helper reports changed folder candidates for the skills; it does not decide intent, write files, or invoke OpenSpec. The branch diff includes committed work, while status includes untracked plans. This adds no new executable dependency.
2. **Persist the branch in the proposal.** `/save` writes `**Branch:** <actual-feature-branch>` in the proposal header after selecting the change. `/continue <change>` can read it without scanning every remote branch. The OpenSpec folder and session note stay named for the change. Existing proposals without a branch field continue to use a same-named branch. A planned, unsaved change may have no branch field; `/continue` leaves it in the current checkout and lets `/save` create the branch.
3. **Carry the exact name through archive.** `/ship` selects once and keeps `CHANGE_NAME` separate from `BRANCH`. It validates, checks tasks, and archives `CHANGE_NAME`. Its delegated `/save` uses the known archived path; a manual later `/save` can use a unique changed archive folder or the stored branch field. Before merge, `/ship` stops if another active change folder is part of the branch diff, since the merge would carry it too.

## Risks / Trade-offs

- **A branch changes several OpenSpec folders** → Stop and ask for a selection; `/ship` also refuses to merge another active change by accident.
- **An old clean branch has no branch field and a different change name** → It cannot be inferred safely. `/continue` needs an explicit branch or PR; the next `/save` records the association.
- **A branch moves after a proposal records its name** → `/save` refreshes the field from the actual branch; `/continue` checks it against available local and remote branches before checkout.

## Migration Plan

New saves add the branch field. Existing same-name handoffs keep working. A first save on a differently named branch records the new mapping without renaming either item.
