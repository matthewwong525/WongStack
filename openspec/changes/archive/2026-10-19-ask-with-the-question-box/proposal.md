# Ask next steps with the question box, every time

**Status:** in-progress

**Branch:** fluffy-parrot

**Open questions:** none

## Why

The rule already says to ask closing choices with the question box, but the assistant sometimes types them as a list at the end of a long report instead. You then have to type your answer rather than click. Since October 1 it happened in 25 of 516 closing questions in Claude chats. That's 4% normally and 11% once a long chat had been shortened. It was worst after a check of the preview, at about 1 in 6. Nothing catches it, so a reminder alone won't stop it.

## What Changes

- **A typed list gets sent back.** When a reply ends with a question and a short list of options, and the question box wasn't used, the assistant is sent back once to ask with the box. You may see the typed list once, with the box below it. Normal reports aren't touched: tried on 1,772 past replies that didn't use the box, it flagged 25, and all 25 were real slips.
  ```mermaid
  flowchart TD
    reply["reply ends"] --> list{typed choices?}
    list -->|no| done["you answer"]
    list -->|yes| box["sent back to ask with the box"] --> done
  ```
- **A reminder after a long chat is shortened.** When the assistant shortens a long conversation to keep going, one line about the question box is added back. Before, nothing reminded it, and the shortened notes carried the choices as plain text.
- **Instructions that say "ask with the box", not a list to copy.** The closing lines of building, saving, publishing and checking say to ask with the question box. The example question in the asking rules looks like a box, not a typed list. A preview check still writes its options into the note on the change, but in chat it asks with the box.
  ```text
  BEFORE                      AFTER
  "End with the next step:    "Ask the next step with
   publish it, change it       the question box: publish
   more, or save"              it, change it more, save"
  ```

**Non-goals:** Codex gets no new check. Its logs show no slips, and it may not support the same end-of-reply check. Hosts with no question box still get numbered choices in chat, as today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: a Claude Code stop check returns a reply that types its closing choices instead of asking with the question tool, and a reminder restates the rule after compaction.

## Impact

- **Hooks:** `.agents/settings.json` gains a `Stop` hook and a `SessionStart` entry matching `compact`; `.agents/hooks.json` (Codex) is unchanged.
- **Script:** new `.agents/skills/explore/scripts/ask-check.mjs`, with a test in `scripts/tests/`.
- **Skill text:** `.agents/skills/explore/references/asking-the-user.md`, `apply`, `save`, `ship`, `verify` SKILL.md files, and `verify/references/walkthrough.md`, under the context budget.
- **Release:** a `minor` CHANGELOG entry; installs get the hook through `/wong-sync`.

## Decision log

- **2026-10-19** — Asked how firmly to stop typed choices → chose all three: an end-of-reply check, a reminder after shortening, and clearer wording.
- **2026-10-19** — Assumed: Claude Code only for the check and the reminder, because 313 Codex logs since October 1 show no slip (only 5 closing questions, a thin sample) and Codex's support for an end-of-reply check is unconfirmed.
- **2026-10-19** — Assumed: the check sends the assistant back once and never twice in a row, because a second block could trap a session where the box can't be used.
- **2026-10-19** — Assumed: the check skips background memory runs, because those never ask anyone anything.
- **2026-10-19** — Assumed: the reminder is a separate small hook, not the memory hook rerun, because rerunning memory's start would register the session again and refetch the digest.
- **2026-10-19** — Assumed: the check counts a list as choices when the line before it ends in a question mark, or any option says *(Recommended)*, because that caught every slip in the backtest and flagged no normal report.
- **2026-10-19** — Backtest of the built `ask-check.mjs` on this machine's Claude transcripts changed since 2026-10-01: 1,762 turns ended without the question tool, and it flagged 25, the same 25 turns the exploration detector found, all real slips; no false alarm. The 12 fewer turns than the earlier 1,774 are turns that end on a tool call with no closing text, which the check now lets end.
- **2026-10-19** — Assumed: the `What changed?` test fixture uses the real reports' shape, a `**What changed**` heading with no question mark. A literal `What changed?` line directly above a 2–4 item list that ends the reply would be sent back, as the rule intends; no past reply ends that way.
- **2026-10-19** — Assumed: `tools-on-path.test.mjs` now expects four node hooks in `.agents/settings.json`, and `cli-conventions.test.mjs` lists `ask-check.mjs`, because both tests count every Claude Code hook script.
- **2026-10-19** — Live check before saving: hooks run from the checkout, so the save wasn't needed first. In a Paseo Claude chat in this checkout, a reply ending in a typed `What next?` list was sent back once and the assistant then asked with `AskUserQuestion`. In a headless `claude -p` run with only the stop check, the box isn't callable, and the assistant dropped the options for a free-text ask. So the message sent back now says to end the turn and leave the typed list when the tool isn't callable. Rerun: it said one line and the list stood. Claude Code shows the send-back as a *Stop hook error* notice.
