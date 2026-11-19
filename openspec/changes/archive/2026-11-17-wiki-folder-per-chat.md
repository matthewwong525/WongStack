<!-- openspec-archive v1 2026-11-17-wiki-folder-per-chat -->
<!-- file proposal.md utf8 4854 -->
# Each chat gets its own company folder, and a save never gets stuck

**Status:** ready-to-ship
**Branch:** wiki-folder-per-chat
**Open questions:** none

## Why

Every chat on a computer shares one company-knowledge folder. When one chat leaves an edit unsaved and the team later changes that page, every other chat's save on that computer gets stuck: the save's commit stays on the computer and the team never sees it. A ClaymooApp computer had 7 leftover drafts holding back 11 saves, some for a day, 6 times in 9 days. ClaymooApp fixed it in its PR #2361; this change brings the fix to every WongStack repo.

## What Changes

- **Each chat workspace gets its own `knowledge/` folder**: a git worktree of the computer's shared copy, on the branch `chat/<workspace>`. Another chat's unsaved edit is never in its folder, so it can't stop its save. Only `main` is sent to the app.
- **Open chats switch by themselves.** At the next chat start, the old `knowledge` link becomes the chat's own folder. Only the link is removed; the shared copy keeps every file and save.
- **A save builds on the newest published version in memory, pushes with no force, then moves the folder forward**, with its unsaved edits merged on top. No unsaved edit stops it.
- **A clash publishes the rest.** The clashing page keeps the published text, and the chat's version goes beside it as `<page>.mine.<ext>`. The save prints `saved=`, one `conflict=` line per page, and exits 4.
- **Only a link problem the save adds stops it.** A broken link already published stops no one.
- **New commands:** `knowledge.mjs remove [--discard]` and `knowledge.mjs folders [--send]`.
- **`/close` removes the chat's folder**: unsaved or clashing pages stop it with exit 7, another save running with exit 8; on discard it drops them.
- **The daily tidy sends saves chats left behind** before its first map, merges an ended chat's clash, and removes its own folder when its run ends, through a new `tidy.cleanup` profile slot.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `company-knowledge`: each chat workspace has its own folder; a save merges onto the newest published version and is never stopped by unsaved edits; `/close` and the daily tidy finish what a chat leaves behind.

## Impact

- `.agents/memory/knowledge.mjs`: `place` gains `dir`; `linkCopy` becomes `folderFor`; `publish` builds in memory, then `forward`; new `remove`, `folders`, `clashes`; `saveProblems(k, commit, base)`.
- Callers: `.agents/memory/session-start.mjs`, `.agents/loop/worktree-secrets.mjs`, `.agents/daily/profile.mjs`, `.agents/memory/tidy-pages.mjs` and `.agents/memory/profile.mjs`, `.agents/loop/profile.mjs` (`closeWorkspace`).
- Modules: the memory module's `run.mjs` calls the new `tidy.cleanup` slot (5.1.0); `/close` names exits 7 and 8 (loop 3.3.0).
- Docs: `wiki/stack/company-knowledge.md`, `wiki/development/wiki-dream.md`, `wiki/development/memory.md`.
- Tests: `scripts/tests/knowledge.test.mjs`, the new `scripts/tests/knowledge-folders.test.mjs`, `scripts/tests/loop-profile.test.mjs`, `scripts/tests/memory-daily.test.mjs`.

## Decision log

- **2026-11-17** — Asked by the owner to bring ClaymooApp's "each chat gets its own wiki folder" fix (PR #2361) to WongStack → port it, generalized, and ship it.
- **2026-11-17** — Assumed: the Daily module's worker gets no knowledge step when it deletes a job copy, because a module may reach no file outside its folder. Deleting the copy deletes only the job folder's own files; the shared copy's record of that folder is pruned at the next `folderFor` or `folders`, and a held save keeps its branch for `folders --send`. A test covers it.
- **2026-11-17** — Assumed: the daily tidy's `prepare` runs `folders --send` itself, in code, instead of a step in the memory module's tidy brief, because that brief ships in the module and can name no WongStack file. The tidy learns to merge a `.mine` page from the profile's `publish` line.
- **2026-11-17** — Assumed: the tidy does not save facts from another open chat's unsaved drafts (ClaymooApp's step 3), because that chat keeps its own edits and `/close` saves them; the generic tidy brief can't name the command.
- **2026-11-17** — Assumed: `/close`'s text names only exits 7 and 8, and `knowledge.mjs remove` prints the save command, because the close skill ships in the loop module and can name no WongStack file.
- **2026-11-17** — Assumed: ClaymooApp's own differences stay out (its Git 2.38–2.39 stand-in merge, its Windows path fix, its install-record reader, the one-off clear-up of its stuck copy), because they are not part of this fix.
- **2026-11-17** — Archive checkpoint: `/ship` archived the change and numbered it 61.10.0; payload checks pass and the full test run has no failures.

<!-- end proposal.md -->
<!-- file design.md utf8 5484 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 1774 -->
# Tasks

## 1. Save script (`.agents/memory/knowledge.mjs`)

- [x] 1.1 Port ClaymooApp's new `knowledge.mjs` (PR #2361) with WongStack's paths (`.claude/memory/knowledge.mjs`, `wiki/stack/company-knowledge.md`, `.claude/.wong-stack.json`), WongStack's unexported `helperConfig`, and no Git 2.38–2.39 stand-in or Windows prefix change. Verify `node --test scripts/tests/knowledge.test.mjs` passes, with the ported cases: a save while the folder has an unsaved edit on a page the tip changed, a held save that clashes, forward merges, `.mine`, untracked pages, the wip mark, exit 4, two chats' folders, the symlink switch, `-2` branches, `remove`, `folders --send`, and carried pages.
- [x] 1.2 Make `remove`'s refusal print the save command, so `/close` names no WongStack file.

## 2. Callers

- [x] 2.1 Switch `session-start.mjs`, `worktree-secrets.mjs`, `.agents/daily/profile.mjs` and `tidy-pages.mjs` from `linkCopy` to `folderFor`; retire `linkCopy` in `scripts/retired-names.json`. Verify `node scripts/check-retired-names.mjs`.
- [x] 2.2 `tidyPrepare` runs `folders --send`; add `tidyCleanup` and the profile's `tidy.cleanup`; `run.mjs` calls it in its `finally` (memory module 5.1.0). Verify `scripts/tests/knowledge-folders.test.mjs` and `scripts/tests/memory-daily.test.mjs` pass.
- [x] 2.3 `closeWorkspace` runs tidy.mjs's dry run, then `knowledge.mjs remove`, with exits 7 and 8; `/close` names both (loop module 3.3.0). Verify `node --test scripts/tests/loop-profile.test.mjs`.

## 3. Docs and release

- [x] 3.1 Update `wiki/stack/company-knowledge.md`, `wiki/development/wiki-dream.md` (new *Edits left behind*) and `wiki/development/memory.md`; add the spec delta and the `## Next (minor)` changelog entry. Verify `node scripts/payload-checks.mjs` passes.

<!-- end tasks.md -->
<!-- file specs/company-knowledge/spec.md utf8 4080 -->
## MODIFIED Requirements

### Requirement: Every workspace reads one current copy

Each computer SHALL keep one shared copy of the knowledge repository. Each chat workspace SHALL have its own folder of it at `knowledge/`, made from the newest published version, so that one chat's unsaved edits are never seen by another chat or in its way. Making or removing a chat's folder SHALL never change or delete the shared copy. A workspace that still links to the shared copy SHALL get its own folder at its next chat start, with no page lost. When a chat starts, its folder SHALL send its own held saves and move to the newest saved version in the background, without delaying the chat, with its unsaved edits merged on top. When an unsaved edit and a newer published edit change the same lines, the page SHALL hold the published version with the chat's version beside it, and the chat start SHALL name the page. When the sign-in has run out or the app can't be reached, chats SHALL read the last copy, and nothing SHALL open a browser or wait for one.

#### Scenario: A teammate saved overnight

- **WHEN** a teammate saved a page last night and the person starts a chat this morning
- **THEN** by the end of the chat's start, the chat's folder shows that page

#### Scenario: The sign-in ran out

- **WHEN** a chat starts after the company sign-in has expired
- **THEN** the chat reads the last copy, and the sign-in link is shown as it is today

#### Scenario: Two chats edit one page

- **WHEN** chat A edits a page and does not save it, and chat B then saves the same page
- **THEN** chat B's save goes live, and chat A still sees its own edit, not chat B's draft

#### Scenario: An older workspace with a link

- **WHEN** a chat starts in a workspace whose `knowledge/` is a link to the shared copy
- **THEN** the link is replaced with the workspace's own folder, and the shared copy keeps every file and save it held

### Requirement: Two writers never lose a save

When two saves change the same lines of a page, the later save SHALL NOT overwrite the earlier one: the later save SHALL publish its other pages, keep the published version of the clashing page with its own version beside it, and name the page, and the assistant SHALL save one page that keeps both. Saves to different lines or pages SHALL both go live with no extra step. Unsaved edits on any page, in this chat's folder or another's, SHALL NOT stop a save from publishing, and a save SHALL never publish another chat's unsaved edits.

#### Scenario: Same lines, two people

- **WHEN** Bryan and Matthew each change the same paragraph of `knowledge/ops/shipping.md` within a minute
- **THEN** the second save publishes its other pages, names the page, the assistant writes the paragraph from both versions, and the saved page keeps both changes

#### Scenario: The newest version changed a page with an unsaved edit

- **WHEN** a chat saves one page, and the newest published version changed another page that has an unsaved edit in that chat's folder
- **THEN** the saved page goes live, and the unsaved edit stays unsaved on top of the newest version of its page

## ADDED Requirements

### Requirement: Edits left behind are finished, never blocking

`/close` SHALL stop and name a chat's unsaved company pages before it removes the chat's folder, unless the person asked to throw the work away, when it SHALL drop them. Removing a folder SHALL never drop a held save: it stays on the computer until it is sent. The daily tidy SHALL send held saves from every chat's branch on the computer before its first map, and SHALL remove its own folder when its run ends.

#### Scenario: Closing a chat with an unsaved page

- **WHEN** a person runs `/close` in a chat with one unsaved company page
- **THEN** the close stops and names the page; once it is saved, the close removes the chat's folder

#### Scenario: A chat that ended without /close

- **WHEN** the daily tidy runs and a chat whose workspace is gone holds a save the app never received
- **THEN** the save goes live, and that chat's branch is removed

<!-- end specs/company-knowledge/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-11-17

~~~
<!-- end .openspec.yaml -->
