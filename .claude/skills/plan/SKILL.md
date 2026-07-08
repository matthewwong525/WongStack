---
name: plan
description: Draft an OpenSpec change — proposal, specs, design, and tasks — in one step, ready to implement. WongStack's name for OpenSpec's /opsx:propose. Use when you want to plan or spec out what to build before writing code; pairs with /apply to implement and /ship to archive.
user-invocable: true
---

# /plan

`/plan` is WongStack's name for OpenSpec's **propose** step — it drafts a complete change under `openspec/changes/<name>/` (proposal, delta specs, design, tasks) so you have a spec to build against.

```
/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /continue ─▶ /ship
(optional)  draft the  implement  push +    resume →    merge +
            change     the tasks  PR +      /apply      archive
                                  preview
```

**Invoke the `openspec-propose` skill** (via the Skill tool) and follow it verbatim — that skill is OpenSpec's `/opsx:propose` and owns the actual behavior (naming the change, generating artifacts in dependency order, validating).

**Convention:** the change name *is* the branch name — when you start implementing, work happens on a branch named after the change. Once the proposal reads right, implement it with [`/apply`](../apply/SKILL.md) (which fronts `/opsx:apply`), checkpoint with [`/save`](../save/SKILL.md), and resume any time with [`/continue`](../continue/SKILL.md).
