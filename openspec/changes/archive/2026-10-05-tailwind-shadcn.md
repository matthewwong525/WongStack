<!-- openspec-archive v1 2026-10-05-tailwind-shadcn -->
<!-- file proposal.md utf8 20350 -->
# Screens built from ready-made parts, not styled by hand

**Status:** ready-to-ship

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
- **2026-10-05** — Archive checkpoint: asked to publish after the preview → chose to try shipping it; built, both walks passed, numbered 35.0.0. Left for a person: open the *Connect your assistant* card with their own sign-in and see the setup text inside its box.

<!-- end proposal.md -->
<!-- file design.md utf8 17940 -->
# Design

## Context

See [proposal.md](proposal.md) for why. The state this starts from:

- **Styling.** `app/public/style.css` (110 lines) is linked from `app/index.html` and styles whole elements: `main`, `h1`, `a`, `input, button, select, textarea`. Eight part stylesheets sit beside their parts under class prefixes (`access-`, `hello-`, `app-list-`); `Access.css` is 97 lines. Colours are eight custom properties, switched by `prefers-color-scheme`.
- **Hand-built parts.** `app/src/apps/access/` has `Table.tsx`, `RowMenu.tsx` (a `<details>` with its own outside-click and Escape code), `RoleSelect.tsx` (a native `<select>`), `Connect.tsx` (a native `<dialog>`), `Confirm.tsx`, plus buttons, labels, notices and a radio row styled in `Access.css`.
- **Checks.** `npm test` runs `oxlint --deny-warnings`, `vitest run --coverage` at 100% on `src/**` and `worker/**`, `knip`, `jscpd` at threshold 0, and the key check. Two tests read CSS as text: `src/style.test.ts` and `src/apps/access/style.test.ts`.
- **Rules that say otherwise today.** [The code rule](../../../.agents/rules/code.md) names `style.css` as the only file that styles whole elements and puts a part's CSS beside it. The `mini-apps` spec says the shared look uses no UI library or CSS framework, a choice made on 2026-09-27 and replaced by this change.
- **Installs.** `app/` ships as the scaffold; a target's own apps and adapted files are merged by an update plan, never overwritten. A changelog entry's **Updating.** note becomes a to-do in each install's update plan.

## Goals / Non-Goals

**Goals:**

- One stylesheet and one folder of copied parts; no CSS file beside any screen.
- Access keeps every behaviour its tests and spec hold; only what the pieces are made of changes.
- An agent building a mini app can follow one rule and one example, and a check fails when it hand-styles.
- The check exemptions are narrow, named, and logged.

**Non-Goals:**

- New behaviour on any screen. Confirmations stay inline sections; notices stay in their one spot.
- A dark-mode switch, a theme picker, a web font.
- Pre-installing parts no screen uses.
- New updater code or a new preflight reason.

## Decisions

### Tailwind 4 through its Vite plugin, with one stylesheet

Add `tailwindcss` and `@tailwindcss/vite`; register the plugin in `app/vite.config.ts`. `app/src/index.css` is the only stylesheet: `@import "tailwindcss"`, the animation import shadcn's parts need, the colour tokens, and an `@layer base` block. `app/src/main.tsx` imports it. `vitest.config.ts` keeps its own config without the plugin; no test needs built CSS.

`app/public/style.css` and its `<link>` are deleted. *Alternative: keep it beside Tailwind.* Rejected: it is unlayered, and unlayered rules beat every Tailwind layer, so its `button { border; padding; background }` would override the parts' utility classes. *Alternative: move its element rules into `@layer base`.* Rejected for buttons and fields for the same visible reason (a ghost button would show the base background), and kept only for what no part sets: the root font, `color-scheme`, heading sizes, link colour and the focus ring.

### Colours follow the device, in shadcn's token names

The tokens are shadcn's (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`, …) with the neutral base colour, which matches today's black-or-white primary. The dark values sit in `@media (prefers-color-scheme: dark) { :root { … } }`, not under a `.dark` class, and Tailwind's `dark:` variant stays at its media-query default, so the app follows the device as it does now. `--font-sans` is `system-ui, sans-serif`. The old names (`--canvas`, `--surface`, `--accent`, …) are not kept: with every screen moved, nothing reads them.

### shadcn parts in one folder, added on first use

`app/components.json` configures the shadcn command: the default style, neutral base colour, CSS variables on, Radix primitives, `lucide` icons, aliases `@/components`, `@/components/ui`, `@/lib/utils`. The `@/` alias maps to `app/src/` in `tsconfig.app.json`, `vite.config.ts` and `vitest.config.ts`.

Parts land in `app/src/components/ui/` exactly as the command writes them; `cn` lands in `app/src/lib/utils.ts`. A part is added with `npx shadcn@latest add <part>` from `app/` when a screen first needs it. *Alternative: add a broad starter set.* Rejected: unused code in every install and more to keep current.

This change adds the parts the existing screens use: `button`, `table`, `dropdown-menu`, `dialog`, `native-select`, `input`, `label`, `textarea`, `checkbox`, `radio-group`, `badge`, `alert`, `card`. The exact list is whatever the restyle uses; a part no screen imports is not added.

Runtime dependencies come with the parts: `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`.

### The parts folder is exempt from three gates and one lint rule

Asked and chosen: ease the rules for the copied code.

| Gate | Setting | Why |
|---|---|---|
| Coverage | `coverage.exclude` gains `src/components/ui/**` | Copied as written; exercised through screens. |
| Duplicates | `.jscpd.json` `ignore` gains `**/components/ui/**` | Parts repeat each other's wrapper lines. |
| Dead code | `knip.jsonc` `ignore` gains `src/components/ui/**` | A part exports pieces no screen uses yet. knip still checks the dependencies they import. |
| Lint | `react/only-export-components` off for that folder | A part exports its variants beside the component. |

Complexity, file length, `any`, and every other lint rule still apply there. `app/src/lib/utils.ts` is not exempt: `cn` is covered by any screen test that renders a part.

*Alternative: trim each part to what is used and test it.* Rejected by the owner's choice: every later `add` would need hand work in every install, and a trimmed part no longer matches upstream.

To keep the exemption from becoming a hiding place, [the code rule](../../../.agents/rules/code.md) says the folder holds only what the shadcn command wrote; a part the app writes itself goes in `app/src/components/` under every gate.

### A check that no screen has a style file

`app/src/style.test.ts` asserts that `index.css` is the only `.css` file under `app/src/` and that `app/public/` has none, naming each extra file. This is the deterministic guard for "screens stop being hand-styled", and it is what makes an install's update finish the move: its suite fails until every own stylesheet is gone. The same test keeps today's shared-look assertions against their new homes: `color-scheme: light dark` and a dark token block in `index.css`; the narrow column and the full-width bar as classes on `Layout.tsx`'s elements, read from the rendered frame.

*Alternative: a lint rule against `import './x.css'`.* Rejected: oxlint has no ready rule for it, and the file check also catches a stylesheet nobody imports.

### Access: the same DOM contract, new parts

| Today | Becomes | Kept |
|---|---|---|
| `Table.tsx` + `.access-table` | shadcn `Table` parts inside `Table.tsx` | Title row, `aria-labelledby`, the screen-reader-only actions header, `data-label` cells, click-to-open rows |
| `RowMenu.tsx` (`<details>`) | `DropdownMenu` | The `⋯` trigger and its label, the same items, Escape and outside click (now the part's own) |
| `RoleSelect.tsx` (`<select>`) | `NativeSelect` | A real `<select>`: `aria-label`, values, save on change, disabled while pending |
| `Connect.tsx` (`<dialog>`) | `Dialog` | Button beside the heading, labelled popup, *Close*, Escape, outside click, steps load on open |
| `.access-button`, `.access-primary` | `Button` (`default`, `outline`, `ghost`) | One primary action per page |
| `.access-labels li` | `Badge variant="outline"` | A border, so a label is not marked by colour alone |
| `.access-notice`, `.access-removal` | `Alert` / `Card` | Inline, in the one notice spot; roles `status` and `alert` |
| `.access-fields` inputs, ticks, radios | `Input`, `Label`, `Checkbox`, `RadioGroup` | Labels, `fieldset disabled` while saving, the radio dot showing the choice |
| `.access-views` links | Router links with tab-like classes | `aria-current="page"`, bold and underlined |

The view switch stays links, not the `Tabs` part: each view is an address, and the leave-without-saving hold works on navigation.

The role dropdown uses `NativeSelect`, not the drawn `Select`. *Why:* a drawn list is harder on a phone, is hard to drive in jsdom, and the row's job (pick, saved at once) needs nothing a native picker lacks.

The stacked rows on a narrow page move from `@container (max-width: 44rem)` in `Access.css` to Tailwind's container-query variants on the same elements (`@container` on the page; `@max-[44rem]:…` on the table parts). The wide page for managers keeps its `min(60rem, 100vw - 2rem)` width as an arbitrary-value class.

`app/src/apps/access/style.test.ts` is rewritten, not deleted. It renders the parts and reads their classes for the same guarantees: no fixed pixel width, rows stack below the container width, the header row is visually hidden but present, no sideways scroll, the popup no wider or taller than the screen, the current view bold and underlined, radios on screen. The one assertion with no new home (every selector starts with `.access-`) is dropped; the no-style-file check replaces it. Logged as a `Check:` decision.

### Tests drive the Radix parts through a small setup file

Radix parts use pointer capture, `scrollIntoView` and `ResizeObserver`, which jsdom lacks. One setup file under `app/src/` stubs those three for the test run, listed in `vitest.config.ts` `setupFiles`. Existing tests that open the row menu or the popup change how they open them (keyboard or pointer events the part listens for), not what they assert. The setup file is test support, named `app/src/dom.test.setup.ts` so the existing `**/*.test.*` coverage exclusion already covers it and no check setting changes for it.

### Home, Hello, Tips, the setup box

`AppList` cards and the welcome box become `Card`; `AssistantSetup` a `Card`; `CopyText` a `Button` with a `Textarea` fallback; Hello a `Card` with `Label`, `Input`, `Button`; `NotFound` a `Button` link. `tips` is source-only but builds in the same app, so it moves too. Each keeps its words, roles and test queries; class-name queries in tests change to role or text queries.

### Home: a Connect card and greyed apps

Added after the first preview. `Home.tsx` stops rendering `AssistantSetup` as a box. `AppList.tsx` takes every built app plus the set the person holds:

- **An app they hold** is the link card it is today.
- **An app they lack** (only in the `current` state, for an employee) is a `<button aria-disabled="true">` card with muted text and a *No access* badge, so it is reachable by keyboard and not marked by colour alone. A click sets which card was asked for; under it a `role="status"` line reads *Ask your admin for access to <title>.* No request is sent and no navigation happens. The server's refusal of a direct visit is unchanged; this is display only, from manifests the build already ships to every browser.
- **The Connect card** is last in the list for every signed-in person, a `<button>` card that opens `Dialog` with `<AssistantSetup popup />`, the same content Access's popup shows. The dialog wrapper moves from `apps/access/Connect.tsx` to `components/ConnectDialog.tsx` taking its trigger as a child, since a second page now uses it; Access passes its outline button, Home its card.
- **An employee with no business apps** keeps the contact-your-employer line above the greyed cards; its *Open your assistant setup* link gives way to the Connect card.
- **No apps built** keeps the first-request text, with the Connect card under it.

`CopyText`'s text area is held to its container: `field-sizing-fixed`, `min-w-0` on its wrappers, and a single `minmax(0,1fr)` column in `AssistantSetup`. The copied `Textarea` part sizes to its content by default, which let one long line widen it past the card.

*Alternative: ask the server which apps to grey.* Rejected: the browser already has every manifest, and the server keeps deciding what opens.

### The rule and the example teach it

[`.agents/rules/code.md`](../../../.agents/rules/code.md) *Where things go* changes two bullets:

- **Styles:** Tailwind classes on the element; the shared look is `app/src/index.css`, the only stylesheet; ready-made parts are in `app/src/components/ui/`, added with the shadcn command and left as written; no CSS file beside a part.
- **A mini app:** as today, minus "its CSS beside it", plus "built from the parts, as Hello is".

[`wiki/stack/mini-apps.md`](../../../wiki/stack/mini-apps.md) owns the longer how: the tree drawing loses `Hello.css`, *Written like any page* names the parts and the add command, and the closing paragraph on the shared look is rewritten. [`wiki/stack/core-stack.md`](../../../wiki/stack/core-stack.md) gains two rows in its pieces table.

### Installs: the note and the failing check, no new updater code

The changelog entry is `major`. Its **Updating.** note, in plain words: the built-in screens switch; the assistant moves each screen you built onto the new parts, names each in the plan and shows it in the preview; your data and addresses stay; nothing to do by hand.

How an update gets there with what exists:

1. Preflight reports the removed stylesheets, the changed screens and the new files as usual.
2. The **Updating.** note becomes a to-do in the plan.
3. [`payload-manifest.md`](../../../.agents/skills/wong-sync/references/payload-manifest.md)'s app-scaffold paragraph gains one sentence: a target's own screens on the earlier look are moved onto the parts, each named in the plan. An offsetting cut keeps the skill word budget.
4. The install's suite fails on any stylesheet left, naming it, so the move can not be half done.
5. [`catch-up.md`](../../../.agents/skills/wong-sync/references/catch-up.md)'s old-folder move stops saying an app's `style.css` becomes the page's own CSS: its styles become classes on the parts.

*Alternative: a new preflight reason that lists a target's stylesheets.* Rejected: the failing check already lists them, at the moment it matters, with no skill text to carry.

`app/public/style.css` goes into [`scripts/retired-names.json`](../../../scripts/retired-names.json) with `app/src/index.css` as its replacement.

## UX

### Use-case brief

Two people. **The owner or a manager**, at a desk and sometimes on a phone, opens Access a few times a week to add someone or change a role; done is the change saved and visible in the row. **An employee**, mostly on a phone, opens Home to reach an app or connect their assistant; done is the app open. This change moves no step for either: the closest existing screen is each screen itself, as shipped in 33.4.0. Assumed frequencies: Home daily per person; Access a few times a week by one or two people; the connect popup about once per person.

### Flow

Home → an app card, as today. Home → the Connect card → the popup → *Copy setup prompt* → *Close*, one step more than the box it replaces, for a job done about once per person. A greyed card → the ask-your-admin line, a dead end by design: the next step is a person's, not the app's. Access → People → pick a role in the row, or `⋯` → *Open*. Edge cases (remove, add back, leave without saving) keep their inline question.

### Hierarchy

One solid button per screen, as today: *Add person* / *Add role* on a list, the save button on a page, *Say hello* in Hello. Everything else is the outline or ghost variant. Muted text uses the muted token; labels are outline badges. No new emphasis is added.

### Review

[review.html](review.html). The What Changes items *Access is restyled on the parts, and nothing moves* and *Three Access pieces change what they are made of* sketch Access; *Connect your assistant becomes a card among your apps* sketches Home before and after, phone-first, with its greyed card and the popup.

### Components

Existing shadcn parts only, listed under [shadcn parts in one folder](#shadcn-parts-in-one-folder-added-on-first-use). Nothing new is invented; `Table.tsx`, `RowMenu.tsx`, `RoleSelect.tsx` and `Connect.tsx` stay as thin Access wrappers that hold Access's own behaviour (the title row, the menu label, the save, loading on open).

## Risks / Trade-offs

- [Tailwind's reset removes default margins and list bullets, so a screen can shift where it leaned on browser defaults] → each screen is restyled explicitly and walked on the preview at a computer and a phone width, light and dark.
- [A Radix part behaves differently in jsdom than in a browser] → the setup file covers the known gaps; the preview walk opens the row menu and the popup by mouse and by keyboard.
- [The exempt folder hides a real fault] → faults show through screen tests and the walk; the rule keeps hand-written parts out of the folder.
- [The toolchain here is recent (Vite 8, TypeScript 7, React 19); a part or plugin may lag] → task 1.1 installs and builds before any screen moves; a blocker stops the build there and is reported, not worked around.
- [Longer installs and builds, which the owner has flagged for previews] → measure `npm ci`, `npm run build:app` and `npm test` before and after and report the numbers; no fixed limit is set because none exists for these today.
- [An install with many own screens gets a long update] → chosen knowingly; the plan names each and the preview shows each before publishing.
- [A locally adapted `Home.tsx` or `Layout.tsx` conflicts with the restyle] → the normal merge by plan; branding is kept, as the existing identity requirement says.

## Migration Plan

Ships as one release. Rollback is reverting the merge: no data or API changes. Installs take it through `/wong-sync` as above; an install that has not updated is unaffected.

<!-- end design.md -->
<!-- file tasks.md utf8 9124 -->
# Tasks

## 1. Toolchain and the one stylesheet

- [x] 1.1 Record `npm ci`, `npm run build:app` and `npm test` times in `app/` before any edit. Then add `tailwindcss`, `@tailwindcss/vite` and the plugin in `vite.config.ts`; add the `@/` alias to `tsconfig.app.json`, `vite.config.ts` and `vitest.config.ts`. Verify `npm run build:app` succeeds; if the toolchain refuses a package, stop and report it.
- [x] 1.2 Add `app/components.json` (default style, neutral, CSS variables, Radix, lucide, the `@/` aliases) and `app/src/lib/utils.ts` by the shadcn command. Verify `npx shadcn@latest add button` from `app/` writes `src/components/ui/button.tsx` with no prompt.
- [x] 1.3 Write `app/src/index.css`: the Tailwind import, the animation import, shadcn's neutral tokens with the dark set under `prefers-color-scheme`, `--font-sans` as the device font, and a base layer for `color-scheme`, headings, links and the focus ring. Import it in `main.tsx`. Verify the built CSS holds both token sets.
- [x] 1.4 Add the exemptions for `src/components/ui/**` to `vitest.config.ts` coverage, `.jscpd.json`, `knip.jsonc` and the lint config, each with a comment saying why, exactly as the proposal's four `Check:` entries say. Verify a deliberately uncovered line in `src/lib/` still fails coverage, then remove it.
- [x] 1.5 Add `app/src/dom.test.setup.ts` with the three jsdom stubs the Radix parts need and list it in `vitest.config.ts` `setupFiles`. Verify the existing suite still passes with it loaded.

## 2. The frame, Home and the shared parts

- [x] 2.1 Restyle `Layout.tsx` with classes: the full-width bar, the brand link, *Sign out*, and `main` in its narrow column. Rewrite `app/src/style.test.ts`: `index.css` is the only `.css` under `src/`, `public/` has none, each extra file is named; `index.css` has `color-scheme: light dark` and a dark token block; the rendered frame keeps the narrow column and a bar with no max width. Verify the test fails with a stray `.css` file present, then passes without it.
- [x] 2.2 Move `Home.tsx`, `AppList.tsx`, `Tutorial.tsx` and `NotFound.tsx` onto the parts they need (added by the command), and delete `Home.css`, `AppList.css`, `Tutorial.css`. Update `Home.test.tsx`, `AppList.test.tsx`, `Tutorial.test.tsx` to query by role or text where they queried a class. Verify those tests pass with their assertions otherwise unchanged.
- [x] 2.3 Move `AssistantSetup.tsx` and `CopyText.tsx` onto the parts and delete their CSS. Verify the copy, the failed-copy fallback and the loading and error states in the existing tests.
- [x] 2.4 Delete `app/public/style.css` and its `<link>` in `index.html`. Verify with a search that no file under `app/` names `style.css`.

## 3. Hello and Tips

- [x] 3.1 Move `apps/hello/App.tsx` onto `Card`, `Label`, `Input`, `Button`; delete `Hello.css`. Keep the label, the announced greeting and the failed-response message. Verify `hello/App.test.tsx` passes.
- [x] 3.2 Move `apps/tips/App.tsx` onto the parts; delete `Tips.css`. Keep immediate recalculation, the selected tip's state and the guidance for empty or invalid input. Verify `tips/App.test.tsx` passes.

## 4. Access

- [x] 4.1 Rebuild `Table.tsx` on the `Table` parts with the container-query stacking, the visually hidden header row and `data-label` cells; restyle `View.tsx`'s view links and count, `Labels.tsx` as outline badges, and `Notices.tsx` on `Alert`. Verify `App.test.tsx`, `Roles.test.tsx` and `Grants.test.tsx` find the same tables, columns, rows and notices.
- [x] 4.2 Rebuild `RowMenu.tsx` on `DropdownMenu`, removing its own outside-click and Escape code; keep `RoleSelect.tsx` a real `<select>` in the `NativeSelect` part. Update the menu cases in `App.test.tsx` to open it the way the part listens for; keep every assertion on items per row state, Escape, and the role pick, undo and failed save. Verify those cases pass.
- [x] 4.3 Rebuild `Connect.tsx` on `Dialog`: the button beside the heading, the labelled popup, *Close*, Escape, outside click, steps loading on open. Verify the popup cases in `App.test.tsx`.
- [x] 4.4 Move the pages onto the parts: `Page.tsx`, `Confirm.tsx` (still inline), `SetFields.tsx`, `LevelChoice.tsx`, `PersonPage.tsx`, `RolePage.tsx`, `KeyPage.tsx`, `AppAccessPage.tsx`, `Owner.tsx`, `Own.tsx`, `People.tsx`, `Roles.tsx`, `Apps.tsx`, `Keys.tsx`, `App.tsx`. Keep `fieldset disabled` while saving and one solid button per page. Verify `PersonPage.test.tsx`, `Leaving.test.tsx`, `Roles.test.tsx`, `Grants.test.tsx`.
- [x] 4.5 Delete `Access.css`. Rewrite `access/style.test.ts` to render the parts and hold the same guarantees on their classes: no fixed pixel width, rows stack below the container width, the header row hidden from sight but present, no sideways scroll, the popup within the screen, the current view bold and underlined, radios on screen, a label bordered. Drop only the `.access-` selector assertion. Verify each kept assertion fails when its class is removed from the part, then passes.

## 5. The rule, the wiki and the update path

- [x] 5.1 Rewrite the **Styles** and **A mini app** bullets of `.agents/rules/code.md` as the design says, and the top comment of `index.css` to match. Verify every link in the rule resolves with `node scripts/check-payload-links.mjs`.
- [x] 5.2 Update `wiki/stack/mini-apps.md` (the tree, *Written like any page* with the add command, the shared-look paragraph), add Tailwind and shadcn rows to `wiki/stack/core-stack.md`, fix any piece `wiki/stack/employee-access.md` and `app/README.md` name. Verify with `node .github/scripts/checks.mjs --worktree`.
- [x] 5.3 Update `payload-files.json` for added and removed app files; add the one sentence on moving a target's own screens to `payload-manifest.md` with an offsetting cut; reword the stylesheet line in `catch-up.md`; add `app/public/style.css` to `scripts/retired-names.json`. Verify `node scripts/measure-context.mjs --check` and `node scripts/check-retired-names.mjs` pass.
- [x] 5.4 Replace the removed stylesheets in each journey's `sourcePaths` under `.agents/verification/journeys/` with the files that now hold those styles. Verify the journey files parse and name no deleted path.
- [x] 5.5 Add a `## Next (major)` entry at the top of `CHANGELOG.md` in plain words, with the **Updating.** note from the design. Verify it is the first entry.

## 6. Verification

- [x] 6.1 Run `npm test` in `app/` and `node .github/scripts/checks.mjs --worktree`; fix what fails. Record the after times for `npm ci`, `npm run build:app` and `npm test` beside the before times in the Decision log.
- [x] 6.2 `/save`, then walk the preview at a computer and a phone width, in light and dark: Home, Hello, the four Access views, a person's page, a role change with undo, the `⋯` menu by mouse and by keyboard, the connect popup, a removal question, and *Sign out*. Re-record the kept checks whose screens changed. Verify no screen scrolls sideways and nothing is unreadable in either mode.

## 7. Home: the Connect card and greyed apps

- [x] 7.1 Move the popup wrapper to `app/src/components/ConnectDialog.tsx`, taking its trigger as a child; Access's `Connect.tsx` passes its button. Verify the popup cases in `access/App.test.tsx` pass unchanged.
- [x] 7.2 In `AppList.tsx` and `Home.tsx`: remove the setup box from Home; add the Connect card last in the list, opening the popup; show each app an employee lacks as a greyed, focusable card with a *No access* badge whose click shows *Ask your admin for access to <title>.* under it and navigates nowhere. Keep the contact-your-employer line for an employee with no business apps and the first-request text when no apps are built. Update `AppList.test.tsx` and `Home.test.tsx`: held and lacked apps, the message on click and by keyboard, nothing greyed in the `legacy` and `not_started` states or for the owner, the Connect card opening and closing the popup, the loading and error states still withholding the list.
- [x] 7.3 Add a test beside `CopyText` or `AssistantSetup` that the text area carries the fixed-size class and its wrappers can shrink, for the overflow fixed after the first preview (the fix itself is already in `CopyText.tsx` and `AssistantSetup.tsx`). Verify it fails with the class removed.
- [x] 7.4 Update `wiki/stack/mini-apps.md` (*The home page lists the apps*: greyed cards, the Connect card, no box) and `wiki/stack/employee-access.md` where it says Home keeps its box; extend the `CHANGELOG.md` entry with the two Home changes. Verify with `node .github/scripts/checks.mjs --worktree`.
- [x] 7.5 Check `schema/seed.sql` gives a preview an employee who holds one app and lacks another; it does while Eli holds only the tip calculator. Verify with the seed's test.

## 8. Verification of the Home changes

- [x] 8.1 Run `npm test` in `app/` and `node .github/scripts/checks.mjs --worktree`; fix what fails.
- [x] 8.2 `/save`, then walk the preview at a computer and a phone width, light and dark: Home's list, the Connect card and its popup with the text inside its box, and a greyed card's message if the checker's sign-in can show one; name what it can't show.

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 2856 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: npm test runs absolute quality gates

The scaffold's `npm test` SHALL fail on any coverage below 100%, a function over the complexity cap, a file over 500 lines, an explicit `any`, a lint warning, dead code, or duplicated code. The gates SHALL be absolute, not baselined, and the scaffold SHALL pass all of them as shipped, with no extra workflow. The one folder of ready-made parts copied into the app SHALL be exempt from the coverage, dead-code, and duplicated-code gates and from the lint rule on what a component file exports, and from nothing else; no other folder SHALL be exempt.

#### Scenario: A violation

- **WHEN** a commit adds an explicit `any` or an uncovered line to the scaffold
- **THEN** `npm test` exits non-zero and the existing test check goes red

#### Scenario: The shipped scaffold

- **WHEN** `npm test` runs on the scaffold as shipped
- **THEN** every gate passes, and none is skipped or allowed to fail

#### Scenario: A lint warning

- **WHEN** a commit adds code the linter warns about but does not call an error
- **THEN** `npm test` exits non-zero

#### Scenario: A copied part is added

- **WHEN** a commit copies a ready-made part into the parts folder and a screen uses it with an uncovered line of the screen's own
- **THEN** `npm test` exits non-zero for the screen's line, and reports nothing for the copied part's own untested lines

### Requirement: The starter app is set up to grow

The starter app SHALL route its pages through a route list, with the home page as its only page and a not-found page for every other address. Each page SHALL live in its own folder with its parts and tests; a part used by one page SHALL live in that page's folder. The Worker SHALL route `/api/` requests through a route list of handlers, one per file, starting with `GET /api/health`. An unknown API route SHALL answer 404. The scaffold SHALL ship no empty folders. Main API actions deliberately exposed to agents SHALL receive the verified caller identity and explicit contracts shared by runtime validation and generated API discovery, with the health action supplied as the example. Existing signed-identity enforcement and installed handler checks SHALL remain effective.

#### Scenario: An unknown address

- **WHEN** a person opens `/nothing-here` on the app
- **THEN** they see a "page not found" message with a link home, not the home page

#### Scenario: The health route

- **WHEN** a caller sends `GET /api/health`
- **THEN** the Worker answers 200 with `{ "ok": true }`, and `GET /api/nothing` answers 404

#### Scenario: A main API action becomes discoverable

- **WHEN** a main API action is deliberately described and published
- **THEN** it is available through generated discovery and app and agent calls execute it with the same verified caller identity

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/mini-apps/spec.md utf8 4806 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Every page shares one stylesheet

The main app SHALL give every page, each mini app's included, one shared look from one stylesheet: the device's font, light or dark to match the device, and a narrow column. Every screen SHALL be built from one set of ready-made parts copied into the app, on a utility CSS framework. A page SHALL NOT carry a stylesheet of its own, and the app's checks SHALL fail when one does. The shared look SHALL provide coherent surfaces, text, accents, and visible keyboard focus, with readable contrast in both color modes.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's landing page and then /apps/hello/
- **THEN** both pages show the same font, parts, and light or dark colors, with readable text and visible keyboard focus

#### Scenario: A new mini app brings its own stylesheet

- **WHEN** a change adds a mini app whose folder holds a stylesheet
- **THEN** the app's checks fail and name that file

### Requirement: The home page lists every mini app

The home page SHALL list every mini app in the build that the current caller is authorized to use, each with its title, description, and link, and `/apps/` SHALL redirect to `/`. When Access per-app policy is enabled, an employee's list SHALL offer assigned apps and applicable self-service setup as links, and SHALL show each app they are not assigned as unavailable, marked by more than color; choosing an unavailable app SHALL open nothing and SHALL tell the person to ask their admin for access. Direct navigation SHALL enforce the same current app permission. The verified employer SHALL retain access to the app catalogue and Access administration. A preview SHALL list the app it previews for its authorized viewer. A mini app whose manifest lacks a title or description, or whose folder name is not lowercase letters, digits, and hyphens, SHALL fail the `test` check and name the folder.

#### Scenario: A malformed manifest

- **WHEN** a mini app's manifest has no title
- **THEN** the `test` check fails and names the folder

#### Scenario: Employee has selected apps

- **WHEN** an employee has Orders permission and no Payroll permission
- **THEN** the home page offers Orders and applicable setup, shows Payroll as unavailable, answers a click on Payroll with ask-your-admin guidance, and a direct Payroll visit is denied

### Requirement: The home page's app list guides first use

The home page SHALL present each authorized mini app as a clearly focused link with its title and description, and SHALL identify the supplied example as an example when available. With no apps built it SHALL explain how the employer can ask for a first tool. The list SHALL include a Connect your assistant entry for every signed-in person, which opens the setup steps over the page without leaving it. An employee with no assigned apps SHALL see guidance to contact the employer and retain access to their own setup. Unavailable permission readback SHALL show a safe retry state without an unrestricted list. The list SHALL remain readable and operable at phone widths and with keyboard navigation.

#### Scenario: Apps are available

- **WHEN** a person opens the home page of a workspace with authorized apps
- **THEN** each allowed app has a title, description, and keyboard-accessible link, and the supplied example is visibly labeled when allowed

#### Scenario: No apps yet

- **WHEN** a workspace has no mini apps
- **THEN** the employer sees a first-tool request to copy into their chat

#### Scenario: Employee has no assigned apps

- **WHEN** an employee signs in with no assigned business apps
- **THEN** the page gives contact-your-employer guidance and their setup entry without granting project creation or another app

#### Scenario: A person opens Connect your assistant from the list

- **WHEN** a signed-in person chooses Connect your assistant in the home page's list
- **THEN** the setup steps open over the home page, and closing them leaves the person on the home page

## ADDED Requirements

### Requirement: Screens on the earlier plain look move onto the parts on update

When an installed repo has screens of its own built on the earlier shared stylesheet, its next update SHALL plan moving each one onto the ready-made parts, and SHALL name every screen it moves. Each moved screen SHALL appear in the update's preview before anything is published. A moved screen SHALL keep its address, its behavior, and its data.

#### Scenario: An install with a mini app of its own updates

- **WHEN** a repo with its own mini app `quotes`, styled by its own stylesheet, syncs to this release
- **THEN** the update plan names `quotes`, the preview serves `/apps/quotes/` built from the parts, and it does what it did before

<!-- end specs/mini-apps/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-05

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 61216 fence=~~~ -->
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
<title>Review · 2026-10-05-tailwind-shadcn</title>
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
<body data-change="2026-10-05-tailwind-shadcn">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-05-tailwind-shadcn</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Every screen in the app is styled by hand today. Each table, menu, popup and button was written from scratch for the Access screen, and the next screen would write them again. After seeing the hand-styled Access preview you said we should &quot;default to shadcn for these sorts of things and not re-invent the wheel&quot;. This plan makes that the default for the whole app, for every mini app the assistant builds, and for every install.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Every screen is built from one set of ready-made parts.</b> Buttons, fields, tables, menus, popups, boxes and labels come from shadcn, a well-known set of parts, on Tailwind, the styling tool it is built with. No screen keeps a style file of its own.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">  BEFORE                AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">Access ─▶ own styles   Access ──┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">Home ───▶ own styles   Home ────┼─▶ +one set</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">Hello ──▶ own styles   Hello ───┘    of parts</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The look stays calm and familiar.</b> The device's own font, light or dark to match the device, black or white main buttons, the bar on top with <i>Sign out</i>, and each page at the width it has today. What you will notice is tidier spacing, corners and focus rings, and menus and popups that behave as they do in other products.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Access is restyled on the parts, and nothing moves.</b> The four views, the tables, the role dropdown in the row, the <code>⋯</code> menu, the notices and the <i>Connect your assistant</i> popup stay where they are and work as they do today. On a phone each row still stacks into short lines.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">│ W WongStack               [Sign out] │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">├──────────────────────────────────────┤</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│ Access           [Connect assistant] │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ [People 3]  Roles 2  Apps 2  Keys 1  │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│ People                  [Add person] │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">│ Who       Sign-in    Role          ⋯ │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">│ ──────────────────────────────────── │</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">│ you       Owner                      │</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">│ kim@…     Can sign   [Sales ▾]     ⋯ │</span>
<span class="ln" data-note="item-3-line-11" tabindex="0">│ lee@…     Waiting    [Own set ▾]   ⋯ │</span>
<span class="ln" data-note="item-3-line-12" tabindex="0">└──────────────────────────────────────┘</span>
<span class="ln" data-note="item-3-line-13" tabindex="0"> the same layout as today; each piece</span>
<span class="ln" data-note="item-3-line-14" tabindex="0"> is now a ready-made part</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Three Access pieces change what they are made of.</b> The words, the order and the steps stay the same.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">           │ today       │ after</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">───────────┼─────────────┼──────────────</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">⋯ menu     │ hand-built  │ ready-made,</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">           │             │ +arrow keys</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">popup      │ hand-built  │ ready-made</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">role       │ the phone's │ the phone's</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">dropdown   │ own picker  │ own picker</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Home, the example app and the setup box are restyled the same way.</b> The app cards, the welcome box, <i>Connect your assistant</i>, the copy button and the Hello example use the same parts, with the same words and steps.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Connect your assistant becomes a card among your apps.</b> The box that sat above the list on Home is gone. A <i>Connect your assistant</i> card sits in the list, and a click opens the same steps in a popup over the page. It does what it does today, for every signed-in person.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-1" tabindex="0">  BEFORE                    AFTER</span>
<span class="ln" data-note="item-6-line-2" tabindex="0">┌────────────────────────┐  ┌────────────────────────┐</span>
<span class="ln" data-note="item-6-line-3" tabindex="0">│ Connect your assistant │  │ Your apps              │</span>
<span class="ln" data-note="item-6-line-4" tabindex="0">│ Signed in as …         │  │ ┌────────────────────┐ │</span>
<span class="ln" data-note="item-6-line-5" tabindex="0">│ [Copy setup prompt]    │  │ │ Hello            → │ │</span>
<span class="ln" data-note="item-6-line-6" tabindex="0">│                        │  │ └────────────────────┘ │</span>
<span class="ln" data-note="item-6-line-7" tabindex="0">│ Your apps              │  │ ┌────────────────────┐ │</span>
<span class="ln" data-note="item-6-line-8" tabindex="0">│ ┌────────────────────┐ │  │ │ +Payroll  No access│ │</span>
<span class="ln" data-note="item-6-line-9" tabindex="0">│ │ Hello            → │ │  │ └────────────────────┘ │</span>
<span class="ln" data-note="item-6-line-10" tabindex="0">│ └────────────────────┘ │  │  +Ask your admin for   │</span>
<span class="ln" data-note="item-6-line-11" tabindex="0">│ (Payroll is hidden)    │  │  +access to Payroll.   │</span>
<span class="ln" data-note="item-6-line-12" tabindex="0">│                        │  │ ┌────────────────────┐ │</span>
<span class="ln" data-note="item-6-line-13" tabindex="0">│                        │  │ │ +Connect your      │ │</span>
<span class="ln" data-note="item-6-line-14" tabindex="0">│                        │  │ │ +assistant        →│ │</span>
<span class="ln" data-note="item-6-line-15" tabindex="0">│                        │  │ └────────────────────┘ │</span>
<span class="ln" data-note="item-6-line-16" tabindex="0">│                        │  │                        │</span>
<span class="ln" data-note="item-6-line-17" tabindex="0">│                        │  │                        │</span>
<span class="ln" data-note="item-6-line-18" tabindex="0">└────────────────────────┘  └────────────────────────┘</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-19" tabindex="0">the popup the card opens</span>
<span class="ln" data-note="item-6-line-20" tabindex="0">┌────────────────────────┐</span>
<span class="ln" data-note="item-6-line-21" tabindex="0">│ Connect your assistant │</span>
<span class="ln" data-note="item-6-line-22" tabindex="0">│ Signed in as …         │</span>
<span class="ln" data-note="item-6-line-23" tabindex="0">│ [Copy setup prompt]    │</span>
<span class="ln" data-note="item-6-line-24" tabindex="0">│                        │</span>
<span class="ln" data-note="item-6-line-25" tabindex="0">│                 [Close]│</span>
<span class="ln" data-note="item-6-line-26" tabindex="0">└────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>Apps a person can't use show greyed out.</b> Until now they were hidden. A greyed card is marked <i>No access</i>, opens nothing, and a click says to ask their admin for access. Opening its address directly is still refused. Everyone can now see the name and one-line description of every app.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>The copy text stays inside its box.</b> In the first preview the long setup text ran past the edge of the box; it now wraps.</div></div></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>Mini apps the assistant builds from now on use the parts.</b> A new screen is put together from the set. When a screen needs a part the app does not have yet, the assistant adds it in one step. A check stops a screen from bringing a style file of its own, so hand-styling can not creep back.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-9-line-1" tabindex="0">you: &quot;make me a quote form&quot;</span>
<span class="ln" data-note="item-9-line-2" tabindex="0">        │</span>
<span class="ln" data-note="item-9-line-3" tabindex="0">        ▼</span>
<span class="ln" data-note="item-9-line-4" tabindex="0">assistant picks parts ─▶ one missing?</span>
<span class="ln" data-note="item-9-line-5" tabindex="0">        │                    │ yes</span>
<span class="ln" data-note="item-9-line-6" tabindex="0">        ▼                    ▼</span>
<span class="ln" data-note="item-9-line-7" tabindex="0">     preview ◀────────── adds it</span></pre></div></details></li>
<li class="item card" id="item-10"><span class="num">10</span><div class="body"><div class="text" data-note="item-10" tabindex="0"><b>Installs get it on their next update.</b> The built-in screens switch to the new parts. Each screen an install built for itself is moved onto the parts too: the update's plan names every one, and each shows in the preview before anything is published. What a screen does, its address and its data stay as they are.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-10-line-1" tabindex="0">update ─▶ built-in screens switch</span>
<span class="ln" data-note="item-10-line-2" tabindex="0">   │</span>
<span class="ln" data-note="item-10-line-3" tabindex="0">   ▼</span>
<span class="ln" data-note="item-10-line-4" tabindex="0">own screens ─▶ each moved ─▶ preview</span>
<span class="ln" data-note="item-10-line-5" tabindex="0">                                │</span>
<span class="ln" data-note="item-10-line-6" tabindex="0">                                ▼</span>
<span class="ln" data-note="item-10-line-7" tabindex="0">                             publish</span></pre></div></details></li>
<li class="item card" id="item-11"><span class="num">11</span><div class="body"><div class="text" data-note="item-11" tabindex="0"><b>The copied parts skip three checks.</b> The parts arrive as code copied into the app. That one folder is not held to <i>every line tested</i>, <i>nothing unused</i> and <i>nothing repeated</i>; the screens that use the parts still are. A fault inside a copied part is caught by a screen's test or by the preview, not by a test of its own.</div></div></li>
<li class="item card" id="item-12"><span class="num">12</span><div class="body"><div class="text" data-note="item-12" tabindex="0"><b>Building takes a little longer.</b> The app gains several building blocks, so the first preview in a new workspace installs more. The build measures the time before and after and reports it.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> <i>Connect your assistant</i> installing the project on a person's device, with access to the code following their app login: that gets its own plan right after this one. Popups for <i>Remove this person?</i> and <i>Leave without saving?</i>, or a <i>Saved</i> note in the corner. A switch for light and dark, new colours, or a new logo. A change to what Access does, to who can sign in, or to any data. The public landing site and the plan review page. A list of parts added ahead of need: a part arrives when a screen first uses it.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what the switch should cover → chose the whole app, the mini apps the assistant builds from now on, and installs on their next update.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what an install's next update should do with screens of its own → chose to restyle them too, each named in the plan and shown in the preview.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked whether the copied parts are held to every line tested, nothing unused and nothing repeated → chose to ease the rules for that one folder.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked how far the Access restyle should go → chose the same screen on new parts; no popups for questions and no <i>Saved</i> note in the corner.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: this replaces the 2026-09-27 choice to keep the look light with no UI library, because he asked for shadcn by default after seeing the hand-styled Access screen.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the look keeps the device's font, follows the device for light or dark, and uses shadcn's neutral colours, because that is today's look and he asked for ready-made parts, not a new brand.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the role dropdown in a row stays the phone's own picker, in the ready-made style, because it is easier to use on a phone than a drawn list and it saves at once as today.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: no screen keeps a style file of its own and a check enforces it, because one leftover file is how hand-styling comes back; a screen with a real one-off need adds it to the one shared stylesheet.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the shared stylesheet at its old address is removed, not kept beside the new one, because its rules for plain buttons and fields would override the ready-made parts.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the update moves an install's own screens through the release's updating note and the failing check, with no new updater code, because the note already becomes a to-do in every update plan and the check names each file left.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: this is a major release, because an install's own screens stop looking right until its update moves them.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a part is added when a screen first uses it, because parts added ahead of need are unused code in every install.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what next for the finished plan → chose to build it now, with a preview before anything is published.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-05</p>Check: <code>app/vitest.config.ts</code> leaves <code>src/components/ui/**</code> out of coverage, because the parts are copied as their makers wrote them and are exercised through the screens that use them; every other file stays at 100%.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-05</p>Check: <code>app/.jscpd.json</code> and <code>app/knip.jsonc</code> skip <code>src/components/ui/**</code>, because a copied part repeats lines its neighbours have and exports pieces no screen uses yet; trimming each would stop it matching the original.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-05</p>Check: <code>app/.oxlintrc.json</code> turns the lint rule that a component file exports only components off for <code>src/components/ui/**</code>, because a copied part exports its style variants beside it; every other lint rule still holds there.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-05</p>Check: <code>app/src/apps/access/style.test.ts</code> drops the assertion that every selector starts with <code>.access-</code>, because the file it read is gone; the new check that no screen has a style file replaces it, and its phone and not-by-colour-alone assertions are kept against the screens' own code.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-05</p>Check: <code>app/src/style.test.ts</code> no longer reads <code>public/style.css</code>, because that file is removed; it checks the one stylesheet for light and dark, and the frame for the narrow column and the full-width bar.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build: every task's own test run moved to the end, after all code and tests were written, because the build writes first and checks once. Each check still ran: a stray style file, an untested line outside the parts folder, and each class removed from an Access part all fail as the tasks ask.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build: measured on this computer, before → after: <code>npm ci</code> 4.6 s → 9.7 s, <code>npm run build:app</code> 3.7 s → 5.5 s, <code>npm test</code> 21.0 s → 24.7 s, and the installed packages 548 MB → 635 MB.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: ticks and the level choice stay the browser's own checkbox and radio buttons, styled to match, not the drawn <code>Checkbox</code> and <code>RadioGroup</code> parts, because the screens promise real radio buttons kept on screen and their tests read them; those two parts are not added.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: an Access list is a plain table built from the parts' header, body, row and cell, without the part's outer frame, because that frame scrolls sideways and the rows stack instead.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the <code>⋯</code> menu does not lock the page while it is open, because a locking menu took the keyboard back from <i>Remove this person?</i>; Escape still returns the keyboard to the dots, and a click elsewhere closes it as before.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build: the shadcn command now supplies one package, <code>cn</code>, by shadcn's author, where the design listed <code>clsx</code> and <code>tailwind-merge</code>; the style is <code>new-york</code>, the command's current name for its standard style.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build: <code>app/.jscpd.json</code> holds no comment for its exemption, because the repeated-code checker ignores the whole file when it has one and then passes everything; the reason is the <code>Check:</code> entry above and the comment in <code>app/knip.jsonc</code>.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build: two mentions outside the plan's list changed with the removed stylesheet: the example address in <code>wiki/stack/cloudflare-access.md</code> now probes <code>/favicon.svg</code>, and a sample asset path in <code>app/worker/index.test.ts</code> no longer names <code>style.css</code>.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-05</p>Check: <code>app/tsconfig.app.json</code> and <code>app/tsconfig.json</code> add the <code>@/</code> path alias the ready-made parts import by and the shadcn command reads, because the parts arrive written that way; no type check is switched off or eased.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Save: every screen is built on the parts and the local checks pass; left are the preview walk in light and dark at two widths (task 6.2) and re-recording the three kept Access checks.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Preview walk: passed at a computer and a phone width, in light and dark, for Home, Hello, the four Access views, a person's page, the menu by mouse and keyboard, the popup, a removal question and a role pick with undo. Not shown on the preview: the loaded <i>Connect your assistant</i> prompt (the preview refuses it to the checker; code tests cover it), a click on <i>Sign out</i>, and an install updating. The three kept Access checks are re-recorded at publish, where kept checks run.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked, after seeing the preview, for <i>Connect your assistant</i> as a card among the apps that opens a popup, and for something a person lacks to show greyed with a warning to ask their admin.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what a person sees for what they lack on Home → chose greyed for apps too, knowing everyone then sees every app's name.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked how to handle <i>Connect your assistant</i> installing the project with code access by app login, which is not what it does today → chose its own plan next; here it keeps linking an assistant to a person's apps, for every signed-in person.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the Connect card is never greyed in this change, because today every signed-in person may connect and who gets the code is decided in the next plan.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the Connect card sits last in the list, because it is used about once per person and the apps are used daily.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a greyed card's message shows under that card and stays until another is picked, because a popup for one sentence is heavier than the sentence.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: Access keeps its own <i>Connect your assistant</i> button for whoever manages it, because he approved it there earlier today and asked only about Home.</li>
<li class="decision card" id="decision-37" data-note="decision-37" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: nothing is greyed before per-app permissions start, because everyone holds every app until then.</li>
<li class="decision card" id="decision-38" data-note="decision-38" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Preview: the setup text ran past its box on the first preview; fixed by keeping the text area at the box's width.</li>
<li class="decision card" id="decision-39" data-note="decision-39" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build: the Home changes are written and the local checks pass; the new copy-text test fails with the fixed-size class removed. The practice data needed no change: Eli already holds the tip calculator and lacks Hello. Left is the preview walk (task 8.2).</li>
<li class="decision card" id="decision-40" data-note="decision-40" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the Connect card's one line reads <i>Use your apps from your own assistant.</i>, because a card needs a description like its neighbours and the plan gave none.</li>
<li class="decision card" id="decision-41" data-note="decision-41" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the employer's list stays as it was, with an app outside the catalogue left off, not greyed, because greying was chosen for what an employee lacks.</li>
<li class="decision card" id="decision-42" data-note="decision-42" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build: three cases in Access's own test file that draw Home changed with it: the setup box gave way to the Connect card, and a lacked app is a greyed card, not a missing one.</li>
<li class="decision card" id="decision-43" data-note="decision-43" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Save: the Connect card, the greyed apps and the copy-text fix are built and the local checks pass; left is the preview walk of Home (task 8.2).</li>
<li class="decision card" id="decision-44" data-note="decision-44" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Preview walk of Home: the Connect card opens and closes its popup at both widths, light and dark. Not shown: a greyed app and the setup text inside its box, because the checker signs in as the owner and is refused the setup prompt; code tests cover both. The landing-page check was cancelled twice in the queue without running; the tests, payload checks and deploy passed.</li>
<li class="decision card" id="decision-45" data-note="decision-45" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what next with the landing-page check never started → chose to save the last notes and run every check again; nothing is published by that.</li>
<li class="decision card" id="decision-46" data-note="decision-46" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Archive checkpoint: asked to publish after the preview → chose to try shipping it; built, both walks passed, numbered 35.0.0. Left for a person: open the <i>Connect your assistant</i> card with their own sign-in and see the setup text inside its box.</li>
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
