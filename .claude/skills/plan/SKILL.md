---
name: plan
description: Draft an OpenSpec change — proposal, specs, design, and tasks — in one step, ready to implement. WongStack's name for OpenSpec's /opsx:propose. Use when you want to plan or spec out what to build before writing code; pairs with /continue to implement and /ship to archive.
user-invocable: true
---

# /plan

`/plan` is WongStack's name for OpenSpec's **propose** step — it drafts a complete change under `openspec/changes/<name>/` (proposal, delta specs, design, tasks) so you have a spec to build against.

```
/explore ─▶ /plan ─▶ /continue ─▶ /save ─▶ /ship
(optional)
```

**Invoke the `openspec-propose` skill** (via the Skill tool) and follow it verbatim — that skill is OpenSpec's `/opsx:propose` and owns the actual behavior (naming the change, generating artifacts in dependency order, validating).

**Convention:** the change name *is* the branch name — when you start implementing, work happens on a branch named after the change. Once the proposal reads right, implement it with [`/continue`](../continue/SKILL.md) (which runs `/opsx:apply`).
