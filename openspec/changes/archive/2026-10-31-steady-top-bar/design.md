# Design

## Context

Two changes on 2026-10-25 made the bars move. `inbox-phone-fixes` unpinned `Layout.tsx`'s header on every page and had a plan's page (`review-kit.html`) post `inbox:scroll { down }`, so `PlanView` could hide the header and its `Top` row (*Back* and the workspace) while the person reads down. `only-the-app-bar-returns` added `top` to that message and a third state: on a turn up mid-plan the header is laid `fixed` over the plan (`data-bars="over"`, `lib/bars.ts`). The plan scrolls inside a sandboxed frame that reaches the inbox only by its `MessagePort`, so anything outside the frame can follow the plan's scroll only by message, after it happens: hiding or showing it resizes or covers the frame, and that is the jerk.

## Goals / Non-Goals

**Goals:**
- The app's header is pinned on every page and never hides, slides or overlays on a plan.
- *Back* and the workspace scroll with the plan's words, with no resize of the frame.
- A plan built before this change still has a way back.

**Non-Goals:**
- The review page opened on its own link, its bottom bar, notes and drawings.
- The week board and Access screens, beyond the header pinning above them.

## Decisions

### The header is pinned again, everywhere

`Layout.tsx`'s header takes back its pre-44.15.0 classes, `sticky top-0 z-40 ... bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60`, and drops every `in-data-[bars=…]` class. `app/src/lib/bars.ts` goes, with `PlanView`'s `bars` state and its effect. Access's side panel already starts at `sm:top-14`, under a pinned bar; pinned again, the strip above it that the 2026-10-25 thread worried about can't appear.

- *Alternative:* pin it only in the inbox. Rejected: Matthew chose every page.

### Back lives inside the plan's page

- **The kit draws it.** In hosted mode, on `inbox:hello`, the kit puts a row first in its `<header>`: a ghost *Back* button and the workspace as muted text (`textContent`, never HTML). `inbox:hello` gains `workspace: string`; a missing or non-string workspace shows *Back* alone. Tapping *Back* posts `{ type: 'inbox:back' }`. The row is in the page's flow, so it scrolls away with the words, at the browser's own pace. Opened on its own link, the page draws no row.
- **The inbox obeys it.** `frame.ts` adds `z.strictObject({ type: z.literal('inbox:back') })`, needing no key; `PlanView` answers it with `navigate('/apps/inbox/')`.
- **The inbox knows which pages draw it.** The kit's `<body>` carries `data-own-back` beside `data-change`; `frame.ts` exports `ownBack(body)`, read like `notesKey`. For such a page `PlanView` renders no visible `Top` row, only its `sr-only` `<h1>`, and the frame fills `h-[calc(100dvh-5.5rem)]` with the tap line, when shown, above it. For any other page it renders `Top` as before 44.15.0: pinned above the frame. Reading the body before the frame loads shows the right layout at once, with no swap after `inbox:hello`.
- *Alternative:* keep `Top` outside and hide it once the plan leaves its top. Rejected: the frame grows by the row's height at that moment, so the plan jumps, the jerk Matthew dislikes.
- *Alternative:* let the outer page scroll and grow the frame to its content. Rejected again, for the reason `inbox-phone-fixes` gave: the review page's fixed bar, note editor and full-screen drawings pin to the frame's window, which would then run past the screen.

### Scroll reports stop

The kit drops `scrolled()` and its listener; `frame.ts` drops `inbox:scroll`, so a message from an older plan parses to `null` and changes nothing. `wiki/development/reply-links.md` replaces its *bars slide away* line with what a plan does now. `inbox:scroll` and `tuckBars` go into `scripts/retired-names.json`, so a live file that still names them fails the check.

## Risks / Trade-offs

- **The pinned header takes 3.5 rem of a phone's screen on every page** → the space Matthew wanted back on 2026-10-25. He now prefers a steady bar; *Back* scrolling away gives back the row below it.
- **A plan sent before this change keeps a pinned *Back*** → until its chat rebuilds it; it never hides or slides, so it is steady, only taller.
- **`one-review-standard` (workspace odd-lion) rewrites much of `review-kit.html`** → it does not touch hosted mode or the `<header>`'s start, so the merge is in separate parts; whichever lands second rebuilds and reruns `scripts/tests/review.test.mjs`.

## UX

- **Brief:** Matthew reads a plan in the inbox on his iPhone, inside Paseo's browser, scrolling up and down to compare sections, then leaves by *Back* or acts from the plan's bottom bar. Done is reading without anything sliding or jumping. Common case: a fresh plan; edge case: a plan sent before this update. Mirrors a plain web page under a pinned site bar.
- **Flow:** open a plan → the bar, then *Back* and the workspace, then the title → read down: *Back* scrolls off, the bar stays → back at the top → tap *Back* → the week board.
- **Hierarchy:** the plan's words are primary; the bar and *Back* are for leaving.
- **Components:** Layout's header, the kit's new top row (its existing `btn-ghost` and `muted` styles), `PlanView`'s `Top` for older plans, the frame.

### Review

[review.html](review.html): What Changes item 1 sketches the bar now and after; item 2 the plan at its top and read down.
