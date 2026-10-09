# Observed acceptance — 2026-10-09

Implementation is built on `schedule-skill-proactive`, PR #346, and remains unmerged. The chosen default is ordinary fixed-cadence goal checks. Exact adaptive wake-ups retain post-session verification guards but are optional. The chosen fixed-mode live acceptance passed. Optional exact adaptive clock changes remain unavailable on this installed host.

## Local checks

All 77 scheduling `schedule-*.test.mjs` tests passed, including format/schema, record-only publication/archive, CLI listing, legacy management, native receipts, progress ownership and lifecycle. The newest cases cover consecutive read/draft runs without an outreach interval, contact frequency after a read, wrong-year timing receipts, the combined view's timing mismatch, unavailable post-run update capability, and completion suppressing work even when adaptation is unavailable. The full repository worktree pre-check passed, including the script suite, app checks, payload links/config/retirement/specs, wiki, lint and context budget. Shellcheck is unavailable locally and remains enabled in CI. These are pre-checks; remote CI is the delivery gate.

## Isolated publication and actual later sessions

Temporary private repository `matthewwong525/wongstack-schedule-trial-20261009-021416-v3` used gated source `d86d435bd5aba1d88b1b21b5bc9c77f3c7327b76`, synthetic input, an external durable local progress route, read-only authority, bounded expiry, and explicitly selected full-access mode for the diagnostic. No real contact, call or payment was made. Each selected record used the ordinary save/ship record route and confirmed no configured CI before the PR-review gate. The implementation PR was never merged.

| Observation | Actual evidence | Result |
| --- | --- | --- |
| Routine definition published separately from goals | Routine PRs 1/2; combined schedule listing | Passed; no routine OpenSpec goal |
| Unfinished finite goal published and remains open | Goal PRs 3/4; combined listing and OpenSpec index | Passed; goal task remains unchecked |
| Fresh probe can read instructions/progress and inspect its own job | Job `820df7fb`, agent `696fe20a-6efe-4331-a056-ab7fee233e3f`, natural fire 04:07 UTC | Passed for local access and owned stopping; probe self-deleted before session end, so not post-run adaptation proof |
| Routine fires later and stays scheduled | Job `efffb5a7`, agent `52a0d69b-05e2-4f30-ad4c-12280ae27c7c`, natural fire 04:15 UTC, next fire 04:20 | First read passed; second read exposed the now-fixed contact interval bug. The subsequent fixed-mode trial below verified four successful reads |
| Goal checks published instructions and requests new wake | Job `3a2a7a58`, agent `69c4a4f8-2328-4bdc-807d-d6bbe0bfebd1`, natural fire 04:15 UTC | Requested 2026-10-09 04:18, but Paseo rewrote it to 2027-10-09 04:18 after session end; failed |
| One persisted question delivered | Parent repaired the clock after session end; agent `203ab024-2a0b-486c-a456-23c295f5a518` fired naturally 04:23 UTC | One synthetic inbox question, pending with deferred read; no answer or call. Its 04:26 wake was again moved to 2027 |
| Owned cancellation and terminal archive | Routine PR13 merged `bec6f71783e240901a506248048eef8819cd2a39`; goal archive PR14 merged `24db6d2ec5dd0f26daa552a385ec3326fac1957e` | Passed; disabled routine retained, cancelled goal archived with its unchecked completion task. No capability spec files changed |

That first goal was cancelled, not completed. Its unobserved waiting/answer/completion phases were verified in the subsequent fixed-mode trial below.

## Host findings and optional adaptation

Installed public Paseo CLI 0.10.1 advertises `--no-max-runs` but rejects it with `INVALID_INTEGER`. The adapter avoids needless clearing only after inspecting an already-unlimited owned job. Default auto mode requested command approval in a later session; approved trial mode was retained explicitly, never widened silently.

Paseo's `finishRun` advances the already-updated `nextRunAt` instead of retaining a future time chosen during the run. A one-time cron consequently jumps a year. A repair is prepared at `/tmp/wong-paseo-reschedule.patch`; it retains a future clock when it differs from that run's `scheduledFor`. Isolated tests of the installed original reproduced the year jump; the patched copy preserved the requested time and retained normal recurrence, pause, run-cap and terminal behavior. Neither the installed scheduler nor daemon has been modified. The owner chose ordinary periodic goal checks instead; the repair question is withdrawn. No shared-host modification or restart is authorized.

The prepared patch is not a requirement for this change. The final trial uses ordinary Paseo Schedules with `adaptive:false`, `update:false`, `updateAfterRun:false` and no requested `nextAt`. Every natural session checks completion first, retains one unanswered question, and only completion triggers owned cancellation. Exact clock changes remain unavailable on this installed host and are not claimed.

Codex and Claude CLI help and the callable-tool inventory expose no independent native scheduler for these repository sessions. Page-controller and Sites automations are different destinations, not evidence of repo-session readiness. Their adaptive modes remain unavailable here. Host runbooks and contract fixtures are authored; no real later Codex/Claude native session or cloud self-management is claimed. The Claude native-name collision and cloud restrictions are retained in the documented discovery route.

## Cleanup

All captured synthetic native IDs were cancelled/deleted and inspected absent. Eight closed agents from the initial trial and eleven from the fixed trial were deleted only from the exact synthetic checkouts. Final agent inventory has no remaining trial agents. Native inventory contains only pre-existing IDs `719bc428`, `dc101425`, `704743e2`, `d9a87abe`; their names, targets, cadence and bounds match the pretrial capture. No existing job, secret or cloud resource was changed.

The four owner-verified private fixture repositories (`wongstack-schedule-trial-20261009-021416`, its `-v2` and `-v3` variants, and `wongstack-fixed-schedule-trial-20261009-145658`) and both exact local trial directories were removed after the terminal archives passed. Nonsecret native evidence, journals, publication receipts and final preservation proof were retained outside Git at `/root/.local/share/wongstack/schedule-trial-evidence/20261009-host-scheduled-work`; fixture clones, business integrations and credentials are excluded. The finite archive diff confirms no `openspec/specs/` modifications.

## Fixed-mode source verification

The approved fixed-mode refinement needed no lifecycle implementation change. Its multi-session regression forbids host clock updates and covers one question, a later completion check while waiting, the identified answer, an authorized read, and completion before any more work with verified owned cancellation. The full local repository pre-check passed; shellcheck stays enabled in remote CI. The following observations come from actual later native sessions.

## Passed fixed-mode native trial

Gated source `7168534e1d2bef6ed153e680e89cfaa0aad1af5f` passed all remote checks without a rerun. The temporary private fixture `matthewwong525/wongstack-fixed-schedule-trial-20261009-145658` used ordinary every-minute Schedules, bounded expiry, synthetic input, read-only authority, explicitly approved diagnostic full-access mode and a durable local continuation. `adaptive`, `update` and `updateAfterRun` were false; the harness throws if a native timing update is attempted. No shared-host repair or restart occurred.

- Probe `d83bacca`: two distinct later sessions read published routine/goal records, persisted/read progress, excluded another claim, and then verified owned stopping.
- Routine `07c3d7c9`: four successful naturally scheduled reads; it stayed configured after success and had no OpenSpec routine goal. Parent then verified owned cancellation and published its disabled definition.
- Goal `6b33dd08`: five distinct fresh sessions on the same native identity. At 15:15 UTC it checked incomplete input and read; 15:16 delivered one question; 15:17 checked completion again and preserved waiting without a duplicate or deferred action; after the identified synthetic owner answer, 15:18 performed the authorized read; 15:19 checked the now-complete input before more work, marked completion and verified native deletion. The native session then ended. The question count stayed one and the receipt count stayed two.
- The completed goal archived through the normal record-only prepare/save/inspect/finish route, retaining completion evidence and verified stop. Archive publication merged `35eb6a9edebe00bb85439123684de1bfd68cbc28` (saved record `d5a518f1620da166303fb52d9efe38cdd424039b`, no configured CI, confirmed PR-review gate). Its checklist is complete; the active goal disappeared. Diff inspection confirms no capability spec changes.
- Final native read-back shows all three captured trial IDs absent and all four pre-existing schedule definitions unchanged. No real messages, calls, payments, business schedules or implementation merge occurred.

Record-scope guards also rejected an incomplete baseline and a new archive branch carrying a previous routine publication. Completing the declared fixture baseline and basing the selected archive branch on the actual latest published main revision resolved these fixture setup issues without changing code or bypassing checks.
