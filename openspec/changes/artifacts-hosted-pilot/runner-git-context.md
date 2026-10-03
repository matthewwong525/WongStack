# Trusted runner Git context

## Observed failure

The real wh1005 candidate reached the shared checks: app assertions passed, then Knip raw-transfer memory allocation and the Git-based loosened-check audit failed. The pinned SDK checks out the actual SHA under `/tmp/ci-source` but copies its files to the workspace with `.git` excluded. No bundle, preview or publication resulted. The trial is now closed; source repairs do not authorize another live trial.

## Same checks, bounded preparation

Use `KNIP_DISABLE_RAW_TRANSFER=1` in the common check entry to select [Knip’s documented normal parser](https://knip.dev/reference/known-issues#raw-transfer-memory-errors). Analysis, suites and floors remain unchanged for GitHub and hosted callers.

Override only the SDK checkout credential methods through its supported provider adapter: private project state issues one read grant for the exact active candidate and records a minting intent, acknowledged credential identity and expiry. The SDK checkout and trusted preparation share that grant. No other SDK read/write issuance or step credential environment is allowed. An ambiguous mint acknowledgment remains blocked for operator reconciliation; it cannot silently mint another token, retry or report cleanup complete.

The preparation runner executes service-owned code only. Validate the real SDK checkout SHA, exact owned remote and regular Git metadata; reconstruct only objects/shallow state with fresh credential-free config, no hooks, helpers, authorization headers, URL rewriting or external alternates. Fetch only the exact candidate/base commits to a finite depth, with the read token in environment rather than arguments/config. Reject missing ancestry or wrong SHA/origin before candidate code runs. Emit one bounded identity receipt, then revoke the exact read grant with provider readback and persist that observation. Failed preparation and stop also revoke known grants. A failed revocation leaves the candidate blocked, never ready for build or cleanup.

The build is a fresh chained SDK runner from the prepared filesystem snapshot, with no inherited preparation environment and no source/platform credentials. The pinned SDK overlays a source checkout even after restoring a snapshot. After observed revocation, the adapter points that overlay at `file:///workspace`, the exact restored Git repository, with an empty token. This uses real local objects without network credentials or untracked issuance; a missing restore fails closed. Candidate code receives only its existing exact-bundle upload capability. Require actual Git HEAD and absence of unsafe Git configuration before the shared checks.

## Comparison base

The production and recorded main SHA remain separate publication guards. If the queued main SHA already equals the candidate, compare checks against the previous published production SHA; for the first installation that is null and full checks run. Otherwise use the recorded main SHA, preserving branch comparison. Never compare a candidate to itself to establish a proven skip. Fetch bounded ancestry so the unchanged shared merge-base/audit logic can run; an initial commit has no prior comparison to audit.

## Evidence limits

Meaningful remote source tests execute preparation against disposable real Git repositories, with distinct commits and a shallow SDK-shaped checkout. They cover malformed/symlinked credentials/metadata, private tokens, fetch failure, wrong identity, initial/full and later base comparisons, grant revocation failure, stop, interrupted mint acknowledgment and unchanged public status. A regression executes the actual pinned SDK checkout script, with only its temporary path isolated, against that real local Git snapshot and proves credential-free overlay plus missing-restore failure. Mocked runner/controller contracts verify the preparation receipt and fresh environment boundary, not actual provider/R2 snapshot behavior. Actual corrected pipeline acceptance remains task 12.13 and cannot be inferred from a source PASS.

## Exact source gate

`b715234c6bf28fb03881caf0a34d98dc111f7ef7` passed required push [Deploy37149848860](https://github.com/matthewwong525/WongStack/actions/runs/37149848860), [Test37149848847](https://github.com/matthewwong525/WongStack/actions/runs/37149848847) and [Payload37149848859](https://github.com/matthewwong525/WongStack/actions/runs/37149848859). 1,141 script cases passed with zero failures/skips; lines92.42% and branches88.57%, unchanged floors/includes/exclusions. The actual pinned SDK local-overlay regression and real shallow-Git preparation tests passed in the remote suite. No provider trial, R2 snapshot, preview or publication is established by this source result.

## Successful runner release

The pinned SDK transfers successful runner cleanup to its returned stdout and stderr streams. Both receipt readers consume both streams, retain finite diagnostic-size limits and expose no raw stderr. A source regression proves both stream completions; actual provider container shutdown remains a live-trial readback requirement.

Stream-lifecycle follow-up `10666521b0a43ef81c16847c4b594ca1640beb94` passed required push [Deploy37150461654](https://github.com/matthewwong525/WongStack/actions/runs/37150461654), [Test37150461701](https://github.com/matthewwong525/WongStack/actions/runs/37150461701) and [Payload37150461761](https://github.com/matthewwong525/WongStack/actions/runs/37150461761). Both SDK log streams are consumed without exposing diagnostics. Corrected actual provider pipeline acceptance is still unexecuted.
