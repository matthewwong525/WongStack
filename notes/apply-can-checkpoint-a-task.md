---
slug: apply-can-checkpoint-a-task
started: 2026-08-10
updated: 2026-08-10
consolidated:
---

# apply-can-checkpoint-a-task

## What the user observed

"Sometimes `/apply` has a rule where it can't run `/save` until it finishes all its tasks, but
sometimes that task is to make sure build works, which requires `/save`." They asked for an elegant
fix — which ruled out patching it with a special case.

## The deadlock, precisely

Two payload statements contradicted each other, both true-sounding in isolation:

- `.claude/skills/apply/SKILL.md` — do not invoke `/save` if implementation "still has pending tasks".
- `wiki/development/the-change-loop.md` § The gate — "nothing builds locally as a prerequisite";
  the gate is CI when present.

So "confirm the build passes" is not a local command, it is a push. `/apply` implements no git. The
task cannot complete without `/save`; `/save` was not permitted until the task completed. An agent
meeting this either stalls or silently breaks the written rule — and silently breaking a written
rule is the worse outcome, because nothing in the repo then records which rule is real.

## Why the chosen shape, and what it rules out

The banned behaviour was always **`/apply` pushing half-done work when it gives up**. "Tasks
pending" was only ever a *proxy* for that, and the proxy is what fails. Naming the real predicate —
**exit versus implementation** — fixes the deadlock and keeps the protection whole.

Ruled out along the way:

- **Forbid gate-requiring tasks in `/plan`.** Contradicts the gate doctrine; for some work the
  deployed result genuinely is a prerequisite for the next task.
- **Let `/apply` run git directly for build checks.** Duplicates push/CI/preview logic `/save` owns
  and breaks the loop's one clean boundary.
- **Drop the rule entirely.** Loses the property worth keeping: a stopped `/apply` leaves nothing
  pushed and hands the user the decision.

`/walk` already invoked `/save` mid-change and gated nothing, so the precedent existed — this makes
it the loop's rule instead of one skill's exception.

## Facts worth keeping beyond this change

- **`scripts/check-payload-links.mjs` resolves file paths only — it does not validate `#anchors`.**
  A link to a heading that does not exist passes the check silently. Anchors added to a payload page
  must be verified by hand. (Three were, here.)
- **`.claude/skills/openspec-apply-change/` is generated per repo by `openspec init` and is *not*
  copied by the installer** (payload manifest, "The `openspec-*` skills"). This repo's copy carries
  WongStack customization; a target repo's copy is stock. So `.claude/skills/apply/SKILL.md` has to
  be the surface that *owns* any apply-stage rule — the generated skill gets a matching edit here,
  but cannot be relied on downstream.
- **`.claude/commands/opsx/*.md` are one-line pointers at the correspondingly named `openspec-*`
  skill.** Editing the skill is sufficient; the command needs no matching edit. This is what keeps
  the two entry points from drifting.
- The branch this session started on (`apply-circular-task-save`, itself renamed from the worktree
  name `macabre-jellyfish`) did not match the change name. Renamed to the change name in `/save`
  Step 3 — free, since it had no commits and no remote.

## Open thread

`openspec list` shows a change named `improve-openspec-plans` with **no tasks** and an empty folder.
Not touched by this session. Worth deciding whether it is real work or a stray scaffold.
