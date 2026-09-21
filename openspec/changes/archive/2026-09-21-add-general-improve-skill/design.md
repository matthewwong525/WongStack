## Context

See [the proposal](proposal.md) for scope and user choices. ClaymooApp has a working maintenance skill, a tracked-file survey, and investigation references. Its fixed app paths, main-branch assumption, and ambiguous unattended fallback do not fit a general toolkit. WongStack owns delivery through `/ship` and distributes skills from a manifest.

## Goals / Non-Goals

**Goals:** Reuse the useful maintenance method, discover target structure, make repeated runs bounded, and keep evidence and delivery in existing records.

**Non-Goals:** Language-complete static analysis, a new scheduler or state database, guaranteed security coverage, or a separate implementation/merge pipeline.

## Decisions

### 1. A thin skill with deterministic survey helpers

Keep the run sequence and handoff in `SKILL.md`; put consolidation and security investigation guidance in references. Adapt the Node survey with no new runtime dependencies. Inventory tracked current text, missing local links, repeated blocks, large files, and security-sensitive locations. Emit bounded JSON with explicit exclusions, supported file types, read failures, and revision information. Do not emit source snippets or secret values.

Discover documentation and source roots from current files and owning docs. Do not require Cloudflare, React, TypeScript, or an app directory. Inspect unsupported languages manually when relevant and report the gap. Honor the real `.agents/` tracked layout and `.claude/` alias without counting both. Reject escaped scopes and file reads through symlinks outside the repo. A safely resolved in-repo scope alias can map to its real tracked path.

Alternative: model-only inventory repeats expensive work and can miss files inconsistently. A full cross-language scanner would add dependencies and overstate the scope of a spot check.

### 2. Recent changes plus rotation without a report database

Read relevant active OpenSpec changes, open PRs, and prior maintenance records before selection. Use the latest usable `Maintenance-Revision:` baseline from shipped maintenance records for the recent range; otherwise use the last seven days and state the fallback. If the baseline is unavailable or not an ancestor, report that and use the bounded fallback. A long gap can require sampling; name any omitted range.

Discover a stable, sorted list of maintained areas from tracked files. Group top-level roots, splitting skill and monorepo package roots into useful children. Exclude generated files, secrets, and historical records from routine candidate scanning. Choose a rotation start with a UTC week ordinal modulo the number of areas, then walk the list to find an area outside the recent-change set when possible. A testable date input keeps selection reproducible. With unchanged areas this cycles through the list across weeks, including weeks with no saved fix. Same-week runs can revisit an area; the skill still checks prior outcomes before choosing work. If all areas changed recently, state the overlap and select the rotation target anyway. A user-supplied area bounds both passes.

Use history to explain intent and recurrence, not as a bulk source of stale cleanup candidates. The selected change records `Maintenance-Origin: /improve`, `Maintenance-Revision: <surveyed commit>`, `Maintenance-Area: <rotation area>`, coverage limits, and the selection rationale in its Decision log. No-change and audit-only runs return this context in the captured output without creating a commit merely to advance rotation.

Alternative: a persistent cursor gives exact visit tracking but forces report-only writes. Calendar rotation needs no new store; it cannot guarantee that skipped weeks or a changed area list cover every area.

### 3. Investigate and select by real impact

Rank a short list with path/line evidence, concrete impact, confidence, relevant prior work, expected behavior, scope, and a verification probe. Trace security leads from controlled input through actual checks to the affected action. Verify advisories against current authoritative sources when dependency risk is investigated. Treat pattern matches and tool failures as leads or limits, never a clean bill of health.

Consolidation requires shared meaning, not similar syntax. Dead-code removal requires runtime and external caller investigation. Documentation changes must follow owning docs and the target's wiki rules. Treat selected documentation maintenance as explicit task scope. Preserve historical notes and archives. Broad dependency upgrades stay with a separately requested dependency workflow; a confirmed vulnerable dependency can be a bounded candidate.

Prefer confirmed faults and material recurring maintenance cost. Larger work can ship in independently correct stages, using ClaymooApp's `Maintenance-Stage:` and `Maintenance-Next:` markers in the normal Decision log. The final stage has no next marker. Recheck whether prior staged work is still needed instead of blindly continuing it.

### 4. Clear execution context and one delivery owner

Normal invocation authorizes one eligible improvement through `/ship`; merely discussing the skill does not. An interactive run shows the investigated candidates and uses one question group for material selection or behavior choices before editing. Carry answers into nested exploration so settled questions are not repeated.

A scheduled job supplies explicit unattended context, for example: `Run /improve unattended. Choose supported defaults within its eligible scope and report blockers.` Trusted host context can supply the same fact. Do not infer unattended execution from time, silence, or a tool returning no answer. In unattended mode record supported defaults as assumed, defer unresolved policy decisions, and continue with an independent eligible candidate only before delivery starts.

The scheduler supplies a clean dedicated checkout at the current remote default-branch revision and serializes runs. Discover the default branch; do not hard-code `main`. Read freshness and overlap context using available read-only mechanisms. If a required refresh or checkout is needed, leave it to the existing git-owning workflow or scheduler; `/improve` does not gain git mutation steps. Missing overlap/freshness evidence blocks normal delivery. Audit-only can report findings with those limits and does not fetch or write.

Pass the chosen intent, evidence, expected behavior, probe, user answers, and maintenance markers into `/ship`. Preserve its gates and blockers. Do not change candidates once delivery starts. Defer feature retirement, uncertain product/auth policy, destructive data work, and credential/account operations. Reports use shipped, audit only, no change, or blocked and include coverage, deferred decisions, and any delivery evidence.

Alternative: copying the git pipeline would create two workflow owners. A silence-based scheduled fallback cannot distinguish an absent user from a pending answer.

### 5. Distribute and verify as one additive release

Register the skill and its references/scripts in the core inventory. Update setup collision/seed surfaces only where the current implementation names skills. Add usage and scheduling guidance to the owning workflow docs and link it from discovery surfaces. Do not perform unrelated wiki cleanup. Use the next minor version at implementation time; the current base is 16.1.0.

Add Node fixture tests to existing payload CI for inventory, path containment, aliases, partial results, supported-type limits, deterministic rotation, changing area sets, baseline fallback, and read-only behavior. Review the skill against concrete scenarios for interactive/unattended selection, active work overlap, no-change, audit-only, staged work, and blocked delivery. Use `/save` for CI evidence during implementation. Run the required payload link and OpenSpec config release checks.

## Risks / Trade-offs

- Heuristics miss defects and can produce noise → require targeted investigation and explicit coverage limits.
- Rotation can repeat or skip areas when the tree changes or weeks are missed → disclose the selected area and do not claim full coverage.
- A clean local tree can still be stale → require verified remote freshness before normal delivery.
- Weekly changes can expand into broad refactors → select one coherent improvement; stage only independently correct changes.
- A dependency fix can become a general update → bound it to the verified finding and preserve the separate update workflow.

## Scenario review

| Specification scenario | Concrete implementation or fixture |
| --- | --- |
| Weekly run with unchanged areas | `selectRotation` uses the UTC week ordinal and the fixture advances the date by seven days. |
| First run, unavailable baseline, or no saved change | `selectRecentRange` reports seven-day or repository-start fallback; rotation depends on the date, not a saved cursor. Fixtures cover no record and rejected revisions. |
| Unsupported source or failed read | The survey lists supported extensions and returns bounded read errors with `partial`; the skill requires manual investigation or an unverified limit. |
| Escaped scope | Literal-path fixtures reject `..` and an external symlink while accepting an in-repo `.claude` alias to tracked `.agents` files. |
| Security pattern with protection | The security reference requires a reachable controlled input and an ineffective check. Its authentication and authorization example prevents a pattern-only finding. |
| No worthwhile candidate | The selection section returns `no change` and forbids filler work or a report commit. |
| Interactive user has not answered | The execution-context section keeps the question pending and forbids inference from silence, elapsed time, or tool availability. |
| External unattended job | The skill and owning guide give the exact unattended prompt and label defaults `assumed`. |
| Unavailable overlap or freshness | Normal delivery stops before selection; audit-only can continue with revision, dirty state, and limits reported. |
| Failed delivery | `/ship` retains all gates; the skill reports `blocked` and does not choose a second candidate or weaker path. |
| Audit-only on a dirty checkout | Audit-only performs no fetch or write and reports revision and dirty state. |
| Final staged delivery | The last stage records its terminal `Maintenance-Stage:` marker and omits `Maintenance-Next:`. |
| Documentation-only repository | A fixture surveys only root, `docs/`, and `wiki/` Markdown files and selects a rotation area without an app tree. |
| Existing target-owned skill | The core inventory uses the install record's local-name mapping; the manifest guide states that local mappings win and are not overwritten. |

No scenario remains unmet in the implementation or planned CI fixtures.

## Migration Plan

Ship as a new core skill through normal setup/sync adaptation. Preserve an existing target-owned `/improve` through collision handling and its recorded local name. No scheduler or application migration is needed. Revert the additive payload change through the normal workflow if necessary; retain historical maintenance records.
