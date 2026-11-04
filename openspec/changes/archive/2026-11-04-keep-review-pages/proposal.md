# Proposal

**Status:** ready-to-ship
**Branch:** maniacal-chicken
**Open questions:** none

## Why

A review page goes away soon after you answer it: its words are wiped at once, and the rest a day later. You can reach a page only by its link or a board task, and board tasks need the daily. So you can't look back at what a plan said, or what you answered, and someone who doesn't use the daily has no list of pages at all.

## What Changes

- **The Inbox gets a Reviews list.** Tap *Reviews* beside *Day* and *Week*. Pages that wait on you sit on top, with the time left. Every answered or closed page sits below under *Archive*, newest first, with *Answered* or *No answer* and its time. A search box finds a page by its title. Anyone signed in to the company app sees their own pages there, with or without the daily.
  ```picture
  Before: pictures/before-week.png
  After: pictures/after-reviews.png
  After, a search: pictures/after-search.png
  Try it: https://keep-review-pages-wongstack-staging.matthewwong525.workers.dev/apps/inbox/?view=reviews
  ```
- **A review page is never deleted.** A plan's page, a built preview's page, and a page for other work all stay in the Archive for good. A question, an approval, a private link, and a hidden watch item still clear out a day after they close, as today.
- **An archived page opens read-only.** It opens in the same view, with its buttons and notes off. A line above it says what you answered and when, by the page's own button name, such as *Build and publish, 3 Nov 14:02* with the notes you sent, or *No answer* when it ran out of time. *Back* returns to the Reviews list.
  ```picture
  After: pictures/after-archived.png
  Try it: https://keep-review-pages-wongstack-staging.matthewwong525.workers.dev/apps/inbox/?item=demo
  ```
- **A waiting page still closes after 24 hours, into the Archive.** Say *new link* to answer it again: the new link is a new entry in the list. Each answered version keeps its own entry, as a plan rebuilt after notes already comes at a new link.
  ```mermaid
  flowchart LR
    open["Waiting"] -->|"you answer"| arch["Archive"]
    open -->|"24 hours pass"| arch
    arch -->|"new link"| new["new Waiting entry"]
  ```
- **Pages already emptied before this change are removed.** Their words were wiped when they closed, so an empty entry would only clutter the Archive. They go a day after they closed, as today. This can't be undone, but nothing readable is lost.

Non-goals: no move of pictures to file storage (pages stay at most 512 KB each); no list of questions or approvals; no delete button; no change to how the daily's check-ins run (the other part of this request, workspace *chilly-lionfish*).

## Capabilities

### New Capabilities

### Modified Capabilities
- `inbox`: a closed review page stays, read-only, in a new Reviews list with its answer; other items still clear out; the list is open to everyone signed in.

## Impact

- `app/worker/apps/inbox/`: `item-close.ts` keeps a plan's body; `store.ts` `prune` skips plan items; a new `reviews.ts` route (`GET reviews`) lists waiting and archived pages with a title search and paging; `item.ts` opens a closed plan read-only with its sent answers; `api.ts` gains the route.
- `schema/migrations/`: one additive migration of indexes, so no list, check-in or clean-up reads past a stored page; `schema/seed.sql` adds sample review pages, waiting and archived, with their taps.
- `app/src/apps/inbox/`: a new `Reviews.tsx`; `App.tsx` routes `?view=reviews`; the Day/Week toggle gains *Reviews*; `PlanView.tsx` shows an archived page read-only with its answer line; `SearchField` takes a label.
- `.agents/skills/plan/references/review-kit.html`: a read-only greeting hides the bar, *+ Note* and OK.
- `wiki/development/reply-links.md`, `wiki/review-pages.md`, `CHANGELOG.md` (a `minor` entry).

## Decision log

- **2026-11-03** — Asked whether review pages are ever deleted → chose never: "they should just stay there available to click archived in the future".
- **2026-11-03** — Asked how the list is laid out → chose Waiting on top, Archive below, newest first, with a search by title, for everyone signed in, daily or not.
- **2026-11-03** — Asked what an archived page shows → chose the same view, read-only, with what was answered and when.
- **2026-11-03** — Asked whether a waiting page still closes after 24 hours → chose yes, and closing now means archived; *new link* answers it again.
- **2026-11-03** — Asked whether each answered version keeps its own entry → chose yes, as today's new link after notes already gives.
- **2026-11-03** — Asked where pages are stored → chose D1 as today, at most 512 KB each; file storage for pictures is a later option.
- **2026-11-03** — Assumed: *Reviews* is a third choice beside *Day* and *Week*, and the Inbox still opens on the week, because one toggle is the smallest change and the spec says the Inbox opens on the week.
- **2026-11-03** — Assumed: a review page is an item of kind `plan`, because every review page (plan, preview, other work) opens in the Inbox as that kind, and the hidden watch item and questions use other kinds.
- **2026-11-03** — Assumed: pages emptied by older code are removed by the clean-up each check-in runs, through a partial index of empty plan pages, not by a migration, because migrations must stay additive, and a plain filter would read every kept page at each check-in.
- **2026-11-03** — Assumed: the Archive shows 50 pages and a *Show more* button, and search runs in the app, because the Archive grows for good.
- **2026-11-03** — Assumed: the answer line shows every answer that reached the chat, with its time and the page's own button name, and *No answer* with the closing time when none did, because notes and a build can both arrive on one page, and `publish` reads *Build and publish* on a plan but *Publish* on a preview.
- **2026-11-03** — Assumed: a list row says only *Answered* or *No answer* with the time, because the button names live in the page, and the list never reads a page.
- **2026-11-03** — Assumed: the page hides its own controls on a read-only greeting, not the app hiding them with injected styles, because the app would then depend on the page's class names, which change often; an older page keeps its *Send notes*, and the Inbox refuses that tap as closed.
- **2026-11-03** — Assumed: the prototype pictures are at desktop width, because the browser tool has no phone size; the build's checks cover phone width.
- **2026-11-04** — Built inside /ship. The second look found two read-only gaps in the review page (a test that could not fail, and the drawing view still offering notes); both fixed. Local checks pass; a timeout in the access app's welcome test passed on rerun.
- **2026-11-04** — Walked the preview at phone width as a signed-in person, with pages put through the app's own routes, because the sample pages belong to Fay: the list, a search and its no-match line, an archived page read-only with its answer line and no buttons, *Back* to the list, and a waiting page whose notes, once delivered, moved it to the Archive with *Answered*. A page built before this change still shows its own note buttons, as planned.
- **2026-11-04** — Archived inside /ship as release 45.5.0, after every task was checked.
