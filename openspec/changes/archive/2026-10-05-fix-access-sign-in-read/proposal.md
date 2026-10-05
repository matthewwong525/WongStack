# Access can read the sign-in list on the live app

**Status:** ready-to-build
**Branch:** slow-baboon
**Open questions:** none

## Why

On the live app, Access says *The sign-in list could not be read yet* and every person you add stays on *Can't sign in yet*. The app's key and the sign-in list are both fine. The app asks Cloudflare in a way the live app's host refuses, so the question is never sent. Our tests run on a different host that accepts it, so they passed.

## What Changes

- **Access reads the sign-in list.** The first time you open Access on the live app, it lists everyone who can already sign in, each with every app, and the notice goes away.
  ```text
    BEFORE                  AFTER
  open Access             open Access
      │                       │
      ▼                       ▼
  ask Cloudflare          ask Cloudflare
      │ refused               │ sent
      ▼ before sending        ▼
  "could not be           people listed,
   read yet"              notice gone
  ```
- **People you add can sign in.** Adding a person puts their email on the sign-in list, and removing one takes it off. A person you added while the notice showed, such as `info@claymoo.com`, gets on the list with one press of *Try again*, without adding them again.
- **The key stays as safe as before.** If Cloudflare ever answers by pointing the app somewhere else, the app stops and reports a failed step. The key is never sent on.
- **A check stops this coming back.** The tests now fail if app code asks in the refused way again.

**Non-goals:** Changing the Access screen's layout or words, the key, or what a preview does. Showing the reason for a failed read on the screen.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None: `employee-onboarding` already promises the first-open import and the sign-in list changes; the code did not keep the promise (`skip_specs: true`).

## Impact

`app/worker/employee-access/provider.ts` and its tests (`core.test.ts`, `login-management.test.ts`), possibly `management.ts` or `start.ts` for the pending person, one guard test over `app/worker/`, one line in `wiki/stack/core-stack.md`, and a patch changelog entry. No schema, key, or dependency change. The result shows only on the live app: a preview makes no Cloudflare call.

## Decision log

- **2026-10-05** — Asked what the Access notice means and how to fix it → chose to fix the app, since the cause is in our code and nothing on the screen or in Cloudflare can clear it.
- **2026-10-05** — Assumed: the cause is `redirect: "error"` on the Worker's `fetch`, because a local copy of the Workers runtime throws on it before sending, `redirect: "manual"` returns 200 there, Cloudflare shows the key `wongstack-access` as never used, and the live application and both policies pass every check in the read.
- **2026-10-05** — Assumed: use `redirect: "manual"` and keep failing on any non-2xx answer, because a 3xx then fails the step and no redirect is followed, so the key is never forwarded.
- **2026-10-05** — Assumed: no spec change (`skip_specs: true`), because the promised behavior is unchanged.
- **2026-10-05** — Assumed: a patch release, because it repairs shipped behavior and adds none.
- **2026-10-05** — Assumed: the browser-side `redirect: "error"` in `app/src/lib/access.ts` stays, because browsers support it and it guards the sign-in redirect.
- **2026-10-05** — Assumed: the look at the live app after publishing is open work, not a task, because only the live app calls Cloudflare.
