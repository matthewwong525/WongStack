# Shorter instructions for the assistant

**Status:** in-progress
**Branch:** shorten-skill-instructions
**Open questions:** none

## Why

The assistant reads its instructions for a task before it does the task. They have grown to about 29,000 words: 13,500 in the main instruction pages and 15,700 in the pages they point to. Much of that is the same rule written in several places, reasons already explained in the wiki, and extra examples. Every word costs time and money on every task, and a rule written twice can drift apart. You queued this on 2026-09-27, right after the dependency update.

## What Changes

- **The same rules, in fewer words.** Every instruction page is rewritten in the plain, short style the wiki already uses. Nothing the assistant does changes: every rule, command, and check stays.
  ```text
  before                 after
  13,500 words (main)    ≤ 9,500
  15,700 (linked pages)  ≤ 12,500
  ```
- **A rule lives in one place.** A rule repeated across several skills is written once, and the others point to it. The reasons behind a rule stay in the wiki, not in the instructions.
- **You can check the result.** The plan records the word counts before and after, and every automatic check still has to pass.

**Non-goals:** No rule is dropped or changed. The wiki, the `CLAUDE.md` block, and the specs are left alone; thinning the specs is the next queued change. The browser tool's instructions come from its maker and stay as they are.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The rewrite keeps every behavior the specs describe, so the change sets `skip_specs: true`.

## Impact

- Every `.agents/skills/*/SKILL.md` except `agent-browser` (vendored), and every `.agents/skills/*/references/*.md` (core and pack payload; `update-dependencies` is meta-only).
- `VERSION` → 25.10.0 and a `CHANGELOG.md` entry. `/wong-sync` in an installed repo brings every skill; a skill someone adapted locally shows as a conflict to merge.
- Lands after `update-dependencies` (25.9.0), on its own branch from `main`.

## Decision log

- **2026-09-27** — Asked to do the next two queued items now → this is the second: shorten the skills' instructions (queued 2026-09-27, memory #283).
- **2026-09-27** — Assumed: keep every behavior and cut only words, because the request was shorter instructions, not fewer rules, and a dropped rule reaches every installed repo.
- **2026-09-27** — Assumed: scope is every skill's `SKILL.md` and `references/*.md`, because references load with their skill; scripts, the wiki, `AGENTS.md`, and `openspec/specs/` are out.
- **2026-09-27** — Assumed: leave `agent-browser/SKILL.md` untouched, because it is vendored from its upstream and a local edit would be lost on its next update.
- **2026-09-27** — Assumed: targets of at least 30% fewer words in the `SKILL.md` files and 20% in references, because a first read found repeated boilerplate and asides at about that rate; the build reports the actual numbers.
- **2026-09-27** — Assumed: every heading another page links to keeps its exact text, because 98 distinct anchors point into these pages and the link check fails on a renamed one.
- **2026-09-27** — Assumed: a minor release (25.10.0), because every installed skill changes and locally adapted skills will need a merge.
