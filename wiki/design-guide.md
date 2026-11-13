# Design guide

The design guide is the look every screen shares: calm, roomy, and friendly, in your own colours. It gives structure and defaults only, so it holds for any brand. [UX principles](ux-principles.md) decides what a screen is for; this page decides how it looks. The [`ui` skill](../.agents/skills/ui/SKILL.md) loads both before any screen work, and [the code rule](../.agents/rules/code.md#where-things-go) says where each file goes.

## The feel

A screen is calm, roomy, and friendly. The feel comes from Airbnb's screens and its four principles ([Building a visual language](https://airbnb.design/building-a-visual-language/)):

- **Unified:** every screen is built from the same parts and the same values.
- **Universal:** every person can read and use it, on any device.
- **Iconic:** one clear thing leads each screen.
- **Conversational:** words and motion speak as a person does.

The feel is borrowed, not the brand: this page uses no Airbnb font, colour, or code rule. Your brand is [your own short list](#set-your-brand).

## Colour

- **One accent, `--primary`.** It marks the one primary action, links, and the focus ring (`--ring`). A screen with the accent on everything has no primary action.
- **Neutral greys for the rest:** surfaces, text, and borders.
- **Red, `--destructive`, only for a problem:** an error, or an action that can't be undone.
- **`--accent` is not the brand accent.** It is the ready-made parts' name for the grey tint under a hovered row or button. Leave it grey.
- **Text on any colour keeps a contrast of 4.5 to 1,** in light and in dark. [The check](#the-check) fails below it.

## Type

One font, `--font`, on every screen.

| Text | Size | Weight |
|---|---|---|
| Title (`h1`) | 1.75rem, and 2rem from 48rem wide | 600 |
| Heading (`h2`) | 1.25rem | 600 |
| Text | 1rem | 400 |
| Small text | 0.875rem | 400 |

Make text quieter with the muted colour before you make it smaller.

## Space

Use [Tailwind](https://tailwindcss.com)'s spacing scale only, and much white space. Put more space between groups than inside them, so a reader sees what belongs together.

| Where | Units |
|---|---|
| Inside a group | 2 to 3 |
| Between groups | 6 to 8 |
| Between page sections | 10 to 12 |
| A card's padding | 6 |

Every page keeps [the shared frame](stack/mini-apps.md#the-home-page-lists-the-apps): one width and one left edge.

## Shape and depth

- **`--radius` sets every corner.** A card has the largest corner; a button and a field have a smaller one.
- **Three shadows:** `--shadow-low` for a control, `--shadow-card` for a card, `--shadow-raised` for a dialog or a menu.
- **A card has a shadow or a border,** never a box inside a box. Separate with space first.

## Pictures

- Large, with a card's corners.
- One of a few fixed shapes: 1:1, 4:3, or 16:9, filled with `object-cover`.
- Real alt text that says what the picture shows.
- A skeleton in the picture's shape while it loads.

## Words

Short and friendly, as [voice](voice.md) says:

- A button starts with a verb: *Save changes*, not *OK*.
- An error blames nobody and says what to do next.
- An empty page gives the next step, with the primary action in it.

## Motion

Small and quick: 150 to 200 ms, on colour, shadow, and opacity only. Nothing moves when the person turns motion off (`prefers-reduced-motion`).

## Set your brand

Your brand is one list in one file, [`app/src/index.css`](../app/src/index.css): the light set in `:root` and the dark set in `.dark`. Change a value there and every screen and every ready-made part follows, with no edit to a part. Pages outside the app, such as [a plan's review page](review-pages.md), read [the same list](stack/mini-apps.md#the-home-page-lists-the-apps).

| Value | What it sets | Starter default |
|---|---|---|
| `--primary` | The accent colour | A violet |
| `--primary-foreground` | The text on the accent | Near white; near black in dark |
| `--ring` | The focus ring | The accent's hue |
| `--font` | The font | The device's own |
| `--radius` | The corner size | `0.875rem` |
| `--shadow-low`, `--shadow-card`, `--shadow-raised` | The three shadows | Soft and wide; stronger in dark |

1. Set the accent first, in both sets.
2. Write the accent, the page's background, and each text colour solid, as `oklch(L C h)`, `#rgb`, or `#rrggbb`. The check reads no other form and no see-through colour.
3. Run the app's checks.

## The check

The app's checks hold what a script can hold. The rest of this page is judgment.

- **Readable colours.** [`style.test.ts`](../app/src/style.test.ts) fails when the text on the accent, the page's text, or the muted text falls under 4.5 to 1, in light or in dark. The failure names the pair and its contrast.
- **Four design rules,** in [the lint settings](../app/.oxlintrc.json):

| Rule | What it stops |
|---|---|
| `shadcn/no-raw-colors` | A colour outside your own set |
| `shadcn/no-inline-styles` | A style written on one element |
| `shadcn/no-unknown-classes` | A class that makes no style |
| `shadcn/require-static-classes` | A class built so the check can't read it |

A failure message names the fix. Make that fix; do not turn the rule off. Old screens that can't meet a rule yet turn it off for those files alone, in an `overrides` entry of the lint settings, with a reason.

Part of [the WongStack wiki](README.md).
