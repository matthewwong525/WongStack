---
name: explore
description: Investigate an idea or problem before planning. Read the repo, weigh options, and clarify material choices without writing files. Use before /plan or when the user wants to think through a change.
user-invocable: true
---

# /explore

`/explore` is WongStack's front door to OpenSpec's **explore** step — the first stop in [the change loop](../../../wiki/development/the-change-loop.md), and the one place that asks you questions.

It's a thinking partner, not a builder: pull apart a problem, compare real options, and firm up scope *before* `/plan` writes a proposal. Find related work with `openspec list --json` and `openspec context --json`, by [the CLI contract](../plan/references/openspec-cli.md#select-one-root), and read the artifacts and repo files it points to.

`/explore` **writes nothing** — not the answers, not a file, not an artifact. Answers and assumptions stay in the conversation until [`/plan`](../plan/SKILL.md) records them in the proposal's Decision log.

**It always runs before `/plan`** — you invoke it, or `/plan` invokes it for you in [bounded mode](#when-plan-invokes-explore). It puts the highest-impact unresolved decisions to you before any artifact is drafted.

## Questions during standalone exploration

Ask material clarification questions [the shared way](references/asking-the-user.md), which owns the format and the tool. Keep findings and explanations in chat.

- **Ask small groups of related questions.** Normally ask two or three together, within the active tool's capacity. Ask one when only one matters; add no filler.
- **Wait before dependent follow-ups.** Questions in a group must be answerable together. Use the answers to shape the next group while the user remains in standalone `/explore`.
- **Skip settled questions.** Read the conversation first. Use several groups when needed, without a fixed interview script.

**What to ask — the 80/20 test:** ask only where a wrong guess makes the artifacts *wrong*, not merely *different*.

| Ask | Assume and record |
|---|---|
| scope — what's in, what's out | naming |
| externally observable behavior | file and folder placement |
| compatibility and migration | wording |
| acceptance criteria — what "done" means | anything a reviewer can change cheaply later |

## Search memory before asking

Before the first question, run one search on the intent's key terms and the paths you expect to touch:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" search <terms>
```

Do not ask what a live fact already answers. State the fact, with its age and author, as a recorded assumption the user can correct. When [the store is unreachable](../memory/SKILL.md#read), say so and continue. `/plan` gets this through bounded mode and does not search again.

## The exit round

When the shape of the work is clear, hand off to [`/plan`](../plan/SKILL.md). At that transition, collect the unresolved material decisions in **at most one final group**, in the [same shape as every other ask](references/asking-the-user.md). With a structured tool, use one call; with chat only, use one numbered group.

- **At most four questions, and no more than the tool supports.** Ask the decisions that most affect the artifacts. Mark remaining recommended answers as assumptions.
- **Several separate parts?** One of the questions is whether to open a new workspace for each other part, by [open a part in a new workspace](../plan/references/new-workspace.md#ask-once).
- **Ask nothing already answered.** If the conversation settled every material decision, make no call and proceed to the summary.
- **Count a completed exit round.** A bounded pass or nested call for the same work cannot reset this allowance or ask a second group.
- **After the round, fill gaps with supported assumptions and reasons.** This includes incomplete details, dependent questions, and later UX layout choices. Do not reopen clarification during the current workflow. An explicit user return to standalone `/explore` permits further groups.

This limit governs clarification only; action authorization and delivery gates keep their own rules.

## When `/plan` invokes `/explore`

`/plan` invokes this skill in **bounded mode** before drafting. This applies to direct `/plan` entry and to later steps such as `/apply` or `/ship` that invoke planning. It gets one opportunity to ask, not the repeated groups of standalone exploration:

1. **Read the conversation** for the intent, answers, and whether this transition's exit round already finished.
2. **Search memory, then investigate only the gap.** After a thorough standalone session, the gap can be empty.
3. **Run the [exit round](#the-exit-round) only if needed and not already completed.** Resolve pending answers before dependent planning. Use the [nobody-can-answer fallback](references/asking-the-user.md#which-tool-carries-it) when nobody can answer.
4. **Summarize** the answers and assumptions, then **return to `/plan`**. Fill remaining and later gaps with supported assumptions; do not start another clarification round.

The summary is the return signal.
