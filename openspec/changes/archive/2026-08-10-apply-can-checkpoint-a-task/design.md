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
