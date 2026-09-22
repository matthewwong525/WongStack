---
name: improve
description: Survey a repository, investigate high-impact maintenance candidates, ask one short selection round, and ship one supported fix or cleanup through /ship. Use for recurring repository maintenance, consolidation, security checks, stale guidance, reliability, or measured performance work. Supports --audit-only and an optional area.
user-invocable: true
---

# /improve

Find the most valuable improvement that the evidence supports. A normal run delivers **one coherent change** through [`/ship`](../ship/SKILL.md). The [repository improvement guide](../../../wiki/development/repository-improvement.md) owns cadence and external scheduling.

**Invocation:** `/improve [area]` reviews the repository unless the user supplies a literal repository-relative path. `/improve --audit-only [area]` stops after ranked findings. It makes no edit, fetch, branch, PR, durable report, or merge. A normal invocation authorizes one eligible improvement through `/ship`. A request to discuss this skill does not.

## Establish the run

Read the repository instructions and owning documentation. Discover the default branch. Prefer `git symbolic-ref refs/remotes/origin/HEAD`; if that reference is absent and GitHub context is available, use `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`. Do not assume `main`.

For a normal run, require all of these conditions before selection:

- The checkout is dedicated and clean.
- `HEAD` equals the available remote-tracking revision for the default branch. Do not fetch, reset, switch, stash, commit, or repair the checkout here. The scheduler or the existing git-owning workflow supplies any required refresh.
- Active work and overlap can be read through `openspec context --json`, `openspec list --json`, relevant proposals and diffs, and open pull requests. Use `gh pr list --state open --json number,title,headRefName,baseRefName,url` when GitHub is available. A failed read is unknown context, not an empty list.

Unrelated unfinished work, unavailable freshness evidence, or unavailable overlap evidence blocks normal delivery. State the condition and stop before `/ship`. Audit-only can continue on a dirty or stale checkout. Report its revision, dirty state, and unavailable context, and do not mutate Git.

## Survey recent work and one rotating area

From the repository root, run the dependency-free helper. Pass an optional area as one literal argument, without shell interpolation:

```bash
node .claude/skills/improve/scripts/survey.mjs
node .claude/skills/improve/scripts/survey.mjs path/to/area
```

The JSON report inventories supported tracked text, recent changed areas, a UTC weekly rotation target, large files, repeated blocks, missing local Markdown links, security-sensitive locations, exclusions, and read errors. It emits paths and lines, not source snippets or secret values. It does not install tools, contact services, run tests, edit files, or certify the repository as safe.

Use the latest usable `Maintenance-Revision:` from an archived change with the exact `Maintenance-Origin: /improve` marker as the recent-history baseline. The helper validates that revision as an ancestor. Without one, it reports a seven-day or repository-start fallback. If a marker is missing or is not an ancestor, report it. For a long or incomplete range, sample deliberately and name what you omitted.

The rotation is a stable sorted list of maintained areas. It splits common monorepo and skill roots into useful children, starts at the current UTC week ordinal, and walks forward to prefer an area outside recent changes. If every area changed recently, state the overlap and use the calendar target. A supplied area bounds both recent review and rotation. Calendar rotation advances even when a prior run saved no change; it is coverage guidance, not proof that every area received a full audit.

The helper supports common text formats only. Investigate relevant unsupported languages or failed reads manually, or state them as unverified. An empty candidate list means no matching heuristic, not no problem.

## Investigate before ranking

Read relevant current documentation, tests, entrypoints, callers, and history. Review active OpenSpec changes, open pull requests, and prior `/improve` records before selection. Search archived proposals for the exact origin marker. Inspect `Maintenance-Stage:` and `Maintenance-Next:` markers for staged work. Recheck current evidence before continuing a stage. Do not scan notes and archives as a source of random cleanup work, and preserve historical records.

- For duplication and dead-code leads, read [consolidation guidance](references/consolidation.md).
- For security leads, read [security guidance](references/security.md). Trace controlled input, checks, trust boundaries, and the affected action.
- For documentation, follow the target's owning docs and wiki rules. Resolve a conflict against intended current behavior, not file age. Selected documentation maintenance is explicit task scope.
- For performance, establish a repeatable baseline and a proposed measurement. File size or an eager import is only a lead.
- Broad dependency upgrades belong to the repository's dependency workflow. A current authoritative advisory for an installed, reachable version can support one bounded security fix.

Rank a short candidate list in the conversation. For each candidate, give `path:line` evidence, concrete impact, relevant prior work or recurrence, confidence, intended behavior, bounded scope, and a verification probe. A pattern match, tool failure, unused-looking export, or passing build is not proof by itself.

## Select with explicit execution context

An interactive run asks one group of one to three material multiple-choice questions after the ranked list and before any edit. Ask which candidate to take or a behavior choice that changes the result. Follow [the ask convention](../explore/references/asking-the-user.md) for the format and the tool. Do not add filler questions.

An unattended run exists only when the invocation or trusted host context says so explicitly, for example:

> Run /improve unattended. Choose supported defaults within its eligible scope and report blockers.

In unattended mode, take supported recommended defaults and label each one `assumed`. Defer unresolved product, authorization, or policy choices. Before delivery begins, continue with an independent eligible candidate when possible. Do not infer unattended mode from the clock, tool availability, or a missing reply.

Prefer confirmed faults and material recurring maintenance cost. Consolidation is eligible only when copies carry shared meaning. Eligible work includes current documentation, consolidation, reliability, confirmed security fixes, measured performance improvements, and workflow tooling. Include directly related tests and docs.

Defer feature retirement, uncertain business rules, authorization-policy redesign, destructive data work, and credential or account operations. No supported worthwhile candidate means **no change**: report coverage and deferred decisions without creating filler work. Audit-only reports ranked findings and stops here.

## Hand one intent to /ship

Read and invoke [`/ship`](../ship/SKILL.md) with one explicit intent. Include the problem and evidence, impact, bounded area, intended before/after behavior, acceptance probe, relevant docs, selection rationale, prior work, answers and assumptions, deferred decisions, and these exact record lines:

```text
Maintenance-Origin: /improve
Maintenance-Revision: <surveyed HEAD>
Maintenance-Area: <rotation or supplied area>
```

Tell nested exploration which answers were chosen and which were assumed, so it does not ask settled questions again. `/ship` and the verbs it invokes retain all planning, Git, CI, verification, archive, and merge authority. Do not copy their commands, weaken a gate, change candidates after delivery starts, or select a second fix if delivery stops.

Split larger work only into independently correct stages. Record an open stage with:

```text
Maintenance-Stage: <line-slug> 1 of 3
Maintenance-Next: <one-line scope of the following stage>
```

The final stage records `Maintenance-Stage: <line-slug> 3 of 3` and has no `Maintenance-Next:` line. This terminal marker prevents a future run from treating the line as open. Stages use the normal change record; do not create a second backlog.

## Report

State **shipped**, **audit only**, **no change**, or **blocked**. Include the selected work and why it won, chosen and assumed answers, revision, recent-range source, rotation area, coverage gaps, stage status, important deferred decisions, and the evidence and links returned by `/ship`. Keep audit-only and no-change results in the caller's captured output. Do not create a report store or notification unless the user asked for one. An interactive run closes with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step) — normally the next candidate worth taking, recommended first. An unattended run reports and stops.
