# Design

## Context

Review pages gained questions in 45.10.0 (`form` fences in cards and needs, a live card's `review.answer`) and a `pictures:` pick in 51.6.0. The kit keeps every answer in one store (`data.answers`), sends it once with the notes, and counts a need open until its questions are answered. File questions use the same store: a sent file is its answer.

## Goals / Non-Goals

**Goals:**
- No page source can put a choice or typed answer on a review page; the builder enforces it, so the rule does not rest on a skill's words alone.
- Files and key links in *What the build needs* keep working as they do now.

**Non-Goals:**
- No change to pages already built: each is a whole saved file, and the Inbox shows it as it was.
- No change to the bar's buttons, *OK*, *Note*, or the card view.

## Decisions

- **The builder stops, not warns.** A `form` fence inside a What Changes card stops the build: `item <n>: a review page asks no questions; ask "<first question>" in the chat as a question card`. A need's `form` takes only `file:` lines; another kind stops with the same pointer. A warning was the alternative, but warnings are easy to pass over, and one question on the page breaks the split the person asked for.
- **Files keep their own list.** The typed-answer store (`data.answers`, `said`) goes; a file's list in `data.files` is its answer, and the open-need count and the notes' *Answers* group read it. The kit drops the handling for text, long, date, tick, choice, choices, and pictures inputs, and for live answers (`review:answer` messages and the `[data-live]` lines). `QUESTION_KINDS` becomes `file` alone.
- **The live card loses its answer shim.** The builder stops putting `window.review` in the live card's head and stops handing it a port. A sample that still calls `review.answer` throws a `TypeError` in its own sealed frame; to keep old samples quiet, the builder keeps a one-line `window.review={answer:function(){}}` stub. The stub sends nothing.
- **The rule's one home is [asking the user](../../../.agents/skills/explore/references/asking-the-user.md).** It owns how a question is asked, so it gets the line *a choice goes in the chat, never on a review page*. `wiki/review-pages.md` says the page asks nothing and links there; `/plan`'s skill says every answer is asked in the exit round before the page is built.
- **`WORK_IN_CHAT`** becomes *Look it over, then say OK or paste your notes here.*: a page opened as a file has no choice to tell.

## Risks / Trade-offs

- [A plan needs an answer the person can only give after seeing the page, such as *which of these two pictures*] → the page shows both pictures in a card to look at, and the chat asks the pick as a question card with the page's link in its question.
- [Ordering many items is hard in a chat card] → the free-text answer takes an order in the person's own words.
- [Other repos' skills or pages use `form` questions in cards] → their next page build stops with the pointer; the changelog's *Updating* line says so.

## Migration Plan

Nothing to run. An open plan whose page holds a question stops on its next build; move each question to the chat, take it out of the proposal, and rebuild. Rollback is a revert.
