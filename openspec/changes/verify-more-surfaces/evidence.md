# Verification evidence

## First real command-line pilot — 2026-10-04

Source/capture head: `c43f71eb37a1153616c39f9ef65642c94805f827`. Repository: `matthewwong525/WongStack`. Workflow: `.github/workflows/payload.yml`. [Push run 37176178657](https://github.com/matthewwong525/WongStack/actions/runs/37176178657), attempt 1, completed successfully. Downloaded artifact: `verify-memory-areas`, ID `11292858098`, 14-day retention. GitHub server identity matched the manifest repository, workflow, head, actual subject revision, run and attempt. Every retained stream matched its SHA-256 digest. The complete required gate passed; script coverage was 91.82% lines and 88.58% branches, with existing thresholds unchanged.

| Canonical memory scenario | Observed raw output and state | Coverage |
|---|---|---|
| A fact names the code area it concerns / No mapped folder | `No mapped area for these paths.`, exit 0, no facts | Shown |
| A fact names the code area it concerns / The store is unreachable | `Memory was not loaded (no memory store is recorded in .claude/.wong-stack.json; run /wong-sync to plan it); go on without it.`, exit 0 | Graceful unconfigured-store behavior shown; configured service network outage not exercised |
| One lookup shows everything linked to a path or topic / A mini-app file | `mini-apps` and `worker`, both named docs, seeded archived change and backlink precede unavailable-memory warning, exit 0 | Partly shown: the promised actual memory facts require a real configured service |

The isolated repo had neither `.env` nor an installation record. Before/after fixture file digests matched for all three calls. Cleanup removed the temporary fixture, while stdout, stderr and the manifest survived outside it. This is an actual current-source CLI observation, not practice-site or forged evidence. It establishes no service connectivity, network outage, configured facts, full setup, or conversation behavior. No before/after repair claim is made by this head-only pilot.

Producer tests exercised real nonzero output (exit 7), unavailable executable, source mismatch/missing source, scrub-before-digest and output retention. Product command failure remains captured evidence; inability to start remains a capture gap. No repository implementation ran locally to supply missing evidence.

`/save`: branch `heroic-eagle`, [PR #261](https://github.com/matthewwong525/WongStack/pull/261), gate SUCCESS. CI-discovered preview: https://heroic-eagle-wongstack-staging.matthewwong525.workers.dev. Session facts were skipped because this checkout has no registered session; the living proposal and this evidence file retain the handoff.

## Remaining evidence

Recipe/collector, paired captures, measured instruction changes, practical regression and final integration have not yet been proved. Subsequent sections will retain their exact revisions and limits.

## Recipe and collector compatibility — 2026-10-04

The project-owned recipe resolves both current memory entry-point files, the capture guide, existing workflow and all three requirement-qualified canonical scenarios. The collector's read-only validator accepted the downloaded historical pilot from `/tmp/wong-verify-pilot-c43f71e` against the server identity recorded above: three records, intact stream digests and retained cleanup observations. This validates compatibility with actual artifact bytes; it is not fresh evidence for the collector implementation. No memory implementation executed on the host.

The collector and its rejection tests await the next required automated-check gate. Fixed-name artifact upload now replaces the previous attempt's artifact, so a rerun can retain its newest attempt; no previous passing attempt is substituted when that capture is missing or invalid.

## Collector fresh-head proof — 2026-10-04

Source/capture head `21d54b7f940f16feff144a758c4408c8a64964d3`, [push run 37177221220](https://github.com/matthewwong525/WongStack/actions/runs/37177221220), attempt 1: all required checks passed. The collector itself queried GitHub, chose this exact-head workflow run, downloaded `verify-memory-areas`, validated its repository/workflow/source/run/attempt, stream sizes/digests and safe paths, rechecked the attempt, and returned `state: collected` with all three captured exit-0 observations. The original local-document/service gaps remain unchanged. No code from the artifact executed locally. CI-discovered preview remains the recorded branch preview.

Three CI repairs preserved the gate and assertions: malformed `then` is represented as JSON protocol data to satisfy the thenable lint rule; receipt scenarios are copied independently from the recipe so invalid-evidence mutations cannot change the oracle. The resulting suite passed. Shared collector behavior tests cover wrong revisions/attempts, qualified scenario mismatch, missing/duplicate records, malformed JSON, digest/size mismatch, traversal/symlinks and interrupted-download cleanup.
