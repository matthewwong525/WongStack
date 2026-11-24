# Design

## Context

- `asking-the-user.md` already says some hosts hide text above the card, but only for links: *A question about a link repeats it whole in its question text*. It also says *Write the report and each link as its own chat line first*, which pushes content above the card.
- `.agents/loop/ask-check.mjs` runs three Claude Code hooks: `stop` (a typed question → ask it with `AskUserQuestion`; `REASON` ended *Don't repeat the report*), `links` (PreToolUse on `AskUserQuestion`; `turnLinks` collects links shown since the person last spoke or answered, and `linksDecision` denies once when a question leaves one out), and `reminder` after a compaction.
- Daily's `chief.mjs` `askText()` sends a stopped chat back with the same *Don't repeat the report* line.
- `AskUserQuestion` takes `questions[].question`, `options[].label`, `options[].description`, and an optional `options[].preview`. The question text is the one field every host shows.

## Goals / Non-Goals

**Goals:** one shared rule, the existing PreToolUse check extended, and the same code and wording as ClaymooApp.

**Non-Goals:** a perfect detector (it catches the common miss and fails open); Codex or other hosts get the rule, and only Claude Code has the hook.

## Decisions

### 1. The rule lives in `asking-the-user.md`

A new section, *Put the review on the card*, after *End every reply with the next step*: what the person must read goes in the question text; longer than about 40 lines or too wide → a page or file the person can open, with a short summary and its full link; `option.preview` may compare options but is never the only copy. *End every reply* points at it.

### 2. The check: review blocks, in the `links` mode

Alternatives: a new hook mode (a `settings.json` change in every install), or a length check on the question (catches nothing when a question is long for other reasons). Chosen: extend `linksDecision`, which already reads the turn.

- `reviewBlocks(text)`: keep a fenced code block, a Markdown table (2+ `|` lines), or a quote (2+ `>` lines). Drop tap lines, `mermaid` fences, and fences that draw with box lines or arrows. A list is no block. Each block gives a probe: its longest content line, Markdown marks and repeated spaces removed, cut to 60 characters.
- `turnReview(rows)`: the same window as `turnLinks`, from assistant text only; tool results are not what the person reviews.
- After the link check passes: when blocks exist, no question text (question, option descriptions and previews) holds a probe, no question holds a web address or file path, and no question offers to close the chat → deny with `REVIEW_REASON` and each probe as a hint. One send-back per turn, shared with the link check.
- Both sides compare after the same normalization (lowercase, Markdown marks and whitespace runs collapsed), so a reformatted line still matches.

### 3. Tuning

ClaymooApp backtested the check over 7 days of transcripts (255 chats, 1,365 questions). Lists, drawing fences and closing questions were mostly noise and are out; 44 cards (3%) are sent back, about 28 of them real misses. See the Decision log.

### 4. The budget

The new section adds instruction words, so `measure-context.mjs --check` needs an offsetting cut. The cuts drop lines a script or another page already owns (Decision log), and the hook's own description stays out of the skill page.

## Risks / Trade-offs

- **Noise** → one extra tool call on a card that did not need the block. Mitigation: once per turn, the backtest, the link exception.
- **Long cards** → a 40-line draft makes a tall card. Accepted.
