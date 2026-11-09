# Simpler review cards: the words set the picture's height

**Status:** ready-to-ship
**Branch:** lean-rat
**Open questions:** none

## Why

On a review page, a card's picture grows to its full height: a tall phone picture is about 820 px at 1280 px wide, beside words only about 250 px tall. You scroll past a long picture to reach the next card, and the card is mostly empty space on the left. Design tools like Figma and Frame.io shrink the picture to fit and let you open it big; this plan does the same. A card also has two buttons that open the same note, words cut off behind *More*, a *Before and after* button that is hard to read, a *Live* tab that shows the same sample as the *After* picture, and *Phone* and *Computer* buttons on the card that a phone doesn't get. On a phone the picture fills the screen.

## What Changes

- **On a computer, a card shows all its pictures side by side, as tall as its words.** Each picture is labelled, such as *Before* and *After*, and there are no tabs. The pictures are never shorter than about 420 px, so a phone picture stays readable, and never taller than the window. Each one shrinks whole to fit and is never cut. Card 1 in the sample shows it.
  ```picture
  Before, computer: pictures/before-computer.png
  After, computer: pictures/after-computer.png
  ```
  ```live After, sample
  folder: prototypes/card
  height: 1200
  ```
- **A click on a picture opens it full screen.** The labels sit in a row on top, and *Close* sits alone at the top right, so it is easy to find. Tap a label, swipe, or use the arrow keys to see the next. A bar at the bottom holds what changes the picture: *Phone* and *Computer*, only for a page or a sample you can click, where the width matters, and *Try it*, which opens an app screen's sample in a new browser tab. A tap on a spot notes it, and a numbered dot then shows on the card's picture as well. The *Full screen*, *Before and after*, and *All* buttons go. A card has two buttons, *OK* and *Note*, for a change or a question; *Change* and the *+ Note* inside the words go, because both opened the same note.
  ```picture
  Full screen, computer: pictures/after-full.png
  ```
- **On a phone, a card shows its words and a row of small pictures.** These are the same pictures, smaller; a tap opens the same full screen. Long words fold, with *More* at the end of the words; *Less* folds them again. On a computer, all the words show, with no *More*.
  ```picture
  After, phone: pictures/after-phone.png
  After, phone, full screen: pictures/after-phone-full.png
  ```
- **A sample you can click is one of the pictures, such as *After*.** The card shows its top, and a click opens it full screen, where you can use it. There is no separate *Live* tab and no picture of the same sample. A plan for an app screen keeps its *After* pictures and *Try it* link, because its sample runs at a web address the review page can't open inside itself. Card 4 in the sample shows it: open *After* and tap *Add to cart*.
  ```picture
  After, a site: pictures/after-site.png
  ```
- **A whole page, such as an email, shows its top part.** You see the top at a size you can read, and a fade at the bottom tells you there is more. A click shows the whole page. Card 3 in the sample shows it, with a spot noted on *Version B*.
  ```picture
  Email, computer: pictures/after-email.png
  ```

The red line *Review script error: ResizeObserver loop…* that a page with a clickable sample can show goes away. It was a harmless browser notice: the page worked, but the line looked like a failure.

Selected words and the bottom bar work as they do today.

Non-goals: no zoom inside the card (full screen does that), and no app screen running inside the review page.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

### Modified Capabilities
- `review-pages`: a card shows all its pictures, drawings, ads, pages, and live cards side by side, labelled, with no tabs; on a wide screen they take their height from the card's words, between a floor and the window, and shrink whole to fit; on a phone they are small, under the words; a page or live card shows its top with a sign of more; a click opens one full screen, with every label to switch, a swipe and arrow keys, and *Phone* / *Computer* and *Try it* there; *Each card takes OK or Change* becomes *Each card takes OK or a note*; *Each ad gets a tab* goes; a live card and a whole designed page open full screen to be used.
- `ux-wireframes`: a long item folds its text behind *More*, at the end of its words, only on a narrow screen; a drawing opens full screen on a click; a spot note is placed full screen and its pin shows on the card's picture too; a screen's before and after sit side by side, with no control.

## Impact

- `.agents/skills/plan/references/review-kit.html`: the card view becomes a row of labelled parts, with no tab row and no tools row; its height (words height, clamped to 420 px and the window, at 900 px and wider); a fit by height as well as width for every part; a page or live part clipped to its top with a fade; below 900 px, the same parts as small pictures under the words; a click on a part opens the full-screen viewer, which gains the label row, swipe, arrow keys, and the *Phone* / *Computer* switch and *Try it* (moved from the card); a background tap no longer closes it.
- `review-kit.html` also: *Note* in place of *Change* and the card's *+ Note*; *More* at the end of the folded words, only below 900 px; spot pins drawn on the card's parts as well as full screen; the *Before and after* button and the live card's own tools row removed; the live card's resize watcher fits on the next frame, and the error line ignores the browser's *ResizeObserver loop* notice.
- `.agents/skills/plan/scripts/build-review.mjs`: no tab strip, no `withAll` *All* tab, and no `COMPARE` pair (`data-compare`); each tab becomes a labelled part. A `live` fence already takes its label from its info text (```` ```live After, sample ````), which this plan's own card 1 uses.
- `scripts/tests/review-browser.test.mjs` and the builder's tests: the new sizes at 1280 and 390 px, the parts side by side with no tabs, full screen from a click with its label row, swipe, arrow keys and width switch, a pin on the card after a spot note, the two buttons, *More* by width, a page part's fade, and a live *After* beside a *Before* picture.
- `wiki/review-pages.md`: [the card view](../../../wiki/review-pages.md#the-card-view), [OK and Change](../../../wiki/review-pages.md#ok-and-change) (renamed *OK and Note*; nothing else links its anchor), [notes on words and spots](../../../wiki/review-pages.md#notes-on-words-and-spots), [the card table](../../../wiki/review-pages.md#a-card-shows-the-closest-real-result) (a site's sample is its *After* picture), [the live card](../../../wiki/review-pages.md#the-live-card), [the ad card](../../../wiki/review-pages.md#the-ad-card), and [the page card](../../../wiki/review-pages.md#the-page-card) (side by side, no *All* tab).
- `CHANGELOG.md`: a minor entry.

## Decision log

- **2026-11-09** — Asked to look at good review pages before deciding → found that Figma, Frame.io, Chromatic, and GitHub shrink a picture to fit and open it big on a tap, that shop pages warn a cut picture must look cut, and that docs sites let the words set the length; none lets the picture set the card's length.
- **2026-11-09** — Asked how tall the view should be next to a card's words on a computer → chose as tall as the words, at least about 420 px and at most the window, with the whole picture shrunk to fit.
- **2026-11-09** — Asked how a whole page or live copy shows in the shorter view → chose its top at a readable size with a fade, *Full screen* to see all, and a live copy that scrolls inside.
- **2026-11-09** — Assumed: "the window" in the review page is the Inbox frame when the page opens there, because that frame fills the window under the Inbox's top bar.
- **2026-11-09** — Assumed: a live card in a view takes the view's height, and its `height:` line still sets the most it takes, because a live card scrolls inside like a real screen.
- **2026-11-09** — Assumed: the floor is 420 px, because that keeps a phone picture readable at 1280 px in the sample, and the build may tune it by a few pixels after the browser test.
- **2026-11-09** — Asked, from a chat note, why a card has both *+ Note* and *Change* → chose *OK* and *Note*: one button for a change or a question, with word and spot notes kept.
- **2026-11-09** — Asked what happens to *More* → chose to fold only on a phone; on a computer all the words show and the picture matches them.
- **2026-11-09** — Asked where a clickable sample goes → chose that it is the *After* tab, with one row of buttons for every tab and no separate *Live* tab.
- **2026-11-09** — Assumed: an app screen's plan keeps its *After* pictures and *Try it* link, because its sample runs at a web address, and the review page loads nothing from the web so it opens sealed in the Inbox.
- **2026-11-09** — Assumed: the notes keep their `Card #2` and `Change #2` names, because those name the card, not the button.
- **2026-11-09** — Assumed: the *Review script error: ResizeObserver loop…* line Matthew saw on this plan's page is fixed in this plan, because it comes from the live card's resize watcher, which this plan reworks, and the new height rule adds a watcher of the same kind.
- **2026-11-09** — Asked, from a chat note with a phone screenshot, that the picture be hidden by default on a phone because it is too much → a phone card shows its words first, with no view; this replaces screens-first-review's *view first on a phone*.
- **2026-11-09** — Asked, from the same note, why a short flow's view was so long on a phone → the sample set every phone view to 60% of the screen; a phone card now has no view, so the question goes away.
- **2026-11-09** — Asked, from a chat note, what the *Before and after* button is, since it seems confusing → chose "an All tab first rather than last": *All* leads the tab row and opens selected, and the button goes.
- **2026-11-09** — Asked, from the same note, about *Show picture*, which is not good to use → chose small pictures under the words on a phone; a tap opens one full screen, with the picture names on top and a swipe to the next.
- **2026-11-09** — Asked, from the same note, that *More* go at the end of the words, not beside *Show picture* → *More* ends the folded words, and *Less* ends them when open.
- **2026-11-09** — Asked, from the same note, whether only an email's page takes spot notes → answered that a spot note worked on every picture, but only in *Full screen*, and on an email in the card too; chose spot notes right in the card for every picture, drawing, ad, and page.
- **2026-11-09** — Assumed: a sample you can click takes no spot notes, because a tap on it must click the sample; *Note* covers it.
- **2026-11-09** — Assumed: a tap on the background in full screen does not close it, because that tap now notes a spot; *Close* and Escape close it.
- **2026-11-09** — Asked, from a chat note, that the *Phone* / *Computer* switch is in an odd place on the card and missing on a phone → chose to move it into full screen, shown only for a page or a sample you can click.
- **2026-11-09** — Asked, from the same note, that a computer show the same small pictures as a phone, in place of *All*, each opening full screen, with no *Full screen* button → the card shows every picture side by side at the words' height, and a click opens one full screen. This replaces the *All* tab first and the tabs on the card.
- **2026-11-09** — Assumed: the card has no tabs at all, because a click on a picture opens it, and full screen holds the row of labels to switch.
- **2026-11-09** — Assumed: a spot note is placed in full screen, not by a tap in the card, because a click in the card now opens the picture; its dot still shows on the card's picture, so the note stays visible where you chose it.
- **2026-11-09** — Assumed: *Try it* moves into full screen with *Phone* and *Computer*, so the card keeps only *OK* and *Note*.
- **2026-11-09** — Assumed: on a computer the arrow keys switch pictures in full screen, as a swipe does on a phone.
- **2026-11-09** — Asked, from a chat note, why *Try it* sat beside the labels and *Phone* / *Computer* beside *Close*, which made *Close* hard to find → *Close* sits alone at the top right, and *Phone* / *Computer* and *Try it* move to a bar at the bottom of full screen.
- **2026-11-09** — Assumed: pictures are numbered by part, so a spot note names `picture 2` for the second picture, because each part is its own note target now.
- **2026-11-09** — Assumed: a phone and a computer picture of one screen are two labelled parts, not one part with a switch, because full screen holds the only *Phone* / *Computer* switch, and that switch is for a page or a live card.
- **2026-11-09** — Assumed: parts show in the order the proposal writes them, with no rule that puts *After* first, because all parts show at once.
- **2026-11-09** — Assumed: the zoom buttons move to the bar at the bottom of full screen, so *Close* is the only button on top.
- **2026-11-09** — Assumed: a spot note works on a drawing, a sketch, a screen, and an ad too, measured on the whole part, so a spot note made before this change can show as possibly moved.
- **2026-11-09** — Assumed: on a phone the small pictures sit between the words and *OK* / *Note*, and on a computer *OK* / *Note* sit under the words, beside the pictures.
- **2026-11-09** — Assumed: a part on a computer stops shrinking at about 110 px wide, and the row then scrolls sideways, as task 1.3 says.
- **2026-11-09** — Assumed: when one card has two `Try it:` lines, in two picture fences, the card keeps the first and the build warns about the second, because a stop would break a plan that builds today.
- **2026-11-09** — Assumed: the `pictures: Top | a.png, b.png` example stays out of the drawings guide, because the guide is at its word limit, and the wiki page its `form` line links to still shows it.
- **2026-11-09** — Assumed: a click on a picture shows the whole picture full screen, where + zooms it, not the picture at full size, because full screen fits it first.
- **2026-11-09** — Archive checkpoint: built, reviewed twice (4 findings fixed or logged), archived, and saved from `lean-rat` for /ship as 51.7.0.
