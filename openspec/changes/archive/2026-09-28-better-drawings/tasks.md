# Tasks

## 1. Drawing guide (skills)

- [x] 1.1 Write `.agents/skills/plan/references/drawings.md`: characters, width rule, the five patterns each with one example of 10 lines or fewer, the screen rule linking `wiki/ux-principles.md#the-review-file`, and *count before you close a box*; under about 80 lines
- [x] 1.2 `.agents/skills/plan/SKILL.md`: replace "about 40 columns wide for a phone" with the width rule and a link to the guide; keep the example
- [x] 1.3 `.agents/skills/explore/SKILL.md`: one sentence to draw in chat by the guide when a picture clarifies the flow, options, or costs; still writes nothing

## 2. Builder (script)

- [x] 2.1 `build-review.mjs`: add the right-edge box check in `drawing()`, warning once per box with item, line, and both columns
- [x] 2.2 `build-review.mjs`: change the width warning text to `keep drawings under 60: aim for 40, up to 56 side by side`
- [x] 2.3 `scripts/tests/review.test.mjs`: cover a crooked right edge, a short bottom edge, nested boxes, side-by-side boxes, a `┌──┴──┐` split with arrows below, a `+--+` box (no warning), and a 56-column line (no warning); update the two width-warning assertions

## 3. Docs and config

- [x] 3.1 `wiki/ux-principles.md`: *Context of use* and *The review file* give the 40/56 width; *The review file* adds before-and-after for a changed screen and links the guide
- [x] 3.2 `openspec/config.yaml`: the proposal drawing rule names the width and points to the guide; run `node scripts/check-openspec-config.mjs`
- [x] 3.3 `.agents/skills/wong-sync/references/payload-manifest.md`: the **plan** entry lists the drawing guide
- [x] 3.4 `CHANGELOG.md`: `## Next (minor) — Better drawings in plans and explore` entry
- [x] 3.5 Run `node scripts/check-payload-links.mjs` and `node scripts/check-retired-names.mjs`

## 4. Gate

- [x] 4.1 `/save`: CI passes, including the review tests
