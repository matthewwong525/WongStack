# The build loop stands on its own: no memory inside it, and no /continue

**Status:** in-progress
**Branch:** unbiased-racoon
**Open questions:** none

## Why

The build commands reach into the memory plugin: two read it, the closing command writes lessons to the wiki, and the save step talks about it. Memory already does that work by itself, so the loop does it twice and breaks in a project with no memory. One command also adds little: resuming only picks a change back up before the build. You asked for each plugin to stand on its own.

## What Changes

- **Seven commands, not eight: `/continue` goes.** `/save` stays for when you want it, and still runs inside the others: after a preview, before a publish, and when you close with unfinished work. To pick up saved work in a new chat, type `/apply` and its name, or `/apply` alone to choose from a list. It switches to the change's branch first, and still asks before it runs work new to this computer.
  ```mermaid
  flowchart TD
    A["/apply name"] --> B["/apply builds"] --> C["/ship"] --> D["/close"]
    S["/save"] --> K(("save"))
    B -.-> K
    C -.-> K
    D -.-> K
  ```
- **Closing a chat only keeps unfinished work and closes it.** It no longer reads the chat for lessons or edits the wiki. With memory installed, its daily tidy puts lasting lessons on the wiki, as it does today for chats closed another way.
- **No build command calls memory.** With memory installed, memory still brings what it knows at the start of each chat and when a message names a topic, and it records each chat when it ends. Without it, the loop works the same.
- **A half-done errand is memory's to pick up, not the loop's.** Memory's start-of-chat note lists open errands; say *pick up the supplier email* and the agent carries on.
- **The update removes the old resume command from your project.**

**Non-goals:** the browser, daily and access plugins' shape and links (workspace *Same shape for browser and daily*); plugin docs that link WongStack's own wiki pages (workspace *Plugin docs stand alone*); how `/verify` reads memory's area receipts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `loop-module`: seven commands; a new requirement that no loop command reads or writes memory.
- `workspace-cleanup`: `/close` keeps work and closes the workspace; its wiki update is removed.
- `change-loop`: non-code verbs drop `/save` and `/continue`; the non-code thread requirement leaves the loop (memory owns it); the review before a switch moves to `/apply`.
- `openspec-workflow`: resuming by name or pull request moves from `/continue` to `/apply`.
- `multi-part-workspaces`: an unattended run names the other parts in its report; resuming from a busy workspace is `/apply`'s.
- `delivery-gate`: the GitHub precondition check names `/apply`'s pick-up, not `/continue`.
- `staging-walkthrough`: `/continue` leaves the list of verbs that never walk.
- `memory`: "The verbs read memory where they decide" and the stale "Save is the deliberate capture point" are removed.
- `wiki-dream`: `/close` no longer places facts.
- `knowledge-center`: the daily tidy and `/dream-memory`, not `/close`, are the catch-up.

## Impact

- `.agents/plugins/loop/skills/close/SKILL.md`: the wiki section goes; routes keep and discard stay.
- `.agents/plugins/loop/skills/save/SKILL.md`: the memory line goes.
- `.agents/plugins/loop/skills/continue/` removed; `pickup.mjs` moves to `.agents/plugins/loop/skills/apply/scripts/`; a new `apply/references/pick-up.md` holds resolve, switch and recap.
- `.agents/plugins/loop/skills/apply/SKILL.md`, `explore/SKILL.md`, `plan/references/new-workspace.md`, `save/references/{preconditions,checkpoint-evidence}.md`, `save/scripts/render-pr-body.mjs`, `loop/README.md`.
- Callers of the moved script and old name: `.agents/daily/profile.mjs`, `.agents/loop/step-title.mjs`, `.agents/memory/{areas.json,profile.mjs}`, `.agents/plugins/memory/references/writing-facts.md`, `.agents/skills/wong-sync/references/payload-files.json`, `scripts/retired-names.json`, `scripts/fixtures/context-baseline.json`.
- Docs: `AGENTS.md`, `wiki/wiki-style.md`, `wiki/development/{the-change-loop,memory,README}.md`, `wiki/agent-knowledge-center.md`, `wiki/stack/{employee-project,artifacts-route}.md`, `wiki/development/first-day/make-a-change.md`.
- Tests: `pickup.test.mjs`, `checkpoint-helpers.test.mjs`, `checkpoint.test.mjs`, `step-title.test.mjs`, `context-measurement.test.mjs`, `cli-conventions.test.mjs`, `install-path.test.mjs`, `workspace.test.mjs` briefs.
- `CHANGELOG.md`: a `major` entry, since a typed command goes away.
- Other parts run in their own workspaces; whichever publishes second catches up on shared files such as `wiki/development/the-change-loop.md`.

## Decision log

- **2026-11-12** — Asked who resumes half-done errands once the build commands drop memory → the person questioned keeping `/save` and `/continue` at all.
- **2026-11-12** — Asked what happens to `/save` and `/continue` → chose to hide `/save` (its steps stay inside `/apply`, `/ship` and `/close`) and drop `/continue` (`/apply <name>` picks up saved work).
- **2026-11-12** — Asked which other cross-plugin links to fix → chose all three: one folder shape for browser and daily, the browser and access links, and plugin docs that don't need WongStack's wiki.
- **2026-11-12** — Asked whether to split the work → chose three parts: this chat does the build loop; two new workspaces plan the rest.
- **2026-11-12** — Assumed: `/close` drops its wiki step too, because reading the chat for lessons is memory's job and its daily tidy already places them on the wiki.
- **2026-11-12** — Assumed: `/apply` with no change named and none in this chat lists saved changes and asks, because that was `/continue`'s menu and a cold chat needs it.
- **2026-11-12** — Assumed: memory's `continue` step tag leaves the profile, and existing threads keep it, because no step starts under that name any more.
- **2026-11-12** — Assumed: a `major` release, because people who type `/continue` must learn the new way.
- **2026-11-12** — Asked, on review, to keep `/save` visible in case someone wants it → `/save` stays a typed command; only `/continue` goes. Then chose to publish.
- **2026-11-12** — Assumed: the context baseline is not re-recorded, because a re-record makes `measure-context.mjs --check` fail at once (totals must fall below it); only the `cold-resume` route now reads `apply/references/pick-up.md` in place of `continue/SKILL.md`.
- **2026-11-12** — Assumed: the build helper's brief drops its memory `pull` and `areas` calls too, so no loop file calls memory; memory's edit hook still shows an area's facts before the first edit.
- **2026-11-12** — Assumed: three more spec deltas (`change-loop` chat names, `delivery-gate` app-copy save, `memory` capture) drop `/continue`, so no live spec names it once archived.
- **2026-11-12** — Assumed: the loop module goes to 2.0.0 and memory to 2.1.1 (its `writing-facts.md` line), by the module version rule; Daily's `LOOP_STEPS` keeps its `continue` key, left to the Daily workspace, as a typed `/continue` there still names no step.
- **2026-11-12** — Assumed: `wiki/development/wiki-dream.md`, `first-day/use-skills.md`, and the `close` area's definition drop `/close`'s wiki step too; `document-recall.test.mjs` now checks that `/explore` calls no memory.
- **2026-11-12** — Assumed: task 5.2 checked by running the moved `pickup.mjs` in a test repo with no memory, where it held back a branch new to that computer and asked first, and by reading `/close` and `/apply` for memory, finding none. A real `/close` was not run, because it would close this workspace.
