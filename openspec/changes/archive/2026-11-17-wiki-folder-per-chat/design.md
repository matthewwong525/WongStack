# Design

## Context

See proposal.md for why. Before this change, `place()` gives one copy per computer at `<primary>/knowledge`, and `linkCopy()` points each workspace's `knowledge/` at it with a symlink. Every git step runs in that one working tree. `publish()` ends with `git reset --keep <tip>`, which refuses when an unsaved file differs between HEAD and the new tip, so the save returns `blocked` and its commit stays local. The clash path of `replay()` also turns held saves back into working-tree edits, which block the next save too.

This is a port of ClaymooApp PR #2361 (squash `cd24f99f0`). WongStack's `knowledge.mjs` was the same file as ClaymooApp's before that change, but for a few paths, so the new file is ClaymooApp's with WongStack's paths, sign-in record and Git floor put back.

## Goals / Non-Goals

**Goals:**
- No unsaved edit, in any folder, can stop a save from publishing.
- One chat's unsaved edits are invisible to every other chat.
- Nothing is lost: not a held save, not an unsaved edit, not the shared copy.

**Non-Goals:**
- Branches on the app. Only `main` is pushed.
- A second copy of the objects per workspace: each folder is a `git worktree` of the shared copy.
- Clearing any repo's stuck copy by hand: the first `update` after the switch sends held saves.

## Decisions

### 1. A chat's folder is a git worktree of the shared copy
`folderFor(k)` runs `git -C <copy> worktree add -b chat/<workspace> <workspace>/knowledge origin/main` (or the copy's HEAD with no fetched tip), and returns `primary | none | ok | made | switched | blocked`. `switched` means an old symlink was removed with `unlinkSync`, never reaching into the copy. A real folder that is not a worktree of the copy stays `blocked`. `place()` adds `dir`: the folder in a workspace, the copy in the primary checkout. Working-tree steps run in `k.dir`; refs, marks and the lock stay in the shared `.git`, so one lock serves the computer. A branch name taken by a live folder, or holding saves, gets `-2`, `-3`; a free one is made again.

### 2. Publish builds on the published tip and never moves a dirty tree first
`publish()` rebuilds `base..HEAD` onto the fetched tip with `merge-tree` and `commit-tree`, in memory. A clashing path takes the tip's text, and the branch's text goes in a `clashes` list. It runs `saveProblems(k, next, tip)`, which reports only problems `next` adds over the tip. It pushes `next:refs/heads/main` with no force, retries a lost race, and only then moves the folder with `forward()`.

*Alternative:* `git stash`, reset, pop. Rejected: the stash stack is shared by every worktree on the computer, so another chat could pop it.

### 3. The forward step merges the folder's own edits onto the new version
`forward(k, from, to, clash)` snapshots the folder's edits, untracked pages included, with a temp index into a `wip` commit, and writes `{ from, wip, to, clash }` to the folder's own git dir before it changes anything. It merges `wip` onto `to`, runs `reset --hard to`, writes each merged path back as an unsaved edit, puts each clash's other text beside the page as `<page>.mine.<ext>`, then deletes the mark. A run stopped half way finishes the move under the next lock.

### 4. Output
`saved=` and `conflict=` print together when a save went live with clashes, exit 4. `kept` and `blocked` are gone from save and update.

### 5. Leftovers
- `remove [--discard]` removes the workspace's folder; unsaved pages or clashes stop it unless `--discard`. A branch holding an unsent save stays.
- `folders [--send]` lists each `chat/*` branch with its folder, held count and unsaved pages; `--send` publishes held saves and deletes a branch with no folder and nothing held.
- `/close`: the loop profile's `closeWorkspace` runs tidy.mjs's dry run first, then `knowledge.mjs remove` (`--discard` on that route): exit 7 for unsaved or clashing pages, 8 for busy or a git refusal; `blocked` is left alone and the close goes on.
- The daily tidy: `tidy.prepare` makes the run's folder and runs `folders --send`; the new `tidy.cleanup` slot runs `remove --discard` before the run's copy is deleted. The memory module's `run.mjs` calls `cleanup` in its `finally`.
- The Daily module's job copies: no new step. A module reaches nothing outside its folder, and deleting the job copy deletes only its folder's files; `worktree prune` in `folderFor` and `folders` clears the stale record.

### 6. Session start
`knowledgeLine()` calls `folderFor(k)`, starts `update` detached, and names only this folder's unsaved pages and `.mine` clashes. It names nothing for a `blocked` folder, where git would walk up into the code checkout.

## Risks / Trade-offs

- [A workspace folder deleted without `/close`] → its unsaved edits are lost, as an unsaved code edit would be; held saves survive on the branch and the tidy sends them.
- [A crash between `reset --hard` and the rewrite] → the wip mark keeps the edits' commit, and the next locked run finishes the move.
- [Worktree records pile up] → `folderFor` and `folders` prune them.
- [A repo with its own copy of the memory or loop profile] → the changelog's Updating note says to keep the new lines.

## Migration Plan

1. Ship the script. Each workspace switches at its next chat start (`switched`).
2. The next `update` in each folder sends its held saves.
3. Rollback: revert the release. Folders already made stay valid worktrees; remove each with `git worktree remove`, and the old script links again.
