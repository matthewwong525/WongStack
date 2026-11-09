# Tasks

## 0. Start

- [x] 0.1 Confirm *A smaller review bar with loading feedback* (`compact-review-actions`) is published, and start from the main branch with it; stop and report if it is not.

## 1. The card view in the review kit and builder

- [x] 1.1 In `build-review.mjs`, group each item's fences into one view: a tab per `picture` line label or per fence (label from the fence's info text after its language, else its kind); pair `, phone` / `, computer` labels into one tab; pick the first *After* / *Built* / *Preview* tab; keep `table` where it is today.
- [x] 1.2 In `review-kit.html`, add the card grid (words beside the view at 900 px and wider, view first below), the tab strip, *Before and after*, *Phone | Computer* for paired tabs, the wider What Changes list, and *More* / *Less* text folding by height; keep full screen, zoom, spot notes, note counts and OK / Change working per tab. Follow `prototypes/card/index.html` for the look.
- [x] 1.3 In `build-review.mjs`, warn on an item with a `screen` or `svg` fence, no `picture` fence, and no `No real picture:` line.
- [x] 1.4 In `preview-review.mjs`, write *Approved* / *Built* and *Live now* / *Preview* as tab labels.
- [x] 1.5 Add the `page` fence: read each version through the live card's inliner; stop on script, `on*` attributes, `javascript:` and web addresses other than links; keep links inert as `data-href`; draw it in a sealed frame with *Phone* / *Computer*, version tabs, *All*, and spot notes in percent of the whole page with the tab label.
- [x] 1.6 Make each `ad` fence its own tab with *All*; add the `pictures:` form question; move an item's `form` into the words column at 900 px and wider.
- [x] 1.7 Write tests: in `review-pictures.test.mjs`, the tab grouping, labels, first tab, paired widths and the sketch warning; in `review-browser.test.mjs`, the 1280 px side-by-side layout, the 390 px view-first layout with no sideways scroll, tab switching, *Before and after*, *More* with a note on folded words, a spot note placed from a second tab, a page card's version tabs, *All*, an inert link and a spot note naming the version, ad tabs, and a `pictures:` answer; in `review-pictures.test.mjs`, each input that stops a `page` fence (script, `on*`, `javascript:`, web picture, file outside the folder, size); in `preview-review.test.mjs`, the tab labels.
- [x] 1.8 Make a page card take a spot note inside the Inbox: draw each version in a `sandbox="allow-scripts"` frame, never `allow-same-origin`; add one fixed kit script to each page, allowed by its `sha256` hash in the page's policy, that posts the page's height (and answers a pointer point with the link under it); the kit takes a message only from its own page frames, clamps the height, sets the frame to full height, then adds the cover. Test it in the Inbox frame in `review-browser.test.mjs` (a spot note on version *B*) and in `review-pictures.test.mjs` (only the kit's script, its hash in the policy).
- [x] 1.9 Carry a `background="…"` picture in the inliner, and stop the build on a web address there; test both in `review-pictures.test.mjs`.
- [x] 1.10 Stop a page that is as tall as its frame from growing: the page's script adds the frame's height to each report and stays still when only the frame's height changed; the kit keeps a height only when measured 1 px tall, and measures again when a page grows past its frame. Test in `review-browser.test.mjs` that a page with `html,body{height:100%}` settles at its own height and stays there.

## 2. Real pictures in more plans

- [x] 2.1 Add `prototype.mjs serve <change>`: run the copy's dev server on a free port, wait for it, print `PROTOTYPE_URL=`, and stop it on exit.
- [x] 2.2 Write `prototype.test.mjs` cases for `serve`: the printed address, a copy that is missing, and a server that never answers.
- [x] 2.3 Update `.agents/skills/plan/SKILL.md`, `.agents/skills/plan/references/drawings.md`, `wiki/review-pages.md` and `wiki/ux-principles.md`: sample data for data the copy can't reach, `serve` when `upload` can't run, the `No real picture:` line, tab labels, the `page` fence and `pictures:` question (with a row in the card table of `wiki/review-pages.md`), and short card words with the detail after the first sentence.
- [x] 2.4 Make `prototype.mjs serve` stop the copy's app on exit, Ctrl-C, `SIGTERM` or `SIGHUP` while it still waits for the app to answer; test a Ctrl-C during the wait.

## 3. Release

- [x] 3.1 Add a minor entry to `CHANGELOG.md` for the new card layout, the whole-page card, ad tabs, the picture question and the local prototype run.

## 4. Final checks

- [x] 4.1 After all source and tests are written, run `node .github/scripts/checks.mjs --worktree` and fix what fails; record the results.
- [x] 4.2 Rebuild this change's review page and the archived `inbox-shows-chats` page with the new kit; look at both at 390 and 1280 px, and compare them with `prototypes/card/`.
- [x] 4.3 `/save`, then check the review page through the preview's Inbox at phone and computer width.
