# Design

## Context

[`wiki/review-pages.md#the-prototype`](../../../wiki/review-pages.md#the-prototype) owns how a plan gets real screen pictures. Its route is web-only: `prototype.mjs upload` runs `scripts/cf-preview.sh`, and `serve` runs `npm run dev` in `app/`. Its last line says *only when every way fails, keep the `screen` sketch*. A Flutter, native, or desktop app fails `upload` and `serve`, so `/plan` keeps the sketch and also skips *Before*.

`prototype.mjs start` is already generic: it is `git worktree add --detach` at `HEAD`, plus a `node_modules` link only when `app/node_modules` exists. `finish` writes the copy's diff for `/apply`'s build helper and is generic too.

Proof (Relay Everything, 2026-11-11, `wiki/development/phone-pictures.md` on its branch `grumpy-rabbit`, local change `native-paste-menu`): a Flutter widget test in the copy pumps the real app with a fake data source and sample data, loads the app's real fonts with `FontLoader`, sets an iPhone size and platform, hides the debug banner, and saves each state with `matchesGoldenFile` and `--update-goldens`. About 2 s a picture on Linux. It can't draw OS-drawn UI (system text menu, share sheet, keyboard, permission prompts) or Flutter text with no font family.

Limits: `wiki/review-pages.md` is 2960 of the 3000 words CI allows a page. The skills' instruction total has 17 words of headroom against its baseline (`measure-context.mjs --check`), so skill edits must be word-neutral.

## Goals / Non-Goals

**Goals:**

- A plan for an app the preview can't serve shows real *Before* and *After* pictures from the app's own screen test, in the same throwaway copy.
- The route is generic: WongStack says *what* and the shared rules (fonts, size, sample data, what can't be drawn); each repo's own page says *how* for its test kit.
- The sketch stays only for a part no test can draw, named in the `No real picture:` line.

**Non-Goals:**

- A `prototype.mjs pictures` command or a stack-pack hook (asked: written steps only).
- Any change to the web route, `upload`, or `serve`.
- Simulator or device runs while planning.

## Decisions

### A new page owns the prototype's how

Move the body of `## The prototype` from `wiki/review-pages.md` to a new `wiki/prototypes.md`. `review-pages.md` keeps the heading `## The prototype` with two or three sentences and a link, so the anchor other repos link (Relay Everything's pages, `ux-principles.md`, `plan/SKILL.md`) still lands, and the page drops to about 2600 words. The new page sits beside `review-pages.md` at the wiki root, because it is a sibling topic of the review standard, not a development process step.

Alternative: extend `review-pages.md` in place. Rejected: it would pass 3000 words and fail CI.

`wiki/prototypes.md` outline:

1. `# Prototypes`, first sentence: what a prototype is and that it gives a plan its real pictures. Up link to [review pages](../../../wiki/review-pages.md#the-prototype).
2. `## Make the copy`: `prototype.mjs start`, the sample-data rule, no migrations.
3. `## A web app`: the current `upload` / `serve` / `browse.mjs screenshot` steps, unchanged.
4. `## An app the preview can't serve`: phone, desktop, or any app the browser can't open.
   - Draw *Before* in the copy before you edit it, and *After* after, with the app's own screen test (a Flutter widget test with a saved picture; an iOS or Android UI test screenshot; a desktop app's window capture).
   - The shared rules: run the real app with a fake data source and sample data; load the app's real fonts, because a test font can draw letters and icons as blocks; set a real phone size and platform; hide debug marks; one PNG per state at phone width; copy to `<change>/pictures/`.
   - Remove the picture test from the copy before `finish`, so the diff the build reads holds only the screen's edits.
   - Later rounds: *Before* stays from the first round; `start` brings back the earlier edits.
   - The repo's own steps: follow the page the repo names for that app, linked from a `.agents/rules/<app>.md` whose `paths:` match the app's folder. None yet → work it out, and once a picture is right, write that page and rule ([repeatable knowledge](../../../wiki/wiki-style.md#repeatable-knowledge)). Example: Relay Everything's `wiki/development/phone-pictures.md`, by its GitHub URL on `main`.
5. `## What no test can draw`: the phone's or computer's own parts (text menu, share sheet, keyboard, permission questions, file picker). Show the real *Before*, sketch only that part, and add `No real picture: <the part>, which only the phone draws`. The build's device check, where the repo has one, gives the *Built* picture.
6. `## Notes and the build`: notes update the copy and the pictures; `finish`; after the build the same route draws *Built* for `preview-review.mjs --approved`.
7. `## When every way fails`: the sketch and `No real picture: <the step that failed>`, as today.

### Skill and reference text, word-neutral

- `plan/SKILL.md` *Draw in the proposal*: the `a prototype` link points to `wiki/prototypes.md`; rephrase so a phone app's route is named with no net words, such as `a screen change gets [a prototype](…prototypes.md) with sample data, by browser or [screen test](…prototypes.md#an-app-the-preview-cant-serve)`, offset by a cut in the same paragraph.
- `drawings.md`: `No prototype: add …` → `Only for a part no prototype draws: add …`, same length.
- `build-review.mjs` warning: `run the prototype with sample data` → `draw it from the prototype or the app's screen test, with sample data`; the test in `scripts/tests/review-pictures.test.mjs` follows.
- `wiki/ux-principles.md` (the review file): the two bullets on *After* and *Before* link `prototypes.md` and name the screen test for an app the browser can't open.

### Links and shipping

`wiki/prototypes.md` joins `payload-files.json` beside `wiki/review-pages.md` and the `wiki/README.md` list. Every link that means *how* (`review-pages.md#the-prototype` in `plan/SKILL.md` and `ux-principles.md`) moves to the new page; the review-pages heading stays for installed repos. `check-payload-links.mjs` checks both.

## Risks / Trade-offs

- [An agent still gives up at the first failed step in a repo with no page] → the new page says to work the route out, and the builder's warning names the screen test.
- [A screen test with the test font draws blocks, and a plan shows them as real] → the page names the font rule first; the `No real picture:` line covers the parts a loaded font can't fix.
- [Relay Everything's page link moves when its branch ships] → link it on `main` by GitHub URL; until it ships, the example names the repo and page, with no link.
- [An installed repo has its own text under `## The prototype`] → `/wong-sync` merges the shortened section through its plan, like any payload page.
