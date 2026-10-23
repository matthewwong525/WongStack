---
name: explore
description: "Think an idea through before planning: read the repo, weigh options, clarify choices; writes no files."
user-invocable: true
---

# /explore

Start [the change loop](../../../wiki/development/the-change-loop.md): compare options and settle scope before `/plan`. Find related work with `openspec list --json` and `openspec context --json` ([CLI contract](../plan/references/openspec-cli.md#select-one-root)); read their pointers.

**Write nothing**; [`/plan`](../plan/SKILL.md) logs answers. Explore precedes planning except [review-page notes](../plan/SKILL.md#review-notes); use [bounded mode](#when-plan-invokes-explore) under `/plan`.

## Investigate the relevant flow

Read owning docs and source; trace trigger, result, and constraints. For non-code, read the process and authoritative sources. Discover facts; separate observations from inferences. Use proportional, authorized read-only checks; no prototypes or local builds. Name unavailable evidence and a later check.

For consequential choices, compare viable approaches, outcomes, costs; recommend with evidence. Before handoff, check material assumptions and failures against the flow; revise contradictions. Speculative or cheaply changed concerns need no questions.

## Questions during standalone exploration

Ask [the shared way](references/asking-the-user.md): two or three related ready choices, one if alone, within tool capacity. Track decisions and prerequisites in chat. Investigate a missing fact yourself; never ask the person to guess it. Hold only dependent choices and ask independent ones as the host permits.

Update dependencies after answers or evidence. Explain changed premises; reopen only affected decisions. Keep findings in chat, [drawn](../plan/references/drawings.md) as `text` when useful: chat shows no picture.

**The 80/20 test:** ask where a wrong guess makes the plan *wrong*, not merely *different*: scope, observable behavior, compatibility, acceptance criteria. Assume naming, placement, wording, and cheaply changed details, with reasons.

## Search memory before asking

Before asking, recall the task and look up likely paths once, then read the originals it cites:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" recall <question>
node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" areas <paths>
```

Treat dated facts as assumptions. [Memory unavailable](../memory/SKILL.md#read)? Say so; continue with available sources.

## Check for other work

For repo edits, check other work once:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/explore/scripts/other-work.mjs"
```

Lists live workspaces and non-bot PRs. Compare intent, not files: plans can overlap before edits.

- **Overlap:** name the work and why; add [the overlap ask](../plan/references/new-workspace.md#ask-once) to the next group, or ask alone.
- **No overlap:** say nothing.
- **A `notes` line:** say it in one line and continue.

Skip if checked here or no repo edits.

## The exit round

Resolve remaining material choices [the shared way](references/asking-the-user.md):

- Apply [80/20](#questions-during-standalone-exploration) and tool capacity; ask only ready choices.
- **Separate parts?** Ask about a new workspace for each ([how](../plan/references/new-workspace.md#ask-once)).
- **Answers open another choice?** Follow up; stop once none remains.
- A settled choice stays settled, nested calls included; reopen only one a changed premise affects.
- Keep an unanswered material preference open: called an assumption or an evidence gap, it hides a choice the person never made. Preserve authorized defaults and [the fallback when nobody can answer](references/asking-the-user.md#which-tool-carries-it).

Summarize outcome, approach, reasons over a serious alternative, minor assumptions, and evidence limits.

- **Bounded:** return by [the steps below](#when-plan-invokes-explore).
- **Standalone**, typed by the person: [offer next steps](references/asking-the-user.md#end-every-reply-with-the-next-step); only *Plan it* starts `/plan`. A request with no verb starts at `/plan`.

## When `/plan` invokes `/explore`

Planning uses **bounded mode**, including via `/apply` or `/ship`:

1. Reuse the conversation's intent, answers, and findings.
2. Search memory and [other work](#check-for-other-work) unless checked; investigate only new material gaps. `/plan` never repeats searches.
3. Run [the exit round](#the-exit-round) for open choices; await dependent answers, retaining authorized/unattended defaults.
4. Return the summary to `/plan`.
