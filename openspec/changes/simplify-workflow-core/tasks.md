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
