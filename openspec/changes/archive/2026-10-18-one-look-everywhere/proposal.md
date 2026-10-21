# One calm look on every page

**Status:** ready-to-ship

**Branch:** uniform-sleek-ui

**Open questions:** none

## Why

The app, the plan review page, and the private key and password pages each look different. The app uses shadcn's clean black and white. The review page is grey with square buttons and has no dark mode. The private pages are blue with big rounded boxes. Moving between them feels like three products, and the busier two feel heavier than they need to.

## What Changes

- **Every page takes the app's colours, always in light.** The review page and the private pages use the same black, white, and soft greys as the app. Every page, the app included, stays light even when your device is set to dark. Red marks only a problem. When you change the app's colours, these pages follow.
  ```text
          │ now           │ after
  ────────┼───────────────┼────────────
  app     │ light or dark │ always
          │ by the device │ light
  review  │ grey, light   │ app colours,
          │               │ light
  private │ blue, light   │ app colours,
          │ or dark       │ light
  ```
- **The plan review page looks like the app.** It gets a plain background with white cards, rounded buttons, and quiet section labels. The three bottom buttons stay where they are: *Send notes* is filled black, while *Build it* and *Build and publish* are outlined. Adding a note opens a box with a clear shadow, so it plainly sits on top of the page.
  ```text
    BEFORE                 AFTER
  ┌────────────────────┐ ┌────────────────────┐
  │░REVIEW░░░░░░░░░░░░░│ │ Review             │
  │░change-name░░░░░░░░│ │ change-name        │
  │┌──────────────────┐│ │ ╭────────────────╮ │
  ││ (1) Item text    ││ │ │ 1  Item text   │ │
  ││ [+ Note]         ││ │ │    + Note      │ │
  │└──────────────────┘│ │ ╰────────────────╯ │
  ├────────────────────┤ ├────────────────────┤
  │[Send][Build][Pub.] │ │ ■Send  □Build □Pub │
  └────────────────────┘ └────────────────────┘
   grey page, square      plain page, rounded,
   buttons                one filled button

  NOTE BOX (phone)
  ┌────────────────────┐
  │ Why  ...           │
  │ ▓▓ paragraph ▓▓    │
  ├══ shadow above ════┤
  │ A question or a    │
  │ change             │
  │ ■Save □Discard     │
  └────────────────────┘
  ```
- **The private key, password, and form pages lose the blue.** The *Private link* label becomes a small grey tag with its lock. Fields, steps, and the save button match the app's, and *Save and continue* is filled black. A saved key shows a black or white tick, not a green one.
  ```text
    BEFORE                 AFTER
  ┌────────────────────┐ ┌────────────────────┐
  │ (Private link)blue │ │ [lock Private link]│
  │ Keys for your      │ │ Keys for your      │
  │ assistant          │ │ assistant          │
  │ (1) blue step      │ │ 1  grey step       │
  │ [paste here      ] │ │ [paste here      ] │
  │ [Save and continue]│ │ [Save and continue]│
  │   blue, rounded    │ │   black, slim      │
  └────────────────────┘ └────────────────────┘
  ```
- **The app gets a light polish so it sets the tone.** Headings are a touch lighter and tighter, the top bar is slimmer and softly see-through, and text renders smoother. Nothing moves and no screen changes what it does.
  ```text
    BEFORE                 AFTER
  ┌────────────────────┐ ┌────────────────────┐
  │ W WongStack        │ │ W WongStack   thin │
  ├────────────────────┤ ├────────────────────┤
  │ BIG BOLD HEADING   │ │ Calmer heading     │
  │ Your tools, in one │ │ Your tools, in one │
  │ place.             │ │ place.             │
  │ ╭──────╮ ╭──────╮  │ │ ╭──────╮ ╭──────╮  │
  │ │Hello │ │Access│  │ │ │Hello │ │Access│  │
  │ ╰──────╯ ╰──────╯  │ │ ╰──────╯ ╰──────╯  │
  └────────────────────┘ └────────────────────┘
  ```
- **Loading shows the shape of what's coming.** Where a screen says *Loading your apps…* or *Loading people…*, it shows soft grey placeholder blocks shaped like the cards, rows, or steps about to appear. The key page does the same while its keys load. Screen readers still hear *Loading…*, and the blocks hold still for anyone who turns motion off.
  ```text
    BEFORE                 AFTER
  ┌────────────────────┐ ┌────────────────────┐
  │ Your apps          │ │ Your apps          │
  │ Loading your apps… │ │ ╭──────╮ ╭──────╮  │
  │                    │ │ │▒▒▒▒  │ │▒▒▒▒  │  │
  │                    │ │ │▒▒▒▒▒▒│ │▒▒▒▒▒▒│  │
  │                    │ │ ╰──────╯ ╰──────╯  │
  └────────────────────┘ └────────────────────┘
   one line of text       grey blocks where
                          the cards will be
  ```
- **The "link has closed" page matches too.** A closed private or review link shows the same calm card instead of bare text.

Non-goals: the landing site, which keeps its own dark look. No new screens, no moved buttons, no changed wording beyond the loading lines, and no change to what any page does.

## Capabilities

### New Capabilities

- `shared-look`: every page WongStack draws, inside the app or as a standalone page, takes its colours from the app's one stylesheet and its parts from shadcn's shapes.

### Modified Capabilities

- `mini-apps`: the shared look stays light on every device, no longer light or dark to match the device. Layout requirements there and in `ux-wireframes` and `browser-logins` stay as written.

## Impact

- New `.agents/skills/plan/references/look.css`: shadcn-shaped parts (button, field, card, badge, step) in plain CSS, plus shadcn's neutral colours as a fallback.
- New `.agents/skills/plan/scripts/look.mjs`: reads the colour set from `app/src/index.css`, falling back to `look.css`'s copy, and returns the finished CSS.
- `review-kit.html` and `build-review.mjs`: the kit's one `<style>` holds the shared look, inlined by the builder, then the kit's own layout.
- `hand-over.mjs` serves the shared look plus `private-page.css`'s page-only rules at `/page.css`; the four private pages and `reply-link.mjs`'s closed page are restyled.
- `app/src/index.css` and `app/src/Layout.tsx`: heading weights, smoother text, slimmer translucent bar; the dark colour set and device-following dark mode removed, and Tailwind's `dark:` tied to a `.dark` class nothing sets.
- shadcn's `skeleton` part added to `app/src/components/ui/`; loading states in `Home.tsx`, `AppPage.tsx`, `access/App.tsx`, `access/Owner.tsx`, and `AssistantSetup.tsx`, and the key page's list, show skeletons.
- Tests: `review.test.mjs`, `form-page.test.mjs`, `view-page.test.mjs`, `hand-over.test.mjs`, `review-browser.test.mjs`, `app/src/style.test.ts`, and a new `look.test.mjs`.
- Wiki: `wiki/stack/mini-apps.md` (the shared look) and `wiki/ux-principles.md` (the review file).
- Payload release: a minor CHANGELOG entry; VERSION stays unchanged until publishing.

## Decision log

- **2026-10-18** — Asked which pages get the new look → chose the app, the plan review pages, and the private key, password, and form pages; the landing site keeps its own look.
- **2026-10-18** — Asked what colour buttons and highlights should be → chose shadcn's plain black and white, with red only for problems.
- **2026-10-18** — Asked how to fit with the smaller review bar job → chose to do both in this job. That job turned out to have shipped on 2026-10-10 and was then replaced by three visible buttons on 2026-10-11, so this change keeps the three buttons and only restyles them.
- **2026-10-18** — Assumed: the standalone pages read the app's colours from `app/src/index.css` when built or served, falling back to shadcn's neutral set, because a rebranded app should carry its colours everywhere with no second copy to update.
- **2026-10-18** — Assumed: keep the device's own font and offline pages, because the review page loads nothing from the network and a bundled font would add weight for little gain.
- **2026-10-18** — Assumed: a saved-key tick turns black or white and the missing-key mark turns red, because the person chose black and white with red only for problems, and a missing key needs action.
- **2026-10-18** — Assumed: keep the review page's larger desktop text and the private pages' 16px fields, because the first was asked for on 2026-10-11 and the second stops phones zooming in on a field.
- **2026-10-18** — Assumed: the landing site's open job is unaffected, because the landing site is out of scope.
- **2026-10-18** — Assumed: the review builder and the private pages read colours from the checkout their scripts sit in, not the primary checkout, because it never fails outside a Git checkout and always matches the parts file beside it.
- **2026-10-18** — Asked, after seeing the first build, to use skeletons as well → each loading line becomes placeholder blocks shaped like what loads, on the app's screens and the key page.
- **2026-10-18** — Assumed: skeletons show at once, with no delay, and keep a hidden *Loading…* line for screen readers, because shadcn's skeleton has no delay and the loading status must stay announced.
- **2026-10-18** — Asked, after seeing the build, whether pages should start light → chose always light on every page, the app included, over a dark switch or following the device.
- **2026-10-18** — Assumed: the note box gets a clear shadow and a firmer edge, because the person said it no longer looked like it sits on top, and the first build's thin border and faint shadow made it blend into the page.
- **2026-10-18** — Archive checkpoint: archived for publishing as 43.7.0, with the new look spec added to the review area's docs.
