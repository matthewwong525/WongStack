## 1. The rule's home

- [x] 1.1 Add `### Fix it or ask` to `wiki/development/the-change-loop.md` under *The steps*: the one test, the fixed-for-you list, the five brought-to-you reasons, and "one plain question with a recommendation"; mention the reviewer in the `/apply` step bullet.
- [x] 1.2 Link the rule from `.agents/skills/verify/references/walkthrough.md` § e and `.agents/skills/save/references/git-gate.md`'s auto-fix loop, shortening their own scope prose rather than restating it.

## 2. The reviewer

- [x] 2.1 Write `.agents/skills/apply/references/review-helper.md`: read-only brief, what to read, what counts as a finding, each finding's `fix`/`ask` class and reason, and a report ending in a `review:` line (`none` or a count).
- [x] 2.2 In `.agents/skills/apply/SKILL.md`, after *all done* and before *Finish with a preview* (and before returning to `/ship`): start the reviewer, route findings by the rule, send `fix` findings to a new build helper, cap at two rounds, ask the rest; add review results to the step 5 report. Offset the added words with cuts elsewhere in the file.
- [x] 2.3 Teach `.agents/skills/apply/scripts/helper-stop-check.mjs` the review brief and its `review:` report line; add cases to `scripts/tests/helper-stop-check.test.mjs` (reviewer stopped without its line → sent back once; with it → passes; builder behavior unchanged).

## 3. Release

- [x] 3.1 Add a `## Next (minor) — A second look before the preview` entry to `CHANGELOG.md`, in plain words.
- [x] 3.2 Run `node .github/scripts/checks.mjs --worktree`, including `node scripts/measure-context.mjs --check` and `node scripts/check-payload-links.mjs`; trim until the context check passes.
