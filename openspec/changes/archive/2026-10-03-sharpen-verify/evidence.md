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
