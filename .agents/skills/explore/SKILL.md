---
name: explore
description: Investigate an idea or problem before planning. Read the repo, weigh options, and clarify material choices without writing files. Use before /plan or when the user wants to think through a change.
user-invocable: true
---

# /explore

`/explore` is WongStack's front door to OpenSpec's **explore** step — the first stop in the loop, and the one place that asks you questions:

`/explore → /plan → /apply → /save → /continue → /ship` — the [change loop](../../../wiki/development/the-change-loop.md), which owns what each verb does and where the git boundary falls.

It's a thinking partner, not a builder: use it to pull apart a problem, weigh options, and firm up scope *before* `/plan` writes a proposal. Nothing is committed and no specs are drafted.

**It always runs before `/plan`** — you invoke it, or `/plan` invokes it for you in [bounded mode](#when-plan-invokes-explore). It puts the highest-impact unresolved decisions to you before any artifact is drafted.

## Questions during standalone exploration

Use the [question mechanism](#question-mechanism) for material clarification questions throughout the discussion. Keep findings and explanations in chat.

- **Ask small groups of related questions.** Normally ask two or three together, within the active tool's capacity. Ask one when only one matters; add no filler.
- **Wait before dependent follow-ups.** Questions in a group must be answerable together. Use the answers to shape the next group while the user remains in standalone `/explore`.
- **Give useful choices every time.** Offer two or three meaningful options per question, with `(Recommended)` first and a short tradeoff for each option.
- **Keep custom answers available.** Use built-in free text when the tool provides it; do not add a duplicate Other option. Preserve the meaning of a custom answer. If honest choices are not possible, use a structured free-text question instead of inventing options.
- **Skip settled questions.** Read the conversation first. Use several groups when needed, without a fixed interview script.

**What to ask — the 80/20 test:** ask only where a wrong guess makes the artifacts *wrong*, not merely *different*.

| Ask | Assume and record |
|---|---|
| scope — what's in, what's out | naming |
| externally observable behavior | file and folder placement |
| compatibility and migration | wording |
| acceptance criteria — what "done" means | anything a reviewer can change cheaply later |

## Question mechanism

Use Codex **`request_user_input`** when it is callable. Otherwise, use Claude **`AskUserQuestion`** when it is callable, or use another host's equivalent structured question tool. Choose from the tools that the active host and collaboration mode make callable. Follow the selected tool's schema, mode restrictions, and actual limits; four questions is not a universal tool capacity.

**An asynchronous call is still pending until answered.** Continue only independent work while waiting. Do not treat elapsed time or a preselected option as a user answer. Wait before dependent questions, decisions, or planning.

**Interactive, but no usable question tool?** Show the same small group as numbered questions and choices in chat, including recommendations, tradeoffs, and a custom-answer path. Wait for the user's answers. Tool absence alone is not a non-interactive session.

**Nobody can answer?** In a non-interactive session, take the recommended defaults and mark them **assumed** rather than chosen. Do not wait. The exit-capacity rule below separately permits assumptions for questions outside the final group.

`/explore` **writes nothing** — not the answers, not a file, not an artifact. Answers and assumptions stay in the conversation until [`/plan`](../plan/SKILL.md) records them in the proposal's Decision log.

## The exit round

At the explore-to-plan transition, collect the unresolved material decisions in **at most one final group**, using the question mechanism and choice format above. With a structured tool, use one call; with chat only, use one numbered group.

- **At most four questions, and no more than the tool supports.** Ask the decisions that most affect the artifacts. Mark remaining recommended answers as assumptions.
- **Ask nothing already answered.** If the conversation settled every material decision, make no call and proceed to the summary.
- **Count a completed exit round.** A bounded pass or nested call for the same work cannot reset this allowance or ask a second group.
- **After the round, fill gaps with supported assumptions and reasons.** This includes incomplete details, dependent questions, and later UX layout choices. Do not reopen clarification during the current workflow. An explicit user return to standalone `/explore` permits further groups.

This limit governs clarification for the selected work. Action authorization and delivery gates retain their own rules.

## When `/plan` invokes `/explore`

`/plan` invokes this skill in **bounded mode** before drafting. This applies to direct `/plan` entry and to later steps such as `/apply` or `/ship` that invoke planning. It gets one opportunity to ask, not the repeated groups of standalone exploration:

1. **Read the conversation** for the intent, answers, and whether this transition's exit round already finished.
2. **Investigate only the gap.** After a thorough standalone session, this can be empty.
3. **Run the [exit round](#the-exit-round) only if needed and not already completed.** Resolve pending answers before dependent planning. Use the stated fallback when nobody can answer.
4. **Summarize** the answers and assumptions, then **return to `/plan`**. Fill remaining and later gaps with supported assumptions; do not start another clarification round.

Write no file and create no OpenSpec artifact. The summary is the return signal. Standalone `/explore` remains a flexible discussion with several related question groups for as long as the user wants to explore.

## Ask whether it should be code

When the work is a process that will run more than once, weigh a deterministic script against a step that calls a model every run. Code is fast, costs nothing to run again, and gives the same answer twice; keep AI for the parts that need judgment. Raise the fork here, while the scope is still open — [the principles](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai) own the rule.

Use `openspec list --json` and `openspec context --json` for relevant existing work, following the shared [CLI contract](../plan/references/openspec-cli.md) when a registered store is selected. Read relevant artifacts and repo files, compare real options, and write nothing. This skill owns exploration; no generated workflow skill is invoked.

When the shape of the work is clear, run the exit round, then move on to [`/plan`](../plan/SKILL.md) to review the artifacts first, or straight to [`/apply`](../apply/SKILL.md), which invokes `/plan` for you. One invocation of [`/ship`](../ship/SKILL.md) with an intent runs the whole chain from here to the merge.
