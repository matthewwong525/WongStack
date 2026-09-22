## 1. Plan skill

- [x] 1.1 Rewrite the "Build the review page" section of `.claude/skills/plan/SKILL.md`: launch one design subagent in the background right after the proposal draft, draft design and tasks while it runs, place anchors and run the builder when its map returns, run the structural checker once in a browser or report it unverified, remove the critic subagent and the revision round, and state that a plan update re-runs the author only when an anchored bullet or its visual changes (review.html#/pipeline/after/critic).
- [x] 1.2 Update the coverage rule in the same section and in `.claude/skills/plan/references/review-author.md`: one visual per change by default, each screen drawn when a change adds or restructures screens, a stated reason for any further visual, text for every other bullet. Replace the guide's closing sentence about the critic and revision round with the single structural check.

## 2. Planning rules and wiki

- [x] 2.1 Reword the design rule in `openspec/config.yaml` to the same coverage default and drop the per-bullet phrasing; run `node scripts/check-openspec-config.mjs` after the edit.
- [x] 2.2 Update `wiki/ux-principles.md` ("What an author does" and the UI-less line) to state the one-visual default and that the reviewer's annotations are the page's review.

## 3. Release

- [x] 3.1 Bump `VERSION` to 16.5.0 and add a newest-first `CHANGELOG.md` entry describing the removed critic pass, the background author, and the coverage default.
- [x] 3.2 Run `node scripts/check-payload-links.mjs` and `node scripts/measure-context.mjs --check`; confirm the plan skill and author guide totals fall and no route reports an unexplained increase.
- [x] 3.3 Validate with `openspec validate simplify-review-pipeline --strict --no-interactive` and complete the CI gate through `/save`.
