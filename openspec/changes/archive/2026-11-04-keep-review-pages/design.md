# Design

## Context

Every review page (a plan's, a built preview's, one for other work) is an `inbox_items` row of kind `plan`, put by [`reply-link.mjs`](../../../.agents/skills/hand-over/scripts/reply-link.mjs) `openInboxItem`. Rows are keyed by `(installation_id, email, id)`, so a person only ever reads their own.

Today a page goes in two steps:

- [`item-close.ts`](../../../app/worker/apps/inbox/item-close.ts) sets `closed_at` and `body = ''`.
- [`store.ts`](../../../app/worker/apps/inbox/store.ts) `prune`, run at each check-in, deletes items closed over `KEEP_MS` (a day) ago, with their taps.

An item whose `closes_at` passes without a close stays open-but-expired until the computer closes it. [`openItem`](../../../app/worker/apps/inbox/store.ts) refuses both closed and expired items with 410, so [`item.ts`](../../../app/worker/apps/inbox/item.ts) can't open them and [`tap.ts`](../../../app/worker/apps/inbox/tap.ts) can't queue on them. [`App.tsx`](../../../app/src/apps/inbox/App.tsx) shows [`PlanView`](../../../app/src/apps/inbox/PlanView.tsx) at `?item=` and the week board otherwise; no screen lists pages.

The table puts `body` (up to 512 KB) before `actions`, `version`, `created_at`, `closes_at`, `closed_at` and `hidden`. SQLite reads a column past an overflowing value by walking that value's overflow pages. Today few rows hold a body for long; once every page is kept, any query that filters on a later column without an index walks every kept page.

## Goals / Non-Goals

**Goals:**

- Keep each review page's body and taps for good; other kinds keep today's day-long clean-up.
- One list of the person's pages, waiting and archived, searchable by title, for anyone signed in.
- An archived page opens read-only, with what reached the chat and when.
- No list, check-in, clean-up or tap reads a kept page it doesn't show.

**Non-Goals:**

- Pictures in file storage; a delete button; questions or approvals in the list; changes to the computer's helper.

## Decisions

### Keep a plan's body on close, and skip it in the clean-up

`item-close` keeps `body` when `kind = 'plan'` and empties it for any other kind. `prune` deletes only `kind <> 'plan'` items (and their taps). A tap on a kept page keeps its text: it is the answer the archive shows.

Rejected: a separate `kept` column, or copying pages into a new table. Kind already names a review page, and every review page uses it (Assumed in the proposal).

### Remove pages older code emptied, through a partial index

Plan rows closed before this change have `body = ''`. `prune` gains one more pair of deletes: `kind = 'plan' AND body = '' AND closed_at < cutoff`, with their taps. A partial index `ON inbox_items(installation_id, email, closed_at) WHERE kind = 'plan' AND body = ''` holds only those rows, so the delete never reads a kept body. The terms must match the index's `WHERE` exactly for SQLite to use it; a test checks the plan.

Rejected: a `DELETE` in a migration. [D1 migrations stay additive](../../../wiki/stack/d1-pipeline.md#timestamp-migrations-additive-and-order-independent).

### Indexes so no query walks a kept page

One additive migration adds covering indexes whose columns answer each filter without touching the table row:

- the Reviews list and its search: `(installation_id, email, kind, created_at, closed_at, closes_at, hidden, id, title, workspace)`;
- open items, `settleTaps`' closed-or-expired subquery, and `prune`: `(installation_id, email, closed_at, closes_at, kind, hidden, id)`;
- the empty-page partial index above.

A test in the [migration tests' pattern](../../../app/worker/apps/inbox/link-migration.test.ts) applies every migration to `node:sqlite` and runs `EXPLAIN QUERY PLAN` on each route's statement. It fails on a `SCAN` of `inbox_items` without a covering index. `items`' own `SELECT` still reads `actions` and `version` for the rows it returns, which are only the open ones.

### `GET reviews`: waiting and archived, in one route

A new `reviews.ts` returns `{ waiting, archived, more }`:

- `waiting`: open, unexpired, unhidden `plan` items, newest first.
- `archived`: unhidden `plan` items with `closed_at IS NOT NULL OR closes_at <= now`, newest by `created_at`, then `id`; 50 a page. `before=<createdAt>:<id>` reads the next page.
- each row: `id, title, workspace, createdAt, closesAt, endedAt` (`closed_at`, else `closes_at`), and `answered`: whether any tap on it is `sent`.
- `q`: words matched in `title` with `LIKE … ESCAPE`, so `%` and `_` match as text.

`settleTaps` runs first, as in `items`. The route is an `inboxAction`, so only the signed-in person's rows answer.

### Open a closed page read-only

`item.ts` keeps refusing a closed or expired item of any other kind. For a `plan`, it returns the item with `archived: { endedAt, answers }`, where `answers` are its `sent` taps, oldest first, each `{ action, text, at }` (`answered_at`). `tap.ts` is unchanged: `openItem` still refuses a tap on it with 410.

`PlanView` on an archived item:

- greets the frame with `actions: []` and `readOnly: true`, and starts no line, poll or `TapLine`;
- shows an answer line above the frame: one line per answer, `Notes sent` for `send`, else the page's own button label from its `#ready` `data-actions` (falling back to `label(action)`), with the time, and the notes text; or `No answer` with `endedAt`;
- answers any `inbox:tap` from the frame with `inbox:result` `closed`, and ignores `inbox:notes-set`.

The [review kit](../../../.agents/skills/plan/references/review-kit.html) on a `readOnly` greeting hides its bar, every *+ Note*, and OK. An older page ignores the flag; its *Send notes* tap gets `closed`, so it copies the notes and says the link has closed.

Rejected: the app injecting a style that hides the controls. The app would depend on the kit's class names, which `compact-review-actions` (another workspace) is changing now.

### Back returns where you came from

A Reviews row links `?item=<id>&from=reviews`. `PlanView`'s *Back* and the page's `inbox:back` go to `?view=reviews` when `from=reviews`, else to the week, as today.

### Cost

Every page stays in D1, at most 512 KB each. A page a day for a year is under 200 MB a person, inside the 10 GB a D1 database holds on the paid plan, for a small team. Pictures in file storage stay the later option the request named.

## UX

### Use-case brief

Anyone signed in to the company app, on a phone or a computer. The job: find a review page again, waiting or past, and see what it said and what you answered. Done looks like: the page open, read-only, with the answer and time above it. Common case: open *Reviews*, tap the top waiting page, or search a title for a past one. Edge cases: nothing waiting; no match; a page that ran out with no answer; a page from before this change. Frequency assumption: several times a day for waiting pages, a few times a week for the archive. It mirrors the week board's header and its search field.

### Flow

Inbox → *Reviews* → tap a row → page. Search narrows both parts as you type. *Show more* adds the next 50 archived. *Back* returns to the list. A waiting page answers as today; once its answer reaches the chat it shows under *Archive*.

### Hierarchy

The list: Waiting rows are cards, the primary target; Archive rows are plain lines below. The search box is secondary. An archived page: the page itself; the answer line is status, not an action, and the page offers no button.

### Review

[review.html](review.html). What Changes 1 shows the list, before and after, and a search; What Changes 3 shows an archived page.

### Components

Existing parts: `ToggleGroup` (a third *Reviews* item beside *Day* and *Week*), `SearchField` (gains a `label`), `Card`, `Badge`, `Button`, `Skeleton` while loading, `Alert` with *Retry* on a failed read. New: `Reviews.tsx` (the list) and an `AnswerLine` beside `TapLine` for the archived page.

## Risks / Trade-offs

- **A covering index misses a query** → that query walks every kept page. The query-plan test names each route's statement, so a new query needs a line there.
- **Archive growth** → D1 size grows by up to 512 KB a page. Accepted by the request; pictures in file storage are the later fix.
- **A page put while the migration hasn't run** → the old code still empties it on close, and the new clean-up removes it a day later; nothing else breaks.
- **compact-review-actions edits the same kit file** → the read-only branch sits in the greeting handler, apart from the bar's layout; whichever lands second merges by hand.
