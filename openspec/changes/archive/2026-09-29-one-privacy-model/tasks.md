# Tasks

## 1. Memory Worker

- [x] 1.1 In `worker/statements.mjs`, add the shadow CTE builder (with and without the reader schema), the exact full-text fragment constant, and a member read check that refuses `main`/`temp`-qualified names and any `facts_fts` mention outside the fragment; verify with unit tests in `scripts/tests/memory-worker.test.mjs`.
- [x] 1.2 In `worker/memory-worker.mjs`, prefix every member and reader read in a team with the shadow CTEs (merging into a read's own `WITH`), and add the `Wong-Memory-Role` header; verify with worker tests that every read the client sends, under a member key, returns no teammate `user`/`feedback` fact and no reader's unshared fact, and that the admin still sees all.
- [x] 1.3 Add bypass tests: a schema-qualified read, a direct `facts_fts` read, a fake alias joined to the fragment, `count(*)` over the fragment, and an old-style `JOIN facts_fts` search; verify each is refused or returns only visible facts, and the old-style refusal names updating the branch.

## 2. Memory scripts

- [x] 2.1 Switch `search` and the gate's closest matches in `scripts/memory.mjs` to the shared full-text fragment and `hits.rank`; verify existing search and gate tests in `scripts/tests/memory-store.test.mjs` pass unchanged in their results.
- [x] 2.2 Record the role header in `scripts/lib/store.mjs` and show the digest's "See everyone's" line only to the admin in `scripts/lib/digest.mjs`; verify with a digest test for a member and for the admin.
- [x] 2.3 Remove `machineFile`, `--home`, the From home digest part, and home spool handling from `scripts/memory.mjs`, `scripts/lib/store.mjs`, `scripts/lib/digest.mjs`, and the test harness; verify `--home` is an unknown flag and the home tests are gone.
- [x] 2.4 Remove `isPrivate` and the `private` run count, keeping the ledger's `private` status skip; verify a test that a `#private` message is captured and uploaded, and one that a session already recorded private is still skipped.

## 3. Skills

- [x] 3.1 Update `.agents/skills/memory/SKILL.md` (no `--home`, no `private` count, `--everyone` is admin-only) and `references/writing-facts.md` (drop *Private life goes home*); verify `node scripts/measure-context.mjs --check` passes.
- [x] 3.2 Drop the home question and machine record from `.agents/skills/wong-setup/SKILL.md` and the home line from `.agents/skills/wong-sync/references/payload-manifest.md`; verify `grep -rn machine.json .agents` finds nothing.

## 4. Wiki

- [x] 4.1 Add a `## Who sees what` table to `wiki/development/memory.md`, and remove the `#private` lines and the home paragraphs; verify each other page that stated a visibility rule now links to the table.
- [x] 4.2 Move the browser sections of `wiki/development/home.md` to a new `wiki/development/browsing.md` with the same headings, delete `home.md`, and update every link (`AGENTS.md`, `README.md`, `wiki/wiki-style.md`, `wiki/development/README.md`, `wiki/people/`, and the rest); verify `node scripts/check-payload-links.mjs` passes.
- [x] 4.3 Rewrite the private-life rule in `wiki/wiki-style.md` as "only in a repo no one else reads", with no named home; verify it matches the `knowledge-center` delta.

## 5. Release

- [x] 5.1 Add a `## Next (major) — Memory stays in its own repo` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: `#private` no longer works, preferences stop following you from home, `~/.wong-stack/machine.json` can be deleted, and home's facts stay in home; verify the entry sits at the top of the entries.
- [x] 5.2 Retire `development/home.md`, `machine.json`, and `#private` in `scripts/retired-names.json` (allowing the memory spec's `#private` scenario); verify `node scripts/check-retired-names.mjs` and `node scripts/check-openspec-config.mjs` pass.
