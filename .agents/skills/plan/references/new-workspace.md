# Open a part in a new workspace

Each part of a request after the first gets its own [Paseo](https://paseo.sh) workspace and agent; this chat keeps the first. So does [a new task](#new-task-in-this-chat). [The change loop](../../../../wiki/development/the-change-loop.md#several-parts-several-workspaces) owns the rule.

## What counts as a part

- **A part could be planned, reviewed, and published alone**, unlike the steps of one change. When unsure, keep one change.
- **A workspace holds a change** when `openspec list` shows an active change other than the one asked about, or `git status --porcelain` shows edits. A change `/ship` merged is no longer held.

## Ask once

Ask at three points, in [the shared format](../../explore/references/asking-the-user.md):

- **`/explore`'s [exit round](../../explore/SKILL.md#the-exit-round)**: the request holds several parts, or a new change is asked for in a workspace that holds another.
- **[`/continue`](../../continue/SKILL.md#3-check-out-the-branch)**: checking out the change would leave other unpublished work here ([pick up saved work](#pick-up-saved-work)).
- **[`/explore`'s check for other work](../../explore/SKILL.md#check-for-other-work)**: other work in this repo overlaps the request.

List the parts by short titles in the person's words, then ask:

```text
1. Do <first> here, open new workspaces for <others> (Recommended)
   — each plans its part and waits for you there; each runs its own agent.
2. Do them here, one at a time
   — one chat; each part is published before the next starts.
3. Keep them as one change
   — one plan, one review, one publish.
```

A new change asked for where another is unpublished asks instead:

```text
1. Open it in a new workspace (Recommended)
   — it plans there and waits for you; the work here stays as it is.
2. Publish the work here first, then start it here
   — one chat; the new change waits for that publish.
```

On option 1, `/plan` opens the workspace, reports it, and stops, drafting nothing here.

When [the check for other work](../../explore/SKILL.md#check-for-other-work) finds an overlap, name the other work and the overlap, then ask:

```text
1. Keep going here (Recommended)
   — plan this here; the other work stays as it is.
2. Work there instead
   — continue in "<workspace>" (or on pull request #<n>); nothing is planned here.
3. Narrow this one
   — plan only the part the other work doesn't cover.
```

On option 2, name the workspace to open in Paseo, or the pull request's link, and stop, drafting nothing here.

Check `command -v paseo` first. Without it, drop option 1 from the first two lists and say in one line that new workspaces need Paseo; the busy-workspace ask keeps one option plus the person's own answer. **Never open a workspace when nobody can answer** (an unattended run, a routine): do the first part and record each other part as a memory `thread` fact through [the write gate](../../memory/SKILL.md#write).

## New task in this chat

A chat's task is its first ask, change or to-do. Another task, not a quick question on it, opens [a new workspace](#open-each-workspace) unasked, briefed `/plan <the ask>` for a repo change, else the ask, plus what this chat settled; say `Opened: <title>`. *Do it here*, no Paseo, or nobody to answer keeps it here; Daily, helper and routine chats keep their own rules.

## Open each workspace

Write each other part's [brief](#the-brief) to a file in the scratch folder that `node "$(git rev-parse --show-toplevel)/.claude/skills/schedule/scripts/tidy.mjs" scratch` prints, then run:

```bash
W="$(git rev-parse --show-toplevel)/.claude/skills/schedule/scripts/workspace.mjs"
node "$W" open --title '<part>' --brief <file>
```

Open every workspace this way: a raw `paseo run --new-workspace --new-branch`, or Paseo's Handoff skill, keeps a slug name and skips the medium-thinking floor. Title it in the person's words, like *Sign in with Google*; the script refuses a placeholder like `main`.

The workspace starts from the fresh default branch, never this one. Outside a Paseo agent (`PASEO_AGENT_ID` unset), add `--agent claude` or `--agent codex` for the agent you are.

Exit `2` is bad input or Paseo refusing: show `error`. Exits `3` to `5` opened nothing: show `error` and `fallback.app`, then do the parts here.

## The brief

The brief is all the new agent knows:

```text
/plan <the part, in the person's words>

This is one part of a larger request. Plan only this part.
- Settled: <answers from this chat that apply to it>
- Other parts: <title> — <this chat | workspace "<title>">
- Builds on: <part> — <being built here | in workspace "<title>" | about to publish | none>
```

A part that builds on another opens now too; its plan records what it builds on, and whichever publishes second catches up.

## Report

Before your plan, give one line per workspace: *Opened a new workspace, "<title>": it will plan <part> and wait for you there.* Add any `warning` the script prints. On `setupSkippedReason`, say the workspace has no secrets yet and give `paseo workspace setup <workspaceId>`; never approve setup for the person. A technical reader also gets the workspace id and branch.

## Pick up saved work

When `/continue` would switch this workspace away from other unpublished work, recommend a new workspace on the change's branch:

```bash
node "$W" open --title '<plan title>' --brief <file> --checkout '<branch>' [--reviewed <tip>]
```

Its title is the proposal's `#` heading, minus `'` and backticks, else the change name. The brief is `/continue <change name>`, plus the person's instruction if any. After [the review](../../continue/SKILL.md#3-check-out-the-branch)'s yes, `--reviewed` opens exactly that commit; the brief adds *ask before building*. Exit 2 with `review`: newer work. When another workspace has the branch checked out, Paseo refuses: say so and name that workspace.

## Next work

When `/ship` finishes, look for more asked-for work in this conversation, then with `node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" search --type thread <the change's key terms>`. Name a part already open elsewhere; never open it twice.

In a Paseo worktree, ask nothing: [open](#open-each-workspace) and [report](#report) each part with no workspace, then run [`/close`](../../close/SKILL.md). Elsewhere ask: the next part *(Recommended)*, a [`/verify`](../../verify/SKILL.md) walk, or stop.
