# Build loop chat names start with an emoji

**Status:** ready-to-ship
**Branch:** build-loop-emoji-prefixes
**Open questions:** none

## Why

A chat's name starts with a capital word for its step, such as `PLAN: Fix the invoice total`. The word takes much of a short chat list, and it is slow to see at a glance. Every other typed skill also puts its name in front, such as `VERIFY:` or `SCHEDULE:`, so the start of a name no longer tells you where the build stands.

## What Changes

- **A build loop step shows as one emoji and a space.** No word and no colon. The task words after it stay the same.
  | Step | Before | After |
  | --- | --- | --- |
  | Explore | `EXPLORE: Fix the invoice total` | `🔍 Fix the invoice total` |
  | Plan | `PLAN: Fix the invoice total` | `📝 Fix the invoice total` |
  | Build | `APPLY: Fix the invoice total` | `🔨 Fix the invoice total` |
  | Publish | `SHIP: Fix the invoice total` | `🚀 Fix the invoice total` |
  | Done | `DONE: Fix the invoice total` | `✅ Fix the invoice total` |
- **Other skills no longer rename the chat.** Typing `/verify`, `/schedule`, or another skill outside the build loop keeps the name the chat has.
  ```text
  Before: /verify the invoice  →  VERIFY: The invoice
  After:  /verify the invoice  →  (name stays)
  ```
- **Old names still read right.** A chat named the old way, such as `PLAN: Fix the invoice total` or `VERIFY: The invoice page`, gets the emoji at its next step, with the same task words.

**Non-goals:** new marks for `/save`, `/verify` or `/close`; a setting to choose the emojis.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-loop`: "A chat's name shows the step that runs now" uses an emoji and a space, not a capital word and a colon. "A chat's name changes only when a step starts or a command is typed" drops the rule that another skill's typed command shows its name in capitals; that command keeps the name.

## Impact

- `.agents/plugins/daily/scripts/chats.mjs`: the step-to-emoji map, one shared title function, and the strip pattern that also reads the emojis.
- `.agents/loop/step-title.mjs`: titles from the shared function; a typed non-loop skill gives no step.
- `.agents/plugins/daily/scripts/chat-list.mjs`: the chat list's fallback name uses the shared function.
- `scripts/tests/step-title.test.mjs` and the chats tests: expected names.
- `wiki/development/the-change-loop.md`: the chat-name paragraph.
- `CHANGELOG.md`: a `## Next (minor)` entry.

## Decision log

- **2026-11-13** — Asked (in the request) which skills mark a chat's name → chose only the build loop steps; other skills keep the chat's name.
- **2026-11-13** — Asked (in the request) the mark's form → chose the emoji and one space, no colon and no word.
- **2026-11-13** — Assumed: 🔍 explore, 📝 plan, 🔨 apply, 🚀 ship, ✅ done, because each is a common picture for its step and one character wide in most chat lists.
- **2026-11-13** — Assumed: the step words stay inside the code (`set PLAN`, the saved state), and only the shown name changes, because skills, the Daily chat list and tests read those words.
- **2026-11-13** — Assumed: old word names are still stripped, because chats named before this release must keep their task words.
- **2026-11-13** — Assumed: Daily's `VERSION` rises to 4.1.0, a minor step, because its `chats.mjs` and `chat-list.mjs` change and the module-version check needs a new number.
- **2026-11-13** — Assumed: the plan-first and safe-changes attachments keep their text with `checked:` set to today, because neither names a chat's name.
- **2026-11-13** — Assumed: the `/verify`-keeps-the-name half of task 3.2 is shown by feeding the Claude hook `/verify x` in this Paseo chat, because a helper can not type into the chat; the hook wrote nothing and the Paseo name stayed `🔨 Build loop chat names start with an emoji`.
- **2026-11-13** — Assumed: a saved step with no mark, such as `VERIFY` from before this release, shows its task words alone, because the review found it showed `undefined <task>` and the plan says old names keep their task words.
- **2026-11-13** — Archived and saved for release 61.2.0 on branch `build-loop-emoji-prefixes`; the shared local check turn was busy, so lint ran directly and passed, and CI is the gate.
