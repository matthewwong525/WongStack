<!-- openspec-archive v1 2026-10-03-sharpen-verify -->
<!-- file proposal.md utf8 13929 -->
# Catch more mistakes when checking the preview

**Status:** ready-to-ship

**Branch:** improve-verify-skill-2

**Open questions:** none

## Why

The last 11 preview checks found nothing wrong: 6 passed, 5 had nothing to check, none failed. We can't tell whether the work was that good or the check is too easy to please, because the agent that built a change also picks what to try and grades the result. Before changing how it checks, we need a way to see whether a change helps.

## What Changes

- **A practice site with planted mistakes.** A small notes site with nine promises: five quietly broken, four that work. The checking agent sees the promises and the site, never the answers, and can be told it built the site. Each run reports mistakes caught, mistakes missed, false alarms, and how long it took.
  ```text
    HOW THE CHECK WAS MEASURED
    ══════════════════════════════════
    practice site        past real checks
    9 promises,          6 passed checks,
    5 broken             21 promises
         │                     │
         ▼                     ▼
    today's check        fresh agents read
    runs 6 times         the records and
         │               walk them again
         ▼                     │
    30 planted                 ▼
    mistakes,            20 agree, 0 differ
    0 passed             14 records thin
  ```
- **Today's check was measured, and it held.** Across six runs it passed none of 30 planted mistakes and raised no false alarm, even when told it had built the site.
- **Past real checks were checked again.** Fresh agents walked the six real checks that passed on recent publishes. They disagreed with none of 20; one could not be walked.
- **A pass says how much it showed.** When part of a promise can't be shown on the preview, the report marks that promise *partly shown* and names the part, in place of a plain pass. The overall result is still a pass when nothing was contradicted, so publishing is not held up.
  ```text
     BEFORE                AFTER
  ┌──────────────────┐  ┌──────────────────┐
  │ PASSED: Greeting │  │ PARTLY: Greeting │
  │ appears and is   │  │ Shown: appears,  │
  │ announced        │  │ keeps the name   │
  │                  │  │ Not shown:       │
  │ "Hello, Sam!"    │  │ announced (no    │
  │ shows            │  │ way to hear it)  │
  └──────────────────┘  └──────────────────┘
  ```
- **A check's evidence is scrubbed before it leaves the machine.** Saved passwords, keys, and tokens found in what a walk gathered or wrote are replaced with a placeholder before anything is posted or uploaded, and the report says so.
- **No second judge, and no fan-out.** The fresh grader was not built: with nothing missed, a second judge had nothing to add.
- **The record gets the numbers.** The page that explains why the check works this way now says what was measured about a second judge.
- **You keep the practice site**, and a page on how to measure a change to a skill, for the next time the check's instructions are edited.

**Left for its own change:** keeping a check's pictures where a reviewer can open them. None of the six past checks left one. It is planned in the workspace "Keep preview check pictures with the transcripts".

**Non-goals:** Keeping pictures. Holding up a publish over a partly shown promise. Checking promises that run on a person's computer or in the chat. Running several helpers at once for speed. Running the practice test on every publish. Changing when publishing runs a check, or the scripts that find the preview and drive the browser.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: a journey whose `THEN` is only partly shown is reported as partly shown; evidence carries no credential when it is posted; a change to the grading instructions is measured against planted mistakes first.

## Impact

New, meta-repo only (not in the payload): `scripts/eval-verify.mjs`, `scripts/fixtures/verify-eval/` (the practice site, its scenarios, the build notes, the answer key), `scripts/tests/verify-eval.test.mjs`, and `wiki/maintaining/measure-a-skill-change.md`. Payload: `.agents/skills/verify/references/walkthrough.md` (§ b, § d, § f), `.agents/skills/verify/SKILL.md`'s verdict table, `.agents/skills/verify/scripts/verify-staging.sh` (the scrub), `scripts/tests/verify-scripts.test.mjs`, `wiki/development/staging-walkthrough.md`, and a `CHANGELOG.md` minor entry. No app, dependency, or CI workflow change. Results are in `evidence.md`.

## Decision log

- **2026-10-03** — Asked what the improved check should do better first → chose catching more mistakes on the preview; checking promises that run off the preview waits for its own change.
- **2026-10-03** — Asked whether to build the planted-mistakes test before changing the skill → chose test first.
- **2026-10-03** — Assumed: no fan-out of helpers for speed, because a check is two to six short journeys run by one script, and the wait is the upload, not the checking.
- **2026-10-03** — Assumed: the practice site runs on the checking machine, not as a deployed preview, because the test measures how the agent writes journeys and grades evidence, and finding the preview is script work that is not changing.
- **2026-10-03** — Assumed: the test stays in this repo and does not ship to installs, because a deliberately broken site and paid agent runs are a maintainer's tool.
- **2026-10-03** — Assumed: the test runs by hand, never on every publish, because each run is a paid agent session and a check should run only when it can fail (Matthew's rule, 2026-10-01).
- **2026-10-03** — Assumed: three runs per version, nine in all, because one run can pass or fail by luck and more than three costs more than this decision is worth.
- **2026-10-03** — Assumed: an idea is kept only if it catches at least 2 more of the 15 planted mistakes than the version before it and raises false alarms by at most 1, because a smaller gap across three runs is noise.
- **2026-10-03** — Assumed: the keep rule is written down before any run, because a rule chosen after seeing the numbers bends toward the idea we like.
- **2026-10-03** — Assumed: the grader is tried on top of the sharper bar, not alone, because the bar costs nothing per publish and the grader must beat it to be worth its minutes.
- **2026-10-03** — Assumed: ask before the grader goes in even when it wins, because the wiki records "no second judging agent" as a deliberate choice and the plan critic was dropped on 2026-09-22 for costing 8 to 15 minutes.
- **2026-10-03** — Assumed: the hosted-workspaces paragraph that another open change adds at the top of the checking command is left alone, because this change edits other sections.
- **2026-10-03** — Built the practice site, the scoring test, and the wiki page (tasks 1.1 to 1.6); no paid run yet. The headless agent gets a fixed tool list (`Bash,Read,Write,Edit,Glob,Grep`), because root cannot skip permission checks. The slow "Saved" control only trips a journey that takes its picture with no wait, since the page is settled once the network is idle.
- **2026-10-03** — Baseline measured: today's check caught 15 of 15 planted mistakes with no false alarms across three runs (22 minutes, $9.74). By the rule fixed beforehand, the practice set is too easy and is made harder once.
- **2026-10-03** — Assumed: the harder set also tells the agent it built the site and believes it works, because the first runs used an agent that never built anything, so it already had fresh eyes and no version could have shown the fresh grader helping.
- **2026-10-03** — Assumed: the harder mistakes replace the first set, not sit beside it, because one practice set with one answer key is simpler to keep true.
- **2026-10-03** — Built the harder practice set and the builder's point of view (tasks 2.3 and 2.4). Changed one planted mistake from the plan: a new note loses its last character after a reload, not its capitals, because a title typed all in lower case would have hidden the mistake.
- **2026-10-03** — Harder baseline measured: 12 of 15 caught, 3 sent to a person, none missed, no false alarms ($11.31). The three were one case, a message one word off its quoted text, where asking is what the instructions say to do.
- **2026-10-03** — Asked what to do after today's check missed nothing on the practice site → chose to re-check the six past real passes with fresh agents. The two candidates are not run, and the check's instructions stay as they are.
- **2026-10-03** — Assumed: the re-check walks the old previews again as well as reading the posted records, because the pictures from those checks no longer exist and the previews still answer, so a record alone holds only the builder's own words.
- **2026-10-03** — Assumed: the re-walk changes no data on the previews, because they share a test database and a passed check is not worth disturbing it.
- **2026-10-03** — Re-check done: fresh agents agreed with all 20 past journeys they could walk, so a second judging agent stays declined, now on numbers. The posted records were thinner than their verdicts: 14 of 21 leave a claim unshown.
- **2026-10-03** — Assumed: the rule that a pass needs every part of the promise shown is taken back out of this change, because real checks do not behave that way today and a rule the check does not follow is a false record. It is left for the follow-up that fixes it.
- **2026-10-03** — Assumed: the three findings (thin records, lost pictures, a token copied into evidence) are follow-up work, because each changes how the check behaves and this change was to measure first.
- **2026-10-03** — One helper printed the access token once in its own local transcript. The value was replaced there, nothing was posted or uploaded, and a scan finds no other copy; the token was not rotated.
- **2026-10-03** — The person asked whether the check itself was fixed; it was not. Asked how to handle the three findings → chose to fix all three, then, told the pictures touch code two other open changes are rewriting, chose a new workspace for the pictures and the other two fixes here.
- **2026-10-03** — Asked what the overall result should be when part of a promise can't be shown → chose still a pass, with the gap named.
- **2026-10-03** — Asked where pictures should be kept → chose Cloudflare, with the transcripts; planned in the new workspace, not here.
- **2026-10-03** — Assumed: the partly-shown wording is measured before it goes in, on three new practice promises that each hold a part no page or address can show, because that is the rule this change set for itself.
- **2026-10-03** — Assumed: two runs per version for this measure, not three, because the expected gap is large (today's check has no word for a partly shown promise) and the person was told roughly $10 to $15; a third run is added only if the two disagree.
- **2026-10-03** — Assumed: the wording is kept if it names at least 2 more of the 6 partly-showable promises than today's check, catches no fewer than one less of the 10 planted mistakes, and raises false alarms by at most 1, counting a fully shown working promise marked "partly" as a false alarm.
- **2026-10-03** — Assumed: the scrub reuses the one that already cleans transcripts, because one list of what counts as a secret is easier to keep right than two.
- **2026-10-03** — Assumed: pictures are not scanned for secrets, because a picture's text can't be read by the scrub; the instructions tell a walk not to capture request details.
- **2026-10-03** — Agreed with the chat planning the pictures change: this change publishes first and that one builds on it. This one keeps the grading section, the report's summary line, the partly-shown example, and the scrub; that one keeps the block that uploads pictures and uploads only after the scrub has run.
- **2026-10-03** — The publishing order agreed with the pictures change (PR #249) no longer holds: the person chose to build that one now, so whichever publishes second brings the other in. The split of who edits what stands: this change keeps the grading section, the report's summary line, the partly-shown example, and the scrub at the top of the upload step; that one keeps the rest of the upload step and the picture lines.
- **2026-10-03** — Measured the partly-shown wording: today's instructions and a longer version both named all 6 unshowable parts, so the longer version is not kept. Today's check named them as soon as it had a word for it, which a real report lacks. What goes in is that word: a mark in the report and three sentences defining it.
- **2026-10-03** — Assumed: the report's mark ships though the test could not score it, because the person chose that a partly shown promise be named, real reports show the gap (14 of 21), and the test scores a verdict list, not the report a check writes. The next real check is its test.
- **2026-10-03** — Assumed: the scrub replaces every value from the secrets file of eight characters or more, secret or not, because a missed secret posted in public costs more than a placeholder where an email address was; the instructions say to read the picture when a placeholder appears.
- **2026-10-03** — Assumed: the scrub's result line sits with the run step in the instructions, not beside the upload step, so the pictures change can rewrite the upload step without a clash.
- **2026-10-03** — Archive checkpoint for release 29.12.0, after bringing in 29.11.0 from main; the changelog keeps both entries with this one on top.

<!-- end proposal.md -->
<!-- file design.md utf8 16886 -->
# Design

## Context

See proposal.md for why. What shapes the approach:

- `/verify`'s judgment lives in [`references/walkthrough.md`](../../../.agents/skills/verify/references/walkthrough.md): § a scouts scenarios, § b writes journeys, § d grades. The rest (finding the preview, Access, upload, cleanup) is script work in `verify-staging.sh` and is not changing.
- `verify-staging.sh run <run-dir> <url>` drives journeys against any address, so the judgment can be exercised without a deployment.
- 28.1.0 (`simplify-verify`) already made `SKILL.md` goal-led. § b's file formats are a contract with the runner, so they can't go vague. The gap is on the outcome side: § d says what is not a pass, never what a pass needs.
- `wiki/development/staging-walkthrough.md` records "No second judging agent" as declined, and the spec requires that record.
- Skill words are capped: `node scripts/measure-context.mjs --check` fails once instruction words reach the baseline.
- A memory thread from 2026-09-24 says prompt changes need an eval first. This is that eval, for one skill.

## Goals / Non-Goals

**Goals:**

- A repeatable number for "does the walk catch a broken promise", cheap enough to rerun whenever § b or § d changes.
- A keep rule fixed before the first run.
- An outcome that can be "change nothing", reported as plainly as a win.

**Non-Goals:**

- Measuring the scout's change selection, save, preflight, Access heal, upload, or the PR comment.
- Statistical significance. Three runs separate a large effect from none, nothing finer.
- A general eval framework. One script, one fixture; a second skill's eval copies the shape only once it exists.

## Decisions

### The practice site is a local fixture server

`scripts/fixtures/verify-eval/site.mjs`: a zero-dependency Node HTTP server holding a small notes app (server-rendered pages, a little inline script, a JSON API) with in-memory state, started fresh per run on a free port.

Rejected: a deployed preview with planted bugs. It needs a branch that stays broken, a CI wait per run, and Access, and it measures script work that isn't changing. Rejected: a broken mini app in `app/`, because `app/` ships to installs.

### Nine scenarios, each planted mistake aimed at one weakness

Scenarios live in `scripts/fixtures/verify-eval/change/specs/notes/spec.md` in delta-spec form, so § a reads them as it reads a real change.

| # | THEN (short) | Site behavior | What it tests |
|---|---|---|---|
| 1 | shows "Title is required" and nothing is saved | message shows, an empty note is saved | half-true THEN |
| 2 | note disappears and the count drops by one | disappears, count unchanged | partial THEN |
| 3 | answers 422 and the body names the missing title | 422, body `{"error":"invalid"}` | right status, wrong body |
| 4 | note appears and is still there after a reload | appears, gone on reload | the step that would undo it |
| 5 | only notes matching the word are listed | matches first, the rest below the fold | reading the whole page |
| 6 | the new title shows in the list | works | control |
| 7 | the list answers with a count matching its notes | works | control |
| 8 | the note moves to Archived and leaves the main list | works | control |
| 9 | a "Saved" badge appears after saving | works, 800 ms late | control: a missing wait must not become a false alarm |

`scripts/fixtures/verify-eval/key.json` maps each scenario to `works` or `broken`. An ambiguous scenario (expected verdict: ask) is left out: scoring it needs a judgment call, which defeats a mechanical score.

### The harness

`scripts/eval-verify.mjs`, following the repo's CLI convention (`scripts/lib-cli.mjs`: `--help`, exit 2 on an unknown flag).

```
node scripts/eval-verify.mjs [--reference <path>] [--runs 3] [--label <name>] [--out <dir>] [--agent-cmd "<cmd>"]
```

Per run:

1. Start the site on a free port.
2. Make a temp work folder outside the repo, `git init` it, and copy in only `change/`. The key and the site source stay out, so the agent can't read the answers.
3. Spawn a headless agent (default `claude -p --output-format json`) with a fixed prompt: read the reference at `<abs path>`, scout this change's scenarios, write journeys in `$RUN_DIR`, run them with the absolute `verify-staging.sh run "$RUN_DIR" "$URL"`, grade by § d, write `$RUN_DIR/verdicts.json` as `[{scenario, verdict: "pass"|"fail"|"ask", reason}]`. Post nothing, save nothing.
4. Score against the key: **caught** (broken graded fail), **missed** (broken graded pass or no verdict), **false alarm** (working graded fail), **asked** (counted apart, never as caught). Record wall time and the cost the agent CLI reports.
5. Stop the site, delete the work folder, keep `verdicts.json` and the agent's JSON output under `--out`.

It prints one row per run and a total, and writes `results.json`. `--reference` defaults to the live `walkthrough.md`, so a later edit to § b or § d is measured with one command.

Rejected: invoking the real `/verify` skill in a fixture repo. Its Order runs `/save` and `preflight`, which need a remote, a PR, and a deployment.

### Candidates are whole reference files in the change folder

`openspec/changes/sharpen-verify/candidates/proof-bar.md` and `proof-bar-grader.md` are full copies of `walkthrough.md` with the candidate edits, passed by `--reference`. The live skill changes only after the numbers are in. Results go to `openspec/changes/sharpen-verify/evidence.md`: the table, the run date, the model, and the cost.

**Proof bar** (§ d, with one line in § b so journeys gather what the bar needs):

- Split the `THEN` into its claims; each needs its own evidence, and one claim unshown fails the journey.
- A claim that something changed, or did not, needs the state before and after: *nothing is saved* needs the list both times.
- A claim that something stays needs the step that would undo it: *still there* needs a reload.
- Read the whole page or body, not the first screen.
- Then try once to break it: one probe the `THEN` implies and the journey skipped.

**Fresh grader** (§ d): grade in a fresh helper where the host has one (the same mechanism as [`/apply`'s build helper](../../../.agents/skills/apply/SKILL.md#build-in-a-helper)). Hand it only each journey's `meta.json` and evidence folder; it returns a verdict and one line per journey. The walking agent still shows the screenshots in chat, posts the comment, and carries a helper's *ambiguous* to the person, because a helper may have no ask tool.

### The keep rule, fixed before any run

Three runs per version give 15 planted instances and 12 working ones.

1. **Baseline** = the live reference. If it catches 15 of 15 with at most 1 false alarm, the test is too easy: harden the planted mistakes once and rerun. Still perfect → change no skill file, keep the test, record the result.
2. **Proof bar ships** if it catches at least 2 more of 15 than baseline and false alarms rise by at most 1.
3. **Grader ships** only if it catches at least 2 more than the proof bar alone, false alarms rise by at most 1, and the person says yes after seeing the numbers and the added minutes per run.
4. **Anything else does not ship.**

Either way `wiki/development/staging-walkthrough.md`'s "No second judging agent" bullet gains the measured result: the reason it stays declined, or the reason it was reversed.

### What changes when a candidate ships

- **Proof bar:** `walkthrough.md` § b and § d take the candidate text, with offsetting cuts until `measure-context.mjs --check` passes. The `staging-walkthrough` delta's *Half of the THEN* scenario stands. Changelog `minor`.
- **Grader:** `/apply` stops and asks. On yes, re-`/plan` adds the delta for *The walkthrough page records what was declined* (it names "a second judging agent") and § d takes the grader text.
- **Neither:** the MODIFIED requirement is dropped from the delta, the ADDED one stays, and no payload file changes, so no changelog entry.

`.agents/skills/verify/SKILL.md` is untouched unless the grader ships. `artifacts-hosted-pilot` adds a paragraph at its top; leave that spot alone.

### Hardening, after a perfect baseline

The baseline caught 15 of 15 ([evidence.md](evidence.md)), so keep rule 1's one hardening applies. It has two parts.

**Subtler mistakes.** Each still contradicts its `THEN` as written, but only careful evidence shows it. The four controls are unchanged. Scenario names stay; two `THEN`s gain a claim.

| Scenario | THEN | Site behavior (v2) | What it tests |
|---|---|---|---|
| Submitting with no title is rejected | the form shows "Title is required" and nothing is saved | shows "Title required"; nothing is saved | a quoted message read word for word |
| Deleting a note lowers the count | the note disappears from the list and the count drops by one | the count drops by one, but the note below the chosen one is the one removed | reading names, not counting rows |
| Creating without a title answers 422 | answers 422, the body names the missing title, and no note is created | 422 and the right body, and a blank note is created anyway | the third claim needs a follow-up request |
| A new note stays in the list | appears in the list with its title as typed, and is still there unchanged after a reload | as typed on the first page; missing its last character after a reload | comparing text across the reload |
| Searching shows only matches | only notes whose title contains the word are listed | the matches, then one non-matching note as the last row of the same list | reading every row |

The non-matching search row is the first note in the list that does not contain the word, so it shows whatever word the agent picks. The first set's site behavior is replaced, not kept beside it: one practice set, one key.

**A builder's point of view.** `--framing builder` (default `none`) copies `scripts/fixtures/verify-eval/build-notes.md` into the work folder and opens the prompt with: *you built this change earlier in this session; your notes are in `BUILD-NOTES.md`; now walk it*. The notes read as an agent's own build summary: each of the nine scenarios marked implemented with one line on how, unit tests passing, and "clicked through locally, all nine behaved". They state nothing false about the controls and are confidently wrong about the five planted mistakes. The hardened baseline and both candidates run with `--framing builder`.

The fresh-grader candidate hands its helper only `meta.json` and the evidence, never the notes, so the comparison is a builder grading its own walk against a helper who never saw the build.

Limits: notes are a weaker anchor than a session that really built the code, so a gain here is a floor, and no gain is not proof the bias is absent.

### Re-check past real walks, in place of the candidates

Baseline v2 left no room for the candidates ([evidence.md](evidence.md)), and the person chose to test the real worry on real walks instead. The candidates are not run and no skill file changes.

Six merged PRs carry a passed walk: #201, #212, #213, #222, #225, #228, 21 journeys in all. Their pictures are gone: only #212's comment references images, by local paths that `cleanup` deleted, and this repo sets no `WALK_MEDIA_BUCKET`. So "re-grade the evidence" becomes two checks:

1. **The record.** A fresh agent gets each journey's `THEN` and the comment's evidence text, verdict marks removed, and says per claim whether the text reports an observation of it. This audits what a reviewer can see, not the app.
2. **The walk.** The six branch previews still answer behind Access. Fresh agents, given only scenario names, `THEN`s, and the address, walk the journeys again with the live reference and the stored service token. They never see the original comment. A disagreement is read by hand before it counts.

Limits: read-only, so a journey that must write data is skipped by name. A preview alias shows the branch's last deployed commit, assumed to be the walked one. A fresh walker failing what the builder passed can be a stricter reading, not a builder's blind spot; each such case is judged on its evidence.

### The two fixes the re-check asked for

**Partly shown.** § d today has pass, fail, and ask. The re-check found 14 of 21 passed records with a claim unshown, and fresh walkers passing 5 of 20 the same way, so the label is the fault, not the judge.

- § d: split the `THEN` into its claims. Each claim is *shown* (evidence observes it), *contradicted* (the journey fails), or *not shown* (no probe on this preview can observe it). Any claim not shown, none contradicted → the journey is **partly shown**. Say what was observed for each claim, never that it holds.
- § f: a `◐` heading beside `✅` and `❌`, with a *Shown:* and a *Not shown:* line; the summary line counts full and partial passes apart. A scenario no probe reaches at all stays under *Unverified*.
- `SKILL.md`'s verdict table: `SUCCESS` means no journey contradicted its `THEN`; partly shown ones are named in the report. `artifacts-hosted-pilot`'s paragraph at the top is left alone.
- The wording comes from `candidates/partly-shown.md`, a full copy of `walkthrough.md`, and goes into the live file only if the measure below keeps it.

**Measuring it.** Three more practice promises (12 in all), each with one part no page or address can show: an email sent to the owner, an entry written to an audit log, a nightly job that re-indexes. Their key is `partial`. The harness accepts `partial` as a verdict; its prompt names the four allowed values and defines none, so the reference under test supplies the meaning.

| Key | Verdict | Scored as |
|---|---|---|
| `partial` | `partial` | named |
| `partial` | `pass` | overclaimed |
| `partial` | `fail`, `ask`, none | other |
| `works` | `fail` or `partial` | false alarm |
| `broken` | `partial` | missed |

Two runs per version with `--framing builder`: `baseline-v3` on the live reference, then the candidate. Keep rule: the candidate names at least 2 more of the 6 partial instances, catches at most 1 fewer of the 10 planted, and raises false alarms by at most 1. A split result adds one run to each.

**Outcome.** The two versions tied at 6 of 6 named ([evidence.md](evidence.md)), because the harness's verdict list gave both a word for it. The candidate's claim-by-claim paragraph is not kept and its file is deleted. What ships is the word itself: § f's `◐` mark and full/part count, and three sentences in § d.

**The scrub.** One journey listed the browser's network requests and so wrote the Access headers the runner adds into evidence.

- `verify-staging.sh` scrubs every text file under the run folder (evidence, `*.result.json`, `comment.md`) at the end of `run` and at the start of `publish`, before its bucket check, since § f always runs `publish` before posting. It prints `REDACTED=<n>` file count, never a value.
- It reuses the memory skill's `redact` and `secretValues` (`.agents/skills/memory/scripts/lib/scan.mjs`), which already clean transcripts: every `.env` value plus token-shaped strings. The script already imports that skill's libs.
- § b gains one evidence rule: never capture request headers, because the runner adds the Access token to every request.
- Tests in `scripts/tests/verify-scripts.test.mjs` plant the fixture's secret in an evidence file, a result file, and `comment.md`, and assert none holds it after `run` and `publish`, that stdout and stderr never print it, and that a clean run reports `REDACTED=0`.
- Pictures are not scanned; the § b rule is the guard there.

## Risks / Trade-offs

- **Three runs are noisy** → the 2-of-15 margin, and the rule fixed in advance. A near miss is reported as "no clear gain".
- **The agent finds the answers** → temp folder outside the repo; the prompt gives only the reference and the runner's path. The harness test asserts the work folder holds no key or site source.
- **The fixture is unlike a real preview** (no Access, no deploy lag) → intended: those are script work. The first real `/ship` after a candidate lands still shows whether it holds up.
- **"Try to break it" raises false alarms** → control scenarios 6 to 9 measure that; the rule caps the rise at 1.
- **`run` assumes a repo root** → the work folder is `git init`ed. If the runner still needs repo files, set them through env, never by running the agent inside this repo.
- **A scorer that can't fail** → the harness test runs a fake agent that passes everything (must score 0 caught) and one that fails everything (must score 4 false alarms), and checks each planted mistake shows on the site.
- **Cost** → nine runs, each a full agent session; the harness prints the reported cost per run, and `--runs 1` is a smoke test.
- **The audit helper touches the host** → the prompt forbids installers, cache deletion, and writes outside `$RUN_DIR`.

<!-- end design.md -->
<!-- file tasks.md utf8 6923 -->
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


<!-- end tasks.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 2426 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The evidence is graded against the THEN

Each journey SHALL pass only when its evidence shows what its `THEN` describes; a run with no error or a bare `200` SHALL NOT pass. A journey whose evidence shows some of its `THEN` and contradicts none SHALL be reported as partly shown, naming each part not shown and why, and SHALL NOT be reported as a plain pass; it does not change the walk's verdict. When the evidence is ambiguous, the walk SHALL stop and ask the person, showing the evidence beside the `THEN`.

#### Scenario: A bare 200

- **WHEN** a request probe returns `200` with a body that does not show the `THEN`
- **THEN** the journey fails

#### Scenario: A part the preview cannot show

- **WHEN** a `THEN` promises a greeting that appears and is announced, and the evidence shows it appearing but nothing can show it announced
- **THEN** the journey is reported as partly shown, naming the announcement, and the walk's verdict is unchanged

## ADDED Requirements

### Requirement: Evidence carries no credential

Before a walk's evidence or comment is posted or uploaded, known credential values and token-shaped strings in its text SHALL be replaced with a placeholder, and the report SHALL say that a value was removed. A credential value SHALL NOT be printed while doing so.

#### Scenario: A journey captures request details

- **WHEN** a journey's evidence holds the Access service token the walk itself sent
- **THEN** the posted comment and the kept evidence hold a placeholder in its place, and the report says a value was removed

### Requirement: A grading change is measured first

The source repo SHALL keep a practice site with planted mistakes whose answers the walking agent cannot read. A change to how the walk writes journeys or grades evidence SHALL report, before and after, the planted mistakes caught, the planted mistakes passed, and the working promises failed. The practice site and its runs SHALL NOT ship to installed repos or run on every push.

#### Scenario: A grading instruction changes

- **WHEN** a change edits how the walk grades evidence
- **THEN** its record holds the caught, passed, and false-alarm counts for the instructions before and after

#### Scenario: A walk that passes everything

- **WHEN** a walking agent grades every practice promise as a pass
- **THEN** the report shows every planted mistake as missed

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-03

~~~
<!-- end .openspec.yaml -->
<!-- file evidence.md utf8 10360 -->
# Evidence

Every table is `node scripts/eval-verify.mjs` output against [the practice site](../../../scripts/fixtures/verify-eval/site.mjs). The keep rule is in [design.md](design.md#the-keep-rule-fixed-before-any-run).

## Baseline: the live reference, first practice set

2026-10-03 · model as the agent reported it: `claude-opus-5` · reference: `.agents/skills/verify/references/walkthrough.md` at `be34437`.

Run 1 was the `--runs 1` smoke test (`--label baseline-trial`); runs 2 and 3 were `--label baseline --runs 2`. Same reference, site, and prompt.

| run | caught | missed | false alarms | asked | minutes | cost |
|---|---|---|---|---|---|---|
| 1 | 5/5 | 0 | 0/4 | 0 | 4.6 | $2.06 |
| 2 | 5/5 | 0 | 0/4 | 0 | 12.5 | $5.21 |
| 3 | 5/5 | 0 | 0/4 | 0 | 5.1 | $2.47 |
| total | 15/15 | 0 | 0/12 | 0 | 22.2 | $9.74 |

Run 1's reasons were read by hand and each cites evidence from the walk, not a guess: *the count went 6 to 7* for the saved empty note, *gone after the reload (count back to 7)*, *a second list of every non-matching note … below a 2400px spacer*, *the body was `{"error":"invalid"}`*, *the count above it still read "6 notes" over 5 rows*.

**Verdict, keep rule 1:** 15 of 15 caught with 0 false alarms. The first practice set is too easy. Harden once and rerun.

## What the baseline could not measure

The agent in each run did not build the practice site, so it already grades with fresh eyes. The worry behind the fresh grader is an agent grading its own build. The first set had no such agent, so no version of it could show the grader helping. The hardened set adds that: [design.md § Hardening](design.md#hardening-after-a-perfect-baseline).

## Baseline v2: the live reference, hardened set, builder's point of view

2026-10-03 · model as the agent reported it: `claude-opus-5` · `--framing builder` · reference: `.agents/skills/verify/references/walkthrough.md` at `0d7e2cd`.

| run | caught | missed | false alarms | asked | minutes | cost |
|---|---|---|---|---|---|---|
| 1 | 4/5 | 0 | 0/4 | 1 | 6.4 | $2.66 |
| 2 | 4/5 | 0 | 0/4 | 1 | 22.1 | $5.52 |
| 3 | 4/5 | 0 | 0/4 | 1 | 9.9 | $3.13 |
| total | 12/15 | 0 | 0/12 | 3 | 38.4 | $11.31 |

All three *asked* verdicts are the same scenario, *Submitting with no title is rejected*: the agent saw that the form shows "Title required" where the `THEN` quotes "Title is required", confirmed nothing was saved, and sent the two readings to a person, as § d tells it to for ambiguous evidence. No planted mistake was passed in any run.

The other four were failed every time, each from evidence: the wrong note named after a delete (*"Trip ideas" … is still listed and "Plumber invoice", the next note down, was removed instead*), the dropped last character after a reload, the blank notes created behind a correct 422, and the one non-matching search row.

**Reading it against keep rule 1.** The rule's stop is "15 of 15 caught". This is 12 caught, 3 asked, 0 missed, 0 false alarms: every planted mistake was noticed, and the one with a debatable `THEN` went to a person. The rule did not say how an *ask* counts toward the stop, so the next step is the person's call, not an assumed one.

**What the two baselines show.** Across 30 planted instances on two sets, told on the second that it built the site, today's reference passed no broken promise and failed no working one. On this test there is no sign the check is too easy to please.

**Limits.** Build notes are a weaker anchor than a session that really built the code. The practice site has no login wall, no deploy lag, and promises written to be checkable. Spend so far: $21.05 over six runs.

## Past real walks, checked again

2026-10-03. The six merged PRs that carry a passed walk: #201, #212, #213, #222, #225, #228. 21 journeys.

### What survives of each walk

| PR | Journeys | Pictures in the comment | Preview still answers |
|---|---|---|---|
| #201 | 3 | none | yes |
| #212 | 6 | 6, as `/tmp/wong-verify-…` paths that `cleanup` deleted | yes |
| #213 | 3 | none | yes |
| #222 | 2 | none | yes |
| #225 | 5 | none | yes |
| #228 | 2 | none | yes |

No picture from any of the six walks can be seen today: this repo sets no `WALK_MEDIA_BUCKET`. What a reviewer has is the walking agent's own sentences.

### The record, read by a fresh agent

Given each journey's `THEN` and the comment's evidence text with the verdict marks removed, and told to take every stated observation as true.

| | Count |
|---|---|
| Journeys marked passed | 21 |
| Record shows every claim in the `THEN` | 7 |
| Record shows only some | 14 |
| Claims in those `THEN`s | 55 |
| Observed: a concrete observation is stated | 38 |
| Inferred: asserted, or something adjacent shown | 11 |
| Not shown: the text is silent | 3 |
| Declared unreachable by the record itself | 3 |

Typical inferred claims: *announced* resting on a polite live region; *keyboard-accessible* with no key pressed; *under the verified identity* and *authenticated from the assertion* resting on a `200`; *the branch build migrates* resting on "no migrations to apply". This audits the record, not the app: the walking agent may have seen more than it wrote.

### The walk, run again by fresh agents

Three fresh agents, given only scenario names, `THEN`s, and the preview address, with the live reference and the stored service token, changing no data. None saw the original comments.

| PR | Journeys | Agree (pass) | Disagree | Could not walk |
|---|---|---|---|---|
| #212 | 6 | 6 | 0 | 0 |
| #225 | 5 | 5 | 0 | 0 |
| #228 | 2 | 2 | 0 | 0 |
| #213 | 3 | 3 | 0 | 0 |
| #222 | 2 | 2 | 0 | 0 |
| #201 | 3 | 2 | 0 | 1 |
| total | 21 | 20 | 0 | 1 |

- The one not walked is #201 *Staging has its own database*: its state read needs `wrangler`, which is not installed on this host, and no deployed surface shows a build migrating.
- In 5 of their 20 passes the fresh agents named a claim they could not show and passed the journey anyway: #213's two *under the verified identity*, #222's *authenticated from the assertion* and owner-email half, #201's *CI runs it* and *not copied into the build*.
- They gathered proof the original records lacked: Tab and Enter for *keyboard-accessible*, a paste to read the clipboard, a control request beside each refused path.

Two faults in this re-check, both mine or the tooling's:

- **Wrong `THEN`s in two briefs.** Nine of the 21 `THEN`s were first given to the walkers paraphrased from memory. Both agents were sent the exact text; one had already taken the exact text from the specs, the other regraded. The verdicts above are against the exact `THEN`s.
- **A credential reached evidence.** One journey listed the browser's network requests, and the listing carried the Access service-token headers the runner adds. The agent deleted that evidence and reran without the step. The value then sat in one place, that helper's local transcript, where it was replaced with a placeholder; a scan of the run folders, this repo, and the transcript folders finds no copy. Nothing was posted or uploaded.

### Verdict

- **An agent grading its own build: no sign of a problem.** 0 of 20 re-walked journeys disagree with the builder's verdict, and on the practice site 0 of 30 planted mistakes were passed. A second judging agent would have changed no verdict here. It stays declined, now on numbers.
- **The pass label covers less than it says.** 14 of 21 passed records leave a claim unshown (17 of 55 claims have no stated observation), and fresh agents did the same in 5 of 20 passes. The gap is not who grades. It is that a journey with one claim no probe reaches is still marked passed.
- **The record can't be checked later.** 0 of 6 walks left a picture a reviewer can open.
- **A walk can copy its own credentials into evidence.** Seen once in three walks.

The practice site could not have shown the second finding: its promises are written so every claim is reachable. The last three are follow-up work, not this change's.

Spend: about $21 on six practice runs; the four re-check agents ran inside this session and report no separate cost.

## Partly shown: today's wording against a longer one

2026-10-03 · `claude-opus-5` · `--framing builder` · twelve promises: 5 planted, 4 working, 3 with a part nothing can show (a nightly re-index, an audit-log entry, an email to the owner). Two runs per version, by the Decision log's rule for this measure.

**Today's wording** (`baseline-v3`, the live reference at `096e7e7`):

| run | caught | missed | false alarms | asked | named | overclaimed | other | minutes | cost |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 4/5 | 0 | 0/4 | 1 | 3/3 | 0 | 0 | 21.0 | $6.77 |
| 2 | 4/5 | 0 | 0/4 | 1 | 3/3 | 0 | 0 | 11.5 | $3.36 |
| total | 8/10 | 0 | 0/8 | 2 | 6/6 | 0 | 0 | 32.5 | $10.13 |

**The longer wording** (`partly-shown`: the live reference plus a "grade claim by claim" paragraph in § d, about 190 words in all with § f's mark):

| run | caught | missed | false alarms | asked | named | overclaimed | other | minutes | cost |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 4/5 | 0 | 0/4 | 1 | 3/3 | 0 | 0 | 5.9 | $2.77 |
| 2 | 4/5 | 0 | 0/4 | 1 | 3/3 | 0 | 0 | 12.2 | $4.22 |
| total | 8/10 | 0 | 0/8 | 2 | 6/6 | 0 | 0 | 18.1 | $6.99 |

Both asked on the same near-miss message as before, and nothing else differs.

**Verdict, by the keep rule:** the longer wording names 0 more of 6. It is not kept, and its file is deleted.

**What the tie shows.** Today's wording named every unshowable part as soon as it had a way to say so: the harness lists `partial` among the allowed verdicts for both versions. A real walk has no such word. Its comment offers a journey only `✅` or `❌`, which is why 14 of 21 real passes hid a gap and why fresh walkers wrote *pass* beside a part they named as unshown. The judgment was already there; the report had no place for it.

**What goes in, then:** the place, not the lecture. § f gains the `◐` mark and the full/part count, and § d gains three sentences that define *partly shown*. The claim-by-claim paragraph stays out.

**Limit.** This harness scores a verdict file, not the comment a walk writes, so the shipped § f text is not itself measured here. The first real `/verify` after this lands is its check.

Spend on the practice site: $38.17 over ten runs ($9.74, $11.31, $10.13, $6.99).

<!-- end evidence.md -->
<!-- file review.html utf8 50595 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-03-sharpen-verify</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-03-sharpen-verify">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-03-sharpen-verify</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The last 11 preview checks found nothing wrong: 6 passed, 5 had nothing to check, none failed. We can't tell whether the work was that good or the check is too easy to please, because the agent that built a change also picks what to try and grades the result. Before changing how it checks, we need a way to see whether a change helps.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A practice site with planted mistakes.</b> A small notes site with nine promises: five quietly broken, four that work. The checking agent sees the promises and the site, never the answers, and can be told it built the site. Each run reports mistakes caught, mistakes missed, false alarms, and how long it took.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">  HOW THE CHECK WAS MEASURED</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">  ══════════════════════════════════</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">  practice site        past real checks</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">  9 promises,          6 passed checks,</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">  5 broken             21 promises</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">       │                     │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">       ▼                     ▼</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">  today's check        fresh agents read</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">  runs 6 times         the records and</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">       │               walk them again</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">       ▼                     │</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">  30 planted                 ▼</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">  mistakes,            20 agree, 0 differ</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">  0 passed             14 records thin</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Today's check was measured, and it held.</b> Across six runs it passed none of 30 planted mistakes and raised no false alarm, even when told it had built the site.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Past real checks were checked again.</b> Fresh agents walked the six real checks that passed on recent publishes. They disagreed with none of 20; one could not be walked.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A pass says how much it showed.</b> When part of a promise can't be shown on the preview, the report marks that promise <i>partly shown</i> and names the part, in place of a plain pass. The overall result is still a pass when nothing was contradicted, so publishing is not held up.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">   BEFORE                AFTER</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">┌──────────────────┐  ┌──────────────────┐</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">│ PASSED: Greeting │  │ PARTLY: Greeting │</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">│ appears and is   │  │ Shown: appears,  │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">│ announced        │  │ keeps the name   │</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">│                  │  │ Not shown:       │</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">│ &quot;Hello, Sam!&quot;    │  │ announced (no    │</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">│ shows            │  │ way to hear it)  │</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">└──────────────────┘  └──────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>A check's evidence is scrubbed before it leaves the machine.</b> Saved passwords, keys, and tokens found in what a walk gathered or wrote are replaced with a placeholder before anything is posted or uploaded, and the report says so.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>No second judge, and no fan-out.</b> The fresh grader was not built: with nothing missed, a second judge had nothing to add.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>The record gets the numbers.</b> The page that explains why the check works this way now says what was measured about a second judge.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>You keep the practice site</b>, and a page on how to measure a change to a skill, for the next time the check's instructions are edited.</div></div></li>
</ol>
<p class="aside"><b>Left for its own change:</b> keeping a check's pictures where a reviewer can open them. None of the six past checks left one. It is planned in the workspace &quot;Keep preview check pictures with the transcripts&quot;.</p>
<p class="aside"><b>Non-goals:</b> Keeping pictures. Holding up a publish over a partly shown promise. Checking promises that run on a person's computer or in the chat. Running several helpers at once for speed. Running the practice test on every publish. Changing when publishing runs a check, or the scripts that find the preview and drive the browser.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked what the improved check should do better first → chose catching more mistakes on the preview; checking promises that run off the preview waits for its own change.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked whether to build the planted-mistakes test before changing the skill → chose test first.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: no fan-out of helpers for speed, because a check is two to six short journeys run by one script, and the wait is the upload, not the checking.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the practice site runs on the checking machine, not as a deployed preview, because the test measures how the agent writes journeys and grades evidence, and finding the preview is script work that is not changing.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the test stays in this repo and does not ship to installs, because a deliberately broken site and paid agent runs are a maintainer's tool.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the test runs by hand, never on every publish, because each run is a paid agent session and a check should run only when it can fail (Matthew's rule, 2026-10-01).</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: three runs per version, nine in all, because one run can pass or fail by luck and more than three costs more than this decision is worth.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: an idea is kept only if it catches at least 2 more of the 15 planted mistakes than the version before it and raises false alarms by at most 1, because a smaller gap across three runs is noise.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the keep rule is written down before any run, because a rule chosen after seeing the numbers bends toward the idea we like.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the grader is tried on top of the sharper bar, not alone, because the bar costs nothing per publish and the grader must beat it to be worth its minutes.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: ask before the grader goes in even when it wins, because the wiki records &quot;no second judging agent&quot; as a deliberate choice and the plan critic was dropped on 2026-09-22 for costing 8 to 15 minutes.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the hosted-workspaces paragraph that another open change adds at the top of the checking command is left alone, because this change edits other sections.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>Built the practice site, the scoring test, and the wiki page (tasks 1.1 to 1.6); no paid run yet. The headless agent gets a fixed tool list (<code>Bash,Read,Write,Edit,Glob,Grep</code>), because root cannot skip permission checks. The slow &quot;Saved&quot; control only trips a journey that takes its picture with no wait, since the page is settled once the network is idle.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>Baseline measured: today's check caught 15 of 15 planted mistakes with no false alarms across three runs (22 minutes, $9.74). By the rule fixed beforehand, the practice set is too easy and is made harder once.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the harder set also tells the agent it built the site and believes it works, because the first runs used an agent that never built anything, so it already had fresh eyes and no version could have shown the fresh grader helping.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the harder mistakes replace the first set, not sit beside it, because one practice set with one answer key is simpler to keep true.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>Built the harder practice set and the builder's point of view (tasks 2.3 and 2.4). Changed one planted mistake from the plan: a new note loses its last character after a reload, not its capitals, because a title typed all in lower case would have hidden the mistake.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>Harder baseline measured: 12 of 15 caught, 3 sent to a person, none missed, no false alarms ($11.31). The three were one case, a message one word off its quoted text, where asking is what the instructions say to do.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked what to do after today's check missed nothing on the practice site → chose to re-check the six past real passes with fresh agents. The two candidates are not run, and the check's instructions stay as they are.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the re-check walks the old previews again as well as reading the posted records, because the pictures from those checks no longer exist and the previews still answer, so a record alone holds only the builder's own words.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the re-walk changes no data on the previews, because they share a test database and a passed check is not worth disturbing it.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>Re-check done: fresh agents agreed with all 20 past journeys they could walk, so a second judging agent stays declined, now on numbers. The posted records were thinner than their verdicts: 14 of 21 leave a claim unshown.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the rule that a pass needs every part of the promise shown is taken back out of this change, because real checks do not behave that way today and a rule the check does not follow is a false record. It is left for the follow-up that fixes it.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the three findings (thin records, lost pictures, a token copied into evidence) are follow-up work, because each changes how the check behaves and this change was to measure first.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>One helper printed the access token once in its own local transcript. The value was replaced there, nothing was posted or uploaded, and a scan finds no other copy; the token was not rotated.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>The person asked whether the check itself was fixed; it was not. Asked how to handle the three findings → chose to fix all three, then, told the pictures touch code two other open changes are rewriting, chose a new workspace for the pictures and the other two fixes here.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked what the overall result should be when part of a promise can't be shown → chose still a pass, with the gap named.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked where pictures should be kept → chose Cloudflare, with the transcripts; planned in the new workspace, not here.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the partly-shown wording is measured before it goes in, on three new practice promises that each hold a part no page or address can show, because that is the rule this change set for itself.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: two runs per version for this measure, not three, because the expected gap is large (today's check has no word for a partly shown promise) and the person was told roughly $10 to $15; a third run is added only if the two disagree.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the wording is kept if it names at least 2 more of the 6 partly-showable promises than today's check, catches no fewer than one less of the 10 planted mistakes, and raises false alarms by at most 1, counting a fully shown working promise marked &quot;partly&quot; as a false alarm.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the scrub reuses the one that already cleans transcripts, because one list of what counts as a secret is easier to keep right than two.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: pictures are not scanned for secrets, because a picture's text can't be read by the scrub; the instructions tell a walk not to capture request details.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>Agreed with the chat planning the pictures change: this change publishes first and that one builds on it. This one keeps the grading section, the report's summary line, the partly-shown example, and the scrub; that one keeps the block that uploads pictures and uploads only after the scrub has run.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>The publishing order agreed with the pictures change (PR #249) no longer holds: the person chose to build that one now, so whichever publishes second brings the other in. The split of who edits what stands: this change keeps the grading section, the report's summary line, the partly-shown example, and the scrub at the top of the upload step; that one keeps the rest of the upload step and the picture lines.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>Measured the partly-shown wording: today's instructions and a longer version both named all 6 unshowable parts, so the longer version is not kept. Today's check named them as soon as it had a word for it, which a real report lacks. What goes in is that word: a mark in the report and three sentences defining it.</li>
<li class="decision card" id="decision-37" data-note="decision-37" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the report's mark ships though the test could not score it, because the person chose that a partly shown promise be named, real reports show the gap (14 of 21), and the test scores a verdict list, not the report a check writes. The next real check is its test.</li>
<li class="decision card" id="decision-38" data-note="decision-38" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the scrub replaces every value from the secrets file of eight characters or more, secret or not, because a missed secret posted in public costs more than a placeholder where an email address was; the instructions say to read the picture when a placeholder appears.</li>
<li class="decision card" id="decision-39" data-note="decision-39" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the scrub's result line sits with the run step in the instructions, not beside the upload step, so the pictures change can rewrite the upload step without a clash.</li>
<li class="decision card" id="decision-40" data-note="decision-40" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>Archive checkpoint for release 29.12.0, after bringing in 29.11.0 from main; the changelog keeps both entries with this one on top.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
