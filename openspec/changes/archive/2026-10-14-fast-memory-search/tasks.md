# Tasks

## 1. The search fragment

- [x] 1.1 In `.agents/skills/memory/worker/statements.mjs`, change `FTS_HITS` to `(SELECT +rowid AS rowid, rank ... AND +rowid IN (SELECT id FROM facts))`, add `LEGACY_FTS_HITS` with the old text, and make `readRefusal` strip both before its `facts_fts` test, by design decisions 1–2; keep each comment to two short lines.
- [x] 1.2 In `scripts/tests/memory-worker.test.mjs`, run the *filtered FTS* privacy test with both `FTS_HITS` and `LEGACY_FTS_HITS`, each returning only the visible fact.
- [x] 1.3 Add a plan test by design decision 3: `EXPLAIN QUERY PLAN` of the `gateFacts` neighbour query and a search query shows `facts_fts` matched alone (`:M`) and no `:=M` on it; and both fragments find the same facts.
- [x] 1.4 Add a `## Next (patch) — Memory search stays fast on a big store` entry at the top of `CHANGELOG.md`'s entries in plain words, with no hand step; leave `VERSION` alone.

## 2. The other fixes from pull request #380

- [x] 2.1 Bring #380 up to date with 43.0.0: `strip` skips a `member_write` refusal as `refused:` (memory.mjs, store.mjs, SKILL.md), `machine-id.mjs` reads on after a refused `chmod`, with their tests on main's sign-in model; drop the computer-key test.

## 3. Verification

- [x] 3.1 Run `node --test scripts/tests/memory-worker.test.mjs scripts/tests/memory-store.test.mjs scripts/tests/memory-capture.test.mjs` and the memory search question set; verify all pass and members never see others' `user` or `feedback` facts.
- [x] 3.2 Run `node .github/scripts/checks.mjs --worktree`; verify it passes.
- [x] 3.3 Run `openspec validate "fast-memory-search" --strict --no-interactive`; verify it passes.
