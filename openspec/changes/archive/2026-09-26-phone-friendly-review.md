<!-- openspec-archive v1 2026-09-26-phone-friendly-review -->
<!-- file proposal.md utf8 6568 -->
# Phone-friendly review page

**Status:** ready-to-ship
**Branch:** improve-review-mobile
**Open questions:** none

## Why

The review page is hard to use on an iPhone. Adding a note takes two taps, and the second one is easy to miss. Drawings are squeezed into a narrow column. Dragging a zoomed drawing opens the Paseo sidebar instead of moving the drawing. When the keyboard opens, the top of the note box is cut off.

## What Changes

- **A Note button on everything you can comment on.** Every paragraph, item, and decision shows a small "Note" button. One tap opens the note box. Once a note exists, its number takes the button's place. On a computer, clicking the text still offers "Add note" as before.
  ```text
  ┌──────────────────────────────────┐
  │ 2  The wiki says each thing      │
  │    once. About 3,000 words go.   │
  │                         [+ Note] │
  ├──────────────────────────────────┤
  │ ▸ Show drawing                   │
  └──────────────────────────────────┘
  ```
- **Drawings fold away and use the full width.** Each drawing starts folded under its item as a "Show drawing" row. Opened, it spans the whole card and scrolls with the page, with no zoom buttons in the way. The row says how many notes sit on the drawing, so a folded note is never lost.
- **Tap a drawing to see it full screen.** The drawing fills the screen, bigger than on the page. Pinch or use + and − to zoom, and move it with your finger, the way you scroll any page. Tap a line to note it. Close takes you back where you were.
  ```text
  ┌──────────────────────────────────┐
  │ Fit · 120%    [−] [Fit] [+] Close│
  ├──────────────────────────────────┤
  │ before            after          │
  │ ship ── rule      ship ─┐        │
  │ save ── rule      save ─┼▶ one   │
  │ apply ─ rule      apply ┘  rule  │
  │                                  │
  │   drag to move · pinch to zoom   │
  └──────────────────────────────────┘
  ```
- **Moving a drawing no longer opens the sidebar.** The full-screen view moves the drawing with the phone's own scrolling, so the app should no longer mistake your drag for a swipe. This needs a check on a real iPhone.
- **The note box always fits above the keyboard.** It is shorter: the "where" line is one line, and the buttons sit in one row. It never rises past the top of the visible screen, however little room the keyboard leaves.

**Non-goals:** No change to what gets copied, how notes are saved, or the page's order. Already-shipped review pages stay as they are. No change to the Paseo app itself.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: a visible Note button replaces tap-then-chip on touch; drawings fold, span the card, and open a full-screen viewer that owns zoom and pan; the docked editor stays inside the visual viewport.

## Impact

- **Kit:** `.agents/skills/plan/references/review-kit.html` (layout, Note buttons, folded drawings, full-screen viewer, docked editor placement).
- **Builder:** `.agents/skills/plan/scripts/build-review.mjs` (drawing markup: a `<details>` outside the item's text column).
- **Tests:** `scripts/tests/review.test.mjs`, `app/review/review.test.mjs`.
- **Docs:** `wiki/ux-principles.md`, `.agents/skills/plan/SKILL.md`, `README.md` caption.
- **Release:** `VERSION` 25.2.0 and `CHANGELOG.md`. Active changes pick the new kit up on their next page build; archived pages are not rebuilt.

## Decision log

- **2026-09-26** — Asked how a phone tap should start a note → chose a visible Note button on each item, paragraph, and decision.
- **2026-09-26** — Asked how drawings should show → chose folded by default, full width when opened, and a tap for full screen with zoom.
- **2026-09-26** — Assumed: zoom and drag happen only in the full-screen view, using the phone's native scrolling, because a JavaScript-driven drag lets the host app read the gesture as a sidebar swipe.
- **2026-09-26** — Assumed: notes on single drawing lines stay, made by tapping a line in the full-screen view, and existing note locations are unchanged, because saved notes must stay attached after a rebuild.
- **2026-09-26** — Assumed: clicking text with a mouse still shows "Add note", and a touch tap on text does nothing extra, because the Note button now covers touch and a stray tap while scrolling should do nothing.
- **2026-09-26** — Assumed: the docked note box is placed from the top of the visible screen and capped at its height, because placing it from the bottom pushed its top under the host's header when the keyboard was open.
- **2026-09-26** — Assumed: the Discard draft button is renamed Discard to keep the buttons on one row at 320px, because the requirement names the action, not the label.
- **2026-09-26** — Assumed: this ships as a minor release (planned as 24.1.0), a new feature with no breaking change.
- **2026-09-26** — Changed during apply: the Full screen button sits on the drawing's fold row, not over the drawing, because over the drawing it hid the top-right characters. The README screenshot is retaken with the new kit from the `lighten-the-loop` proposal.
- **2026-09-26** — Tested locally with a borrowed Playwright 1.61 and Chromium: `node --test scripts/tests/*.test.mjs` 259 pass, `app/review/review.test.mjs` 9 pass. A 260px-tall screen keeps the whole note box visible. Not tested: a real iPhone inside the Paseo app, so whether a drag in the full-screen view still opens Paseo's sidebar is for the user to check on their next review page.
- **2026-09-26** — Distilled facts before the archive: the store holds no facts for this change or branch yet, so no repeatable fact.
- **2026-09-26** — Archive checkpoint: saved the archived change with the kit, builder, tests, docs, and 24.1.0 release for CI.
- **2026-09-26** — Merged main (25.0.0, 24.0.2) into the branch before the merge; CHANGELOG and VERSION conflicted, so this release is renumbered 25.1.0.
- **2026-09-26** — Merged main again (another 25.1.0 landed first), so this release is renumbered 25.2.0.

<!-- end proposal.md -->
<!-- file design.md utf8 6040 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 1963 -->
## 1. Builder

- [x] 1.1 `build-review.mjs`: write each drawing as `<details class="drawing">` with a summary (show and hide labels, a note-count slot) and the frame, placed after `.body` as a direct child of `li.item`.

## 2. Kit

- [x] 2.1 Layout: `.item` grid; drawings span the card edge to edge; fold row styling; `.art` sized by font size with `em` padding and `em` pins; an Enlarge control in each frame.
- [x] 2.2 Inline drawings: fit by font size on open, render, and resize; a click on the frame or Enlarge opens the viewer; remove the inline zoom bar, transform, and JS pan.
- [x] 2.3 Full-screen viewer: borrow the `pre`, native scroll, − / Fit / + buttons, pinch by touch events, Ctrl or Cmd wheel, Close and Escape with focus return, body scroll lock.
- [x] 2.4 Notes: Note buttons from `render()`, `.add` stripped from labels, fold-row note counts, chip only for mouse on text and any pointer on viewer lines, reveal a folded drawing before scrolling to or editing a line.
- [x] 2.5 Docked editor: place from the visual viewport's top with a height cap, one-line location, shrinking textarea, one button row, Discard label.

## 3. Tests

- [x] 3.1 `scripts/tests/review.test.mjs`: drawings render inside a closed `details.drawing` that is a child of the item, with lines still note targets.
- [x] 3.2 `app/review/review.test.mjs`: touch Note opens the editor in one tap and a touch tap on text shows no chip; mouse chip still works; a line note through the viewer; fold, fit, full width, viewer zoom and scroll, Escape focus return; a 260px-tall phone keeps the whole editor visible; no sideways overflow from 320px.

## 4. Docs and release

- [x] 4.1 Update `wiki/ux-principles.md`, `.agents/skills/plan/SKILL.md`, and the `README.md` caption for Note buttons and full-screen drawings.
- [x] 4.2 Bump `VERSION` to 24.1.0, add the `CHANGELOG.md` entry, and run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`.

<!-- end tasks.md -->
<!-- file specs/ux-wireframes/spec.md utf8 9032 -->
## MODIFIED Requirements

### Requirement: Review controls support keyboard and touch

Jump links, Note buttons, drawing folds, the full-screen view and its zoom controls, note actions, and draft actions SHALL be reachable by keyboard and touch, with visible labels and focus. Enter or Space on a focused item, visual line, or decision SHALL show its "Add note" option. Closing an editor SHALL return focus to its target. Escape SHALL close the full-screen view and return focus to the control that opened it. Information SHALL NOT depend on hover or color alone.

#### Scenario: Keyboard review

- **WHEN** a reviewer tabs to item 3, presses Enter, adds a note, and closes the editor
- **THEN** each control is reachable, focus is visible, and focus returns to item 3

#### Scenario: Arrow keys in an editor

- **WHEN** the reviewer presses an arrow key while editing draft text
- **THEN** the text cursor moves normally and the page does not jump to another item

#### Scenario: Leave the full-screen view by keyboard

- **WHEN** a reviewer opens a drawing full screen and presses Escape
- **THEN** the view closes and focus returns to the control that opened it

### Requirement: A visual can be panned and zoomed

Each visual SHALL start folded under its item's text, behind a labeled control that opens it and states how many notes and drafts sit on its lines. Opened, the visual SHALL span the full width of its item and be fitted to that width, so the whole drawing shows. On the page, a drag over it SHALL scroll the page, and it SHALL have no zoom controls. A tap or click on it, or its labeled full-screen control, SHALL open a full-screen view of that drawing. The full-screen view SHALL open fitted to the screen width, which MAY be larger than on the page. Zoom-in, zoom-out, and Fit buttons, a pinch, and a Ctrl or Cmd wheel SHALL change its zoom within fixed bounds. When the zoomed drawing is larger than the view, a drag SHALL move it using the browser's native scrolling, and the page behind SHALL NOT scroll. Closing the view SHALL return the drawing to its item. A frame SHALL NOT make the page scroll sideways.

#### Scenario: A drawing starts folded

- **WHEN** a reviewer opens a page with a drawing in item 3
- **THEN** item 3 shows its text and a closed control to show the drawing
- **AND** opening it shows the whole drawing fitted across the item's full width

#### Scenario: A wide drawing on a phone

- **WHEN** a reviewer opens an item whose drawing is wider than the screen
- **THEN** the drawing shows whole, fitted to its frame

#### Scenario: Zoom in and pan

- **WHEN** the reviewer taps the opened drawing, zooms in, and drags inside the view
- **THEN** the drawing fills the screen, grows, and the drag moves it by native scrolling
- **AND** the page behind does not scroll

#### Scenario: Back to fit

- **WHEN** the reviewer presses Fit in the full-screen view, then closes it
- **THEN** the whole drawing shows again, and back on the page it is fitted in its item and a drag scrolls the page

#### Scenario: A folded drawing holds a note

- **WHEN** a drawing line has a saved note and the drawing is folded
- **THEN** its fold control says it holds one note

### Requirement: A tap on an item offers a note

`review.html` SHALL have no annotate mode. Each Why paragraph, item text, and decision SHALL show a visible Note control while it has no note or draft; a tap or click on it SHALL open the note editor for that element. Once the element has a note or draft, its numbered pin or Draft pin SHALL take the Note control's place and open the editor. A mouse click without movement on that text, or a tap or click without movement on a line of a visual in the full-screen view, SHALL show an "Add note" option at that element; choosing it SHALL open the note editor for that element. A touch tap on text outside a control SHALL NOT show the option. A drag, a pinch, a wheel, or a tap on a link or control SHALL keep its normal action and SHALL NOT show the option. The editor SHALL appear beside the target on desktop without covering it, and SHALL dock on a phone. Saving SHALL attach a numbered pin to the element and add the note to the notes list. Saved notes SHALL persist across reloads on the same machine, keyed by change name, and SHALL NOT be written to any repository file. A copy action SHALL place on the clipboard a block whose first line is `/continue <change-name>`, whose second line is `Review notes from review.html (<n>):`, and which then carries one numbered line per saved note as `<location> · <element label> — <text>`, where the location is `#/why`, `#/<n>`, or `#/decisions/<n>`. A pin whose element no longer matches its saved label SHALL be shown as possibly moved. The Note control SHALL NOT be part of an element's label.

#### Scenario: Tap Note on a phone

- **WHEN** the reviewer taps the Note control of item 2 on a touch screen
- **THEN** the editor opens for item 2 with no second tap

#### Scenario: Tap an item

- **WHEN** the reviewer clicks the text of item 2 without moving
- **THEN** an "Add note" option appears at that text
- **AND** choosing it opens the editor for item 2

#### Scenario: Tap text on a phone

- **WHEN** the reviewer taps the text of item 2 on a touch screen
- **THEN** no "Add note" option appears and nothing else changes

#### Scenario: Scroll across an item

- **WHEN** the reviewer drags across item 2 to scroll
- **THEN** the page scrolls and no "Add note" option appears

#### Scenario: Note a drawing line

- **WHEN** the reviewer opens a drawing full screen, taps line 3, and chooses "Add note"
- **THEN** the full-screen view closes and the editor opens for that drawing line

#### Scenario: Use a zoom control

- **WHEN** the reviewer opens or folds a drawing, or taps a full-screen zoom button
- **THEN** that control acts and no "Add note" option appears

#### Scenario: Notes survive a reload

- **WHEN** the reviewer reloads the file
- **THEN** every saved note and pin is still there

#### Scenario: The notes are copied

- **WHEN** the reviewer activates Copy notes with two notes saved
- **THEN** the clipboard holds a block starting with `/continue <change-name>` and two numbered lines, each with a location, an element label, and the text

### Requirement: The scrolling page works on a phone

Below a phone-width breakpoint, `review.html` SHALL show its content at full width with no horizontal page overflow. Visuals SHALL fit their frames and zoom as defined above. The note editor SHALL dock at the bottom of the visible screen with a text field of at least 16px. The docked editor SHALL stay within the visible screen: its top SHALL NOT rise above the visible top, however little height the keyboard leaves, and its location line SHALL take one line. A bar with the saved-note count and Copy notes SHALL stay reachable while the reviewer scrolls. Text, long tokens, visuals, and note controls SHALL fit from 320px upward. With the editor and the keyboard open, the reviewer SHALL still be able to scroll to the relevant content and reach Save and Discard.

#### Scenario: Opened on a phone

- **WHEN** the file is opened at a phone width
- **THEN** the content fills the width, nothing scrolls sideways, and Copy notes is reachable

#### Scenario: A note on a phone

- **WHEN** the reviewer taps an element's Note control at phone width
- **THEN** the editor docks to the bottom of the screen and the keyboard does not zoom the page

#### Scenario: Little room above the keyboard

- **WHEN** the visible screen is only 260px tall while the reviewer edits a note
- **THEN** the whole editor, including its location line, Save, and Discard, is inside the visible screen

#### Scenario: Edit with the phone keyboard open

- **WHEN** a reviewer edits a note with the phone keyboard open
- **THEN** the draft text, Save, and Discard remain reachable
- **AND** the reviewer can scroll the review content without losing the draft

### Requirement: Each item's text and visual stay together

New review pages SHALL use normal vertical scrolling. Each item's number, text, and visual SHALL stay together in one group; the visual SHALL follow the text and span the item's full width rather than the text column. A token too wide for its column — a path, an identifier, a URL — SHALL wrap in text rather than be clipped or hidden, at every width. A visual SHALL never widen the page. Short content SHALL NOT require an artificial screen-height blank area.

#### Scenario: A bullet names a long path

- **WHEN** a What Changes item contains a path wider than its column
- **THEN** the path wraps onto the next line and every character stays readable

#### Scenario: A short item

- **WHEN** a reviewer reads a short item with a small drawing
- **THEN** its text and drawing stay adjacent with no reserved blank area below

#### Scenario: A drawing uses the item's width

- **WHEN** a reviewer opens an item's drawing
- **THEN** the drawing's frame is as wide as the item, not indented under the item number

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-26

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 38100 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-26-phone-friendly-review</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-26-phone-friendly-review">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-26-phone-friendly-review</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The review page is hard to use on an iPhone. Adding a note takes two taps, and the second one is easy to miss. Drawings are squeezed into a narrow column. Dragging a zoomed drawing opens the Paseo sidebar instead of moving the drawing. When the keyboard opens, the top of the note box is cut off.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A Note button on everything you can comment on.</b> Every paragraph, item, and decision shows a small &quot;Note&quot; button. One tap opens the note box. Once a note exists, its number takes the button's place. On a computer, clicking the text still offers &quot;Add note&quot; as before.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">│ 2  The wiki says each thing      │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│    once. About 3,000 words go.   │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│                         [+ Note] │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">├──────────────────────────────────┤</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│ ▸ Show drawing                   │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Drawings fold away and use the full width.</b> Each drawing starts folded under its item as a &quot;Show drawing&quot; row. Opened, it spans the whole card and scrolls with the page, with no zoom buttons in the way. The row says how many notes sit on the drawing, so a folded note is never lost.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Tap a drawing to see it full screen.</b> The drawing fills the screen, bigger than on the page. Pinch or use + and − to zoom, and move it with your finger, the way you scroll any page. Tap a line to note it. Close takes you back where you were.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">│ Fit · 120%    [−] [Fit] [+] Close│</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">├──────────────────────────────────┤</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│ before            after          │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ ship ── rule      ship ─┐        │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│ save ── rule      save ─┼▶ one   │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">│ apply ─ rule      apply ┘  rule  │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">│                                  │</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">│   drag to move · pinch to zoom   │</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Moving a drawing no longer opens the sidebar.</b> The full-screen view moves the drawing with the phone's own scrolling, so the app should no longer mistake your drag for a swipe. This needs a check on a real iPhone.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The note box always fits above the keyboard.</b> It is shorter: the &quot;where&quot; line is one line, and the buttons sit in one row. It never rises past the top of the visible screen, however little room the keyboard leaves.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> No change to what gets copied, how notes are saved, or the page's order. Already-shipped review pages stay as they are. No change to the Paseo app itself.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked how a phone tap should start a note → chose a visible Note button on each item, paragraph, and decision.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked how drawings should show → chose folded by default, full width when opened, and a tap for full screen with zoom.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: zoom and drag happen only in the full-screen view, using the phone's native scrolling, because a JavaScript-driven drag lets the host app read the gesture as a sidebar swipe.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: notes on single drawing lines stay, made by tapping a line in the full-screen view, and existing note locations are unchanged, because saved notes must stay attached after a rebuild.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: clicking text with a mouse still shows &quot;Add note&quot;, and a touch tap on text does nothing extra, because the Note button now covers touch and a stray tap while scrolling should do nothing.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the docked note box is placed from the top of the visible screen and capped at its height, because placing it from the bottom pushed its top under the host's header when the keyboard was open.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the Discard draft button is renamed Discard to keep the buttons on one row at 320px, because the requirement names the action, not the label.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: this ships as a minor release (planned as 24.1.0), a new feature with no breaking change.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Changed during apply: the Full screen button sits on the drawing's fold row, not over the drawing, because over the drawing it hid the top-right characters. The README screenshot is retaken with the new kit from the <code>lighten-the-loop</code> proposal.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Tested locally with a borrowed Playwright 1.61 and Chromium: <code>node --test scripts/tests/*.test.mjs</code> 259 pass, <code>app/review/review.test.mjs</code> 9 pass. A 260px-tall screen keeps the whole note box visible. Not tested: a real iPhone inside the Paseo app, so whether a drag in the full-screen view still opens Paseo's sidebar is for the user to check on their next review page.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Distilled facts before the archive: the store holds no facts for this change or branch yet, so no repeatable fact.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Archive checkpoint: saved the archived change with the kit, builder, tests, docs, and 24.1.0 release for CI.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Merged main (25.0.0, 24.0.2) into the branch before the merge; CHANGELOG and VERSION conflicted, so this release is renumbered 25.1.0.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Merged main again (another 25.1.0 landed first), so this release is renumbered 25.2.0.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item' };
    return { at: '#/decisions/' + m[2], kind: 'decision' };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as a /continue instruction ──
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from review.html (' + data.notes.length + '):'];
    data.notes.forEach(function (n, i) { lines.push((i + 1) + '. ' + where(n.id).at + ' · ' + n.label + ' — ' + n.text.replace(/\s*\n\s*/g, ' ')); });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
