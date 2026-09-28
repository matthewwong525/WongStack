# Open a part in a new workspace

Each part of a request after the first gets its own [Paseo](https://paseo.sh) workspace and agent; this chat keeps the first. [The change loop](../../../../wiki/development/the-change-loop.md#several-parts-several-workspaces) owns the rule; this page carries it out.

## What counts as a part

- **A part could be planned, reviewed, and published alone**, unlike the steps of one change. When unsure, keep one change: each part costs its own review and publish.
- **A workspace holds a change** when `openspec list` shows an active change other than the one asked about, or `git status --porcelain` shows edits. A change `/ship` merged is no longer held.

## Ask once

Ask at four points, in [the shared format](../../explore/references/asking-the-user.md):

- **`/explore`'s [exit round](../../explore/SKILL.md#the-exit-round)**: the request holds several parts, or a new change is asked for in a workspace that holds another.
- **[`/continue`](../../continue/SKILL.md#3-check-out-the-branch)**: checking out the change would leave other unpublished work here ([pick up saved work](#pick-up-saved-work)).
- **[`/ship`](../../ship/SKILL.md)'s closing question**: more work is left ([next work](#next-work)).
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

## Open each workspace

Write each other part's [brief](#the-brief) to a file in the git-ignored scratch folder that `node "$(git rev-parse --show-toplevel)/.claude/skills/routine/scripts/tidy.mjs" scratch` makes and prints, then run:

```bash
W="$(git rev-parse --show-toplevel)/.claude/skills/routine/scripts/workspace.mjs"
node "$W" open --title '<part>' --brief <file>
```

The workspace starts from the freshly fetched default branch, never this one. Its agent gets this chat's model and permission mode and no parent, so it outlives this chat. Outside a Paseo agent (`PASEO_AGENT_ID` unset), add `--agent claude` or `--agent codex` for the agent you are.

It prints one JSON object. Exit `2` is bad input or Paseo refusing: show its `error`. Exits `3` to `5` opened nothing: show `error` and `fallback.app`, then do the parts here, one at a time.

## The brief

The new agent starts with no conversation, so the brief carries it:

```text
/plan <the part, in the person's words>

This is one part of a larger request. Plan only this part.
- Settled: <answers from this chat that apply to it>
- Other parts: <title> — <this chat | workspace "<title>">
- Builds on: <part> — <being built here | in workspace "<title>" | about to publish | none>
```

A part that builds on another opens now with the rest, not after that part publishes. Its plan records what it builds on; whichever part publishes second catches up at publish.

## Report

Before drafting the plan you kept, give one line per workspace: *Opened a new workspace, "<title>": it will plan <part> and wait for you there.* Add any `warning` the script prints, such as a workspace that kept Paseo's name. On `setupSkippedReason`, say the workspace has no secrets yet and give `paseo workspace setup <workspaceId>`; never approve setup for the person. A technical reader also gets the workspace id and branch.

## Pick up saved work

When `/continue` would switch this workspace away from other unpublished work, recommend a new workspace on the change's branch:

```bash
node "$W" open --title '<change name>' --brief <file> --checkout '<branch>'
```

The brief is `/continue <change name>`, plus the person's instruction if any. When another workspace has the branch checked out, Paseo refuses: say so and name that workspace.

## Next work

When `/ship` finishes, look for more asked-for work in this conversation, then with `node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" search --type thread <the change's key terms>`. Offer the next part with no workspace yet: open it in a new workspace *(Recommended)*, or stop here. Name a part already open elsewhere; never open it twice.

In a Paseo worktree, the question also offers *Close this workspace*, which runs [`/close`](../../close/SKILL.md). It comes first, recommended, when no next work waits; else the next part stays first. Keep the question to three options, dropping the walk first.
