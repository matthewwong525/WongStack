# Artifacts disposable retry evidence

Run `a1001r8e2` uses the same explicit platform account, `040f88e2bf4f25fb0b91b7cb24f3d442`, with fresh resources and invented data. The original [trial report](evidence.md), including its two failed main previews and orphan runner, remains evidence. The first retry candidate used unchanged source, dependencies and pipeline configuration after the prior final source gate `000c0b9` passed remotely. A narrowly scoped SDK correction is being checked remotely before further live execution. Contract checks and source inspection do not establish live provider reliability.

## Preflight and bounds — PASS

At `2026-10-01T22:31:18.132Z`, three read-only requests observed the selected account, Workers Paid entitlement and readable Artifacts namespaces. No billing change or existing-token widening occurred. Safe receipt: `.scratch/artifacts-a1001r8e2/preflight-safe.json`.

All fifteen disposable resources use prefix `wong-artifacts-pilot-a1001r8e2`:

| Kind | Suffix or class |
|---|---|
| Artifacts namespace | prefix itself |
| Artifacts repositories | `-project`, `-isolation` |
| D1 databases | `-production`, `-staging`, `-memory` |
| R2 buckets | `-cache`, `-memory` |
| Workers | `-production`, `-staging`, `-controller` |
| Workflow | `-pipeline` |
| Container application | `-runner` |
| Durable Object namespaces | controller classes `PilotState`, `CiSandbox` |

The private manifest records exact provider IDs and acknowledged ownership. Safe inventory: `.scratch/artifacts-a1001r8e2/inventory-safe.json`. The project repository ID is `q7r2zmf5rxci9w9k`; the isolation repository ID is `5jmlu219ou5vfx0i`; the initial runner application ID was `a0308c3b-8ef2-4b2c-a71d-d716c7d162f2`. The manifest retains its verified deletion before reserving its replacement. Bounds remain one concurrent runner, ten candidate attempts and thirty minutes per runner.

Pricing rechecked on `2026-10-01`: [Artifacts pricing](https://developers.cloudflare.com/artifacts/platform/pricing/) requires Workers Paid and starts operation/storage billing on October 14, with 10,000 operations and 1 GB-month included, then $0.15 per extra 1,000 operations and $0.50 per extra GB-month. [Containers pricing](https://developers.cloudflare.com/containers/platform/pricing/) lists separate provisioned memory/disk and active CPU rates. Using standard-1's 4 GiB, 0.5 vCPU and 8 GB disk at full CPU, ignoring allowances and network, the estimate is `seconds × (4 × $0.0000025 + 0.5 × $0.000020 + 8 × $0.00000007)`: approximately $0.074 for two thirty-minute preview runners, or $1.11 for twenty preview plus ten publication runners at thirty minutes each. Startup, image pulls, R2, Workflows, D1, Workers, Durable Objects and network are additional. This is an estimate, not a measured charge.

## Initial propagation observations

The first Artifacts read immediately after minting the fresh management token returned HTTP 401; the same credential passed preflight about thirty-eight seconds later. The first signed-session call immediately after bulk Worker secret upload returned `Invalid test session`; the unchanged session worked about thirty-five seconds later. These observations do not identify an SDK runner defect or prove exact propagation latency. Neither caused a source or dependency change.

## Retry case results

### Unchanged SDK candidate — FAIL

The first fresh unapproved `main` push succeeded for `e68ed91f1f05ce51a011353e12c363d3813c5baf`. Workflow `18efcbc9-ac49-4687-a4b5-e6fed7282c7d` passed its remote check/build step in 19.629 seconds, then its trusted preview deployment failed in 2.665 seconds with `RPC session was shut down by disposing the main stub`, matching the original failure text. A green check/build is not a passing preview. This failure remains part of the retry outcome.

At `2026-10-01T22:35:12.953Z`, a read-only provider observation found the Workflow errored and the run-owned application's dashboard instance list empty. That dashboard response alone does not establish absence in the canonical container-instance inventory. Safe receipt: `.scratch/artifacts-a1001r8e2/provider-observation-report-safe.json`.

The canonical `/containers/applications/{id}/instances-v2` read at `22:39:17.465Z` found two instances: `4239d5eb75a1b27225ab3b757942856208f453932469e4b82e08585e4dc4bd6c` still `running` (state updated `22:35:16.167Z`) and `234aeecd3ff541f28c2c2dcd98adca7e216b8452b13c062006b1a6ad5a0bd9cd` `inactive` (state updated `22:35:07Z`). The failed first candidate therefore left a running instance despite the empty dashboard response. Safe receipt: `.scratch/artifacts-a1001r8e2/canonical-first-after-safe.json`.

### SDK correction and subsequent candidates — UNKNOWN

After this repeat failure, upstream source investigation identified a relevant installed idle-call race and an upstream fix first included in Sandbox 0.12.5. [Upstream PR #799](https://github.com/cloudflare/sandbox-sdk/pull/799) describes pending calls being mistaken for idle, allowing the main stub to be disposed, and adds pending-call tracking plus clearer capacity/startup errors. The proposed correction changes only the Sandbox override and matching public container image to 0.12.5; CI 0.2.0, Wrangler, the custom pipeline, runner slot and finite bounds stay fixed. Remote checks must pass before that image is deployed. This source finding is relevant evidence, not proof that the idle-call race caused the observed failure. Live results after the correction remain pending.

Before replacement, the operator verified every Workflow terminal and controller active job `null`, then deleted only the manifest-owned original container application at `22:41:10.778Z`–`22:41:12.581Z`. Application GET/list readbacks proved absence, and both canonical and dashboard instance endpoints returned absence for the old application and its two known instances. Safe receipts: `.scratch/artifacts-a1001r8e2/pre-patch-runner-before-safe.json` and `pre-patch-container-reset-safe.json`. The manifest retains the old ID and deletion receipt, and reserves a replacement only after these readbacks. Controller, repositories, databases, buckets and credentials stayed live for the remaining bounded cases.

| Case | Outcome | Observation and safe receipt |
|---|---|---|
| Two consecutive passing unapproved main previews | UNKNOWN | Live retry in progress; runner success and exact served commit must both be observed. |
| Production unchanged before owner approval | UNKNOWN | Requires production HTTP and ledger readbacks beside both candidate outcomes. |
| Runner cleanup after unchanged-SDK failure | FAIL | Canonical inventory at `22:39:17.465Z` found one running instance after the Workflow errored. Dashboard inventory had shown zero; it cannot establish absence. |
| Runner absence between corrected candidates | UNKNOWN | Requires canonical provider inventory between subsequent attempts. |
| Owner-approved exact publication | UNKNOWN | No passing publication evidence recorded yet. |
| Full-ref export and restored object integrity | UNKNOWN | Export must precede cleanup. |
| Stop controller, disable triggers and terminate workflows | UNKNOWN | Cleanup remains on hold until recorded quiescence. |
| Complete run credential revocation | UNKNOWN | Active repository token inventory must include SDK-issued read tokens. |
| Manifest-only deletion and absence readbacks | UNKNOWN | No cleanup operation has run yet. |

## Measurements and usage boundaries

| Measurement | Observed value | Evidence and limit |
|---|---|---|
| Initial resource provisioning | 16.575 seconds | Namespace acknowledgment `22:31:46.547Z` to empty controller acknowledgment `22:32:03.122Z`; `.scratch/artifacts-a1001r8e2/provision-safe.json`. Excludes preflight, schema seed and deployed pipeline readiness. |
| Preflight REST requests | 3 | Instrumented preflight invocation only. |
| Initial provisioning REST requests | 26 | Includes reads, creation and initial Git-token revocation; not all account, binding or Git operations. |
| First unchanged-SDK check/build | 19.629 seconds, PASS | A passing fixture check/build does not establish a deployed preview. |
| First unchanged-SDK trusted preview deploy | 2.665 seconds, FAIL | Repeated disposed-main-stub RPC error; no verified preview. |
| Candidate attempts | UNKNOWN | Final controller ledger not yet captured. |
| Billable Artifacts operations/storage | UNKNOWN | No complete provider billing counters or invoice captured. |
| Container CPU/memory/disk and R2 cache charges | UNKNOWN | Workflow/runner wall time is not billed CPU or full container lifetime. |
| Workers, Durable Objects, Workflows and D1 charges | UNKNOWN | Request receipts are not complete billable usage. |
| Cleanup completion | UNKNOWN | Teardown has not started. |

## Decision boundary

The retry cannot support adoption until its core live cases and complete cleanup are proven. The first run's failures remain part of the reliability assessment even if a later retry passes. This technical fixture does not establish service-scale reliability or recurring cost, and no customer migration follows it. Real hosted sign-in, team membership, approval screens, client/hook and VM integration, Access offboarding, service metadata export, legal/data ownership and existing-project migration remain separate work.
