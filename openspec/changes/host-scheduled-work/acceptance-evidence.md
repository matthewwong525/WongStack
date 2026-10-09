# Observed acceptance — 2026-10-09

Implementation is built on `schedule-skill-proactive`, PR #346, and remains unmerged. The latest correction requires proof that a changed wake survives the current session ending; an immediate native read-back is insufficient. This document records observations, not a completed adaptive acceptance claim.

## Local checks

All 76 focused `schedule-*.test.mjs` tests passed, including format/schema, record-only publication/archive, CLI listing, legacy management, native receipts, progress ownership and lifecycle. The newest cases cover consecutive read/draft runs without an outreach interval, contact frequency after a read, wrong-year timing receipts, the combined view's timing mismatch, unavailable post-run update capability, and completion suppressing work even when adaptation is unavailable. The full repository worktree pre-check passed, including the script suite, app checks, payload links/config/retirement/specs, wiki, lint and context budget. Shellcheck is unavailable locally and remains enabled in CI. These are pre-checks; remote CI is the delivery gate.

## Isolated publication and actual later sessions

Temporary private repository `matthewwong525/wongstack-schedule-trial-20261009-021416-v3` used gated source `d86d435bd5aba1d88b1b21b5bc9c77f3c7327b76`, synthetic input, an external durable local progress route, read-only authority, bounded expiry, and explicitly selected full-access mode for the diagnostic. No real contact, call or payment was made. Each selected record used the ordinary save/ship record route and confirmed no configured CI before the PR-review gate. The implementation PR was never merged.

| Observation | Actual evidence | Result |
| --- | --- | --- |
| Routine definition published separately from goals | Routine PRs 1/2; combined schedule listing | Passed; no routine OpenSpec goal |
| Unfinished finite goal published and remains open | Goal PRs 3/4; combined listing and OpenSpec index | Passed; goal task remains unchecked |
| Fresh probe can read instructions/progress and inspect its own job | Job `820df7fb`, agent `696fe20a-6efe-4331-a056-ab7fee233e3f`, natural fire 04:07 UTC | Passed for local access and owned stopping; probe self-deleted before session end, so not post-run adaptation proof |
| Routine fires later and stays scheduled | Job `efffb5a7`, agent `52a0d69b-05e2-4f30-ad4c-12280ae27c7c`, natural fire 04:15 UTC, next fire 04:20 | First read passed; second read exposed the now-fixed contact interval bug. The correction has not had a second live trial |
| Goal checks published instructions and requests new wake | Job `3a2a7a58`, agent `69c4a4f8-2328-4bdc-807d-d6bbe0bfebd1`, natural fire 04:15 UTC | Requested 2026-10-09 04:18, but Paseo rewrote it to 2027-10-09 04:18 after session end; failed |
| One persisted question delivered | Parent repaired the clock after session end; agent `203ab024-2a0b-486c-a456-23c295f5a518` fired naturally 04:23 UTC | One synthetic inbox question, pending with deferred read; no answer or call. Its 04:26 wake was again moved to 2027 |
| Owned cancellation and terminal archive | Routine PR13 merged `bec6f71783e240901a506248048eef8819cd2a39`; goal archive PR14 merged `24db6d2ec5dd0f26daa552a385ec3326fac1957e` | Passed; disabled routine retained, cancelled goal archived with its unchecked completion task. No capability spec files changed |

The goal was cancelled, not completed. A waiting later check, identified simulated answer, natural resumption, and synthetic-completion stopping remain unobserved. Task 7.4 stays open. Task 7.6's normal publishing decision waits for acceptance.

## Host findings and pending repair

Installed public Paseo CLI 0.10.1 advertises `--no-max-runs` but rejects it with `INVALID_INTEGER`. The adapter avoids needless clearing only after inspecting an already-unlimited owned job. Default auto mode requested command approval in a later session; approved trial mode was retained explicitly, never widened silently.

Paseo's `finishRun` advances the already-updated `nextRunAt` instead of retaining a future time chosen during the run. A one-time cron consequently jumps a year. A repair is prepared at `/tmp/wong-paseo-reschedule.patch`; it retains a future clock when it differs from that run's `scheduledFor`. Isolated tests of the installed original reproduced the year jump; the patched copy preserved the requested time and retained normal recurrence, pause, run-cap and terminal behavior. Neither the installed scheduler nor daemon has been modified. The owner has been asked before this shared-host change and restart.

After approval, verify the actual loaded module, preserve existing definitions, apply only the reviewed repair, and observe two genuinely later probe sessions on the same job: a clock changed during the first must survive completion and fire the second at the requested time. Only then set `updateAfterRun` and repeat the unobserved routine/goal phases using the latest gated source. Rejected or unanswered approval leaves adaptive scheduling unavailable on this host; do not replace it with an unapproved service or silently change the agreed acceptance.

Codex and Claude CLI help and the callable-tool inventory expose no independent native scheduler for these repository sessions. Page-controller and Sites automations are different destinations, not evidence of repo-session readiness. Their adaptive modes remain unavailable here. Host runbooks and contract fixtures are authored; no real later Codex/Claude native session or cloud self-management is claimed. The Claude native-name collision and cloud restrictions are retained in the documented discovery route.

## Cleanup

All captured synthetic native IDs were cancelled/deleted and inspected absent. Eight closed agents in the exact synthetic checkout were then deleted; the returned native agent inventory contained no remaining trial agents. Final native inventory contains only pre-existing IDs `719bc428`, `dc101425`, `704743e2`, `d9a87abe`, active at the same UTC next times (12:00, 20:30, 07:00, 10:30 respectively). No existing job, secret or cloud resource was changed. Temporary fixture repositories and data are retained solely for audit/continuation pending the host decision; remove only those exact fixtures when the trial is resolved. Raw local diagnostic files live outside Git and contain no intended business data. The finite archive diff confirms no `openspec/specs/` modifications.
