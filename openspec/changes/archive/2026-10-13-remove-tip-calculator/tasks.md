# Tasks

## 1. The app

- [x] 1.1 Delete `app/src/apps/tips/` (page, helper, manifest, both tests); verify `ls app/src/apps` shows `access` and `hello` only and `app/src/apps/index.test.ts` still passes.

## 2. Practice data

- [x] 2.1 In `schema/seed.sql`, remove the `tips` row from `wong_access_apps` and both `tips` rows from `wong_access_grants`, and reword the comments that say Dana holds every app and Eli looked at two; verify no `tips` remains in the file.
- [x] 2.2 In `app/worker/employee-access/seed.test.ts`, name Dana's apps as `['hello']` and drop the comment and filter for apps only the source repo builds, keeping the test's other claims; verify the test passes.

## 3. Kept checks

- [x] 3.1 In `.agents/verification/journeys/employee-onboarding/`, edit only `steps` and `expect`: `the-employer-leaves-with-unsaved-changes` and `the-employer-leaves-without-saving` click the *Hello* tick; `the-employer-gives-an-app` expects `Hello`; `a-person-who-could-only-look` expects `eli@example.invalid: Hello`; `the-verification-machine-checks-a-preview` clicks the *Hello* tick, opens `{url}/apps/hello/`, and expects `Hello` at `/apps/hello/`. Verify each file parses as JSON, none names the tip calculator, and `scripts/tests/verify-journeys.test.mjs` passes.

## 4. Docs and release

- [x] 4.1 In `wiki/stack/mini-apps.md`, reword the last paragraph's sentence so it names no `tips` app; verify the wiki checks pass.
- [x] 4.2 Add a `## Next (patch) — The tip calculator is gone` entry at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note that nothing needs doing; verify `node scripts/check-payload-links.mjs` passes.

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` once and repair what this change broke; verify it ends green.
