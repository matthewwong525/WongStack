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

Unchanged. Home → an app card. Access → People → pick a role in the row, or `⋯` → *Open*. Edge cases (remove, add back, leave without saving) keep their inline question.

### Hierarchy

One solid button per screen, as today: *Add person* / *Add role* on a list, the save button on a page, *Say hello* in Hello. Everything else is the outline or ghost variant. Muted text uses the muted token; labels are outline badges. No new emphasis is added.

### Review

[review.html](review.html). The What Changes items *Access is restyled on the parts, and nothing moves* and *Three Access pieces change what they are made of* sketch the screen and its changed pieces.

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
