# Screens built from ready-made parts, not styled by hand

**Status:** in-progress

**Branch:** finicky-horse

**Open questions:** none

## Why

Every screen in the app is styled by hand today. Each table, menu, popup and button was written from scratch for the Access screen, and the next screen would write them again. After seeing the hand-styled Access preview you said we should "default to shadcn for these sorts of things and not re-invent the wheel". This plan makes that the default for the whole app, for every mini app the assistant builds, and for every install.

## What Changes

- **Every screen is built from one set of ready-made parts.** Buttons, fields, tables, menus, popups, boxes and labels come from shadcn, a well-known set of parts, on Tailwind, the styling tool it is built with. No screen keeps a style file of its own.
  ```text
    BEFORE                AFTER
  Access ─▶ own styles   Access ──┐
  Home ───▶ own styles   Home ────┼─▶ +one set
  Hello ──▶ own styles   Hello ───┘    of parts
  ```
- **The look stays calm and familiar.** The device's own font, light or dark to match the device, black or white main buttons, the bar on top with *Sign out*, and each page at the width it has today. What you will notice is tidier spacing, corners and focus rings, and menus and popups that behave as they do in other products.
- **Access is restyled on the parts, and nothing moves.** The four views, the tables, the role dropdown in the row, the `⋯` menu, the notices and the *Connect your assistant* popup stay where they are and work as they do today. On a phone each row still stacks into short lines.
  ```text
  ┌──────────────────────────────────────┐
  │ W WongStack               [Sign out] │
  ├──────────────────────────────────────┤
  │ Access           [Connect assistant] │
  │ [People 3]  Roles 2  Apps 2  Keys 1  │
  │ People                  [Add person] │
  │ Who       Sign-in    Role          ⋯ │
  │ ──────────────────────────────────── │
  │ you       Owner                      │
  │ kim@…     Can sign   [Sales ▾]     ⋯ │
  │ lee@…     Waiting    [Own set ▾]   ⋯ │
  └──────────────────────────────────────┘
   the same layout as today; each piece
   is now a ready-made part
  ```
- **Three Access pieces change what they are made of.** The words, the order and the steps stay the same.
  ```text
             │ today       │ after
  ───────────┼─────────────┼──────────────
  ⋯ menu     │ hand-built  │ ready-made,
             │             │ +arrow keys
  popup      │ hand-built  │ ready-made
  role       │ the phone's │ the phone's
  dropdown   │ own picker  │ own picker
  ```
- **Home, the example app and the setup box are restyled the same way.** The app cards, the welcome box, *Connect your assistant*, the copy button and the Hello example use the same parts, with the same words and steps.
- **Connect your assistant becomes a card among your apps.** The box that sat above the list on Home is gone. A *Connect your assistant* card sits in the list, and a click opens the same steps in a popup over the page. It does what it does today, for every signed-in person.
  ```text
    BEFORE                    AFTER
  ┌────────────────────────┐  ┌────────────────────────┐
  │ Connect your assistant │  │ Your apps              │
  │ Signed in as …         │  │ ┌────────────────────┐ │
  │ [Copy setup prompt]    │  │ │ Hello            → │ │
  │                        │  │ └────────────────────┘ │
  │ Your apps              │  │ ┌────────────────────┐ │
  │ ┌────────────────────┐ │  │ │ +Payroll  No access│ │
  │ │ Hello            → │ │  │ └────────────────────┘ │
  │ └────────────────────┘ │  │  +Ask your admin for   │
  │ (Payroll is hidden)    │  │  +access to Payroll.   │
  │                        │  │ ┌────────────────────┐ │
  │                        │  │ │ +Connect your      │ │
  │                        │  │ │ +assistant        →│ │
  │                        │  │ └────────────────────┘ │
  │                        │  │                        │
  │                        │  │                        │
  └────────────────────────┘  └────────────────────────┘
  ```
  ```text
  the popup the card opens
  ┌────────────────────────┐
  │ Connect your assistant │
  │ Signed in as …         │
  │ [Copy setup prompt]    │
  │                        │
  │                 [Close]│
  └────────────────────────┘
  ```
- **Apps a person can't use show greyed out.** Until now they were hidden. A greyed card is marked *No access*, opens nothing, and a click says to ask their admin for access. Opening its address directly is still refused. Everyone can now see the name and one-line description of every app.
- **The copy text stays inside its box.** In the first preview the long setup text ran past the edge of the box; it now wraps.
- **Mini apps the assistant builds from now on use the parts.** A new screen is put together from the set. When a screen needs a part the app does not have yet, the assistant adds it in one step. A check stops a screen from bringing a style file of its own, so hand-styling can not creep back.
  ```text
  you: "make me a quote form"
          │
          ▼
  assistant picks parts ─▶ one missing?
          │                    │ yes
          ▼                    ▼
       preview ◀────────── adds it
  ```
- **Installs get it on their next update.** The built-in screens switch to the new parts. Each screen an install built for itself is moved onto the parts too: the update's plan names every one, and each shows in the preview before anything is published. What a screen does, its address and its data stay as they are.
  ```text
  update ─▶ built-in screens switch
     │
     ▼
  own screens ─▶ each moved ─▶ preview
                                  │
                                  ▼
                               publish
  ```
- **The copied parts skip three checks.** The parts arrive as code copied into the app. That one folder is not held to *every line tested*, *nothing unused* and *nothing repeated*; the screens that use the parts still are. A fault inside a copied part is caught by a screen's test or by the preview, not by a test of its own.
- **Building takes a little longer.** The app gains several building blocks, so the first preview in a new workspace installs more. The build measures the time before and after and reports it.

**Non-goals:** *Connect your assistant* installing the project on a person's device, with access to the code following their app login: that gets its own plan right after this one. Popups for *Remove this person?* and *Leave without saving?*, or a *Saved* note in the corner. A switch for light and dark, new colours, or a new logo. A change to what Access does, to who can sign in, or to any data. The public landing site and the plan review page. A list of parts added ahead of need: a part arrives when a screen first uses it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mini-apps`: the home list shows apps a person lacks as unavailable with ask-your-admin guidance, and holds a *Connect your assistant* entry that opens the steps over the page; every page shares one look built from ready-made parts, with no stylesheet of a page's own; an install's own screens on the earlier plain look are moved onto the parts by its next update.
- `app-scaffold`: the quality gates exempt the one folder of copied parts from coverage, dead-code and duplicate-code checks; a page's folder holds its parts and tests, not styles.

## Impact

- `app/package.json`, `app/vite.config.ts`, `app/vitest.config.ts`, `app/tsconfig.app.json`, `app/knip.jsonc`, `app/.jscpd.json`, `app/.oxlintrc.json` (or the repo's lint config), new `app/components.json`: Tailwind 4, the shadcn parts' dependencies, the `@/` alias, and the exemptions for `app/src/components/ui/`.
- New `app/src/index.css` (the one stylesheet: colour tokens, light and dark, the base look), `app/src/lib/utils.ts`, `app/src/components/ui/*`. Removed: `app/public/style.css`, its link in `app/index.html`, and every `.css` under `app/src/`.
- `app/src/Layout.tsx`, `app/src/pages/home/*`, `app/src/pages/not-found/NotFound.tsx`, `app/src/components/AssistantSetup.tsx`, `CopyText.tsx`, `app/src/apps/hello/`, `app/src/apps/tips/` (source-only), `app/src/apps/access/*`, and their tests; `app/src/style.test.ts` and `app/src/apps/access/style.test.ts` rewritten.
- `.agents/rules/code.md`, `wiki/stack/mini-apps.md`, `wiki/stack/core-stack.md`, `wiki/stack/employee-access.md` where it names a piece, `app/README.md`.
- `.agents/skills/wong-sync/references/payload-files.json`, `payload-manifest.md`, `catch-up.md`; `scripts/retired-names.json`; `.agents/verification/journeys/` source paths.
- `CHANGELOG.md`: a `major` entry, because an install's own screens lean on the shared stylesheet this removes.
- No database change, no API change, no change to the Worker.

## Decision log

- **2026-10-05** — Asked what the switch should cover → chose the whole app, the mini apps the assistant builds from now on, and installs on their next update.
- **2026-10-05** — Asked what an install's next update should do with screens of its own → chose to restyle them too, each named in the plan and shown in the preview.
- **2026-10-05** — Asked whether the copied parts are held to every line tested, nothing unused and nothing repeated → chose to ease the rules for that one folder.
- **2026-10-05** — Asked how far the Access restyle should go → chose the same screen on new parts; no popups for questions and no *Saved* note in the corner.
- **2026-10-05** — Assumed: this replaces the 2026-09-27 choice to keep the look light with no UI library, because he asked for shadcn by default after seeing the hand-styled Access screen.
- **2026-10-05** — Assumed: the look keeps the device's font, follows the device for light or dark, and uses shadcn's neutral colours, because that is today's look and he asked for ready-made parts, not a new brand.
- **2026-10-05** — Assumed: the role dropdown in a row stays the phone's own picker, in the ready-made style, because it is easier to use on a phone than a drawn list and it saves at once as today.
- **2026-10-05** — Assumed: no screen keeps a style file of its own and a check enforces it, because one leftover file is how hand-styling comes back; a screen with a real one-off need adds it to the one shared stylesheet.
- **2026-10-05** — Assumed: the shared stylesheet at its old address is removed, not kept beside the new one, because its rules for plain buttons and fields would override the ready-made parts.
- **2026-10-05** — Assumed: the update moves an install's own screens through the release's updating note and the failing check, with no new updater code, because the note already becomes a to-do in every update plan and the check names each file left.
- **2026-10-05** — Assumed: this is a major release, because an install's own screens stop looking right until its update moves them.
- **2026-10-05** — Assumed: a part is added when a screen first uses it, because parts added ahead of need are unused code in every install.
- **2026-10-05** — Asked what next for the finished plan → chose to build it now, with a preview before anything is published.
- **2026-10-05** — Check: `app/vitest.config.ts` leaves `src/components/ui/**` out of coverage, because the parts are copied as their makers wrote them and are exercised through the screens that use them; every other file stays at 100%.
- **2026-10-05** — Check: `app/.jscpd.json` and `app/knip.jsonc` skip `src/components/ui/**`, because a copied part repeats lines its neighbours have and exports pieces no screen uses yet; trimming each would stop it matching the original.
- **2026-10-05** — Check: `app/.oxlintrc.json` turns the lint rule that a component file exports only components off for `src/components/ui/**`, because a copied part exports its style variants beside it; every other lint rule still holds there.
- **2026-10-05** — Check: `app/src/apps/access/style.test.ts` drops the assertion that every selector starts with `.access-`, because the file it read is gone; the new check that no screen has a style file replaces it, and its phone and not-by-colour-alone assertions are kept against the screens' own code.
- **2026-10-05** — Check: `app/src/style.test.ts` no longer reads `public/style.css`, because that file is removed; it checks the one stylesheet for light and dark, and the frame for the narrow column and the full-width bar.
- **2026-10-05** — Build: every task's own test run moved to the end, after all code and tests were written, because the build writes first and checks once. Each check still ran: a stray style file, an untested line outside the parts folder, and each class removed from an Access part all fail as the tasks ask.
- **2026-10-05** — Build: measured on this computer, before → after: `npm ci` 4.6 s → 9.7 s, `npm run build:app` 3.7 s → 5.5 s, `npm test` 21.0 s → 24.7 s, and the installed packages 548 MB → 635 MB.
- **2026-10-05** — Assumed: ticks and the level choice stay the browser's own checkbox and radio buttons, styled to match, not the drawn `Checkbox` and `RadioGroup` parts, because the screens promise real radio buttons kept on screen and their tests read them; those two parts are not added.
- **2026-10-05** — Assumed: an Access list is a plain table built from the parts' header, body, row and cell, without the part's outer frame, because that frame scrolls sideways and the rows stack instead.
- **2026-10-05** — Assumed: the `⋯` menu does not lock the page while it is open, because a locking menu took the keyboard back from *Remove this person?*; Escape still returns the keyboard to the dots, and a click elsewhere closes it as before.
- **2026-10-05** — Build: the shadcn command now supplies one package, `cn`, by shadcn's author, where the design listed `clsx` and `tailwind-merge`; the style is `new-york`, the command's current name for its standard style.
- **2026-10-05** — Build: `app/.jscpd.json` holds no comment for its exemption, because the repeated-code checker ignores the whole file when it has one and then passes everything; the reason is the `Check:` entry above and the comment in `app/knip.jsonc`.
- **2026-10-05** — Build: two mentions outside the plan's list changed with the removed stylesheet: the example address in `wiki/stack/cloudflare-access.md` now probes `/favicon.svg`, and a sample asset path in `app/worker/index.test.ts` no longer names `style.css`.
- **2026-10-05** — Check: `app/tsconfig.app.json` and `app/tsconfig.json` add the `@/` path alias the ready-made parts import by and the shadcn command reads, because the parts arrive written that way; no type check is switched off or eased.
- **2026-10-05** — Save: every screen is built on the parts and the local checks pass; left are the preview walk in light and dark at two widths (task 6.2) and re-recording the three kept Access checks.
- **2026-10-05** — Preview walk: passed at a computer and a phone width, in light and dark, for Home, Hello, the four Access views, a person's page, the menu by mouse and keyboard, the popup, a removal question and a role pick with undo. Not shown on the preview: the loaded *Connect your assistant* prompt (the preview refuses it to the checker; code tests cover it), a click on *Sign out*, and an install updating. The three kept Access checks are re-recorded at publish, where kept checks run.
- **2026-10-05** — Asked, after seeing the preview, for *Connect your assistant* as a card among the apps that opens a popup, and for something a person lacks to show greyed with a warning to ask their admin.
- **2026-10-05** — Asked what a person sees for what they lack on Home → chose greyed for apps too, knowing everyone then sees every app's name.
- **2026-10-05** — Asked how to handle *Connect your assistant* installing the project with code access by app login, which is not what it does today → chose its own plan next; here it keeps linking an assistant to a person's apps, for every signed-in person.
- **2026-10-05** — Assumed: the Connect card is never greyed in this change, because today every signed-in person may connect and who gets the code is decided in the next plan.
- **2026-10-05** — Assumed: the Connect card sits last in the list, because it is used about once per person and the apps are used daily.
- **2026-10-05** — Assumed: a greyed card's message shows under that card and stays until another is picked, because a popup for one sentence is heavier than the sentence.
- **2026-10-05** — Assumed: Access keeps its own *Connect your assistant* button for whoever manages it, because he approved it there earlier today and asked only about Home.
- **2026-10-05** — Assumed: nothing is greyed before per-app permissions start, because everyone holds every app until then.
- **2026-10-05** — Preview: the setup text ran past its box on the first preview; fixed by keeping the text area at the box's width.
- **2026-10-05** — Build: the Home changes are written and the local checks pass; the new copy-text test fails with the fixed-size class removed. The practice data needed no change: Eli already holds the tip calculator and lacks Hello. Left is the preview walk (task 8.2).
- **2026-10-05** — Assumed: the Connect card's one line reads *Use your apps from your own assistant.*, because a card needs a description like its neighbours and the plan gave none.
- **2026-10-05** — Assumed: the employer's list stays as it was, with an app outside the catalogue left off, not greyed, because greying was chosen for what an employee lacks.
- **2026-10-05** — Build: three cases in Access's own test file that draw Home changed with it: the setup box gave way to the Connect card, and a lacked app is a greyed card, not a missing one.
- **2026-10-05** — Save: the Connect card, the greyed apps and the copy-text fix are built and the local checks pass; left is the preview walk of Home (task 8.2).
- **2026-10-05** — Preview walk of Home: the Connect card opens and closes its popup at both widths, light and dark. Not shown: a greyed app and the setup text inside its box, because the checker signs in as the owner and is refused the setup prompt; code tests cover both. The landing-page check was cancelled twice in the queue without running; the tests, payload checks and deploy passed.
- **2026-10-05** — Asked what next with the landing-page check never started → chose to save the last notes and run every check again; nothing is published by that.
