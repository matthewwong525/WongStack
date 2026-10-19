# Design: A light and dark switch on every page

## Context

[#392](https://github.com/matthewwong525/WongStack/pull/392) made every page always light: `app/src/index.css` holds one `:root` set, Tailwind's `dark:` is tied to a `.dark` class nothing sets, and `look.mjs` copies that one set into the review page and the private pages, which each set `color-scheme: light`. Its design noted that a later switch adds the `.dark` class and a dark set back. This change does that.

## Goals / Non-Goals

- Goals: one switch, one saved key, one dark set, the same behaviour on every surface.
- Non-goals: following the device's setting; the landing site (`site/`); a closed link's page; sharing the choice across sites.

## Decisions

### One class, one key

The `.dark` class on `<html>` turns dark on. The saved choice is `localStorage['wongstack-theme']`, `"dark"` or `"light"`; missing or unreadable means light. A storage error (private mode, a blocked `file://`) still switches the page, only without remembering. `color-scheme` is `light` on `:root` and `dark` on `.dark`, so form controls and scrollbars follow.

### The dark set lives beside the light set

`index.css` gets `.dark { … }` right after `:root { … }`, holding shadcn's neutral dark values (as in `e6bd24e9`'s media block). `look.mjs` reads both: `lookColours` returns `{ colours, dark, missing }` where `dark` is the first plain `.dark` block, laid over `look.css`'s fallback `.dark` set; `lookCss` writes `:root { … }` then `.dark { … }` between the token markers. A missing dark set falls back like the light one. Keep `colourSet`'s "first plain block with this prelude" rule so both stay one readable block each.

Alternative: emit the dark set under `@media (prefers-color-scheme: dark)` too. Rejected: the person chose light as the start.

### No flash before paint

- App: a tiny classic inline `<script>` in `app/index.html`'s `<head>` reads the key in a `try` and adds `.dark`. Vite keeps it inline. If the worker sets a CSP, keep it allowed (hash it or move it to `/theme-init.js` in `public/`; check `app/worker` before choosing).
- Review page: `build-review.mjs` inlines `theme.js` into the kit, which already carries one `<style>` and one `<script>`; the init line runs at the top of the existing `<script>` placed in `<head>`, or a second small head script if the kit test allows it. Keep the "fetches nothing" rule.
- Private pages: `hand-over.mjs` serves `/theme.js`; each page loads it with a blocking `<script src="theme.js">` in `<head>` after `page.css`, same origin, so an existing `script-src 'self'` policy holds.

### One script for the standalone pages

New `.agents/skills/plan/references/theme.js` (plain, no modules): on load it applies the saved choice; on `DOMContentLoaded` it appends a `<button class="theme-toggle" type="button">` to `<body>`, fixed top right, with an inline SVG moon or sun (lucide's `moon` and `sun` paths), `aria-label` "Switch to dark" / "Switch to light", and `aria-pressed` reflecting dark. Click toggles the class, saves, and swaps icon and label. `look.css` styles `.theme-toggle`: ghost button, 44×44 px, `position: fixed; top: 12px; right: 12px; z-index` above the page but below the note editor, safe-area aware.

The review page already has its own header; place the button so it does not cover the header's text (pad the header's right side by the button width).

### App toggle

New `app/src/components/ThemeToggle.tsx`: a shadcn ghost `Button` with `size="icon"`, lucide-react `Moon`/`Sun` (already a dependency through shadcn parts; confirm), the same key and labels. It reads the current class on mount and toggles `document.documentElement.classList`. `Layout.tsx` puts it at the right of the bar in a flex group with *Sign out*, so it shows with or without sign-in. Coverage stays 100%.

### Pele drawings

The review page's Mermaid pictures are pre-drawn by Pele on the kit's CSS variables. Check that their fills and strokes use the tokens so they turn dark; any baked colour in the vendored output maps to a token.

## UX

- Phone first: the button is 44 px, in the top bar's right in the app and in the page's top-right corner elsewhere; it never covers a heading, the review bar, or the note box.
- The icon shows the look you switch *to*: moon on light, sun on dark. The label says the same for screen readers.
- Keyboard: reachable by Tab, the shared focus ring, Enter and Space toggle.

## Risks / Trade-offs

- [The choice doesn't follow the person between the app and a private link] → they are different sites; each remembers its own. Said in the wiki.
- [Old review files built before this change stay light] → only rebuilt pages get the switch.
- [A rebrand with no `.dark` set] → falls back to shadcn's neutral dark, which may clash with a coloured brand; the wiki tells a rebrander to set both.

## Migration Plan

Nothing to migrate: a page with no saved choice looks as it does today. Rollback is reverting the change.
