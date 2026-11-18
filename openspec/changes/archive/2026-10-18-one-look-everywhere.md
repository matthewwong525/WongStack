<!-- openspec-archive v1 2026-10-18-one-look-everywhere -->
<!-- file proposal.md utf8 11396 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 8403 -->
# Design: One calm look on every page

## Context

See [proposal.md](proposal.md) for why. Today three looks exist:

- `app/src/index.css`: Tailwind 4 plus shadcn's neutral oklch tokens, dark by `prefers-color-scheme`. Every app screen is built from `app/src/components/ui/` (new-york style).
- `.agents/skills/plan/references/review-kit.html`: hand-written greys (`#e6e6e6` page, `#333` primary), 4–6px radii, uppercase labels, light only. `build-review.mjs` requires exactly one `<style>` and one `<script>` and inlines nothing; the page must fetch nothing.
- `.agents/skills/hand-over/scripts/private-page.css`: blue accent, 12px radii, its own dark set, served by `hand-over.mjs` at `/page.css` to `keys-page.html`, `passwords-page.html`, `form-page.html`, and `view-page.html`. Each page adds a small `<style>` of its own.
- `reply-link.mjs`'s `CLOSED_PAGE`: inline-styled bare text.

Constraints: the standalone pages can't run React or Tailwind, and must stay offline. Phone fields stay at 16px or larger so iOS doesn't zoom. The review page keeps its larger desktop text, set on 2026-10-11 (`review-notes-straight-to-build`).

## Goals / Non-Goals

**Goals:** one colour source (the app's stylesheet); shadcn's shapes drawn in plain CSS for the standalone pages; one light look on every device; a light polish of the app's headings and bar.

**Non-Goals:** the landing site (`site/`); any change to markup structure, wording, layout, or behavior that the existing tests pin; archived `review.html` files, which stay as built.

## Decisions

### Colours come from `app/src/index.css`, read at build or serve time

`look.mjs` exports `lookCss(root)`. It reads `app/src/index.css` under `root`, takes the custom properties from the first plain `:root { … }` block and returns them followed by `look.css`'s parts. When the file or the set is missing, it uses `look.css`'s own `:root` copy of shadcn's neutral light tokens.

- *Over a copied token block kept equal by a test:* a copy goes stale, and an install that rebrands its app would fail a shipped equality test or keep the old colours on its review pages.
- *Over generating CSS from Tailwind:* the plan and hand-over scripts would need the app's build toolchain.

The fallback copy is shadcn's published neutral set, an upstream reference rather than our own fact, so drift costs only an un-rebranded fallback.

### `look.css` holds shadcn's parts as plain classes

It lives at `.agents/skills/plan/references/look.css`, beside the kit that inlines it; hand-over already imports across skills. It maps the token names to plain CSS: `--background`, `--foreground`, `--card`, `--muted`, `--muted-foreground`, `--primary`, `--primary-foreground`, `--border`, `--input`, `--ring`, `--destructive`, `--radius`. Its parts mirror `components/ui/` values:

| Part | Mirrors | Shape |
|---|---|---|
| `.btn`, `.btn-primary`, `.btn-outline`, `.btn-ghost` | `button.tsx` default / outline / ghost | `border-radius: calc(var(--radius) - 2px)`, `font-weight: 500`, `box-shadow` xs on outline, ring focus |
| `.field` (`input`, `select`, `textarea`) | `input.tsx` | 1px `--input` border, md radius, 3px `--ring` at 50% focus ring |
| `.card` | `card.tsx` | `--card` surface, 1px `--border`, `--radius` + 4px, `shadow-sm` |
| `.tag` | `badge.tsx` secondary / outline | full radius, 12px, weight 500 |

Element selectors (`button`, `input`) take the same rules, so markup that tests pin needs no class changes: the kit's `button.primary` and the private pages' `button.main` map onto the primary look. Sizes stay where the touch-target tests need them (the review bar's 64px phone buttons, 44px minimums).

- *Over pulling shadcn's CSS from a CDN:* the review page and private pages must fetch nothing.

### Wiring

- `build-review.mjs` replaces a `/* look */` marker inside the kit's one `<style>` with `lookCss(repoRoot)`. The kit still has exactly one `<style>`. Pages already built rebuild on their next `/save` (`--require-current`).
- `hand-over.mjs` serves `/page.css` as `lookCss(<the scripts' own checkout>) + private-page.css`. `private-page.css` shrinks to page-only rules (steps, tick, the `Private link` tag's lock, `.actions`), drawn from the tokens.
- `reply-link.mjs`'s `CLOSED_PAGE` becomes a small card built from `lookCss` once at start-up.

### Review kit colour mapping

`--ink` → `--foreground`, `--muted` → `--muted-foreground`, `--line` → `--border`, `--fill` → `--muted`; page background `--background`, cards `--card`. Hard-coded `#fff`, `#333`, `#222` and the `rgba` shadows become tokens. Pele's `--pele-*` variables take the tokens, so pre-drawn pictures turn dark too. The uppercase eyebrow and section labels become sentence-case muted 14px labels. The toast uses `--primary` / `--primary-foreground`.

### App polish

In `index.css`'s base layer: `h1` 1.75rem → 1.5rem (1.875rem from `md`), weight 700 → 600, `letter-spacing: -0.025em`; `h2` 1.125rem, weight 600, the same tracking; `body` gets `antialiased` and `font-feature-settings: "rlig" 1, "calt" 1`. In `Layout.tsx`, the bar goes from `h-15 bg-background` to `h-14 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60`. No layout or frame change, so the one-frame tests hold.

### Skeletons

Add shadcn's part with `npx shadcn@latest add skeleton` from `app/` and leave it as written. Each loading state keeps its `role="status"` element, with its words moved into an `sr-only` span, and adds `aria-hidden` skeleton blocks shaped like the result:

| Where | Skeleton |
|---|---|
| `Home.tsx` apps | three app cards in the same grid as `AppList`: a title line and two description lines |
| `AppPage.tsx` | a heading line and one card block |
| `access/App.tsx`, `access/Owner.tsx` | the view tabs' height, then five table rows of four cells |
| `AssistantSetup.tsx` | three step lines |
| `keys-page.html` | one card with a title line, two text lines, and a field-height block, removed once `/keys` answers |

`index.css` stops the pulse under `prefers-reduced-motion`. `look.css` gets a `.skeleton` class drawn the same way: `--accent` fill, md radius, the same pulse and reduced-motion stop. Tests that read the loading words keep finding them, because the words stay in the status element.

### Always light

Decided after the second build (see the proposal's Decision log). `index.css` drops its `@media (prefers-color-scheme: dark)` block and sets `color-scheme: light`. Tailwind 4's `dark:` variant follows the device by default, so the shadcn parts' `dark:` classes would still fire on a dark device over light surfaces; `@custom-variant dark (&:where(.dark, .dark *));` ties it to a `.dark` class nothing sets. `look.css` drops its dark fallback set and its media block, `look.mjs` reads one set, and the review kit, private pages, and closed page set `color-scheme: light`. The dark-mode browser test becomes one that emulates a dark device and finds light surfaces. A later dark switch would add the `.dark` class and a dark set back.

### Note box

`#editor` and `#chip` read as layers above the page: `box-shadow: 0 10px 38px -10px rgb(0 0 0 / .35), 0 10px 20px -15px rgb(0 0 0 / .2)` (Radix's popover shadow) and a `--input` border. Docked on a phone, the box gets an upward shadow (`0 -8px 24px rgb(0 0 0 / .12)`) and a 1px `--input` top edge, so the page above it reads as behind it.

### Saved and missing marks

The saved tick uses `--primary` with `--primary-foreground`. The missing-key mark uses `--destructive`. `.ok` text uses `--foreground` at weight 600.

## Risks / Trade-offs

- [oklch needs Safari 15.4+ (2022)] → The app already depends on it.
- [A regex reader breaks on a reformatted stylesheet] → `look.test.mjs` runs the reader over the shipped `app/src/index.css` and fails, naming the missing set. The fallback keeps pages drawn meanwhile.
- [Tests pin colours or class names] → Browser and markup tests that assert old hex values or the blue accent are updated to assert the tokens. Structure and accessibility assertions stay as they are.
- [An open review page built before this change] → It keeps its old look until its next `/save` rebuilds it; archived pages never change.

## Migration Plan

Nothing to move. Installs receive the files on `/wong-sync`. A target that rebranded `app/src/index.css` sees its colours on its review and private pages from then on. Rollback is a revert.

<!-- end design.md -->
<!-- file tasks.md utf8 6969 -->
# Tasks

## 1. The shared look

- [x] 1.1 Write `.agents/skills/plan/references/look.css`: shadcn's neutral light and dark tokens as the fallback `:root` sets, then the parts from [design.md](design.md#lookcss-holds-shadcns-parts-as-plain-classes) (button variants, field, card, tag, focus ring), on element selectors and classes. Verify by reading it against `app/src/components/ui/{button,input,card,badge}.tsx`.
- [x] 1.2 Write `.agents/skills/plan/scripts/look.mjs` exporting `lookCss(root)`: read both colour sets from `<root>/app/src/index.css`, fall back per set to `look.css`'s, and return tokens followed by parts. Verify with 1.3.
- [x] 1.3 Add `scripts/tests/look.test.mjs`: it reads both sets from the shipped `app/src/index.css`; a changed `--primary` in a temp copy shows up in the output in light and dark; a missing file or set falls back and names the set; the output holds no `url(` or `@import`. Verify with `node --test scripts/tests/look.test.mjs`.

## 2. The review page

- [x] 2.1 Restyle `review-kit.html`'s one `<style>` by the [colour mapping](design.md#review-kit-colour-mapping): a `/* look */` marker first, every hard-coded colour a token, a dark mode through the tokens, Pele's variables on tokens, and sentence-case muted labels. Keep every size the touch-target and desktop tests pin. Verify the kit still has one `<style>` and one `<script>`.
- [x] 2.2 In `build-review.mjs`, replace the marker with `lookCss(repoRoot)` and fail when the marker is missing. Verify in `scripts/tests/review.test.mjs`: the built page carries the tokens and parts, still fetches nothing, and a kit without the marker throws.
- [x] 2.3 Update `scripts/tests/review-browser.test.mjs` wherever it asserts old colours, and add a dark-mode case: with `prefers-color-scheme: dark` emulated, the body, a card, and the bar have dark backgrounds and readable text (contrast at least 4.5:1). Verify with the browser suite.
- [x] 2.4 Update the review-file paragraph in `wiki/ux-principles.md` to say the page follows the device's light or dark setting in the app's colours. Verify with the wiki checks.

## 3. The private pages

- [x] 3.1 Cut `private-page.css` down to page-only rules (steps, tick, `Private link` tag, actions, missing mark) drawn from the tokens, with the blue removed, the tick on `--primary`, and the missing mark on `--destructive`. Keep 16px fields and the 3rem main button. Restyle the per-page `<style>` blocks in `keys-page.html`, `passwords-page.html`, `form-page.html`, and `view-page.html` the same way. Verify no `#`-hex colour remains outside a fallback.
- [x] 3.2 Serve `/page.css` from `hand-over.mjs` as `lookCss()` of the scripts' own checkout plus `private-page.css`. Verify in `scripts/tests/hand-over.test.mjs` that `/page.css` carries the tokens, then the page rules.
- [x] 3.3 Rebuild `reply-link.mjs`'s `CLOSED_PAGE` as a small centred card from `lookCss`. Verify in `scripts/tests/reply-link.test.mjs` that a closed link's page holds the tokens and still says *This link has closed*.
- [x] 3.4 Update `scripts/tests/form-page.test.mjs` and `scripts/tests/view-page.test.mjs` where they read `private-page.css` alone or pin old colours. Verify with `node --test` on both.

## 4. The app

- [x] 4.1 Polish `app/src/index.css`'s base layer and `app/src/Layout.tsx`'s bar as [design.md](design.md#app-polish) says. Update `app/src/style.test.ts` if it pins heading sizes. Verify with `npm test` in `app/` (coverage stays 100%).
- [x] 4.2 Extend the shared-look paragraph in `wiki/stack/mini-apps.md`: the review page and private pages take their colours from `app/src/index.css` through `look.mjs`, so a rebrand reaches them. Verify with the wiki checks.

## 4b. Skeletons

- [x] 4b.1 Run `npx shadcn@latest add skeleton` in `app/` and leave the part as written; stop its pulse under reduced motion in `index.css`. Verify the part is unchanged from the command's output.
- [x] 4b.2 Replace each loading line in `Home.tsx`, `AppPage.tsx`, `access/App.tsx`, `access/Owner.tsx`, and `AssistantSetup.tsx` with the [skeletons](design.md#skeletons), keeping the words in an `sr-only` span inside the `role="status"` element. Add or update tests so each loading state shows `aria-hidden` skeleton blocks and its status still reads the words. Verify with `npm test` in `app/` (coverage stays 100%).
- [x] 4b.3 Add `.skeleton` to `look.css` and a skeleton card to `keys-page.html` that shows until `/keys` answers. Verify in `scripts/tests/hand-over.test.mjs` or the key page's test that the card is present before the list and gone after.
- [x] 4b.4 Mention the skeletons in the shared-look paragraph of `wiki/stack/mini-apps.md` (a loading state shows skeletons shaped like what loads), and in the CHANGELOG entry. Verify with the wiki checks.

## 4c. Always light, and the note box

- [x] 4c.1 Make every page light by [always light](design.md#always-light): drop the dark set and media block from `index.css` and `look.css`, add the `dark` custom variant, read one set in `look.mjs`, and set `color-scheme: light` in the kit, private pages, and closed page. Update `look.test.mjs`, `style.test.ts`, and any test that reads the dark set. Verify with `npm test` in `app/` and `node --test scripts/tests/look.test.mjs`.
- [x] 4c.2 Replace the review page's dark-mode browser test with one that emulates a dark device and finds light surfaces and readable text on the body, a card, and the bar; do the same for a key page if a browser test covers it. Verify with the review browser suite.
- [x] 4c.3 Give the note box and chip the [overlay shadow and edge](design.md#note-box), docked and floating. Add a browser check that the opened editor has a non-`none` box-shadow in both modes. Verify with the review browser suite.
- [x] 4c.4 Update `wiki/stack/mini-apps.md` (light on every device, not light or dark to match the device), `wiki/ux-principles.md`'s review-file line, and the CHANGELOG entry, with an **Updating** line for an install that relied on dark mode. Verify with the wiki checks.

## 5. Release notes and records

- [x] 5.1 Add a `## Next (minor) — One calm look on every page` entry at the top of `CHANGELOG.md`, in plain words, with an **Updating** line: a rebranded `app/src/index.css` now colours the review and private pages too. Verify the payload checks pass.
- [x] 5.2 Add `.agents/skills/plan/references/look.css` to the `review` area's paths in `.agents/skills/memory/references/areas.json`, and plan to add `openspec/specs/shared-look/spec.md` to its docs at archive. Verify with `node --test scripts/tests/memory-areas.test.mjs`.

## 6. Final checks

- [x] 6.1 Run the local pre-check (`node scripts/payload-checks.mjs` and the changed suites), then `/save` and open the preview. Take phone and desktop pictures, on a light and on a dark device, of a built review page with its note box open, a key link, and Home, plus a loading skeleton, and show them in the chat with a link to an example of each page.

<!-- end tasks.md -->
<!-- file specs/mini-apps/spec.md utf8 2161 -->
## MODIFIED Requirements

### Requirement: Every page shares one stylesheet

The main app SHALL give every page, each mini app's included, one shared look from one stylesheet: the device's font, one light look whatever the device's light or dark setting, and one frame whose left edge is the same on every page. Every page SHALL use the whole frame, none in a narrower column of its own, and a page SHALL never be wider than the screen. Every screen SHALL be built from one set of ready-made parts copied into the app, on a utility CSS framework. A page SHALL NOT carry a stylesheet of its own, and the app's checks SHALL fail when one does. The shared look SHALL provide coherent surfaces, text, accents, and visible keyboard focus, with readable contrast.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's landing page, then /apps/hello/, then Access
- **THEN** all three show the same font, parts, and light colors, and their headings start at the same left edge with their content reaching the same right edge

#### Scenario: A new mini app brings its own stylesheet

- **WHEN** a change adds a mini app whose folder holds a stylesheet
- **THEN** the app's checks fail and name that file

### Requirement: The starter and example share an editable identity

The starter and supplied example SHALL show the WongStack mark and name in a compact header with the mark and name forming the keyboard-accessible link home, without a second Home link. They SHALL share a neutral light theme consistent with WongStack Cloud. Their branding SHALL remain changeable through the ordinary workspace change process. Updates SHALL preserve an install's customized identity through review rather than silently overwrite it.

#### Scenario: Open the supplied example

- **WHEN** a person opens the starter home and follows its Hello card
- **THEN** both pages show the same WongStack identity and theme, and the example provides a clear way home

#### Scenario: A customized install updates

- **WHEN** an install with its own identity takes a reviewed starter update
- **THEN** its chosen branding is preserved or explicitly adapted in that review

<!-- end specs/mini-apps/spec.md -->
<!-- file specs/shared-look/spec.md utf8 2204 -->
## Purpose

Every page WongStack draws, inside the app or as a standalone page, looks like one product: the app's colours, shadcn's shapes, and one light look on every device.

## ADDED Requirements

### Requirement: Standalone pages take the app's look

The plan review page, the key link, the password link, the private form, and a closed link's page SHALL use the app's colours, read from the app's one stylesheet when it is present and shadcn's neutral colours when it is not. Each SHALL stay light when the device is set to dark, draw its buttons, fields, cards, and tags in the same shapes as the app's ready-made parts, and give each screen state one filled primary action. Red SHALL mark only a problem. A standalone page SHALL still load nothing from the network.

#### Scenario: A rebranded app carries its colours

- **WHEN** the app's stylesheet sets a different primary colour and a plan's review page is built, then a key link is opened
- **THEN** both pages draw their primary button in that colour

#### Scenario: A device set to dark

- **WHEN** a person whose device is set to dark opens a plan's review page, a key link, or Home
- **THEN** each shows the same light surfaces and dark text it shows on a light device

### Requirement: The look stays one look

The app and the standalone pages SHALL keep their text readable, and the checks SHALL fail when the colour reader can no longer find the colour set in the app's stylesheet.

#### Scenario: The stylesheet's shape changes

- **WHEN** a change rewrites the app's stylesheet so its colour set is no longer found
- **THEN** the checks fail and say the set is missing

### Requirement: Loading shows the shape of what loads

While the app's screens or the key page wait for their content, they SHALL show still-announced placeholder blocks shaped like that content, not a line of text alone. A screen reader SHALL still hear that it is loading, and the placeholders SHALL not pulse for a person who turns motion off.

#### Scenario: Home loads its apps

- **WHEN** a person opens Home before their apps have arrived
- **THEN** grey blocks shaped like app cards fill the apps grid, and the page announces that it is loading the apps

<!-- end specs/shared-look/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-18

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 65543 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, and the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-18-one-look-everywhere</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour set between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral colours stays only for a colour it can't find. Every page stays light, even on a dark device.
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

/* Tailwind's shadow-xs, shadow-sm and shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the
   bottom, so a layer reads as above the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --look-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --look-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 0 4px; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; }
  .item > .drawing:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 var(--pad); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--foreground); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--border); background:var(--muted); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:var(--pad); min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted-foreground); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--background); }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--muted); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { grid-template-columns:repeat(3, minmax(0, 1fr)); padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
</head>
<body data-change="2026-10-18-one-look-everywhere">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-18-one-look-everywhere</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The app, the plan review page, and the private key and password pages each look different. The app uses shadcn's clean black and white. The review page is grey with square buttons and has no dark mode. The private pages are blue with big rounded boxes. Moving between them feels like three products, and the busier two feel heavier than they need to.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Every page takes the app's colours, always in light.</b> The review page and the private pages use the same black, white, and soft greys as the app. Every page, the app included, stays light even when your device is set to dark. Red marks only a problem. When you change the app's colours, these pages follow.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">        │ now           │ after</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">────────┼───────────────┼────────────</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">app     │ light or dark │ always</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">        │ by the device │ light</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">review  │ grey, light   │ app colours,</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">        │               │ light</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">private │ blue, light   │ app colours,</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">        │ or dark       │ light</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The plan review page looks like the app.</b> It gets a plain background with white cards, rounded buttons, and quiet section labels. The three bottom buttons stay where they are: <i>Send notes</i> is filled black, while <i>Build it</i> and <i>Build and publish</i> are outlined. Adding a note opens a box with a clear shadow, so it plainly sits on top of the page.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">  BEFORE                 AFTER</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">┌────────────────────┐ ┌────────────────────┐</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│░REVIEW░░░░░░░░░░░░░│ │ Review             │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│░change-name░░░░░░░░│ │ change-name        │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│┌──────────────────┐│ │ ╭────────────────╮ │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">││ (1) Item text    ││ │ │ 1  Item text   │ │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">││ [+ Note]         ││ │ │    + Note      │ │</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">│└──────────────────┘│ │ ╰────────────────╯ │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">├────────────────────┤ ├────────────────────┤</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">│[Send][Build][Pub.] │ │ ■Send  □Build □Pub │</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">└────────────────────┘ └────────────────────┘</span>
<span class="ln" data-note="item-2-line-12" tabindex="0"> grey page, square      plain page, rounded,</span>
<span class="ln" data-note="item-2-line-13" tabindex="0"> buttons                one filled button</span>

<span class="ln" data-note="item-2-line-15" tabindex="0">NOTE BOX (phone)</span>
<span class="ln" data-note="item-2-line-16" tabindex="0">┌────────────────────┐</span>
<span class="ln" data-note="item-2-line-17" tabindex="0">│ Why  ...           │</span>
<span class="ln" data-note="item-2-line-18" tabindex="0">│ ▓▓ paragraph ▓▓    │</span>
<span class="ln" data-note="item-2-line-19" tabindex="0">├══ shadow above ════┤</span>
<span class="ln" data-note="item-2-line-20" tabindex="0">│ A question or a    │</span>
<span class="ln" data-note="item-2-line-21" tabindex="0">│ change             │</span>
<span class="ln" data-note="item-2-line-22" tabindex="0">│ ■Save □Discard     │</span>
<span class="ln" data-note="item-2-line-23" tabindex="0">└────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The private key, password, and form pages lose the blue.</b> The <i>Private link</i> label becomes a small grey tag with its lock. Fields, steps, and the save button match the app's, and <i>Save and continue</i> is filled black. A saved key shows a black or white tick, not a green one.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">  BEFORE                 AFTER</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">┌────────────────────┐ ┌────────────────────┐</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ (Private link)blue │ │ [lock Private link]│</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│ Keys for your      │ │ Keys for your      │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ assistant          │ │ assistant          │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│ (1) blue step      │ │ 1  grey step       │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">│ [paste here      ] │ │ [paste here      ] │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">│ [Save and continue]│ │ [Save and continue]│</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">│   blue, rounded    │ │   black, slim      │</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">└────────────────────┘ └────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The app gets a light polish so it sets the tone.</b> Headings are a touch lighter and tighter, the top bar is slimmer and softly see-through, and text renders smoother. Nothing moves and no screen changes what it does.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">  BEFORE                 AFTER</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">┌────────────────────┐ ┌────────────────────┐</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">│ W WongStack        │ │ W WongStack   thin │</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">├────────────────────┤ ├────────────────────┤</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">│ BIG BOLD HEADING   │ │ Calmer heading     │</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">│ Your tools, in one │ │ Your tools, in one │</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">│ place.             │ │ place.             │</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">│ ╭──────╮ ╭──────╮  │ │ ╭──────╮ ╭──────╮  │</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">│ │Hello │ │Access│  │ │ │Hello │ │Access│  │</span>
<span class="ln" data-note="item-4-line-10" tabindex="0">│ ╰──────╯ ╰──────╯  │ │ ╰──────╯ ╰──────╯  │</span>
<span class="ln" data-note="item-4-line-11" tabindex="0">└────────────────────┘ └────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Loading shows the shape of what's coming.</b> Where a screen says <i>Loading your apps…</i> or <i>Loading people…</i>, it shows soft grey placeholder blocks shaped like the cards, rows, or steps about to appear. The key page does the same while its keys load. Screen readers still hear <i>Loading…</i>, and the blocks hold still for anyone who turns motion off.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">  BEFORE                 AFTER</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">┌────────────────────┐ ┌────────────────────┐</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">│ Your apps          │ │ Your apps          │</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">│ Loading your apps… │ │ ╭──────╮ ╭──────╮  │</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">│                    │ │ │▒▒▒▒  │ │▒▒▒▒  │  │</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">│                    │ │ │▒▒▒▒▒▒│ │▒▒▒▒▒▒│  │</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">│                    │ │ ╰──────╯ ╰──────╯  │</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">└────────────────────┘ └────────────────────┘</span>
<span class="ln" data-note="item-5-line-9" tabindex="0"> one line of text       grey blocks where</span>
<span class="ln" data-note="item-5-line-10" tabindex="0">                        the cards will be</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The &quot;link has closed&quot; page matches too.</b> A closed private or review link shows the same calm card instead of bare text.</div></div></li>
</ol>
<p class="aside">Non-goals: the landing site, which keeps its own dark look. No new screens, no moved buttons, no changed wording beyond the loading lines, and no change to what any page does.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked which pages get the new look → chose the app, the plan review pages, and the private key, password, and form pages; the landing site keeps its own look.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked what colour buttons and highlights should be → chose shadcn's plain black and white, with red only for problems.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked how to fit with the smaller review bar job → chose to do both in this job. That job turned out to have shipped on 2026-10-10 and was then replaced by three visible buttons on 2026-10-11, so this change keeps the three buttons and only restyles them.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the standalone pages read the app's colours from <code>app/src/index.css</code> when built or served, falling back to shadcn's neutral set, because a rebranded app should carry its colours everywhere with no second copy to update.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: keep the device's own font and offline pages, because the review page loads nothing from the network and a bundled font would add weight for little gain.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: a saved-key tick turns black or white and the missing-key mark turns red, because the person chose black and white with red only for problems, and a missing key needs action.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: keep the review page's larger desktop text and the private pages' 16px fields, because the first was asked for on 2026-10-11 and the second stops phones zooming in on a field.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the landing site's open job is unaffected, because the landing site is out of scope.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the review builder and the private pages read colours from the checkout their scripts sit in, not the primary checkout, because it never fails outside a Git checkout and always matches the parts file beside it.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked, after seeing the first build, to use skeletons as well → each loading line becomes placeholder blocks shaped like what loads, on the app's screens and the key page.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: skeletons show at once, with no delay, and keep a hidden <i>Loading…</i> line for screen readers, because shadcn's skeleton has no delay and the loading status must stay announced.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-18</p>Asked, after seeing the build, whether pages should start light → chose always light on every page, the app included, over a dark switch or following the device.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-18</p>Assumed: the note box gets a clear shadow and a firmer edge, because the person said it no longer looked like it sits on top, and the first build's thin border and faint shadow made it blend into the page.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-18</p>Archive checkpoint: archived for publishing as 43.7.0, with the new look spec added to the review area's docs.</li>
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
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line or picture to note it</p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" hidden>
    <button type="button" data-ready="build"><span class="spinner" hidden aria-hidden="true"></span><span>Build it</span></button>
    <button type="button" data-ready="publish" aria-expanded="false" aria-controls="ready-confirm">Build and publish</button>
    <div id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><p>Goes live, can't be undone.</p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span>Yes, publish</span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
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
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture)-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'picture' ? 'picture ' + m[4] : m[3] ? 'drawing line ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: 'Change #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    const parts = el.classList.contains('pic') ? Array.prototype.map.call(c.querySelectorAll('text'), function (n) { return n.textContent; }) : [c.textContent];
    const text = parts.join(' ').replace(/\s+/g, ' ').trim();
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
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
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
    bar();
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
    bar();
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
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
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
    fit(d); bar();
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
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return { id: n.id, label: n.label, text: n.text }; }); }
  function acknowledge(notes) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
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
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), n = notes.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: bullets(notes).join('\n') });
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes);
      says('Sent ' + plural(n) + ' to the chat.');
      toast('Sent ' + plural(n) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── visible build choices, with publish confirmation above the footer ──
  let version = null;
  const publishButton = $('ready').querySelector('[data-ready="publish"]');
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    publishButton.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen && !$('ready').hidden) publishButton.focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready');
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(pending === (step === 'yes' ? 'publish' : step) && step !== 'publish'));
      const spinner = b.querySelector('.spinner');
      if (spinner) {
        const active = pending === (step === 'yes' ? 'publish' : step);
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : step === 'yes' ? 'Yes, publish' : 'Build it';
      }
    });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length) body.text = bullets(notes).join('\n');
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
        : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || step === 'publish') {
      says('');
      $('ready-confirm').hidden = step === 'cancel';
      publishButton.setAttribute('aria-expanded', String(step === 'publish'));
      bar();
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
