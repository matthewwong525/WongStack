# Design

## Context

See proposal.md for why. Today a plan's screen comes from [`prototype.mjs`](../../../.agents/plugins/loop/skills/plan/scripts/prototype.mjs): a git worktree copy of the app, put online or served here, or drawn by a phone app's screen test, then screenshotted; `finish` keeps a diff that `/apply`'s helper builds from. When that fails, a `screen` sketch stands in. [`build-review.mjs`](../../../.agents/plugins/loop/skills/plan/scripts/build-review.mjs)'s `sketchOnly` only warns on a sketch with no `picture`, and a `No real picture:` line silences it; `page` and `live` don't count. `SCREEN_CLASSES` allows the gray `bar` (emitted `sk-bar`) and `skeleton`.

A `page` card already takes a local HTML file with a stylesheet, fonts, and pictures inlined (300 KB a file, 800 KB a card) and no script; a `live` card takes the same plus its own script. The skills' instruction words sit about 20 under the `measure-context.mjs` baseline; removing the prototype steps frees words.

## Goals / Non-Goals

**Goals:** a screen shows as HTML in the app's look with no app running; a sketch-only screen card can't reach the person.

**Non-Goals:** rendering the app's real components (React or Flutter) to HTML; any change to `/apply`'s preview page, ads, websites, or flow drawings.

## Decisions

- **A screen is a `page` fence, or `live` when it needs a script.** No new card kind. *Before* and each *After* state are separate files in the change's `pages/` folder, named in one `page` fence, so they sit side by side.
- **`look.mjs page <file.html>` writes `<file>.css` beside it**: the look's tokens from `app/src/index.css`, the look's parts (`look.css`), and the Tailwind utilities the page's `class` attributes name, compiled with the app's own Tailwind and `index.css` theme. A page can then copy a screen's real `className`s. Tailwind comes from `app/node_modules`; when it is missing, the command says to run `npm ci` in `app/`, and still writes the tokens and parts. Alternative: hand-written CSS only. Rejected for the app itself: the shadcn parts' exact spacing and colors are the hard part to copy by hand. A phone or desktop app copies its theme's colors and fonts into the page's CSS by hand, as the Relay Everything sample in this plan does.
- **Remove `prototype.mjs`** and its test; `retired-names.json` names it, replaced by `look.mjs page`. `/apply`'s helper reads the plan's `pages/` and builds each screen to match; `/apply` passes a screenshot of the approved page to `preview-review.mjs --approved`, as it already does for a live card.
- **Stop, not warn, and no escape line.** `sketchOnly` throws when a card has a `screen` fence and none of `picture`, `page`, or `live`. `svg` stays free: it draws arrows and layers.
- **Gray bars leave the `screen` fence.** `bar` and `skeleton` leave `SCREEN_CLASSES`, each stopping with "write the real words"; the kit drops `.sk-bar` and the screen `.skeleton` rule. An unlabelled `screen` picture is named *Sketch*.
- **`wiki/prototypes.md` keeps its path**, rewritten: a prototype is now the screen's HTML page. Headings: *Write the page*, *The app's look*, *Another app's look*, *What a page can't show*, *Notes and the build*. The plan's `references/prototypes.md` owns the steps; the wiki page adds WongStack's quirks.

## Risks / Trade-offs

- [A page drifts from what the app's parts really render] → `look.mjs page` uses the app's own Tailwind and theme, and `/apply`'s preview shows *Approved* beside *Built*, so a gap shows before publishing.
- [An open plan in an installed repo has a sketch-only card or a prototype diff] → its next rebuild stops with the card and what to do; the helper ignores an old `.scratch/*-prototype.diff`. The changelog's Updating note says so, and that a repo's screen-test steps for plans, such as Relay Everything's `wiki/development/phone-pictures.md`, are no longer read.
- [The skill-text budget] → the removed prototype steps pay for the new ones; run `measure-context.mjs --check`.

## Migration Plan

Ships as a minor release. Rollback is the revert.
