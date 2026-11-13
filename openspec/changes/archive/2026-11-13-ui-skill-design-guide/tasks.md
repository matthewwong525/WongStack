# Tasks

## 1. The `ui` skill

- [x] 1.1 Write `.agents/skills/ui/SKILL.md` by design decision 1: frontmatter, the four sources in order, the fixed lookup command, the parts-win and no-answer lines, the lint finish. Done when the body is 150 words or fewer and the description 27 or fewer.
- [x] 1.2 Write `scripts/tests/ui-skill.test.mjs` (decision 8): an exact `modern-web-guidance@x.y.z`, the four sources in order, each link resolves, the word limit. Done when it passes, and fails on a copy with `@latest`.
- [x] 1.3 Add `ui` to `core.skillDirs` in `payload-files.json`; name the skill and the guide in `payload-manifest.md`'s categories. Done when `node scripts/check-payload-links.mjs` passes.
- [x] 1.4 Send screen work to the skill (decision 2): one clause in `.agents/rules/code.md`'s *Styles* bullet, and a link in the plan skill's screen line with an equal cut in the same file. Done when `node scripts/measure-context.mjs --check` passes.
- [x] 1.5 `update.mjs` in `update-dependencies` surveys and moves the fixed version in the skill; extend `update-dependencies.test.mjs` for the read and the rewrite. Done when the test passes.

## 2. The design guide

- [x] 2.1 Write `wiki/design-guide.md` by decision 3: the feel, colour, type, space, shape and depth, pictures, words, motion, set your brand, the check. Done when it is under 1,200 words, names no install, and `node .github/scripts/wiki-links.mjs` passes.
- [x] 2.2 Link it: `wiki/README.md`, setup's seed `wiki-README.md`, and the one sentence in `wiki/ux-principles.md`; add it to `ui.files` and to `.agents/rules/payload.md`'s paths. Done when the wiki link check and the payload link check pass.
- [x] 2.3 Add the `ui` area to `.agents/memory/areas.json` (decision 9). Done when `memory-areas.test.mjs` passes.

## 3. The starter look

- [x] 3.1 Edit `app/src/index.css` by decision 4: the brand values in `:root` and `.dark`, the `@theme inline` maps, the `h1` and `h2` sizes, and its opening comment. Done when no file under `app/src/components/ui/` and no screen file changed.
- [x] 3.2 Update `app/src/style.test.ts`: the font and block checks for the new values, the readable-colour check (decision 6), and the four-rules check (decision 7). Done when it passes, and the readable-colour check fails on a pale accent with white text and on an `hsl()` value.
- [x] 3.3 Turn on the four `shadcn/*` rules in `app/.oxlintrc.json` (decision 7). Done when `npm run lint` in `app/` passes with them on.
- [x] 3.4 `look.css` reads the app's font and shadows with today's values as fallbacks (decision 5); extend `scripts/tests/look.test.mjs` for a rebranded corner, font, and shadow, and for a repo with no app. Done when it passes.
- [x] 3.5 Say the brand list in `wiki/stack/mini-apps.md`'s shared-look section in one line, with a link to the design guide. Done when the wiki link check passes.

## 4. The release

- [x] 4.1 Add `## Next (minor) — One command for screen work, a design guide, and a friendlier starter look` to `CHANGELOG.md`, with the **Updating.** note of decision 10. Done when the entry sits above 61.5.0 and `VERSION` is unchanged.

## 5. Final checks

- [x] 5.1 Run `(cd app && npm test)`. Done when it passes with no check loosened.
- [x] 5.2 Run `node .github/scripts/checks.mjs --worktree`, then `openspec validate "ui-skill-design-guide" --strict --no-interactive`. Done when both pass.
- [x] 5.3 Run one real lookup with the skill's exact command: a `search`, then a `retrieve` of one result. Done when both answer.
- [x] 5.4 Confirm on the preview that Home and Hello show the violet primary button, round corners, and soft shadows, in light and in dark — verified via `/save`.

## 6. Review fixes

- [x] 6.1 The review kit's font rules read `--font` first; `look.test.mjs` builds a review page and a preview page from a rebranded checkout, and `review-browser.test.mjs` reads the drawn font. Done when both pass.
- [x] 6.2 `scripts/check-app-checks.mjs` holds one bad sample for each design rule, with the parts' settings and the stylesheet copied in. Done when `npm run test:checks` in `app/` catches 11 lint samples.
- [x] 6.3 The readable-colour check reads `#rgb` and an `oklch()` alpha of exactly 1, and its message names the forms that work; the design guide's brand step says the same. Done when `style.test.ts` passes.
