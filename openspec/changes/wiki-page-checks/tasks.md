# Tasks

## 1. The check

- [x] 1.1 Move `slug` and `anchorsOf` from `scripts/check-payload-links.mjs` into `.agents/skills/memory/scripts/lib/links.mjs` as `headingAnchors(root, file)`, import it back, and verify `scripts/tests/payload-links.test.mjs` still passes unchanged.
- [x] 1.2 Give `linksIn` an `anchor` field and read pure `#section` links against their own page; make `checkWiki` report `<file>:<line>: links to <written>, but <target> has no heading #<anchor>`; verify with a new test in `scripts/tests/wiki-links.test.mjs` for a renamed heading, a same-page anchor, a folder link's README, a repeated heading's `-1`, and a heading inside a code block that does not count. Fix the existing fixture's `SKILL.md#run` link so the passing test stays green.
- [x] 1.3 Add the size cap (`WIKI_PAGE_WORDS = 3000`, words counted as in `scripts/measure-context.mjs`) and the title-and-first-paragraph check to `checkWiki`, with the failure lines in design.md; verify with tests for a page at 3,001 words failing and 3,000 passing, no title, two titles, a title in a code block not counting, and a list or heading straight after the title.
- [x] 1.4 Update `.github/scripts/wiki-links.mjs`'s header comment, report heading (*Wiki checks*), and pass line (`Wiki: N pages, all linked, each under 3,000 words.`); update the *Check the wiki's links* step comment and summary line in `.github/workflows/test.yml`; verify the script test asserts the new pass line and a failing run exits 1.

## 2. Split the long pages

- [x] 2.1 Move *Twin every stateful binding* and *One declared list of secrets, two Workers* from `wiki/stack/d1-pipeline.md` to a new `wiki/stack/staging-bindings.md`, and *CI is GitHub Actions* to a new `wiki/stack/github-actions.md`, each moved `##` heading left on the old page with one sentence and a link; link both from `wiki/stack/README.md`; verify `node .github/scripts/wiki-links.mjs` passes and `wc -w` shows each page under 3,000.
- [x] 2.2 Move *When a site blocks the agent's browser* from `wiki/development/browsing.md` to a new `wiki/development/blocked-sites.md`, and *Save your passwords* to a new `wiki/development/passwords.md`, the same way; link both from `wiki/development/README.md`; verify as in 2.1.
- [x] 2.3 Move *The memory key* (with *Joining through GitHub* and *Add or remove a teammate*) from `wiki/development/memory.md` to a new `wiki/development/memory-key.md`, the same way; link it from `wiki/development/README.md`; verify as in 2.1.
- [x] 2.4 Repoint every link in the repo (archives aside) to a moved subheading, found with `memory.mjs areas` on each old page; verify `node scripts/check-payload-links.mjs` and `node .github/scripts/wiki-links.mjs` both pass.
- [x] 2.5 List the three new `wiki/development/` pages in `.agents/skills/wong-sync/references/payload-files.json`, add each new page to its area's `docs` in `.agents/skills/memory/references/areas.json`, and verify `scripts/tests/memory-areas.test.mjs` and `scripts/tests/payload-rule-paths.test.mjs` pass.

## 3. Run each check only for its kind of change

- [x] 3.1 Add `wiki_affected=true|false` to `.github/scripts/app-untouched.sh` (header comment, `--worktree` too) by design.md, expose it from `.github/actions/change-scope/action.yml`, and verify new cases in `scripts/tests/app-untouched.test.mjs`: code-only false, a wiki page true, a `.md` outside `wiki/` true, a removed or moved code file true, no base true, an empty diff true; update the test asserting the output keys.
- [x] 3.2 Gate `test.yml`'s *Check the wiki's links* step on `steps.scope.outputs.wiki_affected != 'false'`, update its comment and the summary line (say when the wiki check skipped), and update *The gate* in `wiki/development/the-change-loop.md` with one sentence on the skip; verify `node .github/scripts/loosened-checks.mjs --worktree` and `node .github/scripts/wiki-links.mjs` pass, adding a `Check:` bullet to the Decision log if the loosened-checks script asks for a reason.
- [x] 3.3 Mention the skip in the `CHANGELOG.md` entry from 4.2 in one plain line; verify `node scripts/check-payload-links.mjs` passes.

## 4. The rule and the release

- [x] 4.1 Add "a page stays under 3,000 words; split a longer one by its sections" to *No orphans, no dead-ends, full hub-coverage* in `wiki/wiki-style.md`, cutting as many words elsewhere on the page; verify `node scripts/measure-context.mjs --check` passes with no new baseline.
- [x] 4.2 Write a `## Next (minor) — Wiki pages stay short, titled, and their section links work` entry at the top of `CHANGELOG.md`, in plain words, whose **Updating.** note asks the install to split any of its own wiki pages over 3,000 words and names the five moved sections; verify `node scripts/check-payload-links.mjs` passes.
- [ ] 4.3 Run `/save` and verify CI's payload checks and the Test workflow's wiki step pass on the branch.
