## Context

The card view from screens-first-review (v51.6.0) puts the words on the left and a tabbed view on the right at 900 px and wider. The grid row takes the taller of the two, and the view takes its picture's full height: in `review-kit.html`, `.art.photo img` caps at `max-height:40em`, and the kit's `fit()` sizes a drawing by width alone. A page card's frame is set to its page's full height, and a live card's frame to its `height:` line. With the words folded behind *More*, at 1280 px the published sample measured words 246 px against a view 818 px tall.

The Inbox shows the review page in a frame that fills the window under its top bar (`app/src/apps/inbox/PlanView.tsx`, `h-[calc(100dvh-5.5rem)]`), so the page's own window height is the space a person sees there too.

## Goals / Non-Goals

**Goals:** on a wide screen, a card's pictures sit side by side at the height of its words, between a floor and the window, each shrunk whole; a page or live card shows its top with a sign of more; a phone shows the same pictures small under the words; a click opens one full screen, which holds every control that matters only there (labels to switch, *Phone* / *Computer*, *Try it*, spot notes). A card has only *OK* and *Note*; words fold only on a phone, with *More* at their end.

**Non-Goals:** zoom inside the card; a change to the page card's or live card's full-size rendering; an app screen running inside the review page.

## Decisions

- **No tabs: every part side by side.** The builder stops writing a tab strip, the `withAll` *All* tab, and the `COMPARE` pair (`data-compare`); each tab's content becomes a labelled part (`figure` + `figcaption`) in one `.stage` row. The kit drops `show(c, picked)`'s tab switching, the compare button, and the view's tools row. A part is a button-like target (`role="button"`, `tabindex="0"`, Enter opens), so the keyboard reaches it.
  - Alternative: keep tabs and add a click-to-open. Rejected: the person asked that the small pictures replace *All*, and full screen already switches between them.
- **One height rule, set by the kit's script.** On each layout pass (load, resize, a page frame's height report), measure `.words` and set the view's height at 900 px and wider: `clamp(420, words, innerHeight - bar - margin)`. CSS alone can't do it: the grid row would grow to the view's content. A `ResizeObserver` on `.words` catches the fold's own measure.
- **Shrink by height as well as width.** Each part is a flex item with a basis by kind (picture about 320 px, drawing about 460 px, page about 300 px, a site at its scaled width) and `min-height:0`; a picture is `height:100%; width:auto; object-fit:contain`; `fit(d)` takes the smaller of the width and height fit for a drawing. Drop the picture's `max-height:40em` cap. Past about 110 px a part stops shrinking and the row scrolls sideways.
- **A page or live part shows its top.** It sits in a `.clip` (`overflow:hidden`) at its first width's scale; when it is taller than the clip, the clip gets a `tall` class: a bottom fade. A live part in the card is inert (`pointer-events:none` on its frame), so a click opens it.
- **Full screen holds every tab.** A click on a part, or a small picture on a phone, opens the viewer on it. The viewer's top bar holds only the row of labels and *Close*, at the far right; a swipe of more than about 60 px and the arrow keys go to the next or last part. A foot bar holds the hint, then *Phone* / *Computer* as one switch (from the card's old `.sizes`, shown only for a page or live part, shrunk to fit a narrower screen) and *Try it*, so nothing crowds *Close*. A background tap no longer closes the viewer, since that tap notes a spot; Escape and *Close* do.
- **Spot notes full screen, pins everywhere.** A spot stays in percent of its whole part (not the clip), keyed by part, so its pin draws on the card's part, the phone's small picture, and full screen. A live part takes no spot: its taps go to the sample.
- **Phone: words, then small pictures.** Below 900 px `.view` is hidden. The kit adds a `.thumbs` row in `.words`, before the verdict: one button per part, a clone scaled to about 84 px wide, with its label under it. A live part's small picture is a still clone at its first width.
- **One note button.** The verdict row becomes *OK* + *Note* (`data-open` on the item, as *Change* had); the `+ Note` the kit adds to an item's `.text` goes. Why paragraphs, decisions, table rows, and drawing lines keep their `+ Note`, since they have no verdict row. The note's label stays `Card #n` / `Change #n`.
- **More by width, at the end of the words.** `measure()` skips folding at 900 px and wider (a `matchMedia` check, re-run on change). Below that, the *More* button goes inline at the end of the last shown line, and moves to the end of the last paragraph as *Less* when open. A note on folded words still unfolds them.
- **No resize loop.** The live card's `ResizeObserver` (`review-kit.html`, `fitCard` from the observer) sets the stage's height inside its own callback; when that toggles a scrollbar, the width changes again, and the browser fires a window `error` with *ResizeObserver loop completed with undelivered notifications* (line 0), which the kit's error handler prints in red. Every observer this change adds or keeps does its work in `requestAnimationFrame`, and the error handler skips that one message, since the browser sends it with no script fault (`e.error` is null).

## Risks / Trade-offs

- A drawing with very wide and very tall parts gets small → a click opens it full screen at fit with zoom, as today.
- A card with many pictures, such as six phone screens, makes each narrow → past about 110 px each the row scrolls sideways, and full screen shows each big.
- The floor (420 px) can exceed a short window, such as a laptop with a docked browser → the window cap wins, so the view never needs a scroll to see whole.
- Measuring on resize can loop if the view's height changes the words' width → the grid's column widths are fixed by the template, not by the view's height, so it can't.

## UX

### Use-case brief
The owner reviews a plan on a computer or a phone, card by card: read the short words, glance at the pictures, OK or Note. The common case is a quick glance; the edge case is checking a detail or trying a sample, which full screen serves. Most plans have 2–6 cards; a person opens several plans a day. Mirrors design review tools (Figma, Frame.io): the picture fits the space, and a click opens it big.

### Flow
Open the page → each card shows its words and, beside them, every picture side by side at the words' height → glance → click one to see it big, switch with the labels or arrow keys, tap a spot to note it, close → OK or Note → next card. On a phone, each card shows its words and a row of small pictures: read, tap one to see it full screen, swipe through, close, OK or Note.

### Hierarchy
The words and the pictures share the card's height; *OK* and *Note* are the card's only two buttons, so nothing on the card repeats. Every other control lives full screen, where it does something: the labels and *Close* on top, and what changes the picture (*Phone* / *Computer*, *Try it*) at the bottom. A phone and a computer show the same pictures, at two sizes.

### Review
`review.html` in this change. What Changes item 1 is the card on a computer, with the clickable sample as its own part; item 2 full screen; item 3 the phone card and its full screen; item 4 a site sample as *After*; item 5 the email card with a spot.

### Components
The kit's existing card, picture frames, and full-screen viewer. New: the height rule, the height fit, the page part's fade, the phone's small pictures, and the viewer's label row, swipe, arrow keys, and width switch. Removed: the tab strip, the *All* tab, *Before and after*, the view's tools row and *Full screen* button, *Change*, a card's `+ Note`, *More* on a computer, and the live card's own tools row.
