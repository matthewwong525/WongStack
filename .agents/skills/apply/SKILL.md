---
name: apply
description: Implement the active OpenSpec change — work the tasks.md checklist, writing the code and flipping `- [ ]` → `- [x]` as each task lands, then automatically hand a completed change to /save. WongStack's name for OpenSpec's /opsx:apply and the implement stage of the change loop. Use when you want to implement, apply, or build the change, work the tasks, or start coding what /plan drafted. Resuming cold from another session or machine? /continue first — it checks out the branch, then hands off here.
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

When it reaches an **all-tasks-complete** state — including when the selected change was already complete at invocation — immediately invoke the **`save` skill** and follow it verbatim. Invoke it exactly once, then report the implementation and checkpoint results together.

## Boundaries

- **`/save` still owns all git.** `/apply` does not implement commit, push, branch, PR, preview, or CI mechanics itself; on complete it delegates them to `/save`.
- **No automatic partial checkpoint.** If implementation pauses, is blocked, is interrupted, fails, or still has pending tasks, do not invoke `/save`. Report the remaining work and remind the user that they can run `/save` explicitly if they want an in-progress checkpoint.
- **Assumes you're already on the change's branch.** In a live session right after `/plan`, you are. Resuming cold (a fresh clone, another machine, no scrollback)? Run `/continue <name>` instead — it loads the change, checks out the branch, then hands off here.
- **Pause on ambiguity or blockers** — surface them rather than guessing; the proposal is the intent.

Completed tasks automatically flow through **`/save`** to commit + push + open the PR + get a preview URL. At any earlier checkpoint, `/save` remains independently invocable. When everything is done and verified, **`/ship`** merges + archives the change.
