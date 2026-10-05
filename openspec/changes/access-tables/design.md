# Design

## Context

See [the proposal](proposal.md) for why. Access's screens live in `app/src/apps/access/`. `Owner.tsx` reads the whole status once and hands each of four views (`People.tsx`, `Roles.tsx`, `Apps.tsx`, `Keys.tsx`) the same `save`. `View.tsx` draws the tabs around a list; `Page.tsx` draws an opened person, role, app or key, and today replaces `View`, so the tabs go. Notices come from three places: `Banners` above the tabs, `Notices` inside People, and the saved box in `Owner.tsx`.

Constraints that shape the work:

- The page is the shared 32rem column from `app/public/style.css`, the only file that styles whole elements. `style.test.ts` holds `Access.css` to `.access-` selectors and no pixel widths.
- `POST people` already takes `{ email, removed: false, role }` alone: a role id moves the person onto the role, and `role: null` moves them to their own set starting from what the role gave (`members.ts`, `target()`). The row's dropdown needs no new route.
- The app renders through a data router, so `useBlocker` holds a move; the Access tests use `MemoryRouter`, where the page's own links must ask.
- [The `npm test` chain](../../../app/package.json) holds each file to its size limit, so new parts are small files named for their job.

## Goals / Non-Goals

**Goals:** rows that line up; one frame for all four views and the pages under them; a role change in one pick; fewer things on the screen that are rarely used.

**Non-Goals:** a new save route or a database change; a shared table or menu component outside Access, until a second page needs one; sorting, search or bulk actions.

## Decisions

### 1. A real `<table>` that stacks on a phone

Each view renders a `<table class="access-table">` with a header row. A new `Table.tsx` owns the frame: the view's title, the add spot on the right, the caption and the header cells. On a narrow screen a container query turns each row into a block: the header row is hidden from sight but kept for screen readers, and each cell carries its column name in a `data-label` shown before the value only where it is not obvious. Rows are divided by a line, with no border round a row.

*Instead of* a CSS grid of `div`s: a table gives column headers to a screen reader for nothing, and lines columns up without fixed widths.

*Instead of* sideways scrolling on a phone: the spec promises none, and the Role dropdown must stay reachable with a thumb.

### 2. Access breaks out of the narrow column

`.access-page` takes `width: min(60rem, 100vw - 2rem)` and centres itself with a negative inline margin, so it is wider than the 32rem body on a computer and unchanged on a phone. It stays inside `Access.css`; `style.css` and every other page keep the narrow column.

*Instead of* widening `body`: every mini app and Home would change.

### 3. The row is a link plus a click

The first cell holds a real link to the row's page, so the keyboard and a screen reader open it the usual way. The row also opens on a click anywhere that is not a control, and shows it with a hover and focus-within background. Roles, Apps and Keys rows have no other control. A key that is not saved yet opens nothing: its row says the next step in the cells, with the same columns.

### 4. One `<details>` menu per person

A new `RowMenu.tsx` renders `<details class="access-menu">` with `⋯` as its summary, labelled *Actions for <email>*, and a short list of buttons: *Open*, *Try again* when sign-in is unfinished and can be retried, *Remove* when the viewer may remove them, or only *Add back* for a removed person. It closes on Escape, on a pick and on a click outside. The owner's row has none. *Remove* still opens the existing `Confirm`.

*Instead of* a menu library: `<details>` is keyboard reachable for nothing and adds no dependency.

### 5. The role dropdown saves through the existing route, and remembers what to undo

`RoleSelect.tsx` is a `<select>` in the Role cell of an active person, with *Own set* and each role. A pick calls `save('people', { email, removed: false, role })`. `Owner.tsx`'s `save` takes an optional `undo`: the body that puts the person back, built before the save from the status in hand: `{ role: <old id> }`, or for an own set `{ role: null, apps, keys }` filled as `PersonPage` fills them. The result travels in router state with the notice, so the box on top reads *kim@shop.com now has Sales.* with an *Undo* button that sends that body. The undo is gone on the next screen, as the notice is.

*Instead of* a confirm before each pick: he chose saved at once; an undo costs one tap only when a pick was wrong.

*A removed person and the owner* show their role as text.

### 6. One shell for lists and pages

`View.tsx` becomes the shell every owner screen renders in: tabs with counts, then the notice spot, then its children. `Page.tsx` renders inside it, with `People › kim@shop.com` where the back link was. `Banners`, `Notices` and the saved box merge into one `Notices` part rendered once by the shell. A tab link asks before leaving a changed page the same way the back link does, where no data router holds the move.

### 7. Connect your assistant in a `<details>`

`App.tsx` renders `AssistantSetup` inside `<details class="access-connect">` beside the `Access` heading, with `open` set for a person who is neither owner nor manager. `AssistantSetup` itself and Home are untouched. Its region label stays, so it is still found by name.

### 8. The owner and the viewer in the table

People's first row is built from `status.ownerEmail`: *Owner* in the Role cell, *Every app* and *Every key*, no dropdown and no menu; for a manager it adds *picks managers*. The viewer's own row carries *You*. Apps' and Keys' holder cells list *Owner* first. `Own.tsx` renders only for a person who manages nothing, and the line naming the owner goes.

### 9. Remove the app link

`CopyText` for the origin leaves `People.tsx`. If nothing else reads `origin` from the status response, it leaves the schema in `lib/access.ts` and the response in `members.ts` too.

## Risks / Trade-offs

- [A wrong role pick takes effect at once] → the undo box; the audit record still names who changed what.
- [A click on a row could fire while using its dropdown or menu] → the row's click ignores events that start in a control; tests click both.
- [A wide table on a mid-size screen wraps cells unevenly] → labels wrap inside their cell, and the container query stacks rows before columns get too thin.
- [The practice list on a preview can't show a waiting sign-in, since a preview makes no sign-in call] → code tests cover that row; the report names it as shown in tests only.
- [An install that changed the Access screen's own code] → the changelog's Updating note says the assistant brings those changes onto the new screens.

## UX

### Use-case brief

The owner of a small business, or a manager they chose, at a desk most of the time and on a phone now and then. The job: see who can do what, and change it. Done is a list they can read in one pass and a change that took one or two picks. Common case: check the list, change one person's role, add a person (a few times a month, assumed; no usage data yet). Edge cases: a sign-in that is waiting, a removed person to add back, a key not saved yet; each costs a menu or a line in the row, never a different layout. Mirrors the member lists of team tools: a table, the role in the row, a menu at the row's end.

### Flow

Open Access → People table → pick a role in the row → done, with an undo. For apps and levels: click the row → tick and pick → *Save access* → back on the table with *Saved*. Add: *+ Add person* → email and role → *Save access*.

### Hierarchy

Per view, the one filled button is its add button; Apps and Keys have none and say how one is added in muted text. On a page, *Save access* is the filled one. Row controls are plain: a dropdown and a `⋯`. Sign-in status, counts and hints are muted; a gap keeps its `!` and bold words. Lines between rows, no boxes round them; the notice spot is the only boxed thing above the table.

### Review

[review.html](review.html). *People becomes a table* sketches People before and after, on a computer and a phone. *Roles, Apps and Keys get the same frame* sketches those three. *You change a role right in the row* draws the save and the undo. *A row's buttons move into one menu* lists each row state. *The tabs and the notices stay in one place* sketches an opened person before and after. *Connect your assistant becomes a dropdown* sketches it closed and open.

### Components

Existing: `Labels`, `SetLabels`, `Confirm`, `Page`, `LevelChoice`, `SetFields`, `AssistantSetup`, `CopyText`. New, all inside Access: `Table.tsx` (the frame), `RowMenu.tsx` (the `⋯` menu), `RoleSelect.tsx` (the row's dropdown). Each has one user today, so none moves to `app/src/components/`.
