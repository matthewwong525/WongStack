# Open a part in a new workspace

A request with several separate parts gets one [Paseo](https://paseo.sh) workspace per part: this chat keeps the first part, and each other part opens in a new workspace with its own agent. [The change loop](../../../../wiki/development/the-change-loop.md#several-parts-several-workspaces) states the rule; this page is how you carry it out.

## What counts as a part

- **A part could be planned, reviewed, and published without the others.** The steps of one change are not parts. When unsure, keep one change: each part costs its own review and publish.
- **A workspace holds a change** when `openspec list` shows an active change other than the one asked about, or `git status --porcelain` shows edits. A change that `/ship` merged is no longer held.

## Ask once

The ask comes at three points, in [the shared ask format](../../explore/references/asking-the-user.md):

- **`/explore`'s [exit round](../../explore/SKILL.md#the-exit-round)**, when the request holds several parts, or a new change is asked for in a workspace that holds another.
- **[`/continue`](../../continue/SKILL.md#3-check-out-the-branch)**, when checking out the change would leave other unpublished work here. See [pick up saved work](#pick-up-saved-work).
- **[`/ship`](../../ship/SKILL.md)'s closing question**, when more work is left. See [next work](#next-work).

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

Check `command -v paseo` first. Without it, drop option 1 from either list and say in one line that new workspaces need Paseo; the busy-workspace ask keeps one option plus the person's own answer. **Never open a workspace when nobody can answer** (an unattended run, a routine): do the first part and record each other part as a memory `thread` fact through [the write gate](../../memory/SKILL.md#write).

## Open each workspace

For each other part, write [its brief](#the-brief) to a file in the git-ignored scratch folder, whose path `node "$(git rev-parse --show-toplevel)/.claude/skills/routine/scripts/tidy.mjs" scratch` makes and prints, and run:

```bash
W="$(git rev-parse --show-toplevel)/.claude/skills/routine/scripts/workspace.mjs"
node "$W" open --title '<part>' --brief <file>
```

The script fetches the default branch and starts the workspace from it, never from this branch. The new agent gets this chat's model and permission mode, and no parent, so it lives on after this chat. Outside a Paseo agent (`PASEO_AGENT_ID` unset), add `--agent claude` or `--agent codex` for the agent you are.

It prints one JSON object. Exit `2` is bad input or Paseo refusing: show its `error`. Exits `3` to `5` opened nothing: show `error` and `fallback.app`, then carry on with the parts here, one at a time.

## The brief

The new agent starts with no conversation, so the brief carries what it needs:

```text
/plan <the part, in the person's words>

This is one part of a larger request. Plan only this part.
- Settled: <answers from this chat that apply to it>
- Other parts: <title> — <this chat | workspace "<title>">
- Builds on: <part> — <being built here | in workspace "<title>" | about to publish | none>
```

A part that builds on another opens now, with the others; it does not wait for that part to publish. Its plan records what it builds on, and whichever part publishes second catches up at publish.

## Report

Before you draft the plan you kept, give one line per workspace: *Opened a new workspace, "<title>": it will plan <part> and wait for you there.* The script names the workspace "<title>" too, so that is the name in Paseo's list. Add the script's `warning` when present, such as a workspace that kept Paseo's name. When it prints `setupSkippedReason`, say the workspace has no secrets yet and give `paseo workspace setup <workspaceId>`; never approve setup for the person. A technical reader also gets the workspace id and branch.

## Pick up saved work

When `/continue` would switch this workspace away from other unpublished work, recommend a new workspace on the change's branch:

```bash
node "$W" open --title '<change name>' --brief <file> --checkout '<branch>'
```

The brief is `/continue <change name>`, plus the person's instruction if they gave one. When the branch is checked out in another workspace, Paseo refuses: say so, and name that workspace.

## Next work

When `/ship` finishes, look for more work the person asked for: first in this conversation, then with `node "$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs" search --type thread <the change's key terms>`. Offer the next part that has no workspace yet: open it in a new workspace *(Recommended)*, or stop here. A part already open elsewhere is named, never opened twice.

When `/ship` merged from a Paseo worktree (`PASEO_AGENT_ID` is set, and this is not the main checkout), the question also offers *Close this workspace*: once this reply ends, the chat and its workspace close, and anything left running from them stops. It comes first and recommended when no next work is waiting; otherwise the next part stays first. Keep the question to three options, dropping the walk first. Picking it runs:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/routine/scripts/tidy.mjs" close
```

- **Exit 0** → say you are closing this workspace now, and end the reply. The chat stays readable in Paseo's archived list.
- **Exit 2** closed nothing → give its `error` in plain words, such as the unsaved files it names, and offer to save them first.
- **Exits 3 to 5** closed nothing → say Paseo could not close it from here, and that the Paseo app can archive the workspace.
