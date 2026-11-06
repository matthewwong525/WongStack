# The chat name waits for a step, and a typed command names it at once

**Status:** ready-to-ship
**Branch:** stop-auto-plan-title
**Open questions:** none

## Why

Today a chat's name says PLAN as soon as you send your first message, even when you only ask a question. Many of your chats show a PLAN name but never made a plan. Also, when Paseo names a chat from your first message, the plan's own title never replaces it. So the name is a long cut-off copy of what you typed. And when you type a command such as `/explore` or `/verify`, the name does not show it.

## What Changes

- **A question or errand gets no step in its name.** The step word comes only when a step starts: PLAN when a plan starts, APPLY when a build starts, and so on. A chat that only answers you keeps the name it has.
  | Your first message | Name today | Name after this change |
  |---|---|---|
  | what .com domain should i get? | PLAN: what .com domain should i get? | what .com domain should i get? |
  | fix the invoice total | PLAN: Fix the invoice total | PLAN: Fix the invoice total, when the plan starts |
- **A command you type names the chat at once.** `/explore` shows EXPLORE, and `/plan` or `/improve-code` shows PLAN, as soon as you send it. Another command shows its own name in capitals: `/verify` shows VERIFY, `/save` shows SAVE, and `/close` shows CLOSE. `/apply`, `/continue`, and `/ship` still wait for the step that starts, because they can plan or build first. A command that a step runs for you, such as the save inside a publish, does not change the name.
  | You type | Name at once |
  |---|---|
  | /explore fix the invoice total | EXPLORE: Fix the invoice total |
  | /verify the invoice page | VERIFY: The invoice page |
  | /ship | no change until the step starts |
- **A plan's title replaces a name copied from your first message.** When Paseo names the chat from the start of your first message, the chat now treats that name as your message's words. The plan's title then replaces it. A name that you gave the chat stays.
  | Chat name before the plan | Name today | Name after this change |
  |---|---|---|
  | Also when i start a conversation it immediately goes to plan | PLAN: Also when i start a conversation it immediately goes to plan | PLAN: The chat name waits for a step |
  | Invoice fixes, a name you gave | PLAN: Invoice fixes | PLAN: Invoice fixes |
- **Where you see the change:**
  | Where the chat runs | When the step shows |
  |---|---|
  | Paseo or Codex | at once, when you type a command or a step starts |
  | Claude Code alone | at once for a command you type; at your next message for a step that a command starts later, such as APPLY |

Non-goals: no new words for `step-title.mjs set`, no change to what each step may do, and no rename of chats that already have a name.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-loop`: adds a requirement that a chat's name gets a step word only when a step starts or a command is typed, that a typed command other than a change-loop step shows its own name, and that a host name copied from the first message gives way to a step's task words.

## Impact

- `.agents/skills/explore/scripts/step-title.mjs`: the hook no longer starts a first plain message at PLAN; it names a typed `/explore`, `/plan`, `/improve-code`, or other repo skill at once; and it marks a Paseo name copied from the first message as weak (`taskFrom: 'prompt'`).
- Tests: `scripts/tests/step-title.test.mjs`.
- Docs: `wiki/development/the-change-loop.md`, the "A chat's name starts with the step at work" line.
- `CHANGELOG.md` (`minor`).

## Decision log

- **2026-11-05** — Asked (the person's message) whether the name should show PLAN only when the plan step runs → chose yes: a first message with no step word gets no step until a step starts.
- **2026-11-05** — Asked whether to also fix the name Paseo copies from the first message, which the plan's title never replaces → chose fix both in this change.
- **2026-11-05** — Assumed: a Paseo name counts as copied from the first message when the message, with spaces joined and capitals ignored, starts with that name, because Paseo names a chat with the first 60 characters of the message (seen in 40 recent chat names, such as `help make this right https://app.shade.inc/publish/29a6938a-`).
- **2026-11-05** — Assumed: a copied name gives the first clause of the message as task words, cut at a word, as a chat with no name gets today, because a cut-off copy reads worse than a clause.
- **2026-11-05** — Assumed: chats that already have a stored name keep it, because the fix only needs new chats to start right and a rename of old chats could change a name you gave.
- **2026-11-05** — Assumed: in Claude Code alone a build request shows PLAN one message later than today, because Claude Code lets the script set the name only when a message is sent; you use Paseo, where it shows at once.
- **2026-11-05** — Asked (the person's `/ship` message) that `/explore` and the other skill commands update the name → chose: a typed command names the chat at once, a change-loop command with its step and any other command with its own name in capitals.
- **2026-11-05** — Assumed: `/apply`, `/continue`, and `/ship` still wait for their skill to set the step, because each can plan or build first and the name must show the step that runs now.
- **2026-11-05** — Assumed: only a typed command changes the name, not one a step runs for you, such as `/save` or `/verify` inside `/ship`, because a publish should keep SHIP while it saves and checks.
- **2026-11-05** — Assumed: a command counts only when the repo has a skill of that name, and `wong-` is dropped from its name (`/wong-sync` shows SYNC), because a host command such as `/compact` is not a step and a shorter word reads better.
- **2026-11-05** — Assumed: a `minor` release, because a typed command such as `/verify` now gives the name a new word.
- **2026-11-05** — Assumed: a host name that starts with a command, such as `/verify` copied by Paseo from a bare first command, is also weak, so a later `/plan fix x` gives `Fix x`, not `/verify`; and a copied name may end in `…` or `...`, because a command or a cut mark is never a task the person gave.
- **2026-11-05** — Archived for publish: the build plus two fixes from the second look (a bare command as the first message no longer becomes the chat's name; a test for a name that starts with a command); local checks pass.
