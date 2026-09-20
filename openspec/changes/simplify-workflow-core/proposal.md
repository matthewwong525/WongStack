# Simplify the workflow core

**Status:** in-progress
**Open questions:** none

## Why

WongStack and its generated OpenSpec skills define overlapping workflows, which increases agent context and creates conflicting instructions. Review pages are the main human review surface, but their shared code and mechanical checks still require repeated agent work.

## What Changes

- Call OpenSpec's CLI directly from the WongStack verbs, with one short reference for the shared command contract and each verb owning its own decisions. Keep the public commands, CLI validation, records, and delivery behavior. (review.html#/direct-cli/after/contract)
- **BREAKING:** Stop installing or regenerating the six internal `openspec-*` skills. Retire their visibility patch and target marker; migrate known generated files without deleting local custom work or existing OpenSpec records. (review.html#/retire-layer/migration)
- Keep `review.html` required for every planned change. Generate it from one shared template, the proposal, and change-specific visual markup; use the focused reading, connected flow cards, and draft-note behavior merged in PR #88 while preserving offline viewing and copied feedback. (review.html#/review-assembly/after/builder)
- Check review structure with code: anchors, states, marks, navigation, shared template integrity, and prohibited resource loads. Keep rendered visual critique for meaning, layout, and usable states. (review.html#/review-checks/checks)
- Route planning, checkpoint refresh, and pasted review feedback through the same review-generation path. Support existing review pages without bulk regeneration of the archive. (review.html#/shared-refresh/refresh)
- Shorten the affected skills and owner documents, remove stale generated-layer instructions, and include migration guidance, regression coverage, and a versioned payload release. (review.html#/concise-owners/owners)

**Non-goals:** Replace OpenSpec, rename public verbs, change the delivery gate or checkpoint policy, make HTML review optional, redesign the review interface beyond PR #88, reorganize Cloudflare or browser modules, refactor Cloudflare scripts, trim the starter app, or rewrite historical records.

## Capabilities

### New Capabilities

- `openspec-cli-workflow`: Direct CLI use by WongStack verbs, preserved workflow contracts, and safe removal of the generated instruction layer.

### Modified Capabilities

- `openspec-skill-visibility`: Retire generated-skill invocation and the visibility patch in favor of direct CLI use.
- `context-economy`: Keep generated workflow instructions out of normal WongStack context and give shared rules one owner.
- `ux-wireframes`: Own deterministic generation, mechanical checks, and refresh of the required review page while preserving its interaction and visual critique.
- `dependency-currency`: Check the CLI contract after tool updates instead of regenerating agent skills.
- `payload-single-source`: Remove the obsolete raw OpenSpec command delegation requirement.

## Impact

The change affects the core verb skills, setup and update instructions, the review kit and sync helper, payload inventory guidance, agent rules, OpenSpec config, and their owning wiki pages. New review tooling ships inside the plan skill. Meta checks stay outside the target payload; the existing app CI also tests the assembled viewer introduced by PR #88. Existing public command names, spec paths, notes, and archived HTML remain usable. Removing internal generated skill entry points warrants version 16.0.0 from the merged 15.2.0 baseline.

## Decision log

- **2026-09-20** — Asked how far simplification should go → chose to question the whole design, including removing commands, features, or integrations.
- **2026-09-20** — Asked which outcome matters most → chose less maintenance and agent context: fewer sources to keep in sync and shorter instructions.
- **2026-09-20** — Asked how to use OpenSpec → chose to keep its CLI and records and remove the extra workflow layer, with shorter WongStack skills calling the CLI directly.
- **2026-09-20** — Asked whether every change still requires HTML review → chose to keep it required because people review that page instead of the other artifacts and find it easier. The page is the primary human review surface.
- **2026-09-20** — First change scope → assumed workflow simplification and review generation together (the latest exploration identified these as one cohesive change). Cloudflare, starter-app, command-name, and checkpoint-policy changes remain separate work.
- **2026-09-20** — Review architecture → assumed a shared template plus visual HTML fragments, with a standalone generated result (reuses the current primitives without a new data schema or viewer framework).
- **2026-09-20** — Compatibility → assumed preservation of public commands, existing plans, notes, archives, and local custom skills (reduces migration cost while removing the generated layer). Unknown or edited generated files require explicit migration decisions, not wildcard deletion.
- **2026-09-20** — Exit round → no further questions were needed; the user's answers settle the material choices. File placement and test mechanics are recorded in the design as implementation assumptions.
- **2026-09-20** — Review critique → all six anchors and eight visual/state combinations passed rendered inspection at 1440×1000 and 390×844; annotation and the copied continuation command worked. The critic clarified that forbidden author styles must be checked before runtime, because the unchanged kit adds valid inline styles. This clarification is included in the design and review. These checks validate this planning page, not the proposed implementation.
- **2026-09-20** — Implementation checkpoint → the generated skill layer is removed from the source, the direct CLI and review builder are wired into the WongStack verbs, and 16.0.0 documents the migration. The source instruction inventory is 39% shorter. Payload links, OpenSpec config, strict change validation, and the rebuilt review passed local read-only checks. The final meta and app CI task remains open until the pushed branch reports a gate result.
- **2026-09-20** — Delivery gate → the new CLI, migration, and review fixtures passed in Payload checks on PR #87 after two fixture fixes. The existing Test and Deploy workflows also passed on commit `046bcbd`. This completes the final task; the remaining save checkpoints the exact ready-to-ship state.
- **2026-09-20** — Integration with PR #88 → the user asked to combine the already-merged focused-review release with this simplification. Preserve its viewer runtime, flow-card and draft behavior, and app browser coverage. Move its sample visuals out of the shared shell, make tests build real pages through the new builder, and keep historical archives untouched. Reopen this change until the merged branch passes CI.
- **2026-09-20** — Combined implementation checkpoint → the merged 15.2.0 viewer now comes from the shared builder, its examples also drive the existing browser suite, and this active review uses its flow cards and draft notes. Structural, rendered phone/desktop, offline, and payload checks passed; CI still needs to verify the merged app tests before the change is ready again.
