# Every plan prints its link, and "What next?" is multiple choice

**Status:** ready-to-ship
**Branch:** explore/why-multiple-choice
**Open questions:** none

## Why

The assistant asks you questions as tap-to-answer choices, except the last one in a reply. "What next?" after a plan, a report, or a finished task comes as a typed numbered list, so you have to type "1" to answer it. The rule for that last question says to use the same format as every other question, but never says to use the same tool, and its examples read like text to write out.

The plan's link has the opposite problem: only the plan step knows to print it. When a plan is made or changed some other way, the reply can end without the link, and the review page is hard to find.

## What Changes

- **"What next?" becomes tap-to-answer.** The report and the plan link stay as text. The question under them becomes a choice you tap, like every other question.
  ```text
  Before                After
  ──────                ─────
  The plan is ready.    The plan is ready.
  Click here: [plan]    Click here: [plan]

  What next?            ┌──────────────────┐
  1. Build it now       │ What next?       │
     (Recommended)      │ ○ Build it now   │
  2. Change the plan    │   (Recommended)  │
  3. Stop here          │ ○ Change the plan│
                        │ ○ Stop here      │
  (you type "1")        │ ○ Other…         │
                        └──────────────────┘
  ```
- **Every plan prints its link.** Whenever the assistant makes or changes a plan, the reply prints *Click here to see the plan:* and the link, on its own line, just above the question. It does this whichever command made the plan: planning, building, updating WongStack, or your notes from the review page. It prints the link even when the work carries on without stopping. This becomes a standing rule, not a step only the plan command knows.
- **Where there is no tap-to-answer tool, nothing changes.** In a chat with no such tool, the assistant still writes the numbered list and waits.

Non-goals: no change to what the choices are, how many there are, or when the assistant asks; no command is renamed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `structured-asks`: the next-step requirement names the host question tool, by the same order as every other ask, and puts the report and review link in chat text before it. A new requirement: a reply that makes or changes a plan prints its review link, whatever verb made it.

## Impact

- `.agents/skills/explore/references/asking-the-user.md`: one line in *End every reply with the next step*, the finished-plan example reworded so the link is text and the choice is the question, and a new *Print the plan's link* rule that owns the link line.
- `AGENTS.md` (`CLAUDE.md` is its symlink): one line in the `WONG-STACK` block that states the link rule and links the shared page.
- `.agents/skills/plan/SKILL.md` *Finish*: links the shared rule instead of owning the *Click here* wording.
- `VERSION` 25.10.1 → 25.11.0 and a `CHANGELOG.md` entry.
- No code, script, or test changes. Installed repos get it through `/wong-sync`; nothing to migrate.

## Decision log

- **2026-09-27** — Asked whether to fix the typed "What next?" menus → chose plan the fix.
- **2026-09-27** — Assumed: the fix is one line in the shared ask page plus the matching rule, because `/plan`, `/apply`, `/save`, `/continue`, `/ship`, `/verify`, and `/improve` all link that page for their closing question.
- **2026-09-27** — Asked (review) whether the plan link should print only in `/plan` → chose a standing rule: every reply that makes or changes a plan prints the link, whatever made it.
- **2026-09-27** — Assumed: the shared ask page owns the link rule, the `WONG-STACK` block states it in one line, and `/plan`'s *Finish* links it, because the block is always loaded and the page is the one place the wording lives.
- **2026-09-27** — Assumed: the link stays in the chat text above the question, not inside the tap-to-answer card, because a card may not make links clickable.
- **2026-09-27** — Assumed: a minor release, 25.10.0, because it adds a standing rule; installed repos need no migration. The unsaved setup change also picked 25.10.0, so whichever publishes second takes the next number.
- **2026-09-27** — Assumed: the report and the plan link go in the chat text just before the question, because a tap-to-answer card holds short choices, not a report.
- **2026-09-27** — Built: the *Print the plan's link* section and the tool line in `asking-the-user.md`, the `WONG-STACK` block line, and `/plan`'s *Finish* link. The setup change shipped first as 25.10.0 and a fix as 25.10.1, so this release is renumbered 25.11.0 on top of `main`.
- **2026-09-27** — Distilled: no repeatable fact for the wiki. The one preference (print the plan link from a shared rule) is now the rule itself.
- **2026-09-27** — Archived after CI passed on the pull request (task 3.3); this is the archive checkpoint.
