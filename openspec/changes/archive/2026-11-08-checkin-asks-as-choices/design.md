# Design

## Context

See proposal.md for why. `stopCheck` (`.agents/skills/daily/scripts/stop-check.mjs`) runs one read-only judge per stop with `stop-judge.md`, which follows `chief.md`'s *From the stop step*, *Sort each stop* and *Needs you*. `judgeLine` accepts a bucket from `BUCKETS` (`keep-going`, `pick`, `person`, in `chief.mjs`); `keep-going` and `pick` return `{decision: 'block', reason: reply}`, which Claude Code and Codex take as the chat's next turn, and bump the streak. `person` lets the chat stop.

The Claude Code ask hook (`explore/scripts/ask-check.mjs` `stopDecision`) already sends back a reply that ends with choices typed as a list, and `stopCheck` skips when it fires. It misses a prose question with no list, and it does not run in Codex.

## Goals / Non-Goals

**Goals:** a small, safe question gets the check-in's own answer; any other stop on a plain-text question for the person turns, once, into a question-tool ask with a recommended answer; a risky one is never answered for the person; no loop.

**Non-Goals:** the line-up's `D tell` notes; the watch's own *Judge one stop* path (`judge.md`, `D reply`); a finished plan's stop.

## Decisions

### A fourth judge bucket, `ask`, with a fixed reply

`stop-check.mjs` judges against `[...BUCKETS, 'ask']`; `BUCKETS` itself stays, because `D reply` and `D answer` validate `--bucket` with it and no `D` command sends an ask. For `ask` the judge's `reply` may be empty: `stopCheck` sends its own text, named for the agent's tool (`AskUserQuestion` for Claude Code, `request_user_input` for Codex):

> The person is away and answers by tap. Ask what you need from them now with `<tool>`: 2 to 4 short options, your recommended one first, marked (Recommended). Don't repeat the report. If `<tool>` isn't callable here, end the turn and say nothing more.

*Alternative:* the judge writes the question and options. Rejected: the judge sees 40 messages and the chat sees its whole work, and the judge's text would reach the chat as an instruction with no added safety.

### A small question is a `pick`

`chief.md` *Sort each stop* 2 widens: a pick is also a small, safe decision or an obvious question with one plain best answer, recommended or not (*should I run the tests?*, *tabs or spaces?*). The safe/risky line is unchanged, so a risky question never becomes a pick. This applies to the watch's *Judge one stop* path too, since both read the same list.

### When the judge sorts `ask`

`chief.md` *Needs you* gains one line, read only from the stop step: a stop that waits on the person's answer to a question it typed, not asked with the question tool, is `ask`; a finished plan, a sign-in, key or payment step, and a question tool already open stay `person`. `stop-judge.md` names `ask` beside the other buckets. The risky-step rule is untouched: `ask` sends no answer.

### One send-back per stretch, counted

The streak file gains `asked`: the count of question-tool calls in the raw transcript at the send-back. A new `since` (the person wrote) resets it with `count` and `told`; so does a later question-tool call, because a tap is a tool result, never a person's message. When the judge says `ask` and no call came since the send-back, `stopCheck` journals `Waits in its chat: <title> — asked once with no question tool` and lets the chat stop. Otherwise it sets `asked`, bumps `count`, keeps the reply in `sent` (so `readChat` hides it from the next judge as the stop step's words), and blocks with the fixed text. The journal line is the judge's `line`, such as `Asked to show choices: <title>`.

## Risks / Trade-offs

- [The judge calls an update a question] → the chat asks a question the person did not need; one tap or a word clears it, and the five-in-a-row cap holds.
- [The question tool is not callable, for example Codex outside plan mode] → the fixed text says to end with nothing more, and `asked` stops a second send-back.
- [Context budget] → the brief and `chief.md` lines need an offsetting cut, by `measure-context.mjs --check`.

## Migration Plan

Nothing to move. An old streak file reads `asked` as unset. Rollback: a revert.
