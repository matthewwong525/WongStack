# Design: One calm look on every page

## Context

See [proposal.md](proposal.md) for why. Today three looks exist:

- `app/src/index.css`: Tailwind 4 plus shadcn's neutral oklch tokens, dark by `prefers-color-scheme`. Every app screen is built from `app/src/components/ui/` (new-york style).
- `.agents/skills/plan/references/review-kit.html`: hand-written greys (`#e6e6e6` page, `#333` primary), 4–6px radii, uppercase labels, light only. `build-review.mjs` requires exactly one `<style>` and one `<script>` and inlines nothing; the page must fetch nothing.
- `.agents/skills/hand-over/scripts/private-page.css`: blue accent, 12px radii, its own dark set, served by `hand-over.mjs` at `/page.css` to `keys-page.html`, `passwords-page.html`, `form-page.html`, and `view-page.html`. Each page adds a small `<style>` of its own.
- `reply-link.mjs`'s `CLOSED_PAGE`: inline-styled bare text.

Constraints: the standalone pages can't run React or Tailwind, and must stay offline. Phone fields stay at 16px or larger so iOS doesn't zoom. The review page keeps its larger desktop text, set on 2026-10-11 (`review-notes-straight-to-build`).

## Goals / Non-Goals

**Goals:** one colour source (the app's stylesheet); shadcn's shapes drawn in plain CSS for the standalone pages; dark mode on the review page; a light polish of the app's headings and bar.

**Non-Goals:** the landing site (`site/`); any change to markup structure, wording, layout, or behavior that the existing tests pin; archived `review.html` files, which stay as built.

## Decisions

### Colours come from `app/src/index.css`, read at build or serve time

`look.mjs` exports `lookCss(root)`. It reads `app/src/index.css` under `root`, takes the custom properties from the first plain `:root { … }` block and from the `:root` inside `@media (prefers-color-scheme: dark)`, and returns them followed by `look.css`'s parts. When the file or a set is missing, it uses `look.css`'s own `:root` copy of shadcn's neutral tokens.

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

### Saved and missing marks

The saved tick uses `--primary` with `--primary-foreground`. The missing-key mark uses `--destructive`. `.ok` text uses `--foreground` at weight 600.

## Risks / Trade-offs

- [oklch needs Safari 15.4+ (2022)] → The app already depends on it. The private pages' old note about `light-dark()` still holds: dark colours stay in a media block.
- [A regex reader breaks on a reformatted stylesheet] → `look.test.mjs` runs the reader over the shipped `app/src/index.css` and fails, naming the missing set. The fallback keeps pages drawn meanwhile.
- [Tests pin colours or class names] → Browser and markup tests that assert old hex values or the blue accent are updated to assert the tokens. Structure and accessibility assertions stay as they are.
- [An open review page built before this change] → It keeps its old look until its next `/save` rebuilds it; archived pages never change.

## Migration Plan

Nothing to move. Installs receive the files on `/wong-sync`. A target that rebranded `app/src/index.css` sees its colours on its review and private pages from then on. Rollback is a revert.
