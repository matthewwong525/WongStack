# Tasks

## 1. The attachment files and the skill

- [x] 1.1 Copy `.agents/skills/paste-this-into-your-ai/` from `/root/WongOS/.agents/skills/paste-this-into-your-ai/` (SKILL.md and `references/memory-example.md`); set `disable-model-invocation: true`; read this repo instead of the latest-source cache; add the `attachment <slug>` output that writes `site/attachments/<slug>.md` by `wiki/maintaining/attachments.md` and sets `checked:`.
- [x] 1.2 Add `wiki/maintaining/attachments.md`: what an attachment is, the file's shape, the opener, the bullet rules (from the skill's generic-words table), the last bullet, how to write one with the skill, and what the check fails on and how to fix it. Link it from `wiki/maintaining/README.md` and `wiki/maintaining/landing-page.md`.
- [x] 1.3 Add `site/attachments/parse.mjs`: parse the frontmatter (strings, `order` number, `sources` list) and body; one function for the site and the check.
- [x] 1.4 Write the seven attachments with the skill, one per row of the design's slug table: read each source in full, generic words, about 15 to 30 bullets, last bullet linking the repository and the area's main page.

## 2. The page

- [x] 2.1 Add `site/src/Attachments.tsx`: a short intro, then one `section` per attachment sorted by `order`, with `id`, linked title, problem, fix and `CopyMessage`; load files with `import.meta.glob` at build time.
- [x] 2.2 Route `/attachments` in `site/src/App.tsx`; add the *Attachments* link to `site/src/SiteHeader.tsx`; styles in `site/src/index.css`, phone first.
- [x] 2.3 Add site tests: the route renders all seven cards in order; each card has its anchor and a copy button holding its full text; every body ends with the repository link; the header links the page. Keep `Site.test.tsx`'s page-wide rules passing on the new page.

## 3. The check

- [x] 3.1 Add `scripts/check-attachments.mjs` (`isMain`/`parseCli` from the shared CLI helper): changed files from the merge base with `origin/main`, plus the working tree with `--worktree`; fail on a changed source with an unchanged attachment, a missing source, a missing field, a body line without `> `, or no repository link in the last bullet; each failure names the file and the fix.
- [x] 3.2 Add the `attachments` step to `STEPS` in `scripts/payload-checks.mjs` and to `.github/workflows/payload.yml`, `when: 'always'`.
- [x] 3.3 Add `scripts/tests/check-attachments.test.mjs`: each failure case, both-changed passes, default branch checks shape only; add the script to `scripts/tests/cli-conventions.test.mjs` if that test requires it.

## 4. Verification

- [x] 4.1 Run `node .github/scripts/checks.mjs --worktree` and the site's lint, type check, tests and build.
- [x] 4.2 Run the check with a scratch edit to `wiki/development/memory.md` alone and confirm it fails naming `site/attachments/memory.md`; undo the edit.
- [x] 4.3 `/save`, then open the landing preview's `/attachments` on a phone-width browser: seven cards, a card link opens at its card, Copy puts the full text on the clipboard.
