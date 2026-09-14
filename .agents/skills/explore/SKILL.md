---
name: explore
description: Think through an idea, problem, or requirement — a thinking partner that clarifies scope and surfaces options without writing code or specs. Owns the loop's clarification round: at its exit it puts the unresolved material forks to you as one multiple-choice question set. Always runs before /plan, which invokes it for you when you skip it. WongStack's name for OpenSpec's /opsx:explore. Use when you want to explore, investigate, or clarify before proposing a change.
user-invocable: true
---

# /explore

`/explore` is WongStack's front door to OpenSpec's **explore** step — the first stop in the loop, and the one place that asks you questions:

`/explore → /plan → /apply → /save → /continue → /ship` — the [change loop](../../../wiki/development/the-change-loop.md), which owns what each verb does and where the git boundary falls.

It's a thinking partner, not a builder: use it to pull apart a problem, weigh options, and firm up scope *before* `/plan` writes a proposal. Nothing is committed and no specs are drafted.

**It always runs before `/plan`** — you invoke it, or `/plan` invokes it for you in [bounded mode](#when-plan-invokes-explore). The point is that every material fork reaches you *before* any artifact is drafted, not in review afterwards.

## The exit round

At **exit** — the moment you signal you're ready to plan, or the end of a bounded pass — put the unresolved forks to the user in exactly one **AskUserQuestion** call. One call, so answering the whole change is a few taps.

- **At most four questions.** That's the tool's ceiling and a useful one: four is a handful.
- **Recommended option first**, labelled `(Recommended)`, so a tap answers it.
- **Skip what's already answered.** A fork the conversation resolved is not a question. After a long `/explore` session, the round is usually empty.
- **Zero questions is a valid exit** — make no call at all and go straight to the summary.
- **More than four material forks?** Ask the four that most change the artifacts; record the rest as assumptions with the recommended answer.

**What to ask — the 80/20 test:** ask only where a wrong guess makes the artifacts *wrong*, not merely *different*.

| Ask | Assume and record |
|---|---|
| scope — what's in, what's out | naming |
| externally observable behavior | file and folder placement |
| compatibility and migration | wording |
| acceptance criteria — what "done" means | anything a reviewer can change cheaply later |

**Nobody to answer?** A non-interactive session (a scheduled run, a remote agent, no tool available) never hangs: take the **recommended option** for every question and mark it **assumed** rather than chosen in the summary. `/plan` records that distinction, so a reviewer can tell a decision from a default.

`/explore` **writes nothing** — not the answers, not a file, not an artifact. The answers live in the conversation until [`/plan`](../plan/SKILL.md) records them in the proposal's Decision log.

## When `/plan` invokes `/explore`

`/plan` invokes this skill in **bounded mode** before it drafts anything. Bounded mode terminates on its own:

1. **Read the conversation** for what it already establishes about the intent.
2. **Investigate only the gap** — what the conversation does not answer. After a thorough standalone session this is nothing, and the pass is short.
3. **Run [the exit round](#the-exit-round)** above.
4. **Summarize** what was figured out in a few lines, and **return to `/plan`**.

Write no file and create no OpenSpec artifact in bounded mode. Don't drift back into open-ended thinking — the summary is the return signal.

**Standalone `/explore` is unchanged**: the open thinking-partner stance below, for as long as you want it, holding the same exit round for when you say you're ready to plan.

## Ask whether it should be code

When the work is a process that will run more than once, weigh a deterministic script against a step that calls a model every run. Code is fast, costs nothing to run again, and gives the same answer twice; keep AI for the parts that need judgment. Raise the fork here, while the scope is still open — [the principles](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai) own the rule.

**Invoke the `openspec-explore` skill** (via the Skill tool) and follow it verbatim — that skill is OpenSpec's `/opsx:explore` and owns the actual thinking-partner behavior. This page owns the exit round and bounded mode on top of it.

When the shape of the work is clear, run the exit round, then move on to [`/plan`](../plan/SKILL.md) to review the artifacts first, or straight to [`/apply`](../apply/SKILL.md), which invokes `/plan` for you. One invocation of [`/ship`](../ship/SKILL.md) with an intent runs the whole chain from here to the merge.
