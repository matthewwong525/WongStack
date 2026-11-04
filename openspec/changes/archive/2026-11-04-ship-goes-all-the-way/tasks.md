# Tasks

## 1. The rule (wiki and skills)

- [x] 1.1 `wiki/development/the-change-loop.md` *Fix it or ask*: add the *Inside `/ship`* paragraph (design 1): which rules take the recommendation, the hard stops, the `Assumed` line and *Choices I made*; keep the page under 3,000 words.
- [x] 1.2 `.agents/skills/explore/references/asking-the-user.md` line 40: also take the recommendation inside `/ship` for a pick the change loop marks safe, linking it.
- [x] 1.3 `.agents/skills/apply/SKILL.md` (*A question*, the review routing) and `references/build-helper.md`: inside `/ship`, a safe pick is taken and logged, not asked; link the change-loop paragraph.
- [x] 1.4 `.agents/skills/save/references/git-gate.md`: inside `/ship`, a failure outside the change gets one fix that keeps the check as strong (design 7).
- [x] 1.5 `.agents/skills/verify/references/walkthrough.md`: inside `/ship`, an ambiguous reading takes the safe recommended reading and returns it as a choice made.
- [x] 1.6 `.agents/skills/ship/SKILL.md`: Step 2 uses `--move-others`; Step 4 fixes a walk `FAILURE` once before asking (design 6); Step 6 adds *Choices I made*; cut restated text to stay in the size budget.
- [x] 1.7 Step 4's fix round hands `/apply` the `ARCHIVE` path; `/apply` (*Resolve the plan first*) and the build brief fix an archived change in place, with no `/plan`; `/save` and `/verify` say once, plus one more after the fix, here and on the change-loop page.

## 2. Ship script and tests

- [x] 2.1 `ship.mjs prepare`: count other changes only from the branch (`checkpointEvidence(...).active`); change the `OTHER_CHANGES` `NEXT:` line to name `--move-others`.
- [x] 2.2 `ship.mjs prepare --move-others`: per design 5, a temporary worktree from `origin/<default>`, one branch per moved change, push, then one commit removing the folders; print `MOVED=`; a failed push stops before any removal.
- [x] 2.3 `scripts/tests/ship-commands.test.mjs`: other changes only on main do not stop `prepare`; `--move-others` pushes a branch holding only the other change and removes it from the shipping branch; a failed push removes nothing; update the existing `OTHER_CHANGES` assertion.
- [x] 2.4 `--move-others` prints `MOVED=` for each push that worked before a later one fails, and reuses a remote branch whose head already holds exactly the change folder; a test with two other changes, the second push failing, then a rerun.

## 3. Release

- [x] 3.1 `CHANGELOG.md`: a `## Next (minor) — Ship goes all the way` entry; installs have nothing to do.

## 4. Checks

- [x] 4.1 Run `node .github/scripts/checks.mjs --worktree` (payload links, `measure-context.mjs --check`, wiki word cap, ship tests) and fix what fails.
