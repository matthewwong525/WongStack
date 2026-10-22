# Design

## Context

The plan view puts the review page in a sandboxed frame with no same origin, so the page's `theme.js` can't read or save `wongstack-theme` and always starts light; its button works only until a reload. The app's header toggle sets the `dark` class on the app's own `<html>`. The page and the inbox already talk over the `MessageChannel` port handed with `inbox:hello`.

## Goals / Non-Goals

**Goals:** one switch on a plan; the frame matches the app's look and follows changes live; the approval who-line wraps at 360–390px with no horizontal scroll.

**Non-Goals:** changing the review page outside the inbox; restyling the review page; letting the frame change the app's theme.

## Decisions

1. **The look rides the port.** `inbox:hello` gains `theme: 'light' | 'dark'`; PlanView watches the app root's `dark` class (a `MutationObserver` on `document.documentElement`, or the app's existing theme hook if one exists) and posts `{ type: 'inbox:theme', theme }` on change. The page, in hosted mode only, removes its `theme.js` button and toggles `dark` on its root. Unknown values are ignored. Alternative — hide the app's toggle on the plan view — rejected: the app bar is shared and the frame can't remember a choice.
2. **Older pages stay as they are.** A page built before this change ignores the new fields and keeps its button; nothing breaks.
3. **The who-line wraps.** Drop the `truncate` on the decision's who-line in favour of `wrap-anywhere`/`break-words` with `min-w-0`; keep the folded card's answer truncated (one line by design). Keep `grid-cols-1` from #432 so nothing widens the page.

## Risks / Trade-offs

- A page that gets the look after paint flashes light once in dark mode; sending it with `inbox:hello` keeps that to the first paint only.

## UX

### Use-case brief

The person reviews a plan in the inbox, often on a phone at night, and wants it in the same light or dark look as the rest of the app, with one obvious switch.

### Flow

Open plan → the page shows in the app's look → tap the app's moon or sun → the page switches in place, notes kept.

### Hierarchy

The app bar's switch is the only one; the review page's header loses its moon inside the inbox. On a phone, the approval's top line wraps under the *Risky* tag.
