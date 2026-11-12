---
name: close
description: Wrap up a chat: put what it learned in the wiki, keep unfinished work, close the workspace.
user-invocable: true
---

# /close

`/close` authorizes these steps, including save/ship. Discard only when explicitly requested.

## 1. Pick a route

Read `git status --porcelain`, `git log origin/main..HEAD`, `gh pr view --json state,headRefOid,url`. Paseo worktrees have `PASEO_AGENT_ID` and are outside the main checkout.

- **discard**: explicit request in a Paseo worktree. Skip wiki. Elsewhere, keep; never discard the main checkout.
- **keep**: edits or unmerged HEAD commits. Run `/save` verbatim; stop for failed push, otherwise name any red checks and continue. Update wiki when closing after shipment.
- **wrap**: otherwise update wiki.

## Update the wiki

Read this chat for what it learned. Write only a fact that helps a later, different task and stays true: one line on the page that owns it, never a second copy or a private detail. Memory and its daily tidy keep the rest.

[Save](https://github.com/matthewwong525/WongStack/blob/main/wiki/stack/company-knowledge.md#save-a-page) `knowledge/` pages at once; report the undo line. Publish other edits alone. After a merge, first `git fetch origin main`, `git switch -c "$BRANCH-wiki" origin/main`, and `git branch -D "$BRANCH"`. Then invoke `/ship`, minus its closing step. No edit → report `no repeatable fact`.

## 2. Close

```bash
node "$(git rev-parse --show-toplevel)/.claude/plugins/loop/scripts/slot.mjs" closeWorkspace # --discard on that route
```

After the reply, archiving stops workspace processes, not shared services.

- **Exit 0:** say the workspace is closing. Archived chat remains readable.
- **Exit 2** or `SLOT=closeWorkspace empty`: in the main checkout or outside Paseo, say there's no workspace to close; else give its `error` in plain words.
- **Exits 3 to 5:** Paseo couldn't close it here; the Paseo app can archive it.

## 3. Report

Report [plainly](../explore/references/asking-the-user.md#write-in-plain-words): wiki edits, saved-work link or discard, then close result. Ask no next step; failed closes end with repair options.
