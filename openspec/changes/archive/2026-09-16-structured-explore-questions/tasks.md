## 1. Explore skill

- [x] 1.1 Update `.agents/skills/explore/SKILL.md` description and standalone discussion policy to allow repeated small groups of related material questions, normally two or three, with recommendations in every group and no filler or settled questions. Wait before dependent follow-ups. See [discussion flow](review.html#/discussion/group).
- [x] 1.2 Specify two or three meaningful choices, `(Recommended)` first, short tradeoffs, custom answers, and structured free text when choices would be artificial. See [choice format](review.html#/choices/options).
- [x] 1.3 Add tool selection and fallback rules: use the available equivalent within its restrictions, keep asynchronous questions pending, use numbered chat choices in interactive sessions without a usable tool, and label non-interactive defaults as assumed. See [question mechanism](review.html#/question-tool/mechanism).
- [x] 1.4 Update exit and bounded-mode wording to allow at most one clarification group at the explore-to-plan transition, within four questions and the tool's capacity, including direct entry through `/plan`, `/apply`, or `/ship`. Count an already-completed exit round, prevent nested calls from resetting the allowance, and use explicit assumptions for remaining and later gaps. Preserve zero-question exits and make the authored policy apply over OpenSpec's conversational examples. Keep generated skills unchanged. See [handoff](review.html#/handoff/record).

## 2. Plan skill

- [x] 2.1 Update the explore handoff in `.agents/skills/plan/SKILL.md` to enforce the single clarification round and record answers from all discussion groups, custom answers, and the exit, with user choices distinct from later assumptions. Remove the UX clarification exception from both the opening policy and review stage; select and record the recommended layout when discovered after the round. Preserve action authorization and delivery gates. See [handoff](review.html#/handoff/record).

## 3. Documentation

- [x] 3.1 Align only the question policy and its direct explore-step summary in `wiki/development/the-change-loop.md` with repeated standalone discussion groups, one clarification round before planning even through later entry steps, assumptions afterward, tool-aware limits, interactive fallback, and the full decision record. Keep the explore wrapper as the detailed runbook. See [handoff](review.html#/handoff/record).

## 4. Release and validation

- [x] 4.1 Bump `VERSION` to the next available minor release (currently 14.2.0) and add a newest-first `CHANGELOG.md` entry explaining the question behavior and host compatibility.
- [x] 4.2 Review the authored skill text against every scenario in `specs/explore-clarification/spec.md`, including repeated standalone groups, direct later-step entry, post-round gaps and UX decisions, nested-call reuse of the completed round, pending asynchronous replies, a lower-capacity tool, custom answers, chat-only sessions, no-user sessions, and an empty exit after earlier answers. Confirm no generated `openspec-*` skill changed. This is prose validation; add no test harness.
- [x] 4.3 Run the required existing checks: `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `openspec validate structured-explore-questions --strict`. Resolve failures caused by this change before the normal `/apply` completion handoff to `/save`.
