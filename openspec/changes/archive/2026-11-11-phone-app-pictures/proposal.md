# A plan for a phone app shows the real app, not a sketch

**Status:** ready-to-ship
**Branch:** decent-wolverine
**Open questions:** none

## Why

A plan that changes a screen shows real pictures of the app, made from a throwaway copy that runs on the preview or on this computer. That only works for a web app. For a phone app or a desktop app, every step fails, so the plan falls back to a gray sketch, and it skips the picture of today's screen too, though that screen exists. In Relay Everything on 2026-11-11, a screen test drew the real phone app on this computer in about 2 seconds a picture, with no phone. Every repo with such an app should do the same.

## What Changes

- **A phone or desktop app gets real pictures in its plan.** The plan draws the app with the app's own screen test, in the throwaway copy, with sample data: *Before* from the copy as it is today, *After* from the same copy with the plan's edits. Pictures from Relay Everything's phone app, drawn this way:
  ```picture
  A note today: pictures/phone-note.png
  Dragging the cursor, changed: pictures/phone-drag.png
  ```
  Before this, the same plan showed only a sketch:
  ```screen Sketch, before this change
  <div class="card col gap phone">
    <div class="row gap"><span class="muted">‹ Notes</span><span class="grow"/><button class="btn-primary">Done</button></div>
    <h3>Shopping</h3>
    <div class="bar"></div>
    <div class="bar"></div>
  </div>
  ```
- **Each repo writes down its own way once.** The first plan that needs pictures of such an app finds how to draw them, then writes the steps on the repo's own page for that app, so the next plan only follows them. Until then, the plan works it out and does not give up at the first failed step.
  ```mermaid
  flowchart TD
    A[A plan changes a screen] --> B{Can the preview<br/>or this computer<br/>show the app?}
    B -- Yes, a web app --> C[Take pictures<br/>in the browser]
    B -- No, a phone or<br/>desktop app --> D[Draw it with the<br/>app's screen test]
    D --> E{A part only the<br/>phone draws?}
    E -- No --> F[Real Before<br/>and After]
    E -- Yes --> G[A sketch of that part,<br/>with one line why]
  ```
- **A sketch stays only for what no test can draw**, such as the phone's own menus, keyboard, share sheet, or permission questions. The plan still shows the real *Before*, and one line names the part only the phone draws. The page's warning about a sketch now names the screen test too.

## What the build needs

- **Nothing.**

Non-goals: no new command that runs a repo's screen test; no change to how web apps get their pictures; no device or simulator runs while planning.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `review-pages`: a screen the preview can't serve is drawn with the app's own screen test in the prototype copy; a sketch stands in only for a part no test can draw.

## Impact

- New `wiki/prototypes.md` owns how a prototype's pictures are made (moved out of `wiki/review-pages.md#the-prototype`, which keeps its heading and a short summary, since it is 2960 of its 3000 words); `wiki/README.md` lists it; `payload-files.json` ships it.
- `.agents/skills/plan/SKILL.md` and `.agents/skills/plan/references/drawings.md` link the new route; `wiki/ux-principles.md` (the review file) follows.
- `.agents/skills/plan/scripts/build-review.mjs` warning text, and its test in `scripts/tests/review-pictures.test.mjs`.
- `CHANGELOG.md` minor entry.

## Decision log

- **2026-11-11** — Asked whether a phone or desktop app gets a new picture command or only written steps → chose written steps only, because the screen test is different for every plan, so a command would save only one run and a copy.
- **2026-11-11** — Assumed: a repo names its screen-test route on its own wiki page for that app, linked from a path rule for the app's folder, as Relay Everything does with `wiki/development/phone-pictures.md` and `.agents/rules/mobile.md`, because a WongStack page can't know each repo's test kit.
- **2026-11-11** — Assumed: the first plan that needs the route writes that page, because it is repeatable knowledge by [the wiki rules](../../../wiki/wiki-style.md#repeatable-knowledge).
- **2026-11-11** — Assumed: the prototype's steps move to a new page `wiki/prototypes.md`, and `review-pages.md` keeps a short `## The prototype` section, because that page is at 2960 of its 3000 words and other repos link that heading.
- **2026-11-11** — Assumed: `prototype.mjs start` stays as it is, because it already makes a plain git copy for any app; only `upload` and `serve` are web-only.
- **2026-11-11** — Assumed: the example pictures come from Relay Everything's plan "Paste in a note feels like the iPhone's own", because they are real screen-test output with sample data and no private data.
- **2026-11-11** — Assumed: a screen test uses the app's own screen size and width (an iPhone's, or a desktop window's), not always a phone's, because the route covers desktop apps too; the second look found it.
- **2026-11-11** — Assumed: the copy loses the pictures a screen test saved, as well as the test, before `finish`, because `finish` keeps every new file in the diff the build reads.
- **2026-11-11** — Assumed: archive checkpoint on branch decent-wolverine as release 51.11.0.
