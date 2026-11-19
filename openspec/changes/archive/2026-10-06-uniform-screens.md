<!-- openspec-archive v1 2026-10-06-uniform-screens -->
<!-- file proposal.md utf8 17762 -->
# Screens that match

**Status:** ready-to-ship

**Branch:** access-ui-consistency

**Open questions:** none

## Why

The screens don't match each other. Home and the small apps sit in a narrow centred column, Access is almost twice as wide, and a person's page shrinks back to narrow. Rows in Access are different heights, questions show up in two different ways, and *Connect your assistant* sits in three places without saying what to do.

## What Changes

- **Every screen starts at the same left edge.** One wide frame holds Home, each small app and Access. Every screen fills that frame: Home lays its apps side by side, a small app's fields share a line, and a table uses it all. The logo in the top bar lines up with that edge. Nothing jumps sideways when you move between screens.
  ```text
  BEFORE
    Home         Access       A person
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │  ┌────┐  │ │┌────────┐│ │┌────┐    │
  │  │    │  │ ││        ││ ││    │    │
  │  └────┘  │ │└────────┘│ │└────┘    │
  └──────────┘ └──────────┘ └──────────┘
   narrow,      wide         narrow,
   centred                   left

  AFTER
    Home         Access       A person
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │┌──┬──┬──┐│ │┌────────┐│ │┌───┬────┐│
  ││  │  │  ││ ││        ││ ││   │+   ││
  │└──┴──┴──┘│ │└────────┘│ │└───┴────┘│
  └──────────┘ └──────────┘ └──────────┘
   one left edge, one width, every screen
  ```
- **Every row in an Access list is one line.** A person's row shows who, whether they can sign in, their role, and a short count such as *2 apps, 1 key*. The names of the apps and keys show when you open the person. A row where an app can't do its job yet still says so, as *1 gap*. *You* and *Manager* sit beside the name. Roles, Apps and Keys follow the same rule. On a phone a row still stacks into short lines, now the same few for everyone.
  ```text
  BEFORE
  ┌──────────────────────────────────────────────┐
  │ ada@…    Practice  [Helpers ▾]  Apps (Hello) │
  │                                 Keys (Read)  │
  │ casey@…  Removed   No role      No apps      │
  │ dana@…   Practice  [Own set ▾]  Apps (Hello) │
  │                    Manager           (Tips)  │
  │                                 Keys (Read)  │
  └──────────────────────────────────────────────┘

  AFTER
  ┌──────────────────────────────────────────────┐
  │ you@…  You      Can sign in  Owner    All    │
  │ ada@…           Can sign in  Helpers▾ 1 app,…│
  │ casey@…         Removed      No role  None   │
  │ dana@… Manager  Can sign in  Own set▾ 2 apps…│
  │ eli@…           Invited      Own set▾ ! 1 gap│
  └──────────────────────────────────────────────┘
  ```
- **The four view names are the title.** *People 5 · Roles 1 · Apps 2 · Keys 1* is the heading of the list under it, so the name is no longer written twice. The add button sits at the right end of that line on every view. Apps and Keys have nothing to add by hand, so a quiet line under their list says the assistant adds them.
  ```text
  BEFORE                    AFTER
  ┌───────────────────────┐ ┌───────────────────────┐
  │ Access      [Connect] │ │ Access                │
  │ People Roles Apps Keys│ │ People Roles … [+ Add]│
  │ ┌ Practice list ────┐ │ │ ┌ Practice list ────┐ │
  │ └───────────────────┘ │ │ └───────────────────┘ │
  │ People        [+ Add] │ │ ada@…  Helpers  1 app │
  │ ada@…  Helpers  …     │ │ bo@…   Helpers  1 app │
  └───────────────────────┘ └───────────────────────┘
  ```
- **A person, role, app or key opens in a side panel.** Click a row and a panel slides in from the right with its fields, *Save* and *Cancel*. The list stays where it was, with that row marked. Adding a person or a role uses the same panel. The panel has its own address, so a link or the Back button still works. Inside it the boxes round *Apps*, *Keys* and *Managing* are gone; a heading and space set each group apart. On a phone the panel fills the screen.
  ```text
  ON A COMPUTER
  ┌──────────────────────────────────────────────┐
  │ Access                                       │
  │ People 5  Roles 1  Apps 2  Keys 1    [+ Add] │
  │ ─────────────────────┬────────────────────── │
  │ ada@…    Helpers ▾   │ eli@example.com     ✕ │
  │ bo@…     Helpers ▾   │ Invited               │
  │ dana@…   Own set ▾   │                       │
  │▶eli@…    Own set ▾   │ Role [Own set ▾]      │
  │                      │                       │
  │                      │ Apps                  │
  │                      │ [x] Hello             │
  │                      │ [ ] Tip calculator    │
  │                      │                       │
  │                      │ Managing              │
  │                      │ [ ] Can manage Access │
  │                      │                       │
  │                      │ [Save access] Cancel  │
  └──────────────────────┴───────────────────────┘

  ON A PHONE
  ┌────────────────────┐
  │ eli@example.com  ✕ │
  │ Invited            │
  │ Role [Own set ▾]   │
  │ Apps               │
  │ [x] Hello          │
  │ [ ] Tip calculator │
  │ [Save access]      │
  │  Cancel            │
  └────────────────────┘
  ```
- **Every question is a popup.** *Remove eli?* and *Leave without saving?* open over the page with two buttons, the way Connect does. Today they are a box added under the list, easy to miss on a long one. What each question says, and what happens on each answer, stays the same.
  ```text
  BEFORE                 AFTER
  ┌──────────────────┐   ┌──────────────────┐
  │ ada@…            │   │ ada@…            │
  │ bo@…             │   │ ┌──────────────┐ │
  │ eli@…            │   │ │ Remove eli@…?│ │
  │ ┌──────────────┐ │   │ │ They are     │ │
  │ │ Remove eli@…?│ │   │ │ blocked at   │ │
  │ │ [Remove] [No]│ │   │ │ once.        │ │
  │ └──────────────┘ │   │ │ [Remove] [No]│ │
  └──────────────────┘   │ └──────────────┘ │
                         └──────────────────┘
  ```
- **Connect your assistant is three numbered steps, reached from one place.** The card on Home is the one way in. The button on Access, and the box Access shows people who manage nothing, go away. The popup says what an assistant is, gives three steps with one main *Copy* button, names who you sign in as, and ends with what you can ask once it works and which apps it reaches. Copying by hand stays, as a small link.
  ```text
  ┌──────────────────────────────────────────┐
  │ Connect your assistant                 ✕ │
  │ Use your apps from an AI assistant on    │
  │ your computer, such as Claude Code or    │
  │ Codex.                                   │
  │                                          │
  │ 1  Copy your setup message               │
  │    [ Copy ]                              │
  │                                          │
  │ 2  Paste it into your assistant's chat   │
  │                                          │
  │ 3  Approve the sign-in it opens          │
  │    You sign in as ada@example.com        │
  │                                          │
  │ Then ask it: "What can I do here?"       │
  │ It can use: Hello, Tip calculator        │
  │                                          │
  │ Can't copy? Show the message             │
  └──────────────────────────────────────────┘
  ```
- **When Connect can't load, it says so plainly.** Today it tells someone who is already signed in to sign in. It will say the steps couldn't load and offer *Try again*. When setup isn't ready on this app yet, the popup says that in place of step 1 and shows no *Copy* button.
  ```text
  COULDN'T LOAD              NOT READY YET
  ┌───────────────────────┐  ┌───────────────────────┐
  │ Connect your assistant│  │ Connect your assistant│
  │ The steps couldn't    │  │ Setup isn't ready on  │
  │ load.                 │  │ this app yet. Ask the │
  │ [Try again]           │  │ owner.                │
  └───────────────────────┘  └───────────────────────┘
  ```
- **Screens you built move with the frame.** After the update, a mini app your assistant built starts at the same left edge as the rest and has the whole frame to use. Its address and data stay as they are, and nothing needs doing by hand.

**Non-goals.** No change to who can use what, to what a save does, or to colours and fonts. Home's welcome guide stays as it is. What Connect does once pasted stays the same: adding the project code to it is planned in the workspace *Connect installs the project*.

## Decision log

- **2026-10-05** — Asked how wide the screens should be so moving between them stops jumping → chose one frame: every screen starts at the same left edge, text and forms keep a readable width, tables use the full frame.
- **2026-10-05** — Asked how a row in the Access lists should look → chose one line each, with a short count such as *2 apps, 1 key*, and the names shown when the person is opened.
- **2026-10-05** — Asked where a person, role, app or key should open → chose a side panel over the list, filling the screen on a phone.
- **2026-10-05** — Asked what Connect your assistant should become → chose three numbered steps with one way in, the card on Home; the Access button and box go away.
- **2026-10-05** — Asked how this fits with the workspace *Connect installs the project*, which also changes the Connect popup → chose to keep going here; that work adds its step to the new popup.
- **2026-10-05** — Assumed: the remove and leave questions become popups, because Connect already is one and two ways of asking is one of the things that reads as uneven.
- **2026-10-05** — Assumed: a row still says when an app can't do its job yet, as a count beside the totals, because that warning is promised without opening the person and a one-line row must not hide it.
- **2026-10-05** — Assumed: the view names become the list's title and the add button moves onto that line, because *People* written twice and a top-right spot that changes job were both on the list of what looks uneven.
- **2026-10-05** — Assumed: *Manager* moves beside the person's name, because under the role it made that row two lines.
- **2026-10-05** — Assumed: a key that isn't saved yet opens the panel too and shows its next step there, because the copy button for that step can't fit in a one-line row.
- **2026-10-05** — Assumed: someone who manages nothing sees only what they can use on Access, because Connect has one way in and Home's card is on the screen they start from.
- **2026-10-05** — Assumed: the popup names Claude Code and Codex only as examples after "an AI assistant on your computer", because the app must not read as needing one named assistant.
- **2026-10-05** — Assumed: this is a `minor` release with no hand step, because screens keep their addresses, data and parts, and only where they sit changes.
- **2026-10-05** — Build: each task's own test run, the "fails first, then passes" steps included, moved to the one run in group 6, because the build writes all code and tests before running any. Every promise those steps checked is still held by a test.
- **2026-10-05** — Build: the side panel leaves the page beside it in use, with no dimming, because the plan keeps the four views and the marked row usable while an item is open. A press on the page closes the panel.
- **2026-10-05** — Build: Apps and Keys count who has something by kind, such as *Owner, 1 role, 2 people*, because a bare number does not say whether a role or a person holds it. Keys keeps one column per level.
- **2026-10-05** — Build: *Can't copy? Show the message* sits under the *Copy* button in step 1, not at the foot of the popup, because the copy button and its fallback are one part.
- **2026-10-06** — Build: the workspace was moved up to 35.0.1 before building, and the first checkpoint is saved with the walk on the preview still to do, because the plan was drawn against the screens that release published.
- **2026-10-06** — Walk: the owner's row was shorter than the rows that hold a role dropdown, so every row in the four lists now has one height on a computer.
- **2026-10-06** — Asked, on the preview, about Home sitting in the left half of the frame with the right half empty → chose every screen fills the frame; text and forms no longer keep a narrower width. Home's apps sit in a grid, and Hello's and the tip calculator's fields share a line on a computer.
- **2026-10-06** — Asked what to do about two things the pictures showed, a Keys line cut short and the side panel covering the top bar → chose to fix both: the Keys list counts the apps that use a key and the key's panel names them, and on a computer the panel starts under the top bar, which now stays in view when the page scrolls.
- **2026-10-06** — Archive checkpoint: 35.1.0, *Connect your assistant installs the project*, was published while this was built and changed eleven of the same files. Both are kept: the popup's three steps now also say when the connection brings the whole project, a person who lacks Project code sees Home's card greyed and what the app answers in place of the steps, and that change's tests for Access's Connect button moved onto the popup, since Access no longer has one.
- **2026-10-06** — Check: `app/src/apps/access/Connect.test.tsx` is deleted, because it tested the Connect button and box on Access, which this change removes; its three cases (the project when ready, the apps alone when off, who to ask without Project code) now run against the popup in `app/src/components/AssistantSetup.test.tsx`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mini-apps`: *Every page shares one stylesheet* promises one frame with one left edge, in place of a narrow column.
- `employee-onboarding`: *Access lists line up and keep one frame* promises one-line rows and an opened item shown with its list; a new requirement promises Connect's numbered steps, its one entry and its plain failure state.
- `key-access`: the People and Roles lists show counts and a gap count, with the names and levels where the person or role is opened; the level scenario reads the level from the opened person.

## Impact

- `app/src/Layout.tsx`, `app/src/index.css`, `app/src/style.test.ts`: the frame.
- `app/src/pages/home/`, `app/src/apps/hello/`, `app/src/apps/tips/`, `app/src/apps/AppPage.tsx`, `app/src/pages/not-found/`: each fills the frame.
- `app/src/apps/access/`: lists, the panel, the questions, the header; `Connect.tsx` removed.
- `app/src/components/`: `ConnectDialog.tsx`, `AssistantSetup.tsx`, `CopyText.tsx`; two added parts under `ui/` (`sheet`, `alert-dialog`).
- `.agents/verification/journeys/employee-onboarding/`: the three kept journeys are recorded again.
- `wiki/stack/employee-access.md`, `wiki/stack/mini-apps.md`, `wiki/stack/employee-project.md`, `wiki/people/matthew-wong.md`, `CHANGELOG.md` (`minor`).
- Builds on 35.0.0, the release that moved every screen onto the ready-made parts.

<!-- end proposal.md -->
<!-- file design.md utf8 9080 -->
# Design

## Context

35.0.0 put every screen on shadcn parts and Tailwind, with one stylesheet, `app/src/index.css`. Layout was left as it was:

- `Layout.tsx` puts `main` in `mx-auto max-w-lg`, and Access breaks out of it with a negative-margin class, `WIDE`, in `access/App.tsx`. An opened page then narrows its form to `max-w-lg` again.
- Each Access view returns either its list or a page (`People` returns `PersonPage` when the address names one), so opening one replaces the list.
- `Confirm.tsx` is a card in the page flow; `ConnectDialog.tsx` is a `Dialog`.
- `AssistantSetup.tsx` has two shapes, a card and a popup body, and three callers: Home's card, `access/Connect.tsx`, and `access/App.tsx` for a person who manages nothing.
- List cells hold `SetLabels`: a wrapping row of badges per app and key level, plus `Gaps`.

The checkout this is built in must hold 35.0.0: `app/src/components/ui/` exists there.

## Goals / Non-Goals

**Goals:**

- One container decides every page's width and left edge; no page overrides it.
- One way to open an item, one way to ask a question, one place for Connect.
- Keep every address, every server call and every saved shape as it is.

**Non-Goals:**

- No Worker change: `app/worker/` is untouched, the setup prompt's text included.
- No new colour, font or token in `index.css`.
- No change to `Tutorial.tsx`.

## Decisions

### The frame lives in `Layout.tsx`

`main` becomes `mx-auto w-full max-w-[60rem] px-4`, and the bar's contents sit in a div with the same three classes, so the logo and every `h1` share a left edge. Every page takes the frame and none narrows itself: Home lays its app cards in a grid (`sm:grid-cols-2 lg:grid-cols-3`), Hello puts its field and button on one line, Tips puts its three fields on one line, and Access's lists take it all. A check fails on `max-w-lg` in a screen. `WIDE` and its `calc` margins are deleted.

*Over a `width` prop per route:* the route table would need to know each app's shape, and a mini app the assistant builds later would have to register it. A class on the page is local and matches how [mini apps](../../../wiki/stack/mini-apps.md) are written.

*Over centring the narrow pages in the wide frame:* that keeps the jump the proposal removes.

`@container` stays on Access's root, so rows still stack by the room they have.

### An opened item is a `Sheet` driven by the address

Add the `sheet` part (`npx shadcn@latest add sheet` from `app/`). Each view always renders its list; when the address names an item, or `new`, it also renders the item in `<Sheet open>` on the right, `w-full sm:max-w-md`. `onOpenChange(false)` navigates to the view's home through the same `hold` check `Page.tsx` has today, so *✕*, Escape, a click outside and *Cancel* all ask when there are changes. `Page.tsx` becomes the sheet's frame: title, fields in a scrolling body, *Save* and *Cancel* in a footer that stays in view. The breadcrumb line and the page's own `h2` go; `SheetTitle` names the item.

*Over local `useState` for which item is open:* the address already names it, the three kept journeys and the save redirect rely on it, and Back closes the panel for free.

*Over a two-column page with no overlay:* at 60rem the list's four columns do not fit beside a form; an overlay keeps the list at its width.

The list's row for the open item gets `aria-current="true"`, a `bg-muted` fill and a bar on its leading edge, so it is not marked by colour alone.

`Group` in `Fields.tsx` loses its border and padding and keeps its `fieldset` and bold `legend`, with a larger gap between groups than within one.

### Questions use `AlertDialog`

Add the `alert-dialog` part. `Confirm.tsx` keeps its props and renders an `AlertDialog` that is open while mounted: the cancel button is the default focus, the action is the one solid button. `RowMenu` already runs `modal={false}`, so a pick that opens a question hands it the keyboard. The leave question opens over the sheet; Radix stacks the two and returns focus to the sheet on *Keep editing*.

*Over `Dialog`:* `AlertDialog` does not close on an outside click, which is right for *Remove*.

### Rows are text, not badges

`levels.ts` gains `summary(status, set)`, returning the count line (*2 apps, 1 key*, *No apps*, *1 app*) and the number of gaps from the existing `gaps()`. People's last column becomes that line with `! 1 gap` after it in semibold when there is one; the owner's row says *Everything*. *Manager* joins *You* beside the email. Roles shows the same summary and a people count; Apps shows *Uses* and a holders count; Keys shows saved, used by, and one cell with a count per level. `SetLabels`, `Names` and `Gaps` stay for the sheet (`RoleSet`) and for `Own.tsx`.

Cells drop `align-top` and wrapping for `truncate` on the email, with the full email in `title`. The `STACK` classes for a narrow container stay.

An unsaved key's row says its state in words and opens the sheet, where `FinishStep` shows the request to copy.

### The views are the heading

`View.tsx`'s `nav` becomes one flex row: the four links, then an `add` slot pushed to the end. `Table.tsx` drops its visible `h2` and labels the table from the current link's id. Apps and Keys pass no `add`; their hint moves to a muted line under the table. `App.tsx`'s header row is the `h1` alone.

### Connect has one body

`AssistantSetup.tsx` loses the `popup` prop and the card shape and is rendered only by `ConnectDialog.tsx`. Its ready state is an ordered list of three steps; step 1 holds `CopyText` with the solid button, step 3 the email. Under the list: the line to try and the apps. `CopyText` takes a `variant` for its button and its `details` summary reads *Can't copy? Show the message*. The error text no longer mentions signing in. `access/Connect.tsx` is deleted, `access/App.tsx` stops rendering `AssistantSetup` for a person who manages nothing, and `access/app.json`'s description drops *Connect your assistant*.

The workspace *Connect installs the project* adds its step to this list; this change leaves `setup.ts` and `prompt.ts` alone so the two do not meet in the Worker.

## Risks / Trade-offs

- [A screen an install built assumed the centred narrow column] → It moves to the frame's left edge and stretches to the frame's width; the changelog says so and says how to lay it out, and nothing breaks. An install screen that set its own `max-w-*` keeps it.
- [One-line rows hide which apps a person has] → Chosen knowingly; the gap count stays on the row and the sheet names everything.
- [Two overlays stacked: the sheet, then the leave question] → `Leaving.test.tsx` covers focus going to the question and back; the kept journey for leaving is recorded again on the preview.
- [The three kept journeys click through pages that no longer exist as pages] → They are recorded again in the last group, after the build is saved.
- [`components/ui/` grows by two copied parts] → That folder is already exempt from coverage, dead-code and duplicate checks; no new exemption.

## Migration Plan

No data moves. A release entry at `minor`; installs get the new frame and Access on their next update with no hand step.

## UX

### Use-case brief

- **Who and the job.** The owner or a manager, at a desk, about weekly: add a person, change what one person can use, remove one. Done is the list showing the change and *Saved*. Everyone else, once per computer: connect their assistant; done is the assistant answering *What can I do here?*
- **Context.** A computer for both jobs: Access is managed at a desk, and Connect is pasted into an assistant on that computer. A phone must still work, so the panel fills the screen and rows stack.
- **Common vs edge.** Common: change one person's role (stays in the row) or apps (the panel). Edge: a key not saved yet, a removed person added back, a gap between an app and a key level.
- **Frequency, assumed.** A list is scanned far more often than an item is opened, so the list gets the density and the panel gets the air.
- **Closest existing screen.** The People list as 33.4.0 left it; the other three views mirror it.

### Flow

Home → Access → click a row → change → *Save access* → the list, with *Saved*. Connect: Home → the card → *Copy* → paste in the assistant → approve.

### Hierarchy

- **A list:** the add button is the one solid button. Counts and sign-in state are muted; names are not.
- **The panel:** *Save* is solid; *Cancel* and *Remove role* are outline.
- **A question:** the action is solid, the way out is outline and focused first.
- **Connect:** *Copy* is solid; *Try again* is the one button in the failed state.

### Review

[review.html](review.html). What Changes item 1 sketches the frame, 2 the rows, 3 the list's heading, 4 the panel on a computer and a phone, 5 a question, 6 Connect's steps, 7 its two failure states.

### Components

Existing: `Table`, `Button`, `Badge`, `Dialog`, `DropdownMenu`, `NativeSelect`, `Alert`, `Input`, `Label`, `Card`. New, both copied from shadcn: `Sheet` for the panel, `AlertDialog` for questions.

<!-- end design.md -->
<!-- file tasks.md utf8 6323 -->
# Tasks

## 1. The frame

- [x] 1.1 Confirm the checkout holds 35.0.0: `app/src/components/ui/button.tsx` exists and `VERSION` is 35.0.0 or later. If not, stop and report it; nothing below applies to the older screens. Verify by reading both.
- [x] 1.2 In `app/src/Layout.tsx`, give `main` and the bar's contents the same container (`mx-auto w-full max-w-[60rem] px-4`). Update `app/src/style.test.ts`: the frame and the bar share one max width and left padding, and no page sets a negative margin. Verify the test fails with the old `max-w-lg` on `main`, then passes.
- [x] 1.3 Wrap the text and form pages in `max-w-lg`: `pages/home/Home.tsx`, `apps/hello/App.tsx`, `apps/tips/App.tsx`, `apps/AppPage.tsx`'s stopped states, `pages/not-found/NotFound.tsx`. Verify `Home.test.tsx`, `hello/App.test.tsx`, `tips/App.test.tsx` and `router.test.tsx` pass with their assertions unchanged.
- [x] 1.4 Delete `WIDE` from `apps/access/App.tsx` and keep `@container` on its root. Update `apps/access/style.test.ts`: Access has no width or margin of its own. Verify it fails with `WIDE` restored, then passes.

## 2. Access lists

- [x] 2.1 Add `summary(status, set)` to `apps/access/levels.ts`: the count line and the number of gaps. Cover it in `levels.test.ts`: no apps, one app, several apps and keys, a set with a gap. Verify the new cases pass.
- [x] 2.2 Make every row one line: People (`summary`, *Everything* for the owner, *Manager* beside *You*), Roles (summary, people count), Apps (uses, holders count), Keys (saved, used by, a count per level; an unsaved key's state in words). Truncate a long email with the full one in `title`. Update `App.test.tsx`, `Roles.test.tsx` and `Grants.test.tsx` to read counts and the gap mark where they read badges. Verify they pass, and that a row with a gap still shows it without opening the person.
- [x] 2.3 Move the heading into the views: `View.tsx` lays the four links and an `add` slot on one line; `Table.tsx` drops its visible `h2` and labels the table from the current link; Apps and Keys put their hint under the table. Update `style.test.ts` and `App.test.tsx`: each table is named by its view, and the add button is in the views' line. Verify they pass.

## 3. The side panel and the questions

- [x] 3.1 Add the `sheet` and `alert-dialog` parts with the shadcn command from `app/`. Verify both files land in `app/src/components/ui/` and `npm run build:app` succeeds.
- [x] 3.2 Turn `Page.tsx` into the sheet's frame, opened by the address and closed through the existing `hold` check; each view renders its list always and its item in the sheet. Mark the open row with `aria-current` and a leading bar. Drop the border from `Group` in `Fields.tsx`. Update `PersonPage.test.tsx`, `Roles.test.tsx`, `Grants.test.tsx` and `App.test.tsx`: the list is still in the document with an item open, the sheet is named by the item, and Escape, *Cancel* and *✕* return to the view's address. Verify they pass.
- [x] 3.3 Open an unsaved key in the sheet with its next step and the request to copy. Verify with a case in `Grants.test.tsx` or `App.test.tsx` for the owner and for a manager.
- [x] 3.4 Rebuild `Confirm.tsx` on `AlertDialog`: the way out focused first, the action solid. Update `Leaving.test.tsx` and the removal cases in `App.test.tsx`: the question is a dialog, an outside click does not answer it, *Keep editing* returns focus to the sheet with the change kept, and a removal still saves once. Verify they pass.

## 4. Connect

- [x] 4.1 Rewrite `components/AssistantSetup.tsx` as the one popup body: three numbered steps, who signs in, what to ask, the apps, and the two failure states with no mention of signing in. Give `CopyText.tsx` a button `variant` and the *Can't copy? Show the message* summary. Add `components/AssistantSetup.test.tsx` for loading, ready, not ready and failed; update `CopyText.test.tsx`. Verify they pass.
- [x] 4.2 Delete `apps/access/Connect.tsx`; stop rendering `AssistantSetup` in `apps/access/App.tsx`; reword `apps/access/app.json`'s description. Update `App.test.tsx` (no Connect button, and a person who manages nothing sees only what they can use) and `AppList.test.tsx` (the card still opens the popup). Verify they pass, and a search of `app/src` finds one caller of `AssistantSetup`.

## 5. Docs and the release

- [x] 5.1 Update `wiki/stack/employee-access.md`: one-line rows, the views as the heading, the side panel, questions as popups, no Connect button. Update `wiki/stack/mini-apps.md`: the frame and the readable width a page keeps inside it. Update `wiki/stack/employee-project.md` where it says where the prompt is copied from. Verify `node scripts/check-payload-links.mjs` passes.
- [x] 5.2 Add to `wiki/people/matthew-wong.md`: one left edge on every screen, list rows of one height, an item opens beside its list, one way to ask a question. Verify the page stays linked from `wiki/people/README.md`.
- [x] 5.3 Add `## Next (minor) — Screens that match` at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note: nothing by hand, and a screen you built moves to the shared left edge at its own width. Check whether `payload-files.json` or `scripts/retired-names.json` names `apps/access/Connect.tsx` and update them if so. Verify `node scripts/check-retired-names.mjs` passes.

## 6. Verification

- [x] 6.1 From `app/`, run `npm test` and `npm run build:app`. Verify both pass with coverage, dead-code and duplicate checks green.
- [x] 6.2 Run `node .github/scripts/checks.mjs --worktree`. Verify every step passes.
- [x] 6.3 Run `openspec validate "uniform-screens" --strict --no-interactive`. Verify it reports valid.
- [x] 6.4 `/save`, then walk the preview at a computer width and a phone width, light and dark: Home, Hello and Access share a left edge; every People row is one line; a person opens in the panel with the list behind it; leaving with a change asks in a popup; Access has no Connect button. Walked on 2026-10-06, verdict SUCCESS, in the pull request's walkthrough comment. Two parts moved off this task: Connect's three steps showed only their couldn't-load state, because the preview refuses the checker the setup message, and wait on a signed-in person's look (an open `verify` thread in memory); the three kept journeys are recorded again by the publish's own walk.

<!-- end tasks.md -->
<!-- file specs/employee-onboarding/spec.md utf8 2555 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Access lists line up and keep one frame

Each of Access's four views SHALL list its people, roles, apps or keys as rows that share the same columns, each row one line on a computer, readable on a phone without sideways scrolling. The people list SHALL include the employer, marked as the owner, with nothing on that row to change. A person's row SHALL keep the same parts whether they can sign in, are waiting, or were removed. Opening a person, role, app or key SHALL show it with its list still in place, at an address that opens it again, and closing it SHALL return to the list. The switch between the views and the place where Access reports a save, a practice list or an unfinished step SHALL stay the same on every Access screen, an opened person, role, app or key included. A removal and leaving with unsaved changes SHALL ask in the same way.

#### Scenario: The employer opens a person

- **WHEN** the employer opens a person from the people list
- **THEN** the person's fields show with the people list and the switch between the four views still in place, and closing them shows the list as it was

#### Scenario: A manager reads the people list

- **WHEN** a manager opens Access
- **THEN** the list names the owner on its first row and offers nothing to change or remove on that row

## ADDED Requirements

### Requirement: Connecting an assistant is numbered steps from one place

The app SHALL offer Connect your assistant from one place, the home page's list, and no other screen SHALL carry a second copy of the steps. The steps SHALL be numbered, SHALL say what an assistant is, who the person signs in as and which apps the connection reaches, and SHALL say what the person can do once connected. When the steps can not be loaded, the app SHALL say so and offer to try again, and SHALL NOT tell a signed-in person to sign in. When there is nothing to copy, because setup is not ready on this app or the person lacks Project code, the app SHALL say what to do next and offer nothing to copy.

#### Scenario: A person follows the steps

- **WHEN** a signed-in person opens Connect your assistant from the home page
- **THEN** they see numbered steps that start with copying their setup message, name their own email and their apps, and end with what to ask their assistant

#### Scenario: The steps can't load

- **WHEN** the setup steps fail to load for a signed-in person
- **THEN** the popup says the steps couldn't load and offers to try again, with no instruction to sign in

<!-- end specs/employee-onboarding/spec.md -->
<!-- file specs/key-access/spec.md utf8 2569 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The employer sees and sets key levels in Access

Access SHALL show the employer each person's level for each key, each app's keys and whether it looks things up or changes them, and for each key whether the app holds it, what uses it and who has which level. The employer SHALL be able to set a level from the person or role, from the key, or from an app that uses the key, and a level set in any of them SHALL be the same level everywhere. A manager SHALL see and set the same. Only the employer or a manager SHALL change a level. Each signed-in person SHALL see their own apps and levels. No screen or response SHALL show a key's value. On a preview the employer SHALL be able to set levels against the practice list, with no effect on the live app's people.

#### Scenario: The employer sets a level

- **WHEN** the employer sets Stripe to Read for a person and saves
- **THEN** that person opened, the Stripe key opened and every app that uses Stripe show Read for them

#### Scenario: An employee tries to change a level

- **WHEN** an ordinary employee calls a level-changing operation
- **THEN** it is denied and no level changes

### Requirement: Access sets an app's key levels beside the app and shows each gap

Where a person or a role is opened, Access SHALL show the level of each key an app uses beside that app once the app is ticked, so the employer gives the app and sets the level in one place. A key that several ticked apps use SHALL remain one level, shown the same beside each. A key no ticked app uses SHALL still be settable in the same place. The People and Roles lists SHALL say how many apps and keys each person and role has, and SHALL say on the row when a held level is below what one of their apps does; the opened person or role SHALL name each app, each key with its level in words, and each such gap. A level or a gap SHALL never be marked by colour alone.

#### Scenario: The employer gives an app and lets it change things

- **WHEN** the employer ticks an app that changes things with Stripe for a person, picks Read & write beside that app and saves
- **THEN** the person has the app and Stripe: Read & write, and every other ticked app that uses Stripe shows the same level

#### Scenario: A person's app can't do its job yet

- **WHEN** a person has an app that changes things with Stripe and holds Stripe: Read
- **THEN** the People list marks that person's row as having a gap without the employer opening them, and opening them says that app can look up but not change

<!-- end specs/key-access/spec.md -->
<!-- file specs/mini-apps/spec.md utf8 1234 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Every page shares one stylesheet

The main app SHALL give every page, each mini app's included, one shared look from one stylesheet: the device's font, light or dark to match the device, and one frame whose left edge is the same on every page. Every page SHALL use the whole frame, none in a narrower column of its own, and a page SHALL never be wider than the screen. Every screen SHALL be built from one set of ready-made parts copied into the app, on a utility CSS framework. A page SHALL NOT carry a stylesheet of its own, and the app's checks SHALL fail when one does. The shared look SHALL provide coherent surfaces, text, accents, and visible keyboard focus, with readable contrast in both color modes.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's landing page, then /apps/hello/, then Access
- **THEN** all three show the same font, parts, and light or dark colors, and their headings start at the same left edge with their content reaching the same right edge

#### Scenario: A new mini app brings its own stylesheet

- **WHEN** a change adds a mini app whose folder holds a stylesheet
- **THEN** the app's checks fail and name that file

<!-- end specs/mini-apps/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-05

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 58131 fence=~~~ -->
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
<title>Review · 2026-10-06-uniform-screens</title>
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
<body data-change="2026-10-06-uniform-screens">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-06-uniform-screens</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The screens don't match each other. Home and the small apps sit in a narrow centred column, Access is almost twice as wide, and a person's page shrinks back to narrow. Rows in Access are different heights, questions show up in two different ways, and <i>Connect your assistant</i> sits in three places without saying what to do.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Every screen starts at the same left edge.</b> One wide frame holds Home, each small app and Access. Every screen fills that frame: Home lays its apps side by side, a small app's fields share a line, and a table uses it all. The logo in the top bar lines up with that edge. Nothing jumps sideways when you move between screens.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">BEFORE</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">  Home         Access       A person</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">┌──────────┐ ┌──────────┐ ┌──────────┐</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│  ┌────┐  │ │┌────────┐│ │┌────┐    │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│  │    │  │ ││        ││ ││    │    │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│  └────┘  │ │└────────┘│ │└────┘    │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">└──────────┘ └──────────┘ └──────────┘</span>
<span class="ln" data-note="item-1-line-8" tabindex="0"> narrow,      wide         narrow,</span>
<span class="ln" data-note="item-1-line-9" tabindex="0"> centred                   left</span>

<span class="ln" data-note="item-1-line-11" tabindex="0">AFTER</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">  Home         Access       A person</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">┌──────────┐ ┌──────────┐ ┌──────────┐</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">│┌──┬──┬──┐│ │┌────────┐│ │┌───┬────┐│</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">││  │  │  ││ ││        ││ ││   │+   ││</span>
<span class="ln" data-note="item-1-line-16" tabindex="0">│└──┴──┴──┘│ │└────────┘│ │└───┴────┘│</span>
<span class="ln" data-note="item-1-line-17" tabindex="0">└──────────┘ └──────────┘ └──────────┘</span>
<span class="ln" data-note="item-1-line-18" tabindex="0"> one left edge, one width, every screen</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Every row in an Access list is one line.</b> A person's row shows who, whether they can sign in, their role, and a short count such as <i>2 apps, 1 key</i>. The names of the apps and keys show when you open the person. A row where an app can't do its job yet still says so, as <i>1 gap</i>. <i>You</i> and <i>Manager</i> sit beside the name. Roles, Apps and Keys follow the same rule. On a phone a row still stacks into short lines, now the same few for everyone.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">BEFORE</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">┌──────────────────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│ ada@…    Practice  [Helpers ▾]  Apps (Hello) │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│                                 Keys (Read)  │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│ casey@…  Removed   No role      No apps      │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">│ dana@…   Practice  [Own set ▾]  Apps (Hello) │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">│                    Manager           (Tips)  │</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">│                                 Keys (Read)  │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">└──────────────────────────────────────────────┘</span>

<span class="ln" data-note="item-2-line-11" tabindex="0">AFTER</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">┌──────────────────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-13" tabindex="0">│ you@…  You      Can sign in  Owner    All    │</span>
<span class="ln" data-note="item-2-line-14" tabindex="0">│ ada@…           Can sign in  Helpers▾ 1 app,…│</span>
<span class="ln" data-note="item-2-line-15" tabindex="0">│ casey@…         Removed      No role  None   │</span>
<span class="ln" data-note="item-2-line-16" tabindex="0">│ dana@… Manager  Can sign in  Own set▾ 2 apps…│</span>
<span class="ln" data-note="item-2-line-17" tabindex="0">│ eli@…           Invited      Own set▾ ! 1 gap│</span>
<span class="ln" data-note="item-2-line-18" tabindex="0">└──────────────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The four view names are the title.</b> <i>People 5 · Roles 1 · Apps 2 · Keys 1</i> is the heading of the list under it, so the name is no longer written twice. The add button sits at the right end of that line on every view. Apps and Keys have nothing to add by hand, so a quiet line under their list says the assistant adds them.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">BEFORE                    AFTER</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">┌───────────────────────┐ ┌───────────────────────┐</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ Access      [Connect] │ │ Access                │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│ People Roles Apps Keys│ │ People Roles … [+ Add]│</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ ┌ Practice list ────┐ │ │ ┌ Practice list ────┐ │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│ └───────────────────┘ │ │ └───────────────────┘ │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">│ People        [+ Add] │ │ ada@…  Helpers  1 app │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">│ ada@…  Helpers  …     │ │ bo@…   Helpers  1 app │</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">└───────────────────────┘ └───────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A person, role, app or key opens in a side panel.</b> Click a row and a panel slides in from the right with its fields, <i>Save</i> and <i>Cancel</i>. The list stays where it was, with that row marked. Adding a person or a role uses the same panel. The panel has its own address, so a link or the Back button still works. Inside it the boxes round <i>Apps</i>, <i>Keys</i> and <i>Managing</i> are gone; a heading and space set each group apart. On a phone the panel fills the screen.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">ON A COMPUTER</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">┌──────────────────────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">│ Access                                       │</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">│ People 5  Roles 1  Apps 2  Keys 1    [+ Add] │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">│ ─────────────────────┬────────────────────── │</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">│ ada@…    Helpers ▾   │ eli@example.com     ✕ │</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">│ bo@…     Helpers ▾   │ Invited               │</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">│ dana@…   Own set ▾   │                       │</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">│▶eli@…    Own set ▾   │ Role [Own set ▾]      │</span>
<span class="ln" data-note="item-4-line-10" tabindex="0">│                      │                       │</span>
<span class="ln" data-note="item-4-line-11" tabindex="0">│                      │ Apps                  │</span>
<span class="ln" data-note="item-4-line-12" tabindex="0">│                      │ [x] Hello             │</span>
<span class="ln" data-note="item-4-line-13" tabindex="0">│                      │ [ ] Tip calculator    │</span>
<span class="ln" data-note="item-4-line-14" tabindex="0">│                      │                       │</span>
<span class="ln" data-note="item-4-line-15" tabindex="0">│                      │ Managing              │</span>
<span class="ln" data-note="item-4-line-16" tabindex="0">│                      │ [ ] Can manage Access │</span>
<span class="ln" data-note="item-4-line-17" tabindex="0">│                      │                       │</span>
<span class="ln" data-note="item-4-line-18" tabindex="0">│                      │ [Save access] Cancel  │</span>
<span class="ln" data-note="item-4-line-19" tabindex="0">└──────────────────────┴───────────────────────┘</span>

<span class="ln" data-note="item-4-line-21" tabindex="0">ON A PHONE</span>
<span class="ln" data-note="item-4-line-22" tabindex="0">┌────────────────────┐</span>
<span class="ln" data-note="item-4-line-23" tabindex="0">│ eli@example.com  ✕ │</span>
<span class="ln" data-note="item-4-line-24" tabindex="0">│ Invited            │</span>
<span class="ln" data-note="item-4-line-25" tabindex="0">│ Role [Own set ▾]   │</span>
<span class="ln" data-note="item-4-line-26" tabindex="0">│ Apps               │</span>
<span class="ln" data-note="item-4-line-27" tabindex="0">│ [x] Hello          │</span>
<span class="ln" data-note="item-4-line-28" tabindex="0">│ [ ] Tip calculator │</span>
<span class="ln" data-note="item-4-line-29" tabindex="0">│ [Save access]      │</span>
<span class="ln" data-note="item-4-line-30" tabindex="0">│  Cancel            │</span>
<span class="ln" data-note="item-4-line-31" tabindex="0">└────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Every question is a popup.</b> <i>Remove eli?</i> and <i>Leave without saving?</i> open over the page with two buttons, the way Connect does. Today they are a box added under the list, easy to miss on a long one. What each question says, and what happens on each answer, stays the same.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">BEFORE                 AFTER</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">┌──────────────────┐   ┌──────────────────┐</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">│ ada@…            │   │ ada@…            │</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">│ bo@…             │   │ ┌──────────────┐ │</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">│ eli@…            │   │ │ Remove eli@…?│ │</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">│ ┌──────────────┐ │   │ │ They are     │ │</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">│ │ Remove eli@…?│ │   │ │ blocked at   │ │</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">│ │ [Remove] [No]│ │   │ │ once.        │ │</span>
<span class="ln" data-note="item-5-line-9" tabindex="0">│ └──────────────┘ │   │ │ [Remove] [No]│ │</span>
<span class="ln" data-note="item-5-line-10" tabindex="0">└──────────────────┘   │ └──────────────┘ │</span>
<span class="ln" data-note="item-5-line-11" tabindex="0">                       └──────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Connect your assistant is three numbered steps, reached from one place.</b> The card on Home is the one way in. The button on Access, and the box Access shows people who manage nothing, go away. The popup says what an assistant is, gives three steps with one main <i>Copy</i> button, names who you sign in as, and ends with what you can ask once it works and which apps it reaches. Copying by hand stays, as a small link.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-1" tabindex="0">┌──────────────────────────────────────────┐</span>
<span class="ln" data-note="item-6-line-2" tabindex="0">│ Connect your assistant                 ✕ │</span>
<span class="ln" data-note="item-6-line-3" tabindex="0">│ Use your apps from an AI assistant on    │</span>
<span class="ln" data-note="item-6-line-4" tabindex="0">│ your computer, such as Claude Code or    │</span>
<span class="ln" data-note="item-6-line-5" tabindex="0">│ Codex.                                   │</span>
<span class="ln" data-note="item-6-line-6" tabindex="0">│                                          │</span>
<span class="ln" data-note="item-6-line-7" tabindex="0">│ 1  Copy your setup message               │</span>
<span class="ln" data-note="item-6-line-8" tabindex="0">│    [ Copy ]                              │</span>
<span class="ln" data-note="item-6-line-9" tabindex="0">│                                          │</span>
<span class="ln" data-note="item-6-line-10" tabindex="0">│ 2  Paste it into your assistant's chat   │</span>
<span class="ln" data-note="item-6-line-11" tabindex="0">│                                          │</span>
<span class="ln" data-note="item-6-line-12" tabindex="0">│ 3  Approve the sign-in it opens          │</span>
<span class="ln" data-note="item-6-line-13" tabindex="0">│    You sign in as ada@example.com        │</span>
<span class="ln" data-note="item-6-line-14" tabindex="0">│                                          │</span>
<span class="ln" data-note="item-6-line-15" tabindex="0">│ Then ask it: &quot;What can I do here?&quot;       │</span>
<span class="ln" data-note="item-6-line-16" tabindex="0">│ It can use: Hello, Tip calculator        │</span>
<span class="ln" data-note="item-6-line-17" tabindex="0">│                                          │</span>
<span class="ln" data-note="item-6-line-18" tabindex="0">│ Can't copy? Show the message             │</span>
<span class="ln" data-note="item-6-line-19" tabindex="0">└──────────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>When Connect can't load, it says so plainly.</b> Today it tells someone who is already signed in to sign in. It will say the steps couldn't load and offer <i>Try again</i>. When setup isn't ready on this app yet, the popup says that in place of step 1 and shows no <i>Copy</i> button.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-7-line-1" tabindex="0">COULDN'T LOAD              NOT READY YET</span>
<span class="ln" data-note="item-7-line-2" tabindex="0">┌───────────────────────┐  ┌───────────────────────┐</span>
<span class="ln" data-note="item-7-line-3" tabindex="0">│ Connect your assistant│  │ Connect your assistant│</span>
<span class="ln" data-note="item-7-line-4" tabindex="0">│ The steps couldn't    │  │ Setup isn't ready on  │</span>
<span class="ln" data-note="item-7-line-5" tabindex="0">│ load.                 │  │ this app yet. Ask the │</span>
<span class="ln" data-note="item-7-line-6" tabindex="0">│ [Try again]           │  │ owner.                │</span>
<span class="ln" data-note="item-7-line-7" tabindex="0">└───────────────────────┘  └───────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Screens you built move with the frame.</b> After the update, a mini app your assistant built starts at the same left edge as the rest and has the whole frame to use. Its address and data stay as they are, and nothing needs doing by hand.</div></div></li>
</ol>
<p class="aside"><b>Non-goals.</b> No change to who can use what, to what a save does, or to colours and fonts. Home's welcome guide stays as it is. What Connect does once pasted stays the same: adding the project code to it is planned in the workspace <i>Connect installs the project</i>.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked how wide the screens should be so moving between them stops jumping → chose one frame: every screen starts at the same left edge, text and forms keep a readable width, tables use the full frame.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked how a row in the Access lists should look → chose one line each, with a short count such as <i>2 apps, 1 key</i>, and the names shown when the person is opened.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked where a person, role, app or key should open → chose a side panel over the list, filling the screen on a phone.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what Connect your assistant should become → chose three numbered steps with one way in, the card on Home; the Access button and box go away.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked how this fits with the workspace <i>Connect installs the project</i>, which also changes the Connect popup → chose to keep going here; that work adds its step to the new popup.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the remove and leave questions become popups, because Connect already is one and two ways of asking is one of the things that reads as uneven.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a row still says when an app can't do its job yet, as a count beside the totals, because that warning is promised without opening the person and a one-line row must not hide it.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the view names become the list's title and the add button moves onto that line, because <i>People</i> written twice and a top-right spot that changes job were both on the list of what looks uneven.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: <i>Manager</i> moves beside the person's name, because under the role it made that row two lines.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a key that isn't saved yet opens the panel too and shows its next step there, because the copy button for that step can't fit in a one-line row.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: someone who manages nothing sees only what they can use on Access, because Connect has one way in and Home's card is on the screen they start from.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the popup names Claude Code and Codex only as examples after &quot;an AI assistant on your computer&quot;, because the app must not read as needing one named assistant.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: this is a <code>minor</code> release with no hand step, because screens keep their addresses, data and parts, and only where they sit changes.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build: each task's own test run, the &quot;fails first, then passes&quot; steps included, moved to the one run in group 6, because the build writes all code and tests before running any. Every promise those steps checked is still held by a test.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build: the side panel leaves the page beside it in use, with no dimming, because the plan keeps the four views and the marked row usable while an item is open. A press on the page closes the panel.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build: Apps and Keys count who has something by kind, such as <i>Owner, 1 role, 2 people</i>, because a bare number does not say whether a role or a person holds it. Keys keeps one column per level.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build: <i>Can't copy? Show the message</i> sits under the <i>Copy</i> button in step 1, not at the foot of the popup, because the copy button and its fallback are one part.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Build: the workspace was moved up to 35.0.1 before building, and the first checkpoint is saved with the walk on the preview still to do, because the plan was drawn against the screens that release published.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Walk: the owner's row was shorter than the rows that hold a role dropdown, so every row in the four lists now has one height on a computer.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked, on the preview, about Home sitting in the left half of the frame with the right half empty → chose every screen fills the frame; text and forms no longer keep a narrower width. Home's apps sit in a grid, and Hello's and the tip calculator's fields share a line on a computer.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked what to do about two things the pictures showed, a Keys line cut short and the side panel covering the top bar → chose to fix both: the Keys list counts the apps that use a key and the key's panel names them, and on a computer the panel starts under the top bar, which now stays in view when the page scrolls.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Archive checkpoint: 35.1.0, <i>Connect your assistant installs the project</i>, was published while this was built and changed eleven of the same files. Both are kept: the popup's three steps now also say when the connection brings the whole project, a person who lacks Project code sees Home's card greyed and what the app answers in place of the steps, and that change's tests for Access's Connect button moved onto the popup, since Access no longer has one.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-06</p>Check: <code>app/src/apps/access/Connect.test.tsx</code> is deleted, because it tested the Connect button and box on Access, which this change removes; its three cases (the project when ready, the apps alone when off, who to ask without Project code) now run against the popup in <code>app/src/components/AssistantSetup.test.tsx</code>.</li>
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
