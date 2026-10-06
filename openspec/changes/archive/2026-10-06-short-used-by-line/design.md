# Design

## Context

See proposal.md for why. The Keys list's *Used by* cell is `<Cell cut={keyUseShort(key)} />` in `app/src/apps/access/Keys.tsx`. A `cut` cell takes 30% of the row (`SHARE` in `Table.tsx`) and ends in "…" past that. `keyUseShort` in `levels.ts` joins an app count with `capital(aloneLine(key))`, and `aloneLine` is `installs the project, no app needed` or `look-ups, no app needed`. The same `aloneLine` sits under a key's level in `SetFields.tsx` and inside `keyUseLine` for the opened key; both have room and stay as they are.

## Goals / Non-Goals

**Goals:**
- The list's line shows whole for every key: alone, used by apps, or both.
- A later, longer wording fails a test, not a person's screen.

**Non-Goals:**
- Changing `SHARE`, `CUT`, or any column's width.
- Changing `aloneLine`'s or `keyUseLine`'s words.

## Decisions

- **Split what a key does alone from *, no app needed*.** A small helper returns `installs the project` or `look-ups`; `aloneLine` appends `, no app needed` to it, and `keyUseShort` uses it bare. Chosen over a second lookup table in `keyUseShort`, which would name the two wordings twice.
- **Bound the line's length in `levels.test.ts`.** The longest line the list can build, `12 apps · Installs the project`, is 30 characters. At the narrowest width that still shows one-line rows (a 44rem list), the column holds about 30 characters of 14px text. The test builds each alone wording with a two-digit app count and expects at most 30 characters. jsdom lays nothing out, so a character bound is the check that can run; the preview walk confirms it by eye.
- **`title` follows the visible words.** `Cell` sets `title` from `cut`, so it now carries the short line. A second prop for a longer title was weighed and dropped: the panel holds the full line, and nothing is hidden behind "…" any more.

## Risks / Trade-offs

- [The list no longer says a key works with no app] → The opened key's panel and the level line on a person or role still say it; *Installs the project* and *Look-ups* name no app, and a key apps use shows its count.
- [A character bound is not a pixel width] → Task 3.4 looks at the preview at the narrowest one-line width and at a phone width.
