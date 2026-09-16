## Context

See [proposal.md](proposal.md) for the problem and scope. The current wrapper names `AskUserQuestion` and fixes its exit ceiling at four questions. The installed question tool can have a different name, a lower ceiling, or an asynchronous response. The underlying OpenSpec skill controls the flexible thinking stance and is generated content.

This change crosses the explore wrapper, the plan handoff, and their owning documentation. It needs one shared question policy and explicit handling of tool availability.

## Goals / Non-Goals

**Goals:** Make clarification easy to answer, preserve the user's ability to change direction, and carry answers into the plan without asking twice.

**Non-Goals:** Define an interview checklist, create tool adapters or new UI, alter generated OpenSpec files, or change action authorization and delivery gates. The one-round limit applies to clarification for the selected work.

## Decisions

### 1. The wrapper owns question presentation

Add a question-policy section to the authored explore wrapper. Revise its description and delegation language so it applies during discussion as well as at the exit. OpenSpec still supplies the thinking stance; the wrapper supplies pacing and presentation. State this boundary explicitly instead of asking the agent to follow conversational examples verbatim where they differ.

The alternative, editing `openspec-explore`, would place the behavior in generated content and lose it on regeneration.

### 2. Group related decisions, then wait

During standalone `/explore`, normally ask two or three related questions in one call, bounded by the active tool's capacity. Ask one if only one matters. Investigate before asking so options reflect the actual task. Do not add questions to fill a group. Questions in a group must be answerable together; a question that depends on an answer belongs in a later group while the user remains in standalone exploration. Each group uses the recommendations and tradeoffs described below.

Keep the 80/20 test: ask about scope, observable behavior, compatibility, and acceptance criteria. Assume minor naming or wording choices. Brief findings and explanations stay in chat; material questions go through the question policy.

One question per call was considered; the user chose small related groups. A single large questionnaire would obscure dependencies and make exploration rigid.

### 3. Choices are suggestions with a clear reason

Use two or three meaningful choices per question. Put `(Recommended)` on the first choice and give each choice a short tradeoff. Keep custom answers possible, using the tool's built-in free-text support when available; do not add a duplicate Other choice when the tool already supplies it. For an unknown that cannot be reduced to honest options, use a free-text question in the structured tool rather than fabricate choices.

### 4. Select the available question mechanism

Use `AskUserQuestion` when available, or the host's equivalent structured question tool. Follow the active tool's schema, mode restrictions, and limits; do not hard-code four as a universal capacity. Tool availability can differ by host and session.

If the tool returns before the user replies, keep the group pending. Continue only work that does not depend on the answers. A preselected option and elapsed time are not a user decision.

If an interactive session has no usable question tool, present the same small group as numbered questions and choices in chat and let the user answer. Use the non-interactive fallback, with recommended defaults marked **assumed**, only where nobody can answer. Tool absence alone does not make a session non-interactive. The separate exit-capacity rule below still records overflow decisions as assumptions.

The alternative, silently taking defaults whenever the named Claude tool is absent, would discard user input in other agents.

### 5. Preserve a bounded exit and the complete decision record

The exit is one final group containing only unresolved material decisions. Ask at most four and never more than the active tool supports. In text fallback, the ceiling is four. If more remain, ask the highest-impact decisions and mark the remaining recommended defaults as assumptions, preserving the existing bounded behavior. A fully resolved discussion produces no call.

Standalone exploration can use several small groups as the discussion develops. The pass invoked by `/plan` has at most one clarification round for the selected work: inspect the existing conversation, investigate gaps, ask one group if needed, summarize, and return. This applies when the user enters `/plan` directly or enters `/apply` or `/ship` and those steps invoke planning. A standalone explore exit already completed for this transition counts as that round; the nested bounded pass must not ask another. Pending asynchronous answers must be resolved before dependent planning; a non-interactive run uses the stated fallback.

After the round, fill remaining gaps and later discoveries with the best supported assumptions and record the reasons. Do not reopen clarification for a dependent question, an incomplete answer, or a new UX layout choice. Remove the plan wrapper's UX-question exception in both its opening policy and review-stage instructions; choose and record the recommended layout instead. The limit stays in effect through the current nested workflow. An explicit user return to standalone `/explore` permits further discussion groups. Action permissions and delivery gates remain separate from clarification.

Update the plan wrapper to record answers from the whole exploration, including custom answers, and separate user choices from assumptions made before and after the round. It must not only record answers from the exit. Align the question-round section in the change-loop page with these boundaries. No other wiki process is in scope.

### 6. Keep this as skill text

Question relevance, grouping, and tradeoffs require judgment. A deterministic script cannot supply them without a separate model integration. Use the existing tools and update the instructions. This prose change needs scenario review and the existing payload checks, with no new test harness or runtime code.

## Risks / Trade-offs

- Suggested choices could hide another direction → retain custom answers, explain tradeoffs, and use structured free text when choices would be false.
- Too many questions could interrupt the discussion → use the materiality test, group related decisions, and skip what is already settled.
- A fixed tool name or limit could fail in another host → select an available equivalent and honor its actual restrictions.
- An asynchronous call could be mistaken for an answer → keep it pending and do not treat defaults as choices.
- Wrapper and documentation could drift → update only the owning question policy and its direct handoff references in the same release.

## Migration Plan

Implement the wrapper and scoped documentation edits together. Release them with the next available minor version (currently 14.2.0 from 14.1.0) and a changelog entry. Existing conversations retain their settled answers. Generated skills need no regeneration or migration. To roll back, restore the prior authored policy and publish a new patch release that explains the reversal.

## Review

The self-contained [review page](review.html) shows the [discussion flow](review.html#/discussion/group), [choice format](review.html#/choices/options), [tool fallback](review.html#/question-tool/mechanism), and [planning handoff](review.html#/handoff/record). It uses flow and text-diff visuals from the existing kit. This change adds no product screen, so no screen visual or UX section is needed.
