# Tasks

## 1. The checked caller's type

- [x] 1.1 In `app/worker/employee-access/core.ts`, add the unexported type-only mark to `Core`, assert it once on `ownerCore()`'s return with a comment, and export `OwnerCore` and its type guard, by design.md. Update the fixture in `app/tests/employee-access/connections.ts` to assert its hand-built core. Verify by reading that `ownerCore()` holds the only assertion in app code and the fixture the only one in tests.
- [x] 1.2 Add a guard test beside `app/worker/fetch-redirect.test.ts` that reads every non-test source under `app/worker/` and fails, naming the file and the reason, on `as Core` or `as OwnerCore` outside `employee-access/core.ts`. In the same file, keep one hand-built `Core` and one plain `Core` passed where an `OwnerCore` is needed, each under `// @ts-expect-error`, so the type check fails if either ever compiles. Verify by reading that the sample strings cover a flagged and an allowed case.

## 2. The manager switch

- [x] 2.1 In `app/worker/employee-access/members.ts`, make `managerWrites()` take an `OwnerCore` and have `changeMember()` refuse a non-owner who asks to change the switch, then pass the narrowed core; write no manager row when the switch is not asked about. Add a test in `management.test.ts`: a manager changes another manager's apps and that person is still a manager. Verify by reading that no existing test's assertions were edited.

## 3. Docs and release

- [x] 3.1 Add a short paragraph under *Managers* in `wiki/stack/employee-access.md`: a new Access save takes a `Core`, an owner-only one takes an `OwnerCore`, and neither is built by hand. Keep the heading text. Verify with `node scripts/check-payload-links.mjs`.
- [x] 3.2 Add `## Next (patch) — Access changes need a checked caller` at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note: nothing by hand, unless your own code builds an Access pass itself, which now fails the type check and should call the sign-in check instead. Leave `VERSION` alone. Verify the entry sits above the newest numbered one.

## 4. Integration checks

- [x] 4.1 Run `npx tsc -b` and `npm test` in `app/`, confirming the guard test and every existing test in `app/worker/employee-access/` pass, then `node .github/scripts/checks.mjs --worktree`, and `openspec validate checked-access-caller --strict --no-interactive`; verify all pass or name what this machine could not run. CI decides at `/save`.
