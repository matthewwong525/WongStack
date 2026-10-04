---
name: explore
description: "Think an idea through before planning: read the repo, weigh options, clarify choices; writes no files."
user-invocable: true
---

# /explore

`/explore` starts [the change loop](../../../wiki/development/the-change-loop.md): compare real options and firm up scope before `/plan`. Find related work with `openspec list --json` and `openspec context --json` ([CLI contract](../plan/references/openspec-cli.md#select-one-root)); read their pointers.

**Write nothing**, including answers: [`/plan`](../plan/SKILL.md) logs them in its Decision log. Explore always runs before planning, except for [review-page notes](../plan/SKILL.md#review-notes), standalone or in [bounded mode](#when-plan-invokes-explore).

## Investigate the relevant flow

Read owning docs and source; trace the intended outcome from trigger to result and constraints. For non-code work, examine the process and authoritative sources. Discover facts before asking; distinguish observations from inferences. Use proportional, authorized read-only checks; no prototypes or local builds. If proof needs a write or unavailable observation, name the evidence gap and the later check that would resolve it.

For a consequential choice with several viable approaches, compare distinct options, their outcomes and costs, and recommend one with evidence. Don't manufacture alternatives for a settled or mechanical request. Before handoff, check material assumptions and failures against the actual flow; revise contradictions. Don't add questions or reopen settled preferences for speculative or cheaply changed concerns.

## Questions during standalone exploration

Ask [the shared way](references/asking-the-user.md): two or three related ready choices, one if only one is ready, within tool capacity. Track settled decisions, open choices, and their prerequisites in conversation. A missing fact holds only its dependent choices; investigate it and ask independent ready choices as the host permits. Don't ask the person to guess facts.

After answers or evidence, update dependencies. If a premise changed, explain why and reopen only affected decisions; keep unrelated answers. Keep findings in chat, [drawn](../plan/references/drawings.md) when useful.

**The 80/20 test:** ask where a wrong guess makes the plan *wrong*, not merely *different*: scope, observable behavior, compatibility, acceptance criteria. Assume naming, placement, wording, and cheaply changed details, with reasons.

## Search memory before asking

Before the first question, search once on intent terms and load areas of likely paths:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" search <terms>
node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" areas <paths>
```

Don't ask what a live fact answers: state its age and author as an assumption the user can correct. If [memory is unreachable](../memory/SKILL.md#read), say so and continue.

## Check for other work

When work will change repo files, check this repo's other work once:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/explore/scripts/other-work.mjs"
```

It lists other live workspaces (name, branch, active plans, changed files, `busy` for a running agent, `pr` for an open pull request) and non-bot open pull requests. Compare meaning, not filenames: two installer plans overlap before either edits a file.

- **Overlap:** name the work and why; add [the overlap ask](../plan/references/new-workspace.md#ask-once) to the next group, or ask alone.
- **No overlap:** say nothing.
- **A `notes` line:** say it in one line and continue.

Skip for non-repo work or if already checked in this conversation.

## The exit round

Once the shape is clear, resolve remaining material choices [the shared way](references/asking-the-user.md):

- Apply [80/20](#questions-during-standalone-exploration) and tool capacity; ask only ready choices.
- **Separate parts?** Ask about a new workspace for each ([how](../plan/references/new-workspace.md#ask-once)).
- **Answers open another choice?** Follow up; stop once none remains.
- Never repeat settled choices, nested calls included, unless their premise changed; reopen only affected ones.
- An unanswered material preference stays open until answered; don't disguise it as an assumption or evidence gap. Preserve authorized defaults and [the fallback when nobody can answer](references/asking-the-user.md#which-tool-carries-it).
- Fill minor gaps with supported assumptions and reasons. Missing evidence may remain if a coherent approach can still be chosen; otherwise name the prerequisite rather than guess.

This limits clarification, not authorization or delivery gates. Summarize the outcome, approach, reasons over a serious alternative, minor assumptions, and evidence limits; add no separate sign-off.

- **Bounded:** return by [the steps below](#when-plan-invokes-explore).
- **Standalone:** end with [the next step](references/asking-the-user.md#end-every-reply-with-the-next-step). *Plan it* invokes `/plan`; its bounded pass asks only what's open. Never start planning without that answer.

## When `/plan` invokes `/explore`

Planning runs this skill in **bounded mode**, including via `/apply` or `/ship`:

1. Read the conversation for intent, answers, and settled choices; reuse prior findings.
2. Search memory and [other work](#check-for-other-work) unless already checked; investigate only a new material gap, which may be empty. `/plan` does not search again.
3. Run [the exit round](#the-exit-round) for open choices only; resolve pending answers before dependent planning, retaining authorized or unattended defaults.
4. Return the summary to `/plan`.
