# Tasks

## 1. Build

- [x] 1.1 In `failed` (`.agents/plugins/daily/daily/scripts/worker.mjs`), a `retired` reason writes one journal line a day per kind and counts nothing.
- [x] 1.2 Test in `scripts/tests/daily-worker.test.mjs`: retired answers open no chat and write one line a day; a real failure still opens one.
- [x] 1.3 `## Next (patch)` entry in `CHANGELOG.md`.

## 2. Checks

- [x] 2.1 `node --test scripts/tests/daily-worker.test.mjs` passes.
