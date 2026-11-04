# Tasks

## 1. Database

- [x] 1.1 Add one additive migration in `schema/migrations/` with the three indexes from the design: the Reviews list's covering index, the open-items covering index, and the partial index of emptied plan pages.
- [x] 1.2 Add sample rows to `schema/seed.sql` for Fay: two waiting review pages, three archived ones (one answered with notes, one with *Build it*, one with no answer), each a short page from the kit, with their `sent` taps.
- [x] 1.3 Add `reviews-migration.test.ts`: apply every migration to `node:sqlite`, then `EXPLAIN QUERY PLAN` each inbox statement that filters `inbox_items` (`items`, `reviews`, `settleTaps`, `prune`, `item`) and fail on a `SCAN` of `inbox_items` without a covering index.

## 2. Server routes

- [x] 2.1 `item-close.ts`: keep `body` for `kind = 'plan'`; empty it for other kinds.
- [x] 2.2 `store.ts` `prune`: delete only `kind <> 'plan'` items and their taps after a day; add the delete of emptied plan pages (and their taps) that matches the partial index's `WHERE` exactly.
- [x] 2.3 Add `reviews.ts` (`GET reviews` with `q` and `before`): waiting and archived `plan` items, 50 archived a page, `more`, and `answered`; register it in `api.ts`.
- [x] 2.4 `item.ts`: open a closed or expired `plan` item with `archived: { endedAt, answers }`; keep refusing other closed kinds with 410.
- [x] 2.5 Tests in `api.test.ts`: a closed plan keeps its body and taps past a day while an approval goes; an emptied old plan goes after a day; `reviews` lists only the caller's unhidden plan pages, waiting before archived, newest first, with search (a `%` matches as text) and paging; a closed plan opens with its answers and still refuses a tap with 410.

## 3. Inbox screens

- [x] 3.1 Run `prototype.mjs finish keep-review-pages` if the copy is still there, and read `.scratch/keep-review-pages-prototype.diff` before building the screens.
- [x] 3.2 `api.ts` (client): `readReviews(q, before)` and the `archived` field on an item.
- [x] 3.3 Add `Reviews.tsx`: the view toggle, the search field labelled *Search reviews by title*, *Waiting* cards with the time left, *Archive* lines with *Answered* or *No answer* and the time, *Show more*, loading, empty, no-match and failed states; route `?view=reviews` in `App.tsx`; add *Reviews* to the Day/Week toggle in `week/Parts.tsx`; give `SearchField` a `label`.
- [x] 3.4 `PlanView.tsx`: on an archived item, greet the frame with `actions: []` and `readOnly: true`, show an `AnswerLine` above the frame (the page's own button label, the time, the notes; or *No answer*), answer any frame tap with `closed`, and start no line or poll. *Back* and `inbox:back` return to `?view=reviews` when `from=reviews`.
- [x] 3.5 Tests: `Reviews.test.tsx` (both parts, search, *Show more*, empty and failed states, a row opens its page with `from=reviews`); `PlanView.test.tsx` (an archived page shows its answer line, sends no tap, greets read-only, and *Back* returns to the list).

## 4. Review page

- [x] 4.1 `review-kit.html`: on a `readOnly` greeting, hide the bar, every *+ Note* and OK, and the hint line.
- [x] 4.2 A case in `scripts/tests/review-browser.test.mjs`: a read-only greeting shows no bar, note or OK button.

## 5. Docs and release

- [x] 5.1 `wiki/development/reply-links.md` *In your inbox first*: the Reviews list, a closed page moves to the Archive and stays, read-only with its answer; other items still go after a day.
- [x] 5.2 `wiki/review-pages.md`: one line that every review page stays in the Inbox's Archive, linking the reply-links section.
- [x] 5.3 `CHANGELOG.md`: a `## Next (minor) — Review pages kept in the Inbox` entry, with an **Updating.** note that the app's database gets new indexes on its next publish and nothing else to do.

## 6. Verification

- [x] 6.1 Run `node .github/scripts/checks.mjs --worktree` and fix what it finds.
- [ ] 6.2 `/save`, then on the preview with seed data: open *Reviews*, search, open an archived page (read-only, answer line, no buttons), and open a waiting one and send notes; it moves to the Archive with *Answered*.
