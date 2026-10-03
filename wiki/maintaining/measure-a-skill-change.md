# Measure a skill change

Measuring a skill change means running the skill's instructions against a practice site with planted mistakes, before and after your edit, and keeping the edit only if it catches clearly more. One skill has a practice site today: [`/verify`](../../.agents/skills/verify/SKILL.md), through [`scripts/eval-verify.mjs`](../../scripts/eval-verify.mjs).

## When to measure

Measure before you change how the walk [writes journeys](../../.agents/skills/verify/references/walkthrough.md#b--write-the-journeys) or [grades evidence](../../.agents/skills/verify/references/walkthrough.md#d--grade-against-the-written-expectation). Those two sections are judgment, and a test can't tell a sharper instruction from a longer one. Script work, like finding the preview, needs a test instead.

Run it by hand, never in CI: every run is a paid agent session.

## Run it

```bash
node scripts/eval-verify.mjs --label baseline
node scripts/eval-verify.mjs --label my-idea --reference path/to/candidate.md
```

The first line measures [the live walkthrough reference](../../.agents/skills/verify/references/walkthrough.md). The second measures a candidate: a full copy of that file with your edit, kept in your change's folder. The live skill changes only after the numbers are in.

Each line makes three runs. Add `--runs 1` for a smoke test.

A run does this:

1. Starts [the practice site](../../scripts/fixtures/verify-eval/site.mjs), a small notes app that makes [twelve promises](../../scripts/fixtures/verify-eval/change/specs/notes/spec.md). Five are quietly broken; four work; three work and add a part no page can show, like an email sent to the owner.
2. Hands a headless agent the promises, the site, and the reference, in a temp folder outside the repo. The agent never sees [the answers](../../scripts/fixtures/verify-eval/key.json).
3. Scores the agent's verdicts against the answers.

## Grade as the builder

```bash
node scripts/eval-verify.mjs --label baseline --framing builder
```

`--framing builder` tells the agent it built the site, and hands it [build notes](../../scripts/fixtures/verify-eval/build-notes.md) that say all twelve promises work. The notes are right about the four that work, wrong about the five that don't, and sure of the three parts nobody can see.

Use it to measure an idea about who grades, such as a second, fresh grader. Without it the agent never built the site, so it already grades with fresh eyes, and no version can show a fresh grader helping. Compare versions only under the same framing.

Notes pull less than a session that really built the code. A gain here is the least you'd see; no gain doesn't prove a builder grades its own work fairly.

## Read the table

| run | caught | missed | false alarms | asked | named | overclaimed | other | minutes | cost |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 3/5 | 2 | 0/4 | 0 | 2/3 | 1 | 0 | 6.2 | $1.10 |
| 2 | 2/5 | 2 | 1/4 | 1 | 1/3 | 2 | 0 | 5.8 | $1.05 |
| 3 | 4/5 | 1 | 0/4 | 0 | 2/3 | 0 | 1 | 6.9 | $1.25 |
| total | 9/15 | 5 | 1/12 | 1 | 5/9 | 3 | 1 | 18.9 | $3.40 |

- **caught**: broken promises the agent failed. Higher is better.
- **missed**: broken promises it passed, called partly shown, or never graded.
- **false alarms**: working promises it failed or called partly shown. One working promise is slow on purpose, so a journey that doesn't wait shows up here.
- **asked**: promises it sent to a person. Counted apart, never as caught.
- **named**: promises with a part no page can show that it called partly shown (`partial`). Higher is better.
- **overclaimed**: those same promises given a plain pass.
- **other**: those same promises failed, sent to a person, or never graded.
- **minutes** and **cost**: the wall time, and what the agent reported spending.

The last line printed names `results.json`, which holds each promise's verdict. Each run's verdicts and agent output sit beside it.

## The keep rule

Write the rule down before the first run: a rule chosen after the numbers bends toward the idea you like.

1. **Measure the live reference first.** If it catches every planted mistake with at most 1 false alarm, the test is too easy. Make the planted mistakes harder once and rerun. Still perfect: change no skill file.
2. **Keep a candidate** only if it catches at least 2 more of the 15 planted mistakes than the version before it, and false alarms rise by at most 1.
3. **Drop anything else.** A smaller gap across three runs is noise; report it as no clear gain.

Put each table in the change's record with the date, the model, and the cost, whichever way it goes.

## Check real walks too

A practice site measures only what its promises let it. Nine of its twelve promises are written so every claim can be checked, and the other three cover one kind of gap: a part no page can show. Go back over real walks as well:

- **Read the record.** Hand a fresh agent each journey's `THEN` and the posted evidence text, verdict marks removed. It says, claim by claim, whether the text states an observation.
- **Walk it again.** Branch previews outlive their pull requests. Hand fresh agents the scenario names, the `THEN`s copied word for word, and the address; they never see the first verdict. Change no data.

The first run, on 2026-10-03, found no verdict a second judge would change, and found that 14 of 21 passed records left a claim unshown. [The staging walkthrough](../development/staging-walkthrough.md#what-it-is-not) records the first; the second came from reading real walks, not from the practice site.

## Give the answer a place before you add instructions

When a skill's output looks too kind, check its report format first. The walk's comment once offered a journey only a pass or a fail, so an agent that saw a gap wrote *pass* and mentioned the gap beside it. Given a third mark, today's wording and a 190-word grading paragraph both named 6 of 6 gaps: the mark was the fix, not the paragraph.

The same test shows the trap in measuring it. A harness whose prompt lists the new verdict hands that word to both versions, so it can't tell wording that supplies the word from wording that doesn't. Score what the skill writes for a person, such as the comment, when the format is what you're changing.

Part of [maintaining WongStack](README.md).
