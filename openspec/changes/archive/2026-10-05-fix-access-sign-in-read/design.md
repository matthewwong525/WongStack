# Design

## Context

See proposal.md - Why. `provider()` in `app/worker/employee-access/provider.ts` is the only Worker code that sends the sign-in list key. It passes `redirect: "error"` to `fetch`. The Workers runtime throws `TypeError: Invalid redirect value, must be one of "follow" or "manual"` before any request leaves. `startPermissions` swallows the error by design (a failed read changes nothing), so the screen shows only the notice. Vitest runs in Node, where `"error"` is valid, and two tests assert that exact value.

## Goals / Non-Goals

**Goals:**
- Every provider call leaves the live Worker.
- A redirect still never receives the key.
- A person saved before permissions started reaches the sign-in list without being re-added.
- A test fails if Worker code uses `redirect: "error"` again.

**Non-Goals:**
- Running the Worker tests in the Workers runtime.
- Surfacing provider error codes on the first-open notice.

## Decisions

- **`redirect: "manual"`, and non-2xx stays a failure.** With `"manual"` a 3xx comes back as a response with `ok === false`, which `provider()` already turns into `provider_unavailable`. No `Location` is read or followed. Alternative `"follow"`: rejected, it would forward the `Authorization` header.
- **A static guard test over `app/worker/**`.** A test reads the non-test Worker sources and fails on `redirect: "error"`. It is cheap and names the reason. Alternative, a workerd test pool: rejected as a new dependency for one quirk.
- **The pending person.** `changeMember` records sign-in work, but `reconcileLogin` returns early until permissions start, and a `GET /api/access/status` starts permissions without reconciling. The builder checks what the screen offers after the first successful open. If the person would wait for a press of *Try again*, and that button shows, that is enough; if nothing would move them, the owner's first successful open also runs the reconcile once, after `startPermissions`, with failures swallowed as on a save. A test covers the path chosen: a member saved before start ends on the sign-in list.

## Risks / Trade-offs

- [Another runtime difference hides behind the same Node tests] → the look at the live app after publishing: open Access, see the notice gone and `info@claymoo.com` on *Can sign in*.
- [The first successful open turns permissions on] → as designed: everyone on the sign-in list is imported with every app first, so nobody loses anything.
