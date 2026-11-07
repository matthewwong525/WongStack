# Tasks

## 1. Worker: read and write a rule with no session time

- [x] 1.1 In `app/worker/employee-access/login-management.ts`, make `policySchema` `session_duration` `z.string().optional()`, and confirm the PUT body leaves the key out when it is absent (no `undefined`, `null`, or empty string); verify with `npm test -- login-management`.
- [x] 1.2 In `login-management.test.ts`, add a policy with no `session_duration` for both the first-open import (`admittedEmails` returns the admitted emails) and a write (`reconcileLogin` "policy" reaches ready, and the PUT body has no `session_duration` key); verify both pass and fail on the old schema.

## 2. Worker: a failed start says why

- [x] 2.1 In `start.ts`, have `startPermissions` return the reason code (`AccessError` code, else `login_policy_unreadable`) and log `{ event: "permissions_start_failed", error }` on a failed read; `null` otherwise. Verify with a `start.test.ts` case that a failed read logs one line, returns the code, and leaves permissions off.
- [x] 2.2 In `management.ts`, carry `startError` on the GET status reply; leave `tools-route.ts` ignoring it. Verify with a status test that a failed start answers `started: false` with `startError`.

## 3. Screen: the reason on People

- [x] 3.1 Add `startError?: string | null` to the `Status` type in `app/src/lib/access`, and in `Notices.tsx` add a `Why:` line, mapped by design.md, with the code in small text, inside the existing *could not be read yet* notice. Verify with a Notices test for one mapped code and the fallback.

## 4. Docs and release

- [x] 4.1 In `wiki/stack/company-knowledge.md`, beside the `code_unavailable` line, add: until Access starts at the owner's first open, company knowledge and project code answer `code_unavailable`. Update `wiki/stack/access-screens.md` only if it describes the *could not be read yet* notice. Verify with `node scripts/check-payload-links.mjs`.
- [x] 4.2 Add a `## Next (patch) — Access starts when the sign-in rule has no session time` entry at the top of `CHANGELOG.md`'s entries, with an **Updating.** note (nothing to do). Verify the heading shape matches the rule in `.agents/rules/payload.md`.

## 5. Review fixes

- [x] 5.1 In `start.ts`, map a `ZodError` to `login_policy_unreadable` and any other non-`AccessError` throw (timeout, failed connection) to `provider_unavailable`, by design.md. Verify with a `start.test.ts` case where the provider throws a plain error and the reason is `provider_unavailable`.
- [x] 5.2 In `wiki/stack/employee-access.md` first-open step 3, add that a list that can not be read logs `permissions_start_failed` with the reason, and People shows a *Why:* line; keep the page under 3,000 words. Verify with `node scripts/check-payload-links.mjs`.

## 6. Checks

- [x] 6.1 Run `node .github/scripts/checks.mjs --worktree` and confirm it passes.
