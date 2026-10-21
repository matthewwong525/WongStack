# Tasks

## 1. The server refuses a removed person before permissions start

- [x] 1.1 `app/worker/employee-access/policy.ts`: in `currentPolicy`, after `manages` is worked out and before `if (!row.policy_enabled)`, return `{ state: "denied" }` when `role !== "owner" && email && row.status === "removed"`, with a one-line comment that only a removal writes this status. Verify by reading that the owner, the staging checker, a person with no row and an `active` row still reach the `not_started` return.
- [x] 1.2 `app/worker/employee-access/policy.test.ts`: replace the pre-start "a removed row means nothing yet" assertion (the `readback()` expecting `not_started` with every app after `status = 'removed'`, `policy_enabled = 0`) with a 403, keeping the owner's `not_started` line. Add a regression test: with `policy_enabled = 0` and the employee's row `removed`, `currentPolicy` is `denied`, `appPageDenied` gives 403 for `/apps/hello/`, `authorizeRequest` on `{ apps: ["hello"] }` gives 403, and `memoryRole(await currentPolicy(...))` is `null`; an email with no row still gets `not_started` with every app and `member`; setting the row back to `active` gives `not_started` with every app again. Verify with `npm test -- policy` in `app/`.

## 2. The remove box says what waits for setup

- [x] 2.1 `app/src/apps/access/People.tsx`: when `status.environment === 'live'` and `!status.started`, the confirm reads *They are blocked at once and can no longer download the project. Once Access setup finishes, they leave the sign-in list, and everyone is signed out and signs in again.* followed by the unchanged rest; the started and practice wordings stay. Add assertions in `app/src/apps/access/App.test.tsx` for both live wordings (`roster.started` false and true). Verify with `npm test -- App` in `app/`.

## 3. Docs and release

- [x] 3.1 `wiki/stack/employee-access.md`, *The first open* step 1: *Until then, every signed-in person keeps every app, as before Access, except a person you remove.* Keep the page under 3,000 words. Verify with `node scripts/check-payload-links.mjs` and the wiki word check in `node .github/scripts/checks.mjs --worktree`.
- [x] 3.2 Add `## Next (patch) — A removed person is blocked before Access setup finishes` at the top of `CHANGELOG.md`'s entries: a removed person is refused at once even while Access setup is unfinished; the remove box says the sign-out waits for setup; **Updating.** Nothing to do by hand. Verify it sits above `## 43.18.1`.

## 4. Verification

- [x] 4.1 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate block-removed-before-start --strict --no-interactive`, then `/save` for CI.
