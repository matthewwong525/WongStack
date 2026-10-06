# Tasks

The table of what is true, and every sentence to print, are in design.md. Write every sentence in the wiki's voice (`wiki/voice.md`). Change nothing under `.agents/skills/wong-setup/` or in `wiki/stack/artifacts-route.md`.

Run no test before section 6: each *verify … passes* or *fails* in sections 2 to 4 is checked there, after every source and test file is written.

## 1. Base

- [x] 1.1 Confirm the branch holds 37.2.1 (pull request #326): `git merge-base --is-ancestor 00383322 HEAD`. If it does not, stop and bring `main` in through `/save`'s own step before editing; never edit the three pages on the older text. Verify `README.md` step 1 reads **Open your assistant.**
- [x] 1.2 Confirm both spec deltas still match `main`: each `MODIFIED` requirement's unchanged sentences equal `openspec/specs/landing-site/spec.md` and `openspec/specs/install-onboarding/spec.md`. Verify by reading the two side by side.

## 2. Landing page

- [x] 2.1 `site/src/install.ts`: add `PAID_COST`, `WAYS`, `ASKS_FIRST`, and `COST_LINES` by design.md - Decision 1, each `line` built from its entry's data. Extend `site/src/install.test.ts`: each way's `line` names its accounts and cost, the free way lists three computers and the paid way two, and `COST_LINES` holds the paid line and `ASKS_FIRST`. Verify the test passes.
- [x] 2.2 `site/src/Landing.tsx`: the note under the steps and the two answers by design.md - Decision 2, printing the strings from `install.ts`. Update the note test in `Landing.test.tsx` and the two answers in `App.test.tsx` to the new text. Verify both pass.
- [x] 2.3 `site/src/Site.test.tsx`: allow exactly `COST_LINES` by design.md - Decision 3, with the three assertions. Verify it passes, then verify it fails when a line such as "Our paid plan is $9 a month" is added to a page by hand, and remove that line.

## 3. README and getting started

- [x] 3.1 `README.md`: *Requirements* and the *What you get* bullet by design.md - Decision 4. Verify `git diff README.md` shows no change inside the fenced message or in step 3.
- [x] 3.2 `wiki/stack/getting-started.md`: the first sentence, the single `## What it costs` section with its table, and the hand-done list by design.md - Decision 5. Verify the page states the cost in one place only (`grep -c '\$5' wiki/stack/getting-started.md` counts lines in that section alone), the heading text is unchanged, and the sentence under the list counts the steps correctly.
- [x] 3.3 Search for any other page that states the accounts or the cost of an install: `git grep -n -i -E "free github|free tier|github and cloudflare accounts" -- README.md wiki SECURITY.md .github/CONTRIBUTING.md`. Fix a sentence that contradicts design.md's table by linking `wiki/stack/artifacts-route.md#what-it-costs`; leave the rest. Verify by reading each hit.

## 4. The guard

- [x] 4.1 Add `scripts/tests/install-cost.test.mjs` by design.md - Decision 6: the three checks on each page, a failure that names the page and `site/src/install.ts`, and the refusal test. Verify `node --test scripts/tests/install-cost.test.mjs` passes, and fails naming `wiki/stack/getting-started.md` when its cost figure is edited by hand; restore the page.
- [x] 4.2 Add the `install-cost` step to `STEPS` in `scripts/payload-checks.mjs` and to `.github/workflows/payload.yml` under `docs_only == 'true'`. Verify `node --test scripts/tests/payload-checks.test.mjs` passes, and that `.agents/skills/wong-sync/references/payload-files.json` does not name the new test.
- [x] 4.3 `wiki/maintaining/landing-page.md`: restate *No hosting offer* and add the same-change rule with the guard, by design.md - Decision 7. Verify it links `site/src/install.ts`, `site/src/Site.test.tsx`, and the new test.

## 5. Release

- [x] 5.1 Add `## Next (patch) — <Title>` at the top of `CHANGELOG.md`'s entries, in plain words: the README, the getting-started guide, and the landing page now say the same thing about what an install costs. **Updating.** Nothing needs doing by hand. Leave `VERSION` alone.

## 6. Verification

- [x] 6.0 Run the test checks sections 2 to 4 name: the site tests of 2.1 to 2.3 with 2.3's planted line, the guard of 4.1 with its edited figure, and `payload-checks.test.mjs` of 4.2. Restore every planted edit.
- [x] 6.1 Run `openspec validate "say-what-install-costs" --strict --no-interactive` and expect it valid.
- [x] 6.2 Run `node .github/scripts/checks.mjs --worktree` and repair what fails: it covers the payload links, the wiki checks, the script tests, and the new guard.
- [x] 6.3 In `site/`, run `npm test` and `npm run build`; expect both to pass.
- [ ] 6.4 After `/save`, open the landing page's own preview (the `landing-preview` status on the commit) at phone width and at desktop width: the two ways and their cost sit under the install steps without sideways scrolling, and *Is WongStack free?* names both ways.
