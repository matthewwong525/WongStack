---
name: explore
description: "Think an idea through before planning: read the repo, weigh options, clarify choices; writes no files."
user-invocable: true
---

# /explore

Start [the change loop](../../../wiki/development/the-change-loop.md): compare options and settle scope before `/plan`. Find related work with `openspec list --json` and `openspec context --json` ([CLI contract](../plan/references/openspec-cli.md#select-one-root)); read their pointers.

**Write nothing**; [`/plan`](../plan/SKILL.md) logs answers. Explore precedes planning except [review-page notes](../plan/SKILL.md#review-notes), standalone or in [bounded mode](#when-plan-invokes-explore).

## Investigate the relevant flow

Read owning docs and source; trace trigger, result, and constraints. For non-code work, examine the process and authoritative sources. Discover facts; separate observations from inferences. Use proportional, authorized read-only checks; no prototypes or local builds. Name unavailable evidence and a later check.

Compare distinct viable approaches for consequential choices: outcomes, costs, and an evidence-backed recommendation. Invent no alternatives for settled or mechanical requests. Before handoff, check material assumptions and failures against the flow; revise contradictions. Speculative or cheaply changed concerns need no questions.

## Questions during standalone exploration

Ask [the shared way](references/asking-the-user.md): two or three related ready choices, one if alone, within tool capacity. Track decisions and prerequisites in chat. Investigate missing facts; hold only dependent choices and ask independent ones as the host permits. Never ask the person to guess facts.

Update dependencies after answers or evidence. Explain changed premises; reopen only affected decisions. Keep findings in chat, [drawn](../plan/references/drawings.md) when useful.

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

It lists live workspaces (name, branch, plans, files, `busy` agent, `pr`) and non-bot open pull requests. Compare meaning, not filenames: installer plans overlap before edits.

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
- Keep unanswered material preferences open, never disguised as assumptions or evidence gaps. Preserve authorized defaults and [the fallback when nobody can answer](references/asking-the-user.md#which-tool-carries-it).
- Use supported minor assumptions with reasons. Evidence gaps may remain if an approach is coherent; otherwise name the prerequisite, never guess.

Clarification limits preserve authorization and delivery gates. Summarize outcome, approach, reasons over a serious alternative, minor assumptions, and evidence limits; no extra sign-off.

- **Bounded:** return by [the steps below](#when-plan-invokes-explore).
- **Standalone:** end with [the next step](references/asking-the-user.md#end-every-reply-with-the-next-step). *Plan it* invokes `/plan`; its bounded pass asks only what's open. Never start planning without that answer.

## When `/plan` invokes `/explore`

Planning uses **bounded mode**, including via `/apply` or `/ship`:

1. Reuse the conversation's intent, answers, and findings.
2. Search memory and [other work](#check-for-other-work) unless checked; investigate only new material gaps. `/plan` does not search again.
3. Run [the exit round](#the-exit-round) for open choices only; resolve pending answers before dependent planning, retaining authorized or unattended defaults.
4. Return the summary to `/plan`.
