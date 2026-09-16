# Structured questions throughout exploration

**Status:** ready-to-ship
**Open questions:** none

## Why

`/explore` requires a question tool only at its exit, so the discussion can still leave the user with broad questions in chat. The user wants small groups of multiple-choice questions with useful suggestions throughout the discussion.

## What Changes

- In standalone `/explore`, ask material clarification questions in repeated small groups of related questions. Wait for each group's answers before asking questions that depend on them. Include recommendations and short tradeoffs in each group. (review.html#/discussion/group)
- Offer two or three useful choices per question, with the recommended option first, a short tradeoff for each choice, and a way to give a custom answer. (review.html#/choices/options)
- Use `AskUserQuestion` or an available equivalent within that tool's limits. In an interactive session without a question tool, show numbered choices in chat; use the non-interactive fallback only when nobody can answer. (review.html#/question-tool/mechanism)
- At the explore-to-plan transition, allow at most one clarification round, including when `/apply` or `/ship` invokes planning. Then fill remaining and later gaps with stated assumptions, without a second clarification round or a UX-question exception. Record answers from the full discussion and align the wrapper, plan handoff, and change-loop documentation. (review.html#/handoff/record)

**Non-goals:** Modify generated `openspec-*` skills, build a question UI, add a fixed interview script, change implementation or delivery gates, or require questions when the conversation already supplies the answer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `explore-clarification`: Structured questions throughout exploration, small related groups, portable question tools and interactive fallbacks, and preservation of answers at the plan handoff.

## Impact

The implementation edits `.agents/skills/explore/SKILL.md` and `.agents/skills/plan/SKILL.md` (distributed through the `.claude/skills/` paths). The documentation update is limited to the question-round description in `wiki/development/the-change-loop.md`. The existing capability receives a delta spec. The payload release needs a minor version bump and a changelog entry. No runtime dependency or application code changes are needed.

## Decision log

- 2026-09-15 — User requested structured multiple-choice questions with suggestions during exploration instead of broad questions in chat.
- 2026-09-15 — Asked how to pace the questions → user chose **small groups of related questions**, instead of one question at a time.
- 2026-09-15 — Bounded exploration for `/plan` found no unresolved material decisions; no additional questions were asked.
- 2026-09-15 — Design defaults proposed for review: normally two or three related questions per group, never exceed the active tool's limits; two or three choices per question; use an equivalent tool when available and numbered choices when only chat is available. These are planning assumptions, not separate user answers.
- 2026-09-15 — Keep the policy in WongStack's wrapper and retain OpenSpec's flexible discussion. This process needs judgment about relevance and tradeoffs; it does not need a new deterministic script.
- 2026-09-16 — User clarified the mode boundary: standalone `/explore` can ask several groups, each with recommendations. Direct entry to `/plan` or a later step gets at most one clarification round at the explore-to-plan transition, then fills gaps with assumptions. Apply this to later UX decisions too; do not reset the round when nested calls return to planning. This supersedes the earlier design's preserved UX exception.

- **2026-09-16** — Implemented all nine tasks for 14.2.0. Updated the authored skills and scoped process documentation; synced explore-clarification. Required payload checks and strict OpenSpec validation passed. Quoted the existing plan description to repair its YAML syntax; kept the supported user-invocable field.
