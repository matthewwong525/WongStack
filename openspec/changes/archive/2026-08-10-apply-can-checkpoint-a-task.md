<!-- openspec-archive v1 2026-08-10-apply-can-checkpoint-a-task -->
<!-- file proposal.md utf8 5323 -->
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
- **2026-08-10** — Merge conflict with `main`, which had meanwhile shipped **v11.0.0** ("the sync
  proposes, `/apply` disposes", PR #65). Resolved as the union of intent: v11.0.0 touched none of this
  change's files — no semantic overlap, only `VERSION` and `CHANGELOG.md` collided. Renumbered this
  release **10.2.0 → 11.1.0** and re-ordered the changelog newest-first. The earlier log entries say
  10.2.0; **11.1.0 is the shipped version**, and `tasks.md` 4.1/4.2 name the pre-merge number.

<!-- end proposal.md -->
<!-- file design.md utf8 4809 -->
## Context

Three payload surfaces state the `/apply` → `/save` boundary today, and all three phrase the
prohibition the same over-broad way:

- `.claude/skills/apply/SKILL.md:40` — "If implementation pauses, is blocked, is interrupted, fails,
  **or still has pending tasks**, do not invoke `/save`."
- `.claude/skills/openspec-apply-change/SKILL.md:150` — "Never invoke `save` automatically **while
  pending tasks remain**."
- `wiki/development/the-change-loop.md:20` — "A paused or blocked plan/apply does not auto-save."

Against that sits the delivery doctrine on the same wiki page: the gate is CI when present, and
**nothing builds locally as a prerequisite**. So "confirm the build works" is not a local command —
it is a push. `/apply` implements no git. The only route to that result is `/save`. A `tasks.md`
containing such a task is therefore unimplementable under the literal rule, while remaining exactly
the kind of task `/plan` is encouraged to write.

`/walk` already resolves the same tension in its own favour: it invokes `/save` mid-change, as often
as you like, and gates nothing. This change generalizes that precedent to `/apply` instead of
leaving it as a one-skill exception.

## Goals / Non-Goals

**Goals:**

- Remove the contradiction without weakening what the rule was protecting.
- Express it as one distinction a reader can apply to a new case, not a list of exceptions.
- State it once (the change loop) and have the skills point at it.

**Non-Goals:**

- Changing `/save`, the gate ladder, the prose allowlist, or `/walk`.
- Making any verification task mandatory.
- Letting `/apply` implement git. It still owns none; it *invokes* `/save`.

## Decisions

**The distinction is exit vs. implementation, not complete vs. incomplete.**
The banned thing was always "`/apply` pushes when it gives up" — a checkpoint used as an *exit*.
Task completion was a convenient proxy for that, and it is the proxy that fails. Replacing the proxy
with the real predicate fixes the deadlock and leaves the protection intact: a paused, blocked, or
failed `/apply` still never saves.

*Alternatives considered.* (a) **Forbid gate-requiring tasks in `/plan`** — rejected: it contradicts
the gate doctrine, since for some work the deployed result is genuinely a prerequisite for the next
task, and it pushes the problem into `/save`'s fallback authoring. (b) **Let `/apply` run git
directly for build checks** — rejected: it duplicates push/CI/preview logic that `/save` owns and
breaks the loop's one clean boundary. (c) **Allow `/save` at any point, no rule** — rejected: it
loses the property that a stopped `/apply` leaves nothing pushed and hands the user the decision.

**"Exactly once" is re-scoped, not removed.**
It now qualifies the *completion handoff* only. Task-driven saves are unbounded because `tasks.md`
bounds them. The one interaction to handle: when the final task is itself gate-requiring, its save
already checkpointed that exact state, so `/apply` reports from that result rather than firing a
redundant second save.

**A failing task-driven gate is the ordinary blocked path.**
No new failure machinery: the task is not checked off, `/apply` reports and stops, and it does not
then add an exit checkpoint on top (the state is already pushed).

**`/plan` labels these tasks; it does not require them.**
Writing "…verified via `/save`" in the task text makes the shape legible to a cold implementer and
costs nothing when no such task exists.

### Wording to land

The change loop owns the sentence; the skills cite it.

> `/apply` never invokes `/save` as a way of *stopping* — paused, blocked, or interrupted work is
> reported, and you checkpoint it deliberately. But when a task's own definition of done needs the
> gate — CI green, a live preview, browser evidence — invoking `/save` *is* how that task gets
> implemented, because `/apply` owns no git and nothing builds locally. Then it carries on down the
> list. One automatic save still closes the change when the last task lands.

## Risks / Trade-offs

- **The distinction gets read as "save whenever"** → the wording leads with the ban and names the
  trigger narrowly (the task's own definition of done requires the gate), and the specs carry a
  scenario for the exit case.
- **Double save at the end of the list** → covered by an explicit requirement scenario.
- **`openspec-apply-change/SKILL.md` is a generated skill** → it is already WongStack-customized and
  tracked in the payload manifest; edit it in place as the other surfaces are edited, and keep the
  existing single-source pointer style.
- **Payload edit without a local test suite** → `node scripts/check-payload-links.mjs` plus the
  `VERSION`/`CHANGELOG.md` release discipline is the check, per `CLAUDE.md`.

<!-- end design.md -->
<!-- file tasks.md utf8 2945 -->
## 1. State the distinction once

- [x] 1.1 In `wiki/development/the-change-loop.md`, rewrite the `/apply` bullet so the boundary reads exit-vs-implementation: `/apply` never saves as a way of *stopping*, but invokes `/save` when a task's own definition of done needs the gate, then continues down the list; one automatic save still closes the change. Use the wording drafted in design.md ("Wording to land").
- [x] 1.2 In the same page's `## /apply vs /continue` section, keep the completion sentence accurate — "exactly once" now qualifies the completion handoff only.
- [x] 1.3 Confirm no other wiki page restates the old rule (`grep -rn "pending tasks\|partial checkpoint" wiki/`); repoint any hit at the change-loop sentence rather than restating it.

## 2. Update the skills that front apply

- [x] 2.1 In `.claude/skills/apply/SKILL.md`, replace the **No automatic partial checkpoint** boundary bullet with the two-part rule: no checkpoint-on-exit (paused, blocked, interrupted, failed, or simply ending with tasks pending → report, don't save), and `/save` as the implementation of a gate-requiring task. Link the change-loop sentence rather than re-deriving it.
- [x] 2.2 In the same file, re-scope "Invoke it exactly once" to the completion handoff, and state that a final task already checkpointed by a task-driven `/save` does not get a second, redundant save.
- [x] 2.3 In `.claude/skills/openspec-apply-change/SKILL.md`, apply the matching edit to the step-6 completion branch and to the guardrail lines that currently say "never invoke `save` automatically while pending tasks remain". Keep the edit minimal and keep `.claude/skills/apply/SKILL.md` as the surface that owns the rule — this skill is regenerated per repo by `openspec init` and a target repo's copy is stock.
- [x] 2.4 Verify `.claude/commands/opsx/apply.md` is still a one-line pointer needing no edit (per the payload manifest), and leave it alone if so.

## 3. Teach `/plan` to label these tasks

- [x] 3.1 In `.claude/skills/plan/SKILL.md`, add a short rule beside "Tasks include their tests": a task that can only be verified through the gate says so in its own text (naming `/save`), and no such task is written when nothing mid-list depends on a gate result.

## 4. Release and verify

- [x] 4.1 Bump `VERSION` to `10.2.0` (behavioural payload change, backwards compatible).
- [x] 4.2 Add the newest-first `CHANGELOG.md` entry for 10.2.0, explaining the deadlock and the exit-vs-implementation distinction in the voice of the existing entries.
- [x] 4.3 Run `node scripts/check-payload-links.mjs` and fix any dead link it reports (this repo's payload check — it exits non-zero on a defect).
- [x] 4.4 Confirm the change passes the gate — push and read the CI result **via `/save`**; nothing builds locally here, so this task is completed by the checkpoint, not by a local command. (Doubles as the first live exercise of the rule this change adds.)

<!-- end tasks.md -->
<!-- file specs/apply-completion-handoff/spec.md utf8 3954 -->
# apply-completion-handoff Delta

## MODIFIED Requirements

### Requirement: Incomplete apply does not automatically checkpoint

`/apply` MUST NOT invoke `/save` **as a way of stopping**. When implementation is paused, blocked,
interrupted, fails, or simply ends with tasks still pending, `/apply` SHALL report the remaining work
and SHALL tell the user that `/save` remains available for an intentional partial checkpoint.

This prohibition is scoped to the exit path. It SHALL NOT be stated as a ban on invoking `/save`
while pending tasks remain, because a task may itself require the gate — see "Save is how a
gate-requiring task is implemented".

#### Scenario: Implementation pauses with pending tasks

- **WHEN** `/apply` stops because of ambiguity, a blocker, interruption, or an implementation failure while tasks remain
- **THEN** it does not invoke `/save`
- **AND** it reports the remaining work and the option to run `/save` manually

#### Scenario: A gate-requiring task is not treated as an exit

- **WHEN** `/apply` invokes `/save` to implement a task that requires the gate, and tasks remain after it
- **THEN** this is not an exit checkpoint and the prohibition does not apply
- **AND** `/apply` continues with the remaining tasks rather than stopping

## ADDED Requirements

### Requirement: Save is how a gate-requiring task is implemented

`/apply` SHALL invoke `/save` to perform a task whose own definition of done requires something only
the gate can produce — a passing CI run, a deployed preview URL, pushed browser evidence — then read
the result, mark the task accordingly, and continue with the remaining tasks. Invoking `/save`
this way is implementation of that task, not a partial checkpoint, because `/apply` owns no git and
nothing builds locally as a prerequisite (see the `delivery-gate` capability).

Task-driven invocations SHALL be unbounded and driven by `tasks.md`. The "exactly once" constraint
SHALL apply only to the automatic completion handoff.

Payload surfaces that front the apply step SHALL state this distinction by pointing at the one
surface that owns it, per the `payload-single-source` capability.

#### Scenario: A mid-list task requires a passing build

- **WHEN** a pending task states that the build or CI must pass, and later tasks remain
- **THEN** `/apply` invokes `/save` to push and obtain the gate result
- **AND** marks the task complete when the gate reports success
- **AND** proceeds to the next pending task without a second completion handoff

#### Scenario: The gate reports failure on a task-driven save

- **WHEN** a task-driven `/save` returns a failing or unverifiable gate result
- **THEN** `/apply` does not mark that task complete
- **AND** it handles the failure as the ordinary blocked path — report and stop, without a further exit checkpoint

#### Scenario: The final task is itself gate-requiring

- **WHEN** the last pending task is completed by a task-driven `/save`
- **THEN** `/apply` does not invoke a second, redundant completion `/save` for the same state
- **AND** it reports completion using that checkpoint result

### Requirement: Plans name gate-requiring tasks explicitly

`/plan` SHALL author a task that can only be verified through the gate so that the task text says so
— naming `/save` as how the verification happens — rather than leaving the implementer to infer it.
This SHALL NOT introduce a mandatory verification task: a change whose work needs no gate result
mid-list gets none, and the completion handoff covers it.

#### Scenario: A change needs a mid-list build check

- **WHEN** `/plan` writes a task whose done state depends on CI, a deployed preview, or browser evidence
- **THEN** the task text states that it is verified through `/save`

#### Scenario: A change needs no mid-list gate result

- **WHEN** no task depends on a gate result before later tasks can proceed
- **THEN** `tasks.md` contains no such verification task

<!-- end specs/apply-completion-handoff/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-10

~~~
<!-- end .openspec.yaml -->
