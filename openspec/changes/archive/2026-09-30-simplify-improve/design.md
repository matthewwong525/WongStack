# Design

## Context

See [the proposal](proposal.md) for the problem and scope. The current skill is an investigation runbook plus survey code; `/ship` already owns delivery. The live `repository-improvement` spec promises procedural behaviors that must be retired with the rewrite.

## Decisions

- Rewrite the skill as a short outcome brief: one meaningful improvement, informed by project goals, remembered problems, and current work; supported evidence and an appropriate verification; deliver through `/ship`; explain the benefit and result. Keep only the invocation boundary and `--audit-only` distinction. An invocation authorizes selection and delivery; discussing the skill does not. Real unresolved choices remain under normal exploration, without a compulsory candidate-selection menu.
- Use `/improve [focus]`, accepting an area or desired outcome in ordinary language. Existing literal areas still work as a focus; there is no new parser.
- Remove `.agents/skills/improve/scripts/survey.mjs`, `.agents/skills/improve/references/consolidation.md`, and `.agents/skills/improve/references/security.md`; inspect their callers and remove live references. These resources are tied to the retired compulsory investigation. Judgment is the actual repeated task here; building another deterministic selector would recreate the machinery the user asked to remove.
- Delete `scripts/tests/improve-survey.test.mjs` and remove the survey from `scripts/tests/cli-conventions.test.mjs`. Do not add tests that merely assert the new skill's words. Existing payload checks verify distribution and links; the remaining CLI suite verifies the executable inventory. The proposal records both coverage removals as `Check:` decisions.
- Update README's command row, `wiki/development/repository-improvement.md`, its development hub description, and `.agents/skills/wong-sync/references/payload-manifest.md`. The guide keeps the existing `Run it on a cadence` and `Keep one delivery owner` headings to preserve links. Scheduling remains external and clean/current/serialized, as AGENTS.md already requires; there is no special `/improve` checkout-equality gate or requirement for explicit unattended wording.
- Register removed resource paths in `scripts/retired-names.json`; leave archives and old changelog entries untouched. Skill-folder sync already distributes the remaining file, so do not add a replacement helper or alter the payload file inventory without evidence it needs it.
- Reconcile procedural promises in the existing spec using REMOVED and MODIFIED deltas. Add an outcome-led requirement; retain portability, findings-only, evidence, no-change, and the normal delivery gates. Update the main spec's Purpose directly as the CLI contract requires.

## Risks / Trade-offs

- Less deterministic coverage → report evidence and what was checked without claiming a full audit; quality comes from the chosen result, not a scanning quota.
- Existing schedules may provide old unattended wording or a literal area → both remain understandable; no schedule migration is needed.
- Removing helper-only tests reduces test count → the tested helper is also removed, and coverage of remaining tools and delivery is preserved.
- A model could select unrelated work → the outcome brief points to goals, remembered problems, current work, and any supplied focus; `/ship` and nested exploration preserve the standard scope and authorization boundaries.

## Migration Plan

Ship a minor payload release with a `## Next (minor)` entry and an Updating note saying there is no hand migration. Run required payload, OpenSpec config, context-size, retired-name, and strict change checks. The review page is generated from the proposal. No app preview is needed for this skill-only change; CI remains the delivery gate. `/ship` archives, numbers, saves, verifies applicability, and merges.
