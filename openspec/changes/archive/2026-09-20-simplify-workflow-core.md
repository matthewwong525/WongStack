<!-- openspec-archive v1 2026-09-20-simplify-workflow-core -->
<!-- file proposal.md utf8 7916 -->
# Simplify the workflow core

**Status:** ready-to-ship
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
- **2026-09-20** — Combined delivery gate → app tests, payload checks, and deployment passed on merge commit `21ad389` in PR #87. The integration tasks are complete; the final checkpoint records this ready-to-ship state without changing the viewer.
- **2026-09-20** — Archive checkpoint → all tasks and schema artifacts were complete and strict validation passed. The main specs already matched every delta, including removed requirements, so the archive skipped spec syncing after the default archive command could not rebuild the retired visibility spec.

<!-- end proposal.md -->
<!-- file design.md utf8 16606 -->
## Context

See `proposal.md` for the problem and selected scope. Six generated OpenSpec skill files contain 9,194 whitespace-delimited words in this checkout. WongStack's verbs load those files and then override parts of their workflow. Setup, dependency updates, rules, and the payload guide also maintain generation and visibility instructions. The installed CLI supports `init --tools none`, `status --json`, `instructions <artifact|apply|archive> --json`, `validate`, and `archive`.

The current review kit is 821 lines. Its CSS and runtime are shared code; change authors replace only its example visuals. A separate 80-line save helper copies proposal sections into the page. The kit already defines the four visual kinds, anchors, annotations, and mobile behavior. Reuse those contracts.

## Goals / Non-Goals

**Goals:** Reduce the instruction set read on a workflow path; keep one owner per procedure; generate repeated review content; preserve the standalone review experience and the CLI's schema-aware artifact handling.

**Non-goals:** See the proposal's scope boundary. In particular, this change creates neither a new workflow engine nor a new review data language. It preserves the current delivery and authorization behavior. It changes authoring and assembly, not the viewer's screens, so this design does not add a `## UX` section.

## Decisions

### 1. Short verbs use one CLI contract

Add `.agents/skills/plan/references/openspec-cli.md`, linked using the payload's `.claude/` spelling. It owns only shared mechanics: resolve the planning root, keep an explicitly selected store on supported commands, read status paths and schema dependencies, obtain artifact instructions, and validate. Each verb owns its decisions and links to the relevant section. Do not copy the generated runbooks into this reference.

| Verb | Responsibility after the change |
|---|---|
| explore | Read relevant files and CLI context; clarify intent; write nothing. |
| plan | Use `new change`, `status`, and `instructions`; complete the schema's required dependency set; generate the required review; validate; stop for standalone review. |
| apply | Resolve the selected change, plan when needed, read `instructions apply`, implement pending tasks, and preserve the existing completion handoff. |
| save | Reconcile the plan and delta specs, refresh the review, preserve the session note, and perform the existing checkpoint. |
| continue | Load the selected work and note; reconcile pasted review feedback using the CLI's existing artifact paths, refresh the page, then resume implementation. |
| ship | Require completed tasks and artifacts, validate and archive through the CLI, and preserve the existing checkpoint and merge gate. |

CLI paths and dependency edges remain authoritative. A present tasks file alone does not prove that its required artifacts exist. `skip_specs` and conditional instructions retain their current meanings. Preserve custom schemas and explicitly selected stores; do not assume that every project has only the default four artifact IDs.

There is no standalone CLI `sync` subcommand in the installed version. Save must still compare delta requirements with the corresponding main specs, apply only the declared changes, and validate the result. Keep that concise semantic procedure in save's own reference; do not pretend an unavailable command exists. Archive uses the CLI's validated archive operation. If save already synced the deltas, archive can skip that second spec mutation only after confirming equality. Retain incomplete-task and unresolved-gate protections.

**Alternative rejected:** Replace OpenSpec with a custom Markdown engine. That would create new schema, validation, migration, and archive code to maintain. Loading the generated skills with shorter overrides also leaves two workflow owners.

### 2. Stop generation at its source and migrate deliberately

Fresh setup uses `openspec init --tools none`; it prepares the planning home without generated agent skills. Dependency updates check the CLI contract instead of running `openspec update` as a routine regeneration step. Setup, sync, payload docs, and rules must agree on this lifecycle.

Remove the six known generated skill directories, `.agents/skills/.openspec-target`, and `wong-sync/scripts/hide-openspec-skills.sh` from the source as implementation tasks. For targets, match known generated content from the installed version, allowing the old visibility-key patch. Do not use a wildcard deletion based only on the name. Preserve modified or unrecognized content, report it, and record the migration decision before treating the target as fully migrated. An independently installed OpenSpec integration is the target's own component, not WongStack's to delete. Preserve symlink layouts and record local skill names.

Keep existing `openspec/config.yaml`, schemas, changes, main specs, archives, and notes. Merge only the relevant config-rule changes. Remove stale regeneration instructions so future updates do not reinstall the retired layer. No global OpenSpec profile changes are needed.

**Alternative rejected:** Keep a hidden generated layer for compatibility forever. It retains the context and update burden. Compatibility is instead a bounded migration of known files and preserved user customizations.

### 3. Assemble HTML from a shared shell and visual fragments

Keep `plan/references/review-kit.html` as the single template and runtime owner. Move examples and the short authoring vocabulary into a reference loaded only by the visual author. Each new change has `review-visuals.html`, containing only visual sections and their callouts, states, marks, and navigation attributes. The proposal remains the sole authored source for Why and What Changes. Do not add a second JSON description of those facts.

Add `plan/scripts/build-review.mjs <change-root>`. It reads the kit, proposal, and fragment; fills explicit template slots; and writes `review.html` only when the bytes differ. The output bundles all required CSS and JavaScript. It needs no network, server, or adjacent files when a reviewer opens it. A generated header identifies the source fragment and format version. The old sync entry point becomes a small compatibility adapter to this implementation, not a second text parser.

Preserve existing IDs, route syntax, change-name storage keys, copied-feedback format, and template behavior. Escape embedded Markdown so literal `</script>` text cannot terminate the proposal container. Validate inputs before replacing output and use an atomic write. Invalid or incomplete inputs must leave the previous review intact and return a diagnostic.

The stored fragment is authoring input and the full HTML is its portable output. That duplication is intentional. Do not load or edit generated runtime text during ordinary visual authoring. A template change takes effect when a current-format change is next built; old archived pages remain frozen and portable.

**Alternative rejected:** Load one external runtime from all review pages. That would make an archived page depend on another path or a server. A new JSON UI schema would require its own renderer and restrict the existing HTML primitives.

### 4. Code checks structure; visual critique checks meaning

Put shared deterministic review checks beside the builder. Use the browser's HTML parser and DOM for structural checks, with a pure check function that accepts a document and returns named diagnostics. The existing machine-level browser tool runs it during planning; CI can use the meta-repo's existing jsdom dependency for structural fixtures. Do not write another HTML parser or add target application dependencies.

Check duplicate visual IDs, unresolved bullet/state/mark targets, state/mark collisions, missing screen-state blocks, invalid navigation targets, unreferenced visuals/marks, primary-action counts per screen state, injected styles/scripts/event handlers, and nonlocal automatic resource loads. Apply the existing kind-specific state semantics: screen states have separate blocks; flow states use the kit's today/after lanes. Reject fragment changes to template-owned code. The builder performs source-boundary and template-integrity checks; the DOM check covers rendered structure. A normal text link is not an automatic network load.

Check prohibited author styles and event handlers against source or an inert DOM before the viewer runtime executes. The kit itself adds inline styles for flow opacity and toolbar sizing; those legitimate runtime effects must not fail an author-input check.

Run browser inspection for empty rendered frames and responsive overflow. A structural pass cannot prove that a visual conveys the proposal or that a loading state is useful. Keep the design author and one critic/revision round for those judgments; remove the repeated mechanical checklist from their prose instructions and point at the checker result.

New plans must have a generated page and pass applicable structural checks before being reported ready. A checkpoint may still preserve incomplete work under the existing save policy; report a stale or invalid review as such instead of calling it current. This adds no new merge gate. A missing browser is an explicit unverified rendered check, not a claimed pass; source checks and generation still run.

### 5. One refresh path, including older pages

Plan builds after the proposal anchors and visual fragment are ready. Save uses the same builder to refresh a current-format page. Continue handles review notes by updating the existing relevant artifacts and fragment, appending the decision, rebuilding the page, and then resuming work. Reviewers never need to edit the generated file.

For a pre-change page with proposal markers but no fragment, the shared implementation performs the existing proposal-only splice and preserves the page's visuals and runtime. A page without supported markers, or an older change without a page, is reported and left untouched. Do not silently convert an old page or invent visuals. New-format changes with missing inputs are errors, not legacy skips. Archive moves the page and its authoring fragment with the change; it does not rebuild historical pages.

### 6. Keep the change smaller than the code it replaces

The payload JSON remains the file inventory; prose explains rules without repeating the list. Update only the owner pages for this workflow and remove stale claims about generated skills, absent tests, and the review requirement. Keep skill descriptions at the existing 600-character limit. The shared CLI reference contains no release history or duplicate workflow decision tables.

Before and after implementation, count whitespace-delimited words across the same authored core skills and their linked workflow references, including the retired generated layer and new references. Report both the always-discovered descriptions and the full instruction inventory; do not call either a measured runtime token saving. The acceptance check is a net reduction and zero normal generated-skill handoffs. HTML/CSS/JavaScript and archived copies are reported separately, not counted as prose savings.

## Risks / Trade-offs

- CLI behavior changes → use actual status and instruction output, retain validation, and add CI contract fixtures for creation, dependency handling, resume, and archive.
- A custom target skill resembles generated content → remove only identified unmodified generated files; preserve and name everything else.
- A new fragment becomes another place to edit proposal facts → fragments hold visuals only; the builder reads the proposal directly.
- DOM checks appear stronger than they are → distinguish structural results from rendered review and semantic critique.
- Archive refresh changes old evidence → never bulk rebuild archives; refresh only the selected active handoff or its just-archived checkpoint.
- Sharing code increases install coupling → ship the plan directory as one unit and test fresh and upgraded target shapes, including legacy sync entry points.

## Migration Plan

1. Add the shared CLI contract, review builder, checks, and legacy adapter with fixture coverage in CI.
2. Change the verbs to direct CLI use and the common review refresh path. Preserve standalone plan stopping, apply completion, feedback handling, and save/ship outcomes.
3. Update setup, sync, dependency maintenance, config, rules, and owner docs. Remove the known source generated layer and its patch machinery. Include target migration tasks rather than changing target files during exploration.
4. Validate the change and payload links/config, exercise the new and legacy review paths, and record context counts through the normal CI checkpoint.
5. Release as version 16.0.0 from the merged 15.2.0 baseline, with explicit migration notes.

Rollback restores the prior released skill payload and update instructions. Keep all existing records. Newly generated `review.html` files remain standalone if their authoring tooling is rolled back; legacy workflows can still view them. No remote data or Cloudflare resource migration is involved.

## Implementation measurements

The source instruction inventory uses whitespace-delimited words, not runtime tokens. Before this change it contained 30,339 words: 14,788 in the eight core WongStack skill bodies, 9,194 in six generated OpenSpec skill bodies, and 6,357 in three linked workflow references. The same core skills and references, with the new shared CLI, review-author, and spec-sync references included, now contain 18,528 words: 13,547 in the eight core skills and 4,981 in six references. That is 11,811 fewer source words, or 39% less than the baseline. Always-discovered core descriptions fell from 661 to 412 words; the longest authored description is 580 characters. Generated HTML and the meta-only test fixture are outside this prose inventory.

The generated review passed the structural checker with no diagnostics. Browser inspection opened all six visuals and eight declared states at 390px phone and desktop widths with nonempty frames and no horizontal overflow. An annotation survived reload, Copy notes produced the `/continue simplify-workflow-core` block, and a copied page opened offline without adjacent proposal or visual input. These are rendered and interaction checks; whether the pictures explain the change remains a human review judgment. The CLI contract, migration, and review fixtures passed in Payload checks on PR #87 at commit `046bcbd`; the existing Test and Deploy workflows passed on that commit too. The final handoff edit still requires its own checkpoint gate.

## Integration with 15.2.0

PR #88 merged the focused review viewer before this change shipped. Its shared runtime owns full selected-item text, local state controls, connected workflow cards, draft persistence, and saved-only copy. The 16.0 builder keeps that runtime intact and fills it from `proposal.md` and `review-visuals.html`. The kit's rich examples move to `review-examples.html`; the app's browser fixtures use that fragment through the same builder rather than testing an example-filled shell. The selected active review is intentionally rebuilt with the new viewer for this combined change; historical archives stay byte-identical. Legacy marked pages still get proposal-only refresh.

The rebuilt page passed the structural checker and displayed all six visuals and eight states at desktop and 390px phone widths without page-level overflow. A draft survived item navigation and reload; saving it made Copy notes produce the established `/continue` block. A copy of the page opened from a directory with no adjacent inputs. The archived PR #88 review is byte-identical to `origin/main`. These checks do not replace human judgment about the pictures. App tests, payload checks, and deployment passed on merge commit `21ad389` in PR #87; the final evidence edit needs its own checkpoint gate.

## Review

The required review uses existing flow, diff, and tree primitives, with no viewer interface redesign:

- [Direct CLI workflow](review.html#/direct-cli/after/contract), with today and after states.
- [Generated-layer migration](review.html#/retire-layer/migration).
- [Review assembly](review.html#/review-assembly/after/builder), with today and after states.
- [Mechanical checks and visual critique](review.html#/review-checks/checks).
- [Shared refresh and legacy support](review.html#/shared-refresh/refresh).
- [Concise owners and release](review.html#/concise-owners/owners).

<!-- end design.md -->
<!-- file tasks.md utf8 8271 -->
## 1. Shared CLI contract and core skills

- [x] 1.1 Record the baseline instruction inventory and verify the supported CLI's initialization, status paths, schema dependency edges, conditional artifacts, apply instructions, validation, and archive contract in disposable CI fixtures; identify any missing capability explicitly. See review.html#/direct-cli/after/contract.
- [x] 1.2 Add the short shared CLI reference under the plan skill, covering planning-root/store selection, schema-aware paths and dependencies, instruction lookup, and validation without reproducing generated runbooks. See review.html#/direct-cli/after/contract.
- [x] 1.3 Replace generated-skill handoffs in explore, plan, and apply with direct CLI steps; preserve bounded questions, standalone plan stopping, exact change selection, skipped specs, and apply's completion behavior. See review.html#/direct-cli/after/contract.
- [x] 1.4 Replace generated handoffs in save, continue, and ship; retain semantic delta-spec reconciliation, review feedback handling, incomplete-task protection, archive validation, and existing checkpoint/gate results. See review.html#/direct-cli/after/contract.

## 2. Review template and assembly scripts

- [x] 2.1 Separate the kit's examples and concise visual-author instructions from its shared shell; define explicit assembly slots and the change-local review-visuals.html input while preserving current viewer behavior. See review.html#/review-assembly/after/builder.
- [x] 2.2 Implement build-review.mjs using the template, proposal, and visual fragment, with format identification, safe embedded text, atomic writes, useful failures, and no rewrite for identical output. See review.html#/review-assembly/after/builder.
- [x] 2.3 Make sync-review-proposal.mjs a compatibility adapter to the shared implementation; retain proposal-only refresh for marked legacy pages, report unsupported legacy pages, and distinguish missing current-format inputs from legacy skips. See review.html#/shared-refresh/refresh.
- [x] 2.4 Add meta-only assembly regression fixtures for deterministic output and mtime, script-closing proposal text, malformed inputs preserving prior output, current-format refresh, legacy byte preservation outside proposal markers, and output portability without adjacent inputs. See review.html#/review-assembly/after/builder.

## 3. Review checks and visual critique

- [x] 3.1 Implement source/template boundary checks and shared DOM checks for IDs, anchors, marks, kind-specific states, navigation, orphaned visuals/marks, primary actions per screen state, and prohibited scripts/styles/resource loads. Inspect author styles/handlers before runtime so the kit's own inline styles remain valid. See review.html#/review-checks/checks.
- [x] 3.2 Add positive and negative DOM fixtures, including wrapped proposal bullets, omitted state segments, valid today/after flow lanes, state/mark collisions, shared-header primary actions, and ordinary text links. Use the meta-repo's existing jsdom installation without adding target app dependencies. See review.html#/review-checks/checks.
- [x] 3.3 Update the plan author/critic instructions to consume the generated page and named check results; keep rendered empty-frame and phone-overflow inspection, semantic critique, and one revision round. Report unavailable rendered checks as unverified. See review.html#/review-checks/checks.

## 4. Refresh integration and migration

- [x] 4.1 Connect plan generation, save refresh, and continue's review-feedback path to the shared builder; preserve stable visual IDs, annotation storage identity, and the existing copied-note format. See review.html#/shared-refresh/refresh.
- [x] 4.2 Add a meta-only CI job and fixtures for the review tooling and CLI contract, including fresh initialization without generated skills, artifact dependency handling, selected-root behavior, validation, and completed-change archive. Preserve the existing app CI and keep the new fixtures/workflow outside the target payload. See review.html#/review-checks/checks.
- [x] 4.3 Change setup to initialize with --tools none and change routine dependency maintenance to inspect CLI compatibility instead of regenerating/re-hiding agent skills. Update sync's migration guidance and install-record completion rules. See review.html#/retire-layer/migration.
- [x] 4.4 Remove the source's six known generated skills, .openspec-target, and visibility-patch script; remove their operational references. Define target retirement by known installed content, allowing the visibility patch, and preserve edited/unknown/independent integrations and local names. See review.html#/retire-layer/migration.
- [x] 4.5 Exercise fresh and upgraded target fixtures, including a customized generated-looking skill, an independently installed integration, symlink paths, repeat migration, an existing active change, and an unchanged archive. Verify no routine update regenerates the layer. See review.html#/retire-layer/migration.
- [x] 4.6 Walk a generated review at desktop and phone widths through all visual kinds and declared screen states; verify marks, navigation, annotation reload, copied feedback, and offline opening after source inputs are moved aside. Check the legacy refresh path separately. Record evidence and any limits. See review.html#/shared-refresh/refresh.

## 5. Owner documents and payload configuration

- [x] 5.1 Update AGENTS.md, the OpenSpec/payload rules, OpenSpec config, setup/update guidance, payload inventory guidance, and the owning development/wiki pages to describe the direct CLI and required generated review. Fix the affected stale claims and link to owners instead of repeating procedures. See review.html#/concise-owners/owners.
- [x] 5.2 Confirm the shared CLI reference, review template, builder, checks, and legacy adapter all arrive in applicable target install shapes. Keep the JSON inventory authoritative and keep meta-only tests and CI out of it. See review.html#/concise-owners/owners.
- [x] 5.3 Measure the same instruction inventory after the change, including new references and removed generated files; show a net word-count reduction, enforce the existing authored-description limit, and confirm no normal generated-skill handoff remains. Report source counts separately from runtime token use and generated HTML. See review.html#/concise-owners/owners.

## 6. Release and delivery evidence

- [x] 6.1 Add the next major VERSION and CHANGELOG entry with the internal-skill removal, required review behavior, legacy compatibility, and target migration steps; resolve the release number against the then-current baseline. See review.html#/concise-owners/owners.
- [x] 6.2 Validate this change and run the payload link/config release checks through the normal workflow; refresh its review if implementation changed the proposal or visuals. See review.html#/concise-owners/owners.
- [x] 6.3 Confirm the new meta checks and existing CI pass via /save; record actual CLI/browser evidence and remaining manual workflow-review limits before marking the change complete. This task's checkpoint covers apply's completion when it represents the final unchanged state. See review.html#/concise-owners/owners.

## 7. Integrate the merged focused-review release

- [x] 7.1 Merge PR #88 from main, preserve its shared viewer and app browser coverage, and reconcile the plan skill, config, release notes, and wireframe spec with direct CLI and assembled reviews. See review.html#/review-assembly/after/builder.
- [x] 7.2 Move the 15.2 viewer's examples out of the fixed kit; make its browser fixtures build pages through the shared builder; update author guidance and structural checks for one visual per item, local states, connected flow cards, and stable note targets. See review.html#/review-checks/checks.
- [x] 7.3 Rebuild this active review with the focused viewer, inspect its desktop and phone states, notes, and offline behavior; keep archived reviews untouched. Update instruction counts and compatibility evidence. See review.html#/review-assembly/after/builder.
- [x] 7.4 Validate the combined change and payload checks, then checkpoint the integration through /save until app, payload, and deployment CI pass. See review.html#/concise-owners/owners.

<!-- end tasks.md -->
<!-- file specs/context-economy/spec.md utf8 2579 -->
## MODIFIED Requirements

### Requirement: WongStack-authored skill descriptions are triggers, not manuals

The frontmatter `description` of a WongStack-authored skill SHALL state what the skill does and when to invoke it, in at most 600 characters. How it operates SHALL belong in its body or its linked owner reference. A shared rule SHALL have one owner; references SHALL not reproduce the generated OpenSpec workflow layer under a new name.

The vendored `agent-browser` skill SHALL remain exempt from the description budget and SHALL remain unchanged by prose cleanup. WongStack SHALL neither install nor require generated OpenSpec skills. A target's independently owned or modified integration SHALL be preserved under the migration rules.

#### Scenario: A description is trimmed

- **WHEN** a WongStack-authored description exceeds the budget
- **THEN** it is reduced to purpose and invocation triggers
- **AND** required behavior remains in its owning skill or linked reference

#### Scenario: A generated skill is left alone

- **WHEN** descriptions are shortened during migration
- **THEN** the vendored browser skill and a target's custom integration content are left intact

#### Scenario: A generated skill is hidden from the menu

- **WHEN** migration encounters known unmodified generated content with the former visibility patch
- **THEN** it recognizes the patch as part of the old integration and retires that file under the migration rules
- **AND** it does not keep a hidden generated workflow as a normal dependency

#### Scenario: A common CLI rule is needed by two verbs

- **WHEN** two verbs need the same root-resolution or artifact-path rule
- **THEN** they link to one shared contract rather than carrying separate copies

## ADDED Requirements

### Requirement: Simplification reports a net instruction reduction

The completed change SHALL report before-and-after word counts for a fixed inventory of core workflow skill descriptions, bodies, and linked procedure references, including removed generated instructions and new references. The inventory SHALL show a net reduction. Counts of source text SHALL NOT be presented as measured runtime token savings. Generated review code and historical records SHALL be accounted for separately.

#### Scenario: The implementation is reviewed

- **WHEN** the simplification is reported complete
- **THEN** its evidence names the counted paths, the before-and-after totals, and the absence of normal generated-skill handoffs
- **AND** it does not claim that all inventoried text was loaded in every session

<!-- end specs/context-economy/spec.md -->
<!-- file specs/dependency-currency/spec.md utf8 2552 -->
## MODIFIED Requirements

### Requirement: An on-demand verb brings this repo's dependencies to latest

The repo SHALL provide the meta-only update-dependencies skill for a complete on-demand toolchain and dependency update. It SHALL not schedule itself. The pass SHALL survey the OpenSpec CLI, browser CLI, gh, git, node, and app dependencies; update the machine tools; check the direct OpenSpec CLI contract; update app dependencies including majors with their migration notes; and hand the result to the ordinary checkpoint. It SHALL not regenerate OpenSpec agent skills or apply a visibility patch.

A stage with nothing to do SHALL be reported as current. The existing major-update policy and CI delivery gate SHALL remain unchanged.

#### Scenario: A run with nothing out of date

- **WHEN** every surveyed tool and dependency is current
- **THEN** the skill reports them as current, changes no file, and does not invoke save

#### Scenario: The user asks for a scheduled run

- **WHEN** a user asks for automatic updates on an interval
- **THEN** the skill states that it is an on-demand operation

#### Scenario: The CLI is upgraded

- **WHEN** an update installs a newer OpenSpec CLI
- **THEN** the direct CLI contract is checked without generating an agent workflow layer

## REMOVED Requirements

### Requirement: Regeneration is followed by a ripple check that flags a release

**Reason:** The generated layer is retired, so generation and skill-name ripple checks no longer apply.
**Migration:** Use the direct CLI compatibility and payload-release check below.

## ADDED Requirements

### Requirement: CLI updates check compatibility and report payload releases

After a CLI update, the skill SHALL inspect whether the commands, output fields, and schema behavior used by WongStack still satisfy the direct CLI contract. Any required payload changes SHALL follow the ordinary release rules, including version, changelog, and release checks. If no payload file changes, the skill SHALL explicitly report that no payload release is needed. The check SHALL not create a new local test gate.

#### Scenario: A CLI contract changes

- **WHEN** a CLI update changes an output field required by the workflow
- **THEN** the payload integration is adapted, the change is reported as a release, and validation follows the ordinary CI path

#### Scenario: The CLI remains compatible

- **WHEN** the CLI changes but its required contract remains compatible and no payload file changes
- **THEN** the skill reports that no payload version bump is due

<!-- end specs/dependency-currency/spec.md -->
<!-- file specs/openspec-cli-workflow/spec.md utf8 5415 -->
## Purpose

Let WongStack run its existing public workflow through the OpenSpec CLI without loading a second set of generated agent workflows, while preserving records and target customizations.

## ADDED Requirements

### Requirement: WongStack verbs work without generated OpenSpec skills

The public WongStack verbs SHALL use OpenSpec CLI context, status, artifact instructions, validation, and archive operations as needed. No normal workflow SHALL require invoking an `openspec-*` skill or `/opsx:*` command. Public verb names, standalone planning behavior, completion handoffs, and delivery outcomes SHALL remain available.

#### Scenario: Plan without a generated layer

- **WHEN** a user requests a plan in an initialized repo with no generated OpenSpec skills
- **THEN** WongStack creates and validates the schema-required artifacts and required HTML review page through the CLI
- **AND** standalone planning stops for review before implementation

#### Scenario: Apply an intent without a plan

- **WHEN** a user requests implementation of clear work that has no applicable ready change
- **THEN** apply completes planning for that work and implements that exact change
- **AND** it retains the existing completion checkpoint behavior without loading a generated skill

#### Scenario: Save and ship preserve their outcomes

- **WHEN** completed work is checkpointed and shipped without generated skills
- **THEN** its plan, delta-spec sync, note when needed, review, and archive are maintained
- **AND** incomplete tasks or a failing or unverifiable delivery gate do not become permission to merge

### Requirement: CLI paths and schema dependencies remain authoritative

WongStack SHALL use the resolved planning root and artifact paths from CLI output, retain an explicitly selected store on commands that support it, and honor schema dependencies and conditional artifact rules. A tasks file alone SHALL NOT be treated as proof that the required dependency set exists. Missing CLI capability SHALL be reported rather than replaced with a claimed successful result.

#### Scenario: Tasks exist before their dependencies

- **WHEN** status reports a tasks file but a required non-skipped dependency is missing
- **THEN** planning completes the missing dependency before the change is declared ready

#### Scenario: A custom schema or selected store is used

- **WHEN** a change uses non-default artifact paths or an explicitly selected store
- **THEN** subsequent reads, writes, validation, and archive operations use that same resolved context
- **AND** no parallel change is created in the default repo path

#### Scenario: Specs are deliberately skipped

- **WHEN** the change validly declares no spec-level behavior change and skips specs
- **THEN** planning honors that declaration and still creates its required review page

### Requirement: Setup and updates do not generate the retired workflow layer

Fresh WongStack setup SHALL initialize the OpenSpec planning home without generating agent skills. Routine WongStack dependency updates SHALL check CLI compatibility without regenerating that layer or changing a global user profile. Existing records and schemas SHALL remain usable.

#### Scenario: Fresh setup

- **WHEN** a target takes WongStack for the first time
- **THEN** it receives functioning public workflow verbs and an initialized planning home
- **AND** WongStack creates no generated `openspec-*` skills or visibility patch

#### Scenario: Routine update after migration

- **WHEN** an already migrated repo updates its toolchain
- **THEN** the generated workflow layer remains absent and existing changes remain readable

### Requirement: Migration preserves local ownership

Migration SHALL remove only identified, unmodified generated files owned by the old WongStack integration, including the accepted visibility-key difference. It SHALL preserve and report edited, unrecognized, or independently installed integration files. It SHALL preserve public command names, local skill mappings, schemas, changes, main specs, archives, and notes, and SHALL not mark an unresolved migration complete.

#### Scenario: Known generated files are present

- **WHEN** an installed file matches the known generated content for the installed version, with or without the old visibility patch
- **THEN** the reviewed migration retires it and obsolete WongStack regeneration instructions
- **AND** a second migration run makes no further change

#### Scenario: A target customized a generated skill

- **WHEN** a target's generated-looking file differs from the known installed content
- **THEN** migration leaves it intact and identifies the unresolved decision
- **AND** it does not delete other skills based on a name prefix

### Requirement: Review feedback remains an input to continuation

Continue SHALL accept the existing copied review-note format, reconcile the affected existing artifacts using CLI-provided paths, record how each note was handled, and refresh the review before resuming implementation. The generated update skill SHALL NOT be required.

#### Scenario: Feedback changes the plan

- **WHEN** a reviewer pastes a valid review-note block that changes a flow
- **THEN** the proposal, relevant design or specs, tasks, and visual input are reconciled before work resumes
- **AND** the refreshed review and Decision log show the accepted change or explain a declined note

<!-- end specs/openspec-cli-workflow/spec.md -->
<!-- file specs/openspec-skill-visibility/spec.md utf8 1085 -->
## REMOVED Requirements

### Requirement: The generated OpenSpec skills are hidden from the user's command menu

**Reason:** WongStack now uses the CLI directly and no longer installs or invokes generated agent workflows.
**Migration:** Use the existing public WongStack verbs. Retire only known unmodified generated integration files under the migration contract in `openspec-cli-workflow`; preserve custom work.

### Requirement: A script applies the visibility key and is safe to re-run

**Reason:** No generated WongStack workflow layer remains to patch.
**Migration:** Remove the visibility-patch script and its invocations in the same change that removes generated-skill handoffs.

### Requirement: Every skill that regenerates the layer re-applies the patch

**Reason:** Setup initializes without agent generation and routine updates check CLI compatibility instead of regenerating instructions.
**Migration:** Replace regeneration and re-hide steps in setup, sync, and dependency maintenance with the direct CLI lifecycle. Preserve independently installed target integrations.

<!-- end specs/openspec-skill-visibility/spec.md -->
<!-- file specs/payload-single-source/spec.md utf8 425 -->
## REMOVED Requirements

### Requirement: A command that fronts a skill is a pointer to it

**Reason:** The obsolete raw OpenSpec command and generated-skill delegation surface is retired. Public WongStack verbs now use the CLI directly.
**Migration:** Remove references that promise vendored `/opsx:*` commands or generated workflow handoffs. Retain the existing general rule that each payload fact has one canonical owner.

<!-- end specs/payload-single-source/spec.md -->
<!-- file specs/ux-wireframes/spec.md utf8 9178 -->
## MODIFIED Requirements

### Requirement: The wireframe is filled from a fixed kit

The plan skill SHALL ship one review kit that owns the reviewer chrome, routing, panel and landing, four visual kinds and their primitives, callouts, notes, mark highlights, and annotation layer. The design subagent SHALL author only the change-specific visual input with its marks and SHALL NOT restyle the kit, add runtime dependencies, or raise its fidelity. Shared tooling SHALL assemble the kit, visual input, and current proposal into a standalone page. The kit and assembly tooling SHALL reach every repo that installs the plan skill. A critic SHALL still judge the rendered visuals against their proposal and design after the mechanical checks, with one revision round.

#### Scenario: Two changes look alike

- **WHEN** two changes produce review files from the kit
- **THEN** both have the same chrome, panel, primitives, pin and callout styles and differ only in their change-specific content

#### Scenario: The kit installs with the skill

- **WHEN** a target installs or updates the plan skill
- **THEN** the shared kit, assembly tooling, and relevant authoring instructions arrive together

#### Scenario: A visual author prepares a change

- **WHEN** the author adds a new flow or screen visual
- **THEN** it writes the change-specific input and does not copy or edit the viewer runtime
- **AND** shared tooling produces the required standalone page

### Requirement: The proposal text is resynced by `/save`

The generated page SHALL contain the proposal's current Why and What Changes and SHALL render paragraphs, lists, bold, inline code, and links. Plan and save SHALL use one shared refresh implementation. Current-format pages SHALL be assembled from their inputs. Legacy pages with `proposal:start` and `proposal:end` markers SHALL receive the existing proposal-only refresh; legacy pages without supported markers and older changes without a page SHALL be reported and left untouched. A new-format missing input SHALL be reported as an error, not a legacy skip. New plans SHALL always include a page.

#### Scenario: The proposal changes after the file was written

- **WHEN** What Changes is edited during implementation and save runs
- **THEN** the page displays the proposal's current Why and What Changes

#### Scenario: No file or no markers

- **WHEN** save runs for an older change without a page or supported proposal markers
- **THEN** the legacy page is not rewritten and the checkpoint reports the limitation and proceeds

#### Scenario: A current-format refresh fails

- **WHEN** the new page's required visual input is missing
- **THEN** refresh preserves the last output and reports the failure
- **AND** the checkpoint does not claim the review is current

### Requirement: The copied block is a `/continue` instruction

When continue receives an instruction beginning with `Review notes from review.html`, it SHALL reconcile those notes into the affected existing artifacts using CLI-provided paths before implementation. It SHALL record which notes changed what or why a note was declined. It SHALL refresh the review through the shared assembly path and SHALL not depend on a generated update skill.

#### Scenario: A review block is pasted

- **WHEN** a reviewer runs continue for a change with a copied review block
- **THEN** the affected proposal, design, specs, tasks, and visual input are reconciled before implementation resumes
- **AND** the Decision log records the disposition and the review displays the accepted changes

### Requirement: The revised kit applies to newly created pages

The focused layout, local controls, connected workflow cards, and draft-note behavior SHALL live in the shared kit used for newly assembled review pages. The builder SHALL combine that kit with the current proposal and change-specific visual fragment. Generated pages SHALL remain self-contained without an external runtime. Refreshing a selected current-format change MAY rebuild its embedded viewer from the shared kit; marked older pages SHALL receive proposal-only refresh, and archived pages SHALL NOT be bulk regenerated.

#### Scenario: A new review is generated

- **WHEN** a future plan builds a review from the shared kit and its visual fragment
- **THEN** the page provides full selected-item text, responsive layout, annotation-safe navigation, and drafts without an external runtime load

#### Scenario: An older page is refreshed

- **WHEN** save refreshes a marked page that has no visual fragment
- **THEN** it updates only the proposal block and preserves that page's embedded controls and styles

#### Scenario: Archived pages remain historical

- **WHEN** the shared kit changes
- **THEN** archived pages are not rebuilt merely because the kit changed

## ADDED Requirements

### Requirement: Review assembly is deterministic and preserves authored input

Assembly SHALL read the shared template, current proposal sections, and authored visual input. The proposal text SHALL have no separately maintained copy. Repeated assembly of identical inputs SHALL produce identical output without rewriting it. Invalid inputs SHALL report a useful error and preserve the previous output. Embedded content SHALL be escaped so proposal text cannot introduce executable markup.

#### Scenario: The inputs do not change

- **WHEN** the same review is assembled twice
- **THEN** the second invocation makes no byte or modification-time change

#### Scenario: The proposal contains markup delimiters

- **WHEN** a proposal includes literal script-closing text or HTML-like examples
- **THEN** the page displays the intended text without executing it or breaking the document

#### Scenario: A current-format input is missing

- **WHEN** a current-format change lacks its required visual input or has invalid template boundaries
- **THEN** assembly returns an error identifying the input and does not overwrite its existing review

### Requirement: Mechanical defects have deterministic diagnostics

Review checks SHALL identify duplicate visual IDs, unresolved anchors, missing declared screen states, state/mark collisions, invalid navigation targets, unreferenced visuals or marks, excess primary actions per screen state, unauthorized template changes, and prohibited resource loads or executable visual input. Checks SHALL respect the existing visual-kind semantics, including flow lanes for today/after states. Diagnostics SHALL identify the affected visual or source. A structural pass SHALL NOT be reported as proof of semantic or visual correctness.

#### Scenario: An anchor does not exist

- **WHEN** a proposal bullet names a missing visual, state, or mark
- **THEN** the check reports that bullet's target as invalid

#### Scenario: A shared header creates two primary actions

- **WHEN** a screen has a primary action outside its state blocks and another inside its empty state
- **THEN** the check reports two primary actions for the empty state

#### Scenario: Visual input changes shared behavior

- **WHEN** a fragment adds a script, an event handler, a style override, or a remote automatically loaded resource
- **THEN** the check rejects that input with a named diagnostic

#### Scenario: The unchanged viewer applies its own inline styles

- **WHEN** the shared runtime sets flow opacity or toolbar sizing after loading valid visual input
- **THEN** author-input checks do not reject those runtime-generated styles
- **AND** styles introduced by the visual author are still rejected before execution

#### Scenario: A valid structure still shows the wrong change

- **WHEN** the structural checks pass but a visual does not explain its proposal bullet
- **THEN** the critic can still reject the visual and require the single revision round

### Requirement: Review generation preserves portable history

The generated review SHALL remain the primary human review surface, showing the proposal and visual explanations without needing adjacent source files. It SHALL preserve the existing interaction and annotation identity when a page is refreshed. Migration SHALL NOT bulk regenerate archived pages. A structural or source-only check SHALL NOT be reported as a completed rendered review.

#### Scenario: A reviewer opens only the HTML file

- **WHEN** a reviewer opens a generated page without its proposal, template, or visual-input file beside it
- **THEN** the explanation, visuals, navigation, and annotation controls remain available

#### Scenario: A proposal-only refresh preserves annotations

- **WHEN** a current-format review is refreshed after a proposal text edit
- **THEN** stable visual identifiers and annotation storage identity remain unchanged

#### Scenario: Existing archives are migrated

- **WHEN** the WongStack integration is migrated
- **THEN** existing archived review pages remain byte-identical and readable without the new authoring tooling

#### Scenario: No browser is available for rendered inspection

- **WHEN** source checks complete but rendered browser inspection cannot run
- **THEN** the report names the rendered checks as unverified rather than claiming that every state was inspected

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-20

~~~
<!-- end .openspec.yaml -->
<!-- file review-visuals.html utf8 11275 fence=~~~ -->
~~~html
<!-- Change visuals: authoring and workflow only; the viewer stays unchanged. -->
<section class="visual flow" id="direct-cli" data-kind="flow" data-states="after today">
  <p class="caption">One workflow owner. Each WongStack verb calls the OpenSpec CLI.</p>
  <div class="frame">
    <div class="state state-after"><div class="flow-sequence">
      <div class="flow-card" data-target-id="cli-verb"><h3>WongStack verb <span class="tag">Kept</span></h3><p>Owns the workflow decision and selects one change.</p><details><summary>Details</summary><p>Public commands and their delivery behavior remain available.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="flow-card" data-target-id="cli-contract" data-mark="contract"><h3>Shared CLI contract <span class="tag">New</span> <i class="callout">1</i></h3><p>Resolves the planning root, schema paths, and artifact dependencies.</p><details><summary>Details</summary><p>One short reference replaces repeated generated runbooks.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="flow-card" data-target-id="cli-records"><h3>OpenSpec CLI <span class="tag">Kept</span> <i class="callout">2</i></h3><p>Validates and archives the existing records.</p><details><summary>Details</summary><p>Selected stores, custom schemas, and semantic spec reconciliation remain supported.</p></details></div>
    </div></div>
    <div class="state state-today"><div class="flow-sequence">
      <div class="flow-card"><h3>WongStack verb</h3><p>Starts the work.</p></div><p class="flow-connector">↓</p>
      <div class="flow-card"><h3>Generated skill</h3><p>Loads another workflow runbook.</p></div><p class="flow-connector">↓</p>
      <div class="flow-card"><h3>Wrapper overrides</h3><p>Repeats and sometimes conflicts with the runbook.</p></div><p class="flow-connector">↓</p>
      <div class="flow-card"><h3>OpenSpec CLI</h3><p>Maintains the plan.</p></div>
    </div></div>
  </div>
  <div class="notes"><ol><li>The shared reference owns command mechanics. Each verb owns its decisions; it does not load another workflow runbook.</li><li>Keep public commands, custom schemas, selected stores, artifact dependencies, and existing delivery behavior. Spec reconciliation still needs a semantic procedure: there is no CLI sync command.</li></ol></div>
</section>

<section class="visual tree" id="retire-layer" data-kind="tree">
  <p class="caption">Retire the generated instruction layer. Preserve records and local work.</p>
  <div class="frame">
    <div class="label">Source payload</div>
    <ul data-mark="migration">
      <li class="del">Six generated skill directories <i class="callout">1</i><br><span class="why">Remove the known openspec-* layer.</span></li>
      <li class="del">.openspec-target<br><span class="why">Remove the obsolete marker.</span></li>
      <li class="del">hide-openspec-skills.sh<br><span class="why">Remove the visibility patch.</span></li>
      <li class="edit">Setup and update instructions <i class="callout">2</i><br><span class="why">Initialize with --tools none; check the CLI contract after updates.</span></li>
    </ul>
    <p><b>Keep:</b> config, schemas, changes, specs, archives, and notes.</p>
  </div>
  <div class="notes"><ol><li>For installed targets, remove only content identified as known generated files, allowing the old visibility patch. Names alone do not authorize deletion. Keep modified, unknown, and independently installed skills; report them for a migration decision.</li><li>Stop regeneration at its source so later updates do not restore the retired layer. Preserve symlink layouts and merge only relevant config rules.</li></ol></div>
</section>

<section class="visual flow" id="review-assembly" data-kind="flow" data-states="after today">
  <p class="caption">Every plan still has an interactive HTML review. Shared code is assembled once.</p>
  <div class="frame">
    <div class="state state-after"><div class="flow-sequence">
      <div class="flow-card" data-target-id="review-inputs"><h3>Three owned inputs <span class="tag">New</span> <i class="callout">1</i></h3><p>Shared kit, proposal.md, and review-visuals.html.</p><details><summary>Details</summary><p>The fragment holds visuals only. Why and What Changes come from the proposal.</p></details></div><p class="flow-connector">↓</p>
      <div class="flow-card" data-target-id="review-builder" data-mark="builder"><h3>One builder <span class="tag">New</span> <i class="callout">2</i></h3><p>Checks the inputs, then writes only when the output changes.</p><details><summary>Details</summary><p>Invalid input keeps the last page. Embedded proposal text is escaped.</p></details></div><p class="flow-connector">↓</p>
      <div class="flow-card" data-target-id="review-output"><h3>Standalone review.html <span class="tag">Kept</span> <i class="callout">3</i></h3><p>Review the full item text, visual, and saved or draft notes offline.</p><details><summary>Details</summary><p>The embedded viewer uses the focused reading and draft controls from version 15.2.</p></details></div>
    </div></div>
    <div class="state state-today"><div class="flow-sequence">
      <div class="flow-card"><h3>Copy the full kit</h3><p>Start each page from the example viewer.</p></div><p class="flow-connector">↓</p>
      <div class="flow-card"><h3>Edit example visuals</h3><p>Mix shared shell and change-specific content.</p></div><p class="flow-connector">↓</p>
      <div class="flow-card"><h3>Splice proposal separately</h3><p>Maintain a second refresh path.</p></div>
    </div></div>
  </div>
  <div class="notes"><ol><li>The agent writes visuals, states, and callouts in the fragment. Why and What Changes come from the proposal; do not maintain them twice.</li><li>Validate inputs before an atomic write. Invalid input keeps the previous page. Equal output produces no file change. Escape embedded proposal text safely.</li><li>Keep offline viewing, focused reading, mobile navigation, draft and saved-note storage, and copied /continue feedback. Bundle the runtime in each output so an archived file stays portable.</li></ol></div>
</section>

<section class="visual diff-visual" id="review-checks" data-kind="diff">
  <p class="caption">Automate repeatable checks. Keep visual judgment with the critic.</p>
  <div class="frame"><div class="diff">
    <div><div class="label">Today: agent checklist</div><pre><span class="line del">Check anchor targets</span><span class="line del">Check state and mark names</span><span class="line del">Check primary action counts</span><span class="line del">Inspect shared code and loads</span><span class="line">Judge meaning and layout</span></pre></div>
    <div><div class="label">After: split by evidence</div><pre data-mark="checks"><span class="line add">Code: anchors, states, marks</span><span class="line add">Code: navigation and actions</span><span class="line add">Code: template and load rules <i class="callout">1</i></span><span class="line">Rendered: empty frames, overflow</span><span class="line">Critic: meaning and layout <i class="callout">2</i></span></pre></div>
  </div></div>
  <div class="notes"><ol><li>Use the browser DOM for structure and CI fixtures for regressions. Check forbidden author styles and handlers in source or an inert DOM before runtime: the kit itself adds inline styles. Do not add a custom HTML parser or a dependency to target applications. A normal link is not an automatic resource load.</li><li>Retain one critic and one revision round. A structural pass does not prove usable rendering or meaning. Report missing browser checks as unverified. Existing checkpoint and merge policy stays the same.</li></ol></div>
</section>

<section class="visual flow" id="shared-refresh" data-kind="flow">
  <p class="caption">Plan, save, and pasted feedback use the same refresh path.</p>
  <div class="frame"><div class="flow-sequence">
    <div class="flow-card" data-target-id="refresh-entry"><h3>Plan, save, or continue <span class="tag">Entry</span></h3><p>Write visuals, reconcile artifacts, or apply review feedback.</p><details><summary>Details</summary><p>Each public verb keeps its own workflow decisions.</p></details></div><p class="flow-connector">↓</p>
    <div class="flow-card" data-target-id="refresh-builder" data-mark="refresh"><h3>One review builder <span class="tag">Shared</span> <i class="callout">1</i></h3><p>Select the supported format and refresh the page.</p><details><summary>Details</summary><p>Current-format pages use the kit, proposal, and fragment. Legacy marked pages receive a proposal-only splice.</p></details></div><p class="flow-connector">↓ Format path</p>
    <div class="flow-branches">
      <div class="flow-branch" data-target-id="refresh-current"><h3>Current format</h3><p>Build the complete standalone page.</p></div>
      <div class="flow-branch" data-target-id="refresh-legacy"><h3>Legacy markers <i class="callout">2</i></h3><p>Refresh proposal only, preserving older visuals.</p></div>
      <div class="flow-branch" data-target-id="refresh-unknown"><h3>Unknown format</h3><p>Report the limit and leave the page untouched.</p></div>
    </div><p class="flow-connector">↓ Paths rejoin at the checkpoint report</p>
    <div class="flow-card"><h3>Report the result</h3><p>Name any stale or unsupported review clearly.</p></div>
  </div></div>
  <div class="notes"><ol><li>The old sync command becomes a compatibility adapter. A current-format change with a missing input is an error, not a legacy skip.</li><li>Keep legacy visuals and runtime intact. Do not invent visuals or bulk rebuild archived pages. Archive moves the standalone page and its fragment together.</li></ol></div>
</section>

<section class="visual diff-visual" id="concise-owners" data-kind="diff">
  <p class="caption">Shorter instructions, explicit ownership, and a versioned migration.</p>
  <div class="frame"><div class="diff">
    <div><div class="label">Today</div><pre><span class="line del">Generated runbooks + overrides</span><span class="line del">Payload paths repeated in prose</span><span class="line del">Stale generation instructions</span><span class="line del">Agent repeats structural checks</span></pre></div>
    <div><div class="label">After</div><pre data-mark="owners"><span class="line add">Verb: workflow decisions</span><span class="line add">CLI reference: shared mechanics</span><span class="line add">Payload JSON: file inventory</span><span class="line add">Builder/checker: repeatable work</span><span class="line add">Owner docs: reusable explanation <i class="callout">1</i></span><span class="line add">Major release: migration notes <i class="callout">2</i></span></pre></div>
  </div></div>
  <div class="notes"><ol><li>Measure the same instruction inventory before and after, including new references and removed skills. Require a net reduction and no normal generated-skill handoffs. These are word counts, not measured runtime token savings.</li><li>Cover fresh installs, target migration, CLI behavior, and new/legacy reviews in CI. Release the next major version, 16.0.0 from the merged 15.2.0 baseline; resolve concurrent version changes at release time. Preserve historical records.</li></ol></div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 56888 fence=~~~ -->
~~~html
<!-- wong-review:2 -->
<!doctype html>
<!--
  WongStack review kit. The shared offline viewer lives here.
  Authors write review-visuals.html using review-author.md and review-examples.html.
  build-review.mjs fills the proposal and visual slots. Generated pages contain
  the viewer, so archives open without a server or adjacent source files.
-->

<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — simplify-workflow-core</title>
<style>
  :root { --ink:#333; --line:#9a9a9a; --fill:#e9e9e9; --fill2:#f6f6f6; --note:#fff4c2; --mark:#1a73e8; --markbg:#eaf2fd; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.4 "Helvetica Neue", Arial, sans-serif; color:var(--ink); background:#d9d9d9; }
  a { color:inherit; }

  /* chrome: the reviewer's toolbar */
  .chrome { position:sticky; top:0; z-index:9; background:#222; color:#eee; padding:8px 14px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; font-size:13px; min-height:41px; }
  .chrome b { font-weight:600; }
  .chrome .group { display:flex; gap:6px; align-items:center; }
  .chrome .group:empty { display:none; }
  .chrome button { font:inherit; padding:3px 9px; background:#444; color:#eee; border:1px solid #666; border-radius:3px; cursor:pointer; }
  .chrome button[aria-pressed="true"] { background:#eee; color:#222; }
  .chrome button.annotate[aria-pressed="true"] { background:var(--mark); color:#fff; border-color:var(--mark); }
  .chrome .hint { opacity:.7; margin-left:auto; }
  .chrome .tools { display:contents; }
  .chrome .tools-toggle { display:none; }

  /* layout: What Changes panel + stage */
  .layout { display:flex; align-items:flex-start; }
  .panel { flex:0 0 340px; position:sticky; top:41px; max-height:calc(100vh - 41px); overflow:auto; background:#fff; border-right:2px solid var(--line); padding:16px 18px; font-size:13px; }
  .panel h2 { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#666; margin:18px 0 6px; }
  .panel h2:first-child { margin-top:0; }
  .panel p { margin:0 0 8px; }
  .panel ol.changes { margin:0; padding:0; list-style:none; counter-reset:c; }
  .panel ol.changes li { counter-increment:c; position:relative; margin:0 0 4px; padding:6px 8px 6px 30px; border:1px solid transparent; border-radius:3px; cursor:pointer; }
  .panel ol.changes li::before { content:counter(c); position:absolute; left:8px; top:7px; width:16px; height:16px; border-radius:50%; background:var(--fill); color:#666; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .panel ol.changes li:hover { background:var(--fill2); }
  .panel ol.changes li.on { border-color:var(--mark); background:var(--markbg); }
  .panel ol.changes li.on::before { background:var(--mark); color:#fff; }
  .panel ol.changes li .kind { display:block; font-size:11px; color:var(--mark); margin-top:2px; }
  .panel ol.changes li.dead .kind { color:#c00; }
  .panel ol.changes li.text .kind { color:#888; }
  .panel code { background:var(--fill); padding:0 3px; }
  .panel .notes-list { margin:0; padding-left:18px; }
  .panel .notes-list li { margin:0 0 6px; cursor:pointer; }
  .panel .notes-list .where { color:#666; font-size:11px; display:block; }
  .panel .notes-list button { border:0; background:none; color:var(--ink); text-align:left; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-list { margin:0; padding-left:18px; }
  .panel .draft-list li { margin:0 0 6px; }
  .panel .draft-list button { border:0; background:none; color:var(--ink); text-align:left; text-decoration:underline; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-count { display:inline-block; margin-left:6px; padding:0 6px; border:1px solid var(--line); border-radius:12px; white-space:nowrap; }
  .panel .empty { color:#666; list-style:none; margin-left:-18px; }
  .stage { flex:1; min-width:0; }
  .item-header { max-width:960px; margin:24px auto 0; padding:20px 24px; background:#fff; border:2px solid var(--line); overflow-wrap:anywhere; }
  .item-header[hidden] { display:none; }
  .item-header h1 { margin:0; font-size:20px; scroll-margin-top:calc(var(--chrome-h, 41px) + 12px); }
  .item-header .position { margin:0 0 10px; color:#666; font-size:13px; }

  /* one visual at a time */
  .visual:not([data-active]) { display:none !important; }
  .visual[data-active] { display:block !important; }
  .frame { max-width:960px; margin:12px auto 24px; background:#fff; border:2px solid var(--line); box-shadow:0 2px 0 #bbb; overflow-wrap:anywhere; }
  .visual:not(.screen) .frame { padding:24px; }
  .caption { max-width:960px; margin:12px auto 0; font-size:12px; color:#666; }
  .caption + .frame { margin-top:6px; }
  .state { display:none; }
  .state[data-on] { display:block; }

  /* lo-fi screen primitives — the screen visual's vocabulary */
  .topbar { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:2px solid var(--line); background:var(--fill2); }
  .logo { width:34px; height:34px; border:2px solid var(--line); background:var(--fill); position:relative; }
  .logo::before, .logo::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 48%, var(--line) 48%, var(--line) 52%, transparent 52%); }
  .logo::after { transform:scaleX(-1); }
  .nav { display:flex; gap:14px; }
  .nav span { padding:4px 0; border-bottom:2px solid transparent; }
  .nav span.on { border-color:var(--ink); font-weight:600; }
  .body { padding:20px; }
  h1 { font-size:20px; margin:0; }
  .row { display:flex; gap:12px; align-items:center; }
  .row.between { justify-content:space-between; }
  .btn { display:inline-block; padding:7px 14px; border:2px solid var(--ink); border-radius:3px; background:#fff; cursor:pointer; user-select:none; }
  .btn.primary { background:var(--ink); color:#fff; }
  .btn.ghost { border-color:transparent; text-decoration:underline; }
  .input { display:inline-block; min-width:220px; padding:7px 10px; border:2px solid var(--line); border-radius:3px; background:#fff; color:#888; }
  table { width:100%; border-collapse:collapse; margin-top:16px; }
  th { text-align:left; font-size:12px; color:#666; border-bottom:2px solid var(--line); padding:8px 6px; }
  td { padding:10px 6px; border-bottom:1px solid #ddd; }
  tr.click { cursor:pointer; }
  .tag { display:inline-block; padding:1px 8px; border:1px solid var(--line); border-radius:10px; font-size:12px; }
  .box { border:2px dashed var(--line); background:var(--fill2); padding:30px; text-align:center; color:#666; margin-top:16px; }
  .skeleton { height:14px; background:var(--fill); margin:14px 0; width:70%; }
  .skeleton.s { width:40%; }
  .kv { display:grid; grid-template-columns:140px 1fr; gap:8px 12px; margin:16px 0; }
  .kv dt { color:#666; } .kv dd { margin:0; }
  .muted { color:#666; }
  .hero { height:120px; background:var(--fill); border:2px solid var(--line); position:relative; margin:12px 0; }
  .hero::before, .hero::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 49.5%, var(--line) 49.5%, var(--line) 50.5%, transparent 50.5%); }
  .hero::after { transform:scaleX(-1); }
  .callout { display:inline-flex; width:18px; height:18px; border-radius:50%; background:#c00; color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; }
  .notes { max-width:960px; margin:0 auto 40px; background:var(--note); border:1px solid #d8c66a; padding:12px 18px; font-size:13px; }
  .notes ol { margin:6px 0 0; padding-left:20px; }
  .notes .brief { margin:0 0 6px; }

  /* flow: lanes of steps */
  .lane { display:flex; align-items:center; gap:10px; padding:10px 0; flex-wrap:wrap; }
  .lane + .lane { border-top:1px solid #ddd; }
  .lane .label { flex:0 0 70px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; }
  .lane.today .step { color:#777; border-style:dashed; }
  .step { padding:8px 12px; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-sequence { max-width:720px; margin:0 auto; }
  .flow-card, .flow-branch { display:block; padding:14px; min-width:0; overflow-wrap:anywhere; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-card h3, .flow-branch h3 { margin:0 0 7px; font-size:15px; }
  .flow-card p, .flow-branch p { margin:0; }
  .flow-card details, .flow-branch details { border-top:1px solid #d5d5d5; margin-top:11px; padding-top:9px; }
  .flow-card details p, .flow-branch details p { margin-top:8px; }
  .flow-connector { text-align:center; margin:10px 0; color:#666; font-weight:600; }
  .flow-branches { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
  .step.gone { text-decoration:line-through; color:#999; }
  .arrow { color:#999; }
  .arrow::before { content:"→"; }

  /* diff: before / after text */
  .diff { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .diff > div > .label, .tree .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:6px; }
  .diff pre { margin:0; padding:10px 12px; background:var(--fill2); border:1px solid #ddd; font:12px/1.5 Menlo, Consolas, monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
  .diff .line { display:block; }
  .diff .del { color:#999; text-decoration:line-through; }
  .diff .add { border-left:3px solid var(--mark); margin-left:-12px; padding-left:9px; background:var(--markbg); }

  /* tree: files touched */
  .tree ul { list-style:none; margin:0; padding:0; font:13px/1.8 Menlo, Consolas, monospace; }
  .tree li { padding-left:4px; }
  .tree li::before { display:inline-block; width:18px; color:#888; }
  .tree li.add::before { content:"+"; color:var(--mark); font-weight:700; }
  .tree li.edit::before { content:"~"; }
  .tree li.del::before { content:"−"; }
  .tree li.del { color:#999; text-decoration:line-through; }
  .tree li .why { color:#666; font:12px "Helvetica Neue", Arial, sans-serif; margin-left:10px; }

  /* text stage: a bullet with no visual, and the landing */
  .textstage h1 { font-size:22px; margin:0 0 12px; }
  .textstage p { font-size:16px; max-width:640px; }
  .textstage ol { font-size:15px; max-width:640px; padding-left:22px; }
  .textstage ol li { margin:0 0 6px; cursor:pointer; }
  .textstage ol li:hover { text-decoration:underline; }
  .textstage .muted { font-size:13px; }

  /* highlight: the mark named by the hash */
  .marked { outline:3px solid var(--mark); outline-offset:3px; box-shadow:0 0 0 6px var(--markbg); }
  tr.marked { outline-offset:0; }
  .diff .add.marked, .tree li.marked { outline-offset:0; box-shadow:none; }

  /* annotate */
  body.annotating .visual[data-active] .frame { cursor:crosshair; }
  .hovering { outline:2px dashed var(--mark); outline-offset:2px; }
  .pin { display:inline-flex; width:18px; height:18px; border-radius:3px; background:var(--mark); color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; cursor:pointer; }
  .pin.stale { background:#999; }
  .popover { position:fixed; z-index:10; width:300px; background:#fff; border:2px solid var(--mark); border-radius:4px; padding:10px; box-shadow:0 4px 14px rgba(0,0,0,.25); font-size:13px; }
  .popover .where { color:#666; font-size:11px; margin-bottom:6px; word-break:break-word; }
  .popover textarea { width:100%; height:70px; font:inherit; padding:6px; border:1px solid var(--line); border-radius:3px; resize:vertical; }
  .popover .row { margin-top:8px; }
  .popover button { font:inherit; padding:4px 10px; border:1px solid var(--line); background:#fff; border-radius:3px; cursor:pointer; }
  .popover button.save { background:var(--mark); color:#fff; border-color:var(--mark); }
  .popover .del { margin-left:auto; color:#c00; }
  .popover .status { margin:8px 0 0; color:#666; }
  .storage-status { font-size:12px; color:#666; }
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#222; color:#eee; padding:8px 14px; border-radius:3px; font-size:13px; z-index:11; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  #copybuf { position:fixed; left:-9999px; top:0; }
  .error { color:#c00; }

  /* chrome extras: step through changes, phone/desktop view, the panel toggle */
  .chrome .count { opacity:.8; min-width:44px; text-align:center; white-space:nowrap; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { min-width:0; overflow-wrap:anywhere; }

  /* phone: stage full width, the list is a sheet, the note box docks to the bottom */
  @media (max-width: 760px) {
    body { font-size:15px; }
    .chrome { display:grid; grid-template-columns:auto 1fr auto; gap:6px; padding:6px 8px; }
    .chrome > b, .chrome .hint, .chrome #viewport { display:none !important; }
    .chrome .menu, .chrome .tools-toggle { display:inline-block; }
    .chrome > .group { justify-content:center; gap:4px; }
    .chrome .tools { display:none; grid-column:1 / -1; min-width:0; }
    .chrome .tools.open { display:flex; flex-wrap:wrap; gap:8px; padding-top:6px; }
    .chrome .tools .group { flex-wrap:wrap; min-width:0; }
    .chrome .tools button { max-width:100%; overflow-wrap:anywhere; }
    .layout { display:block; }
    .panel { display:none; position:fixed; left:0; right:0; bottom:0; z-index:8; border-right:0; padding:14px 16px 40px; }
    body.menu .panel { display:block; }
    .panel ol.changes li { padding:10px 10px 10px 32px; }
    .frame { margin:12px 8px; }
    .item-header { margin:12px 8px 0; padding:14px; }
    .caption { margin:12px 8px 0; }
    .notes { margin:0 8px 24px; }
    .visual:not(.screen) .frame { padding:14px; }
    .body { padding:14px; }
    .diff { grid-template-columns:1fr; }
    .flow-branches { grid-template-columns:1fr; }
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    body.editor-open .stage { padding-bottom:240px; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { min-height:40px; min-width:40px; padding:6px 8px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · simplify-workflow-core</b>
  <button class="menu" id="menu" aria-expanded="false" aria-controls="panel">Changes</button>
  <div class="group"><button id="prev" title="Previous change" aria-label="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change" aria-label="Next change">›</button></div>
  <button class="tools-toggle" id="tools-toggle" aria-expanded="false" aria-controls="tools">Tools</button>
  <div class="tools" id="tools">
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
    <span class="storage-status" id="storage-status" hidden>Notes and drafts last for this session only.</span>
  </div>
  </div>
  <span class="hint">Click a change on the left. Grey = layout only. Blue = what changes. Red dots = reasoning below.</span>
</div>

<script type="text/markdown" id="proposal">
<!-- proposal:start -->
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
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">
<header class="item-header" id="item-header" hidden><p class="position" id="item-position"></p><h1 id="item-title" tabindex="-1"></h1></header>

<!-- short fallback for an empty proposal or an invalid direct link -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<!-- Change visuals: authoring and workflow only; the viewer stays unchanged. -->
<section class="visual flow" id="direct-cli" data-kind="flow" data-states="after today">
  <p class="caption">One workflow owner. Each WongStack verb calls the OpenSpec CLI.</p>
  <div class="frame">
    <div class="state state-after"><div class="flow-sequence">
      <div class="flow-card" data-target-id="cli-verb"><h3>WongStack verb <span class="tag">Kept</span></h3><p>Owns the workflow decision and selects one change.</p><details><summary>Details</summary><p>Public commands and their delivery behavior remain available.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="flow-card" data-target-id="cli-contract" data-mark="contract"><h3>Shared CLI contract <span class="tag">New</span> <i class="callout">1</i></h3><p>Resolves the planning root, schema paths, and artifact dependencies.</p><details><summary>Details</summary><p>One short reference replaces repeated generated runbooks.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="flow-card" data-target-id="cli-records"><h3>OpenSpec CLI <span class="tag">Kept</span> <i class="callout">2</i></h3><p>Validates and archives the existing records.</p><details><summary>Details</summary><p>Selected stores, custom schemas, and semantic spec reconciliation remain supported.</p></details></div>
    </div></div>
    <div class="state state-today"><div class="flow-sequence">
      <div class="flow-card"><h3>WongStack verb</h3><p>Starts the work.</p></div><p class="flow-connector">↓</p>
      <div class="flow-card"><h3>Generated skill</h3><p>Loads another workflow runbook.</p></div><p class="flow-connector">↓</p>
      <div class="flow-card"><h3>Wrapper overrides</h3><p>Repeats and sometimes conflicts with the runbook.</p></div><p class="flow-connector">↓</p>
      <div class="flow-card"><h3>OpenSpec CLI</h3><p>Maintains the plan.</p></div>
    </div></div>
  </div>
  <div class="notes"><ol><li>The shared reference owns command mechanics. Each verb owns its decisions; it does not load another workflow runbook.</li><li>Keep public commands, custom schemas, selected stores, artifact dependencies, and existing delivery behavior. Spec reconciliation still needs a semantic procedure: there is no CLI sync command.</li></ol></div>
</section>

<section class="visual tree" id="retire-layer" data-kind="tree">
  <p class="caption">Retire the generated instruction layer. Preserve records and local work.</p>
  <div class="frame">
    <div class="label">Source payload</div>
    <ul data-mark="migration">
      <li class="del">Six generated skill directories <i class="callout">1</i><br><span class="why">Remove the known openspec-* layer.</span></li>
      <li class="del">.openspec-target<br><span class="why">Remove the obsolete marker.</span></li>
      <li class="del">hide-openspec-skills.sh<br><span class="why">Remove the visibility patch.</span></li>
      <li class="edit">Setup and update instructions <i class="callout">2</i><br><span class="why">Initialize with --tools none; check the CLI contract after updates.</span></li>
    </ul>
    <p><b>Keep:</b> config, schemas, changes, specs, archives, and notes.</p>
  </div>
  <div class="notes"><ol><li>For installed targets, remove only content identified as known generated files, allowing the old visibility patch. Names alone do not authorize deletion. Keep modified, unknown, and independently installed skills; report them for a migration decision.</li><li>Stop regeneration at its source so later updates do not restore the retired layer. Preserve symlink layouts and merge only relevant config rules.</li></ol></div>
</section>

<section class="visual flow" id="review-assembly" data-kind="flow" data-states="after today">
  <p class="caption">Every plan still has an interactive HTML review. Shared code is assembled once.</p>
  <div class="frame">
    <div class="state state-after"><div class="flow-sequence">
      <div class="flow-card" data-target-id="review-inputs"><h3>Three owned inputs <span class="tag">New</span> <i class="callout">1</i></h3><p>Shared kit, proposal.md, and review-visuals.html.</p><details><summary>Details</summary><p>The fragment holds visuals only. Why and What Changes come from the proposal.</p></details></div><p class="flow-connector">↓</p>
      <div class="flow-card" data-target-id="review-builder" data-mark="builder"><h3>One builder <span class="tag">New</span> <i class="callout">2</i></h3><p>Checks the inputs, then writes only when the output changes.</p><details><summary>Details</summary><p>Invalid input keeps the last page. Embedded proposal text is escaped.</p></details></div><p class="flow-connector">↓</p>
      <div class="flow-card" data-target-id="review-output"><h3>Standalone review.html <span class="tag">Kept</span> <i class="callout">3</i></h3><p>Review the full item text, visual, and saved or draft notes offline.</p><details><summary>Details</summary><p>The embedded viewer uses the focused reading and draft controls from version 15.2.</p></details></div>
    </div></div>
    <div class="state state-today"><div class="flow-sequence">
      <div class="flow-card"><h3>Copy the full kit</h3><p>Start each page from the example viewer.</p></div><p class="flow-connector">↓</p>
      <div class="flow-card"><h3>Edit example visuals</h3><p>Mix shared shell and change-specific content.</p></div><p class="flow-connector">↓</p>
      <div class="flow-card"><h3>Splice proposal separately</h3><p>Maintain a second refresh path.</p></div>
    </div></div>
  </div>
  <div class="notes"><ol><li>The agent writes visuals, states, and callouts in the fragment. Why and What Changes come from the proposal; do not maintain them twice.</li><li>Validate inputs before an atomic write. Invalid input keeps the previous page. Equal output produces no file change. Escape embedded proposal text safely.</li><li>Keep offline viewing, focused reading, mobile navigation, draft and saved-note storage, and copied /continue feedback. Bundle the runtime in each output so an archived file stays portable.</li></ol></div>
</section>

<section class="visual diff-visual" id="review-checks" data-kind="diff">
  <p class="caption">Automate repeatable checks. Keep visual judgment with the critic.</p>
  <div class="frame"><div class="diff">
    <div><div class="label">Today: agent checklist</div><pre><span class="line del">Check anchor targets</span><span class="line del">Check state and mark names</span><span class="line del">Check primary action counts</span><span class="line del">Inspect shared code and loads</span><span class="line">Judge meaning and layout</span></pre></div>
    <div><div class="label">After: split by evidence</div><pre data-mark="checks"><span class="line add">Code: anchors, states, marks</span><span class="line add">Code: navigation and actions</span><span class="line add">Code: template and load rules <i class="callout">1</i></span><span class="line">Rendered: empty frames, overflow</span><span class="line">Critic: meaning and layout <i class="callout">2</i></span></pre></div>
  </div></div>
  <div class="notes"><ol><li>Use the browser DOM for structure and CI fixtures for regressions. Check forbidden author styles and handlers in source or an inert DOM before runtime: the kit itself adds inline styles. Do not add a custom HTML parser or a dependency to target applications. A normal link is not an automatic resource load.</li><li>Retain one critic and one revision round. A structural pass does not prove usable rendering or meaning. Report missing browser checks as unverified. Existing checkpoint and merge policy stays the same.</li></ol></div>
</section>

<section class="visual flow" id="shared-refresh" data-kind="flow">
  <p class="caption">Plan, save, and pasted feedback use the same refresh path.</p>
  <div class="frame"><div class="flow-sequence">
    <div class="flow-card" data-target-id="refresh-entry"><h3>Plan, save, or continue <span class="tag">Entry</span></h3><p>Write visuals, reconcile artifacts, or apply review feedback.</p><details><summary>Details</summary><p>Each public verb keeps its own workflow decisions.</p></details></div><p class="flow-connector">↓</p>
    <div class="flow-card" data-target-id="refresh-builder" data-mark="refresh"><h3>One review builder <span class="tag">Shared</span> <i class="callout">1</i></h3><p>Select the supported format and refresh the page.</p><details><summary>Details</summary><p>Current-format pages use the kit, proposal, and fragment. Legacy marked pages receive a proposal-only splice.</p></details></div><p class="flow-connector">↓ Format path</p>
    <div class="flow-branches">
      <div class="flow-branch" data-target-id="refresh-current"><h3>Current format</h3><p>Build the complete standalone page.</p></div>
      <div class="flow-branch" data-target-id="refresh-legacy"><h3>Legacy markers <i class="callout">2</i></h3><p>Refresh proposal only, preserving older visuals.</p></div>
      <div class="flow-branch" data-target-id="refresh-unknown"><h3>Unknown format</h3><p>Report the limit and leave the page untouched.</p></div>
    </div><p class="flow-connector">↓ Paths rejoin at the checkpoint report</p>
    <div class="flow-card"><h3>Report the result</h3><p>Name any stale or unsupported review clearly.</p></div>
  </div></div>
  <div class="notes"><ol><li>The old sync command becomes a compatibility adapter. A current-format change with a missing input is an error, not a legacy skip.</li><li>Keep legacy visuals and runtime intact. Do not invent visuals or bulk rebuild archived pages. Archive moves the standalone page and its fragment together.</li></ol></div>
</section>

<section class="visual diff-visual" id="concise-owners" data-kind="diff">
  <p class="caption">Shorter instructions, explicit ownership, and a versioned migration.</p>
  <div class="frame"><div class="diff">
    <div><div class="label">Today</div><pre><span class="line del">Generated runbooks + overrides</span><span class="line del">Payload paths repeated in prose</span><span class="line del">Stale generation instructions</span><span class="line del">Agent repeats structural checks</span></pre></div>
    <div><div class="label">After</div><pre data-mark="owners"><span class="line add">Verb: workflow decisions</span><span class="line add">CLI reference: shared mechanics</span><span class="line add">Payload JSON: file inventory</span><span class="line add">Builder/checker: repeatable work</span><span class="line add">Owner docs: reusable explanation <i class="callout">1</i></span><span class="line add">Major release: migration notes <i class="callout">2</i></span></pre></div>
  </div></div>
  <div class="notes"><ol><li>Measure the same instruction inventory before and after, including new references and removed skills. Require a net reduction and no normal generated-skill handoffs. These are word counts, not measured runtime token savings.</li><li>Cover fresh installs, target migration, CLI behavior, and new/legacy reviews in CI. Release the next major version, 16.0.0 from the merged 15.2.0 baseline; resolve concurrent version changes at release time. Preserve historical records.</li></ol></div>
</section>

</div><!-- /stage -->
</div><!-- /layout -->

<div class="toast" id="toast"></div>
<textarea id="copybuf" aria-hidden="true"></textarea>

<script>
  // kit: a load-time failure shows on the page instead of a blank stage
  window.addEventListener('error', function (e) {
    var p = document.getElementById('panel');
    if (p) p.innerHTML = '<p class="error"><b>Review script error:</b> ' + String(e.message).replace(/</g, '&lt;') + ' <span class="muted">(line ' + e.lineno + ')</span></p>' + p.innerHTML;
  });

  // ── routing: #/<visual>[/<state>][/<mark>] ──
  const FILE = 'review.html';
  const CHANGE = document.title.replace(/^Review — /, '');
  const visuals = [...document.querySelectorAll('.visual')];
  const $states = document.getElementById('states');
  const $panel = document.getElementById('panel');
  let current = { id: '_landing', state: 'default', mark: null, bullet: -1 };
  let bullets = [];   // [{text, anchor, id, state, mark, ok}]

  function statesOf(v) { return (v.dataset.states || 'default').split(' '); }
  // resolve the two optional segments: a state if it names one, else a mark
  function resolve(id, a, b) {
    const v = visuals.find(x => x.id === id);
    if (!v || id[0] === '_') return null;
    const allowed = statesOf(v);
    let state, mark;
    if (a && allowed.includes(a)) { state = a; mark = b || null; }
    else if (a && b) return null;               // a is not a state, but a mark follows: bad state
    else { state = allowed[0]; mark = a || null; }
    if (mark && !v.querySelector('[data-mark="' + mark + '"]')) return null;
    return { v, state, mark };
  }
  function ownerIndex(id) { return bullets.findIndex(x => x.ok && x.id === id); }
  function show(id, a, b) {
    if ($pop) closePopover(false);
    const r = resolve(id, a, b);
    const v = r ? r.v : visuals.find(x => x.id === (id === '_text' ? '_text' : '_landing'));
    const state = r ? r.state : 'default', mark = r ? r.mark : null;
    visuals.forEach(x => x.toggleAttribute('data-active', x === v));
    v.dataset.state = state;
    v.querySelectorAll('.state').forEach(function (block) { block.toggleAttribute('data-on', block.classList.contains('state-' + state)); });
    current = { id: v.id, state, mark, bullet: r ? ownerIndex(v.id) : -1 };
    document.querySelectorAll('.marked').forEach(x => x.classList.remove('marked'));
    if (mark) v.querySelectorAll('[data-mark="' + mark + '"]').forEach(x => x.classList.add('marked'));
    renderStates(v, state);
    renderHeader();
    renderPanelState();
    renderFeedback();
    const multi = statesOf(v).length > 1;
    const want = v.id[0] === '_' ? '#/' : '#/' + v.id + (multi && (state !== statesOf(v)[0] || mark) ? '/' + state : '') + (mark ? '/' + mark : '');
    if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { location.hash = want; } }
  }
  function showText(i) {      // a bullet with no visual
    document.getElementById('textframe').innerHTML = '<p class="muted">No visual for this change. Read its full text above and leave feedback if needed.</p>';
    current = { id: '_text', state: 'default', mark: null, bullet: i };
    document.querySelectorAll('.marked').forEach(function (x) { x.classList.remove('marked'); });
    visuals.forEach(x => x.toggleAttribute('data-active', x.id === '_text'));
    renderStates(null); renderHeader(); renderPanelState(); renderFeedback();
    try { history.replaceState(null, '', '#/change/' + (i + 1)); } catch (e) { location.hash = '#/change/' + (i + 1); }
  }
  function renderStates(v, state) {
    $states.innerHTML = '';
    if (!v || statesOf(v).length < 2) return;
    const lab = document.createElement('span'); lab.textContent = 'State:'; $states.appendChild(lab);
    statesOf(v).forEach(st => {
      const b = document.createElement('button');
      b.textContent = st; b.setAttribute('aria-pressed', st === state);
      b.onclick = () => { show(v.id, st, null); requestAnimationFrame(() => window.scrollTo(0, 0)); }; $states.appendChild(b);
    });
  }
  function fromHash() {
    const seg = location.hash.split('/').slice(1);
    // no change chosen: a phone opens the list over the landing, a desktop opens the first bullet
    if (!seg[0] && bullets.length) {
      if (!phoneMedia.matches) return goBullet(0);
      show('_landing', null, null);
      return setMenu(true);
    }
    if (seg[0] === 'change' && bullets[+seg[1] - 1]) return goBullet(+seg[1] - 1);
    show(seg[0] || '_landing', seg[1] || null, seg[2] || null);
  }
  window.addEventListener('hashchange', fromHash);

  // ── proposal panel + landing ──
  function inline(md) {
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
  function renderHeader() {
    const header = document.getElementById('item-header');
    const b = bullets[current.bullet];
    header.hidden = !b;
    if (!b) return;
    document.getElementById('item-position').textContent = 'Change ' + (current.bullet + 1) + ' of ' + bullets.length;
    document.getElementById('item-title').innerHTML = inline(b.text);
  }
  function parseProposal() {
    const raw = document.getElementById('proposal').textContent.replace(/<\\\/script/gi, '</script').replace(/<!--[\s\S]*?-->/g, '');
    const sections = {}; let cur = null;
    raw.split('\n').forEach(line => {
      const h = line.match(/^## (.+)/);
      if (h) { cur = h[1].trim(); sections[cur] = []; return; }
      if (cur) sections[cur].push(line);
    });
    const why = (sections['Why'] || []).join('\n').trim().split(/\n\s*\n/).map(p => '<p>' + inline(p.replace(/\n/g, ' ')) + '</p>').join('');
    bullets = []; let tail = [];
    const items = []; let open = false;   // fold a wrapped bullet back onto one line
    (sections['What Changes'] || []).forEach(line => {
      if (/^- /.test(line)) { items.push(line); open = true; return; }
      if (open && line.trim()) { items[items.length - 1] += ' ' + line.trim(); return; }
      if (!line.trim()) open = false;
      items.push(line);
    });
    items.forEach(line => {
      const li = line.match(/^- (.+)/);
      if (!li) { if (line.trim()) tail.push(line.trim()); return; }
      const m = li[1].match(/\(?(?:review\.html)?#\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?\)?\s*$/);
      if (m) {
        const r = resolve(m[1], m[2] || null, m[3] || null);
        bullets.push({ text: li[1].slice(0, m.index).trim(), anchor: '#/' + [m[1], m[2], m[3]].filter(Boolean).join('/'), id: m[1], state: r ? r.state : null, mark: r ? r.mark : null, ok: !!r, kind: r ? r.v.dataset.kind : null });
      } else bullets.push({ text: li[1].trim(), anchor: null });
    });
    const seen = new Set();
    bullets.forEach(b => { if (!b.ok) return; if (seen.has(b.id)) b.ok = false; else seen.add(b.id); });
    return { why, tail: tail.map(t => '<p>' + inline(t) + '</p>').join('') };
  }
  function renderPanel() {
    const p = parseProposal();
    let html = '<h2>Why</h2>' + p.why + '<h2>What Changes</h2><ol class="changes">';
    bullets.forEach((b, i) => {
      const cls = !b.anchor ? 'text' : b.ok ? '' : 'dead';
      const kind = !b.anchor ? 'no visual' : b.ok ? b.kind + ' · ' + b.anchor : 'dead link · ' + b.anchor + ' — no such visual, state, or mark';
      html += '<li class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" aria-current="false">' + inline(b.text) + '<span class="kind">' + kind + '</span><span class="draft-count" hidden></span></li>';
    });
    html += '</ol>' + p.tail + '<h2>Notes <span id="notecount"></span></h2><ol class="notes-list" id="notelist"></ol><h2>Drafts <span id="draftcount"></span></h2><ol class="draft-list" id="draftlist"></ol>';
    $panel.innerHTML = html;
    document.getElementById('landing').innerHTML = bullets.length
      ? '<h1>Choose a change</h1><p class="muted">Use the change list or Next to open a visual.</p>'
      : '<h1>No changes to review</h1><p class="muted">This proposal has no What Changes entries yet.</p>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.bullet === i;
      li.classList.toggle('on', on);
      li.setAttribute('aria-current', on ? 'true' : 'false');
    });
    renderCount();
  }
  function goBullet(i) {
    const b = bullets[i]; if (!b) return;
    closePopover(); setMenu(false);
    if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.getElementById('item-title').focus({ preventScroll:true }); });
  }

  // ── annotation and browser-local feedback ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, .flow-branch, .diff .line, .diff pre, .tree li, .caption, .textstage p';
  const KEY = 'rv-notes:' + CHANGE;
  const DRAFT_KEY = 'rv-drafts:v1:' + CHANGE;
  let storageAvailable = true;
  function readStored(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { storageAvailable = false; return fallback; }
  }
  let notes = readStored(KEY, []);
  if (!Array.isArray(notes)) notes = [];
  const draftStore = readStored(DRAFT_KEY, { version:1, drafts:[] });
  let drafts = draftStore && draftStore.version === 1 && Array.isArray(draftStore.drafts) ? draftStore.drafts : [];
  function persist() {
    if (storageAvailable) {
      try {
        localStorage.setItem(KEY, JSON.stringify(notes));
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ version:1, drafts:drafts }));
      } catch (e) { storageAvailable = false; }
    }
    document.getElementById('storage-status').hidden = storageAvailable;
    renderFeedback();
  }
  const $ann = document.getElementById('annotate');
  let annotating = false, $pop = null, editor = null, editorTrigger = null;
  $ann.onclick = () => setAnnotating(!annotating);
  function setAnnotating(on) {
    annotating = on; $ann.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('annotating', on);
    closePopover(false); document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
  }
  function target(el) {
    if (el.closest('.popover, .chrome, .pin, details, a[href^="#/"]')) return null;
    const scope = el.closest('.visual[data-active]');
    if (!scope) return null;
    const t = el.closest('.flow-card, .flow-branch') || el.closest(ANNOTATABLE);
    return t && scope.contains(t) ? { scope:scope, el:t } : null;
  }
  document.addEventListener('mouseover', e => {
    if (!annotating) return;
    document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
    const t = target(e.target); if (t) t.el.classList.add('hovering');
  });
  function pathOf(scope, el) {
    const steps = [];
    for (let n = el; n && n !== scope; n = n.parentElement) steps.unshift([...n.parentElement.children].indexOf(n));
    return steps.join('.');
  }
  function elAt(scope, path) {
    if (!scope || !path) return null;
    let n = scope;
    for (const i of path.split('.')) n = n && n.children[+i];
    return n || null;
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('.pin, .callout, .kind, .why').forEach(x => x.remove());
    if (el.matches('.flow-card, .flow-branch')) c.querySelectorAll('details').forEach(x => x.remove());
    const content = el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent;
    const value = content.replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('flow-branch') ? 'branch'
      : el.classList.contains('step') ? 'step' : el.classList.contains('line') ? 'line' : el.closest('.tree') ? 'file' : el.tagName.toLowerCase();
    return kind + ' "' + value + '"';
  }
  function recordFor(el) {
    const scope = el.closest('.visual[data-active]');
    return { itemId:current.id === '_text' ? '_text:' + current.bullet : current.id,
      scope:'visual', visual:current.id, state:current.state, targetId:el.dataset.targetId || null,
      path:pathOf(scope, el), label:labelOf(el) };
  }
  function sameTarget(a, b) {
    return a.itemId === b.itemId && a.visual === b.visual && a.state === b.state &&
      (a.targetId && b.targetId ? a.targetId === b.targetId : a.path === b.path && a.label === b.label);
  }
  function findTarget(n) {
    const scope = document.getElementById(n.visual);
    if (!scope) return null;
    let el = null;
    if (n.targetId) el = [...scope.querySelectorAll('[data-target-id]')].find(x => x.dataset.targetId === n.targetId && (!x.closest('.state') || x.closest('.state').classList.contains('state-' + n.state)));
    if (!el && !n.targetId) el = elAt(scope, n.path);
    return el && labelOf(el) === n.label ? el : null;
  }
  function whereOf(n) {
    if (n.visual === '_text') return '#/change/' + (Number(String(n.itemId).split(':')[1]) + 1);
    const v = visuals.find(x => x.id === n.visual);
    return '#/' + n.visual + (v && statesOf(v).length > 1 ? '/' + n.state : '');
  }
  function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function newId() { return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8); }
  function renderFeedback() {
    document.querySelectorAll('.pin').forEach(p => p.remove());
    const list = document.getElementById('notelist'), draftList = document.getElementById('draftlist');
    if (!list || !draftList) return;
    list.innerHTML = ''; draftList.innerHTML = '';
    document.getElementById('notecount').textContent = notes.length ? '(' + notes.length + ')' : '';
    document.getElementById('draftcount').textContent = drafts.length ? '(' + drafts.length + ')' : '';
    notes.forEach((n, i) => {
      const el = findTarget(n), stale = !el;
      if (el) {
        const pin = document.createElement('button'); pin.className = 'pin'; pin.dataset.note = n.id;
        pin.setAttribute('aria-label', 'Open note ' + (i + 1)); pin.textContent = String(i + 1);
        (el.tagName === 'TR' ? el.cells[0] : el).appendChild(pin);
      }
      const li = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button';
      button.innerHTML = '<span class="where">' + escapeHtml(whereOf(n)) + ' · ' + escapeHtml(n.label) + (stale ? ' · moved target' : '') + '</span>' + escapeHtml(n.text);
      button.onclick = () => openRecord(n, false);
      li.appendChild(button); list.appendChild(li);
    });
    if (!notes.length) list.innerHTML = '<li class="empty">No saved notes yet.</li>';
    drafts.forEach(d => {
      const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
      button.textContent = whereOf(d) + ' · ' + d.label + (findTarget(d) ? '' : ' · moved target');
      button.onclick = () => openRecord(d, true);
      li.appendChild(button); draftList.appendChild(li);
    });
    if (!drafts.length) draftList.innerHTML = '<li class="empty">No drafts.</li>';
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i], itemId = b && b.ok ? b.id : '_text:' + i;
      const count = drafts.filter(d => d.itemId === itemId).length;
      const badge = li.querySelector('.draft-count'); badge.hidden = !count;
      badge.textContent = count + (count === 1 ? ' draft' : ' drafts');
    });
    document.getElementById('storage-status').hidden = storageAvailable;
  }
  function closePopover(restore) {
    if ($pop) $pop.remove();
    $pop = null; editor = null; document.body.classList.remove('editor-open');
    if (restore && editorTrigger && editorTrigger.isConnected) editorTrigger.focus();
    editorTrigger = null;
  }
  function openRecord(n, isDraft) {
    closePopover(false); setMenu(false);
    if (n.visual === '_text') goBullet(Number(String(n.itemId).split(':')[1]));
    else show(n.visual, n.state, null);
    const el = findTarget(n);
    if (el) el.scrollIntoView({ block:'center' });
    const saved = isDraft && n.savedId ? notes.find(x => x.id === n.savedId) : !isDraft ? n : null;
    openPopover(isDraft ? n : saved || n, el, saved || null);
  }
  function openPopover(record, anchorEl, saved) {
    closePopover(false);
    const original = record || recordFor(anchorEl);
    const prior = saved || (record && record.id ? record : null);
    const matching = drafts.find(d => sameTarget(d, original) && (d.savedId || null) === (prior ? prior.id : null));
    editor = { meta:{ itemId:original.itemId, scope:'visual', visual:original.visual, state:original.state,
      targetId:original.targetId || null, path:original.path, label:original.label },
      savedId:prior ? prior.id : null, draftId:matching ? matching.id : (record && record.savedId !== undefined ? record.id : null) };
    editorTrigger = anchorEl;
    const initial = matching ? matching.text : (record && record.text !== undefined ? record.text : prior ? prior.text : '');
    $pop = document.createElement('div'); $pop.className = 'popover';
    const moved = !anchorEl ? '<p class="status">Original target moved. This draft stays here until you choose a new target.</p>' : '';
    $pop.innerHTML = '<div class="where">' + escapeHtml(whereOf(original)) + ' · ' + escapeHtml(original.label) + '</div>' + moved
      + '<textarea aria-label="Note text" placeholder="What should change here?"></textarea>'
      + '<div class="row"><button class="save">Save</button><button class="close">Close</button><button class="discard">Discard draft</button>'
      + (prior ? '<button class="del">Delete saved note</button>' : '') + '</div><p class="status">Drafts are excluded from Copy notes.'
      + (storageAvailable ? '' : ' Notes and drafts last for this session only.') + '</p>';
    const ta = $pop.querySelector('textarea'); ta.value = initial;
    ta.oninput = () => {
      const text = ta.value;
      let d = drafts.find(x => x.id === editor.draftId);
      if (!text.trim() && !editor.savedId) {
        if (d) drafts = drafts.filter(x => x.id !== d.id);
        editor.draftId = null;
      } else if (d) d.text = text;
      else { d = Object.assign({ id:newId(), savedId:editor.savedId, text:text }, editor.meta); drafts.push(d); editor.draftId = d.id; }
      persist();
    };
    $pop.querySelector('.save').onclick = () => {
      const text = ta.value.trim(); if (!text) return;
      const id = editor.savedId || newId();
      const savedNote = Object.assign({ id:id, text:text }, editor.meta);
      const index = notes.findIndex(x => x.id === id);
      if (index < 0) notes.push(savedNote); else notes[index] = savedNote;
      drafts = drafts.filter(x => x.id !== editor.draftId);
      closePopover(true); persist();
    };
    $pop.querySelector('.close').onclick = () => closePopover(true);
    $pop.querySelector('.discard').onclick = () => { drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    const del = $pop.querySelector('.del');
    if (del) del.onclick = () => { notes = notes.filter(x => x.id !== editor.savedId); drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); $pop.querySelector('.save').click(); } };
    document.body.appendChild($pop); document.body.classList.add('editor-open');
    if (!phoneMedia.matches) {
      const r = anchorEl ? anchorEl.getBoundingClientRect() : document.getElementById('item-header').getBoundingClientRect();
      const W = 300, H = $pop.offsetHeight || 190;
      let top = r.top, left = r.right + 10;
      if (left + W > innerWidth) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 8; if (top + H > innerHeight) top = r.top - H - 8; }
      $pop.style.top = Math.max(50, top) + 'px'; $pop.style.left = left + 'px';
    }
    ta.focus();
  }
  let touchStart = null, touchMoved = false;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) { touchStart = { x:t.clientX, y:t.clientY }; touchMoved = false; } }, { passive:true });
  document.addEventListener('touchmove', e => { const t = e.touches[0]; if (t && touchStart && Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 8) touchMoved = true; }, { passive:true });
  document.addEventListener('click', e => {
    if (e.target.closest('.popover')) return;
    const pin = e.target.closest('.pin');
    if (pin) { e.preventDefault(); const n = notes.find(x => x.id === pin.dataset.note); if (n) openRecord(n, false); return; }
    const li = e.target.closest('.panel ol.changes li');
    if (li) { goBullet(+li.dataset.i); return; }
    const panelLink = e.target.closest('.panel a[href*="#/"]');
    if (panelLink) { e.preventDefault(); const s = panelLink.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
    const local = e.target.closest('.visual[data-active] a[href^="#/"]');
    if (local) {
      e.preventDefault(); const s = local.getAttribute('href').split('#/')[1].split('/');
      if (s[0] === current.id) { show(s[0], s[1], s[2]); requestAnimationFrame(() => window.scrollTo(0, 0)); }
      else toast('Use Changes to select another change.');
      return;
    }
    if (e.target.closest('details')) return;
    if (touchMoved) { touchMoved = false; return; }
    if (annotating) {
      const t = target(e.target);
      if (t) { e.preventDefault(); openPopover(recordFor(t.el), t.el, null); }
      return;
    }
    const localState = e.target.closest('.visual[data-active] [data-local-state]');
    if (localState) { show(current.id, localState.dataset.localState, null); return; }
    const step = e.target.closest('.visual[data-active] .flow-card, .visual[data-active] .flow-branch');
    if (step) { const detail = step.querySelector('details'); if (detail) detail.open = !detail.open; }
  });
  document.addEventListener('keydown', e => {
    const editing = e.target.matches('textarea,input,[contenteditable="true"]') || !!e.target.closest('[contenteditable="true"]');
    if (e.key === 'Escape') { if ($pop) closePopover(true); return; }
    if (editing) return;
    if (e.key === 'a') { setAnnotating(!annotating); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.panel ol.changes li')) { e.preventDefault(); goBullet(+e.target.dataset.i); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.flow-card, .flow-branch')) {
      e.preventDefault();
      if (annotating) openPopover(recordFor(e.target), e.target, null);
      else { const detail = e.target.querySelector('details'); if (detail) { detail.open = !detail.open; detail.querySelector('summary').focus(); } }
    }
  });
  document.querySelectorAll('.flow-card, .flow-branch').forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from ' + FILE + ' (' + notes.length + '):'];
    notes.forEach((n, i) => lines.push((i + 1) + '. ' + whereOf(n) + ' · ' + n.label + ' — ' + n.text));
    return lines.join('\n');
  }
  document.getElementById('copy').onclick = function () {
    if (!notes.length) return toast('No saved notes yet');
    const text = notesText(), buf = document.getElementById('copybuf'); buf.value = text;
    const done = () => toast('Copied ' + notes.length + ' saved note' + (notes.length === 1 ? '' : 's'));
    const fallback = () => { buf.select(); buf.setSelectionRange(0, 99999); document.execCommand('copy'); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  };
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

  // ── phone: the chrome's height drives the panel; the list is a sheet; step through changes ──
  function chromeHeight() { document.documentElement.style.setProperty('--chrome-h', document.querySelector('.chrome').offsetHeight + 'px'); }
  window.addEventListener('resize', chromeHeight);
  function setMenu(open) {
    document.body.classList.toggle('menu', open);
    document.getElementById('menu').setAttribute('aria-expanded', open);
  }
  document.getElementById('menu').onclick = () => setMenu(!document.body.classList.contains('menu'));
  document.getElementById('tools-toggle').onclick = function () {
    const open = document.getElementById('tools').classList.toggle('open');
    this.setAttribute('aria-expanded', open);
    chromeHeight();
  };
  function currentBullet() { const li = document.querySelector('.panel ol.changes li.on'); return li ? +li.dataset.i : -1; }
  function renderCount() {
    const i = currentBullet();
    document.getElementById('count').textContent = i < 0 ? bullets.length + ' changes' : (i + 1) + ' / ' + bullets.length;
    document.getElementById('prev').disabled = i <= 0;
    document.getElementById('next').disabled = i >= bullets.length - 1;
    const v = document.querySelector('.visual[data-active]');
    document.getElementById('viewport').style.display = v && v.classList.contains('screen') ? '' : 'none';
    chromeHeight();
  }
  document.getElementById('prev').onclick = () => { const i = currentBullet(); if (i > 0) goBullet(i - 1); };
  document.getElementById('next').onclick = () => { const i = currentBullet(); if (i < bullets.length - 1) goBullet(i + 1); };
  document.addEventListener('keydown', e => { if (e.target.matches('textarea,input,[contenteditable="true"]') || e.target.closest('[contenteditable="true"]')) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });

  // ── viewport: phone or desktop layout of a screen; a phone is a phone already ──
  const phoneMedia = matchMedia('(max-width: 760px)');
  function setViewport(vp) {
    document.body.dataset.viewport = vp;
    document.querySelectorAll('#viewport button').forEach(b => b.setAttribute('aria-pressed', b.dataset.vp === vp));
  }
  document.querySelectorAll('#viewport button').forEach(b => b.onclick = () => setViewport(b.dataset.vp));
  setViewport(phoneMedia.matches ? 'phone' : 'desktop');
  phoneMedia.addEventListener('change', e => setViewport(e.matches ? 'phone' : 'desktop'));

  renderPanel();
  fromHash();
  chromeHeight();
</script>
</body>
</html>

~~~
<!-- end review.html -->
