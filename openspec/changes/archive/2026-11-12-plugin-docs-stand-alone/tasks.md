## 1. Start point

- [x] 1.1 Bring in `main` with both other parts ("Build loop without memory", "Same shape for browser and daily") if published; list every relative link out of each module again (the design's table is from before them) and work from that list.

## 2. Loop

- [x] 2.1 Write `.agents/plugins/loop/references/rules.md` with the moved change-loop sections (design map), as rules, each heading's text kept; point every loop skill's link at it.
- [x] 2.2 Write `plan/references/review-page.md` and `plan/references/prototypes.md` with the moved review-page, prototype, and UX sections; repoint `/plan`, `drawings.md`, and `asking-the-user.md`.
- [x] 2.3 Inline the one-sentence rules (`/plan`'s script-not-AI rule, `asking-the-user.md`'s person-page line, `/close`'s placing rule); drop the why-only staging-walkthrough links in `/verify` and its walkthrough.
- [x] 2.4 Give every WongStack-only link in loop a full web address (design map), `worktree-secrets.mjs` and `agent-browser` included; any link to another module left after 1.1 too.

## 3. Memory and Daily

- [x] 3.1 Write `dream-memory/references/placing-facts.md`; inline keeping-it-tidy in `dream-memory/SKILL.md`; drop the why-only wiki-dream links.
- [x] 3.2 Add `## Who sees what` to memory's README; repoint `SKILL.md` and `writing-facts.md`; web addresses for document retrieval, learning from chats, and the company API.
- [x] 3.3 Add `## Your settings` to Daily's README; repoint `daily/SKILL.md`; drop the chief-of-staff link; web address for legacy cloud schedules; any link to loop left after 1.1 too.

## 4. WongStack wiki points down

- [x] 4.1 On each wiki page that lost text (`the-change-loop.md`, `review-pages.md`, `prototypes.md`, `ux-principles.md`, `wiki-dream.md`, `memory.md`, `daily.md`), keep every moved heading with one line linking the module's page, and keep the WongStack-only lines.
- [x] 4.2 Fix `AGENTS.md` and other wiki links whose context now reads wrong; add the rule to `wiki/maintaining/adding-a-module.md` under *What it may reach*, naming the new test.

## 5. Test

- [x] 5.1 In `scripts/tests/module-install.test.mjs`, add `<name>'s docs link nothing outside its own folder`: every relative or reference-style Markdown link in the module's source folders resolves inside them; web, mail, and `#` links pass; failures print `file → link`.

## 6. Release

- [x] 6.1 Raise the version of each changed module (loop, memory, Daily) in both `plugin.json` files or its `module.json`.
- [x] 6.2 Add `## Next (patch) — Each plugin's guide stands on its own` to `CHANGELOG.md`, with an **Updating.** note saying nothing needs doing.

## 7. Checks

- [x] 7.1 Run `node --test scripts/tests/module-install.test.mjs`; it passes, and fails when one wiki link is put back by hand.
- [x] 7.2 Run `node scripts/check-payload-links.mjs`, `node scripts/measure-context.mjs --check`, `node .github/scripts/wiki-links.mjs`, and `openspec validate plugin-docs-stand-alone --strict --no-interactive`; fix what fails, offsetting any size overrun by cuts (design risks).
- [x] 7.3 Run `node .github/scripts/checks.mjs --worktree` after `main` comes in; /ship's prepare runs it there, since before the merge only browser's version check failed, from `main` moving ahead.

## 8. Review fixes

- [x] 8.1 Move the morning start, the add-on contract, and *Your own jobs* (`events`, `sweeps`, `deny`, briefs), with the `runs` and `sweeps` settings, into Daily's README; the wiki's headings keep one line pointing down.
- [x] 8.2 Put back in `prototypes.md`: *Before* stays from the first round, and the picture test and its pictures go before `finish`, so the diff holds only the screen's edits.
- [x] 8.3 Put back the `### Review` and `### Components` rules in `drawings.md`'s `## UX` shape.
- [x] 8.4 Link memory's setup guide to `../README.md#who-sees-what`.
- [x] 8.5 Give `/plan`'s *after an OK* its full web address to `/schedule`.
- [x] 8.6 Offset the added skill words with cuts in this change's own lines; rerun the checks of 7.1 and 7.2.
