# Proposal

**Status:** planned
**Branch:** nifty-panda
**Open questions:** none

## Why

When you remove someone in Access, the screen says *They are blocked at once*. On the live app that holds only once Access setup has finished. Until then the app still lets the removed person open every app and read and write shared memory, the same as before you removed them. A security check found it; this is one part of fixing what that check found.

## What Changes

- **A removed person is blocked at once, even before Access setup finishes.** Their next app page, app request or memory request is refused, exactly as after setup. Everyone else keeps every app until setup finishes, as now: only a person you removed loses access early. Adding them back gives every app back.
  ```mermaid
  flowchart TD
    req[next request] --> rem{"removed?"}
    rem -->|yes| no[refused]
    rem -->|no| started{"set up?"}
    started -->|no| all[every app]
    started -->|yes| own[own apps]
  ```

- **The remove box says when the sign-out happens.** Before setup finishes, the app can't take them off the sign-in list yet. So the box says that part, and signing everyone out, waits for setup. Once setup has finished, the box reads as today.
  ```screen
  <div class="row gap">
    <div class="card col gap phone">
      <span class="tag-outline">Today</span>
      <h3>Remove pat@shop.com?</h3>
      <p class="muted">They are blocked at once and can no longer download the project. Everyone is signed out and signs in again. This can't be undone.</p>
      <div class="row gap"><span class="grow"></span><button class="btn-ghost">Cancel</button><button class="btn-primary">Remove access</button></div>
    </div>
    <div class="card col gap phone">
      <span class="tag-outline">Before setup finishes</span>
      <h3>Remove pat@shop.com?</h3>
      <p class="muted">They are blocked at once and can no longer download the project. Once Access setup finishes, they leave the sign-in list, and everyone is signed out and signs in again. This can't be undone.</p>
      <div class="row gap"><span class="grow"></span><button class="btn-ghost">Cancel</button><button class="btn-primary">Remove access</button></div>
    </div>
  </div>
  ```

**Non-goals:** taking a person off the Cloudflare sign-in list before setup finishes: without the key, or with a list the app can't read, the app can't change it safely. The other fixes from the same security check are planned in their own workspaces.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `employee-onboarding`: before permissions start, a person the employer removed is denied, not given every app.

## Impact

- `app/worker/employee-access/policy.ts` (`currentPolicy`): deny a non-owner whose member row is `removed` before the `not_started` return. `memoryCaller` follows, since it reads `currentPolicy`.
- `app/src/apps/access/People.tsx`: the live remove confirm qualifies the sign-in-list and sign-out lines while `status.started` is false.
- Tests: `app/worker/employee-access/policy.test.ts` (replace the pre-start "a removed row means nothing" assertion; memory checked through `memoryRole`), `management.test.ts`, `app/src/apps/access/App.test.tsx`.
- Docs: `wiki/stack/employee-access.md` (*The first open*), `CHANGELOG.md`.
- Source: security check finding `app/worker/employee-access/policy.ts:currentPolicy:removed-member-kept-before-permissions-start` (low), reproduced at 08f9788e.

## Decision log

- **2026-10-21** — Assumed: enforce the removal in the app, not only soften the screen's words, because the screen, the spec (*Full removal SHALL deny company work immediately*) and the wiki all promise it, and Matthew wants a thing fixed, not only described.
- **2026-10-21** — Assumed: the check keys on the saved *removed* status, because only a removal writes it, so nobody else is locked out before setup and the pre-start promise to people never added still holds.
- **2026-10-21** — Assumed: also reword the remove box before setup finishes, because the sign-in list and sign-out really do wait for setup; cheap to change.
- **2026-10-21** — Assumed: a patch release, because it fixes a broken promise and adds nothing new.
