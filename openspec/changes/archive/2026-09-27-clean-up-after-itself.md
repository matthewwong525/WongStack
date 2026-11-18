<!-- openspec-archive v1 2026-09-27-clean-up-after-itself -->
<!-- file proposal.md utf8 8812 -->
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
- **2026-09-27** — Archive checkpoint: `tidy.mjs` (`scratch`, `close`, `sweep`), the session-start tidy-up and report line, *Close this workspace* in `/ship`'s closing question, the `.scratch/` ignore line, and `wong-test-` temp prefixes landed; 18 tidy tests and 125 affected tests pass locally. Merged `main` after #164 (26.6.0): `session-start.mjs` keeps both the tidy-up and the branch-worker line, and this entry sits on top of the changelog, numbered 26.7.0.

<!-- end proposal.md -->
<!-- file design.md utf8 8540 -->
# Design

## Context

See proposal.md — Why. On 2026-09-27 the host (8 GB RAM, `/tmp` a 3.8 GB tmpfs) showed three leaks, all WongStack-caused or WongStack-shaped:

- Paseo agents never archived: `paseo ls` listed 7 idle agents, the oldest 4 days; each `claude` process holds 100–300 MB.
- Six `vite` servers with `ppid 1` whose `/proc/<pid>/cwd` read `…/27cot6mt/chilly-manatee/app (deleted)`.
- About 4,300 `wong-memory-{home,repo}-*` folders (282 MB) from the memory test harness, left by runs that crashed or predate 25.3.0's `t.after` cleanup, plus loose agent scratch files (`/tmp/sync-wongstack-15-*`, `/tmp/wong-check*`).

Paseo 0.9.2 already has what's needed: `paseo workspace ls --json` (`workspaceId`, `project`, `isolation`, `cwd`), `paseo workspace archive <id>` (removes the worktree and its agents, leaves the local branch), `paseo ls --json` and `paseo inspect <id>` (`Status`, `UpdatedAt`, `Cwd`), and `paseo wait <id>` (blocks until idle). `workspace.mjs` and `routine.mjs` already share `routine/scripts/lib/paseo.mjs` for binary lookup, `--json` calls, and exit codes.

## Goals / Non-Goals

**Goals:** one script owns every cleanup action, so `/ship`, the session-start hook, and tests call the same code; every destructive step checks ownership first.

**Non-goals:** a general temp cleaner, Paseo's own daemon or supervisor processes, `agent-browser` sessions (`verify-runner.sh` already closes them), and macOS process cleanup.

## Decisions

### One script: `routine/scripts/tidy.mjs`

Three commands, with the same JSON-on-stdout and exit codes as `workspace.mjs` (0 ok, 2 bad input or refused, 3 no Paseo, 4 daemon down, 5 Paseo output changed), `--dry-run` on each, and `TIDY_PASEO_BIN` to point tests at a fake:

- `scratch` — creates and prints `<checkout root>/.scratch/`, first adding `.scratch/` to `git rev-parse --git-path info/exclude` when `git check-ignore` says it is not ignored.
- `close` — closes the workspace it runs in, after the reply ends.
- `sweep` — the background tidy-up; `--report` prints and clears the last report instead.

It lives beside `workspace.mjs` because it is Paseo plumbing and ships with `/routine`'s scripts (already core payload). *Alternative:* a new `tidy` skill — rejected: it would add a listed skill for something no person invokes by name.

### Ownership tests, shared by `close` and `sweep`

- **This repo's workspace:** `git -C <cwd> rev-parse --git-common-dir` equals ours, and `isolation` is `worktree`. The primary checkout is never archived.
- **Saved:** `git status --porcelain` is empty (ignored files, `.scratch/` included, do not count), and `git rev-list HEAD --not --remotes` is empty (every commit is on some remote branch, or the branch was squash-merged and its remote deleted — see below).
- **Merged branch (close only):** `gh pr view <branch> --json state,headRefOid` shows `MERGED` and `headRefOid` equals the local tip. Then a squash-merged branch counts as saved, and the local branch is deleted with `git branch -D` from the primary. With no `gh` or no match, the branch stays and the report says so.
- **Idle (sweep only):** every agent whose `Cwd` is in the workspace is not `running`, and the newest `UpdatedAt` is 3+ days old. The current `PASEO_AGENT_ID`'s workspace is always skipped.
- **Orphaned process:** owned by this uid; `readlink /proc/<pid>/cwd` ends in ` (deleted)`; the path is under a Paseo worktree parent of this repo (the parent folders of `git worktree list --porcelain` entries under `~/.paseo/worktrees/`). SIGTERM only, never SIGKILL. No `/proc` → the step is skipped with a note.
- **Old temp:** direct children of `os.tmpdir()` named `wong-*`, owned by this uid, with the entry's own mtime and its top-level children's mtimes all older than 24 h. These are now only crash leftovers (test runs, `run.mjs`, `/verify`), since scratch moved into the checkout.
- **Old scratch (primary only):** files under the primary checkout's `.scratch/` with mtime older than 24 h, then empty folders. Worktree scratch is never swept; it goes with the worktree.

*Alternative:* delete any stale temp entry — rejected by the person (only WongStack's own).

### `close` waits for the reply to end

`close` runs its checks synchronously. On refusal it prints why (unsaved files, primary checkout, not in Paseo) and exits 2 with nothing done. On success it spawns a detached child (`detached: true`, `stdio: 'ignore'`, `cwd` the primary checkout, so archiving the worktree cannot pull its cwd away). The child:

1. runs `paseo wait <PASEO_AGENT_ID>` (30-minute cap);
2. runs `paseo workspace archive <workspaceId>`;
3. stops orphaned processes for that worktree path;
4. deletes the local branch when it is merged, as above;
5. writes its result into the tidy report.

`.scratch/` needs no step: it is inside the worktree, so the archive removes it. `git worktree remove` counts only untracked files as unclean, not ignored ones, so it does not block the archive.

The agent's reply says *closing this workspace now*, then ends. *Alternative:* archive immediately with `--force` — rejected: it kills the chat mid-reply, and the person never sees the answer.

### Sweep runs from the session-start hook, detached, rate-limited

`session-start.mjs` spawns `tidy.mjs sweep` the way it already spawns `run.mjs`: detached, `unref`, errors swallowed. It skips the spawn for background runs (`WONG_MEMORY_RUN=1`) and when `WONG_TIDY=0`. The sweep takes a lock and exits at once if the last sweep began under 6 hours ago. Stamp, lock, and report live in `<git-common-dir>/wong-tidy/`, beside `wong-memory/`, so every worktree of the repo shares them and nothing shows in `git status`.

The hook also runs the report read synchronously: it reads `wong-tidy/report.json` and prints one line when the file holds anything, then deletes it. That is a local file read, so it fits the hook's 1.5 s budget.

### Scratch folder

`.scratch/` at the checkout root, git-ignored. It is on disk, not on a tmpfs `/tmp`; it disappears with the worktree; writes inside the project need no extra permission, where `/tmp` can prompt outside bypass mode. It is not under `.git/`, which Claude Code refuses to write.

The ignore line ships three ways:
- this repo's `.gitignore`;
- the `.gitignore` fragment in `stack-pack-fragments.md`, which `/wong-sync` re-offers to installed repos;
- `wong-setup`'s install list.

`tidy.mjs scratch` also adds the line to `info/exclude` when git does not ignore the folder yet (an installed repo that has not taken the fragment), so a scratch file can never be committed. `new-workspace.md`'s brief step and a short *Scratch files* line in `the-change-loop.md` point agents at `tidy.mjs scratch`.

*Alternative:* a per-workspace `wong-scratch-*` folder in `/tmp` — rejected: it lives in RAM on this host, and needs its own delete step.

### Test temp folders take a `wong-` prefix

`scripts/tests/*` use prefixes like `verify-env-` and `retired-names-`. A crash leaves them where the sweep can't claim them. Rename each `mkdtemp` prefix to `wong-test-<old>`; the memory harness's `wong-memory-*` already qualifies. The tests are meta-repo only, so targets see no change.

## Risks / Trade-offs

- [A person comes back to a 3-day-idle chat and finds it archived] → only saved work is archived; the chat stays readable in Paseo's archived list; `/continue <change>` reopens the branch; the report line names every archived workspace.
- [`paseo wait` never returns (daemon restart)] → a 30-minute cap; then the child archives nothing and records *could not close: chat never finished*.
- [Paseo's JSON shape changes] → exit 5 and no action, like `workspace.mjs`; the sweep's report says the Paseo part was skipped.
- [A `wong-` folder in temp belongs to a still-running long job] → the 24 h rule checks the folder and its top-level entries; a job idle a full day on disk is treated as done. Accepted.
- [Two sessions start at once] → the lock file; the second sweep exits.
- [A test's `wong-test-` folder is swept mid-run] → impossible inside 24 h.
- [A tool scans `.scratch/` (linters, the app build)] → the folder sits at the repo root, outside `app/` and `mini-apps/`, and the dot hides it from most globs.

## Migration Plan

`/wong-sync` brings `tidy.mjs`, the hook edit, and the skill and wiki edits. The first session start after the update sweeps once, so a machine full of old chats sees a larger first report. Rollback: set `WONG_TIDY=0` in the environment, or revert the hook line.

<!-- end design.md -->
<!-- file tasks.md utf8 4958 -->
# Tasks

## 1. The tidy script

- [x] 1.1 Create `.agents/skills/routine/scripts/tidy.mjs` with the `scratch`, `close`, and `sweep` commands, `--dry-run`, `TIDY_PASEO_BIN`, and the exit codes from `lib/paseo.mjs`. Implement the ownership tests from design.md as exported pure helpers: this repo's workspace, saved, merged branch, idle, orphaned process, old temp, and old primary scratch. `scratch` creates `.scratch/` at the checkout root and adds it to `info/exclude` when `git check-ignore` says it is not ignored. Node built-ins only; header comment in `workspace.mjs`'s style. Verify with the tests in 1.4.
- [x] 1.2 `close`: check synchronously and refuse with exit 2, naming the reason, for the primary checkout, no Paseo agent, or unsaved work. Otherwise spawn the detached child: `paseo wait` with a 30-minute cap, `paseo workspace archive`, stop orphaned processes under the worktree path, delete the local branch only when `gh` shows the pull request `MERGED` at the local tip, and write the result into `<git-common-dir>/wong-tidy/report.json`. Verify with the tests in 1.4.
- [x] 1.3 `sweep`: take a lock, and exit when the last sweep began under 6 hours ago. Archive this repo's idle 3+ day saved workspaces, skipping the current agent's workspace. Stop orphaned processes; skip with a note where there is no `/proc`. Delete `wong-*` temp entries older than 24 h, and files older than 24 h in the primary checkout's `.scratch/`. Merge the results into the report. `sweep --report` prints one plain line and deletes the report; it prints nothing when the report is empty. Verify with the tests in 1.4.
- [x] 1.4 Add `scripts/tests/tidy.test.mjs` with a fake `paseo` (as in `workspace.test.mjs`), a fake `gh`, temp git repos with worktrees, and `TMPDIR` pointed at a test folder. Cover:
  - `close` refusing on a dirty tree and on the primary checkout;
  - `close`'s child sequence and its branch delete only on a matching merged PR;
  - `sweep` archiving an idle saved workspace;
  - `sweep` skipping an unpushed one, a running one, and another repo's;
  - old `wong-*` removed while `tsx-0` and fresh `wong-*` stay;
  - old primary `.scratch/` files removed while fresh ones stay;
  - a `.scratch/` file not blocking `close`;
  - `scratch` adding the exclude line only when the folder is not already ignored;
  - the 6-hour stamp and the lock;
  - the report printed once;
  - the orphan-process filter (pure, on fixture `/proc`-style entries).

  Verify with `TMPDIR=/var/tmp node --test scripts/tests/tidy.test.mjs`.

## 2. Hooks and skills

- [x] 2.1 In `.agents/skills/memory/scripts/session-start.mjs`, print the `sweep --report` line (read in-process, within the budget), then spawn `tidy.mjs sweep` detached, skipping it for background runs and when `WONG_TIDY=0`. Extend `scripts/tests/` hook coverage so the report line appears once and a failed spawn never breaks the hook. Verify with `node --test` on the hook tests.
- [x] 2.2 In `.agents/skills/ship/SKILL.md` Step 6 and `.agents/skills/plan/references/new-workspace.md` (Next work), add *Close this workspace* to the closing question when the ship ran in a Paseo worktree. It is recommended when no next work is waiting. Picking it runs `node "$(git rev-parse --show-toplevel)/.claude/skills/routine/scripts/tidy.mjs" close`, and a refusal is reported in plain words. Verify the option appears once in each page, and that the ask links the shared format and keeps no copy of it.
- [x] 2.3 Point scratch files at `tidy.mjs scratch`. In `new-workspace.md`, the brief's temporary file goes there. Add a short *Scratch files* line to `wiki/development/the-change-loop.md`, linking the script. Verify with `node scripts/check-payload-links.mjs`.
- [x] 2.4 Ignore `.scratch/`: add it to this repo's `.gitignore`, to the `.gitignore` fragment in `.agents/skills/wong-sync/references/stack-pack-fragments.md` (with one line on why), and to the ignore rules `wong-setup/SKILL.md` installs. Verify with `git check-ignore -q .scratch/x`, and with the fragment and setup naming it once each.

## 3. Tests' temp folders

- [x] 3.1 Rename every `mkdtemp` prefix in `scripts/tests/` that does not start with `wong-` to `wong-test-<old prefix>`, including the hardcoded `/tmp/...-` ones, which move to `os.tmpdir()`. Verify that every `mkdtemp` call's prefix starts with `wong-` (import lines aside), and the full suite passing in CI.

## 4. Docs and release

- [x] 4.1 Add a `## Next (minor) — WongStack cleans up after itself` entry at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating** note (first sweep may close several old chats; `WONG_TIDY=0` turns it off). `tidy.mjs` ships with the whole `routine` skill folder, so the manifest needs no edit. Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`; verify all pass.
- [x] 4.2 Save with `/save`, and verify CI passes on the pushed branch.

<!-- end tasks.md -->
<!-- file specs/multi-part-workspaces/spec.md utf8 1394 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The next work is offered in a new workspace
When `/ship` finishes and more work the person asked for remains, its closing question SHALL offer to open the next piece in a new workspace *(Recommended)*, or stop. When `/ship` merged from a Paseo worktree, the closing question SHALL also offer *Close this workspace*, recommended when no next work is waiting. When new or resumed work would displace another unpublished change in this workspace, the agent SHALL offer a new workspace first and SHALL switch nothing here until the person answers. A resumed change's workspace SHALL open on its recorded branch.

#### Scenario: More work after a publish
- **WHEN** `/ship` merges part A and the queued part B has no workspace yet
- **THEN** the closing question offers to open B in a new workspace, first and recommended, and stopping

#### Scenario: Nothing left after a publish
- **WHEN** `/ship` merges from a Paseo worktree and no other work the person asked for is waiting
- **THEN** the closing question offers *Close this workspace* first and recommended

#### Scenario: Continue from a busy workspace
- **WHEN** `/continue add-auth` runs in a workspace holding uncommitted work of another change
- **THEN** the options include opening `add-auth`'s branch in a new workspace, recommended, and nothing in this workspace changes branch

<!-- end specs/multi-part-workspaces/spec.md -->
<!-- file specs/workspace-cleanup/spec.md utf8 4314 -->
# Spec Delta

## Purpose

Keeps WongStack from filling the machine's memory: it closes finished workspaces, stops servers left behind, and deletes its own old temp files, touching nothing it did not make.

## ADDED Requirements

### Requirement: A published workspace can be closed from the closing question
When the person picks *Close this workspace* after a publish, the agent SHALL finish its reply first, then archive the chat and its workspace, and stop processes still running from that workspace. It SHALL delete the local branch only when the branch's pull request merged at the branch's current commit. It SHALL refuse, closing nothing, when the workspace has unsaved work or is the primary checkout.

#### Scenario: Close after a publish
- **WHEN** `/ship` merges a change from a Paseo worktree and the person picks *Close this workspace*
- **THEN** the reply ends, then the chat and workspace are archived, their leftover processes stop, and the merged branch is deleted locally

#### Scenario: Unsaved work blocks the close
- **WHEN** the person picks *Close this workspace* and the working tree has uncommitted edits
- **THEN** nothing is closed and the agent names the unsaved files

### Requirement: Session start tidies up in the background
Each session start SHALL begin a background tidy-up, at most once every 6 hours per repo, and SHALL never wait for it. The tidy-up SHALL archive this repo's Paseo workspaces whose chats have all been idle 3 or more days and whose work is saved (clean tree, and every commit on the remote or its pull request merged at that commit), stop this user's processes whose working folder is a deleted worktree of this repo, delete `wong-` temp folders untouched for more than a day, and delete files in the primary checkout's scratch folder untouched for more than a day. It SHALL skip the current session's workspace, the primary checkout, and anything with unsaved work.

#### Scenario: An idle, saved workspace is closed
- **WHEN** a session starts and another workspace of this repo has been idle 4 days with its branch pushed and a clean tree
- **THEN** the tidy-up archives that workspace and its chat

#### Scenario: Unsaved work is left alone
- **WHEN** an idle 5-day workspace has a commit that is on no remote
- **THEN** the tidy-up leaves it open and records it as skipped for unsaved work

### Requirement: The tidy-up touches only WongStack's own leftovers
The tidy-up SHALL NOT delete a temp entry whose name does not start with `wong-`, SHALL NOT archive a workspace of another repo, and SHALL NOT signal a process whose working folder still exists.

#### Scenario: Another project's temp files
- **WHEN** the temp folder holds a week-old `tsx-0` folder and a week-old `wong-memory-repo-x1` folder
- **THEN** only `wong-memory-repo-x1` is deleted

#### Scenario: A server outlives its workspace
- **WHEN** one dev server runs from a deleted worktree of this repo, and another from a live folder
- **THEN** only the first is stopped

### Requirement: The next session reports what the tidy-up did
The next session start SHALL print one line naming what the last tidy-up closed, stopped, freed, and left open with the reason, then SHALL NOT print it again. A tidy-up that did nothing SHALL print nothing.

#### Scenario: One report, once
- **WHEN** the last tidy-up closed 2 workspaces and skipped one with unsaved work
- **THEN** the next session start prints one line naming both, and the session after prints no such line

### Requirement: Scratch files live in a git-ignored folder in the checkout
Agents SHALL put throwaway files in a `.scratch/` folder at the checkout's root, not in the system temp folder. Git SHALL ignore it in every installed repo, so scratch files never show as changes, never block a close, and never get committed. A workspace's scratch folder SHALL go away when the workspace closes.

#### Scenario: Scratch goes away with the workspace
- **WHEN** an agent writes a brief to `.scratch/` in a workspace and the workspace is later closed
- **THEN** the folder is gone with the worktree, and the close was not refused for it

#### Scenario: Scratch in the main checkout
- **WHEN** the primary checkout's `.scratch/` holds a 2-day-old file and a file from this morning
- **THEN** the tidy-up deletes only the 2-day-old file

<!-- end specs/workspace-cleanup/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 41515 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-27-clean-up-after-itself</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-27-clean-up-after-itself">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-clean-up-after-itself</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Over time the machine runs out of memory. Chats and workspaces stay open after their work is published: 15 chats held about 2.6 GB, some idle for 4 days. App servers kept running after their workspace was deleted. Temp space, which is memory on this machine, filled to the last 4 MB, partly with thousands of leftover test folders and scratch files. Nothing WongStack starts is ever put away.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>After you publish, you can close the workspace.</b> The closing question after a publish gets a new choice, <i>Close this workspace</i>. Pick it and the chat finishes its reply, then closes the chat and workspace. It also stops anything the work left running and deletes its scratch files. The chat stays readable in Paseo's archived list. When no more work is waiting, closing is the recommended choice.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">It's live: &lt;link&gt;</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">Click here to see the plan: …</span>

<span class="ln" data-note="item-1-line-4" tabindex="0">What next?</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">1. Close this workspace (Recommended)</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">2. Walk the live app</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">3. Stop here</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">        │ 1</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">        ▼</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">reply ends ─▶ chat closes</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">            ─▶ servers stopped</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">            ─▶ scratch deleted</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Each new session tidies up in the background.</b> Starting a session never waits for it. At most every few hours, WongStack closes chats idle 3+ days whose work is all saved, stops app servers whose workspace is gone, and deletes its own temp folders and scratch files older than a day. It never touches another project's files, and never closes a chat with unsaved work.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">session starts</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">   │ (does not wait)</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">   ▼</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">tidy-up ── idle 3+ days, saved? ─▶ close</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">   │        unsaved? ─▶ leave, tell you</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">   ├─ server with no workspace ─▶ stop</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">   └─ old WongStack temp ─▶ delete</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>You hear what it did, once.</b> The next session opens with one line, such as <i>Closed 2 idle workspaces; left &quot;Weekly plan&quot; open: it has unsaved work.</i> Nothing is said when nothing happened.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Scratch files live in the workspace.</b> Agents put throwaway files in a <code>.scratch/</code> folder inside the workspace, which git ignores, not in the temp folder. They sit on disk, not in memory, and they go away with the workspace. In the main checkout, which never closes, the tidy-up deletes scratch files older than a day.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> other projects' temp files (the biggest part of today's temp use), Paseo itself, and chats outside this repo's workspaces. Closing is never forced on a published chat: it stays a choice.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether to close a published chat and workspace on its own → chose to offer it as a choice in the closing question after publishing.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked what the sweep does with chats never published but idle a long time → chose to close those idle 3+ days when nothing is unsaved.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked how far cleanup reaches → chose only WongStack's own leftovers.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether to clean today's leftovers by hand now → chose yes; stopped the 6 orphaned app servers and deleted about 4,300 old test folders from temp (4 MB free became 288 MB). No chat was closed.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <i>Close this workspace</i> is recommended only when no next work is waiting; otherwise opening the next part stays first, because the existing next-work rule already recommends it.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the close waits for the chat's reply to end before archiving, through a detached helper that runs <code>paseo wait</code> then <code>paseo workspace archive</code>, because archiving mid-reply would kill the chat before it answers.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: &quot;saved&quot; means a clean working tree and no commits missing from the remote (pushed or merged), because <code>/continue</code> can pick pushed work back up from its branch.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: after closing a published workspace, its local branch is deleted only when its pull request merged at the same commit, because <code>paseo workspace archive</code> leaves the branch behind and a squash merge hides whether it is safe.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: &quot;old&quot; temp means untouched for over a day, and only folders whose name starts with <code>wong-</code> count, because other tools share the temp folder and a name prefix is the only safe ownership mark.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: stray servers are processes of this user whose working folder is a deleted worktree of this repo, stopped with a polite signal, because that is exactly what today's leak looked like and nothing live can match it.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the sweep runs detached at most every 6 hours, because session start has a 5-second limit and several sessions start per hour.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: stopping stray servers works on Linux only (it reads <code>/proc</code>), and is skipped elsewhere, because macOS has no <code>/proc</code> and the leak was seen on a Linux host.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether scratch files belong in a git-ignored folder inside the workspace, not the temp folder → chose <code>.scratch/</code> in the workspace: it is on disk, not in memory, it goes away with the worktree, and writing there needs no permission prompt.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the <code>.scratch/</code> ignore line ships through the existing <code>.gitignore</code> fragment that <code>/wong-sync</code> re-offers, and <code>tidy.mjs scratch</code> adds it to the repo's local exclude file when git does not already ignore the folder, because setup already guards <code>.env</code> the same way.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the tidy-up counts a squash-merged branch as saved too, asking <code>gh</code> only when the tree is clean but commits are on no remote, because a shipped worktree's commits are on no remote after a squash merge and would otherwise never close.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a workspace with no chat left takes its branch's last change time as its idle clock, because there is no chat activity to read.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: leftover processes are stopped only under Paseo's own worktrees folder (<code>PASEO_HOME</code> can move it), because that is where every workspace this repo opens lives, and tests can then stop a real process.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the shared memory-hook test setup sets <code>WONG_TIDY=0</code>, so no existing hook test sweeps the machine's real temp folder; the new hook tests switch it on.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: every test temp folder takes <code>wong-test-</code> from its helper, so the memory tests' <code>wong-memory-*</code> folders become <code>wong-test-memory-*</code>.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: task 4.2's save is <code>/ship</code>'s one checkpoint, because the change ships in the same run; a failing gate stops the merge.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: ships as a minor release, because it adds behavior and removes nothing.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distilled: no repeatable fact. The change and branch had no live facts; the scratch-file rule this change teaches is written in <code>wiki/development/the-change-loop.md</code>.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archive checkpoint: <code>tidy.mjs</code> (<code>scratch</code>, <code>close</code>, <code>sweep</code>), the session-start tidy-up and report line, <i>Close this workspace</i> in <code>/ship</code>'s closing question, the <code>.scratch/</code> ignore line, and <code>wong-test-</code> temp prefixes landed; 18 tidy tests and 125 affected tests pass locally. Merged <code>main</code> after #164 (26.6.0): <code>session-start.mjs</code> keeps both the tidy-up and the branch-worker line, and this entry sits on top of the changelog, numbered 26.7.0.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as a plain request to update the plan ──
  function notesText() {
    const lines = ['Update the plan ' + CHANGE + ' with these notes from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat to update the plan.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
