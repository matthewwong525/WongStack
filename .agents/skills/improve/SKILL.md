---
name: improve
description: Find and ship one high-impact maintenance fix: cleanup, security, reliability, stale guidance, or speed. Supports --audit-only and an area.
user-invocable: true
---

# /improve

Find the most valuable improvement the evidence supports, and deliver **one coherent change** through [`/ship`](../ship/SKILL.md). [Repository improvement](../../../wiki/development/repository-improvement.md) owns cadence and scheduling.

**Invocation:** `/improve [area]` reviews the repository, or only a literal repository-relative path. `/improve --audit-only [area]` stops at ranked findings: no edit, fetch, branch, PR, durable report, or merge. A normal invocation authorizes one eligible improvement through `/ship`; discussing this skill does not.

## Establish the run

`main` means [the default branch](../save/references/git-gate.md#the-default-branch). Before selection, a normal run needs:

- A dedicated, clean checkout whose `HEAD` equals the available remote-tracking default branch. Never fetch, reset, switch, stash, commit, or repair it; its scheduler or git-owning workflow refreshes it.
- Readable active work: `openspec context --json`, `openspec list --json`, relevant proposals and diffs, and open pull requests (`gh pr list --state open --json number,title,headRefName,baseRefName,url` with GitHub). A failed read is unknown, not empty.

Unrelated unfinished work, or missing freshness or overlap evidence, blocks delivery: say so and stop before `/ship`. Audit-only may run dirty or stale: report revision, dirty state, and missing context, and change no Git state.

## Survey recent work and one rotating area

From the repository root, run the survey, with an optional area as one literal argument (no shell interpolation):

```bash
node .claude/skills/improve/scripts/survey.mjs
node .claude/skills/improve/scripts/survey.mjs path/to/area
```

Its read-only JSON report names paths and lines, never snippets or secrets, and never proves the repository safe.

- **Recent range:** since the latest usable `Maintenance-Revision:` in an archived change marked exactly `Maintenance-Origin: /improve`, else seven days or the repository start. Report a missing or non-ancestor marker; sample a long or incomplete range and name what you left out.
- **Rotation:** a weekly UTC target, preferring an area outside recent changes; if every area changed recently, say so and use the calendar target. A supplied area bounds rotation and recent review. Rotation advances even when nothing is saved; it guides coverage and proves no full audit.
- **Gaps:** investigate unsupported languages and failed reads by hand, or state them unverified. An empty candidate list means no heuristic matched, not no problem.

## Investigate before ranking

Read relevant docs, tests, entrypoints, callers, and history. To avoid duplicate work, check the active work from [Establish the run](#establish-the-run) and prior `/improve` records: archived proposals with the exact origin marker, `Maintenance-Stage:`, and `Maintenance-Next:`. Recheck evidence before continuing a stage. Don't mine notes and archives for random cleanup; preserve historical records.

- **Duplication and dead code:** read [consolidation guidance](references/consolidation.md).
- **Security:** read [security guidance](references/security.md).
- **Documentation:** follow the owning docs and wiki rules; settle a conflict by intended current behavior, not file age. Selected doc maintenance is explicit task scope.
- **Performance:** set a repeatable baseline and measurement; file size or an eager import is only a lead.
- **Dependencies:** broad upgrades belong to the dependency workflow; a current authoritative advisory for an installed, reachable version can support one bounded security fix.

Rank a short candidate list in chat, each with `path:line` evidence, impact, prior work or recurrence, confidence, intended behavior, bounded scope, and a verification probe. A pattern match, tool failure, unused-looking export, or passing build is not proof alone.

## Select with explicit execution context

After the ranked list, before any edit, an interactive run asks one group of one to three material multiple-choice questions in [the ask format](../explore/references/asking-the-user.md): which candidate, or a behavior choice that changes the result. No filler.

A run is unattended only when the invocation or trusted host context says so explicitly, as [a scheduler's prompt](../../../wiki/development/repository-improvement.md#run-it-on-a-cadence) does. Never infer it from the clock, tool availability, or a missing reply. Unattended, take supported recommended defaults labeled `assumed`, defer unresolved product, authorization, or policy choices, and, before delivery begins, move to an independent eligible candidate when possible.

Prefer confirmed faults and material recurring maintenance cost. Eligible: current documentation, consolidation (only when copies share meaning), reliability, confirmed security fixes, measured performance, and workflow tooling, with directly related tests and docs. Defer feature retirement, uncertain business rules, authorization-policy redesign, destructive data work, and credential or account operations.

No supported worthwhile candidate means **no change**: report coverage and deferred decisions; no filler work. Audit-only reports ranked findings and stops here.

## Hand one intent to /ship

Invoke [`/ship`](../ship/SKILL.md) with one explicit intent: the problem and its ranked evidence, impact, bounded area, before/after behavior, acceptance probe, relevant docs, why it won, prior work, chosen and assumed answers, deferred decisions, and these exact record lines:

```text
Maintenance-Origin: /improve
Maintenance-Revision: <surveyed HEAD>
Maintenance-Area: <rotation or supplied area>
```

Nested exploration must not re-ask settled answers. `/ship` and its verbs own all planning, Git, CI, verification, archive, and merge. Don't copy their commands, weaken a gate, change candidates once delivery starts, or pick a second fix if delivery stops.

Split larger work only into independently correct stages, recorded in the normal change record, never a second backlog. An open stage records:

```text
Maintenance-Stage: <line-slug> 1 of 3
Maintenance-Next: <one-line scope of the following stage>
```

The final stage records `Maintenance-Stage: <line-slug> 3 of 3` and no `Maintenance-Next:` line, closing the line.

## Report

State **shipped**, **audit only**, **no change**, or **blocked**, with the selected work and why it won, answers chosen and assumed, revision, recent-range source, rotation area, coverage gaps, stage status, key deferred decisions, and `/ship`'s evidence and links. Results stay in the caller's output: no report store or notification unless asked. An interactive run ends with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step), normally the next candidate, recommended first. An unattended run reports and stops.
