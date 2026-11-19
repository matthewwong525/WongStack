<!-- openspec-archive v1 2026-11-16-no-sketch-alone -->
<!-- file proposal.md utf8 7245 -->
# A plan shows each screen as HTML in the app's real look

**Status:** ready-to-ship
**Branch:** review-shows-real-look
**Open questions:** none

## Why

A plan that changes a screen must show it as it will go live, so you decide once, before the build. Today there are two ways, and both fail you. A plan runs a copy of the app to take pictures, which is slow and often skipped. Or it falls back to a gray sketch, which only warns on the page, and one line of excuse stops the warning. In Relay Everything on 2026-11-10 and 2026-11-11, a plan gave an excuse ("the other change isn't live", "a test copy can't sign in") and showed a sketch.

## What Changes

- **Each screen is an HTML page in the app's real look.** The chat writes the screen as a page with the app's own colors, fonts, corners, and real words, with sample data. It runs no app. Below are the old sketch, the same Relay Everything screen written as HTML this way, and the real app:
  ```screen The old sketch
  <div class="card col gap phone">
    <h3>Settings</h3>
    <div class="card row gap"><b>R</b><div class="col grow"><b>you@example.com</b><span class="muted">Signed in</span></div><span class="muted">›</span></div>
    <div class="muted">Appearance</div>
    <div class="row gap"><span class="tag">System</span><span class="tag-outline">Light</span><span class="tag-outline">Dark</span></div>
    <div class="muted">Notes</div>
    <div>Pin notes to where I am</div>
    <div class="muted">Voice notes</div>
    <div class="row gap"><span class="grow">Speech model</span><button class="btn-ghost">Remove</button></div>
  </div>
  ```
  ```page
  As HTML: pages/settings.html
  ```
  ```picture
  The real app: pictures/real-settings.png
  ```
- **Before and After are both HTML.** *Before* is today's screen, written the same way, so the two differ only by the change. Each state the plan names, such as empty or loading, gets its own page. A screen you need to try, such as a drag, is a page with its own script, which you can tap and use on the review page.
- **The plan no longer runs a copy of the app.** The step that made a copy, put it online, or drew it with the app's screen test is gone, with its *Try it* link. The build makes each screen match the page you approved.
- **A plan can't show a screen as a sketch alone.** If the only picture of a screen is a sketch, the plan doesn't finish. Sign-in, missing data, or another change that isn't live yet are not reasons for a sketch: HTML needs none of them.
- **A sketch stays only for a part the phone or computer draws itself**, such as the keyboard or the share sheet, and only beside the real screen. Its label says *Sketch*, and it shows real words, never gray bars.

## What the build needs

- **Nothing.**

Non-goals: no change to the finished build's preview page, which still shows screenshots of the built app beside what you approved; no change to flow drawings, arrows, tables, ads, or website plans.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `review-pages`: a screen shows as HTML pages in the app's look, *Before* and *After*, with no app copy; a card never shows a screen as a sketch alone; the builder stops on one.
- `ux-wireframes`: a screen sketch has no gray bars and is labelled *Sketch*; a plan no longer sketches each screen by default.
- `apply`: the build matches each screen to the plan's approved page, in place of a prototype's diff.

## Impact

- `.agents/plugins/loop/skills/plan/scripts/build-review.mjs`: `sketchOnly` stops instead of warning, counts `page` and `live` as real, ignores `svg`; `bar` and `skeleton` leave `SCREEN_CLASSES`; an unlabelled `screen` picture is *Sketch*.
- `.agents/plugins/loop/skills/plan/scripts/look.mjs`: a `page` command writes the app's look, and the Tailwind classes a page uses, as a stylesheet beside the page.
- Removed: `.agents/plugins/loop/skills/plan/scripts/prototype.mjs` and `scripts/tests/prototype.test.mjs`; `scripts/retired-names.json` names it.
- `.agents/plugins/loop/skills/plan/references/prototypes.md`, `drawings.md`, `review-page.md`, `review-kit.html`; `.agents/plugins/loop/skills/apply/SKILL.md` and `references/build-helper.md`.
- `wiki/prototypes.md` (rewritten), `wiki/review-pages.md`, `wiki/ux-principles.md`, `wiki/README.md`.
- Tests: `review-pictures.test.mjs`, `review-browser.test.mjs`, `cli-conventions.test.mjs`, a `look.mjs` test.
- `CHANGELOG.md` minor entry.

## Decision log

- **2026-11-16** — Asked what happens to the step that runs a copy of the app for pictures → chose remove it: HTML in the app's real look is the only way, because running the app is too much work for a plan.
- **2026-11-16** — Assumed: *Before* is HTML too, not a screenshot of the live app, because the person asked for no app running, and two pages made the same way differ only by the change.
- **2026-11-16** — Assumed: a screen is a `page` card, or a `live` card when it needs a script to try, because both already carry local styles, fonts, and pictures, so no new card kind is needed.
- **2026-11-16** — Assumed: `look.mjs page` writes the app's colors and parts plus the Tailwind classes the page uses, compiled by the app's own Tailwind, because then a page can copy a screen's real class names and look the same; a phone or desktop app copies its theme's colors and fonts into the page's CSS by hand, as the Relay Everything sample does.
- **2026-11-16** — Assumed: the builder stops on a screen sketch with no picture, page, or live card beside it, and a "No real picture" line no longer lets it through, because that line is how the 2026-11-10 and 2026-11-11 plans got a sketch through.
- **2026-11-16** — Assumed: an `svg` fence alone still builds, because it draws arrows and layers, not screens.
- **2026-11-16** — Assumed: the gray `bar` and `skeleton` classes leave the `screen` fence, because a sketch now is only of a system part, which has real words.
- **2026-11-16** — Assumed: `/apply`'s preview page still screenshots the built app beside the approved page, because by then the app is built and running.
- **2026-11-16** — Assumed: `wiki/prototypes.md` keeps its name with new headings, because other pages link it; installed repos that link its old headings, such as Relay Everything's phone-picture steps, get an Updating note.
- **2026-11-16** — Assumed: the sample is Relay Everything's Settings screen, written as HTML with its colors from `mobile/lib/brand.dart` and its Inter font, beside the real screenshot from its settings-same-everywhere plan, with sample data only.
- **2026-11-16** — Check: `scripts/tests/prototype.test.mjs` is deleted with the script it tested, because plans no longer run a copy of the app.
- **2026-11-16** — Assumed: the real-Tailwind test of `look.mjs page` skips in CI when `app/` is not installed, as `access-openapi.test.mjs` does, because installing the app in the payload job would slow every run; the package-lookup and fallback tests always run.
- **2026-11-16** — Assumed: the public plan-first page is updated to say screens are HTML pages, because it still described the removed app copy.
- **2026-11-16** — Assumed: archive checkpoint on branch review-shows-real-look as release 61.9.0.

<!-- end proposal.md -->
<!-- file design.md utf8 4080 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 3336 -->
# Tasks

## 1. Builder and kit

- [x] 1.1 In `build-review.mjs`, make `sketchOnly` throw for a card with a `screen` fence and no `picture`, `page`, or `live` fence, naming the file, line, and item, and saying to show the screen as a page by the prototype rules; ignore `svg` and the `No real picture:` text. Verify with tests in `scripts/tests/review-pictures.test.mjs`: a sketch alone stops and keeps the last good page; a sketch beside a `picture`, `page`, or `live` builds; an `svg` alone builds.
- [x] 1.2 Remove `bar` and `skeleton` from `SCREEN_CLASSES`, with a "write the real words" stop for either, and drop the `sk-bar` rename. Verify with a test that each stops with that message.
- [x] 1.3 Name an unlabelled `screen` picture *Sketch*. Verify with a label test.
- [x] 1.4 Drop `.sk-bar` and `.art.screen .skeleton` from `review-kit.html`; update `review-browser.test.mjs` and every fixture whose sketch now stands alone. Verify `node --test scripts/tests/review-pictures.test.mjs scripts/tests/review-browser.test.mjs` passes.

## 2. The page's look

- [x] 2.1 Add `look.mjs page <file.html>`: write `<file>.css` beside it with the look's tokens and parts, plus the Tailwind utilities the file's `class` attributes name, compiled by the app's Tailwind and `app/src/index.css`; with no Tailwind in `app/node_modules`, write tokens and parts and print the `npm ci` step. Verify with a `look.mjs` test: a page using `rounded-lg bg-card p-4` gets those rules, and the CSS passes the `page` card's checks when built into a review page.

## 3. Remove the app copy

- [x] 3.1 Delete `prototype.mjs` and `scripts/tests/prototype.test.mjs`; add `prototype.mjs` to `scripts/retired-names.json` with `look.mjs page` as its replacement; update `cli-conventions.test.mjs`. Verify `node scripts/check-retired-names.mjs` passes.
- [x] 3.2 In `/apply`'s `SKILL.md` and `references/build-helper.md`, drop the prototype `finish` step and diff; the helper builds each screen to match the plan's `pages/`, and the preview's `--approved` takes a screenshot of the approved page. Verify by reading both files: no `prototype` step remains.

## 4. Skill references and wiki

- [x] 4.1 Rewrite the plan's `references/prototypes.md`: write *Before* and each *After* state as a page in `pages/`, sample data, `look.mjs page` for the app, a theme copied by hand for another app, `live` for a screen to try, what is not a reason for a sketch, and a sketch only of a system part beside the page. Update `drawings.md` (`page` for a screen; `screen` only for a system part, no `bar` or `skeleton`) and `review-page.md`. Verify `node scripts/measure-context.mjs --check` passes.
- [x] 4.2 Rewrite `wiki/prototypes.md` under the design's headings; update `wiki/review-pages.md#the-prototype`, `#a-card-shows-the-closest-real-result`, `wiki/ux-principles.md#the-review-file`, and `wiki/README.md`'s line. Verify `node scripts/check-payload-links.mjs` passes.
- [x] 4.3 Add a `## Next (minor)` entry to `CHANGELOG.md`, with an Updating note: an open plan with a sketch-only card or a prototype copy needs its screens as pages at its next rebuild, and a repo's screen-test steps for plans are no longer read.

## 5. Checks

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate no-sketch-alone --strict --no-interactive`; both pass.

<!-- end tasks.md -->
<!-- file specs/apply/spec.md utf8 1581 -->
## REMOVED Requirements

### Requirement: A fresh helper builds the tasks

**Reason**: Its scenario *A plan with a prototype* names a prototype copy that plans no longer make.

**Migration**: see *A fresh helper builds the tasks from the plan*, which carries the same rules and builds each screen to match the plan's approved page.

## ADDED Requirements

### Requirement: A fresh helper builds the tasks from the plan

Where the host can start one, a fresh helper agent SHALL build the change's tasks, so the build does not carry the planning conversation. When the plan shows a screen as a page, the helper SHALL build the screen to match it. The helper SHALL NOT ask the person, run git, save, or upload a preview, and SHALL NOT report while a helper or check it started is still running. It SHALL return on a question, a blocker, or the whole implementation; the parent SHALL handle a question or blocker and start a new helper for the rest when appropriate. A host with no helper SHALL build inline with the same outcome.

#### Scenario: An ambiguous task

- **WHEN** the helper cannot finish a task without the person's decision
- **THEN** it returns the question, the parent asks the person, and a new helper works the remaining tasks

#### Scenario: No helper available

- **WHEN** the host cannot start a helper agent
- **THEN** `/apply` works the tasks inline with the same outcome

#### Scenario: A plan with a screen page

- **WHEN** the plan shows a changed screen as an approved *After* page
- **THEN** the built screen matches that page unless a task says otherwise

<!-- end specs/apply/spec.md -->
<!-- file specs/review-pages/spec.md utf8 3285 -->
## MODIFIED Requirements

### Requirement: A card shows the result as close to real as it can

A card SHALL show the result the go produces as close to the real thing as can be made: a screen as it will look, the ad as it will run, or the real words. Data the screen can not reach while planning, a sign-in, or another change that is not live yet SHALL NOT be a reason for a sketch: the plan SHALL show the screen with sample data. A card SHALL never show a screen as a sketch alone: a sketch SHALL be only of a part the system draws itself, such as the keyboard, beside the screen as it will look, with one plain line that names the part. The page builder SHALL stop, naming the card and keeping the last good page, when a card holds a screen sketch and no picture, page, or live card.

#### Scenario: No prototype can run

- **WHEN** a plan changes a screen of an app that can not run on this computer
- **THEN** the card shows the screen as a page in the app's own styles, fonts, and words, not a sketch

#### Scenario: The screen's data is not there

- **WHEN** a plan changes the Inbox and there are no chats to list
- **THEN** the card shows the Inbox with sample chats, not a sketch

#### Scenario: A part only the phone draws

- **WHEN** a plan changes a phone screen where the phone's own text menu opens
- **THEN** the card shows the app's own screen as it will look, and a sketch only of the phone's menu, with one line that names it

#### Scenario: A sketch alone

- **WHEN** a plan's card about a screen holds only a screen sketch, even with a line saying why there is no real picture
- **THEN** the builder stops, names the card, says to show the screen as it will look, and keeps the last good page

## REMOVED Requirements

### Requirement: A code plan shows its prototype

**Reason**: Running a copy of the app, online, on this computer, or by its screen test, took too long and was often skipped for a sketch. A page in the app's own look shows the screen as close to real with no app running.

**Migration**: see *A code plan shows its screens as pages*. A repo's own screen-test steps for plans are no longer read; a repo may keep them for its own tests.

## ADDED Requirements

### Requirement: A code plan shows its screens as pages

A plan that adds or changes a screen SHALL show it as HTML pages written while planning, in the app's own colors, fonts, corners, and words, with sample data: one *After* page per new or changed state the plan names, beside a *Before* page of the screen today written the same way. A screen the person needs to try SHALL be a page they can use on the review page. Making these pages SHALL run no copy of the app, SHALL change no database, and SHALL need no go from the person. A plan's notes SHALL update the pages with the plan, and the build SHALL make each screen match its approved page.

#### Scenario: A changed screen

- **WHEN** a plan changes the Inbox's list screen
- **THEN** its card shows *Before* and *After* pages in the app's look at phone width, one per state the plan names, and no copy of the app ran

#### Scenario: A note on a page

- **WHEN** the person sends *make the button bigger* on an *After* page
- **THEN** the chat updates the plan and the page, and the rebuilt review page shows the bigger button

<!-- end specs/review-pages/spec.md -->
<!-- file specs/ux-wireframes/spec.md utf8 5643 -->
## MODIFIED Requirements

### Requirement: A visual is a narrow drawing

A visual SHALL be a fence inside its What Changes bullet, drawn by the planning agent in the same pass with no other agent, from the shared drawing guide's patterns: a `mermaid` fence for steps, states, and back-and-forth flows; a `screen` fence for screens and before-and-after layouts, built from the shared look's app parts; an `svg` fence for a free drawing such as arrows or layers; a Markdown table for a table; a `text` fence for a small listing such as a file tree; and a `picture` fence for a real picture. Mermaid, screen, and SVG fences SHALL show on the page as inline pictures made at build time. A change SHALL draw one visual by default; a screen it adds or changes SHALL show as a page in the app's own look, by the review page standard. A text drawing SHALL aim for 40 columns and MAY reach 56. The builder SHALL warn about a text line wider than 60 columns, or a picture wider than 640 pixels, and still build. A proposal with only text fences SHALL build as it did before pictures.

A `picture` fence SHALL list one `[label:] path` per line. Each path SHALL resolve to a PNG, JPEG or WebP file, known by its first bytes, inside the page's source folder. The page SHALL carry each picture inside itself, open at the start, with its label as caption and alt text, side by side when two fit, else stacked, and SHALL take a spot note on it. The builder SHALL stop, naming the item and picture and keeping the last good page, for a web address, an absolute path, a path or link that leaves the folder, a missing file, another file type, or a picture over 300 KB. It SHALL stop, keeping the last good page, when the built page passes 1.5 MB, so the Inbox can store it, and SHALL warn when it passes 800 KB and still build. It SHALL warn about a picture over 150 KB and still build. Each size message SHALL say to take only the visible part at phone width.

#### Scenario: A wide line

- **WHEN** a drawing has a 72-column line
- **THEN** the builder warns with the item and line and still writes the page

#### Scenario: Options side by side

- **WHEN** a drawing sets two options side by side at 56 columns
- **THEN** the builder writes the page with no width warning

#### Scenario: A flow drawn in Mermaid

- **WHEN** a What Changes bullet holds a valid `mermaid` fence
- **THEN** the page shows it as a picture that fits a 320px-wide screen and opens full screen, with no script or network load added to the page

#### Scenario: A screen sketched from app parts

- **WHEN** a What Changes bullet holds a valid `screen` fence with a card, a text box, and two buttons
- **THEN** the page shows them in the app's look, wrapping text to fit, fitting a 320px-wide screen, opening full screen, taking a note on the whole sketch, following light or dark mode, and doing nothing when a control is tapped

#### Scenario: A free drawing in SVG

- **WHEN** a What Changes bullet holds a valid `svg` fence
- **THEN** the page shows it as a picture that fits a 320px-wide screen, opens full screen, takes a note on the whole picture, and follows the page's light or dark colors

#### Scenario: A wide picture

- **WHEN** a `mermaid` or `svg` fence draws wider than 640 pixels
- **THEN** the builder warns with the item and picture and still writes the page

#### Scenario: A labelled pair of pictures

- **WHEN** a What Changes bullet holds a `picture` fence with `Before: pictures/a.png` and `After: pictures/b.png`
- **THEN** the page shows both pictures open, side by side where they fit, captioned *Before* and *After*, with no network load, and a note on one names its picture

#### Scenario: A picture from the web

- **WHEN** a `picture` fence names `https://example.com/a.png`
- **THEN** the build stops with the item and picture, and the last good page stays

#### Scenario: A large picture

- **WHEN** a `picture` fence names a 200 KB PNG
- **THEN** the builder warns with the item and picture and still writes the page

#### Scenario: A page too big for the Inbox

- **WHEN** the built page is larger than 1.5 MB
- **THEN** the build stops with the page's size, and the last good page stays

#### Scenario: A page slow on a phone

- **WHEN** the built page is larger than 800 KB and under 1.5 MB
- **THEN** the builder warns with the page's size and still writes the page

### Requirement: Screen sketches show each state and the change

A change that adds or restructures a screen SHALL show it before and after, each as its own labelled picture side by side in the card, with each empty, loading, or error state its flow names. The before and the after SHALL be pages in the app's own look, never a sketch. A sketch, of a part the system draws, SHALL use real words and the app's parts, with no gray bar for words, in the page's colors, and SHALL be named *Sketch* when it has no label of its own. The builder SHALL stop on a gray bar, and SHALL warn, and still build, about a fill or stroke color that is not one of the kit's named colors.

#### Scenario: A changed screen

- **WHEN** a plan changes an existing screen's layout
- **THEN** its review page shows a page of the screen today and a page of the change, for each state the plan names, side by side

#### Scenario: A fixed color

- **WHEN** an `svg` fence paints a box `fill="#ffffff"`
- **THEN** the builder warns with the item and picture that the color will not follow dark mode, and still writes the page

#### Scenario: A gray bar for words

- **WHEN** a `screen` fence holds a gray placeholder bar
- **THEN** the builder stops with the item and picture, and says to write the real words

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-11-16

~~~
<!-- end .openspec.yaml -->
<!-- file pages/fonts/inter.woff base64 44220 -->
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
<!-- end pages/fonts/inter.woff -->
<!-- file pages/relay.css utf8 2447 fence=~~~ -->
~~~css
/* Relay Everything's look, copied from mobile/lib/brand.dart: its light colours, Inter, and 16 px card corners. */
@font-face { font-family: Inter; src: url("fonts/inter.woff") format("woff"); font-weight: 100 900; }
:root { --paper: #F7F8F4; --card: #FFFFFF; --line: #E3E6DF; --ink: #121614; --muted: #5E6660; --accent: #0E7A5A; --soft: #E1F2EA; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--paper); color: var(--ink); font: 400 15px/1.35 Inter, sans-serif; }
main { padding: 18px 16px 40px; }
a { color: inherit; text-decoration: none; }
.back { display: inline-flex; align-items: center; gap: 12px; color: var(--accent); font-size: 17px; font-weight: 500; padding: 4px 2px; }
.chev { font-size: 30px; line-height: 0; font-weight: 300; }
h1 { font-size: 31px; font-weight: 700; letter-spacing: -.01em; margin: 38px 0 40px; }
h2 { font-size: 14px; font-weight: 600; color: var(--muted); margin: 16px 4px 8px; }
.card { background: var(--card); border-radius: 16px; padding: 16px; }
.account { display: flex; align-items: center; gap: 14px; padding: 22px 22px 22px 22px; }
.logo { width: 34px; height: 36px; flex: none; margin: 0 6px 0 2px; }
.who { display: flex; flex-direction: column; flex: 1; gap: 2px; }
.who b { font-size: 17px; font-weight: 600; }
.go { font-size: 26px; color: var(--muted); font-weight: 300; }
.muted { color: var(--muted); font-size: 13px; }
.center { display: flex; justify-content: center; }
.seg { display: inline-flex; border: 1px solid var(--line); border-radius: 20px; overflow: hidden; }
.seg span { width: 75px; text-align: center; padding: 9px 0; font-size: 14px; font-weight: 500; border-left: 1px solid var(--line); }
.seg span:first-child { border-left: 0; }
.seg .on { background: var(--soft); }
.row { display: flex; align-items: center; gap: 12px; }
.text { display: flex; flex-direction: column; flex: 1; }
.title { font-size: 16px; }
.switch { width: 52px; height: 32px; border: 2px solid var(--muted); border-radius: 16px; position: relative; margin-right: 12px; flex: none; }
.switch::after { content: ""; position: absolute; left: 6px; top: 7px; width: 15px; height: 15px; border-radius: 50%; background: var(--muted); }
button { font: 600 15px Inter, sans-serif; color: var(--ink); background: var(--paper); border: 0; border-radius: 12px; padding: 12px 12px; margin-right: 8px; }
.version { text-align: center; color: var(--muted); font-size: 13px; margin-top: 24px; }

~~~
<!-- end pages/relay.css -->
<!-- file pages/settings.html utf8 1538 fence=~~~ -->
~~~html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Settings</title>
<link rel="stylesheet" href="relay.css">
</head>
<body>
<main>
  <a class="back" href="#home"><span class="chev">‹</span> Home</a>
  <h1>Settings</h1>

  <a class="card account" href="#account">
    <svg class="logo" viewBox="0 0 44 31" aria-hidden="true">
      <path d="M13 7h11a8.5 8.5 0 0 1 0 17H13M13 5v24M19 24l7 7" fill="none" stroke="#0E7A5A" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M35.1 6.2a14.5 14.5 0 0 1 0 18.6M39.7 2.3a20.5 20.5 0 0 1 0 26.4" fill="none" stroke="#F5A524" stroke-width="2.6" stroke-linecap="round"/>
    </svg>
    <span class="who"><b>you@example.com</b><span class="muted">Signed in</span></span>
    <span class="go">›</span>
  </a>

  <h2>Appearance</h2>
  <div class="card center">
    <div class="seg"><span class="on">System</span><span>Light</span><span>Dark</span></div>
  </div>

  <h2>Notes</h2>
  <div class="card row">
    <span class="text"><span class="title">Pin notes to where I am</span><span class="muted">Each typed note keeps where you were.</span></span>
    <span class="switch"></span>
  </div>

  <h2>Voice notes</h2>
  <div class="card row">
    <span class="text"><span class="title">Speech model</span><span class="muted">On this phone, 57 MB. Your voice never leaves it.</span></span>
    <button>Remove</button>
  </div>

  <p class="version">Relay Everything 1.4.0 (91)</p>
</main>
</body>
</html>

~~~
<!-- end pages/settings.html -->
<!-- file pictures/real-settings.png base64 37480 -->
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kAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkIGvAAAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQga8AABkAkAEAGQCQAQAZAJAB4Fz+H8HzcmHg2BjGAAAAAElFTkSuQmCC
<!-- end pictures/real-settings.png -->
<!-- file review.html utf8 203490 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes: each button shows when the link offers it.
  A preview page (data-kind="preview", from apply's preview-review.mjs) names the finished build and offers Publish.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-11-16-no-sketch-alone</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. The app's font, corner size and
   shadows come in the same sets; the font and the shadows below fall back to their own values without them. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.875rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.24 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.24 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.24 0 0);
  --primary: oklch(0.54 0.22 292);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.24 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.52 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.24 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.62 0.19 292);
  --font: system-ui, sans-serif;
  --shadow-low: 0 1px 2px rgb(0 0 0 / 0.04);
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.04), 0 6px 20px rgb(0 0 0 / 0.06);
  --shadow-raised: 0 2px 4px rgb(0 0 0 / 0.04), 0 12px 32px rgb(0 0 0 / 0.12);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.76 0.13 292);
  --primary-foreground: oklch(0.2 0.03 292);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.62 0.19 292);
  --shadow-low: 0 1px 2px rgb(0 0 0 / 0.3);
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.3), 0 6px 20px rgb(0 0 0 / 0.3);
  --shadow-raised: 0 2px 4px rgb(0 0 0 / 0.3), 0 12px 32px rgb(0 0 0 / 0.5);
}

/* The app's three shadows (--shadow-low, --shadow-card, --shadow-raised), else Tailwind's shadow-xs, shadow-sm and
   shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the bottom, so a layer reads as above
   the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: var(--shadow-low, 0 1px 2px 0 rgb(0 0 0 / 0.05));
  --look-shadow-sm: var(--shadow-card, 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1));
  --look-shadow-lg: var(--shadow-raised, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1));
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
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

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  /* The app's font (--font, from the look) leads every font rule below, so none beats it; each keeps its own stack for a repo with no app. */
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 var(--font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif); overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .back { display:flex; align-items:center; gap:8px; min-width:0; margin:0 0 8px; }
  .back .muted { margin:0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
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
  /* A card on a phone: its words, a row of small pictures, then OK and Note. At 900px and wider the pictures sit right. */
  .item.card { padding:0; overflow:hidden; }
  .words { display:grid; grid-template-columns:26px minmax(0,1fr); align-content:start; gap:0 10px; min-width:0; padding:var(--pad); }
  .words > .table, .words > .live-said { grid-column:1 / -1; margin-top:10px; }
  .item > .verdict { padding:0 var(--pad) var(--pad); }
  .text { position:relative; }
  .clamp { display:block; }
  .text:not(.folded) .clamp { display:inline; }
  .text.folded .clamp { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
  .more { min-width:0; min-height:0; padding:0; border:0; background:none; box-shadow:none; color:var(--muted-foreground); font:inherit; font-weight:400; text-decoration:underline; }
  .text:not(.folded) .more { margin-left:.4em; }
  .text.folded .more { position:absolute; right:0; padding-left:1.6em; background:linear-gradient(to right, transparent, var(--card) 1.2em); }
  .view { min-width:0; padding:0 var(--pad) 10px calc(var(--pad) + 36px); }
  .stage { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; }
  /* A part: one labelled picture, drawing, page, or live card; a click opens it full screen. */
  .part { flex:none; width:84px; margin:0; text-align:center; cursor:zoom-in; }
  .part .clip { position:relative; width:84px; height:112px; overflow:hidden; border:1px solid var(--border); border-radius:8px; background:var(--card); }
  .part .clip:not(.big) * { pointer-events:none; }
  .part .clip:not(.big) .pin { pointer-events:auto; }
  .part figcaption { margin-top:3px; color:var(--muted-foreground); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .part:hover figcaption, .part:focus-visible figcaption { color:var(--foreground); }
  .part:hover .clip:not(.big) { outline:2px solid var(--ring); outline-offset:2px; }
  .part .art { margin:0; font-size:var(--f, 13px); }
  .part .art.screen:not([style]) { width:49.2em; }
  /* A page or live card taller than its space shows its top; a fade says there is more. */
  .clip.tall::after { content:""; position:absolute; left:0; right:0; bottom:0; height:48px; background:linear-gradient(to bottom, transparent, var(--card)); pointer-events:none; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .art { position:relative; display:block; width:max-content; margin:0 auto; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-font:var(--font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:var(--font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif); font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  /* A picture file: as wide in em as its file is in px, so the fit and zoom scale it like a drawing. */
  .art.photo { padding:0; line-height:0; }
  .art.photo img { display:block; width:20em; height:auto; border:1px solid var(--border); border-radius:.4em; background:var(--background); }
  .art .pin.spot, .page .pin.spot { position:absolute; z-index:2; margin:0; transform:translate(-50%, -50%); }
  /* An ad: the card a feed or a story shows, in em like a picture. */
  .art.ad { width:20em; padding:0; overflow:hidden; border:1px solid var(--border); border-radius:.6em; background:var(--card); color:var(--card-foreground); text-align:left; white-space:normal; line-height:1.3; }
  .ad .ad-account { margin:0; padding:.5em .7em; } .ad .ad-account span { color:var(--muted-foreground); font-size:.85em; }
  .ad img { display:block; width:100%; aspect-ratio:4 / 5; object-fit:cover; }
  .ad-words { display:flex; flex-wrap:wrap; align-items:center; gap:.3em .6em; padding:.6em .7em; }
  .ad-words .ad-text { flex:1 1 100%; margin:0; } .ad-words .ad-headline { flex:1 1 0; min-width:0; }
  .ad-button { padding:.3em .8em; border-radius:.4em; background:var(--primary); color:var(--primary-foreground); font-size:.9em; }
  .ad.story { position:relative; } .ad.story img { aspect-ratio:9 / 16; }
  .ad.story .ad-account { position:absolute; top:0; left:0; right:0; z-index:1; background:color-mix(in oklab, var(--background) 70%, transparent); }
  .ad.story .ad-words { position:absolute; left:0; right:0; bottom:0; background:color-mix(in oklab, var(--background) 80%, transparent); }
  /* A page or a live card: drawn at a phone or computer width, scaled; a cover over a page takes a tap as a spot note. */
  .page, .live { position:relative; overflow:hidden; margin:0 auto; background:white; }
  .page iframe, .live iframe { display:block; border:0; transform-origin:0 0; }
  .live iframe { background:var(--background); }
  .cover { position:absolute; top:0; left:0; right:0; bottom:0; cursor:crosshair; }
  .verdict { display:flex; align-items:center; gap:8px; }
  .verdict button { min-width:64px; }
  .note-list .group { margin:12px 0 6px; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  .words > .table { overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  /* Full screen: the labels and Close on top; the part's own frame fills the middle; what changes it sits at the foot. */
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--muted); }
  #viewer .vtop { flex:none; display:flex; align-items:center; gap:8px; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); background:var(--background); }
  #viewer .names { flex:1 1 0; min-width:0; display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; }
  #viewer .name { flex:none; min-width:0; padding:0 12px; border:0; background:transparent; box-shadow:none; color:var(--muted-foreground); font-weight:400; white-space:nowrap; }
  #viewer .name[aria-selected="true"] { background:var(--muted); color:var(--foreground); font-weight:600; }
  #viewer .vspace { flex:1; min-height:0; }
  #viewer .vfoot { flex:none; display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); background:var(--background); }
  #viewer .vhint { flex:1 1 220px; margin:0; color:var(--muted-foreground); font-size:13px; }
  .zoom, .sizes { display:flex; align-items:center; gap:6px; }
  .zoom .level { color:var(--muted-foreground); font-size:13px; }
  .sizes { gap:0; padding:2px; border-radius:var(--radius); background:var(--muted); }
  .sizes button { min-height:36px; border:0; background:none; box-shadow:none; color:var(--muted-foreground); font-weight:400; }
  .sizes button[aria-pressed="true"] { background:var(--card); color:var(--foreground); font-weight:600; box-shadow:var(--look-shadow-xs); }
  .clip.big { position:fixed; left:0; right:0; top:var(--vtop, 52px); bottom:var(--vfoot, 52px); z-index:9; width:auto !important; height:auto !important; max-height:none !important;
    padding:12px; overflow:auto; border:0; border-radius:0; background:var(--muted); cursor:auto; touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  .clip.big::after { display:none; }
  .clip.big > .art, .clip.big > .page, .clip.big > .live { margin:0 auto; }
  .clip.big > :is(.art.photo, .art.ad, .art.pic, .page) { cursor:crosshair; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px var(--font, system-ui, sans-serif); vertical-align:middle; }
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
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 var(--font, system-ui, sans-serif); resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(var(--cols, 1), minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  body.read-only .bar, body.read-only .add, body.read-only .verdict, body.read-only .hint, body.read-only .vhint .note-it, body.read-only #chip, body.read-only .drop, body.read-only .files button { display:none; }
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
  /* Files and the needs list: the look's parts. */
  .live-said { margin:6px 0 0; }
  .form { display:grid; gap:14px; }
  .need .form { margin-top:10px; }
  .q { min-width:0; margin:0; padding:0; border:0; }
  .q-label { display:block; margin:0 0 4px !important; font-weight:500; }
  .drop { position:relative; display:flex; align-items:center; justify-content:center; min-height:64px; padding:12px; border:1px dashed var(--input); border-radius:var(--radius); text-align:center; cursor:pointer; }
  .drop.over, .drop:focus-within { border-color:var(--ring); background:var(--accent); }
  .drop input { position:absolute; width:1px; height:1px; opacity:0; }
  .files { list-style:none; margin:6px 0 0; padding:0; }
  .files li { display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:14px; }
  .files .why { color:var(--destructive); }
  .needs { list-style:none; margin:0; padding:0; }
  .need { scroll-margin-top:8px; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { padding-left:max(12px, calc((100% - 700px) / 2 + 12px)); padding-right:max(12px, calc((100% - 700px) / 2 + 12px)); }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100% - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
  /* Wide screen: every part and the bar share one 1160px column; a card's words and buttons sit left, and its
     pictures sit right, side by side, as tall as the words (the kit sets the height). */
  @media (min-width:900px) {
    main { max-width:1160px; padding:0 24px; }
    .bar { padding-left:max(24px, calc((100% - 1160px) / 2 + 24px)); padding-right:max(24px, calc((100% - 1160px) / 2 + 24px)); }
    #ready-confirm, #ready-says { right:max(24px, calc((100% - 1160px) / 2 + 24px)); }
    .item.has-view { display:grid; grid-template-columns:minmax(280px, 380px) minmax(0, 1fr); grid-template-rows:auto 1fr; align-items:start; }
    .item.has-view > .words { grid-column:1; grid-row:1; padding:20px 20px 12px; }
    .item.has-view > .verdict { grid-column:1; grid-row:2; padding:0 20px 20px; }
    .item.has-view > .view { grid-column:2; grid-row:1 / span 2; display:flex; padding:0; border-left:1px solid var(--border); background:var(--muted); }
    .stage { flex:1; min-width:0; gap:16px; padding:16px; align-items:center; }
    .stage > .part:first-child { margin-left:auto; } .stage > .part:last-child { margin-right:auto; }
    .part { width:auto; }
    .part .clip { width:auto; height:auto; border:0; border-radius:0; background:none; }
    .part[data-kind="draw"] .clip:not(.big) { border:1px solid var(--border); border-radius:var(--radius); background:var(--card); }
    .part:is([data-kind="page"], [data-kind="live"]) .clip:not(.big) { border:1px solid var(--border); border-radius:12px; background:var(--card); }
    .part figcaption { margin-top:6px; font-size:14px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-11-16-no-sketch-alone" data-own-back>
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-11-16-no-sketch-alone</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#needs">Needs</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint"><span class="lead">Tap Note to comment.</span> <span class="copies">Saving a note copies all your notes.</span> <span class="tail">Tap a picture to see it full screen.</span></p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A plan that changes a screen must show it as it will go live, so you decide once, before the build. Today there are two ways, and both fail you. A plan runs a copy of the app to take pictures, which is slow and often skipped. Or it falls back to a gray sketch, which only warns on the page, and one line of excuse stops the warning. In Relay Everything on 2026-11-10 and 2026-11-11, a plan gave an excuse (&quot;the other change isn't live&quot;, &quot;a test copy can't sign in&quot;) and showed a sketch.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card has-view" id="item-1"><div class="words"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Each screen is an HTML page in the app's real look.</b> The chat writes the screen as a page with the app's own colors, fonts, corners, and real words, with sample data. It runs no app. Below are the old sketch, the same Relay Everything screen written as HTML this way, and the real app:</div></div></div><div class="view"><div class="stage"><figure class="part" data-kind="draw"><div class="clip"><div class="art pic screen" data-note="item-1-picture-1" tabindex="0" style="width:27.692em"><div class="sk" inert><div class="card col gap phone">
  <h3>Settings</h3>
  <div class="card row gap"><b>R</b><div class="col grow"><b>you@example.com</b><span class="muted">Signed in</span></div><span class="muted">›</span></div>
  <div class="muted">Appearance</div>
  <div class="row gap"><span class="tag">System</span><span class="tag-outline">Light</span><span class="tag-outline">Dark</span></div>
  <div class="muted">Notes</div>
  <div>Pin notes to where I am</div>
  <div class="muted">Voice notes</div>
  <div class="row gap"><span class="grow">Speech model</span><button class="btn-ghost">Remove</button></div>
</div></div></div></div><figcaption>The old sketch</figcaption></figure><figure class="part" data-kind="page"><div class="clip"><div class="page" data-note="item-1-picture-2" data-label="As HTML" tabindex="0"><iframe sandbox="allow-scripts" tabindex="-1" title="As HTML" srcdoc="&lt;!doctype html&gt;
&lt;html lang=&quot;en&quot;&gt;
&lt;head&gt;&lt;meta http-equiv=&quot;Content-Security-Policy&quot; content=&quot;default-src 'none'; script-src 'sha256-mU6LrLWGOJSt6jXfSSFNDHC9Etqp+wqWdf1a7lVR/B8='; style-src 'unsafe-inline'; img-src data:; font-src data:; form-action 'none'; base-uri 'none'&quot;&gt;&lt;style&gt;:where(a[data-href]){color:LinkText;text-decoration:underline;cursor:pointer}&lt;/style&gt;&lt;script&gt;(function(){var seen=-1;function size(){parent.postMessage({type:&quot;review:page&quot;,h:document.documentElement.scrollHeight,w:innerWidth,vh:innerHeight},&quot;*&quot;);}function changed(){if(innerHeight&lt;=1||innerHeight===seen)size();seen=innerHeight;}addEventListener(&quot;load&quot;,size);addEventListener(&quot;resize&quot;,changed);new ResizeObserver(changed).observe(document.documentElement);addEventListener(&quot;message&quot;,function(e){var m=e.data;if(e.source!==parent||!m||m.type!==&quot;review:point&quot;||typeof m.x!==&quot;number&quot;||typeof m.y!==&quot;number&quot;)return;var at=document.elementFromPoint(m.x,m.y),a=at&amp;&amp;at.closest(&quot;[data-href]&quot;);parent.postMessage({type:&quot;review:link&quot;,href:a?a.getAttribute(&quot;data-href&quot;):&quot;&quot;},&quot;*&quot;);});}());&lt;/script&gt;
&lt;meta charset=&quot;utf-8&quot;&gt;
&lt;meta name=&quot;viewport&quot; content=&quot;width=device-width, initial-scale=1&quot;&gt;
&lt;title&gt;Settings&lt;/title&gt;
&lt;style&gt;/* Relay Everything's look, copied from mobile/lib/brand.dart: its light colours, Inter, and 16 px card corners. */
@font-face { font-family: Inter; src: url(&quot;data:font/woff;base64,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&quot;) format(&quot;woff&quot;); font-weight: 100 900; }
:root { --paper: #F7F8F4; --card: #FFFFFF; --line: #E3E6DF; --ink: #121614; --muted: #5E6660; --accent: #0E7A5A; --soft: #E1F2EA; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--paper); color: var(--ink); font: 400 15px/1.35 Inter, sans-serif; }
main { padding: 18px 16px 40px; }
a { color: inherit; text-decoration: none; }
.back { display: inline-flex; align-items: center; gap: 12px; color: var(--accent); font-size: 17px; font-weight: 500; padding: 4px 2px; }
.chev { font-size: 30px; line-height: 0; font-weight: 300; }
h1 { font-size: 31px; font-weight: 700; letter-spacing: -.01em; margin: 38px 0 40px; }
h2 { font-size: 14px; font-weight: 600; color: var(--muted); margin: 16px 4px 8px; }
.card { background: var(--card); border-radius: 16px; padding: 16px; }
.account { display: flex; align-items: center; gap: 14px; padding: 22px 22px 22px 22px; }
.logo { width: 34px; height: 36px; flex: none; margin: 0 6px 0 2px; }
.who { display: flex; flex-direction: column; flex: 1; gap: 2px; }
.who b { font-size: 17px; font-weight: 600; }
.go { font-size: 26px; color: var(--muted); font-weight: 300; }
.muted { color: var(--muted); font-size: 13px; }
.center { display: flex; justify-content: center; }
.seg { display: inline-flex; border: 1px solid var(--line); border-radius: 20px; overflow: hidden; }
.seg span { width: 75px; text-align: center; padding: 9px 0; font-size: 14px; font-weight: 500; border-left: 1px solid var(--line); }
.seg span:first-child { border-left: 0; }
.seg .on { background: var(--soft); }
.row { display: flex; align-items: center; gap: 12px; }
.text { display: flex; flex-direction: column; flex: 1; }
.title { font-size: 16px; }
.switch { width: 52px; height: 32px; border: 2px solid var(--muted); border-radius: 16px; position: relative; margin-right: 12px; flex: none; }
.switch::after { content: &quot;&quot;; position: absolute; left: 6px; top: 7px; width: 15px; height: 15px; border-radius: 50%; background: var(--muted); }
button { font: 600 15px Inter, sans-serif; color: var(--ink); background: var(--paper); border: 0; border-radius: 12px; padding: 12px 12px; margin-right: 8px; }
.version { text-align: center; color: var(--muted); font-size: 13px; margin-top: 24px; }
&lt;/style&gt;
&lt;/head&gt;
&lt;body&gt;
&lt;main&gt;
  &lt;a class=&quot;back&quot; data-href=&quot;#home&quot; title=&quot;#home&quot;&gt;&lt;span class=&quot;chev&quot;&gt;‹&lt;/span&gt; Home&lt;/a&gt;
  &lt;h1&gt;Settings&lt;/h1&gt;

  &lt;a class=&quot;card account&quot; data-href=&quot;#account&quot; title=&quot;#account&quot;&gt;
    &lt;svg class=&quot;logo&quot; viewBox=&quot;0 0 44 31&quot; aria-hidden=&quot;true&quot;&gt;
      &lt;path d=&quot;M13 7h11a8.5 8.5 0 0 1 0 17H13M13 5v24M19 24l7 7&quot; fill=&quot;none&quot; stroke=&quot;#0E7A5A&quot; stroke-width=&quot;3.4&quot; stroke-linecap=&quot;round&quot;/&gt;
      &lt;path d=&quot;M35.1 6.2a14.5 14.5 0 0 1 0 18.6M39.7 2.3a20.5 20.5 0 0 1 0 26.4&quot; fill=&quot;none&quot; stroke=&quot;#F5A524&quot; stroke-width=&quot;2.6&quot; stroke-linecap=&quot;round&quot;/&gt;
    &lt;/svg&gt;
    &lt;span class=&quot;who&quot;&gt;&lt;b&gt;you@example.com&lt;/b&gt;&lt;span class=&quot;muted&quot;&gt;Signed in&lt;/span&gt;&lt;/span&gt;
    &lt;span class=&quot;go&quot;&gt;›&lt;/span&gt;
  &lt;/a&gt;

  &lt;h2&gt;Appearance&lt;/h2&gt;
  &lt;div class=&quot;card center&quot;&gt;
    &lt;div class=&quot;seg&quot;&gt;&lt;span class=&quot;on&quot;&gt;System&lt;/span&gt;&lt;span&gt;Light&lt;/span&gt;&lt;span&gt;Dark&lt;/span&gt;&lt;/div&gt;
  &lt;/div&gt;

  &lt;h2&gt;Notes&lt;/h2&gt;
  &lt;div class=&quot;card row&quot;&gt;
    &lt;span class=&quot;text&quot;&gt;&lt;span class=&quot;title&quot;&gt;Pin notes to where I am&lt;/span&gt;&lt;span class=&quot;muted&quot;&gt;Each typed note keeps where you were.&lt;/span&gt;&lt;/span&gt;
    &lt;span class=&quot;switch&quot;&gt;&lt;/span&gt;
  &lt;/div&gt;

  &lt;h2&gt;Voice notes&lt;/h2&gt;
  &lt;div class=&quot;card row&quot;&gt;
    &lt;span class=&quot;text&quot;&gt;&lt;span class=&quot;title&quot;&gt;Speech model&lt;/span&gt;&lt;span class=&quot;muted&quot;&gt;On this phone, 57 MB. Your voice never leaves it.&lt;/span&gt;&lt;/span&gt;
    &lt;button&gt;Remove&lt;/button&gt;
  &lt;/div&gt;

  &lt;p class=&quot;version&quot;&gt;Relay Everything 1.4.0 (91)&lt;/p&gt;
&lt;/main&gt;
&lt;/body&gt;
&lt;/html&gt;
"></iframe></div></div><figcaption>As HTML</figcaption></figure><figure class="part" data-kind="photo"><div class="clip"><div class="art photo" data-note="item-1-picture-3" data-label="The real app" tabindex="0"><img src="data:image/png;base64,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kAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkIGvAAAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQAQAZAJABABkAkAEAGQCQga8AABkAkAEAGQCQAQAZAJAB4Fz+H8HzcmHg2BjGAAAAAElFTkSuQmCC" alt="The real app"></div></div><figcaption>The real app</figcaption></figure></div></div></li>
<li class="item card" id="item-2"><div class="words"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Before and After are both HTML.</b> <i>Before</i> is today's screen, written the same way, so the two differ only by the change. Each state the plan names, such as empty or loading, gets its own page. A screen you need to try, such as a drag, is a page with its own script, which you can tap and use on the review page.</div></div></div></li>
<li class="item card" id="item-3"><div class="words"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The plan no longer runs a copy of the app.</b> The step that made a copy, put it online, or drew it with the app's screen test is gone, with its <i>Try it</i> link. The build makes each screen match the page you approved.</div></div></div></li>
<li class="item card" id="item-4"><div class="words"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A plan can't show a screen as a sketch alone.</b> If the only picture of a screen is a sketch, the plan doesn't finish. Sign-in, missing data, or another change that isn't live yet are not reasons for a sketch: HTML needs none of them.</div></div></div></li>
<li class="item card" id="item-5"><div class="words"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>A sketch stays only for a part the phone or computer draws itself</b>, such as the keyboard or the share sheet, and only beside the real screen. Its label says <i>Sketch</i>, and it shows real words, never gray bars.</div></div></div></li>
</ol>
</section>
<section id="needs" aria-labelledby="needs-h"><h2 id="needs-h">What the build needs</h2>
<ol class="needs">
<li class="need card" id="need-1" data-need="none"><p><b>Nothing.</b></p></li>
<li class="aside">Non-goals: no change to the finished build's preview page, which still shows screenshots of the built app beside what you approved; no change to flow drawings, arrows, tables, ads, or website plans.</li>
</ol>
</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-16</p>Asked what happens to the step that runs a copy of the app for pictures → chose remove it: HTML in the app's real look is the only way, because running the app is too much work for a plan.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-16</p>Assumed: <i>Before</i> is HTML too, not a screenshot of the live app, because the person asked for no app running, and two pages made the same way differ only by the change.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-16</p>Assumed: a screen is a <code>page</code> card, or a <code>live</code> card when it needs a script to try, because both already carry local styles, fonts, and pictures, so no new card kind is needed.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-16</p>Assumed: <code>look.mjs page</code> writes the app's colors and parts plus the Tailwind classes the page uses, compiled by the app's own Tailwind, because then a page can copy a screen's real class names and look the same; a phone or desktop app copies its theme's colors and fonts into the page's CSS by hand, as the Relay Everything sample does.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-16</p>Assumed: the builder stops on a screen sketch with no picture, page, or live card beside it, and a &quot;No real picture&quot; line no longer lets it through, because that line is how the 2026-11-10 and 2026-11-11 plans got a sketch through.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-16</p>Assumed: an <code>svg</code> fence alone still builds, because it draws arrows and layers, not screens.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-16</p>Assumed: the gray <code>bar</code> and <code>skeleton</code> classes leave the <code>screen</code> fence, because a sketch now is only of a system part, which has real words.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-16</p>Assumed: <code>/apply</code>'s preview page still screenshots the built app beside the approved page, because by then the app is built and running.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-16</p>Assumed: <code>wiki/prototypes.md</code> keeps its name with new headings, because other pages link it; installed repos that link its old headings, such as Relay Everything's phone-picture steps, get an Updating note.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-16</p>Assumed: the sample is Relay Everything's Settings screen, written as HTML with its colors from <code>mobile/lib/brand.dart</code> and its Inter font, beside the real screenshot from its settings-same-everywhere plan, with sample data only.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-16</p>Check: <code>scripts/tests/prototype.test.mjs</code> is deleted with the script it tested, because plans no longer run a copy of the app.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-16</p>Assumed: the real-Tailwind test of <code>look.mjs page</code> skips in CI when <code>app/</code> is not installed, as <code>access-openapi.test.mjs</code> does, because installing the app in the payload job would slow every run; the package-lookup and fallback tests always run.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-16</p>Assumed: the public plan-first page is updated to say screens are HTML pages, because it still described the removed app copy.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-16</p>Assumed: archive checkpoint on branch review-shows-real-look as release 61.9.0.</li>
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
<div id="viewer" role="dialog" aria-modal="true" aria-label="Full screen" hidden>
  <div class="vtop"><div class="names" role="tablist" aria-label="Pictures"></div><button type="button" class="primary" data-close>✕ Close</button></div>
  <div class="vspace"></div>
  <div class="vfoot"><p class="vhint"></p>
    <span class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button></span>
    <span class="sizes" role="group" aria-label="Width"><button type="button" data-size="0" aria-pressed="true">Phone</button><button type="button" data-size="1" aria-pressed="false">Computer</button></span>
    <a class="try" target="_blank" rel="noopener noreferrer" hidden>Try it ↗</a></div>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" data-actions="[{&quot;name&quot;:&quot;build&quot;,&quot;label&quot;:&quot;Build it&quot;,&quot;done&quot;:&quot;Asked the chat to build.&quot;},{&quot;name&quot;:&quot;publish&quot;,&quot;label&quot;:&quot;Build and publish&quot;,&quot;done&quot;:&quot;Asked the chat to build and publish.&quot;,&quot;confirm&quot;:{&quot;say&quot;:&quot;Goes live, can't be undone.&quot;,&quot;yes&quot;:&quot;Yes, publish&quot;,&quot;ask&quot;:&quot;Build and publish? This goes live and can't be undone.&quot;}}]" hidden>
    <div id="ready-confirm" role="group" hidden><p></p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span></span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
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
    // A browser notice that a resize watcher waited a frame is no script error.
    if (/ResizeObserver loop/.test(e.message)) return;
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  // A preview page shows a finished build: its words name the preview. A review page of other work names its cards.
  const PREVIEW = document.body.getAttribute('data-kind') === 'preview', NAME = PREVIEW ? CHANGE.replace(/-preview$/, '') : CHANGE;
  const REVIEW = document.body.getAttribute('data-kind') === 'review', NOUN = REVIEW ? 'Card' : 'Change', PAGE = REVIEW ? 'page' : 'plan';
  if (PREVIEW) {
    document.title = 'Preview · ' + NAME;
    document.querySelector('.eyebrow').textContent = NAME;
    document.querySelector('h1').textContent = 'Built: look, then publish?';
    document.querySelector('.hint .lead').textContent = 'Tap a picture to see it full screen, then tap it to note it.';
    document.querySelector('.hint .tail').textContent = '';
  }
  if (REVIEW) document.querySelector('.hint .lead').textContent = 'Tap OK or Note on each card, or select words to note them.';
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {}, ok: {}, files: {} };
  // A note on words keeps its quote; a note on a picture spot keeps the picture, the spot in percent, and its name.
  const EXTRA = { quote: 'string', k: 'number', x: 'number', y: 'number', on: 'string' };
  const ok = function (r, id) {
    return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id)
      && Object.keys(EXTRA).every(function (f) { return r[f] === undefined || typeof r[f] === EXTRA[f]; });
  };
  function extraOf(rec) {
    const x = {};
    Object.keys(EXTRA).forEach(function (f) { if (rec && rec[f] !== undefined) x[f] = rec[f]; });
    return x;
  }
  const QID = /^need-\d+-q-\d+$/;
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  function load(text) {
    try {
      const saved = JSON.parse(text || 'null');
      if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
      if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
      if (saved && saved.ok && typeof saved.ok === 'object') {
        data.ok = {};
        Object.keys(saved.ok).forEach(function (id) { if (/^item-\d+$/.test(id) && (saved.ok[id] === true || saved.ok[id] === 'sent')) data.ok[id] = saved.ok[id]; });
      }
      const kept = function (name, fits) {
        if (!saved || !saved[name] || typeof saved[name] !== 'object') return;
        data[name] = {};
        Object.keys(saved[name]).forEach(function (id) { if (QID.test(id) && fits(saved[name][id])) data[name][id] = saved[name][id]; });
      };
      kept('files', function (v) {
        return Array.isArray(v) && v.every(function (f) { return f && /^[0-9a-f]{32}$/.test(f.id) && typeof f.name === 'string' && typeof f.size === 'number' && typeof f.sent === 'boolean'; });
      });
    } catch (e) { /* unreadable notes start empty */ }
  }
  load(store ? store.getItem(KEY) : null);
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?(?:-(words|spot)-\d+)?$/.exec(id) || [];
    if (m[5]) return Object.assign(where(id.replace(/-(words|spot)-\d+$/, '')), m[5] === 'words' ? { kind: 'words' } : {});
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: NOUN + ' #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, .more, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot. A screen's words sit in many small boxes: join every piece with a space.
    // A picture file, an ad, and a page read as their label.
    const row = el.tagName === 'TR', named = el.getAttribute('data-label');
    const cells = row ? c.querySelectorAll('td') : el.classList.contains('screen') ? texts(c) : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = named !== null ? named : Array.prototype.map.call(cells, function (n) { return n.textContent.replace(/\s+/g, ' ').trim(); })
      .join(row ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  // A note on words or a spot sits on its base target: words are found again by their quote, a spot by the base's label.
  function find(id, rec) {
    const m = /^(.*)-(words|spot)-\d+$/.exec(id), el = document.querySelector('[data-note="' + (m ? m[1] : id) + '"]');
    if (!el) return null;
    if (m && m[2] === 'words') return textOf(el).indexOf(rec.quote) >= 0 ? el : null;
    return labelOf(el) === rec.label ? el : null;
  }
  function textOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .add, .more'), function (n) { n.parentNode.removeChild(n); });
    return c.textContent.replace(/\s+/g, ' ');
  }
  // A new note on words or a spot takes the next free number on its target.
  function nextId(base, kind) {
    const pre = base + '-' + kind + '-';
    let k = 1;
    data.notes.map(function (n) { return n.id; }).concat(Object.keys(data.drafts)).forEach(function (id) {
      if (id.indexOf(pre) === 0) k = Math.max(k, +id.slice(pre.length) + 1);
    });
    return pre + k;
  }
  // The notes list groups notes by Why, each card, and Decisions.
  function groupOf(id) {
    const m = /^(why|item|decision)-(\d+)/.exec(id) || [];
    return m[1] === 'why' ? [0, 'Why'] : m[1] === 'item' ? [+m[2], NOUN + ' ' + m[2]] : [1e6, 'Decisions'];
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }))
      .map(function (id, i) { return [groupOf(id)[0], i, id]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; })
      .map(function (x) { return x[2]; });
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    let group = null;
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec);
      if (groupOf(id)[1] !== group) {
        group = groupOf(id)[1];
        const head = document.createElement('li');
        head.className = 'group'; head.textContent = group;
        $('note-list').appendChild(head);
      }
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        if (rec.x !== undefined) {
          pin.className += ' spot'; pin.style.left = rec.x + '%'; pin.style.top = rec.y + '%';
          el.appendChild(pin);
        } else slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      const id = el.getAttribute('data-note');
      // An item's words take their note through the Note button beside OK; a part takes its notes full screen.
      if (el.closest('.art, .stage') || el.matches('.items > .item .text') || el.querySelector('.pin[data-open="' + id + '"]')) return;
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    all('.verdict', function (v) {
      const id = v.querySelector('[data-ok]').getAttribute('data-ok'), state = data.ok[id], n = id.slice(5);
      v.querySelector('.tag').hidden = !state;
      v.querySelector('.tag').textContent = state === 'sent' ? 'OK · Sent' : 'OK';
      v.querySelector('[data-ok]').textContent = state ? 'Undo' : 'OK';
      v.querySelector('[data-ok]').setAttribute('aria-label', (state ? 'Undo OK on ' : 'OK ') + NOUN.toLowerCase() + ' ' + n);
      v.querySelector('[data-open]').hidden = !!state;
    });
    const answers = replies();
    all('.form [data-q]', function (q) {
      const id = q.getAttribute('data-q'), held = data.files[id] || [];
      if (!held.length) return;
      if (!$('note-list').querySelector('.group.answers')) $('note-list').insertAdjacentHTML('beforeend', '<li class="group answers">Answers</li>');
      const line = asker(id) + ', "' + q.getAttribute('data-label') + '"', done = !answers.some(function (a) { return a.id === id; });
      $('note-list').insertAdjacentHTML('beforeend', '<li class="entry"><span class="where">' + esc(line) + (done ? '<span class="tag">Sent</span>' : '') + '</span>'
        + esc(held.map(function (f) { return f.name; }).join(', ')) + '</li>');
    });
    if (ids.length || $('note-list').querySelector('.answers')) { const none = $('note-list').querySelector('li.muted'); if (none) none.remove(); }
    drawFiles();
    views.forEach(counts);
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, chipExtra = null, tap = null;
  // True once the inbox opens this page closed, or a tap on it reaches the chat: it takes no note.
  let readOnly = false;
  const pointers = {};
  // `extra` makes the chip start a new note on selected words or a picture spot.
  function showChip(el, x, y, keyboard, extra) {
    if (readOnly) return;
    const id = el.getAttribute('data-note');
    chipFor = el; chipExtra = extra || null;
    chip.textContent = extra && extra.quote ? 'Note' : !extra && (noteOf(id) || data.drafts[id]) ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; chipExtra = null; }
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
    const offer = el && (el.closest('.clip.big') || (e.pointerType === 'mouse' && !el.closest('.stage')));
    if (offer) showChip(el, e.clientX, e.clientY, false, spotAt(el, t.target, e)); else hideChip();
  });
  // A tap on a whole part full screen notes that spot of it, kept in percent so it holds at any size; a drawing's line is a line.
  function spotAt(el, target, e) {
    if (!el.parentNode.classList.contains('big')) return null;
    const r = el.getBoundingClientRect(), fig = el.closest('.part');
    const pct = function (v, size) { return Math.max(0, Math.min(100, Math.round(v / Math.max(1, size) * 100))); };
    return { k: 0, x: pct(e.clientX - r.left, r.width), y: pct(e.clientY - r.top, r.height), on: fig.querySelector('figcaption').firstChild.textContent };
  }
  // Selected words in one note target offer a note on just those words.
  let picking = 0;
  document.addEventListener('selectionchange', function () {
    clearTimeout(picking);
    picking = setTimeout(function () {
      const s = window.getSelection ? window.getSelection() : null;
      if (!s || s.isCollapsed || !s.rangeCount || open) return;
      const range = s.getRangeAt(0), at = range.commonAncestorContainer, host = (at.nodeType === 1 ? at : at.parentNode).closest('[data-note]');
      const quote = s.toString().replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!host || !quote || host.closest('.art, #editor, #viewer') || textOf(host).indexOf(quote) < 0) return;
      const r = range.getBoundingClientRect();
      showChip(host, r.left + r.width / 2, r.bottom, false, { quote: quote });
    }, 150);
  });
  chip.addEventListener('click', function () {
    if (!chipFor) return;
    const id = chipFor.getAttribute('data-note'), extra = chipExtra;
    openEditor(extra ? nextId(id, extra.quote ? 'words' : 'spot') : id, chipFor, extra);
  });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id);
    const el = rec ? find(id, rec) : t.closest('[data-note]') || document.querySelector('[data-note="' + id + '"]');
    if (el && t.classList.contains('entry')) { reveal(el, rec && rec.k); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) {
        const el = chipFor, words = chipExtra && chipExtra.quote;
        hideChip();
        if (words && window.getSelection) window.getSelection().removeAllRanges();
        el.focus();
      }
      else if (view) closeViewer(true);
    } else if (view && !open && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && V.f <= V.lo * 1.001) {
      openViewer(view.c, view.i + (e.key === 'ArrowRight' ? 1 : -1));
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el, extra) {
    if (readOnly) return;
    closeViewer(false); closeEditor(false); hideChip();
    const note = noteOf(id), draft = data.drafts[id];
    if (el) reveal(el, extra ? extra.k : (draft || note || {}).k);
    const quote = extra && extra.quote, clip = quote && quote.length > 60 ? quote.slice(0, 59) + '…' : quote;
    const label = draft ? draft.label : note ? note.label : quote ? 'words "' + clip + '"' : labelOf(el);
    open = { id: id, label: label, el: el, extra: extra || extraOf(draft || note) };
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
    else data.drafts[open.id] = Object.assign({ label: open.label, text: text }, open.extra);
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push(Object.assign({ id: id, label: open.label, text: text }, open.extra));
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length, k = oks().length, a = replies().length;
      copyNotes(function () { toast('Saved and copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── OK and Note on each card: an OK is kept with the notes until undone, and goes to the chat with them ──
  all('.items > .item', function (item) {
    const v = document.createElement('div');
    v.className = 'verdict';
    v.innerHTML = '<span class="tag" hidden>OK</span><button type="button" class="btn-ghost" data-ok="' + item.id + '">OK</button>'
      + '<button type="button" class="btn-ghost" data-open="' + item.id + '" aria-label="Note on ' + NOUN.toLowerCase() + ' ' + item.id.slice(5) + '">Note</button>';
    item.appendChild(v);
  });

  // ── the card view: each part sits in a labelled frame, sized by the card's words; a click opens it full screen ──
  const BASE = 13, PAGE_W = [390, 1280], FIRST_SCREEN = 760;
  const WIDE = window.matchMedia ? window.matchMedia('(min-width: 900px)') : { matches: false };
  const later = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (fn) { return setTimeout(fn, 16); };
  const views = [];
  // Each page frame's height, as its page posted it at 1 px tall; and each overflow seen at full height, measured once.
  const pageH = new WeakMap(), pageOver = new WeakMap(), PAGE_MAX = 40000;
  let view = null, queued = false;
  // A resize watcher's work waits for the next frame, so a size it sets never loops back into the same frame.
  function queue() {
    if (queued) return;
    queued = true;
    later(function () { queued = false; views.forEach(layout); if (view && big().paged) fitBig(); });
  }
  // A new width measures a page again from 1 px tall, so a shorter page doesn't keep the old height.
  function pageWidth(f, w) {
    if (f.style.width === w + 'px') return;
    f.style.width = w + 'px'; f.style.height = '1px'; pageH.delete(f);
  }
  // A page or live card drawn w px wide and h px tall, scaled by k; a page keeps the height its page posted.
  function frameAt(p, w, h, k) {
    const f = p.el.querySelector('iframe');
    if (!f) return;
    if (p.kind === 'page') pageWidth(f, w); else { f.style.width = w + 'px'; f.style.height = h + 'px'; }
    f.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    p.el.style.width = w * k + 'px'; p.el.style.height = h * k + 'px';
  }
  // A part's own size: a drawing or picture at the base size, a page or live card at a phone's width.
  function natural(p) {
    if (p.kind === 'page') return { w: PAGE_W[0], h: pageH.get(p.el.querySelector('iframe')) || 200 };
    if (p.kind === 'live') return { w: PAGE_W[0], h: +p.el.getAttribute('data-height') || 640 };
    p.clip.style.setProperty('--f', BASE + 'px');
    return { w: p.el.offsetWidth, h: p.el.offsetHeight };
  }
  // On a computer the parts are as tall as the words, at least 420 px and at most the window, each shrunk whole
  // to fit the row down to about 110 px wide, past which the row scrolls. On a phone each is a small picture.
  function layout(c) {
    const wide = WIDE.matches, bar = document.querySelector('.bar'), verdict = c.item.querySelector('.verdict');
    const H = Math.min(Math.max(420, c.words.offsetHeight + (verdict ? verdict.offsetHeight : 0)), Math.max(240, window.innerHeight - (bar ? bar.offsetHeight : 0) - 32));
    c.el.style.height = wide ? H + 'px' : '';
    const room = wide ? H - 32 - 30 : 112;
    const sized = c.parts.map(function (p) {
      if (p.clip.classList.contains('big')) return null;
      const s = natural(p);
      if (!s.w || !s.h) return null;
      s.p = p;
      s.k = !wide ? (p.paged ? 84 / s.w : Math.min(84 / s.w, 112 / s.h))
        : p.paged ? Math.min(1, room / Math.min(s.h, FIRST_SCREEN)) : Math.min(p.kind === 'draw' ? 1.25 : 1, room / s.h);
      return s;
    }).filter(Boolean);
    if (wide) shrink(sized, c.stage.clientWidth - 32 - 16 * (c.parts.length - 1));
    sized.forEach(function (s) {
      const p = s.p;
      if (p.paged) frameAt(p, s.w, s.h, s.k); else p.clip.style.setProperty('--f', BASE * s.k + 'px');
      const h = s.h * s.k, shown = wide ? Math.min(room, Math.ceil(h)) : 112;
      p.clip.style.height = wide ? shown + 'px' : '';
      p.fig.style.width = wide ? Math.ceil(s.w * s.k) + 2 + 'px' : '';
      p.clip.classList.toggle('tall', h > shown + 2);
    });
  }
  // Parts too wide for the row shrink by one factor; one that would fall under 110 px keeps 110, and the rest share what is left.
  function shrink(sized, row) {
    let small = [], f = 1;
    for (let i = 0; i < sized.length; i += 1) {
      const rest = sized.filter(function (s) { return small.indexOf(s) < 0; });
      f = Math.min(1, (row - 110 * small.length) / Math.max(1, rest.reduce(function (t, s) { return t + s.w * s.k; }, 0)));
      const more = rest.filter(function (s) { return s.w * s.k * f < 110; });
      if (!more.length) break;
      small = small.concat(more);
    }
    sized.forEach(function (s) { s.k *= small.indexOf(s) >= 0 ? Math.min(1, 110 / (s.w * s.k)) : Math.max(f, 0); });
  }
  function counts(c) {
    c.parts.forEach(function (p) {
      const k = p.clip.querySelectorAll('.pin').length;
      p.count.textContent = k ? ' · ' + k : '';
      p.fig.setAttribute('aria-label', p.label + (k ? ', ' + plural(k) : '') + ', open full screen');
    });
  }
  all('.view', function (v) {
    const item = v.closest('.item'), c = { el: v, item: item, stage: v.querySelector('.stage'), words: item.querySelector('.words'),
      try: v.getAttribute('data-try') || '', at: 0, parts: [] };
    Array.prototype.forEach.call(c.stage.children, function (fig) {
      const cap = fig.querySelector('figcaption'), kind = fig.getAttribute('data-kind');
      const p = { fig: fig, clip: fig.querySelector('.clip'), el: fig.querySelector('.clip').firstElementChild, kind: kind, paged: kind === 'page' || kind === 'live', label: cap.textContent };
      p.count = document.createElement('span'); p.count.className = 'count'; cap.appendChild(p.count);
      fig.tabIndex = 0; fig.setAttribute('role', 'button');
      c.parts.push(p);
    });
    c.stage.addEventListener('click', function (e) {
      const fig = e.target.closest('.part');
      if (fig && !e.target.closest('.clip.big, [data-open]')) openViewer(c, partIndex(c, fig));
    });
    c.stage.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('part')) { e.preventDefault(); openViewer(c, partIndex(c, e.target)); }
    });
    if (window.ResizeObserver) { const watch = new ResizeObserver(queue); watch.observe(c.words); watch.observe(c.stage); }
    views.push(c);
  });
  const partIndex = function (c, fig) { return c.parts.map(function (p) { return p.fig; }).indexOf(fig); };
  // A picture file is as wide in em as its file is in px, so it scales like a drawing.
  all('.art.photo img', function (img) {
    const size = function () { if (img.naturalWidth) { img.style.width = img.naturalWidth / BASE + 'em'; queue(); } };
    if (img.complete) size(); else img.addEventListener('load', size);
  });
  // A note's target shows: folded words unfold.
  function reveal(el) {
    folds.forEach(function (f) { if (f.text === el && !f.open) { f.open = true; measure(f); } });
  }

  // ── full screen: one part over everything, the card's labels on top, its changes at the foot; it zooms and scrolls natively ──
  const vtop = viewer.querySelector('.vtop'), vfoot = viewer.querySelector('.vfoot'), names = viewer.querySelector('.names');
  const vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button'), sizes = viewer.querySelector('.sizes'), tryIt = viewer.querySelector('.try');
  const V = { f: BASE, lo: BASE, hi: BASE };
  const HINTS = { draw: ['Drag to move · pinch or + to zoom', 'tap a line or picture to note it'], photo: ['Pinch or + to zoom', 'tap a spot to note it'],
    page: ['Scroll to read', 'tap a spot to note it'], live: ['Try it here: it sends nothing', ''] };
  function big() { return view && view.c.parts[view.i]; }
  function scale(f, cx, cy) {
    const box = big().clip;
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (box.scrollLeft + cx) * k - cx, y = (box.scrollTop + cy) * k - cy;
    V.f = f; box.style.setProperty('--f', f + 'px');
    box.scrollLeft = x; box.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  // A drawing fits the screen's width; a picture fits whole; a page or live card shows at the picked width, shrunk to fit.
  function fitBig() {
    const p = big();
    root.style.setProperty('--vtop', vtop.offsetHeight + 'px'); root.style.setProperty('--vfoot', vfoot.offsetHeight + 'px');
    const aw = p.clip.clientWidth - 24, ah = p.clip.clientHeight - 24;
    V.f = V.lo = V.hi = BASE;
    if (p.paged) {
      const w = PAGE_W[view.c.at], k = Math.min(1, aw / w), f = p.el.querySelector('iframe');
      frameAt(p, w, p.kind === 'live' ? ah / k : pageH.get(f) || ah / k, k);
      return;
    }
    p.clip.style.setProperty('--f', BASE + 'px');
    const w = p.el.offsetWidth, h = p.el.offsetHeight;
    if (!w || !h || aw <= 0) return;
    V.lo = BASE * (p.kind === 'draw' ? aw / w : Math.min(aw / w, ah / h)); V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    p.clip.scrollLeft = p.clip.scrollTop = 0;
    scale(V.lo, 0, 0);
  }
  function openViewer(c, i) {
    hideChip();
    if (view) big().clip.classList.remove('big');
    view = { c: c, i: (i + c.parts.length) % c.parts.length };
    const p = big(), hint = HINTS[p.kind];
    viewer.hidden = false; document.body.classList.add('viewing');
    names.innerHTML = c.parts.map(function (q, k) {
      return '<button type="button" class="name" role="tab" data-i="' + k + '" aria-selected="' + (k === view.i) + '">' + esc(q.label) + '</button>';
    }).join('');
    viewer.querySelector('.vhint').innerHTML = esc(hint[0]) + (hint[1] ? '<span class="note-it"> · ' + esc(hint[1]) + '</span>' : '');
    vbar.hidden = p.paged; sizes.hidden = !p.paged; tryIt.hidden = !c.try;
    if (c.try) tryIt.href = c.try;
    Array.prototype.forEach.call(sizes.children, function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-size') === c.at)); });
    p.clip.classList.add('big');
    layout(c); fitBig();
    viewer.querySelector('[data-close]').focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const c = view.c, p = big();
    p.clip.classList.remove('big'); p.clip.scrollLeft = p.clip.scrollTop = 0;
    view = null; c.at = 0;
    viewer.hidden = true; document.body.classList.remove('viewing');
    layout(c); bar();
    if (restore) p.fig.focus({ preventScroll: true });
  }
  viewer.querySelector('[data-close]').addEventListener('click', function () { closeViewer(true); });
  names.addEventListener('click', function (e) { const b = e.target.closest('[data-i]'); if (b) openViewer(view.c, +b.getAttribute('data-i')); });
  sizes.addEventListener('click', function (e) {
    const b = e.target.closest('[data-size]');
    if (!b) return;
    view.c.at = +b.getAttribute('data-size');
    Array.prototype.forEach.call(sizes.children, function (s) { s.setAttribute('aria-pressed', String(s === b)); });
    fitBig();
  });
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target), box = big().clip;
    if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], box.clientWidth / 2, box.clientHeight / 2);
  });
  const zoomable = function (e) { return view && !big().paged && e.target.closest && e.target.closest('.clip.big'); };
  document.addEventListener('wheel', function (e) {
    if (!zoomable(e) || (!e.ctrlKey && !e.metaKey)) return;
    e.preventDefault();
    const r = big().clip.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively, or swipes to the next part at fit; two fingers pinch around their midpoint.
  // A swipe starts only on the shown part, so a swipe along the scrolling label row keeps the part.
  let pinch = null, swipe = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  document.addEventListener('touchstart', function (e) {
    const t = e.touches, on = e.target.closest && e.target.closest('.clip.big');
    swipe = view && on && t.length === 1 ? { x: t[0].clientX, y: t[0].clientY } : null;
    if (zoomable(e) && t.length === 2) pinch = { f: V.f, dist: span(t) };
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = big().clip.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  document.addEventListener('touchend', function (e) {
    const s = swipe, t = e.changedTouches[0];
    if (e.touches.length < 2) pinch = null;
    swipe = null;
    if (!s || !view || !t || V.f > V.lo * 1.001) return;
    const dx = t.clientX - s.x;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(t.clientY - s.y)) openViewer(view.c, view.i + (dx < 0 ? 1 : -1));
  });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });

  // ── page parts: a page posts its height at 1 px tall; a cover over it takes taps ──
  // A page frame is sealed from this page, so the kit's one script in it posts its height, and the link under a point.
  // Only a message from one of this page's own page frames counts; a height for an old width is dropped.
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (!m || (m.type !== 'review:page' && m.type !== 'review:link')) return;
    const f = Array.prototype.find.call(document.querySelectorAll('.page iframe'), function (x) { return x.contentWindow === e.source; });
    if (!f) return;
    if (m.type === 'review:link') {
      const cover = f.parentNode.querySelector('.cover'), href = typeof m.href === 'string' ? m.href.slice(0, 2000) : '';
      if (cover) { cover.title = href; cover.style.cursor = href ? 'pointer' : ''; }
      return;
    }
    if (typeof m.h !== 'number' || !isFinite(m.h) || typeof m.vh !== 'number' || m.w + 'px' !== f.style.width) return;
    const h = Math.max(1, Math.min(PAGE_MAX, Math.round(m.h)));
    // A height counts only when measured 1 px tall; a page past its full-height frame grew late, so it measures again.
    if (m.vh > 1) {
      if (m.vh === pageH.get(f) && h > m.vh && pageOver.get(f) !== h) { pageOver.set(f, h); f.style.height = '1px'; }
      return;
    }
    pageH.set(f, h); f.style.height = h + 'px';
    if (!f.parentNode.querySelector('.cover')) f.parentNode.insertAdjacentHTML('beforeend', '<span class="cover"></span>');
    queue();
  });
  // A link in a page goes nowhere: hovering over it shows its address.
  document.addEventListener('mousemove', function (e) {
    const cover = e.target.classList && e.target.classList.contains('cover') ? e.target : null, f = cover && cover.parentNode.querySelector('iframe');
    if (!f || !f.contentWindow) return;
    const r = cover.getBoundingClientRect(), k = r.width / f.offsetWidth;
    f.contentWindow.postMessage({ type: 'review:point', x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }, '*');
  });

  // ── long words fold after about two lines behind More, on a phone only; a note on hidden words unfolds them ──
  const folds = [];
  function measure(f) {
    // The fold never cuts the bold first sentence: it keeps at least the lines that sentence takes.
    f.text.classList.remove('folded');
    f.more.style.top = '';
    if (WIDE.matches) { f.more.hidden = true; return; }
    const lead = f.clamp.querySelector(':scope > b:first-child'), line = parseFloat(getComputedStyle(f.clamp).lineHeight) || 24;
    const leadLines = lead ? Math.ceil((lead.getBoundingClientRect().bottom - f.clamp.getBoundingClientRect().top - 1) / line) : 0;
    f.clamp.style.webkitLineClamp = String(Math.max(2, leadLines));
    f.text.classList.add('folded');
    const long = f.clamp.scrollHeight > f.clamp.clientHeight + 2;
    f.text.classList.toggle('folded', long && !f.open);
    f.more.hidden = !long;
    f.more.textContent = f.open ? 'Less' : 'More';
    f.more.setAttribute('aria-expanded', String(f.open));
    // Folded, More sits on the last shown line, at its end.
    if (long && !f.open) f.more.style.top = f.clamp.offsetTop + f.clamp.clientHeight - line + 'px';
  }
  all('.items > .item .text', function (text) {
    const clamp = document.createElement('span'), more = document.createElement('button'), f = { text: text, clamp: clamp, more: more, open: false };
    clamp.className = 'clamp';
    while (text.firstChild) clamp.appendChild(text.firstChild);
    text.appendChild(clamp);
    more.type = 'button'; more.className = 'more';
    text.appendChild(more);
    more.addEventListener('click', function () { f.open = !f.open; measure(f); });
    folds.push(f);
    measure(f);
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump(hash) {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(typeof hash === 'string' ? hash : location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return Object.assign({ id: n.id, label: n.label, text: n.text }, extraOf(n)); }); }
  // An OK not yet in the chat, as its card's id, in card order.
  function oks() {
    return Object.keys(data.ok).filter(function (id) { return data.ok[id] === true; }).sort(function (a, b) { return a.slice(5) - b.slice(5); });
  }
  function acknowledge(notes, okd, ans) {
    ans.forEach(function (a) {
      (data.files[a.id] || []).forEach(function (f) { if (a.files.indexOf(f.id) >= 0) f.sent = true; });
    });
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    okd.forEach(function (id) { if (data.ok[id] === true) data.ok[id] = 'sent'; });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id), spot = n.x === undefined ? '' : ', spot at ' + n.x + '% across and ' + n.y + '% down on "' + n.on + '"';
      return '- ' + w.spot + spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  // What goes to the chat: each OK on its own line, then the notes.
  function lines(notes, okd, ans) {
    return okd.map(function (id) { return NOUN + ' #' + id.slice(5) + ': OK'; }).concat(ans.map(function (a) { return a.line; }), bullets(notes)).join('\n');
  }
  function notesText() {
    const header = REVIEW ? document.body.getAttribute('data-header')
      : PREVIEW ? 'Notes on the preview of ' + NAME + ' from its review page. Don\'t publish yet.'
      : 'Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.';
    return header + '\n' + lines(unsent(), oks(), replies());
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  function plural2(n, k, a) {
    const parts = n || !(k || a) ? [plural(n)] : [];
    if (k) parts.push(k + (k === 1 ? ' OK' : ' OKs'));
    if (a) parts.push(a + (a === 1 ? ' answer' : ' answers'));
    return parts.join(' and ');
  }
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
    if (unsent().length || oks().length || replies().length) return false;
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
    if (hosted) return hostedAsk(path, body);
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), okd = oks(), ans = replies(), n = notes.length, k = okd.length, a = ans.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural2(n, k, a) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const body = { text: lines(notes, okd, ans) };
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('send', live, body);
      const changed = 'The ' + PAGE + ' changed. Reload to read it first.';
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (r.status === 409) { const why = ((await r.json()) || {}).gone ? GONE : changed; says(why); toast(why); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes, okd, ans);
      says('Sent ' + plural2(n, k, a) + ' to the chat.');
      toast('Sent ' + plural2(n, k, a) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length, k = oks().length, a = replies().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  document.addEventListener('click', function (e) {
    const b = e.target.closest ? e.target.closest('[data-ok]') : null;
    if (!b) return;
    const id = b.getAttribute('data-ok');
    if (data.ok[id]) delete data.ok[id]; else data.ok[id] = true;
    persist();
  });

  // ── the page's own buttons, from the builder; one that can't be undone asks once more above the footer ──
  let version = null, confirming = null;
  const ACTIONS = JSON.parse($('ready').getAttribute('data-actions') || '[]');
  const actionOf = function (name) { return ACTIONS.filter(function (a) { return a.name === name; })[0] || null; };
  const choice = function (name) { return $('ready').querySelector('[data-ready="' + name + '"]'); };
  ACTIONS.forEach(function (a) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('data-ready', a.name); b.setAttribute('data-label', a.label);
    if (a.confirm) { b.textContent = a.label; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'ready-confirm'); }
    else b.innerHTML = '<span class="spinner" hidden aria-hidden="true"></span><span></span>';
    $('ready').insertBefore(b, $('ready-confirm'));
  });
  function fillConfirm(a) {
    confirming = a;
    $('ready-confirm').querySelector('p').textContent = a.confirm.say;
    $('ready-confirm').setAttribute('aria-label', a.confirm.ask);
    choice('yes').setAttribute('data-label', a.confirm.yes);
  }
  if (ACTIONS.filter(function (a) { return a.confirm; }).length) fillConfirm(ACTIONS.filter(function (a) { return a.confirm; })[0]);
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (focus && wasOpen && !$('ready').hidden && confirming) choice(confirming.name).focus({ preventScroll: true });
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
    const gate = drawNeeds();
    all('#ready > [data-ready]', function (b) {
      if (!b.querySelector('.spinner')) b.textContent = gate || b.getAttribute('data-label');
    });
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready'), spinner = b.querySelector('.spinner');
      const active = !!spinner && pending === (step === 'yes' ? confirming && confirming.name : step);
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(active));
      if (spinner) {
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : (b.parentNode === $('ready') && gate) || b.getAttribute('data-label');
      }
    });
    const shown = $('ready').hidden ? 0 : $('ready').querySelectorAll('#ready > button:not([hidden])').length;
    el.style.setProperty('--cols', String(Math.min(3, 1 + shown)));
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  // Each button shows when the link offers it; the choices stay hidden when it offers none.
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || typeof answer.version !== 'string') return;
    const shown = ACTIONS.filter(function (a) {
      choice(a.name).hidden = names.indexOf(a.name) < 0;
      return names.indexOf(a.name) >= 0;
    });
    if (!shown.length) return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot(), okd = oks(), ans = replies();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length || okd.length || ans.length) body.text = lines(notes, okd, ans);
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? actionOf(name).done
        : r.status === 409 && a.changed === true ? 'The ' + PAGE + ' changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : r.status === 409 && a.gone === true ? GONE : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes, okd, ans);
      // A gone file keeps the buttons, as a 429 does: the person picks it again and taps once more.
      if (line !== GONE) hideActions();
      says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready'), a = actionOf(step), gaps = needsOpen();
    // While the build needs the person, a go button leads to the first thing it needs instead.
    if (a && gaps.length) {
      all('.hit', function (n) { n.classList.remove('hit'); });
      gaps[0].classList.add('hit'); gaps[0].scrollIntoView({ block: 'center' });
      return;
    }
    if (step === 'yes') act(confirming.name);
    else if (step === 'cancel' || a.confirm) {
      says('');
      if (a) fillConfirm(a);
      $('ready-confirm').hidden = step === 'cancel';
      all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', String(b === button)); });
      bar();
      choice(step === 'cancel' ? confirming.name : 'cancel').focus({ preventScroll: true });
    } else act(step);
  });

  // ── answers: the files a need asks for, sent with the notes under their question; a sent file never goes again ──
  const asker = function (id) { return 'Need #' + /^need-(\d+)/.exec(id)[1]; };
  function answered(q) { const id = q.getAttribute('data-q'); return !!(data.files[id] && data.files[id].length); }
  // Each question with files the chat has not got yet, in page order: its id, its line, and the files it names.
  function replies() {
    const out = [];
    all('.form [data-q]', function (q) {
      const id = q.getAttribute('data-q'), fresh = (data.files[id] || []).filter(function (f) { return !f.sent; });
      if (fresh.length) out.push({ id: id, files: fresh.map(function (f) { return f.id; }),
        line: '- ' + asker(id) + ', "' + q.getAttribute('data-label') + '": ' + fresh.map(function (f) { return f.name; }).join(', ') });
    });
    return out;
  }
  const fileIds = function (ans) { return ans.reduce(function (ids, a) { return ids.concat(a.files); }, []); };

  // ── files: checked here first, then sent at once through the link or the inbox; a send later names them by id ──
  const MB = 1024 * 1024, uploads = {}, waiting = {};
  let refs = 0;
  function upload(file, question) {
    if (hosted) {
      return file.arrayBuffer().then(function (buf) {
        return new Promise(function (resolve) {
          const ref = 'f' + (refs += 1);
          waiting[ref] = resolve;
          port.postMessage({ type: 'inbox:file', ref: ref, name: file.name, question: question, data: buf }, [buf]);
        });
      });
    }
    return fetch('file', { method: 'POST', cache: 'no-store', body: file,
      headers: { 'x-reply-key': live, 'x-file-name': encodeURIComponent(file.name), 'x-file-question': encodeURIComponent(question) } })
      .then(function (r) { return r.json().then(function (a) { return r.ok && a && /^[0-9a-f]{32}$/.test(a.id) ? { id: a.id } : { error: (a && a.error) || 'it was not sent; try again' }; }); })
      .catch(function () { return { error: 'it was not sent; try again' }; });
  }
  // The app deletes a file a day after it came, or with a tap that failed or was cancelled: one this page holds unsent
  // and the app no longer does goes back to its question, to be picked again.
  const GONE = 'A file is no longer held. Pick it again, then send.';
  function keepHeld(held) {
    let gone = 0;
    Object.keys(data.files).forEach(function (id) {
      data.files[id] = data.files[id].filter(function (f) {
        if (f.sent || held.indexOf(f.id) >= 0) return true;
        gone += 1;
        (uploads[id] = uploads[id] || []).push({ name: f.name, size: f.size, state: 'refused', why: 'the app no longer holds it; pick it again' });
        return false;
      });
    });
    if (gone) persist();
  }
  function bytesHeld() {
    return Object.keys(data.files).concat(Object.keys(uploads)).reduce(function (sum, id) {
      return sum + (data.files[id] || []).concat(uploads[id] || []).reduce(function (s, f) { return s + (f.state === 'refused' ? 0 : f.size); }, 0);
    }, 0);
  }
  function refusal(q, file) {
    const id = q.getAttribute('data-q'), ext = (/\.([a-z0-9]+)$/i.exec(file.name) || [])[1];
    const kept = (data.files[id] || []).length + (uploads[id] || []).filter(function (f) { return f.state === 'sending'; }).length;
    if (!live) return 'open this page from the chat\'s link to send files';
    if (!ext || q.getAttribute('data-types').split(',').indexOf(ext.toLowerCase()) < 0) return 'this question does not take this type of file';
    if (file.size > 25 * MB) return 'too big: 25 MB at most';
    if (kept >= +q.getAttribute('data-count')) return 'this question takes ' + q.getAttribute('data-count') + ' at most';
    if (bytesHeld() + file.size > 100 * MB) return 'the files for this page pass 100 MB';
    return '';
  }
  function send(q, entry) {
    const id = q.getAttribute('data-q');
    entry.state = 'sending'; entry.why = ''; render();
    upload(entry.file, asker(id) + ', "' + q.getAttribute('data-label') + '"').then(function (a) {
      if (a.id) {
        uploads[id] = uploads[id].filter(function (f) { return f !== entry; });
        (data.files[id] = data.files[id] || []).push({ id: a.id, name: entry.file.name, size: entry.file.size, sent: false });
        persist();
      } else { entry.state = 'refused'; entry.why = String(a.error); entry.retry = true; render(); }
    });
  }
  function pick(q, list) {
    const id = q.getAttribute('data-q');
    Array.prototype.forEach.call(list, function (file) {
      const why = refusal(q, file), entry = { file: file, name: file.name, size: file.size, state: why ? 'refused' : 'sending', why: why };
      (uploads[id] = uploads[id] || []).push(entry);
      if (!why) send(q, entry);
    });
    render();
  }
  const sizeText = function (n) { return n < MB ? Math.max(1, Math.ceil(n / 1024)) + ' KB' : (n / MB).toFixed(1) + ' MB'; };
  function drawFiles() {
    all('.form [data-kind="file"]', function (q) {
      const id = q.getAttribute('data-q'), list = q.querySelector('.files');
      list.innerHTML = (data.files[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + ' <span class="tag">Sent</span><button type="button" class="btn-ghost" data-file="' + i + '">Remove</button></li>';
      }).concat((uploads[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + (f.state === 'sending' ? ' <span class="muted">Sending…</span>'
          : ' <span class="why">Refused: ' + esc(f.why) + '</span>' + (f.retry ? '<button type="button" class="btn-ghost" data-retry="' + i + '">Retry</button>' : '')
            + '<button type="button" class="btn-ghost" data-drop="' + i + '">Remove</button>') + '</li>';
      })).join('');
    });
  }
  all('.form [data-kind="file"]', function (q) {
    const drop = q.querySelector('.drop'), input = drop.querySelector('input');
    input.addEventListener('change', function () { pick(q, input.files); input.value = ''; });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); pick(q, e.dataTransfer.files); });
    q.querySelector('.files').addEventListener('click', function (e) {
      const b = e.target.closest('button'), id = q.getAttribute('data-q');
      if (!b) return;
      if (b.hasAttribute('data-file')) { data.files[id].splice(+b.getAttribute('data-file'), 1); persist(); return; }
      const entry = uploads[id][+(b.getAttribute('data-retry') || b.getAttribute('data-drop'))];
      if (b.hasAttribute('data-retry')) send(q, entry);
      else { uploads[id] = uploads[id].filter(function (f) { return f !== entry; }); render(); }
    });
  });

  // ── what the build needs: an item that needs you counts until each of its questions has an answer ──
  function needsOpen() {
    return Array.prototype.filter.call(document.querySelectorAll('.need[data-need="needs"]'), function (n) {
      const qs = n.querySelectorAll('[data-q]');
      return !qs.length || Array.prototype.some.call(qs, function (q) { return !answered(q); });
    });
  }
  function drawNeeds() {
    const gaps = needsOpen();
    all('.need[data-need="needs"]', function (n) {
      const done = gaps.indexOf(n) < 0, tag = n.querySelector('.tag-outline, .tag');
      tag.className = done ? 'tag' : 'tag-outline';
      tag.textContent = done ? 'Answered' : 'Needs you';
    });
    return gaps.length ? gaps.length + (gaps.length === 1 ? ' thing needs you' : ' things need you') : '';
  }

  // ── live cards: the chat's own page in a sealed frame, to try; it sends this page nothing ──
  // A frame loads once; a second load means its page went somewhere else, so it starts again from its own copy.
  const cards = [];
  function mount(c) {
    const f = document.createElement('iframe');
    let loads = 0;
    f.setAttribute('sandbox', 'allow-scripts'); f.title = c.title; f.setAttribute('srcdoc', c.doc);
    f.addEventListener('load', function () {
      loads += 1;
      if (loads === 1) return;
      c.resets += 1;
      c.said.hidden = false;
      c.said.textContent = 'This card tried to leave the page.' + (c.resets > 2 ? ' Reload the page to try it again.' : '');
      if (c.resets > 2) f.remove(); else mount(c);
    });
    c.box.replaceChildren(f);
    queue();
  }
  // The card's view sizes the frame; a live card never moves, since a moved frame loads again.
  all('.live[data-live]', function (box) {
    const old = box.querySelector('iframe'), said = document.createElement('p');
    said.className = 'muted live-said'; said.setAttribute('role', 'status'); said.hidden = true;
    const c = { box: box, doc: old.getAttribute('srcdoc'), title: old.title, said: said, resets: 0 };
    box.closest('.item').querySelector('.words').appendChild(said);
    cards.push(c);
    mount(c);
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      folds.forEach(measure);
    }
    queue();
    if (view) fitBig();
    if (open) place();
    bar();
  });
  window.addEventListener('load', queue);
  // ── hosted: in the live app's inbox, a sealed frame that reaches the inbox only through the port its first greeting carries ──
  let hosted = null, port = null;
  const CODES = { sent: 200, changed: 409, done: 409, gone: 409, soon: 429, closed: 410, expired: 410 };
  function post(message) { port.postMessage(message); }
  // The inbox answers a tap only once the chat has it, or once it is refused, cancelled or failed.
  function hostedAsk(path, body) {
    return new Promise(function (resolve) {
      hosted.reply = function (state) {
        const status = Object.prototype.hasOwnProperty.call(CODES, state) ? CODES[state] : 502;
        const answer = status === 200 ? { sent: true } : state === 'changed' || state === 'done' || state === 'gone' ? { [state]: true } : { sent: false };
        resolve({ ok: status === 200, status: status, json: function () { return Promise.resolve(answer); } });
      };
      const tap = { type: 'inbox:tap', action: path === 'send' ? 'send' : body.action, text: body.text || '' };
      if (body.files) tap.files = body.files;
      post(tap);
    });
  }
  // The inbox's switch owns the look: this frame can't remember a choice, so its own switch goes. Unknown looks change nothing.
  function look(theme) { if (theme === 'light' || theme === 'dark') document.documentElement.classList.toggle('dark', theme === 'dark'); }
  function heard(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'inbox:theme') look(m.theme);
    else if (m.type === 'inbox:notes' && (typeof m.value === 'string' || m.value === null)) {
      load(m.value);
      if (hosted.held) keepHeld(hosted.held);
      hosted.held = null; render();
    } else if (hosted.reply && m.type === 'inbox:result') {
      if (Array.isArray(m.files)) keepHeld(m.files);
      const reply = hosted.reply; hosted.reply = null; reply(m.state);
      // A tap that reached the chat closes the page in the inbox, so it reads as answered now, as its Archive shows it.
      if (m.state === 'sent') closePage();
    } else if (m.type === 'inbox:file-result' && waiting[m.ref]) {
      const done = waiting[m.ref];
      delete waiting[m.ref];
      done(typeof m.id === 'string' && /^[0-9a-f]{32}$/.test(m.id) ? { id: m.id } : { error: typeof m.error === 'string' ? m.error : 'it was not sent; try again' });
    }
  }
  // Back and the workspace sit first in the page, so they scroll away with its words; the inbox's own bar stays put.
  function backRow(workspace) {
    const row = document.createElement('div'), back = document.createElement('button');
    row.className = 'back'; back.type = 'button'; back.className = 'btn-ghost'; back.textContent = 'Back';
    back.addEventListener('click', function () { post({ type: 'inbox:back' }); });
    row.appendChild(back);
    if (typeof workspace === 'string' && workspace) {
      const where = document.createElement('span');
      where.className = 'muted'; where.textContent = workspace; row.appendChild(where);
    }
    document.querySelector('main > header').prepend(row);
  }
  // A closed or answered page in the inbox is read-only: no button, no note, no answer or file.
  function closePage() {
    readOnly = true; document.body.classList.add('read-only');
    all('.form input', function (el) { el.disabled = true; });
    render();
  }
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (hosted || window.parent === window || e.source !== window.parent || !e.ports || !e.ports[0] || !m || m.type !== 'inbox:hello'
      || typeof m.version !== 'string' || !Array.isArray(m.actions)) return;
    // The files the app still holds for this page, checked once its notes arrive.
    hosted = { reply: null, held: Array.isArray(m.files) ? m.files : null };
    port = e.ports[0];
    port.onmessage = function (ev) { heard(ev.data); };
    document.querySelectorAll('.theme-toggle').forEach(function (button) { button.remove(); });
    look(m.theme);
    // Notes live with the inbox page: this frame has no storage of its own.
    store = { setItem: function (key, value) { post({ type: 'inbox:notes-set', key: key, value: value }); } };
    post({ type: 'inbox:notes-get', key: KEY });
    backRow(m.workspace);
    if (m.readOnly === true) { closePage(); return; }
    setLive('inbox'); offer(m); render();
  });
  // In a frame, a link opens its own tab and a # link scrolls in place: the frame never leaves this page.
  // A srcdoc page resolves #why against the inbox's address, so following it would load the inbox here.
  document.addEventListener('click', function (e) {
    const a = window.parent !== window && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.charAt(0) !== '#') { a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
    e.preventDefault();
    if (href.charAt(1) === '/') { jump(href); return; }
    let el = null;
    try { el = document.getElementById(decodeURIComponent(href.slice(1))); } catch (err) { /* a bad escape names nothing */ }
    if (el) el.scrollIntoView({ block: 'start' });
  }, true);
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
