# Design

## Context

See proposal.md for why. The current shape, in `app/worker/employee-access/`:

- `ownerCore()` in `core.ts` verifies the caller and returns a `Core`. Every save and read (`changeMember`, `changeRole`, `changeGrants`, `reconcileLogin`, `startPermissions`, `accessStatus`, and their helpers) takes a `Core`. That is already "demand evidence of the check".
- `Core` is a plain exported object type, so `{ db, env, owner: true, … }` written anywhere satisfies it. Only `management.ts` calls `ownerCore()` in app code; the shared test fixture `app/tests/employee-access/connections.ts` builds one by hand, and eight test lines copy one with a field changed (`{ ...f.core, live: false }`).
- Owner-only is `owner: boolean` on `Core`. One place reads it to refuse: `managing()` in `members.ts`. `managerWrites()` takes any `Core`.

## Goals / Non-Goals

**Goals:**

- A `Core` can come only from `ownerCore()` in app code; writing one elsewhere is a type error.
- The statements that make or unmake a manager take a type only an owner's `Core` satisfies.
- Same behavior: every existing test in `app/worker/employee-access/` passes with its assertions unchanged.

**Non-Goals:**

- Stopping a deliberate cast or copy. This guards against a slip in new code.
- Typing the central gate in `app/worker/api/contract.ts` or mini-app handlers.
- Any runtime check, wrapper object or dependency.

## Decisions

**A type-only mark on `Core`.** `core.ts` declares a `unique symbol` it does not export and adds it to `Core` as a required readonly key. No value exists at runtime, so `ownerCore()` asserts the type once, on its return, with a comment that this is the only place. Chosen over:

- *A class with a private constructor.* It also blocks copying, but the eight test copies and `core.holder = …` would each need a helper. More code for a threat that is out of scope.
- *A real symbol property.* No assertion needed, but it adds a runtime key that `toEqual` in `core.test.ts` would then see.
- *gdp-ts's `Named`/`Proof`.* The dependency the proposal rules out; `Core` already plays the proof's part.

**`OwnerCore` and a guard function.** `core.ts` exports `type OwnerCore = Core & { owner: true }` and a type guard that narrows a `Core` by its `owner` flag. `managerWrites()` takes an `OwnerCore`. `changeMember()` works out whether the save asks to change the manager switch (`manager` named, or a manager removed); when it does, a caller who is not the owner is refused with `owner_required` 403 as today, and the narrowed core is passed on. When it does not, no manager row is written: today the row is deleted and rewritten to the same value, so the stored result is the same. The audit events stay as they are.

**A guard test instead of lint rules.** One test beside `fetch-redirect.test.ts`, in its shape: it reads every non-test source under `app/worker/` and fails, naming the file and the reason, when one asserts `as Core` or `as OwnerCore` outside `employee-access/core.ts`. It also proves itself on sample strings. The test fixture in `app/tests/` keeps one assertion: tests are outside the scan, and they need a core without a request.

**Docs.** `wiki/stack/employee-access.md` gets a short paragraph under *Managers* for whoever writes the next Access save: take a `Core`, take an `OwnerCore` for anything only the owner may do, never build one.

## Risks / Trade-offs

- [A copy with `owner: true` still type-checks] → Out of scope by the first non-goal; the guard test catches the cast, and code review the copy. gdp-ts has the same hole open as its issue #11.
- [Skipping the manager rewrite changes a stored row] → It cannot: the skipped write restored the value already there. The existing manager tests in `management.test.ts` and `key-saves.test.ts` must pass unchanged, and one new test covers a manager editing another manager's apps: the switch stays on.
- [An install with its own code that builds a `Core`] → It fails that install's type check after the update, which is the point. The changelog says so in plain words.
- [The guard's pattern misses a cast spelled another way, such as `<Core>`] → Angle-bracket casts are not used in this codebase; the test's sample strings document what it covers.
