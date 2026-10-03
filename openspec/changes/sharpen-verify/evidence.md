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
