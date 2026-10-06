# Screens that match

**Status:** in-progress

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
