# Tasks

The copy and each decision's number are in design.md - Decisions. Write every sentence in the wiki's voice (`wiki/voice.md`).

## 1. Landing page

- [x] 1.1 `site/src/install.ts`: give each `AGENTS` entry a `logo` (`claude`, `openai`). Update `install.test.ts` to assert each entry names a logo file that exists under `site/public/logos/`.
- [x] 1.2 Restore `site/src/Rotator.tsx` from `git show 00383322^:site/src/Rotator.tsx`, rewritten by Decisions 1 and 2: the names from `AGENTS` with their logos, then "for people who don't code.", the hidden sentence built from the same list. Restore the `.rotator*` rules in `site/src/index.css` for two names, with no `@font-face` and the reduced-motion stop. Use it as the hero's `h1` in `Landing.tsx`. In `App.test.tsx`, replace the headline test: the `h1`'s hidden sentence reads "Claude Code or Codex, for people who don't code.", and every name in it is in `AGENTS`.
- [x] 1.3 `Landing.tsx`: set the headline's fixed line and `DESCRIPTION` by Decision 4. Update the constants and assertions in `App.test.tsx` and the heading `Site.test.tsx` finds.
- [x] 1.4 Add `WorksWith` by Decision 3 and render it where `<Compare />` was. Delete `Compare.tsx`, `compare.ts`, their styles, and the four logos nothing loads. In `App.test.tsx`, replace the comparison tests with one that reads the section: a card per `AGENTS` entry, the "Another assistant" card with its limit, the switch line, and the install button. Verify `git grep -n -i "compare\|muse\|grok bot\|openclaw\|lovable" site/src site/index.html` returns nothing.
- [x] 1.5 `Site.test.tsx`: add a test that reads every page's text and fails on a product name from the removed table (Grok Bot, Muse, OpenClaw, Lovable), and keep the no-file assertion on the styles passing.
- [x] 1.6 `site/index.html`: the description, `og:description`, `twitter:description`, and `og:image:alt` take Decision 4's line. `site/brand/share-image.svg`: the headline lines change; re-render `site/public/share.png` by the SVG's opening comment. Update `shareCard.test.ts`. Verify the PNG is 1200×630 and under 300 KB.

## 2. README

- [x] 2.1 Rewrite the opening of `README.md` by Decision 5, leaving the four bullets, the line about Matthew and Claymoo, and everything from *Start in three steps* down untouched. Verify `git diff README.md` changes only the lines above the first bullet, and no developer term appears.

## 3. Guide and release

- [x] 3.1 `wiki/maintaining/landing-page.md`: reword the fourth install rule, drop the comparison-table bullet, and add the no-comparison sentence, by Decision 6. Verify each link in the edited lines resolves.
- [x] 3.2 Add `## Next (patch) — <Title>` at the top of `CHANGELOG.md`'s entries, in plain words: the landing page guide's rule on what the headline may name. **Updating.** Nothing needs doing by hand. Leave `VERSION` alone.

## 4. Verification

- [x] 4.1 Run `openspec validate "pitch-the-tools-set-up" --strict --no-interactive` and expect it valid.
- [x] 4.2 Run `node .github/scripts/checks.mjs --worktree` and repair what fails.
- [x] 4.3 In `site/`, run `npm run lint`, `npm test`, and `npm run build`; expect all to pass.
- [ ] 4.4 After `/save`, open the landing page's own preview (the `landing-preview` status on the commit) at 320 px, phone, and desktop width: the name slides between Claude Code and Codex without the headline jumping or scrolling sideways, reduced motion shows Claude Code still, and the works-with section reads cleanly. Open the README as GitHub renders it on the branch and read the first screen.
