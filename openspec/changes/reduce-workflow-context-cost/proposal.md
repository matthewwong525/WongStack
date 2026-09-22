# Reduce workflow context cost

**Status:** in-progress
**Branch:** explore/token-efficiency
**Open questions:** none

## Why

WongStack spends agent context on procedures that do not apply to the current task and on repeated mechanical work. Reduce that required reading and automate checkpoint evidence and formatting while preserving workflow outcomes, review quality, and delivery checks.

## What Changes

- Make `/save` a short main procedure with explicit conditions for loading named-secret handling, prose-only saves, new-plan fallback, and archived handoffs. Keep every required check reachable on its route. (review.html#/save-routes/after/conditions)
- Extend checkpoint helpers to return compact, structured branch and change evidence. Keep intent selection and ambiguous choices with the agent, and preserve each verb's selection rules. (review.html#/checkpoint-evidence/default/structured)
- Generate the PR body's mechanical sections from the selected change and explicit metadata. Keep summary judgment with the agent and preserve tasks, review and preview links, and active or archived handoff text. (review.html#/pr-body/default/renderer)
- Make routine review authors read the author guide and relevant examples instead of the fixed viewer implementation. Keep the standalone page, builder, structural checks, rendered critique, and revision round. (review.html#/author-inputs/default/focused)
- Add repeatable instruction-load measurements and behavior regression coverage. Require lower source and route reading totals, preserve special-case handling, and report runtime token use only when measured. (review.html#/measurement/default/evidence)

**Non-goals:** Reuse or remove checkpoints; change public verbs, review requirements, CI gates, retry budgets, or merge policy; replace OpenSpec; automate semantic spec reconciliation or session-note judgment; add a workflow engine or runtime cache; change Cloudflare, the browser vendor skill, historical records, or application behavior.

## Capabilities

### New Capabilities

- `checkpoint-helpers`: Read-only structured checkpoint evidence and deterministic PR-body assembly with explicit error handling.

### Modified Capabilities

- `context-economy`: Conditional procedure loading, focused review-author inputs, and repeatable source and route measurements with preserved behavior.

## Impact

Primary surfaces are `.agents/skills/save/`, `.agents/skills/plan/`, and narrow helper call-site changes in apply, continue, ship, and verify. Helpers ship through the existing payload inventory; regression fixtures and the instruction measurement tool remain meta-repo tools under `scripts/`. Update affected owner instructions and payload manifests only where necessary. A payload version bump and changelog entry accompany implementation. No new runtime dependency is expected. Existing changes, notes, archives, reviews, and helper entry points remain usable.

## Decision log

- **2026-09-22** — Asked which token cost to prioritize → chose the full workflow, including repeated reads, generated records, and tool output.
- **2026-09-22** — Asked whether scripts belong in scope → chose documentation and scripts, retaining model judgment for work that needs it.
- **2026-09-22** — Asked what this first plan should include → chose instruction loading and helpers; checkpoint reuse is deferred until its validity rules can be tested.
- **2026-09-22** — Asked what evidence completion requires → chose behavior and instruction-load checks; comparable runtime agent runs are optional, and source counts cannot be called token savings.
- **2026-09-22** — Assumed existing public verbs, records, required HTML reviews, human decisions, checkpoint count, and delivery behavior remain compatible because the request requires the same efficacy.
- **2026-09-22** — Assumed dependency-free helpers within the current skills and meta-only measurement tooling; this replaces repeatable work without introducing another workflow layer.
- **2026-09-22** — The bounded explore exit round is complete. Remaining implementation details use supported assumptions recorded in the design.
- **2026-09-22** — The user requested `/ship` after planning, authorizing implementation and delivery after this review. The browser checker passed all five visuals; all six states render at 1440×1000 and 390×844 without page overflow, and offline reload works. The critic checked rendered meaning, Details, joins, and draft close/reopen/save; the revision clarifies that the shared save caption describes the proposed behavior.

- **2026-09-22** — Implementation checkpoint: version 16.3.0 preserves the route audit and adds helper/renderer fixtures plus repeatable source accounting. Core instructions are 18,140 → 16,021 words; normal-save input is 9,130 → 5,766 words; author input is 55,807 → 12,511 bytes. Cold orientation adds 192 words for the explicit evidence contract. Measurements are in measurements.json; runtime tokens were not measured. Payload link/config and strict plan checks pass. CI remains the final task.
