# One calm look on every page

**Status:** built; final checks pending

**Branch:** uniform-sleek-ui

**Open questions:** none

## Why

The app, the plan review page, and the private key and password pages each look different. The app uses shadcn's clean black and white. The review page is grey with square buttons and has no dark mode. The private pages are blue with big rounded boxes. Moving between them feels like three products, and the busier two feel heavier than they need to.

## What Changes

- **Every page takes the app's colours.** The review page and the private pages use the same black, white, and soft greys as the app, in light or dark to match your device. Red marks only a problem. When you change the app's colours, these pages follow.
  ```text
          │ now          │ after
  ────────┼──────────────┼─────────────
  app     │ black, white │ same
  review  │ grey, light  │ app colours,
          │ only         │ light + dark
  private │ blue         │ app colours
  ```
- **The plan review page looks like the app.** It gets a plain background with white cards, rounded buttons, and quiet section labels. The three bottom buttons stay where they are: *Send notes* is filled black, while *Build it* and *Build and publish* are outlined. It turns dark at night.
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
- **The "link has closed" page matches too.** A closed private or review link shows the same calm card instead of bare text.

Non-goals: the landing site, which keeps its own dark look. No new screens, no moved buttons, no changed wording, and no change to what any page does.

## Capabilities

### New Capabilities

- `shared-look`: every page WongStack draws, inside the app or as a standalone page, takes its colours from the app's one stylesheet and its parts from shadcn's shapes.

### Modified Capabilities

None. Behavior and layout requirements in `mini-apps`, `ux-wireframes`, and `browser-logins` stay as written; only the paint changes.

## Impact

- New `.agents/skills/plan/references/look.css`: shadcn-shaped parts (button, field, card, badge, step) in plain CSS, plus shadcn's neutral colours as a fallback.
- New `.agents/skills/plan/scripts/look.mjs`: reads the light and dark colour sets from `app/src/index.css`, falling back to `look.css`'s copy, and returns the finished CSS.
- `review-kit.html` and `build-review.mjs`: the kit's one `<style>` holds the shared look, inlined by the builder, then the kit's own layout.
- `hand-over.mjs` serves the shared look plus `private-page.css`'s page-only rules at `/page.css`; the four private pages and `reply-link.mjs`'s closed page are restyled.
- `app/src/index.css` and `app/src/Layout.tsx`: heading weights, smoother text, slimmer translucent bar.
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
