# Retained preflight regression practice

The meta-only [producer](../../verify-preflight-regression.mjs) reuses the retained `default preflight still discovers the preview and checks its browser` check in [the script suite](../../tests/verify-scripts.test.mjs). It observes the actual preflight shell script in earlier source `ab27e29989bbf4074b8949210d1c7cae2f64ae25` and the exact saved head, without editing either source. This is practice evidence: the existing disposable fixture supplies a mocked saved-head preview and browser, while shared current-source memory helpers and the same test assertions stay fixed. The fixture's temporary Git head is only the lookup input; `subjectSha` identifies the actual script source.

## Capture and inspect

The [payload workflow](../../../.github/workflows/payload.yml) runs the complete required suite once, then captures just this focused check on each source. Its `verify-preflight-regression` artifact retains `capture.json`, `before.stdout.txt`, `before.stderr.txt`, `after.stdout.txt` and `after.stderr.txt` for 14 days. Normal `/save` supplies the observation; there is no local execution mode or deliberately red checkpoint. Docs-only skipping, permissions, timeouts and the delivery gate stay intact.

Match repository/workflow/head/run/attempt to the newest branch-push run. Inspect the exact subject revisions, identical `check` and `argv`, source/test digests, stream digests and cleanup. Earlier output must show `RESULT: READY` with shell exit 1 and the retained assertion's `1 !== 0` failure. Repaired output must show `RESULT: READY`, shell exit 0 and one passing check with no failure. A different assertion failure or harness timeout cannot supply intended failing-before proof. No general behavior collector recipe is claimed for this practice artifact.

The actual `ab27e29989bbf4074b8949210d1c7cae2f64ae25` Git-source capture is required to complete this change's demonstration. Future squash merges need not retain that branch ancestor: unavailable earlier source becomes a named `before` gap with no failing-before claim, while the exact head check still runs and must pass. Missing history cannot conceal a head failure or weaken the required suite.

Producer tests create disposable commit history from [immutable earlier script bytes](preflight-before.sh), copied verbatim from that actual source revision by the parent. Their SHA-256 is `d2bf1de277f93358017b484ec3610a5252f8e9108c280867ed2516eb3d81e573`. The retained check, shared helper inputs and current script remain the same. These synthetic test commits prove capture behavior and the missing-history/head-failure cases, not actual `ab27` Git-source provenance. Tests depend on no unpublished branch reference, and the meta-only fixture never ships to an installed project.

The complete head suite also keeps this default-preflight assertion passing. Both sources use separate disposable fixtures, and the earlier source worktree is removed after capture. Only essential observed text and the run link belong in the final report; the artifact can expire.

## Repair decision practice

Use [the repair rule](../../../.agents/skills/verify/references/walkthrough.md#e--after-a-failure) on these two cases and retain the resulting scope judgement, action and report limitation in the change's evidence. These are decision simulations, separate from the exact-source preflight capture.

- **Impractical harness:** this change owns a failed external delivery promise and touches its handler, but existing CI has no sandbox receiver or safe delivery readback. A disposable initiating request was captured; no practical lasting test can show actual delivery. Preserve that reproduction and name missing failing-before/delivery proof. Apply only the authorized in-scope bounded repair; require its ordinary checks, without adding infrastructure or weakening them. The initiating success cannot prove delivery.
- **Out of scope:** a confirmed consumer in another capability returns a stale value, but its contradicted expectation is absent from this change's own scenarios and its handler is untouched by the branch. Preserve shared data, report the failed observation and why it is out of scope, finish independent safe checks, and make no consumer repair or regression-test change. Additional observation grants no repair authorization.
