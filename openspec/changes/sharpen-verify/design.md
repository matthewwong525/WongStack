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

## Risks / Trade-offs

- **Three runs are noisy** → the 2-of-15 margin, and the rule fixed in advance. A near miss is reported as "no clear gain".
- **The agent finds the answers** → temp folder outside the repo; the prompt gives only the reference and the runner's path. The harness test asserts the work folder holds no key or site source.
- **The fixture is unlike a real preview** (no Access, no deploy lag) → intended: those are script work. The first real `/ship` after a candidate lands still shows whether it holds up.
- **"Try to break it" raises false alarms** → control scenarios 6 to 9 measure that; the rule caps the rise at 1.
- **`run` assumes a repo root** → the work folder is `git init`ed. If the runner still needs repo files, set them through env, never by running the agent inside this repo.
- **A scorer that can't fail** → the harness test runs a fake agent that passes everything (must score 0 caught) and one that fails everything (must score 4 false alarms), and checks each planted mistake shows on the site.
- **Cost** → nine runs, each a full agent session; the harness prints the reported cost per run, and `--runs 1` is a smoke test.
- **The audit helper touches the host** → the prompt forbids installers, cache deletion, and writes outside `$RUN_DIR`.
