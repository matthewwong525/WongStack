---
name: explore
description: Think an idea through before planning: read the repo, weigh options, clarify choices; writes no files.
user-invocable: true
---

# /explore

`/explore` starts [the change loop](../../../wiki/development/the-change-loop.md): compare real options and firm up scope before `/plan` writes a proposal. Find related work with `openspec list --json` and `openspec context --json` ([the CLI contract](../plan/references/openspec-cli.md#select-one-root)) and read what they point to.

`/explore` **writes nothing**, not even the answers: [`/plan`](../plan/SKILL.md) logs them in the proposal's Decision log. **It always runs before `/plan`**, except for [review-page notes](../plan/SKILL.md#review-notes): you invoke it, or `/plan` invokes it in [bounded mode](#when-plan-invokes-explore).

## Questions during standalone exploration

Ask material questions [the shared way](references/asking-the-user.md), in small groups answerable together: two or three, one when only one matters. Wait for answers before dependent follow-ups. Skip settled questions; use as many groups as needed. Keep findings in chat, [drawn](../plan/references/drawings.md) where a picture shows the flow, options, or costs.

**The 80/20 test:** ask only where a wrong guess makes the artifacts *wrong*, not merely *different*: scope, observable behavior, compatibility, acceptance criteria. Assume and record naming, placement, wording, and anything a reviewer can cheaply change later.

## Search memory before asking

Before the first question, search once on the intent's key terms and load the areas of the paths you expect to touch:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" search <terms>
node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" areas <paths>
```

Don't ask what a live fact answers: state it, with its age and author, as an assumption the user can correct. When [the store is unreachable](../memory/SKILL.md#read), say so and continue.

## Check for other work

Once the work is known to change repo files, look at this repo's other work once, so two chats don't plan the same thing unaware:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/explore/scripts/other-work.mjs"
```

It prints same-repo workspaces, plans, changed files, pull requests, and distinct `chats` (title, exact ID, status). Compare task meaning and actual plans: titles can repeat or be stale.

- **An overlap:** [contact the verified owner](../../../wiki/development/the-change-loop.md#chats-coordinate-directly) before escalation; seek responsibility or dependency agreement. Ask only for an unresolved outcome or affected work blocked by an unreachable owner. Independent work continues.
- **No overlap:** say nothing about the check.
- **A `notes` line:** say it in one line and go on.

Skip it for work that changes no repo file, or that this conversation already checked.

## The exit round

When the work's shape is clear, put the open material decisions in a final group, [like every other ask](references/asking-the-user.md):

- **Ask only what passes [the 80/20 test](#questions-during-standalone-exploration)**, no more questions per group than the tool supports.
- **Several separate parts?** Ask whether to open a new workspace for each other part ([how](../plan/references/new-workspace.md#ask-once)).
- **An answer opens another such choice?** Ask a follow-up group, not a guess; stop once none is open.
- **Never re-ask a settled choice**, nested calls included; with nothing open, go to the summary.
- **Fill minor gaps with supported assumptions and reasons.**

This limits clarification, not action authorization or delivery gates. Then hand off:

- **Bounded mode** returns to `/plan` by [the steps below](#when-plan-invokes-explore).
- **Standalone**, summarize and end with [the next step](references/asking-the-user.md#end-every-reply-with-the-next-step). On *Plan it*, invoke `/plan`, whose bounded pass asks only what is still open; never start `/plan` without that answer.

## When `/plan` invokes `/explore`

`/plan` runs this skill in **bounded mode** before drafting, even via `/apply` or `/ship`:

1. **Read the conversation** for the intent, the answers, and which choices are already settled.
2. **Search memory, [check for other work](#check-for-other-work) unless it already ran for this work, then investigate only the gap**, which may be empty. `/plan` does not search again.
3. **Run [the exit round](#the-exit-round) only for choices still open.** Resolve pending answers before dependent planning; when nobody can answer, use [the fallback](references/asking-the-user.md#which-tool-carries-it).
4. **Summarize** the answers and assumptions, then **return to `/plan`**.
