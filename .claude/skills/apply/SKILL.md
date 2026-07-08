---
name: apply
description: Implement the active OpenSpec change — work the tasks.md checklist, writing the code and flipping `- [ ]` → `- [x]` as each task lands. No git (that's /save). WongStack's name for OpenSpec's /opsx:apply and the implement stage of the change loop. Use when you want to implement, apply, or build the change, work the tasks, or start coding what /plan drafted. Resuming cold from another session or machine? /continue first — it checks out the branch, then hands off here.
user-invocable: true
---

# /apply

`/apply` is the **implement stage** of the WongStack change loop — its name for OpenSpec's **apply** step. It works the change's `tasks.md`: reads the proposal + specs + design, implements each pending task, and checks off `- [x]` as it goes.

```
/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /continue ─▶ /ship
 think      draft the  implement  push +    resume →    merge +
 (no git)   change     the tasks  PR +      /apply      archive
            (no git)   (no git)   preview
```

**Invoke the `openspec-apply-change` skill** (via the Skill tool) and follow it verbatim — that skill is OpenSpec's `/opsx:apply` and owns the actual behavior (reading the artifacts, working the task list, checking off tasks).

## Boundaries

- **No git.** `/apply` writes code and updates `tasks.md` checkboxes — it does not commit, push, branch, or open a PR. `/save` owns all of that; checkpoint with `/save` whenever you want the work pushed + previewable.
- **Assumes you're already on the change's branch.** In a live session right after `/plan`, you are. Resuming cold (a fresh clone, another machine, no scrollback)? Run `/continue <name>` instead — it loads the change, checks out the branch, then hands off here.
- **Pause on ambiguity or blockers** — surface them rather than guessing; the proposal is the intent.

When the tasks are done (or at any checkpoint): run **`/save`** to commit + push + open the PR + get a preview URL. When everything is done and verified, **`/ship`** merges + archives the change.
