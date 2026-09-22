## 1. Payload preflight helper

- [x] 1.1 Add the dependency-free `wong-sync` preflight helper per review.html#/classifier/union: validate explicit roots and revisions, resolve both inventory versions and target choices, map local skill names and the marked root block, compare the union, classify local state, and emit complete versioned JSON without target writes or file contents.
- [x] 1.2 Add `node:test` fixtures beside the helper coverage for current, one-file update, add, remove, directory, exclusion, component, mapped-skill, marked-block, local-adaptation, already-latest, manifest-evolution, unsafe-path, invalid-commit, read, and Git-failure cases per review.html#/coverage-surface/fixtures. Prove the worktree and index stay unchanged and both canonical and `.claude` entry paths work.
- [ ] 1.3 Add a synthetic large-payload benchmark fixture with a generous regression budget, record preflight time separately from source refresh, and assert that output contains complete metadata but no source bodies. Do not describe this as an end-to-end model-latency measurement.

## 2. Sync skill and references

- [x] 2.1 Update `.claude/skills/wong-sync/SKILL.md` per review.html#/sync-path/after/preflight: run the latest-source helper once after refresh, stop on `current`, pass the complete classified delta to `/explore` on `update`, and stop with an explicit diagnostic on `error`.
- [x] 2.2 Update the owned latest-source and payload-manifest guidance so the clean-checkout trust boundary, installed/current inventory union, component and skill mappings, logical root block, output contract, and fail-closed cases have one consistent owner. Keep the helper inside the existing whole-skill payload entry and do not add a dependency.

## 3. Release and evidence

- [x] 3.1 Bump `VERSION` to the next compatible feature release and add a newest-first `CHANGELOG.md` entry that states the no-op fast path, bounded update handoff, local-adaptation protection, and remaining source-refresh cost per review.html#/coverage-surface/fixtures.
- [ ] 3.2 Run the focused preflight fixtures, the full meta-repo Node test suite, `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `git diff --check`, review generation and browser checks, and `openspec validate accelerate-wong-sync --strict --no-interactive`.
- [ ] 3.3 Use `/save` to checkpoint the completed payload change and require the repository's CI payload checks to pass. Record the measured preflight benchmark and do not claim a total sync-time number that was not measured.
