---
name: close
description: Wrap up a chat: keep unfinished work, close the workspace.
user-invocable: true
---

# /close

`/close` authorizes these steps, including a save. Discard only when explicitly requested.

## 1. Pick a route

Read `git status --porcelain`, `git log origin/main..HEAD`, `gh pr view --json state,headRefOid,url`. A Paseo worktree has `PASEO_AGENT_ID`.

- **discard**: explicit request in a Paseo worktree. Elsewhere, keep; never discard the main checkout.
- **keep**: edits or unmerged HEAD commits. Run `/save` verbatim; stop for failed push, otherwise name any red checks and continue.
- **wrap**: otherwise, nothing to keep.

## 2. Close

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/close/scripts/close.mjs" # --discard on that route
```

- **Exit 0:** say the workspace is closing; the chat stays readable. Archiving stops its processes, not shared services.
- **Exit 2**: in the main checkout or outside Paseo, say there's no workspace to close; else give its `error` plainly.
- **Exits 3 to 5:** the Paseo app can archive it.
- **Exit 7 or 8:** work waits, such as pages to save; do as it says, then close again.

## 3. Report

Report [plainly](../explore/references/asking-the-user.md#write-in-plain-words): saved-work link or discard, then close result. Ask no next step; failed closes end with repair options.
