# Access changes need a checked caller

**Status:** ready-to-ship
**Branch:** integrate-gdp-ts
**Open questions:** none

## Why

Access checks who is asking before it changes people, roles or levels, and only the owner may pick managers. Both rules hold today, but only because each piece of code remembers them. A new save written later, by a person or an assistant, could skip the check and nothing would notice until someone got access they should not have. [gdp-ts](https://github.com/rauchg/gdp-ts) showed a way to make that mistake fail before the code can run. This change borrows the idea for Access, without the library.

## What Changes

- **A save in Access can't run without the sign-in check.** Every Access change already takes a pass that says who is asking. Today any code can write that pass by hand. After this, only the sign-in check can hand one out, and code that makes its own fails the checks before it can be published.
  ```text
    BEFORE                   AFTER
  sign-in check            sign-in check
      │ pass                   │ pass
      ▼                        ▼
  save people              save people

  hand-made pass           hand-made pass
      │                        │
      ▼                        ▼
  save people              +stopped by
  (nothing stops it)        the checks
  ```
- **Picking a manager needs the owner's pass.** The code that makes or unmakes a manager now takes a pass only the owner gets. A new owner-only save that forgets to ask *is this the owner?* no longer builds.
- **Nothing on the Access screen changes.** The owner and managers can do exactly what they could before, and every refusal reads the same.
- **A check stops the old way coming back.** The tests fail, naming the file, when app code marks its own pass as checked.
- **No new library.** gdp-ts is two days old with open bug reports, so the app takes the idea and adds no dependency.

**Non-goals:** Adding gdp-ts or its rules. Changing who may do what in Access. Per-record permissions for mini apps. Changing the one gate every other request passes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None: `employee-onboarding` already promises that only the employer makes or unmakes a manager, and that a manager's attempt is denied. The promise is unchanged; the code now keeps it by type as well as by test (`skip_specs: true`).

## Impact

`app/worker/employee-access/core.ts` (the pass's type and the owner's), `members.ts` (manager writes), one new guard test over `app/worker/`, one file of lines that must not compile (`app/tests/employee-access/unchecked-caller.ts`, added to `app/tsconfig.worker.json`), the shared test fixture `app/tests/employee-access/connections.ts`, a short paragraph in `wiki/stack/employee-access.md`, and a patch changelog entry. No schema, key, route, screen or dependency change.

## Decision log

- **2026-10-06** — Asked what should happen with gdp-ts → chose *Plan the small fix*: tighten the Access code with our own TypeScript and add no library.
- **2026-10-06** — Assumed: gdp-ts itself stays out, because it was first published on 2026-10-05 as 0.1.0 with one commit and nine open issues, several about ways past its own guard, and the app has no per-record permissions for it to protect.
- **2026-10-06** — Assumed: the pass is marked in types only, with no runtime cost, because the aim is to stop a slip in new code, not a person who sets out to cheat; existing tests that copy a pass and change one field keep working.
- **2026-10-06** — Assumed: a guard test stands in for gdp-ts's lint rules, because the app already keeps one guard test of this shape (`fetch-redirect.test.ts`) and a new lint plugin would be a dependency.
- **2026-10-06** — Assumed: only the manager switch needs the owner's pass, because the spec names making, unmaking and removing a manager as the only owner-only saves; *the owner can't be changed* applies to every caller.
- **2026-10-06** — Assumed: no spec change (`skip_specs: true`), because no promised behavior changes.
- **2026-10-06** — Assumed: a patch release, because the app's files ship and behavior stays the same.
- **2026-10-06** — Asked what to do with the finished plan → chose *Build it now*.
- **2026-10-06** — Assumed: the type check and test runs wait for the last task group, because checks run once after all source and tests are written; each earlier task is verified by reading.
- **2026-10-06** — Assumed: two lines marked as expected type errors stay in the guard test, replacing a throwaway scratch check, because they fail the type check if a hand-made pass ever compiles again.
- **2026-10-06** — Assumed: the two lines that must not compile live in `app/tests/employee-access/unchecked-caller.ts`, not in the guard test, because the type check skips every test file under `app/worker/`, so there they would prove nothing. The guard test fails if that file leaves the type check's list.
- **2026-10-06** — Check: `app/tests/employee-access/unchecked-caller.ts` marks two lines as expected type errors, because each makes an Access pass without the sign-in check and must never compile; the type check fails if either does.
- **2026-10-06** — Check: `app/tsconfig.worker.json` adds that one file to what the type check reads, because test files are skipped there; nothing is read less strictly.
- **2026-10-06** — Assumed: four sentences under *Managers* in `wiki/stack/employee-access.md` were shortened with their meaning kept, because the page sat 8 words under its 3,000-word cap and the new paragraph adds 24.
- **2026-10-06** — Asked whether to publish, after asking how the change helps this repo → chose *Publish it*.
- **2026-10-06** — Assumed: archive checkpoint for release 35.2.1; bringing `main` in kept both changelog entries and both sides' wording under *Managers* in `wiki/stack/employee-access.md`, which now sits at its 3,000-word cap.
