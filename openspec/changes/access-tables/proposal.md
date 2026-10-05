# Access lists you can scan, in a frame that stays put

**Status:** in-progress

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
- **Connect your assistant becomes a dropdown.** It sits at the top of Access, closed, and opens to the same prompt and steps as today. For someone who manages nothing it starts open, as connecting is what they came for. The Home page keeps its box.
  ```text
  closed                       open
  ┌─────────────────────────┐  ┌─────────────────────────┐
  │ Access                  │  │ Access                  │
  │ [Connect your          ]│  │ [Connect your          ]│
  │ [assistant            ▾]│  │ [assistant            ▴]│
  │ People Roles Apps Keys  │  │ Signed in as you@...    │
  │ ...                     │  │ [Copy setup prompt]     │
  └─────────────────────────┘  │ Paste it into your      │
                               │ assistant.              │
                               │ People Roles Apps Keys  │
                               └─────────────────────────┘
  ```
- **Copy app link is removed.** You send people the website's address yourself.
- **A manager finds themselves in the table.** A manager's own row is marked *You*, where a separate *You can use* box sat above the tabs. The owner's row tells them who picks managers.

**Non-goals:** Tick boxes to change several people at once. Search, sorting or filters. A people-by-apps grid. Setting an app or a key level from a list. A change to the Home page. A change to what a person can do, to how it is checked, or to who can sign in.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `employee-onboarding`: adding a person no longer hands the owner an app link to share; the employer changes a person's role from the People list with an undo; the views and notices keep one place on every Access screen; the owner is listed among the people.

## Impact

- `app/src/apps/access/`: the four list views, `View.tsx`, `Page.tsx`, `Owner.tsx`, `App.tsx`, `Own.tsx`, `Labels.tsx`, `Notices.tsx`, `Access.css`, new small parts for the table frame, the row menu and the role dropdown, and their tests.
- `app/src/components/AssistantSetup.tsx`: unchanged content, wrapped by Access in a dropdown.
- `app/src/lib/access.ts` and `app/worker/employee-access/members.ts`: the status response drops `origin` if nothing else reads it. No save route changes: the role save already exists.
- `schema/seed.sql`: a removed person on the practice list if none is there, so a preview shows that row.
- `wiki/stack/employee-access.md`, `CHANGELOG.md` (a `minor` entry), and the spec above.
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
