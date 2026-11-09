# Tasks

## 1. The card view

- [x] 1.1 In `build-review.mjs`, stop writing a tab strip, the `withAll` *All* tab, and the `COMPARE` pair (`data-compare`); write each tab's content as a labelled part in one row, for pictures, drawings, ads, page versions, and live cards.
- [x] 1.2 In `review-kit.html`, at 900 px and wider, set each view's height from its card's `.words` (at least 420 px, at most the window less the bar), on load, resize, and a page frame's height report; remove tab switching, the compare button, and the view's tools row with its *Full screen* button. Follow `prototypes/card/index.html` for the look.
- [x] 1.3 Shrink each part whole to fit the row by height and width (drop the picture's `max-height:40em` cap; `fit()` takes the smaller fit for a drawing); past about 110 px a part stops shrinking and the row scrolls sideways.
- [x] 1.4 Clip a page or live part to its top at its first width, with a fade when it is taller; make a live part inert in the card, and keep a live card's frame no taller than its space.
- [x] 1.5 Make a click, a tap, or Enter on a part open the full-screen viewer on it; give the viewer a top bar of labels with *Close* alone at the right, a swipe, and the arrow keys; move *Phone* / *Computer* (one switch, shown only for a page or live part, shrunk to fit a narrow screen) and *Try it* into a foot bar; a background tap no longer closes it, and Escape still does.
- [x] 1.6 Place spot notes full screen and draw each pin on the card's part and the phone's small picture too; a live part takes no spot.
- [x] 1.7 Below 900 px, hide the view and add a row of small labelled pictures in the card's words, before *OK* and *Note*, one per part; a tap opens it full screen.
- [x] 1.8 Replace *Change* with *Note* in the verdict row and drop the `+ Note` an item's words get; keep it on Why paragraphs, decisions, table rows, and drawing lines.
- [x] 1.9 Fold an item's words only below 900 px, with *More* inline at the end of the shown words and *Less* at the end when open; show them whole at 900 px and wider, re-measured when the width crosses 900 px.
- [x] 1.10 Run each resize watcher's work on the next frame, and make the error line skip the browser's *ResizeObserver loop* notice.
- [x] 1.11 Write tests in `scripts/tests/review-browser.test.mjs`: at 1280×800, a card with short words and a 1600 px phone picture has pictures about 420 px tall, the whole picture inside, and a click opens it whole full screen, where + zooms it; long words make the pictures as tall as the window; a card with *Before* and *After* shows both side by side, labelled, with no tabs, no *All*, no *Before and after*, and no *Full screen* button; a page part shows the fade; full screen shows every label, the arrow keys switch, *Phone* / *Computer* show in the foot for a page and not for a picture, *Close* is the only button in the top bar, and a background click keeps it open; a spot noted full screen pins on the card's part, and a live part takes none; a card shows *OK* and *Note* and no `+ Note` in its words; a six-line item shows whole with no *More*. At 390×800: no view, small pictures named for each part, a tap opens full screen, a swipe switches; a six-line item folds with *More* at the end of its words; the page has no sideways scroll. Resizing a page with a live card from 1280 to 900 to 390 px shows no *Review script error*. In the builder's tests: no tab strip, no *All*, no `data-compare`, and a ```` ```live After ```` beside a `Before:` picture gives two labelled parts.
- [x] 1.12 Size a live part on a computer like a page part, by its top screen, with the fade when taller, not shrunk whole; test that a tall live part at 1280 px shows the fade at a readable width.
- [x] 1.13 Start a full-screen swipe only on the shown part, so a swipe along the label row keeps the part; test it with touch events.
- [x] 1.14 When one card has two `Try it:` lines in two `picture` fences, keep the first and print a warning naming the item and the dropped line; test it in the builder's tests.
- [x] 1.15 Reword the spec scenario *A tall phone picture beside short words* to say a click shows the whole picture full screen, where + zooms it, and test that at 1280 px.

## 2. Words

- [x] 2.1 Update `wiki/review-pages.md`: [the card view](../../../wiki/review-pages.md#the-card-view) (pictures side by side at the words' height, shrunk whole, a page shows its top, a click opens full screen with the labels, *Phone* / *Computer*, and *Try it*; on a phone the words with small pictures, and *More* at the end of the words), rename *OK and Change* to *OK and Note*, say spot notes are placed full screen and show on the card in [notes on words and spots](../../../wiki/review-pages.md#notes-on-words-and-spots), drop tabs and *All* from [the ad card](../../../wiki/review-pages.md#the-ad-card) and [the page card](../../../wiki/review-pages.md#the-page-card), and say a site's sample is its *After* picture in the card table and [the live card](../../../wiki/review-pages.md#the-live-card). Update `.agents/skills/plan/references/drawings.md`'s `live` line for the label, and check `node scripts/measure-context.mjs --check`.
- [x] 2.2 Add a `## Next (minor) — Simpler review cards: the words set the picture's height` entry to `CHANGELOG.md`, with **Updating.** *Nothing to do. Rebuild an open plan's page to see it.*

## 3. Checks

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree`, the builder's tests, and the review browser tests; fix what fails.
