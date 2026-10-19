# A light and dark switch on every page

**Status:** ready-to-ship

**Branch:** light-dark-mode-toggle

**Open questions:** none

## Why

Every page is now always light. Some people work in a dark room or simply prefer dark, and today they have no way to get it.

## What Changes

- **A sun or moon button sits in the top right of every page.** In the app it sits at the right of the top bar, beside *Sign out*, on Home and every mini app. On the plan review page and the private key, password, form, and view pages it sits in the top right corner. It shows a moon while the page is light and a sun while it is dark.
  ```text
  APP (phone)               REVIEW / PRIVATE PAGE
  ┌──────────────────────┐ ┌──────────────────────┐
  │W WongStack ☾ Sign out│ │                   ☾  │
  ├──────────────────────┤ │ Review               │
  │ Your apps            │ │ change-name          │
  │ ╭──────╮ ╭──────╮    │ │ ╭──────────────────╮ │
  │ │ app  │ │ app  │    │ │ │ 1  Item text     │ │
  │ ╰──────╯ ╰──────╯    │ │ ╰──────────────────╯ │
  └──────────────────────┘ └──────────────────────┘
  ```
- **Pages start light; one tap turns them dark, and they stay that way.** Each page starts light, as now, whatever the device's setting. A tap flips it at once, with no reload. The browser remembers the choice, so the next visit opens the same way.
  ```mermaid
  flowchart TB
    open["Open a page"] --> saved{"Chose before?"}
    saved -- no --> light["Light"]
    saved -- yes --> choice["Your last choice"]
    light -- "tap ☾" --> dark["Dark, remembered"]
  ```
- **Dark uses the app's own dark colours.** The dark set is shadcn's neutral dark, kept beside the light set in the app's one stylesheet, so a rebranded app's dark colours reach the review and private pages too. Red still marks only a problem, and text stays readable.
  ```text
          │ light          │ dark
  ────────┼────────────────┼────────────────
  page    │ white          │ near black
  cards   │ white          │ dark grey
  buttons │ black, filled  │ white, filled
  problem │ red            │ softer red
  ```

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `shared-look`: standalone pages start light and offer the switch; the dark set comes from the app's stylesheet.
- `mini-apps`: every app page starts light and offers the switch in its top bar.

## Impact

- `app/src/index.css`: a `.dark` colour set back beside the light one; `color-scheme` follows the class.
- `app/index.html`: a tiny inline script sets `.dark` before the first paint from the saved choice.
- New `app/src/components/ThemeToggle.tsx` (with test) in `Layout.tsx`'s bar.
- `.agents/skills/plan/references/look.css` and `scripts/look.mjs`: read and emit both sets, dark under `.dark`; the switch's button style.
- New shared `.agents/skills/plan/references/theme.js`: sets the class early, draws the button, and saves the choice; inlined into the review page by `build-review.mjs` and served by `hand-over.mjs` as `/theme.js` for the private pages.
- `review-kit.html`, the four private page HTML files, and `hand-over.mjs`.
- Tests: `look.test.mjs`, `review.test.mjs`, `review-browser.test.mjs`, `hand-over.test.mjs`, `app/src/style.test.ts`, the new toggle test.
- Wiki: `wiki/stack/mini-apps.md` and `wiki/ux-principles.md`.
- Payload release: a minor CHANGELOG entry.

## Decision log

- **2026-10-18** — Asked (in the request) for a light and dark switch with a symbol in the top right on everything → this replaces the earlier choice of always light, which stays the starting look.
- **2026-10-18** — Assumed: pages start light, not by the device's setting, because the person chose light as the look earlier the same day and asked only for a switch.
- **2026-10-18** — Assumed: "everything" means the app, its mini apps, the review page, and the private pages, because those share one look; the landing site keeps its own look, as chosen for the shared look.
- **2026-10-18** — Assumed: a closed link's page gets no button and stays light, because it is a one-line dead end with nothing to read.
- **2026-10-18** — Assumed: each browser remembers the choice per site, because the app, the private pages, and a review file each live at their own address and cannot share one saved setting.
- **2026-10-18** — Assumed: building on #392's branch, because the person said it is going to merge.
- **2026-10-19** — Assumed: on the review and private pages the switch scrolls away with the page rather than staying pinned, because a pinned button sat over text while scrolling.
- **2026-10-19** — Assumed: on the live view page the switch sits in the bottom bar beside the typing box, because a corner button would cover the remote browser's screen.
- **2026-10-19** — Archive checkpoint: archived for publishing, built on #392 after it merged; Matthew's wiki page now says pages start light with a switch.
