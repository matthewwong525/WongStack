## 1. Checkpoint evidence helper

- [x] 1.1 Extend the candidate helper with structured, read-only evidence and explicit root/base/ref handling; preserve existing line output. See review.html#/checkpoint-evidence/default/structured.
- [x] 1.2 Add fixtures for staged/unstaged/untracked paths, renames, multiple changes, branch-name differences, remote inspection, selected roots, invalid inputs, and no mutations. Exercise both alias paths. See review.html#/checkpoint-evidence/default/structured.

## 2. PR-body renderer

- [x] 2.1 Add deterministic body assembly from selected artifacts, an ephemeral agent-authored summary, and explicit link metadata; preserve output on errors. See review.html#/pr-body/default/renderer.
- [x] 2.2 Add active/archive, optional-link, encoded-path, exact-checklist, unchanged-output, and invalid-input regression fixtures. See review.html#/pr-body/default/renderer.

## 3. Skill procedures and review inputs

- [x] 3.1 Extract conditional save procedures, shorten the main runbook, and preserve every obligation in a route-to-owner audit. Keep credential exclusion and final gate handling unconditional. See review.html#/save-routes/after/conditions.
- [x] 3.2 Wire structured evidence and PR rendering into their owning skills without moving intent selection, Git ownership, or delivery policy. See review.html#/checkpoint-evidence/default/structured and review.html#/pr-body/default/renderer.
- [x] 3.3 Change routine review-author inputs to the guide and relevant examples; keep specific kit inspection available and preserve builder/checker/critic behavior. See review.html#/author-inputs/default/focused.

## 4. Measurement and release

- [x] 4.1 Add a meta-only inventory and measurement tool comparing the fixed baseline with current files; include extracted references, shared owners, all seven declared routes, and separate HTML/helper totals. Add fixtures for omissions, missing files, and deterministic counts. See review.html#/measurement/default/evidence.
- [x] 4.2 Record before/after source and route totals, a net reduction, ordinary-save and author-input reductions, special-route changes, and the completed obligation audit. State runtime measurement limits. See review.html#/measurement/default/evidence.
- [x] 4.3 Confirm the new references/helpers ship in the existing payload categories, update VERSION and CHANGELOG, and validate the OpenSpec change and payload link/config contracts.
- [x] 4.4 Review the implementation for unnecessary code, then use /save to run existing and new regression coverage through CI. Resolve failures before marking this task complete. This required checkpoint also covers apply completion when it represents the final unchanged state.
