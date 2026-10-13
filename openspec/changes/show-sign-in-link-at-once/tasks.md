# Tasks

## 1. Setup tool

- [ ] 1.1 In `scripts/employee-bootstrap.mjs`, export `signInNotice(link)` per design.md and use it in `main()`'s `onLoginUrl`; use the same export in `scripts/company-api.mjs`. Add a test in `scripts/tests/employee-bootstrap.test.mjs` that the notice tells the reader to show the link now, says it is safe to show, and ends with the link alone on its last line; verify `node --test scripts/tests/employee-bootstrap.test.mjs scripts/tests/company-api.test.mjs` passes apart from the pin test.

## 2. Setup messages

- [ ] 2.1 In `app/worker/employee-access/prompt.ts`, reword both texts to ask for the sign-in link the moment it prints and to wait, keeping every other instruction; drop *only … when a browser is unavailable*. Update `prompt.test.ts` to expect the new wording in both texts and keep its length, line-count and banned-word checks; verify the test passes.

## 3. Docs and release

- [ ] 3.1 In `wiki/stack/employee-project.md`, reword the *Signs in* step: the assistant shows the checked sign-in link at once and waits. Verify the wiki checks pass.
- [ ] 3.2 Add a `## Next (patch) — Setup shows the sign-in link at once` entry at the top of `CHANGELOG.md`'s entries with an **Updating.** note; verify `node scripts/check-payload-links.mjs` passes.

## 4. Pin and verification

- [ ] 4.1 Commit the final `scripts/employee-bootstrap.mjs`, then write that commit's SHA and the file's SHA-256 into `app/worker/employee-access/bootstrap-release.json`; verify the pin test in `scripts/tests/employee-bootstrap.test.mjs` passes.
- [ ] 4.2 Run `node .github/scripts/checks.mjs --worktree` once and repair what this change broke; verify it ends green.
