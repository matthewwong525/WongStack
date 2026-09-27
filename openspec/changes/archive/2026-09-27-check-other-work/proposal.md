# Planning checks for other work first

**Status:** ready-to-ship
**Branch:** check-workspaces-startup
**Open questions:** none

## Why

Two chats can plan the same thing at once without knowing it. Today "Make install easier" and a plan for the cloud's server installer sit in two workspaces, both about installing, and neither knows about the other. Three parts of one audit once all claimed the same version. Git catches clashing files only at publish, after both are built. You want each new piece of work to look around first, so you don't build twice or in opposite ways.

## What Changes

- **Planning looks at the other work first.** When `/explore` or `/plan` starts on work that changes the repo, it lists what else is going on in this repo: the other workspaces on this computer, the plans in them (saved or not), and open pull requests, which also show teammates' work. It compares them to your request.
  ```text
  your request
      │
      ▼
  other workspaces ─┐
  their plans ──────┼─▶ same area?
  open pull requests┘      │
                     no ───┴─── yes
                     │           │
                   quiet    ask you
  ```
- **You hear about an overlap only when there is one.** It names the other work and why it overlaps, then asks: keep going here, work there instead, or narrow this one. When nothing overlaps, it says nothing.
  ```text
  "Make install easier" is also
  changing the installer.
   1. Keep going here (Recommended)
   2. Work there instead
   3. Narrow this one
  ```
- **It stays in its lane.** It reads only this repo, never your other projects. It skips automatic dependency updates and workspaces with nothing left to publish. If GitHub can't be reached, it checks this computer and says so in one line. It runs once per piece of work, so a plan right after an exploration doesn't repeat it.

Non-goals: no check at session start; no blocking or locking another workspace; no message sent to another workspace's chat.

## Capabilities

### New Capabilities

- `other-work-check`: before planning repo work, the agent lists this repo's other active work (local worktrees and Paseo workspaces, their active OpenSpec changes, open non-bot pull requests), names real overlaps, and asks how to proceed.

### Modified Capabilities

None.

## Impact

- New `.agents/skills/explore/scripts/other-work.mjs` (+ `scripts/tests/other-work.test.mjs`): prints this repo's other active work as JSON. Node built-ins; reuses `routine/scripts/lib/paseo.mjs` and `memory/scripts/lib/primary-root.mjs`.
- `.agents/skills/explore/SKILL.md`: a *Check for other work* step before the first question, and in bounded mode.
- `.agents/skills/plan/references/new-workspace.md`: *Ask once* names the overlap ask's options.
- `wiki/development/the-change-loop.md`: one sentence under *Several parts, several workspaces*.
- `scripts/tests/cli-conventions.test.mjs` lists the new script.
- `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-09-27** — Asked when the check should run → chose when planning: in `/explore` and `/plan`, once the task is known, speaking only on an overlap.
- **2026-09-27** — Asked how far it should look → chose this computer plus open pull requests.
- **2026-09-27** — Asked what happens on an overlap → chose name it and ask: keep going, work there instead, or narrow this one.
- **2026-09-27** — Assumed: only this repo's worktrees are read, found by a shared git folder, because Paseo lists every project on the computer, private ones included.
- **2026-09-27** — Assumed: git's worktree list is the base and Paseo adds names and whether an agent is running, because worktrees opened without Paseo can hold work too, and the check should work without Paseo.
- **2026-09-27** — Assumed: a workspace counts when it has unsaved files, commits not on the default branch, an active plan, or a running agent, because a freshly opened workspace's name is often the only sign of what it's for.
- **2026-09-27** — Assumed: pull requests by bots are skipped, and a pull request whose branch is already a local workspace is folded into that workspace, because a dependency bump is never a planning conflict and one piece of work should show once.
- **2026-09-27** — Assumed: the script gathers facts and the agent judges overlap, because overlap is about meaning (both touch the installer), which file lists alone can't tell.
- **2026-09-27** — Assumed: the script lives in `explore/scripts/`, because `/explore` owns the step and `/plan` reaches it through bounded mode.
- **2026-09-27** — Assumed: work that changes no repo file (errands, research) skips the check, because it can't clash with a plan.
- **2026-09-27** — Assumed: a minor release, because every install gets a new planning step.
- **2026-09-27** — Assumed: a worktree whose only unpublished changes are change folders already archived on the default branch counts as published, because a squash merge leaves the branch's old commits "ahead" of main, and two shipped worktrees here otherwise showed as live work.
- **2026-09-27** — Built: `explore/scripts/other-work.mjs` with 13 tests, the *Check for other work* step in `/explore` (bounded mode too), the overlap ask in `new-workspace.md`, one sentence in the change loop, and the changelog entry. Run here, it listed only "Make install easier" and nothing from other projects.
- **2026-09-27** — Distilled: no repeatable fact; the session wrote none, and the squash-merge rule lives in the script and this log.
- **2026-09-27** — Archived and checkpointed for merge by `/ship`.
