<!-- openspec-archive v1 2026-10-05-access-tables -->
<!-- file proposal.md utf8 19314 -->
# Access lists you can scan, in a frame that stays put

**Status:** ready-to-ship

**Branch:** understand-access-system

**Open questions:** none

## Why

Access is hard to work with. Every person, role, app and key is its own box, so nothing lines up and you can't scan down a list. The top of each view looks different, the buttons on a row change with its state, notices show in three places, and the tabs vanish when you open anything. *Copy app link* and the *Connect your assistant* box take room on every screen for things you rarely need.

## What Changes

- **People becomes a table.** One row per person, with the same columns on every row: who, whether they can sign in, their role, their apps and their key levels. The line that warns an app can't do its job yet stays, under the row it belongs to. The page gets wider on a computer so the columns fit; on a phone each row stacks into a few short lines with a thin line between rows, and no boxes. You are the first row, marked *Owner*, where a grey line named you before.
  ```text
  BEFORE
  ┌──────────────────────────────────────┐
  │ Access                               │
  │ [People] Roles  Apps  Keys           │
  │ Owner: you@shop.com                  │
  │ [Add person]                         │
  │ ┌──────────────────────────────────┐ │
  │ │ kim@shop.com        Can sign in  │ │
  │ │ Sales                            │ │
  │ │ Apps [Hello] [Orders]            │ │
  │ │ Keys [Stripe Read]               │ │
  │ │ [Edit] [Remove]                  │ │
  │ └──────────────────────────────────┘ │
  │ ┌──────────────────────────────────┐ │
  │ │ lee@shop.com        Can sign in  │ │
  │ │ Own set  ...                     │ │
  │ └──────────────────────────────────┘ │
  │ [Copy app link]                      │
  │ ┌──────────────────────────────────┐ │
  │ │ Connect your assistant           │ │
  │ │ [Copy setup prompt]              │ │
  │ └──────────────────────────────────┘ │
  └──────────────────────────────────────┘

  AFTER, on a computer
  ┌──────────────────────────────────────────────────────┐
  │ Access                   +[Connect your assistant ▾] │
  │ [People 3]  Roles 1  Apps 2  Keys 1                  │
  │                                                      │
  │ People                               +[+ Add person] │
  │ Person       Sign-in     Role        Apps / Keys     │
  │ ──────────────────────────────────────────────────── │
  │ you@shop.com Can sign in +Owner      Every app, key  │
  │ kim@shop.com Can sign in +[Sales ▾]  Hello, Tips  +⋯ │
  │                                      Stripe Read     │
  │ lee@shop.com Can sign in +[Own set▾] Hello        +⋯ │
  │                                      ! Hello can     │
  │                                      look up, not    │
  │                                      change          │
  └──────────────────────────────────────────────────────┘

  AFTER, on a phone
  ┌──────────────────────────────────┐
  │ Access                           │
  │ +[Connect your assistant ▾]      │
  │ [People 3] Roles 1 Apps 2 Keys 1 │
  │ People          +[+ Add person]  │
  │ ──────────────────────────────── │
  │ +you@shop.com · Owner            │
  │ Every app and key                │
  │ ──────────────────────────────── │
  │ kim@shop.com                  +⋯ │
  │ Can sign in · +[Sales ▾]         │
  │ Hello, Orders · Stripe Read      │
  │ ──────────────────────────────── │
  │ lee@shop.com                  +⋯ │
  │ Can sign in · +[Own set ▾]       │
  │ Hello                            │
  │ ! Hello can look up, not change  │
  └──────────────────────────────────┘
  ```
- **Roles, Apps and Keys get the same frame.** Each view has its title on the left and its add button on the right, then a table. Apps and Keys have no button, since your assistant makes those, so that spot says how one is added. The owner shows first wherever a list names who has something. Clicking a row opens it, as *Edit* did.
  ```text
  ┌──────────────────────────────────────────────────────┐
  │ Roles                                   [+ Add role] │
  │ Role     Apps            Keys          People        │
  │ ──────────────────────────────────────────────────── │
  │ Sales    Hello, Orders   Stripe Read   kim@, sam@    │
  └──────────────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────────────┐
  │ Apps             +Ask your assistant to build an app │
  │ App      Uses                    Who has it          │
  │ ──────────────────────────────────────────────────── │
  │ Hello    Stripe: look up,        +Owner, Sales,      │
  │          change                  lee@shop.com        │
  │ Orders   no keys                 +Owner, Sales       │
  └──────────────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────────────┐
  │ Keys      +Your assistant sends a link for a new key │
  │ Key          Saved   Used by   Read & write   Read   │
  │ ──────────────────────────────────────────────────── │
  │ Stripe       Yes     Hello     +Owner         Sales  │
  │ Cloudflare   Not yet: ask your assistant for it      │
  └──────────────────────────────────────────────────────┘
  ```
- **You change a role right in the row.** A person's role is a dropdown in the People table. Picking one saves at once and governs their next click. A box on top says what changed and offers *Undo*, which puts back what they had, their own ticks and levels included. Clicking anywhere else on the row opens the person's page for apps and key levels, where nothing changes until you press *Save access*.
  ```text
  pick a role in the row
          │
          ▼
  saved at once ─▶ box on top:
                   "kim@shop.com now has
                    Sales."  [Undo]
                            │
                            ▼
                   back to what they had,
                   their own ticks included

  did not save ─▶ box says so, row unchanged
  ```
- **A row's buttons move into one menu.** Each person's row ends with `⋯`, which holds what you can do with that person. The row keeps its shape whatever state the person is in.
  ```text
  row state       │ before           │ after: ⋯ holds
  ────────────────┼──────────────────┼────────────────
  can sign in     │ [Edit] [Remove]  │ Open, Remove
  sign-in waiting │ [Try again]      │ Open, Try again,
                  │ [Edit] [Remove]  │ Remove
  removed         │ [Add back]       │ Add back
  the owner       │ not in the list  │ no menu
  ```
- **The tabs and the notices stay in one place.** The four tabs, each with a count, show on every Access screen, an open person, role, app or key included. Every notice (*Saved*, the practice list, a step left to finish) shows in one spot under the tabs. Leaving a page with changes not saved still asks first, from a tab too.
  ```text
  BEFORE                      AFTER
  ┌────────────────────────┐  ┌────────────────────────┐
  │ Access                 │  │ Access       [Connect▾]│
  │ Practice list. ...     │  │+People Roles Apps Keys │
  │ ← People               │  │+[one spot for notices] │
  │ kim@shop.com           │  │ People › kim@shop.com  │
  │ Role [Sales ▾]         │  │ Role [Sales ▾]         │
  │ ...                    │  │ ...                    │
  │ [Save access] [Cancel] │  │ [Save access] [Cancel] │
  │ ┌────────────────────┐ │  └────────────────────────┘
  │ │ Connect your       │ │
  │ │ assistant          │ │
  │ └────────────────────┘ │
  └────────────────────────┘
  ```
- **Connect your assistant becomes a button that opens a popup.** The button sits at the top of Access. It opens a popup over the page with the same prompt and steps as today, and closes with *Close*, Escape or a click outside. Someone who manages nothing sees the steps on the page itself, as connecting is what they came for. The Home page keeps its box.
  ```text
  closed                      open
  ┌────────────────────────┐  ┌────────────────────────┐
  │ Access                 │  │ Access                 │
  │ +[Connect your        ]│  │ ┌────────────────────┐ │
  │ +[assistant           ]│  │ │+Connect your       │ │
  │ People Roles Apps Keys │  │ │ assistant      [x] │ │
  │ ...                    │  │ │ Signed in as you@  │ │
  └────────────────────────┘  │ │ [Copy setup prompt]│ │
                              │ │ Paste it into your │ │
                              │ │ assistant.         │ │
                              │ └────────────────────┘ │
                              └────────────────────────┘
  ```
- **The top bar runs the full width, with a way to sign out.** On every page the bar with the logo spans the screen, where it stopped at the narrow column. On the right it has *Sign out*, which ends your session in this browser; you sign in again with an emailed code. A site that is open with no sign-in shows no button.
  ```text
  BEFORE
        ┌──────────────────────┐
        │ W WongStack          │
        │ ──────────────────── │
        │ page                 │
        └──────────────────────┘
  AFTER
  ┌──────────────────────────────────┐
  │ W WongStack          +[Sign out] │
  │ ──────────────────────────────── │
  │       page, as wide as before    │
  └──────────────────────────────────┘
  ```
- **Copy app link is removed.** You send people the website's address yourself.
- **A manager finds themselves in the table.** A manager's own row is marked *You*, where a separate *You can use* box sat above the tabs. The owner's row tells them who picks managers.

**Non-goals:** Tick boxes to change several people at once. Search, sorting or filters. A people-by-apps grid. Setting an app or a key level from a list. A change to the Home page beyond its top bar. Tailwind and shadcn, which get their own plan right after this one. A change to what a person can do, to how it is checked, or to who can sign in.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-scaffold`: every page offers a signed-in person a way to sign out.
- `employee-onboarding`: adding a person no longer hands the owner an app link to share; the employer changes a person's role from the People list with an undo; the views and notices keep one place on every Access screen; the owner is listed among the people.

## Impact

- `app/src/apps/access/`: the four list views, `View.tsx`, `Page.tsx`, `Owner.tsx`, `App.tsx`, `Own.tsx`, `Labels.tsx`, `Notices.tsx`, `Access.css`, new small parts for the table frame, the row menu and the role dropdown, and their tests.
- `app/src/components/AssistantSetup.tsx`: unchanged content, wrapped by Access in a dropdown.
- `app/src/lib/access.ts` and `app/worker/employee-access/members.ts`: the status response drops `origin` if nothing else reads it. No save route changes: the role save already exists.
- `schema/seed.sql`: a removed person on the practice list if none is there, so a preview shows that row.
- `wiki/stack/employee-access.md`, `CHANGELOG.md` (a `minor` entry), and the spec above.
- `app/src/Layout.tsx` and `app/public/style.css`: the full-width bar and *Sign out*.
- No database change and no new dependency.

## Decision log

- **2026-10-05** — Asked what should happen when you pick a row → chose the role in the row, saved at once, and the rest on the person's page with the tabs still showing.
- **2026-10-05** — Asked whether tick boxes should change several people at once → chose one at a time.
- **2026-10-05** — Asked what should happen to *Copy app link* → chose to remove it: "we'll just send them the website for them to log in".
- **2026-10-05** — Asked what next after the summary of the rework → chose to plan it.
- **2026-10-05** — Assumed: the Access page gets wider on a computer, because five columns do not fit the shared narrow column; this reverses the morning's non-goal, which he set before asking for a table.
- **2026-10-05** — Assumed: a role picked in the row offers *Undo*, because moving someone onto a role replaces their own ticks and one slip in a dropdown would lose them.
- **2026-10-05** — Assumed: apps and key levels stay written out in the row, not shown as counts, because he said this morning that it was hard to see who has what.
- **2026-10-05** — Assumed: the Home page keeps its *Connect your assistant* box, because that is where a new person lands.
- **2026-10-05** — Assumed: the dropdown starts open for someone who manages nothing, because connecting is the only thing Access offers them.
- **2026-10-05** — Assumed: Roles, Apps and Keys rows open on a click and carry no menu, because each has one thing to do.
- **2026-10-05** — Assumed: a manager's *You can use* box and the line naming the owner give way to their own row marked *You* and the owner's row, because both said what the table now shows.
- **2026-10-05** — Assumed: step-left notices still show only on the view they belong to, in the one spot, because showing every notice on every view would add noise.
- **2026-10-05** — Assumed: this is not the people-by-apps grid he turned down this morning, because each view stays a plain list of its own things.
- **2026-10-05** — Asked what next for the finished plan → chose to build it now, with a preview before anything is published.
- **2026-10-05** — Assumed: *Try again* stays in a removed person's menu while their sign-out is unfinished, because dropping it would lose the retry of a failed sign-out.
- **2026-10-05** — Assumed: only someone who manages Access gets the wider page, because an employee's view has no table and reads better in the narrow column.
- **2026-10-05** — Assumed: the People tab counts the owner and current people, not removed ones, because the count should say who can use the app.
- **2026-10-05** — Build: all code, tests, the wiki page and the changelog entry are written and the local checks pass; the preview walk (task 6.2) is left, and the kept check for adding a person still expects *Copy app link* and needs recording again.
- **2026-10-05** — Preview walk: passed at a computer and a phone width; a manager's view, a waiting sign-in and the non-manager view are shown by code tests only.
- **2026-10-05** — Asked, after seeing the preview, for three changes → chose a popup for *Connect your assistant* in place of the dropdown, a top bar that spans the screen, and a sign-out button.
- **2026-10-05** — Asked when the switch to Tailwind and shadcn should happen → chose right after this one, as its own plan; this change keeps the current plain style.
- **2026-10-05** — Assumed: someone who manages nothing sees the connect steps on the page, not in a popup, because a popup that opens by itself is in the way.
- **2026-10-05** — Assumed: *Sign out* shows on every page and only where the site has a sign-in, because an open site has no session to end.
- **2026-10-05** — Assumed: the page under the bar keeps its width, because he asked for the bar to extend, not the pages.
- **2026-10-05** — Build: the popup, the full-width bar and *Sign out* are written and the local checks pass; *Sign out* reads one new yes-or-no from the app, so each page makes one more request. The second preview walk (task 7.4) is left.
- **2026-10-05** — Archive checkpoint: asked whether to publish after the second preview walk → chose to publish; built, both walks passed, numbered 33.4.0. Left for a person: click *Sign out* once on the live app.

<!-- end proposal.md -->
<!-- file design.md utf8 10181 -->
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

### 7. Connect your assistant in a native `<dialog>`

For the owner and a manager, `App.tsx` renders a *Connect your assistant* button beside the heading and a `<dialog>` opened with `showModal()`, holding `AssistantSetup` and a *Close* button. The browser gives focus trapping, Escape and the backdrop; a click on the backdrop closes it. For a person who manages nothing, `AssistantSetup` renders on the page as before. Home is untouched. This replaces the `<details>` built first.

*Instead of* a dialog library: the native element needs none, and the switch to shadcn that follows this change will replace it anyway.

### 8. The owner and the viewer in the table

People's first row is built from `status.ownerEmail`: *Owner* in the Role cell, *Every app* and *Every key*, no dropdown and no menu; for a manager it adds *picks managers*. The viewer's own row carries *You*. Apps' and Keys' holder cells list *Owner* first. `Own.tsx` renders only for a person who manages nothing, and the line naming the owner goes.

### 9. Remove the app link

`CopyText` for the origin leaves `People.tsx`. If nothing else reads `origin` from the status response, it leaves the schema in `lib/access.ts` and the response in `members.ts` too.

### 10. A full-width bar with *Sign out*

`body` stops being the narrow column: `main` takes the 32rem width and `.site-header` spans the viewport, its content padded to the edges. `.access-wide` keeps breaking out of `main`. `Layout.tsx` adds a *Sign out* link to `/cdn-cgi/access/logout` on the app's own address, which Cloudflare Access serves for a protected app and which ends the session. The link shows only when the Worker says the site has a sign-in: the app status response already read by Home and Access carries one new boolean, false where the site is open until the card or runs locally with the stand-in identity.

*Instead of* a Worker route that clears the cookie: the cookie is Cloudflare's, and its own logout address also ends the session at the sign-in wall.

## Risks / Trade-offs

- [The sign-out address can't be exercised by the preview checker, which signs in as a machine] → the walk shows the button and where it points; a person confirms the sign-out on the live app.

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

<!-- end design.md -->
<!-- file tasks.md utf8 5687 -->
# Tasks

## 1. The frame every screen shares

- [x] 1.1 Make `View.tsx` the shell for lists and pages: tabs with a count each, then one notice spot, then its children; render `Page.tsx` inside it with `People › <name>` where the back link was. Verify in `App.test.tsx` and `Leaving.test.tsx` that the tabs show on an opened person, role, app and key, and that a tab asks before leaving a changed page.
- [x] 1.2 Merge `Banners`, `Notices` and the saved box into one `Notices` part the shell renders once; keep each notice's words and its `status` or `alert` role. Verify the existing notice cases in `App.test.tsx` still find each one, once.
- [x] 1.3 Add `Table.tsx` (title, add spot, header cells) and the table, stacked-row and wider-page styles in `Access.css`; extend `style.test.ts` for: rows stack on a narrow screen, no pixel widths, only `.access-` selectors, the current tab still marked by more than colour. Loosen none of its checks.

## 2. People

- [x] 2.1 Render People as a table with the owner's row first, *You* on the viewer's row, and labels and the gap line in their cells; remove the `Owner:` line and the manager line in `Owner.tsx`. Update `App.test.tsx` for the owner row as owner and as manager, and that the owner's row has no control.
- [x] 2.2 Add `RowMenu.tsx` and move *Open*, *Try again*, *Remove* and *Add back* into it by row state; keep the remove confirm. Verify in `App.test.tsx`: each state's menu items, Escape closes it, a manager's menu on a manager's row has no *Remove*.
- [x] 2.3 Add `RoleSelect.tsx` and the `undo` path in `Owner.tsx`'s `save`: a pick sends the role alone, the notice names the change with *Undo*, and undo sends back the old role or the old own set. Verify in `App.test.tsx`: role to role, own set to role and back with the same apps and levels, a failed save says so, a click in the dropdown or menu does not open the row.
- [x] 2.4 Remove *Copy app link* from `People.tsx`, and `origin` from `lib/access.ts` and `members.ts` if nothing else reads it; update the tests and fixtures that name it. Verify with a search that no caller is left.

## 3. Roles, Apps and Keys

- [x] 3.1 Render Roles, Apps and Keys through `Table.tsx`, each row opening on its link or a click, with *Owner* first among holders and the how-to-add line in the add spot of Apps and Keys. Update `Roles.test.tsx` and `Grants.test.tsx` for the columns, the empty states and the click.
- [x] 3.2 Keep one row shape for a key that is not saved: the next step in its cells for the owner, for a manager, and on a preview. Verify the three existing cases in `Grants.test.tsx`.

## 4. Connect your assistant and the non-owner view

- [x] 4.1 Wrap `AssistantSetup` in a `<details>` beside the heading in `App.tsx`, open for a person who manages nothing; show `Own.tsx` only to them. Update `App.test.tsx`: closed for the owner and a manager, open for an employee, the prompt still copies, Home's box unchanged.

## 5. Practice list, docs and release

- [x] 5.1 Check `schema/seed.sql` has a removed person on the practice list and add one made-up row if not; verify with `seed.test.ts`.
- [x] 5.2 Update `wiki/stack/employee-access.md`: *Four views* and the sections under it for the tables, the row dropdown and undo, the menu, the one frame, the dropdown for connecting, and no app link; drop the lines about a manager's box and the owner line. Verify with `node scripts/check-payload-links.mjs`.
- [x] 5.3 Add a `## Next (minor)` entry at the top of `CHANGELOG.md` in plain words, with an **Updating.** note that nothing needs doing by hand and that the assistant brings an install's own changes to the Access screen onto the new one. Verify the entry is the first one.

## 6. Changes after the first preview

- [x] 6.1 Replace the Connect `<details>` in `App.tsx` with a button and a native `<dialog>` for the owner and a manager, closing on *Close*, Escape and a backdrop click; render `AssistantSetup` on the page for a person who manages nothing. Update `App.test.tsx`: the popup opens and closes, the prompt copies inside it, an employee sees the steps with no popup. Remove the `.access-connect` dropdown styles.
- [x] 6.2 Make the top bar span the screen in `app/public/style.css` and `Layout.tsx`, keeping each page's width and the wide Access page; add *Sign out* on the right, shown only when the status response says the site has a sign-in, and add that boolean to the response and its schema. Test: the link and its address with a sign-in, no link on an open site and on a local run, and the Worker's value for each.
- [x] 6.3 Update `wiki/stack/employee-access.md` for the popup, the page that owns the app's frame or `wiki/stack/cloudflare-access.md` for signing out, and the `## Next` changelog entry for all three; keep the wiki page under its word limit. Verify with `node scripts/check-payload-links.mjs`.

## 7. Verification

- [x] 7.1 Run the app's test chain (`npm test` in `app/`) and `node .github/scripts/checks.mjs --worktree`; fix what fails.
- [x] 7.2 After `/save`, walk the preview as the checker at a computer width and a phone width: People with the owner row, a role picked in a row and undone, the `⋯` menu, a person's page with the tabs showing, Roles, Apps, Keys, and the Connect dropdown opened. Show the pictures, and name what only code tests cover (a waiting sign-in, the non-owner view).
- [x] 7.3 Run the test chain and the worktree checks again after group 6; fix what fails.
- [x] 7.4 After `/save`, walk the preview again at both widths: the full-width bar with *Sign out* on Home and Access, and the Connect popup opened and closed. Show the pictures; a person confirms the sign-out itself on the live app.

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 622 -->
# Spec Delta

## ADDED Requirements

### Requirement: A signed-in person can sign out from any page

Every page of the app SHALL offer a signed-in person a way to end their session in that browser, after which the app SHALL require signing in again. An app that is open with no sign-in SHALL offer none.

#### Scenario: A person signs out

- **WHEN** a signed-in person chooses to sign out from any page
- **THEN** their session ends and the next visit asks them to sign in

#### Scenario: The site has no sign-in

- **WHEN** a visitor opens a site that is open with no sign-in
- **THEN** no page offers a way to sign out

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/employee-onboarding/spec.md utf8 3704 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The employer manages employee grants through Access

The employer SHALL be the person whose verified signed-in email equals the owner email setup recorded in the installation's committed configuration; no private activation record, command or rollout list SHALL be required before Access opens. Only the employer and the managers the employer chose SHALL add, edit or remove employees or change selected-app grants. A new employee SHALL have no business apps preselected and SHALL receive no repository authority from app login. A newly built app SHALL appear in Access unassigned and SHALL require an explicit assignment. A current employee with no assigned business apps SHALL retain only their self-service setup/status. Public routing, service identity, request content and first visitation SHALL establish no employer authority. An installation with no recorded owner email SHALL keep its existing behavior and report Access setup unfinished.

#### Scenario: Employer adds a person

- **WHEN** the employer saves a person's email with Orders access
- **THEN** that person is assigned Orders only and the owner sees the actual admission status

#### Scenario: The owner opens Access for the first time

- **WHEN** the person whose sign-in email is the recorded owner email opens Access with no other setup done
- **THEN** the people list and Add person are available without a private record or command

#### Scenario: Employee attempts membership administration

- **WHEN** an ordinary employee invokes a membership or connection-management endpoint
- **THEN** it is denied without changing any employee or provider resource

## ADDED Requirements

### Requirement: Access lists line up and keep one frame

Each of Access's four views SHALL list its people, roles, apps or keys as rows that share the same columns, readable on a phone without sideways scrolling. The people list SHALL include the employer, marked as the owner, with nothing on that row to change. The switch between the views and the place where Access reports a save, a practice list or an unfinished step SHALL stay the same on every Access screen, an opened person, role, app or key included. A person's row SHALL keep the same parts whether they can sign in, are waiting, or were removed.

#### Scenario: The employer opens a person

- **WHEN** the employer opens a person from the people list
- **THEN** the person's page shows with the switch between the four views still in place

#### Scenario: A manager reads the people list

- **WHEN** a manager opens Access
- **THEN** the list names the owner on its first row and offers nothing to change or remove on that row

### Requirement: The employer changes a person's role from the people list

The employer or a manager SHALL be able to give a current person a role, or their own set, from the people list without opening the person's page. The change SHALL be saved at once and govern the person's next request. Access SHALL then say what changed and offer to undo it, and undoing SHALL return the person to the role or own set they had, with the same apps and key levels. A role change that did not save SHALL be reported and SHALL leave the list showing what the person has.

#### Scenario: A role is picked in the list

- **WHEN** the employer picks Sales for a person who had their own set of two apps
- **THEN** the person has exactly what Sales gives on their next request, and Access says so and offers to undo it

#### Scenario: The employer undoes the change

- **WHEN** the employer undoes that change
- **THEN** the person again has their own set with the same two apps and the key levels they held before

<!-- end specs/employee-onboarding/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-05

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 61885 fence=~~~ -->
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
<title>Review · 2026-10-05-access-tables</title>
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
  .tag.check { border:2px dotted #333; }
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
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-05-access-tables">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-05-access-tables</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Access is hard to work with. Every person, role, app and key is its own box, so nothing lines up and you can't scan down a list. The top of each view looks different, the buttons on a row change with its state, notices show in three places, and the tabs vanish when you open anything. <i>Copy app link</i> and the <i>Connect your assistant</i> box take room on every screen for things you rarely need.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>People becomes a table.</b> One row per person, with the same columns on every row: who, whether they can sign in, their role, their apps and their key levels. The line that warns an app can't do its job yet stays, under the row it belongs to. The page gets wider on a computer so the columns fit; on a phone each row stacks into a few short lines with a thin line between rows, and no boxes. You are the first row, marked <i>Owner</i>, where a grey line named you before.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">BEFORE</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│ Access                               │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│ [People] Roles  Apps  Keys           │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│ Owner: you@shop.com                  │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│ [Add person]                         │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">│ ┌──────────────────────────────────┐ │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">│ │ kim@shop.com        Can sign in  │ │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">│ │ Sales                            │ │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">│ │ Apps [Hello] [Orders]            │ │</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">│ │ Keys [Stripe Read]               │ │</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">│ │ [Edit] [Remove]                  │ │</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">│ └──────────────────────────────────┘ │</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">│ ┌──────────────────────────────────┐ │</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">│ │ lee@shop.com        Can sign in  │ │</span>
<span class="ln" data-note="item-1-line-16" tabindex="0">│ │ Own set  ...                     │ │</span>
<span class="ln" data-note="item-1-line-17" tabindex="0">│ └──────────────────────────────────┘ │</span>
<span class="ln" data-note="item-1-line-18" tabindex="0">│ [Copy app link]                      │</span>
<span class="ln" data-note="item-1-line-19" tabindex="0">│ ┌──────────────────────────────────┐ │</span>
<span class="ln" data-note="item-1-line-20" tabindex="0">│ │ Connect your assistant           │ │</span>
<span class="ln" data-note="item-1-line-21" tabindex="0">│ │ [Copy setup prompt]              │ │</span>
<span class="ln" data-note="item-1-line-22" tabindex="0">│ └──────────────────────────────────┘ │</span>
<span class="ln" data-note="item-1-line-23" tabindex="0">└──────────────────────────────────────┘</span>

<span class="ln" data-note="item-1-line-25" tabindex="0">AFTER, on a computer</span>
<span class="ln" data-note="item-1-line-26" tabindex="0">┌──────────────────────────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-27" tabindex="0">│ Access                   +[Connect your assistant ▾] │</span>
<span class="ln" data-note="item-1-line-28" tabindex="0">│ [People 3]  Roles 1  Apps 2  Keys 1                  │</span>
<span class="ln" data-note="item-1-line-29" tabindex="0">│                                                      │</span>
<span class="ln" data-note="item-1-line-30" tabindex="0">│ People                               +[+ Add person] │</span>
<span class="ln" data-note="item-1-line-31" tabindex="0">│ Person       Sign-in     Role        Apps / Keys     │</span>
<span class="ln" data-note="item-1-line-32" tabindex="0">│ ──────────────────────────────────────────────────── │</span>
<span class="ln" data-note="item-1-line-33" tabindex="0">│ you@shop.com Can sign in +Owner      Every app, key  │</span>
<span class="ln" data-note="item-1-line-34" tabindex="0">│ kim@shop.com Can sign in +[Sales ▾]  Hello, Tips  +⋯ │</span>
<span class="ln" data-note="item-1-line-35" tabindex="0">│                                      Stripe Read     │</span>
<span class="ln" data-note="item-1-line-36" tabindex="0">│ lee@shop.com Can sign in +[Own set▾] Hello        +⋯ │</span>
<span class="ln" data-note="item-1-line-37" tabindex="0">│                                      ! Hello can     │</span>
<span class="ln" data-note="item-1-line-38" tabindex="0">│                                      look up, not    │</span>
<span class="ln" data-note="item-1-line-39" tabindex="0">│                                      change          │</span>
<span class="ln" data-note="item-1-line-40" tabindex="0">└──────────────────────────────────────────────────────┘</span>

<span class="ln" data-note="item-1-line-42" tabindex="0">AFTER, on a phone</span>
<span class="ln" data-note="item-1-line-43" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-44" tabindex="0">│ Access                           │</span>
<span class="ln" data-note="item-1-line-45" tabindex="0">│ +[Connect your assistant ▾]      │</span>
<span class="ln" data-note="item-1-line-46" tabindex="0">│ [People 3] Roles 1 Apps 2 Keys 1 │</span>
<span class="ln" data-note="item-1-line-47" tabindex="0">│ People          +[+ Add person]  │</span>
<span class="ln" data-note="item-1-line-48" tabindex="0">│ ──────────────────────────────── │</span>
<span class="ln" data-note="item-1-line-49" tabindex="0">│ +you@shop.com · Owner            │</span>
<span class="ln" data-note="item-1-line-50" tabindex="0">│ Every app and key                │</span>
<span class="ln" data-note="item-1-line-51" tabindex="0">│ ──────────────────────────────── │</span>
<span class="ln" data-note="item-1-line-52" tabindex="0">│ kim@shop.com                  +⋯ │</span>
<span class="ln" data-note="item-1-line-53" tabindex="0">│ Can sign in · +[Sales ▾]         │</span>
<span class="ln" data-note="item-1-line-54" tabindex="0">│ Hello, Orders · Stripe Read      │</span>
<span class="ln" data-note="item-1-line-55" tabindex="0">│ ──────────────────────────────── │</span>
<span class="ln" data-note="item-1-line-56" tabindex="0">│ lee@shop.com                  +⋯ │</span>
<span class="ln" data-note="item-1-line-57" tabindex="0">│ Can sign in · +[Own set ▾]       │</span>
<span class="ln" data-note="item-1-line-58" tabindex="0">│ Hello                            │</span>
<span class="ln" data-note="item-1-line-59" tabindex="0">│ ! Hello can look up, not change  │</span>
<span class="ln" data-note="item-1-line-60" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Roles, Apps and Keys get the same frame.</b> Each view has its title on the left and its add button on the right, then a table. Apps and Keys have no button, since your assistant makes those, so that spot says how one is added. The owner shows first wherever a list names who has something. Clicking a row opens it, as <i>Edit</i> did.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">┌──────────────────────────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">│ Roles                                   [+ Add role] │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│ Role     Apps            Keys          People        │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│ ──────────────────────────────────────────────────── │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│ Sales    Hello, Orders   Stripe Read   kim@, sam@    │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">└──────────────────────────────────────────────────────┘</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">┌──────────────────────────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">│ Apps             +Ask your assistant to build an app │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">│ App      Uses                    Who has it          │</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">│ ──────────────────────────────────────────────────── │</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">│ Hello    Stripe: look up,        +Owner, Sales,      │</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">│          change                  lee@shop.com        │</span>
<span class="ln" data-note="item-2-line-13" tabindex="0">│ Orders   no keys                 +Owner, Sales       │</span>
<span class="ln" data-note="item-2-line-14" tabindex="0">└──────────────────────────────────────────────────────┘</span>
<span class="ln" data-note="item-2-line-15" tabindex="0">┌──────────────────────────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-16" tabindex="0">│ Keys      +Your assistant sends a link for a new key │</span>
<span class="ln" data-note="item-2-line-17" tabindex="0">│ Key          Saved   Used by   Read &amp; write   Read   │</span>
<span class="ln" data-note="item-2-line-18" tabindex="0">│ ──────────────────────────────────────────────────── │</span>
<span class="ln" data-note="item-2-line-19" tabindex="0">│ Stripe       Yes     Hello     +Owner         Sales  │</span>
<span class="ln" data-note="item-2-line-20" tabindex="0">│ Cloudflare   Not yet: ask your assistant for it      │</span>
<span class="ln" data-note="item-2-line-21" tabindex="0">└──────────────────────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>You change a role right in the row.</b> A person's role is a dropdown in the People table. Picking one saves at once and governs their next click. A box on top says what changed and offers <i>Undo</i>, which puts back what they had, their own ticks and levels included. Clicking anywhere else on the row opens the person's page for apps and key levels, where nothing changes until you press <i>Save access</i>.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">pick a role in the row</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">        │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">        ▼</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">saved at once ─▶ box on top:</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">                 &quot;kim@shop.com now has</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">                  Sales.&quot;  [Undo]</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">                          │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">                          ▼</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">                 back to what they had,</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">                 their own ticks included</span>

<span class="ln" data-note="item-3-line-12" tabindex="0">did not save ─▶ box says so, row unchanged</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A row's buttons move into one menu.</b> Each person's row ends with <code>⋯</code>, which holds what you can do with that person. The row keeps its shape whatever state the person is in.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">row state       │ before           │ after: ⋯ holds</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">────────────────┼──────────────────┼────────────────</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">can sign in     │ [Edit] [Remove]  │ Open, Remove</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">sign-in waiting │ [Try again]      │ Open, Try again,</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">                │ [Edit] [Remove]  │ Remove</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">removed         │ [Add back]       │ Add back</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">the owner       │ not in the list  │ no menu</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The tabs and the notices stay in one place.</b> The four tabs, each with a count, show on every Access screen, an open person, role, app or key included. Every notice (<i>Saved</i>, the practice list, a step left to finish) shows in one spot under the tabs. Leaving a page with changes not saved still asks first, from a tab too.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">BEFORE                      AFTER</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">┌────────────────────────┐  ┌────────────────────────┐</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">│ Access                 │  │ Access       [Connect▾]│</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">│ Practice list. ...     │  │+People Roles Apps Keys │</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">│ ← People               │  │+[one spot for notices] │</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">│ kim@shop.com           │  │ People › kim@shop.com  │</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">│ Role [Sales ▾]         │  │ Role [Sales ▾]         │</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">│ ...                    │  │ ...                    │</span>
<span class="ln" data-note="item-5-line-9" tabindex="0">│ [Save access] [Cancel] │  │ [Save access] [Cancel] │</span>
<span class="ln" data-note="item-5-line-10" tabindex="0">│ ┌────────────────────┐ │  └────────────────────────┘</span>
<span class="ln" data-note="item-5-line-11" tabindex="0">│ │ Connect your       │ │</span>
<span class="ln" data-note="item-5-line-12" tabindex="0">│ │ assistant          │ │</span>
<span class="ln" data-note="item-5-line-13" tabindex="0">│ └────────────────────┘ │</span>
<span class="ln" data-note="item-5-line-14" tabindex="0">└────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Connect your assistant becomes a button that opens a popup.</b> The button sits at the top of Access. It opens a popup over the page with the same prompt and steps as today, and closes with <i>Close</i>, Escape or a click outside. Someone who manages nothing sees the steps on the page itself, as connecting is what they came for. The Home page keeps its box.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-1" tabindex="0">closed                      open</span>
<span class="ln" data-note="item-6-line-2" tabindex="0">┌────────────────────────┐  ┌────────────────────────┐</span>
<span class="ln" data-note="item-6-line-3" tabindex="0">│ Access                 │  │ Access                 │</span>
<span class="ln" data-note="item-6-line-4" tabindex="0">│ +[Connect your        ]│  │ ┌────────────────────┐ │</span>
<span class="ln" data-note="item-6-line-5" tabindex="0">│ +[assistant           ]│  │ │+Connect your       │ │</span>
<span class="ln" data-note="item-6-line-6" tabindex="0">│ People Roles Apps Keys │  │ │ assistant      [x] │ │</span>
<span class="ln" data-note="item-6-line-7" tabindex="0">│ ...                    │  │ │ Signed in as you@  │ │</span>
<span class="ln" data-note="item-6-line-8" tabindex="0">└────────────────────────┘  │ │ [Copy setup prompt]│ │</span>
<span class="ln" data-note="item-6-line-9" tabindex="0">                            │ │ Paste it into your │ │</span>
<span class="ln" data-note="item-6-line-10" tabindex="0">                            │ │ assistant.         │ │</span>
<span class="ln" data-note="item-6-line-11" tabindex="0">                            │ └────────────────────┘ │</span>
<span class="ln" data-note="item-6-line-12" tabindex="0">                            └────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>The top bar runs the full width, with a way to sign out.</b> On every page the bar with the logo spans the screen, where it stopped at the narrow column. On the right it has <i>Sign out</i>, which ends your session in this browser; you sign in again with an emailed code. A site that is open with no sign-in shows no button.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-7-line-1" tabindex="0">BEFORE</span>
<span class="ln" data-note="item-7-line-2" tabindex="0">      ┌──────────────────────┐</span>
<span class="ln" data-note="item-7-line-3" tabindex="0">      │ W WongStack          │</span>
<span class="ln" data-note="item-7-line-4" tabindex="0">      │ ──────────────────── │</span>
<span class="ln" data-note="item-7-line-5" tabindex="0">      │ page                 │</span>
<span class="ln" data-note="item-7-line-6" tabindex="0">      └──────────────────────┘</span>
<span class="ln" data-note="item-7-line-7" tabindex="0">AFTER</span>
<span class="ln" data-note="item-7-line-8" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-7-line-9" tabindex="0">│ W WongStack          +[Sign out] │</span>
<span class="ln" data-note="item-7-line-10" tabindex="0">│ ──────────────────────────────── │</span>
<span class="ln" data-note="item-7-line-11" tabindex="0">│       page, as wide as before    │</span>
<span class="ln" data-note="item-7-line-12" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Copy app link is removed.</b> You send people the website's address yourself.</div></div></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>A manager finds themselves in the table.</b> A manager's own row is marked <i>You</i>, where a separate <i>You can use</i> box sat above the tabs. The owner's row tells them who picks managers.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> Tick boxes to change several people at once. Search, sorting or filters. A people-by-apps grid. Setting an app or a key level from a list. A change to the Home page beyond its top bar. Tailwind and shadcn, which get their own plan right after this one. A change to what a person can do, to how it is checked, or to who can sign in.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what should happen when you pick a row → chose the role in the row, saved at once, and the rest on the person's page with the tabs still showing.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked whether tick boxes should change several people at once → chose one at a time.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what should happen to <i>Copy app link</i> → chose to remove it: &quot;we'll just send them the website for them to log in&quot;.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what next after the summary of the rework → chose to plan it.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the Access page gets wider on a computer, because five columns do not fit the shared narrow column; this reverses the morning's non-goal, which he set before asking for a table.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a role picked in the row offers <i>Undo</i>, because moving someone onto a role replaces their own ticks and one slip in a dropdown would lose them.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: apps and key levels stay written out in the row, not shown as counts, because he said this morning that it was hard to see who has what.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the Home page keeps its <i>Connect your assistant</i> box, because that is where a new person lands.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the dropdown starts open for someone who manages nothing, because connecting is the only thing Access offers them.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: Roles, Apps and Keys rows open on a click and carry no menu, because each has one thing to do.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a manager's <i>You can use</i> box and the line naming the owner give way to their own row marked <i>You</i> and the owner's row, because both said what the table now shows.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: step-left notices still show only on the view they belong to, in the one spot, because showing every notice on every view would add noise.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: this is not the people-by-apps grid he turned down this morning, because each view stays a plain list of its own things.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what next for the finished plan → chose to build it now, with a preview before anything is published.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: <i>Try again</i> stays in a removed person's menu while their sign-out is unfinished, because dropping it would lose the retry of a failed sign-out.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: only someone who manages Access gets the wider page, because an employee's view has no table and reads better in the narrow column.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the People tab counts the owner and current people, not removed ones, because the count should say who can use the app.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build: all code, tests, the wiki page and the changelog entry are written and the local checks pass; the preview walk (task 6.2) is left, and the kept check for adding a person still expects <i>Copy app link</i> and needs recording again.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Preview walk: passed at a computer and a phone width; a manager's view, a waiting sign-in and the non-manager view are shown by code tests only.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked, after seeing the preview, for three changes → chose a popup for <i>Connect your assistant</i> in place of the dropdown, a top bar that spans the screen, and a sign-out button.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked when the switch to Tailwind and shadcn should happen → chose right after this one, as its own plan; this change keeps the current plain style.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: someone who manages nothing sees the connect steps on the page, not in a popup, because a popup that opens by itself is in the way.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: <i>Sign out</i> shows on every page and only where the site has a sign-in, because an open site has no session to end.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the page under the bar keeps its width, because he asked for the bar to extend, not the pages.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build: the popup, the full-width bar and <i>Sign out</i> are written and the local checks pass; <i>Sign out</i> reads one new yes-or-no from the app, so each page makes one more request. The second preview walk (task 7.4) is left.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Archive checkpoint: asked whether to publish after the second preview walk → chose to publish; built, both walks passed, numbered 33.4.0. Left for a person: click <i>Sign out</i> once on the live app.</li>
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
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
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
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
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
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
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
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
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

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
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
