# Put the password link on one screen

**Status:** ready-to-ship
**Branch:** verify-credentials-auto-save
**Open questions:** none

## Why

The password link makes you choose first: *Upload a password export* or *Add one login*, each on its own screen, with *Add another* to go back. Doing both, such as importing a file and then typing one site it missed, means hopping between screens. One screen that takes a file and typed logins into the same list is quicker, and dragging the file in saves a trip through the file picker on a laptop.

## What Changes

- **One screen for everything.** The link opens straight onto the page below: a box to drop or pick your export file, the list of logins, a small form to add one by hand, then *Save* and *Done* side by side. There is no choice to make first and no *Back* or *Add another*.
  ```text
  ┌──────────────────────────────┐
  │ Save logins for your agent   │
  │                              │
  │ ┌──────────────────────────┐ │
  │ │ Drop your export file    │ │
  │ │ here, or tap to pick it  │ │
  │ └──────────────────────────┘ │
  │                              │
  │ 214 logins                   │
  │ [ Search sites…            ] │
  │ [ ] amazon.com     me@x.com  │
  │ [x] costco.com     me@x.com  │
  │ [x] netflix.com    me@x.com  │
  │  …                           │
  │                              │
  │ Add a login                  │
  │ [ Website                  ] │
  │ [ Email or username        ] │
  │ [ Password                 ] │
  │                      [ Add ] │
  │                              │
  │ [ Save 2 logins ]  [ Done ]  │
  └──────────────────────────────┘
  ```
- **Drop it or tap it.** On a laptop you drag the export file onto the box. On a phone, where you can't drag, you tap the box and pick the file. Either way your device reads it and adds its logins to the list, none ticked. A second file adds to the same list, skipping logins already there. A file dropped anywhere else on the page lands in the box too, so a near miss doesn't open the file in the tab.
- **Typed logins join the same list, ticked.** Fill the form and tap *Add*: the login appears in the list, already ticked. Your phone or password manager can still fill the form, since it stays a normal login form. A login you type for a site and username already in the list replaces that row's password. If you tap *Save* with the form filled but not added, it's added and saved too, so one login is still one tap.
- **One Save for everything ticked.** *Save* sends only the ticked logins. Saved rows show *Saved* and can't be ticked again, and a line under the list names the saved sites. Anything that failed stays ticked with a note, so tapping *Save* again retries it. After saving from a file, the page reminds you to delete the export.
  ```text
   ticked in the list ──┐
                        ├─▶ Save ──▶ locked store
   form filled, not   ──┘
   yet added
  ```
- **Done closes the link, with one check.** If ticked logins aren't saved yet, the first tap on *Done* says how many and asks you to tap again to leave without them.
- **The guide says so.** The *Save your passwords* page describes the one screen instead of two ways.

Non-goals: how logins are stored, the 10-minute link, what the agent learns, and which export files the page reads all stay the same. No editing a row's username or password in the list.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: the password link's page takes exports (dropped or picked) and typed logins into one list on one screen, saved together.

## Impact

- `.agents/skills/verify/scripts/passwords-page.html` and `passwords-page.mjs`: the one-screen layout, drop handling, merged list, and Save/Done behavior. `parseExport` and `siteUrl` keep their contracts.
- `scripts/tests/passwords-page.test.mjs` (new): jsdom tests of the page against a fake `/save` and `/done`.
- `wiki/development/browsing.md`: the *Save your passwords* section.
- `openspec/specs/browser-logins/spec.md` via a delta.
- `CHANGELOG.md` `## Next (minor)` entry.
- No change to `hand-over.mjs` or `passwords.mjs`: the page's routes and the `/save` body stay the same.

## Decision log

- **2026-09-29** — Asked whether the password page should be one screen with drag and drop of the export plus adding logins by hand → chose yes, by typing `/ship` after the proposal in chat.
- **2026-09-29** — Assumed: typed logins join the list already ticked, and file logins join unticked, because typing a login is itself the choice to save it, while a file holds sites you didn't pick.
- **2026-09-29** — Assumed: *Save* also takes a filled form that wasn't added, because otherwise a single login needs two taps where it needs one today.
- **2026-09-29** — Assumed: a second file adds to the list instead of replacing it, because people split exports and add missed sites.
- **2026-09-29** — Assumed: the page accepts a drop anywhere, because a browser opens a file dropped outside a drop target in the tab, losing the page.
- **2026-09-29** — Assumed: *Done* with ticked, unsaved logins asks for a second tap, because one screen makes it easy to tick and forget to save.
- **2026-09-29** — Assumed: the page tests run in jsdom, as the review page's do, because it is plain DOM code and jsdom is already a test dependency.
- **2026-09-29** — Assumed: archived and checkpointed by `/ship` after all tasks passed: 14 new page tests, and a local walk at 390 and 1280 wide.
