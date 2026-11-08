# Design

## Context

See proposal.md for why. [`asking-the-user.md`](../../../.agents/skills/explore/references/asking-the-user.md) *End every reply with the next step* says each link is its own chat line, "never in the tool's question or options"; *Print the plan's link* and *Print the preview's link* point to it. Fact #1659 (2026-10-15) set that rule because a link only in the card was hard to click. Fact #313 found the real failure: agents skip the line, and Paseo sometimes hides text above a card.

[`ask-check.mjs`](../../../.agents/skills/explore/scripts/ask-check.mjs) already has `stop` (typed choices go back to the tool) and `reminder` (after compaction), with `readTurn` finding the turn after the last human row.

## Goals / Non-Goals

**Goals:** a question that asks the person to use a link shows the full link in its question text, besides the chat line; Claude Code catches a question that leaves out a link the turn had.

**Non-Goals:** links in options; Codex enforcement; the review page; when a skill asks.

## Decisions

### The rule: the link in both places

*End every reply with the next step*: write the report and each link as its own chat line first; when the question asks the person to open, read, or act on a link, repeat the full link in the question text too, never in an option; an option may name it. *Print the plan's link* and *Print the preview's link*: a closing question repeats the link in its text. A finished plan's reply still ends with no question.

*Alternative:* the link only in the question. Rejected by the person: a link in the card may not be clickable.

### A `PreToolUse` check, `ask-check.mjs links`

`.agents/settings.json` `PreToolUse` gains matcher `AskUserQuestion` → `ask-check.mjs links` (timeout 3). It reads the hook JSON: `tool_input.questions[].question` and `transcript_path`.

`turnLinks(rows)` walks the rows `readTurn` uses (after the last human row), starting again after each answered `AskUserQuestion` (a tool result, not a human row) but not after its own send-back, and collects:

- each `http(s)://` address in assistant `text` parts, trailing `.,;:)]*_>` stripped;
- each target of a `Click here to see …:` line at the start of a line (an indented one is a quoted example) in `tool_result` content (string or text parts), its `http(s)://` address, else its first path; this covers `build-review.mjs`'s Markdown reply link (`[review.html](https://…)`) or bare `review.html` path, and a preview line.

`linksDecision(input)` returns a deny when a collected link is in no question's text:

```json
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"<LINKS_REASON> <links>"}}
```

`LINKS_REASON`: *This question leaves out a link the person needs. Ask again with the full link in the question text (not in an option), and keep it on its own chat line above:* then the links, one per line.

**Once per turn:** when a `tool_result` in the turn already holds `LINKS_REASON`, let the question go out. **Fail open:** no transcript, unreadable rows, `WONG_MEMORY_RUN=1`, or no questions → no output.

*Alternative:* match only questions that name *Review the plan* or *open*. Rejected: word lists miss phrasing; every link a turn shows is one the person may need, and a copy in the question costs one line.

### The compaction reminder

`REMINDER` adds: *a question that needs a link shows the full link in its text too*. Budget is checked by `measure-context.mjs --check`.

## Risks / Trade-offs

- [A turn shows a link the question doesn't need, such as a cited page] → the question gains one extra line; one send-back at most.
- [A denied `AskUserQuestion` shows the person a hook notice] → the change's report says so, as [test a hook](../../../wiki/maintaining/test-a-hook.md#what-youll-see) asks.
- [Context budget] → offsetting cuts in `asking-the-user.md` if the check fails.

## Migration Plan

Nothing to move. Rollback: a revert.
