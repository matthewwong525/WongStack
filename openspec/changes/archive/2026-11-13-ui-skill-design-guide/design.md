# Design

## Context

See proposal.md for the why. What the source holds today, checked on `main` at 61.5.0:

- No UI skill. Screen guidance sits in `wiki/ux-principles.md` (judgment), `.agents/rules/code.md` *Where things go* (mechanics), and the plan skill's `## UX` line.
- The `ui` payload group carries three wiki pages: `ux-principles.md`, `review-pages.md`, `prototypes.md`.
- `app/src/index.css` is the app's one stylesheet: shadcn's neutral colours in one plain `:root` block and one `.dark` block, `--radius: 0.625rem`, `--font-sans: system-ui, sans-serif` in `@theme inline`, Tailwind's default shadows. The ready-made parts in `app/src/components/ui/` are as shadcn's command wrote them and read only theme values.
- `look.mjs` copies **every** custom property of those two blocks over `look.css`'s fallback copy, so the review page, the key link, the live view, and a closed link's page follow them. `look.css` holds its own shadows (`--look-shadow-*`) and font stack.
- `app/.oxlintrc.json` loads `@shadcn/lint` (0.2.1 in the lockfile) with no `shadcn/*` rule on.
- `measure-context.mjs --check` leaves 155 words and 3,808 bytes of skill instructions, and 27 start-up words under the 2,200 ceiling.

Measured for this plan, each rule alone on the starter with `oxlint`:

| Rule | In screens | In `components/ui/` |
|---|---|---|
| `shadcn/no-raw-colors` | 0 | 0 |
| `shadcn/no-inline-styles` | 0 | 0 |
| `shadcn/no-unknown-classes` | 0 | 0 |
| `shadcn/require-static-classes` | 0 | 0 |
| `shadcn/no-arbitrary-values` | 7 | 39 |
| `shadcn/no-restyle` | 93 | 10 |

A throwaway file with `style=`, `bg-pink-500`, and `rounded-huge` made the first three fire, so the zeros are real.

## Goals / Non-Goals

**Goals:**

- One short skill that every screen task loads, with links that resolve in the source and in an install.
- A guide an install can follow with any brand: structure and defaults, no required colour.
- A starter look that is the guide's own example, set only through the stylesheet's values.
- Checks that hold what a script can hold: readable brand colours, the four rules, the fixed tool version.

**Non-Goals:**

- No edit to any file in `app/src/components/ui/`, and no class change on any screen.
- No `## UX` section here: no screen is added or restructured.
- No change to `look.mjs`, and no change to `look.css`'s fallback colours: a repo with no app keeps today's review page.
- No install of Google's own skill file, and no `legacy-scan`.

## Decisions

### 1. The skill: `.agents/skills/ui/SKILL.md`, a plain skill

A plain skill folder with one file, listed in `core.skillDirs`, as adding a skill (`wiki/maintaining/adding-a-skill.md`) says. Not a module: it has no hooks and no setup guide.

Frontmatter: `name: ui`, `user-invocable: true`, and a description of 27 words or fewer that holds the triggers: any screen work, a page, a part, a style. The body stays under 150 words:

1. Read UX principles (`wiki/ux-principles.md`): the job, the flow, one primary action.
2. Read the design guide (`wiki/design-guide.md`): the look and the brand values.
3. Build from the ready-made parts, by the code rule (`.agents/rules/code.md#where-things-go`).
4. At need, look a guide up: `npx -y modern-web-guidance@1.0.0 search "<2 to 5 words>"`, then `retrieve "<id>"`. The parts win a disagreement. No answer from the tool → go on, and say it was not read.
5. Finish with the app's lint; a design-rule failure names the fix.

*Why a skill and not only a path rule:* the person settled on one skill as the door. A path rule loads only on an edit under `app/**`, which is after the design is done; the skill loads at the plan, when the look is chosen.

*Size:* if the body or description goes over, trim this skill's own lines first. The plan does not raise `startupCeiling`.

### 2. Three places send the assistant to the skill

- The skill's description, which each session lists.
- `.agents/rules/code.md`, *Styles* bullet: one clause, *load the `ui` skill before screen work*. A rule file is outside the instruction count.
- The plan skill's screen line (*A change that adds or restructures a screen gets a `## UX` design section*): add a link to `ui`. The added words come out of the same file.

`AGENTS.md`'s `WONG-STACK` block gets no line: the start-up count has no room, and the three places above cover planning and building.

### 3. The guide: `wiki/design-guide.md`, in `ui.files`

A reference page, so prose and tables, under 1,200 words. Title *Design guide*; first sentence says what it is. It links up to `wiki/README.md`, sideways to `ux-principles.md`, `voice.md`, `review-pages.md`, and `stack/mini-apps.md#the-home-page-lists-the-apps`, and down to `app/src/index.css` and the lint config.

Sections and what each fixes:

- **The feel.** Calm, roomy, friendly. Credits Airbnb's four principles (Unified, Universal, Iconic, Conversational) with a link to [Building a visual language](https://airbnb.design/building-a-visual-language/), and says the feel is borrowed, not the brand.
- **Colour.** One accent, `--primary`, for the one primary action, links, and the focus ring. Neutral greys for surfaces, text, and borders. `--destructive` only for a problem. Says that shadcn's `--accent` is the grey hover tint, not the brand accent, so nobody recolours it. Text on any colour keeps 4.5 to 1.
- **Type.** One font, `--font`. Title 1.75rem (2rem from 48rem wide), heading 1.25rem, text 1rem, small 0.875rem. Weight 600 for titles and headings, 400 for text. Muted colour before a smaller size.
- **Space.** Tailwind's scale only. Inside a group 2 to 3 units, between groups 6 to 8, between page sections 10 to 12. A card pads 6. A page keeps the shared frame.
- **Shape and depth.** `--radius` sets every corner; a card is the largest. Three shadows: low (a control), card, raised (a dialog or a menu). A card has a shadow or a border, never a box inside a box.
- **Pictures.** Large, corners as a card, fixed shapes (1:1, 4:3, 16:9), `object-cover`, real alt text, a skeleton while loading.
- **Words.** Short and friendly, as voice (`wiki/voice.md`) says: a verb on a button, no blame in an error, the next step in an empty page.
- **Motion.** 150 to 200 ms, on colour, shadow, and opacity only; nothing moves under `prefers-reduced-motion`.
- **Set your brand.** The value list of decision 4, with the one file to edit.
- **The check.** The four rules, the readable-colour check, and that a failure message names the fix.

`wiki/ux-principles.md` changes one sentence: where it says the stack's conventions own *which component, which token*, it links the design guide beside the code rule. `wiki/README.md` and setup's seed `wiki-README.md` each gain one link. `.agents/rules/payload.md` gains the path. `payload-manifest.md`'s *UI* line names the guide.

### 4. The brand values in `app/src/index.css`

All in the existing `:root` and `.dark` blocks, so `look.mjs` carries them with no change. `@theme inline` maps them for Tailwind:

```css
@theme inline {
  --font-sans: var(--font);
  --shadow-xs: var(--shadow-low);
  --shadow-sm: var(--shadow-card);
  --shadow-md: var(--shadow-raised);
  --shadow-lg: var(--shadow-raised);
}
```

| Value | Light | Dark |
|---|---|---|
| `--font` | `system-ui, sans-serif` | same |
| `--radius` | `0.875rem` | same |
| `--primary` | `oklch(0.54 0.22 292)` | `oklch(0.76 0.13 292)` |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.2 0.03 292)` |
| `--ring` | `oklch(0.62 0.19 292)` | `oklch(0.62 0.19 292)` |
| `--foreground`, `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--accent-foreground` | `oklch(0.24 0 0)` | unchanged |
| `--muted-foreground` | `oklch(0.52 0 0)` | unchanged |
| `--shadow-low` | `0 1px 2px rgb(0 0 0 / 0.04)` | `0 1px 2px rgb(0 0 0 / 0.3)` |
| `--shadow-card` | `0 1px 2px rgb(0 0 0 / 0.04), 0 6px 20px rgb(0 0 0 / 0.06)` | `0 1px 2px rgb(0 0 0 / 0.3), 0 6px 20px rgb(0 0 0 / 0.3)` |
| `--shadow-raised` | `0 2px 4px rgb(0 0 0 / 0.04), 0 12px 32px rgb(0 0 0 / 0.12)` | `0 2px 4px rgb(0 0 0 / 0.3), 0 12px 32px rgb(0 0 0 / 0.5)` |

Every other colour stays. Base styles: `h1` 1.75rem at line-height 1.2, 2rem from 48rem; `h2` 1.25rem at 1.3.

Contrast, computed for this plan: white on the light accent 5.37; dark text on the dark accent 8.17; text on white 16; muted text on white 5.51; the ring on white 3.92. The logo's own violet gives 4.30 with white, under 4.5, so the accent is one step darker.

*Why not a second token name for the accent:* shadcn's parts read `--primary`. A new name would need an edit to each part.

The prototype's edit is `.scratch/ui-skill-design-guide-prototype.diff` on the computer that planned this; the table above is the same edit, so a build on another computer needs no diff.

### 5. Standalone pages follow the font and shadows

`look.css` keeps its fallback colour copy and its `--look-shadow-*` names, and reads the app's values first:

- `font-family: var(--font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif)`.
- `--look-shadow-xs: var(--shadow-low, <today's value>)`, `--look-shadow-sm: var(--shadow-card, …)`, `--look-shadow-lg: var(--shadow-raised, …)`.
- Its `h1`/`h2` sizes match decision 4 where it sets them.

`--radius` already flows. A repo with no app sets none of these, so each `var()` falls back to today's value.

### 6. The readable-colour check

In `app/src/style.test.ts`, because it ships with the app and guards each install's own brand. It reads the `:root` and `.dark` blocks, and checks three pairs in each: `--primary-foreground` on `--primary`, `--foreground` on `--background`, `--muted-foreground` on `--background`. Each needs 4.5 to 1 by the WCAG formula.

A small helper in the test file turns `oklch(L C h)`, `#rgb`, or `#rrggbb` into linear sRGB; an alpha of exactly 1 on `oklch()` reads as solid. A see-through colour or another form, such as `hsl()`, fails with the value's name and *write it solid, as oklch(L C h), #rgb or #rrggbb*. No new package.

The same file's existing checks change with the look: the font line expects a `--font` value in `:root`, any font, and `--font-sans: var(--font)` in the theme. An install that sets its own font keeps the check green.

### 7. Four design rules in `app/.oxlintrc.json`

Add at `"error"`: `shadcn/no-raw-colors`, `shadcn/no-inline-styles`, `shadcn/no-unknown-classes`, `shadcn/require-static-classes`. No override and no setting is needed: the plugin finds the parts and the theme from `components.json`.

`style.test.ts` gains one check that the four are on at `error`, so a later edit can't drop one without the test changing.

*Left off:* `no-arbitrary-values` (7 lines in 5 screens, and each install's screens on its update) and `no-restyle` (93 places, a rework of single screens). Either can be a later change.

### 8. The fixed version, and how it moves

The version sits once, in the skill's command. `scripts/tests/ui-skill.test.mjs` checks:

- the command names `modern-web-guidance@<exact x.y.z>`, never `@latest` or bare;
- the four sources appear in order, and each link resolves in the source;
- the body is 150 words or fewer.

`.agents/skills/update-dependencies/scripts/update.mjs` surveys that one line with the other pins: it reports when npm has a newer version and moves it, and `update-dependencies.test.mjs` covers the read and the rewrite. A moved pin is a payload edit, so it is a release, which is the point: only a WongStack release changes the version an install runs.

### 9. The new spec needs an area

`.agents/memory/areas.json` gains `ui`: paths `.agents/skills/ui/`, `wiki/design-guide.md`, `wiki/ux-principles.md`; docs `wiki/design-guide.md`, `wiki/ux-principles.md`, `openspec/specs/design-guide/spec.md`. `memory-areas.test.mjs` fails without it.

### 10. The release

`CHANGELOG.md` gets `## Next (minor) — One command for screen work, a design guide, and a friendlier starter look`. Its **Updating.** note, in plain words:

- The update brings `/ui` and the design guide.
- The starter's new look is offered, not forced: an install with its own colours keeps them and adds only the new brand values (font, shadows) beside them.
- Run the app's checks after the update. If a design rule or the readable-colour check flags your own screens, the update plan lists each one with its fix.
- A brand colour written as `hsl()` needs writing as `oklch()` or hex once.

## Risks / Trade-offs

- **An install's screens fail a new rule on update** → the changelog says so, the sync plan lists each hit, and screens that can't meet a rule yet turn it off in an `overrides` entry of `app/.oxlintrc.json` for those files alone, with a `Check:` bullet, as the loosened-check rule already requires. The rule stays on at `error` for every other file, so the four-rules check and the proof of the checks both stay green.
- **An install's colours are in a form the check can't read** → the failure names the value and the two forms that work.
- **The skill outgrows the size room** → trim its own lines; the guide carries the detail.
- **The first lookup downloads about 16 MB** → it happens once per version per computer; the skill says to go on when the tool does not answer.
- **The tool's commands change** → the version is fixed, and `update.mjs` moves it only with a WongStack change that runs the two commands.
- **An outside package runs on the person's computer** → one exact version from the Chrome team's npm package, named in the skill, with no `@latest`.
- **The violet meets an install's own brand** → the accent is one value; the guide's first brand step is to set it.
- **Soft shadows are faint on a dark page** → dark keeps the border and a lighter card surface; the dark shadows are stronger.

## Checks after the merge

- Open the live starter: Home and Hello show the violet primary button, light and dark.
- Build a plan's review page in the source: its primary button is violet and its card corner matches the app's.
