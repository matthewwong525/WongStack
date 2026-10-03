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
- [x] 2.5 Run `/save` and confirm CI passes with the hardened set
- [x] 2.6 Run `node scripts/eval-verify.mjs --label baseline-v2 --framing builder --runs 3` and record the table in `evidence.md`: 12 caught, 3 asked, 0 missed, 0 false alarms; the person chose the next step

## 3. Re-check past real walks (by hand, fresh agents, read-only)

- [x] 3.1 Record in `evidence.md` what survives of the six passed walks on PRs #201, #212, #213, #222, #225, and #228: the comment text, any pictures, and whether each preview still answers; verify each PR has a line
- [x] 3.2 Have a fresh agent, given each journey's `THEN` and the comment's evidence text with the verdict marks removed, say for each claim in the `THEN` whether the text reports an observation of it; verify `evidence.md` holds a row per journey
- [x] 3.3 Have fresh agents walk the same journeys again on the still-live previews, given only the scenario names, the `THEN`s, and the address, changing no data; verify `evidence.md` holds agree, disagree, or could-not-walk per journey with the reason, and that every run folder is cleaned up
- [x] 3.4 Write the verdict under the tables: what the re-check shows about an agent grading its own build, and about the record a walk leaves; verify each line cites its counts

## 4. Record the result (wiki, spec, changelog)

- [x] 4.1 Update the "No second judging agent" bullet in `wiki/development/staging-walkthrough.md` with the measured result and a link to `wiki/maintaining/measure-a-skill-change.md`; verify `node scripts/check-payload-links.mjs` and the wiki link checks pass
- [x] 4.2 Settle the MODIFIED requirement in this change's delta by the evidence (keep it only if the walks show the behavior today) and log the choice; verify `openspec validate "sharpen-verify" --strict --no-interactive` passes and the main spec matches the delta
- [x] 4.3 Add a `## Next (patch)` entry at the top of `CHANGELOG.md` in plain words for the wiki page's change; verify the entry has its **Updating.** note
- [x] 4.4 Run `/save` and confirm CI passes

## 5. Partly shown promises (practice set, skill)

- [x] 5.1 Add three practice promises with a part nothing can show (owner email, audit-log entry, nightly re-index), key `partial`, the `partial` verdict, and the scoring table in design.md § The two fixes to `scripts/fixtures/verify-eval/` and `scripts/eval-verify.mjs`; verify `scripts/tests/verify-eval.test.mjs` asserts named, overclaimed, and both new false-alarm and missed cases with fake agents, and that the build notes claim all twelve
- [x] 5.2 Run `node scripts/eval-verify.mjs --label baseline-v3 --framing builder --runs 2`; verify its table is in `evidence.md`
- [x] 5.3 Write `candidates/partly-shown.md` from `walkthrough.md` with the § d and § f text; run it twice with `--reference` and `--framing builder`; verify its table and the keep-rule verdict are in `evidence.md`
- [x] 5.4 The longer wording tied today's and is not kept; the mark it tied on goes in: `◐` and the full/part count in `.agents/skills/verify/references/walkthrough.md` § f, three sentences defining *partly shown* in § d, and `.agents/skills/verify/SKILL.md`'s verdict table and report line; verify `node scripts/measure-context.mjs --check` and `node scripts/check-payload-links.mjs` pass
- [x] 5.5 Add the reason to `wiki/development/staging-walkthrough.md` (why a pass names what it showed, with the 14 of 21); verify the wiki link checks pass

## 6. Scrub evidence (verify scripts)

- [x] 6.1 Scrub the run folder's text files at the end of `run` and the start of `publish` in `.agents/skills/verify/scripts/verify-staging.sh`, reusing the memory skill's `redact`, printing `REDACTED=<n>`; verify `scripts/tests/verify-scripts.test.mjs` plants the secret in an evidence file, a result file, and `comment.md` and finds it in none afterwards, nor in stdout or stderr
- [x] 6.2 Add the no-request-headers evidence rule to `walkthrough.md` § b, the scrub to § f's report line, and the reason to `wiki/development/staging-walkthrough.md`; verify `node scripts/measure-context.mjs --check` and the link checks pass

## 7. Integration

- [x] 7.1 Replace the `## Next (patch)` entry in `CHANGELOG.md` with one `## Next (minor)` entry covering partly shown promises, the scrub, and the measured note, in plain words with its **Updating.** note; verify one `## Next` entry exists
- [x] 7.2 Run `/save` and confirm CI passes

