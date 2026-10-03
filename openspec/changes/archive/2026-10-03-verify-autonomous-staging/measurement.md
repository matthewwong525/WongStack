# Verification instruction measurement

Measured 2026-10-03, one isolated practice run per version. Model: inherited Codex session model; the host exposes no exact identifier or per-agent cost. Approximate elapsed time: baseline 4 minutes, candidate 5 minutes. Cost is unavailable.

The normal `scripts/eval-verify.mjs --label autonomous-baseline --runs 1` attempt ended with HTTP 429 before any model tokens or verdicts: its CLI account had reached its weekly limit. Its displayed zero scores are not a measurement.

Instead, two independent delegated agents received the same twelve practice promises, separate disposable instances of the existing practice site, their own temporary evidence directories, and the baseline or candidate reference. Neither received the answer key, implementation, or the other agent's output. They used the existing verification driver and browser. The parent scored their verdict files against the existing key using the evaluator's caught/missed/false-alarm rules.

| Version | Planted failures caught | Missed | Working promises failed | Working passed | Asked | Unobservable claims named | Overclaimed | Ungraded |
|---|---|---|---|---|---|---|---|---|
| Baseline | 5/5 | 0 | 0/4 | 3/4 | 1 | 3/3 | 0 | 0 |
| Candidate | 5/5 | 0 | 0/4 | 3/4 | 1 | 3/3 | 0 | 0 |

Both agents deferred the meaning of “Saved badge” rather than assuming that plain inline Saved text met it. Both caught the incorrect empty-title message, wrong deletion, invalid API creation side effect, truncated title after reload, and nonmatching search row. Both named nightly indexing, audit logging, and email delivery as unobserved claims.

The result supports retaining the existing detection standard while changing when help is requested. This is a single-run comparison, not evidence of improved detection or a statistical benchmark. Candidate sections a, b, and d were held stable during measurement; subsequent cuts to report prose and execution dependency instructions did not change the grader.

The practice fixture measures grading, not shared-data isolation or credential handoff. See [the verification review](verification.md) for those instruction checks; their runtime enforcement remains the agent's responsibility.

The later simulation and skip additions live in report section f and the skill entrypoint. Sections a (scouting), b (journey writing), and d (grading) are byte-identical to the measured candidate, confirmed against a scratch copy before this revision. No grading changes required another practice run; the table above remains the applicable grading evidence. The revised simulation and skip cases are reviewed in [verification](verification.md), separately from the practice scores.
