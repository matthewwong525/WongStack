---
name: apply
description: Implement the active OpenSpec change — work the tasks.md checklist, writing the code and flipping `- [ ]` → `- [x]` as each task lands. No git (that's /save). WongStack's name for OpenSpec's apply step and the implement stage of the change loop. Use when you want to implement, apply, or build the change, work the tasks, or start coding what /plan drafted. Resuming cold from another session or machine? /continue first — it checks out the branch, then hands off here.
user-invocable: true
---

# /apply

`/apply` is the **implement stage** of the loop — WongStack's name for OpenSpec's apply step. It works the active change's `tasks.md`: reads the proposal + specs + design + tasks, implements each pending task, and checks off `- [x]` as it goes.

```
/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /continue ─▶ /ship
```

**Invoke the `openspec-apply-change` skill** (via the Skill tool) and follow it verbatim — that skill is OpenSpec's `/opsx:apply` and owns the actual behavior (select the change, read context files, work the task list, mark checkboxes).

## Boundaries

- **No git.** `/apply` writes code and updates `tasks.md` checkboxes — it does not commit, push, branch, or open a PR. `/save` owns all of that; checkpoint with `/save` whenever you want the work pushed + previewable.
- **Assumes you're already on the change's branch.** In a live session right after `/plan`, you are. Resuming cold (fresh clone, another machine)? Run **`/continue <name>`** instead — it checks out the branch, recaps the change + its Decision log, runs a drift check, then hands off here.
- **Pause on ambiguity or blockers** — surface them rather than guessing; the proposal is the intent. If implementation reveals a design issue, suggest updating the change's artifacts rather than coding around it.

When the tasks are done (or at any checkpoint): **`/save`** to maintain the change surface + sync specs + commit + push + open the PR + get a preview URL. When everything is done and verified, **`/ship`** merges + archives the change.
