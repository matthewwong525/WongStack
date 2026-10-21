# Design

## Context

See [proposal.md](proposal.md) for why. `currentPolicy` in `app/worker/employee-access/policy.ts` reads the installation row and the caller's member row in one snapshot. When `policy_enabled` is 0 it returns `not_started` before the check that denies a non-owner whose row is not `active`. In `not_started`, `refusal` allows every app-mapped route, and `memoryRole` maps a non-manager to `member`. So a saved removal changes nothing until permissions start.

Permissions stay off on the live app when `WONG_ACCESS_LOGIN_MANAGEMENT` is missing or the sign-in list read fails (`startPermissions`). `reconcileLogin` makes no provider call in that state, so the edge keeps admitting the removed email and no sessions are revoked. The removal's `policy` and `sessions` work stays pending and runs once permissions start.

## Goals / Non-Goals

**Goals:**

- A `removed` member row denies its person in `currentPolicy` whatever `policy_enabled` says, so app pages, app and mini-app APIs, discovery and memory all follow from one place.
- The remove confirm says honestly what waits for setup.

**Non-Goals:**

- Changing the edge sign-in list or revoking sessions before permissions start.
- Changing who keeps every app before start: people with no row, or an `active` row, are untouched.

## Decisions

- **Deny on `status === "removed"` before the `not_started` return.** The guard is `role !== "owner" && email && row.status === "removed"` → `{ state: "denied" }`, placed after `manages` is worked out and before `if (!row.policy_enabled)`. Only `changeMember` writes `removed`, so it is an explicit act by the owner or an Admin. The owner can't be changed (`owner_cannot_be_changed`) and has no row, and the `role !== "owner"` test also covers the staging checker. The checker has no email and no row, so it is unaffected.
  - *Alternative: deny any non-`active` row.* The status column is `active | removed | null`; `null` means no row, which must stay open before start. Naming `removed` says exactly what it guards.
  - *Alternative: only reword the screen.* Rejected: the spec's removal requirement already says full removal denies company work immediately.
- **Memory needs no change of its own.** `memoryCaller` calls `currentPolicy`; `memoryRole({ state: "denied" })` is `null`, so the memory route refuses. A test pins it.
- **The confirm reads `status.started`.** On the live app with `started` false, the sign-in-list and sign-out sentence becomes *Once Access setup finishes, they leave the sign-in list, and everyone is signed out and signs in again.* Staging's practice wording and the started wording stay as they are.
- **Wiki.** *The first open* step 1 gains *except a person you remove*; the *Add, change and remove people* bullet is already true. The page sits at 2,957 of 3,000 words, so the edit stays a few words.

## Risks / Trade-offs

- [A removed person who still holds an edge session now gets 403 on every app, before start] → That is the promise. *Add back* sets the row `active` and restores every app at the next request.
- [The removed person still reaches the edge, the home page shell and public routes] → Same as after start for the in-app part; the edge list is out of reach until setup finishes, and the confirm now says so.
- [`/api/access/apps` for a removed person turns from `not_started` to 403 before start] → Matches the started behaviour the frame already handles.

## Migration Plan

None: no data changes. Rolling back restores the old pre-start behaviour.

## UX

The only screen change is one sentence in the existing remove confirm (`app/src/apps/access/People.tsx`); no layout, action or flow changes.

- **Brief:** the owner or an Admin removes someone who left, on a live app whose Access setup hasn't finished. Done means they are refused at once and know the sign-out waits. Rare; usually at a desk.
- **Flow:** row menu → *Remove* → confirm → *Remove access*; unchanged.
- **Hierarchy:** *Remove access* stays the one primary action.
- **Components:** the existing `Confirm` dialog.

### Review

[review.html](review.html): the What Changes item *The remove box says when the sign-out happens* sketches today's confirm beside the before-setup one.
