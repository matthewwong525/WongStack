# The change loop

Every change to WongStack — and to any repo that installs it — moves through one loop, from a rough idea to a shipped, archived spec:

```
/explore ─▶ /plan ─▶ /continue ─▶ /save ─▶ /ship
(optional)
```

Each verb is a thin WongStack skill fronting one step of [OpenSpec](https://github.com/Fission-AI/OpenSpec), the planning layer. **OpenSpec owns the plan; the WongStack skills own all git** — OpenSpec never runs git itself. You never have to type `/opsx:*` by hand, though those commands stay available if you want the raw step.

## The steps

- **[`/explore`](../../.claude/skills/explore/SKILL.md)** *(optional)* — think a problem through before committing to a shape. Fronts `/opsx:explore`. Nothing is written yet.
- **[`/plan`](../../.claude/skills/plan/SKILL.md)** — draft the change: a folder `openspec/changes/<name>/` holding the proposal, delta specs, design, and tasks. Fronts `/opsx:propose`.
- **[`/continue`](../../.claude/skills/continue/SKILL.md)** — resume a change by name (or PR, or the `openspec list` menu), check out its branch, and implement the tasks. Fronts `/opsx:apply`.
- **[`/save`](../../.claude/skills/save/SKILL.md)** — checkpoint: sync the change's delta specs into `openspec/specs/`, commit code + specs, push, open/update the PR, wait for CI when present (auto-fixing failures; no checks → PR review is the gate), and return a preview URL. Fronts `/opsx:sync`.
- **[`/ship`](../../.claude/skills/ship/SKILL.md)** — squash-merge the code to the default branch, then archive the change to `openspec/changes/archive/YYYY-MM-DD-<name>/`. Fronts `/opsx:archive`.

Loop back any time: `/save` as often as you like while building; re-`/plan` if the spec needs to change.

## Where the plan and record live

The plan is the change folder, on the default branch's history once shipped — `openspec list` shows every active change from a fresh clone, so there's no branch-hunting to find what someone is building. The record of what shipped is the **archived change** plus the synced `openspec/specs/`. There are no GitHub planning or summary issues; the change *is* the plan and its archive *is* the record.

**Branch name = change name.** That convention is the whole tie between a plan and its code: `/save` cuts the branch from the change name, and `/continue` and `/ship` find the branch from it.

## `/continue` is not `/opsx:continue`

WongStack's `/continue` **resumes a change and implements it** — it loads context and runs OpenSpec's *apply* step so you can pick work back up on any machine. OpenSpec's own step-by-step drafting stepper is a different thing; don't reach for it expecting to resume implementation. When you want to build, `/continue`.

See also [Adding a skill](adding-a-skill.md) for how a new verb gets wired through the payload.
