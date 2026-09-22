## 1. The review kit

- [x] 1.1 Add `overflow-wrap:anywhere` to the `.panel code` rule in `.claude/skills/plan/references/review-kit.html`, changing nothing else in the kit (per `review.html#/wrapping`).
- [x] 1.2 Rebuild this change's own `review.html` from the fixed kit and measure `ol.changes` in a browser at 1440×1000: `scrollWidth` must equal `clientWidth`, and the long path in the Why prose must wrap rather than clip.
- [x] 1.3 Check the same page at 390×844 for horizontal overflow, and confirm ordinary prose and short identifiers are unbroken.

## 2. Release

- [x] 2.1 Bump `VERSION` (patch) and add a newest-first `CHANGELOG.md` entry.
- [x] 2.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`; fix what they report.
- [x] 2.3 Validate with `openspec validate "fix-review-panel-wrapping" --strict --no-interactive`.
- [ ] 2.4 Confirm CI is green through `/save` — nothing builds locally, so the checkpoint is the means of completion.
