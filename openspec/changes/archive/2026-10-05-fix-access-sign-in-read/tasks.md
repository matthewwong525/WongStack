# Tasks

## 1. The provider call

- [x] 1.1 In `app/worker/employee-access/provider.ts`, send `redirect: "manual"` and keep any non-2xx answer a failure; keep the header comment true. Update the two assertions in `core.test.ts` and `login-management.test.ts` to expect `"manual"`, and verify the existing 302 case in `core.test.ts` still rejects with `provider_unavailable`.
- [x] 1.2 Add a guard test that reads every non-test source under `app/worker/` and fails, naming the file and the reason, when one passes `redirect: "error"` to `fetch`. Verify it fails against the old `provider.ts` line and passes after 1.1.

## 2. The person saved before the first read

- [x] 2.1 By design.md's *pending person* decision, make sure a person saved before permissions started reaches the sign-in list after the first successful open, without being re-added. Add a test in `app/worker/employee-access/` for the chosen path: a member saved while the read fails, then a read that succeeds, ends with their email in the policy write and their line settled.

## 3. Docs and release

- [x] 3.1 Add one sentence to `wiki/stack/core-stack.md` where it describes the Workers runtime: a Worker's `fetch` rejects `redirect: "error"`, so use `"manual"` and check the status; Node tests do not catch it. Verify with `node scripts/check-payload-links.mjs`.
- [x] 3.2 Add `## Next (patch) — Access can read the sign-in list on the live app` at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note: after the update is live, open Access once; the notice goes and people added earlier can sign in. Leave `VERSION` alone. Verify the entry sits above the newest numbered one.

## 4. Integration checks

- [x] 4.1 Run the app's tests for `app/worker/employee-access/` and `node .github/scripts/checks.mjs --worktree`, and `openspec validate fix-access-sign-in-read --strict --no-interactive`; verify all pass or name what this machine could not run. CI decides at `/save`.
