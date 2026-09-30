---
name: close
description: Wrap up a chat: save what it learned, update the wiki, keep unfinished work, close the workspace.
user-invocable: true
---

# /close

Invoking `/close` authorizes every step below, `/save` and `/ship` included; it throws work away only when asked (*close and throw it away*).

## 1. Write the wrap-up

From the conversation and any change's `tasks.md`, write through [the write gate](../memory/SKILL.md#write): a `project` fact with the session's goal and what got done, a `thread` per planned piece left undone (next step, any blocker), and a supersede for each thread this session finished. The route's save carries them.

## 2. Pick a route

Read `git status --porcelain`, `git log origin/main..HEAD`, and `gh pr view --json state,headRefOid,url`. A Paseo worktree has `PASEO_AGENT_ID` set and is not the main checkout.

- **discard**: asked to throw the work away, in a Paseo worktree. Save the facts by [the facts-only save](../save/references/facts-save.md); no wiki. Asked elsewhere → keep it; the main checkout never throws work away.
- **keep**: uncommitted edits, or commits not merged at `HEAD`. Invoke `/save` verbatim; go on unless the push failed, naming a red CI run in one line. The close after that work ships updates the wiki.
- **wrap**: anything else. Save the facts by the facts-only save, then update the wiki.

## Update the wiki

```bash
M="$(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs"
node "$M" show "$CHANGE_NAME"
node "$M" search --branch "$BRANCH" --change "$CHANGE_NAME" --limit 200
```

`CHANGE_NAME` is the branch's change, archived or active; with none, drop `show` and `--change`. On `main`, drop `--branch`: it returns every fact saved there. Add this session's facts, deduplicate, and place each [repeatable](../../../wiki/wiki-style.md#repeatable-knowledge) one by [the wiki rules](../../rules/wiki.md), never a private-life one. [Store unreachable](../memory/SKILL.md#read) → say so and go on.

Publish the edits alone. After a merge, first `git fetch origin main`, `git switch -c "$BRANCH-wiki" origin/main`, and `git branch -D "$BRANCH"`. Then invoke `/ship`, minus its closing question. No edit → report `no repeatable fact`.

## 3. Close

```bash
S="$(git rev-parse --show-toplevel)/.claude/skills"
node "$S/memory/scripts/memory.mjs" keep-transcript current # never stops the close
node "$S/hand-over/scripts/hand-over.mjs" close # only when this chat's hand-over link is open
node "$S/routine/scripts/tidy.mjs" close # --discard on that route
```

When the reply ends, the workspace is archived and what runs from it stops, such as the app's server; shared things like the browser keep running.

- **Exit 0:** say you're closing this workspace, and end the reply. The chat stays readable in Paseo's archived list.
- **Exit 2:** in the main checkout or outside Paseo, say there's no workspace to close; else give its `error` in plain words.
- **Exits 3 to 5:** Paseo couldn't close it here; the Paseo app can archive it.

## 4. Report

In [plain words](../explore/references/asking-the-user.md#write-in-plain-words): facts recorded, wiki pages changed, work saved to GitHub (with its link) or thrown away, then the close line. Ask no next step: the chat is ending. After a failed close, end with the ways to clear it.
