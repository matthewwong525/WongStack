# Tasks

## 1. Practice site and harness (scripts, meta-repo only)

- [x] 1.1 Write `scripts/fixtures/verify-eval/site.mjs`, `change/specs/notes/spec.md` (nine scenarios), and `key.json` by design.md's table; verify by `scripts/tests/verify-eval.test.mjs` asserting each of the five planted mistakes shows on the site and each of the four controls works
- [x] 1.2 Write `scripts/eval-verify.mjs` (flags, per-run steps, scoring, `results.json`) by design.md; verify in the same test file with a fake `--agent-cmd`: one that passes everything scores 0 caught and 5 missed, one that fails everything scores 4 false alarms, a missing verdict counts as missed, and `ask` is never counted as caught
- [x] 1.3 Keep the answers from the agent; verify the test asserts the work folder is outside the repo and holds no `key.json` or `site.mjs`
- [x] 1.4 Add `scripts/eval-verify.mjs` to `scripts/tests/cli-conventions.test.mjs`; verify `--help` exits 0 and an unknown flag exits 2
- [x] 1.5 Confirm none of the new paths is in `.agents/skills/wong-sync/references/payload-files.json`; verify `node scripts/check-payload-links.mjs` passes
- [x] 1.6 Write `wiki/maintaining/measure-a-skill-change.md` (when to measure, the one command, how to read the table, the keep rule) and link it from `wiki/maintaining/README.md`; verify the command on the page runs as written with `--runs 1` and a fake agent
- [x] 1.7 Run `/save` and confirm CI passes with the new test file

## 2. Baseline (by hand, on this host)

- [x] 2.1 Run `node scripts/eval-verify.mjs --label baseline --runs 3` against the live reference; verify `evidence.md` in this change holds the per-run table, date, model, and reported cost
- [x] 2.2 Apply keep rule 1 to the baseline and record the verdict in `evidence.md`: 15 of 15 caught with 0 false alarms, so the practice set is hardened once
- [x] 2.3 Harden the practice set by design.md § Hardening: the five v2 site behaviors, the two longer `THEN`s in `change/specs/notes/spec.md`, `build-notes.md`, and `--framing builder|none` in `scripts/eval-verify.mjs`; verify `scripts/tests/verify-eval.test.mjs` asserts each v2 mistake shows on the site, each control still works, the notes reach the work folder only under `--framing builder`, and the key and site source still never do
- [x] 2.4 Update `wiki/maintaining/measure-a-skill-change.md` for `--framing builder` and why it exists (an agent that did not build the site already grades with fresh eyes); verify the wiki link checks pass
- [ ] 2.5 Run `/save` and confirm CI passes with the hardened set
- [ ] 2.6 Run `node scripts/eval-verify.mjs --label baseline-v2 --framing builder --runs 3`; record the table in `evidence.md`; still 15 of 15 with at most 1 false alarm → skip groups 3 and 4, do 5.1, and report that the skill stays as it is

## 3. Candidates (change folder only, no skill file yet)

- [ ] 3.1 Write `candidates/proof-bar.md` from `walkthrough.md` with the proof-bar text in § b and § d; run it three times with `--reference` and `--framing builder`; verify its table is in `evidence.md`
- [ ] 3.2 Write `candidates/proof-bar-grader.md` adding the fresh-grader text to § d; run it three times with `--framing builder`; verify its table is in `evidence.md` with the added minutes per run beside the proof bar's
- [ ] 3.3 Write the verdict under the tables by keep rules 2 to 4, one line per candidate with its counts; verify each line cites the rule it used

## 4. Adopt what won (skill, wiki, changelog)

- [ ] 4.1 If the proof bar won: move its text into `.agents/skills/verify/references/walkthrough.md` § b and § d with offsetting cuts; verify `node scripts/measure-context.mjs --check` and `node scripts/check-payload-links.mjs` pass
- [ ] 4.2 If the grader won: stop and ask the person, showing the three tables and the added minutes; on yes, re-`/plan` for the declined-options delta and the § d text; on no, record the choice in the Decision log
- [ ] 4.3 Update the "No second judging agent" bullet in `wiki/development/staging-walkthrough.md` with the measured result and a link to `wiki/maintaining/measure-a-skill-change.md`; verify the wiki link checks pass
- [ ] 4.4 If any payload file changed: add a `## Next (minor)` entry at the top of `CHANGELOG.md` in plain words with its **Updating.** note; if none changed, drop the MODIFIED requirement from this change's delta and verify `openspec validate "sharpen-verify" --strict --no-interactive` passes

## 5. Integration

- [ ] 5.1 Rerun the winning reference once after adoption (`--runs 1`, live path) and confirm its counts sit inside the candidate's three-run range; then run `/save` and confirm CI passes
