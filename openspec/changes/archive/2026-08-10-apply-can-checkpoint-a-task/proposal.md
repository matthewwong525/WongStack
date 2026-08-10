# apply-can-checkpoint-a-task

**Status:** ready-to-ship
**Open questions:** none

## Why

`/apply` is told two things that can contradict each other. It must invoke `/save` when every task
is complete, and it must **never** invoke `/save` "while pending tasks remain". But WongStack's own
delivery doctrine says nothing builds locally and the gate is CI — so a task like *"confirm the
build passes"* or *"confirm the preview deploys"* is only doable by pushing, and `/apply` owns no
git. The task cannot finish until `/save` runs, and `/save` is not allowed to run until the task
finishes. The agent then either stalls or quietly breaks the stated rule.

The rule was written to stop one specific behavior: `/apply` silently pushing half-done work when it
gives up. It over-reached and became a ban on `/save` as a *tool*, not just as an *exit*.

## What Changes

- Split the one over-broad prohibition into the two distinct things it was conflating:
  - **Checkpoint-on-exit** (still banned) — `/apply` never invokes `/save` as a way of *stopping*.
    Paused, blocked, interrupted, failed, or simply out of session: report the remaining work and
    let the user checkpoint deliberately.
  - **Checkpoint-as-implementation** (newly allowed) — when a task's own definition of done requires
    the gate (CI green, a deployed preview, browser evidence), invoking `/save` *is* how that task is
    implemented. `/apply` runs it, reads the result, marks the task, and continues with the
    remaining tasks.
- Keep the completion handoff exactly as it is: one automatic `/save` at all-tasks-done. The
  "exactly once" count applies to that handoff, not to task-driven saves, which are unbounded and
  driven by `tasks.md`.
- Give `/plan` a matching rule so the shape is legible from the plan: a task that can only be
  verified through the gate says so in its own text (e.g. "…via `/save`"), rather than leaving the
  implementer to infer it.
- State the distinction once in [the change loop](../../../wiki/development/the-change-loop.md) and
  have the skills point at it, per `payload-single-source`.

**Non-goals:** no change to what `/save` does, to the gate ladder, to the prose allowlist, or to
`/walk` (which already invokes `/save` mid-change — the precedent this generalizes).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `apply-completion-handoff`: the "Incomplete apply does not automatically checkpoint" requirement
  is narrowed to checkpoint-on-exit, and a new requirement permits `/save` as the implementation of
  a gate-requiring task.

## Impact

- `.claude/skills/apply/SKILL.md` — the **Boundaries** rule.
- `.claude/skills/openspec-apply-change/SKILL.md` — the step-6 completion branch and its guardrails.
- `.claude/skills/plan/SKILL.md` — the task-authoring rule.
- `wiki/development/the-change-loop.md` — the `/apply` bullet and the `/apply` vs `/continue` section.
- `VERSION` + `CHANGELOG.md` — payload edit, so a release.

## Decision log

- **2026-08-10** — Planned and implemented in one session. The fix is one distinction — **exit versus
  implementation** — rather than an exception list: the old rule used "tasks pending" as a proxy for
  "`/apply` is giving up", and the proxy is what deadlocked. Rejected three alternatives: forbidding
  gate-requiring tasks in `/plan` (contradicts the gate doctrine), letting `/apply` run git directly
  (duplicates `/save`), and dropping the rule entirely (loses the property that a stopped `/apply`
  pushes nothing). `wiki/development/the-change-loop.md` owns the sentence under a new
  `### /apply never saves to stop, but may save to finish a task`; `apply`, `plan`, and the generated
  `openspec-apply-change` skills point at it. `.claude/commands/opsx/apply.md` needed no edit — it is
  a one-line pointer. Noted while implementing: `scripts/check-payload-links.mjs` resolves file paths
  only and does **not** validate `#anchors`, so the three anchor links added here were checked by
  hand. Released as 10.2.0. Task 4.4 (confirm the gate) is the change dogfooding its own new rule —
  it is completed by this checkpoint, not by a local command.
- **2026-08-10** — Gate green on PR #66, which completes task 4.4. The rule's first live
  exercise worked exactly as written: `/apply` invoked `/save` to implement the final task rather
  than to stop, and because that task was the last one, its checkpoint served as the completion
  handoff with no second redundant save. Status: ready-to-ship.
- **2026-08-10** — Archived to `openspec/changes/archive/2026-08-10-apply-can-checkpoint-a-task/`
  by `/ship`; `openspec/specs/apply-completion-handoff/` holds the synced result. Checkpointed by the
  ordinary `/save` that `/ship` delegates, then squash-merged on that gate result.
