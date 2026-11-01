# Proposal

**Status:** ready-to-ship
**Branch:** bring-wongos-changes-to-wongstack
**Open questions:** none

## Why

WongOS runs on WongStack and keeps a few small fixes that every install can use. They sit on WongOS's list of differences from WongStack. WongStack is the base, so these fixes go up to WongStack, and WongOS then uses WongStack's files as they are.

## What Changes

- **Code can open a chat with a tag and find it again.** The workspace opener takes a tag such as `job=42`, and an app's own script can call it directly. So a tool that opens chats can later find the chats it opened.
  ```mermaid
  flowchart LR
    tool["your script"] -->|"open, tag job=42"| chat["new chat"]
    tool -->|"list chats tagged job=42"| chat
  ```
- **A new workspace keeps your chat settings.** WongStack already copies your keys into each new workspace. It now also copies your local chat settings, such as the commands you allowed, so a new chat does not ask for them again.
- **The app opens like a real app from a phone's home screen.** Add it to the home screen, and it opens full screen with no browser bar.
- **Two lessons for checks.** A kept check points at sample data, not at a record that a check made: a fresh rebuild removes that record, and the check fails with *not found*. A check re-reads a date or time field after it types into one: the browser tool can say the typing worked while the field stays empty.
- **Two more tests.** The first import of people writes no keys and no roles, and Admin is the only role. On a phone, the keyboard's Go key sends the starter app's form.

Non-goals: no Email app, linked tasks, calendar, notes or news; no WongOS name, route or key comes up; the network-log lesson stays out, because WongStack already forbids saving request headers; the fork-preview fix stays out, because WongStack deploys no preview for a fork's pull request.

## Capabilities

### New Capabilities

### Modified Capabilities
- `multi-part-workspaces`: a script may open a workspace with a tag, through the same opener.
- `paseo-defaults`: the worktree setup also copies the local chat settings file.
- `app-scaffold`: the starter app opens full screen from a phone's home screen.

## Impact

- `.agents/skills/schedule/scripts/workspace.mjs`, `scripts/tests/workspace.test.mjs`.
- `.agents/skills/ship/scripts/worktree-secrets.mjs` and its test.
- `app/index.html`, `app/src/apps/hello/App.test.tsx`, `app/worker/employee-access/start.test.ts`.
- `wiki/development/kept-checks.md`, `.agents/skills/verify/references/walkthrough.md`.
- `CHANGELOG.md` (a `minor` entry). After the release, the next WongOS sync removes about eight entries from its difference list.

## Decision log

- **2026-10-29** — Asked what to bring from WongOS first → chose the small general fixes as one release.
- **2026-10-29** — Asked whether linked tasks and the Email app go up too → chose neither: the daily's one to-do per chat already tracks the day's tasks.
- **2026-10-29** — Assumed: the local chat settings copy goes in the existing secrets copy script, not in a second inline command, because one setup step is easier to test and read.
- **2026-10-29** — Assumed: the date-field lesson goes in `/verify`'s walk guide, because the walkthrough wiki page is at its 3,000-word limit.
- **2026-10-29** — Assumed: the starter app keeps its title *Your apps*; only the home-screen settings come up.
- **2026-10-29** — Assumed: a `minor` release, because a script gains a new option.
- **2026-10-31** — Assumed: saved as a plan only at /close, so the build waits for Build it, because Matthew has not chosen to build yet.
- **2026-11-01** — Assumed: the opener's tag is told in the release notes, not in `required-tools.md`, because that page is at its 3,000-word limit.
- **2026-11-01** — Asked whether to keep the fork-preview fix, which does nothing because WongStack's deploy job runs only on a push → chose to drop it; WongOS's next sync drops its `deploy.yml` line as drift.
- **2026-11-01** — Built the five remaining fixes after WongStack 45.3.0 came in; local checks pass, and a preview is up. Next: CI, then publish.
