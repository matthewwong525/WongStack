---
name: explore
description: Think through an idea, problem, or requirement before or during a change — a thinking partner that clarifies scope and surfaces options without writing code or specs yet. WongStack's name for OpenSpec's /opsx:explore, the optional first step of the loop. Use when you want to explore, investigate, or clarify before proposing a change.
user-invocable: true
---

# /explore

`/explore` is WongStack's front door to OpenSpec's **explore** step — the optional first stop in the loop:

`/explore → /plan → /apply → /save → /continue → /ship` — the [change loop](../../../wiki/development/the-change-loop.md), which owns what each verb does and where the git boundary falls.

It's a thinking partner, not a builder: use it to pull apart a problem, weigh options, and firm up scope *before* `/plan` writes a proposal. Nothing is committed and no specs are drafted.

## Ask whether it should be code

When the work is a process that will run more than once, weigh a deterministic script against a step that calls a model every run. Code is fast, costs nothing to run again, and gives the same answer twice; keep AI for the parts that need judgment. Raise the fork here, while the scope is still open — [the principles](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai) own the rule.

**Invoke the `openspec-explore` skill** (via the Skill tool) and follow it verbatim — that skill is OpenSpec's `/opsx:explore` and owns the actual behavior. When the shape of the work is clear, move on to [`/plan`](../plan/SKILL.md) when the user wants to review the artifacts first, or straight to [`/apply`](../apply/SKILL.md), which invokes `/plan` before implementation when no apply-ready change exists.
