# Tasks

## 1. The dream skill

- [x] 1.1 In `.agents/skills/dream/SKILL.md`, say the record is written as several dream facts when the page list would pass a fact's 400 characters, and add a test to `scripts/tests/dream.test.mjs` that two same-day dream facts count the pages of both. Done when `node --test scripts/tests/dream.test.mjs` passes.

## 2. The shipped pages

- [x] 2.1 Add the after-publishing rule to `wiki/development/the-change-loop.md`, the `close --all` warning to `wiki/development/browsing.md`, and the one-off permission line to `wiki/stack/cloudflare-credentials.md`. Done when `node .github/scripts/wiki-links.mjs` passes with each page under 3,000 words.

## 3. Release

- [x] 3.1 Add the `## Next (patch)` entry to `CHANGELOG.md`. Done when `node scripts/check-payload-links.mjs` passes.

## 4. Verification

- [x] 4.1 Run `node .github/scripts/checks.mjs --worktree`. Done when it passes.
