---
name: close
description: Wrap up a chat: keep unfinished work, close the workspace.
user-invocable: true
---

# /close

`/close` authorizes these steps, including a save. Discard only when explicitly requested.

## 1. Pick a route

Read `git status --porcelain`, `git log origin/main..HEAD`, `gh pr view --json state,headRefOid,url`. Paseo worktrees have `PASEO_AGENT_ID` and are outside the main checkout.

- **discard**: explicit request in a Paseo worktree. Elsewhere, keep; never discard the main checkout.
- **keep**: edits or unmerged HEAD commits. Run `/save` verbatim; stop for failed push, otherwise name any red checks and continue.
- **wrap**: otherwise, nothing to keep.

## 2. Close

```bash
node "$(git rev-parse --show-toplevel)/.claude/plugins/loop/scripts/slot.mjs" closeWorkspace # --discard on that route
```

After the reply, archiving stops workspace processes, not shared services.

- **Exit 0:** say the workspace is closing. Archived chat remains readable.
- **Exit 2** or `SLOT=closeWorkspace empty`: in the main checkout or outside Paseo, say there's no workspace to close; else give its `error` in plain words.
- **Exits 3 to 5:** Paseo couldn't close it here; the Paseo app can archive it.

## 3. Report

Report [plainly](../explore/references/asking-the-user.md#write-in-plain-words): saved-work link or discard, then close result. Ask no next step; failed closes end with repair options.
