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
