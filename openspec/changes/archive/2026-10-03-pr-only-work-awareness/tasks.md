# Tasks

## 1. Restore prior discovery

- [x] 1.1 Restore the communication-related changes to `other-work.mjs` and `scripts/tests/other-work.test.mjs` from `3d9f248^`, preserving any later unrelated fixes; verify the pre-existing worktree/plan/PR discovery cases pass with `node --test scripts/tests/other-work.test.mjs`, and record a `Check:` reason for removing the retired peer-discovery tests.

## 2. Restore instructions and documentation

- [x] 2.1 Reverse #241's communication-specific instructions in AGENTS.md, explore, plan, apply, continue, ship, the new-workspace reference, and the change-loop page; remove the coordination wiki page and its hub/payload/area entries, fix later live links, and verify overlaps route to the original user question without peer messages.

## 3. Release and validate the rollback

- [x] 3.1 Add a minor CHANGELOG entry, register retired names, and verify the deltas restore `other-work-check` and retire `session-coordination`, with no historical archive edits or manual VERSION change.
- [x] 3.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/measure-context.mjs --check`, and `openspec validate pr-only-work-awareness --strict --no-interactive`; verify all pass and regenerate review.html if the proposal changes.
