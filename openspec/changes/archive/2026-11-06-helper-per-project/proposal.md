# One background helper per project

**Status:** ready-to-ship
**Branch:** helper-per-project
**Open questions:** none

## Why

One background helper serves every project on a computer. It runs the copy of the helper from whichever project holds the newest code. That copy checks your approval of a schedule with its own project's sign-in only. So when two projects share a computer, and one of them takes a newer helper, the helper refuses the other project's schedules as not approved, though you approved them. This happened on a server with two projects: one project's update took over the helper, and the other project's hourly schedules were refused until the fix.

## What Changes

- **Each project gets its own helper.** It runs that project's own code and sign-in, and serves only that project's app, schedules and inbox items. Another project's update can no longer stop your schedules.
  ```mermaid
  flowchart LR
    subgraph Before
      h1["one helper: project B's copy"] --> a1["project A: refused"]
      h1 --> b1["project B: runs"]
    end
    subgraph After
      h2["project A's helper"] --> a2["project A: runs"]
      h3["project B's helper"] --> b2["project B: runs"]
    end
  ```
- **Nothing to approve again.** Your approvals stay in one file for all projects, because each approval names its app. The project's helper copies the list of runs that already started, so a run does not start twice and no schedule runs sooner than it may.
- **Each inbox tap arrives once.** A tap on a project's item goes only to that project's helper. Two helpers never send the same tap to a chat.
- **The old shared helper keeps serving projects not yet updated.** A project leaves it when you install the project's own helper. A shared helper on current code skips each project that has its own helper.

Non-goals: change how you approve a schedule; make the private-link page server one per project.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `live-line`: the background helper becomes one per project; each serves only its own project's app, schedules and inbox items, and a project with its own helper leaves the old shared one.

## Impact

- **Code:** `.agents/skills/hand-over/scripts/{helper.mjs,reply-link.mjs,lib/computer.mjs,lib/helper-log.mjs}`; `.agents/skills/schedule/scripts/{schedule.mjs,lib/approvals.mjs}`; their tests in `scripts/tests/`.
- **Docs:** `wiki/stack/live-line.md`.
- **Each install:** `helper.mjs install` once, at a quiet minute, in each project that had the shared helper. A disk drop-in for `wongstack-helper.service` needs the same for `wongstack-helper@.service`.

## Decision log

- **2026-11-06** — Chose one helper per project over one helper that asks each project for its sign-in, because the shared helper still lets one project's code run another project's schedules.
- **2026-11-06** — Assumed: approvals (`approved.json`) and the computer id stay shared, because approvals already name app, person and schedule, and the app binds schedules to one computer id.
- **2026-11-06** — Assumed: the private-link page server stays shared, because refused schedules do not go through it; its own version race is a separate fix.
- **2026-11-06** — Assumed: `helper.mjs start` in a project with no helper of its own keeps the shared helper going as before, and `uninstall` there changes nothing, so a new copy never stops another project's helper.
- **2026-11-06** — Assumed: a project's own helper repeats the leave step each round and within a second of a change to `folders.json` or the shared `items/`, because an older chat may list the project with the shared helper again.
- **2026-11-06** — Assumed: `PROTOCOL` goes to 14, and `install` needs the main folder at 14 or later, so a work copy on older code answers `HELPER=outdated`.
