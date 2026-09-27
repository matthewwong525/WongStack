# WongStack cleans up after itself

**Status:** ready-to-ship
**Branch:** explore-wongstack-memory-cleanup
**Open questions:** none

## Why

Over time the machine runs out of memory. Chats and workspaces stay open after their work is published: 15 chats held about 2.6 GB, some idle for 4 days. App servers kept running after their workspace was deleted. Temp space, which is memory on this machine, filled to the last 4 MB, partly with thousands of leftover test folders and scratch files. Nothing WongStack starts is ever put away.

## What Changes

- **After you publish, you can close the workspace.** The closing question after a publish gets a new choice, *Close this workspace*. Pick it and the chat finishes its reply, then closes the chat and workspace. It also stops anything the work left running and deletes its scratch files. The chat stays readable in Paseo's archived list. When no more work is waiting, closing is the recommended choice.
  ```text
  It's live: <link>
  Click here to see the plan: …

  What next?
  1. Close this workspace (Recommended)
  2. Walk the live app
  3. Stop here
          │ 1
          ▼
  reply ends ─▶ chat closes
              ─▶ servers stopped
              ─▶ scratch deleted
  ```
- **Each new session tidies up in the background.** Starting a session never waits for it. At most every few hours, WongStack closes chats idle 3+ days whose work is all saved, stops app servers whose workspace is gone, and deletes its own temp folders and scratch files older than a day. It never touches another project's files, and never closes a chat with unsaved work.
  ```text
  session starts
     │ (does not wait)
     ▼
  tidy-up ── idle 3+ days, saved? ─▶ close
     │        unsaved? ─▶ leave, tell you
     ├─ server with no workspace ─▶ stop
     └─ old WongStack temp ─▶ delete
  ```
- **You hear what it did, once.** The next session opens with one line, such as *Closed 2 idle workspaces; left "Weekly plan" open: it has unsaved work.* Nothing is said when nothing happened.
- **Scratch files live in the workspace.** Agents put throwaway files in a `.scratch/` folder inside the workspace, which git ignores, not in the temp folder. They sit on disk, not in memory, and they go away with the workspace. In the main checkout, which never closes, the tidy-up deletes scratch files older than a day.

**Non-goals:** other projects' temp files (the biggest part of today's temp use), Paseo itself, and chats outside this repo's workspaces. Closing is never forced on a published chat: it stays a choice.

## Capabilities

### New Capabilities

- `workspace-cleanup`: closing a workspace after publish, the background tidy-up at session start (idle chats, orphaned servers, old temp folders and main-checkout scratch), its one-line report, and the git-ignored `.scratch/` folder.

### Modified Capabilities

- `multi-part-workspaces`: the closing question after `/ship` also offers *Close this workspace*, recommended when no next work is waiting.

## Impact

- New `.agents/skills/routine/scripts/tidy.mjs` (`scratch`, `close`, `sweep`), sharing `lib/paseo.mjs` with `workspace.mjs`.
- `.agents/skills/memory/scripts/session-start.mjs`: starts `tidy.mjs sweep` detached and prints the last sweep's report line.
- `.agents/skills/ship/SKILL.md` Step 6 and `.agents/skills/plan/references/new-workspace.md` (Next work): the close option.
- Scratch-file guidance: `wiki/development/the-change-loop.md` and the brief step in `new-workspace.md`.
- `.scratch/` ignore line: this repo's `.gitignore`, the `.gitignore` fragment in `.agents/skills/wong-sync/references/stack-pack-fragments.md`, and `wong-setup`'s install list.
- Tests: new `scripts/tests/tidy.test.mjs` with a fake `paseo`; test temp folders renamed to a `wong-` prefix so the sweep can catch crash leftovers.
- `openspec/specs/workspace-cleanup/spec.md` (new), `openspec/specs/multi-part-workspaces/spec.md` (delta), `CHANGELOG.md`.

## Decision log

- **2026-09-27** — Asked whether to close a published chat and workspace on its own → chose to offer it as a choice in the closing question after publishing.
- **2026-09-27** — Asked what the sweep does with chats never published but idle a long time → chose to close those idle 3+ days when nothing is unsaved.
- **2026-09-27** — Asked how far cleanup reaches → chose only WongStack's own leftovers.
- **2026-09-27** — Asked whether to clean today's leftovers by hand now → chose yes; stopped the 6 orphaned app servers and deleted about 4,300 old test folders from temp (4 MB free became 288 MB). No chat was closed.
- **2026-09-27** — Assumed: *Close this workspace* is recommended only when no next work is waiting; otherwise opening the next part stays first, because the existing next-work rule already recommends it.
- **2026-09-27** — Assumed: the close waits for the chat's reply to end before archiving, through a detached helper that runs `paseo wait` then `paseo workspace archive`, because archiving mid-reply would kill the chat before it answers.
- **2026-09-27** — Assumed: "saved" means a clean working tree and no commits missing from the remote (pushed or merged), because `/continue` can pick pushed work back up from its branch.
- **2026-09-27** — Assumed: after closing a published workspace, its local branch is deleted only when its pull request merged at the same commit, because `paseo workspace archive` leaves the branch behind and a squash merge hides whether it is safe.
- **2026-09-27** — Assumed: "old" temp means untouched for over a day, and only folders whose name starts with `wong-` count, because other tools share the temp folder and a name prefix is the only safe ownership mark.
- **2026-09-27** — Assumed: stray servers are processes of this user whose working folder is a deleted worktree of this repo, stopped with a polite signal, because that is exactly what today's leak looked like and nothing live can match it.
- **2026-09-27** — Assumed: the sweep runs detached at most every 6 hours, because session start has a 5-second limit and several sessions start per hour.
- **2026-09-27** — Assumed: stopping stray servers works on Linux only (it reads `/proc`), and is skipped elsewhere, because macOS has no `/proc` and the leak was seen on a Linux host.
- **2026-09-27** — Asked whether scratch files belong in a git-ignored folder inside the workspace, not the temp folder → chose `.scratch/` in the workspace: it is on disk, not in memory, it goes away with the worktree, and writing there needs no permission prompt.
- **2026-09-27** — Assumed: the `.scratch/` ignore line ships through the existing `.gitignore` fragment that `/wong-sync` re-offers, and `tidy.mjs scratch` adds it to the repo's local exclude file when git does not already ignore the folder, because setup already guards `.env` the same way.
- **2026-09-27** — Assumed: the tidy-up counts a squash-merged branch as saved too, asking `gh` only when the tree is clean but commits are on no remote, because a shipped worktree's commits are on no remote after a squash merge and would otherwise never close.
- **2026-09-27** — Assumed: a workspace with no chat left takes its branch's last change time as its idle clock, because there is no chat activity to read.
- **2026-09-27** — Assumed: leftover processes are stopped only under Paseo's own worktrees folder (`PASEO_HOME` can move it), because that is where every workspace this repo opens lives, and tests can then stop a real process.
- **2026-09-27** — Assumed: the shared memory-hook test setup sets `WONG_TIDY=0`, so no existing hook test sweeps the machine's real temp folder; the new hook tests switch it on.
- **2026-09-27** — Assumed: every test temp folder takes `wong-test-` from its helper, so the memory tests' `wong-memory-*` folders become `wong-test-memory-*`.
- **2026-09-27** — Assumed: task 4.2's save is `/ship`'s one checkpoint, because the change ships in the same run; a failing gate stops the merge.
- **2026-09-27** — Assumed: ships as a minor release, because it adds behavior and removes nothing.
- **2026-09-27** — Distilled: no repeatable fact. The change and branch had no live facts; the scratch-file rule this change teaches is written in `wiki/development/the-change-loop.md`.
