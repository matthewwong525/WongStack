---
name: close
description: Wrap up a chat: save what it learned, update the wiki, keep unfinished work, close the workspace.
user-invocable: true
---

# /close

`/close` authorizes these steps, including save/ship. Discard only when explicitly requested.

## 1. Write the wrap-up

Use conversation/tasks and [the write gate](../memory/SKILL.md#write): project fact for goal/result, threads for remaining pieces with next step/blocker, supersedes for resolved threads. Save carries them.

## 2. Pick a route

Read `git status --porcelain`, `git log origin/main..HEAD`, `gh pr view --json state,headRefOid,url`. Paseo worktrees have `PASEO_AGENT_ID` and are outside the main checkout.

- **discard**: explicit request in a Paseo worktree. [Save facts](../save/references/facts-save.md), skip wiki. Elsewhere, keep; never discard the main checkout.
- **keep**: edits or unmerged HEAD commits. Run `/save` verbatim; stop for failed push, otherwise name any red checks and continue. Update wiki when closing after shipment.
- **wrap**: otherwise save facts, then update wiki.

## Update the wiki

```bash
M="$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs"
node "$M" show "$CHANGE_NAME"
node "$M" search --branch "$BRANCH" --change "$CHANGE_NAME" --limit 200
```

Use active/archived `CHANGE_NAME`; without one, omit show/--change. On main omit --branch. Deduplicate session facts; [place repeatable ones](../../../wiki/development/wiki-dream.md#placing-a-fact-on-a-page). Report [unreachable memory](../memory/SKILL.md#read) and continue.

Publish the edits alone. After a merge, first `git fetch origin main`, `git switch -c "$BRANCH-wiki" origin/main`, and `git branch -D "$BRANCH"`. Then invoke `/ship`, minus its closing question. No edit → report `no repeatable fact`.

## 3. Close

```bash
S="$(git rev-parse --show-toplevel)/.claude/skills"
node "$S/memory/scripts/memory.mjs" keep-transcript current # never stops the close
node "$S/hand-over/scripts/hand-over.mjs" close # only when this chat's private link is open
node "$S/schedule/scripts/tidy.mjs" close # --discard on that route
```

After the reply, archiving stops workspace processes; shared services keep running.

- **Exit 0:** say the workspace is closing. Archived chat remains readable.
- **Exit 2:** in the main checkout or outside Paseo, say there's no workspace to close; else give its `error` in plain words.
- **Exits 3 to 5:** Paseo couldn't close it here; the Paseo app can archive it.

## 4. Report

Report [plainly](../explore/references/asking-the-user.md#write-in-plain-words): facts, wiki edits, saved-work link or discard, then close result. Ask no next step; failed closes end with repair options.
