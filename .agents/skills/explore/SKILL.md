---
name: explore
description: Investigate an idea or problem before planning: read the repo, weigh options, and clarify material choices without writing files. Use before /plan or to think through a change.
user-invocable: true
---

# /explore

`/explore` is the first stop in [the change loop](../../../wiki/development/the-change-loop.md): compare real options and firm up scope before `/plan` writes a proposal. Find related work with `openspec list --json` and `openspec context --json`, by [the CLI contract](../plan/references/openspec-cli.md#select-one-root), and read what they point to.

`/explore` **writes nothing**, not even the answers: [`/plan`](../plan/SKILL.md) records them in the proposal's Decision log. **It always runs before `/plan`**: you invoke it, or `/plan` invokes it in [bounded mode](#when-plan-invokes-explore).

## Questions during standalone exploration

Ask material questions [the shared way](references/asking-the-user.md); keep findings in chat.

- **Ask small groups of related questions:** normally two or three, within the tool's capacity; one when only one matters. No filler.
- **Wait for answers before dependent follow-ups**; a group holds only questions answerable together.
- **Skip settled questions**; use as many groups as needed, with no fixed script.

**The 80/20 test:** ask only where a wrong guess makes the artifacts *wrong*, not merely *different*: scope, externally observable behavior, compatibility, and acceptance criteria. Assume and record naming, placement, wording, and anything a reviewer can cheaply change later.

## Search memory before asking

Before the first question, search once on the intent's key terms and paths you expect to touch:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" search <terms>
```

Don't ask what a live fact answers: state it, with its age and author, as an assumption the user can correct. When [the store is unreachable](../memory/SKILL.md#read), say so and continue.

## The exit round

When the work's shape is clear, put the unresolved material decisions in **at most one final group**, [like every other ask](references/asking-the-user.md): one structured call or one numbered chat group. Then hand off to [`/plan`](../plan/SKILL.md).

- **At most four questions, and no more than the tool supports.** Ask those that most affect the artifacts; mark the other recommended answers as assumptions.
- **Several separate parts?** One of the questions is whether to open a new workspace for each other part, by [open a part in a new workspace](../plan/references/new-workspace.md#ask-once).
- **Ask nothing already answered**; with nothing open, make no call and go to the summary.
- **A completed exit round counts:** a bounded pass or nested call for the same work gets no second group.
- **After the round, fill gaps with supported assumptions and reasons**, dependent questions and later UX layout choices included. Only an explicit return to standalone `/explore` reopens clarification.

This limits clarification only, not action authorization or delivery gates.

## When `/plan` invokes `/explore`

`/plan` runs this skill in **bounded mode** before drafting, even when reached through `/apply` or `/ship`, with one chance to ask:

1. **Read the conversation** for the intent, answers, and whether this transition's exit round already ran.
2. **Search memory, then investigate only the gap**, which can be empty. `/plan` does not search again.
3. **Run the [exit round](#the-exit-round) only if needed and not already done.** Resolve pending answers before dependent planning. When nobody can answer, use [the fallback](references/asking-the-user.md#which-tool-carries-it).
4. **Summarize** the answers and assumptions, then **return to `/plan`**. Fill later gaps with supported assumptions.
