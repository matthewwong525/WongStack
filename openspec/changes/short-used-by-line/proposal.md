# A "Used by" line that fits

**Status:** in-progress

**Branch:** hungry-falcon

**Open questions:** none

## Why

In Access, the Keys list cuts Project code's *Used by* line short: it reads *Installs the project, no app ne…*. Every row is one line now, so the words have to fit the line.

## What Changes

- **The Keys list says what a key does in fewer words.** Project code reads *Installs the project*, and Cloudflare reads *Look-ups*. A key that apps use too still starts with the count: *1 app · Look-ups*. No line ends in "…".
  ```text
    BEFORE
  Key          │ Used by
  ─────────────┼─────────────────────────
  Project code │ Installs the project, n…
  Cloudflare   │ Look-ups, no app needed
  Stripe       │ 2 apps

    AFTER
  Key          │ Used by
  ─────────────┼─────────────────────────
  Project code │ +Installs the project
  Cloudflare   │ +Look-ups
  Stripe       │ 2 apps
  ```
- **The opened key still says it all.** Its panel keeps *Installs the project, no app needed · Read only*, and the line under a key's level on a person or role is unchanged.

**Non-goals:** the width of any column, the other three lists, and the wording anywhere but the Keys list.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The promises stand as written: each row is one line, and Access shows what uses a key. Only the list's wording changes, so the change sets `skip_specs: true`.

## Impact

- `app/src/apps/access/levels.ts`: `keyUseShort` drops *, no app needed*; `aloneLine` and `keyUseLine` keep it.
- `app/src/apps/access/levels.test.ts`, `Grants.test.tsx`: the list's expected words, and a length bound on the list's line.
- `CHANGELOG.md`: a `patch` entry, since the app ships.

## Decision log

- **2026-10-06** — Asked how the Keys list should make the *Used by* line fit on one line → chose shorter words: *Installs the project* and *Look-ups* in the list, with *no app needed* kept in the opened key's panel.
- **2026-10-06** — Assumed: hovering the line shows the same short words, because nothing is cut any more and the full wording is one click away in the panel.
- **2026-10-06** — Assumed: a check holds the list's line to a length that fits the column at its narrowest, because a longer wording added later would be cut short again with nothing to catch it.
- **2026-10-06** — Assumed: no written promise changes, because *each row is one line* and *Access shows what uses a key* already cover this and only the words differ.
- **2026-10-06** — Built: the list drops *, no app needed*, and a test holds its line to 30 characters. The tests, the build and the local checks pass; the look at the preview is left.
