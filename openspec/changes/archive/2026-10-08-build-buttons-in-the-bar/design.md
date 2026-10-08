# Design

## Context

See [proposal.md](proposal.md). `review-kit.html` has a fixed `.bar` (count, *Session only*, `#copy`) and a `<section id="ready">` after Decisions holding `#ready-choose`, `#ready-confirm`, and `#ready-says`, driven by `data-ready` clicks and shown once `alive` lists both actions.

## Goals / Non-Goals

**Goals:** the build buttons reachable from anywhere on the page; one primary action; no change to requests or guards.

**Non-Goals:** a menu or sheet; new wording for the buttons.

## Decisions

1. **Move the three `ready-*` elements into `.bar` as a second row** and delete the section and its heading. The ids and `data-ready` handlers stay, so the logic and its tests change little. `.bar` becomes `flex-wrap: wrap`; the ready row takes `flex-basis: 100%` under 700px and sits inline above it.
2. **The page's bottom padding follows the bar's height**, set from the bar's measured height on load, resize, and each row change, so the last decision is never hidden under a taller bar.
3. **Primary follows unsent notes.** `render()` already knows `unsent().length`; it toggles `primary` between `#copy` and the `build` button. Off a live link `#copy` stays primary.
4. **The confirm text is shortened to fit one line on a phone:** *Goes live, can't be undone.* The spoken label keeps the full sentence.
5. **The bar hides while the note editor is docked or a drawing is full screen**, as today, so the build row never covers the keyboard.

## UX

**Brief.** The reviewer on a phone has read enough, anywhere on the page. Done: one tap, no scroll. Mirrors the bar's own *Send notes*.

**Shortest flow.** Open link → *Build it*.

**Hierarchy.** One primary in the bar: *Send notes* with unsent notes, else *Build it*. *Build and publish* is secondary and confirms.

**Components.** The existing bar and buttons; no new component.

### Review

[review.html](review.html): the first and third What Changes items sketch the bar.

## Risks / Trade-offs

- [A two-row bar covers more of a phone's screen] → about 44px more; it hides with the editor and the full-screen drawing.
- [A build button beside *Send notes* is easier to tap by mistake] → *Build it* publishes nothing, and publish still confirms.
