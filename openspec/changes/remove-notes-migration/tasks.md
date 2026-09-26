## 1. Tests

- [x] 1.1 In `scripts/tests/memory-store.test.mjs`, add a test that seeds the fake store with a `migration:<slug>` session, a fact with source `migration`, and a `migration/<slug>.md` object, then checks that `memory.mjs source <fact-id>` prints the note text (review.html#/notes-migration).
- [x] 1.2 In the same file, add a test that `memory.mjs import --file <file>` exits non-zero with the usage and leaves the store unchanged.

## 2. Release

- [x] 2.1 Bump `VERSION` to 19.0.1 and add a newest-first `CHANGELOG.md` entry.
- [x] 2.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`. Fix any dead link.
- [ ] 2.3 Run `/save` so CI runs the memory suite. The task is done when CI passes.
