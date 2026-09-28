---
name: explore
description: Think an idea through before planning: read the repo, weigh options, clarify choices; writes no files.
user-invocable: true
---

# /explore

`/explore` starts [the change loop](../../../wiki/development/the-change-loop.md): compare real options and firm up scope before `/plan` writes a proposal. Find related work with `openspec list --json` and `openspec context --json` ([the CLI contract](../plan/references/openspec-cli.md#select-one-root)) and read what they point to.

`/explore` **writes nothing**, not even the answers: [`/plan`](../plan/SKILL.md) logs them in the proposal's Decision log. **It always runs before `/plan`**, except for [review-page notes](../plan/SKILL.md#review-notes): you invoke it, or `/plan` invokes it in [bounded mode](#when-plan-invokes-explore).

## Questions during standalone exploration

Ask material questions [the shared way](references/asking-the-user.md), in small groups answerable together: two or three, one when only one matters, within the tool's capacity. Wait for answers before dependent follow-ups. Skip settled questions; use as many groups as needed, with no fixed script. Keep findings in chat.

When a picture makes the flow as it is today, the options, or what each costs clearer, draw it in chat by [the drawing guide](../plan/references/drawings.md). The drawing stays in chat, like every finding.

**The 80/20 test:** ask only where a wrong guess makes the artifacts *wrong*, not merely *different*: scope, observable behavior, compatibility, acceptance criteria. Assume and record naming, placement, wording, and anything a reviewer can cheaply change later.

## Search memory before asking

Before the first question, search once on the intent's key terms and the paths you expect to touch:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" search <terms>
```

Don't ask what a live fact answers: state it, with its age and author, as an assumption the user can correct. When [the store is unreachable](../memory/SKILL.md#read), say so and continue.

## Check for other work

Once the work is known to change repo files, look at this repo's other work once, so two chats don't plan the same thing unaware:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/explore/scripts/other-work.mjs"
```

It prints this repo's other live workspaces (name, branch, active plans, changed files, `busy` when an agent runs there, `pr` when one is open) and open pull requests not opened by a bot. Compare them with the request by meaning, not file names: two plans about the installer overlap before either touches a file.

- **An overlap:** name the other work and why it overlaps, then put [the overlap ask](../plan/references/new-workspace.md#ask-once) in the next question group, or alone when nothing else is open.
- **No overlap:** say nothing about the check.
- **A `notes` line:** say it in one line, such as open pull requests not being checked, and go on.

Skip it for work that changes no repo file, and when this conversation already ran it for this work.

## The exit round

When the work's shape is clear, put the open material decisions in **at most one final group**, [like every other ask](references/asking-the-user.md):

- **At most four questions, and no more than the tool supports:** those that most affect the artifacts. Mark the other recommended answers as assumptions.
- **Several separate parts?** Ask whether to open a new workspace for each other part ([how](../plan/references/new-workspace.md#ask-once)).
- **Ask nothing already answered**; with nothing open, make no call and go to the summary. A bounded pass or nested call for the same work gets no second group.
- **Then fill gaps with supported assumptions and reasons**, dependent questions and later UX layout choices included. Only an explicit return to standalone `/explore` reopens clarification.

This limits clarification, not action authorization or delivery gates. Then hand off:

- **Bounded mode** returns to `/plan` by [the steps below](#when-plan-invokes-explore).
- **Standalone**, summarize and end with [the next step](references/asking-the-user.md#end-every-reply-with-the-next-step). On *Plan it*, invoke `/plan`, whose bounded pass sees the round done and asks nothing; never start `/plan` without that answer.

## When `/plan` invokes `/explore`

`/plan` runs this skill in **bounded mode** before drafting, even via `/apply` or `/ship`, with one chance to ask:

1. **Read the conversation** for the intent, the answers, and whether this transition's exit round already ran.
2. **Search memory, [check for other work](#check-for-other-work) unless it already ran for this work, then investigate only the gap**, which may be empty. `/plan` does not search again.
3. **Run [the exit round](#the-exit-round) only if needed and not yet done.** Resolve pending answers before dependent planning; when nobody can answer, use [the fallback](references/asking-the-user.md#which-tool-carries-it).
4. **Summarize** the answers and assumptions, then **return to `/plan`**.
