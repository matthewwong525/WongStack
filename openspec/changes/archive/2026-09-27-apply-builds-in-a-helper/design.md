# Design

## Context

[`/apply`](../../../.agents/skills/apply/SKILL.md) works `tasks.md` in the conversation that invoked it, after `/explore` and `/plan` have filled that conversation. The plan is already on disk: proposal, delta specs, design, tasks, and the Decision log. `openspec instructions apply --change <name> --json` names every file a builder needs (`contextFiles`). So a fresh agent loses nothing it needs by not seeing the planning talk.

Claude Code starts a helper with the Agent tool (`general-purpose` type, which can edit). Codex has its own sub-agents. A subagent could not see the structured ask tool on 2026-09-15 (memory #96), so a helper can't ask the person.

`scripts/measure-usage.mjs` already groups billed cost by active skill (`attributionSkill`) and splits main thread from subagents. It does not report context size.

## Goals / Non-Goals

**Goals:**
- The parent's context stays near its size at build start; build tool output lands in the helper.
- One brief that the helper reads, so the parent's prompt stays a two-line pointer.
- A repeatable before/after measurement.

**Non-Goals:**
- Parallel helpers per task. Tasks often depend on each other; one helper at a time keeps order.
- Helpers for `/plan`, `/save`, `/ship`, or `/verify`.

## Decisions

- **The brief is a file: `.agents/skills/apply/references/build-helper.md`.** The parent's prompt names the change and says: *read this brief, then build*. Alternative: inline the brief in `SKILL.md`. That loads it in every parent too, and the parent never follows it.
- **The brief carries only what the helper needs.** Run `openspec instructions apply --change <name> --json`, read every `contextFiles` path, work pending tasks in order, write tests beside the code as tasks say, tick each checkbox. Stop and return on ambiguity, a blocker, or a gate task (link [exit versus implementation](../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task)). Never ask, run git, run `/save`, upload a preview, delete caches, or run global installers. Return at most about ten lines: tasks done, files changed, stop reason with the exact question or blocker.
- **The parent loops.** Start helper → read report → if a question: ask the person, then start a new helper; if a gate task: run `/save`, mark the task on success, then start a new helper; if a blocker: report and stop; if all done: [finish with a preview](../../../.agents/skills/apply/SKILL.md#finish-with-a-preview). A new helper, not a resumed one, keeps each run's context fresh and works on every host.
- **Inline fallback.** No helper tool, or `/apply` already inside a helper → work the tasks inline, the old path. Alternative: fail. That breaks `/apply` on hosts that work today.
- **Model: inherit.** The helper runs on the parent's model. Alternative: a cheaper model. It risks worse code for a saving the measurement has not shown yet.
- **Follow-up edits stay in the parent.** A tweak after the preview (*make it blue*) is small; a helper would cost more to start than the edit. A follow-up that adds tasks to `tasks.md` goes through a helper.
- **Measurement: a context-by-skill view in `measure-usage.mjs`.** For each main-thread request, context = input + cache writes + cache read. Per task and per skill, record the first request's context and the peak; report median and p90 per skill. Alternative: a separate script. The existing parser already has the requests and skills; a second parser would duplicate it.
- **Baseline (2026-09-27, 127 sessions that ran `/apply`):** context at build start median 119k, p90 203k; peak median 297k, p90 520k; 2 compacted.

## Risks / Trade-offs

- [The helper re-reads the plan files, a cache miss for their tokens] → the plan is a few thousand tokens; the parent's saved carry-over is about 120k tokens per step.
- [A helper misreads the plan without the planning talk] → the Decision log holds every answer and assumption; the brief tells it to read the proposal first. A mismatch shows in the parent's preview.
- [A helper ignores the stop rule and guesses] → the brief names each stop case, and the parent reads the report before the preview.
- [The parent's own context still grows with each report] → reports are capped at about ten lines.

## Migration Plan

A minor release. `/wong-sync` brings the new `/apply` section, the brief, and the change-loop line. Installed repos need no other step. Rollback: revert the `SKILL.md` section; the brief is then unused.

After ship, rerun `node scripts/measure-usage.mjs --since <ship date>` once several builds have run, and compare the `apply` row with the baseline.
