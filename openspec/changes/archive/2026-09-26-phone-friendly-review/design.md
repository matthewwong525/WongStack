# Design

## Context

The review page is `review-kit.html` (one style, one script) plus static markup that `build-review.mjs` writes from `proposal.md`. Today a drawing is `<figure class="drawing"><div class="frame"><pre class="art">` inside the item's `.body` column, and the kit zooms it with a CSS `transform` and pans it with pointer events under `touch-action:none`. Notes start from a document-level still-tap detector that shows a floating `#chip`. The phone editor is `position:fixed; bottom:<computed>` from `visualViewport`. Screenshots from an iPhone in the Paseo app show the three failures named in the proposal.

## Goals / Non-Goals

**Goals:** one-tap notes on touch; drawings folded, full-width, with a full-screen viewer; panning that the host app does not steal; a docked editor that never leaves the visible screen.

**Non-goals:** changing note ids, labels, storage keys, or the copy format; a new visual kind; editing archived pages.

## Decisions

- **Folding is `<details>`, written by the builder.** `<details class="drawing"><summary>…</summary><div class="frame"><pre class="art">…</pre></div></details>` becomes a direct child of `li.item`, after `.body`. `.item` becomes a two-column grid (number, text) and the drawing spans both columns with negative side margins to the card's edges. `<details>` folds with no script, so the page still works when the kit's script fails. Alternative: a JS toggle — more code and nothing gained.
- **Scale by font size, not transform.** The inline drawing and the viewer both set the `pre`'s `font-size` (base 13px, padding in `em`, pins inside `.art` sized in `em`) so the laid-out size is the real size. Inline, fit is `13 × frameWidth / naturalWidth`, capped at 1.25×; no frame-height bookkeeping is needed. In the viewer, a real size lets `overflow:auto` pan natively. Alternative: keep the transform and pan in JS — that is the gesture iOS hands to the host app's sidebar.
- **The viewer borrows the drawing's node.** Opening moves the item's `pre.art` into `#viewer`; closing moves it back. There is never a second copy, so `data-note` lookups, pins, and labels stay unique. Choosing a line's "Add note" or a pin in the viewer closes the viewer, opens the item's `<details>`, and then opens the editor on the same node.
- **Pinch in the viewer uses touch events.** The viewer frame has `touch-action: pan-x pan-y`, so the browser owns one-finger scrolling and never page-zooms. Two-finger `touchmove` sets the scale around the pinch midpoint, adjusting `scrollLeft`/`scrollTop` to keep that point still. Safari's `gesturestart` is cancelled while the viewer is open. Ctrl or Cmd wheel and the − / Fit / + buttons use the same `scale()`; bounds are fit to `max(4 × fit, 40px)`.
- **Note buttons are rendered by `render()`, beside pins.** For each `[data-note]` outside `.art`, render appends a pin when a note or draft exists, else a `.add` button carrying `data-open`. The existing `[data-open]` click handler opens the editor; with no saved record it uses the button's own `[data-note]` ancestor. `labelOf` strips `.add` with `.pin` and `.meta`, so labels, and therefore saved notes, are unchanged.
- **The still-tap chip stays for mouse and for viewer lines.** `pointerup` shows the chip for a `[data-note]` inside `#viewer` for any pointer, for other text only when `pointerType === 'mouse'`, and never inside the inline `.frame` (a click there opens the viewer). Keyboard Enter/Space keeps showing the chip.
- **The docked editor is placed from the visual viewport's top.** `dock()` sets `max-height` to the visual viewport's height and `top = offsetTop + max(0, height − editorHeight)`. The docked editor is a flex column whose textarea shrinks to a 44px floor, the location line is one ellipsized line, and the four buttons fit one row at 320px (Discard draft → Discard). Alternative: the old `bottom` offset — it double-counts when the host webview itself resizes for the keyboard.

## Risks / Trade-offs

- [The host app may still claim a horizontal swipe even over a native scroller] → the viewer uses `overscroll-behavior: contain`; `/verify` or the user checks on an iPhone, and the Decision log records the result.
- [Tiny fitted text for very wide drawings] → the full-screen view is one tap away, and the builder already warns past 60 columns.
- [Font-size scaling is not perfectly linear at small sizes] → fit subtracts a pixel, and the inline frame clips rather than widening the page.

## Migration Plan

Active changes pick up the kit on their next `build-review.mjs` run; note ids and labels do not change, so saved notes stay attached. Archived pages are not rebuilt. Rollback is reverting the kit and builder.

## UX

### Use-case brief

The person who asked for a change reviews its plan on an iPhone, inside the Paseo app's HTML preview, often between other things. The job is to read each item, look at its drawing when it helps, and leave short notes, then copy them back to the agent. Done is a pasted `/continue` block. Common case: read, tap Note on two or three items. Edge case: comment on one line of a drawing. Assumed frequency: one page per planned change, a few notes each.

### Flow

Read → tap **Note** → type → **Save** → … → **Copy notes**. For a drawing: **Show drawing** → tap the drawing → zoom and move → tap a line → **Add note** → type → **Save**.

### Hierarchy

The page's one primary action stays **Copy notes** in the bottom bar. Note buttons are small outlined secondary controls; the fold row is a muted full-width row; the viewer's Close is secondary to the drawing.

### Review

[review.html](review.html). Item 1 sketches an item card with its Note button and folded drawing row; item 3 sketches the full-screen view.

### Components

No new component library; the kit stays one style and one script. New kit parts: the `.add` Note button, the `details.drawing` fold row, and the `#viewer` dialog. The viewer's zoom bar reuses the existing zoom-bar markup and style.
