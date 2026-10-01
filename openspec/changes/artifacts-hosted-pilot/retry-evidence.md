# Artifacts disposable retry evidence

Run `a1001r8e2` uses the same explicit platform account, `040f88e2bf4f25fb0b91b7cb24f3d442`, with fresh resources and invented data. The original [trial report](evidence.md), including its two failed main previews and orphan runner, remains evidence. The first retry candidate used unchanged source, dependencies and pipeline configuration after the prior final source gate `000c0b9` passed remotely. A narrowly scoped SDK correction passed the remote source gate before the corrected image was deployed. Contract checks and source inspection do not establish live provider reliability.

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

The first fresh unapproved `main` push succeeded for `e68ed91f1f05ce51a011353e12c363d3813c5baf`. Workflow `18efcbc9-ac49-4687-a4b5-e6fed7282c7d` passed its remote check/build step in 19.629 seconds, then its trusted preview deployment failed in 2.665 seconds with `RPC session was shut down by disposing the main stub`, matching the original failure text. A green check/build is not a passing preview. This failure remains part of the retry outcome. Safe receipt: `.scratch/artifacts-a1001r8e2/workflow-first-unchanged-safe.json`.

At `2026-10-01T22:35:12.953Z`, a read-only provider observation found the Workflow errored and the run-owned application's dashboard instance list empty. That dashboard response alone does not establish absence in the canonical container-instance inventory. Safe receipt: `.scratch/artifacts-a1001r8e2/provider-observation-report-safe.json`.

The canonical `/containers/applications/{id}/instances-v2` read at `22:39:17.465Z` found two instances: `4239d5eb75a1b27225ab3b757942856208f453932469e4b82e08585e4dc4bd6c` still `running` (state updated `22:35:16.167Z`) and `234aeecd3ff541f28c2c2dcd98adca7e216b8452b13c062006b1a6ad5a0bd9cd` `inactive` (state updated `22:35:07Z`). The failed first candidate therefore left a running instance despite the empty dashboard response. Safe receipt: `.scratch/artifacts-a1001r8e2/canonical-first-after-safe.json`.

### SDK correction and subsequent candidates — FAIL

After this repeat failure, upstream source investigation identified a relevant installed idle-call race and an upstream fix first included in Sandbox 0.12.5. [Upstream PR #799](https://github.com/cloudflare/sandbox-sdk/pull/799) describes pending calls being mistaken for idle, allowing the main stub to be disposed, and adds pending-call tracking plus clearer capacity/startup errors. The applied correction changes only the Sandbox override and matching public container image to 0.12.5; CI 0.2.0, Wrangler, the custom pipeline, runner slot and finite bounds stay fixed. The remote checks passed before that image was deployed. This source finding is relevant evidence, not proof that the idle-call race caused the observed failure. The first corrected candidate did not reach a passing preview; its safe controller readback is recorded below. The one remaining corrected candidate also failed; the operator then stopped without further attempts.

Before replacement, the operator verified every Workflow terminal and controller active job `null`, then deleted only the manifest-owned original container application at `22:41:10.778Z`–`22:41:12.581Z`. Application GET/list readbacks proved absence, and both canonical and dashboard instance endpoints returned absence for the old application and its two known instances. Safe receipts: `.scratch/artifacts-a1001r8e2/pre-patch-runner-before-safe.json` and `pre-patch-container-reset-safe.json`. The manifest retains the old ID and deletion receipt, and reserves a replacement only after these readbacks. Controller, repositories, databases, buckets and credentials stayed live for the remaining bounded cases.

The SDK correction was checkpointed as `1702c05` and subsequently checked at source gate `a5d2a7b`. All remote checks passed, including 951 script cases and two regressions against the actual installed SDK. The matching 0.12.5 image was then deployed into replacement application `a03ef830-4605-4d7a-885e-03e0633f6d9c`; the unchanged Workflow and Durable Object IDs were reconciled in the manifest. Safe receipt: `.scratch/artifacts-a1001r8e2/patched-pipeline-receipts-safe.json`.

At `2026-10-01T22:49:43.590Z`, the corrected-image first main candidate `294f7e10c9bb158910a1e182fc73d73e28fff627` was recorded as `failed`, with `checks: FAIL`, controller active job `null` and production still `null`. Safe receipt: `.scratch/artifacts-a1001r8e2/patched-first-state-safe.json`. Workflow `c1b1be81-e390-4298-97d0-d50aad300431` passed check/build in 13.784 seconds, then failed trusted preview deployment after 13.557 seconds with `OperationInterruptedError: The sandbox container stopped while the operation was pending`. The controller's final `checks: FAIL` therefore represents pipeline failure after a green candidate check/build, not a fixture assertion failure. Safe receipt: `.scratch/artifacts-a1001r8e2/workflow-patched-first-safe.json`. The canonical read at `22:49:08.971Z` contained two historical instance records, both `inactive`, so it showed no running orphan at that read. Inactive records are retained history, not application deletion.

The second corrected unapproved main push succeeded for `a185296967da3fe9e0109199a2dd0b128c3640e3`. Workflow `05991876-c62f-445a-83bd-e9abd507f6f8` passed check/build in 10.133 seconds (`22:52:06.169Z`–`22:52:16.302Z`), then failed trusted preview deployment in 13.135 seconds (`22:52:16.330Z`–`22:52:29.465Z`) with the same `OperationInterruptedError`. Safe receipts: `.scratch/artifacts-a1001r8e2/patched-second-main-push-safe.json` and `workflow-patched-second-safe.json`. At `22:54:15.017Z`, the canonical replacement-application inventory contained four historical instances, all `inactive`; all three retry Workflows were errored. No running orphan was observed after either corrected attempt. Safe receipt: `patched-second-canonical-current-safe.json`.

| Case | Outcome | Observation and safe receipt |
|---|---|---|
| Two consecutive passing unapproved main previews | FAIL | Both corrected candidates passed check/build and failed trusted deployment. No passing main preview was observed in this retry. |
| Production unchanged before owner approval | PASS, limited | Final controller ledger remained `production: null`, with three attempts and no active job. No passing-preview safeguard or production HTTP identity after a passing main preview was established. `.scratch/artifacts-a1001r8e2/controller-final-state-safe.json`. |
| Runner cleanup after unchanged-SDK failure | FAIL | Canonical inventory found a running orphan despite an empty dashboard list; the original application was later removed with absence readbacks. |
| No running runner between corrected candidates | PASS | Canonical first-candidate read at `22:51:28.798Z` showed only two inactive records; the final read showed four inactive records. Historical records persisted until application deletion. `patched-first-canonical-after-safe.json` and `patched-second-canonical-current-safe.json`. |
| Failed preview cannot be approved | PASS | Owner approval for the failed latest candidate returned HTTP 403, `Only the latest passing preview can be approved`. `failed-rejected-approval-safe.json`. |
| Owner-approved exact publication in this retry | UNKNOWN | No passing candidate existed to approve. No publication was attempted; the original run's successful exact publication remains separately recorded. |
| Full-ref export and restored object integrity | PASS | Three advertised refs/object IDs matched in an independent bare restore; `git fsck --full` passed before cleanup. `export-final-safe.json`. |
| Stop controller, disable triggers and terminate workflows | PASS | Stop returned true, trigger PUT/readback returned an empty trigger list, all three workflows were already terminal; no termination was required. |
| Complete run credential revocation | PASS | Seven active Git keys, including six SDK-issued read keys, explicitly revoked and both repository inventories read empty. All nine known Git IDs and both temporary account keys are revoked. |
| Manifest-only deletion and absence readbacks | PASS | All fifteen logical resources plus the historical original runner application verified absent; no leftovers. `cleanup-final-safe.json` and `resource-absence-readbacks-safe.json`. |

## Full-ref export and restore — PASS

After disabling triggers, the operator created a feature ref and annotated snapshot tag for export coverage. At `2026-10-01T22:54:03.110Z`, an independent local bare restore completed in 527 ms, with identical advertised refs/object IDs: feature `e68ed91f1f05ce51a011353e12c363d3813c5baf`, main `a185296967da3fe9e0109199a2dd0b128c3640e3`, and annotated tag `trial-snapshot` object `66ae55d80370b968fb6d8717fed6c0ae1ad92865`. `git fsck --full` exited successfully. Safe receipt: `.scratch/artifacts-a1001r8e2/export-final-safe.json`.

This proves Git refs and reachable history restored to an independent local bare repository. It does not test a GitHub import or export approval/roster/token metadata, D1 facts, infrastructure configuration or pipeline state.

## Cleanup — PASS, no leftovers

Owner-authenticated stop returned `stopped: true`, active job `null` at `22:54:00.614Z`. The trigger update returned an empty trigger list at `22:54:00.889Z`; all three Workflows were already errored and terminal at `22:54:01.818Z`. The private manifest recorded these acknowledgments before deletion. Safe receipts: `.scratch/artifacts-a1001r8e2/controller-stop-safe.json`, `triggers-disabled-safe.json` and `workflow-termination-safe.json`. The stored controller state before quiescence had three candidate attempts, no active job, and production still null; its stored `stopped: false` predates the separate successful stop acknowledgment.

A fresh inventory found seven active project Git keys: the owner's write key and six SDK-issued read keys. Isolation had none. Every active ID was explicitly revoked, each token lookup read absent, and both repositories' active-key lists were empty at `22:54:29.366Z`. The two initial repository keys had already been revoked during provisioning. All nine known Git IDs are recorded as revoked. Safe receipts: `token-inventory-before-cleanup-safe.json` and `git-revocation-cleanup-safe.json`.

The four canonical replacement-runner instances were all inactive immediately before teardown. The owned replacement application `a03ef830-4605-4d7a-885e-03e0633f6d9c` was removed at `22:54:29.367Z`–`22:54:31.475Z`. Direct application GET/list, canonical instances-v2 and dashboard instance readbacks proved absence. Only afterward did the stopped controller drain six cache objects and zero memory objects, reading both buckets empty at `22:54:32.443Z`. The historical original application `a0308c3b-8ef2-4b2c-a71d-d716c7d162f2` and its canonical instance endpoint were independently reconfirmed absent at `22:54:32.755Z`. Safe receipts: `container-before-cleanup-safe.json`, `container-cleanup-safe.json`, `orphan-container-readback-safe.json`, `drain-final-safe.json` and `replaced-container-absence-safe.json`.

Manifest-only teardown then removed the Workflow, three Workers, both Durable Object namespaces, both repositories, both buckets, three D1 databases and the empty namespace. Each logical resource had an independent absence readback; namespace absence was observed at `22:54:51.543Z`. The undocumented namespace DELETE compatibility probe again succeeded, without asserting a supported API guarantee. The final receipt at `22:54:52.750Z` reports all fifteen resources deleted, all eleven recorded credentials revoked, cleanup `verified`, and no leftovers. Safe receipts: `resource-absence-readbacks-safe.json`, `cleanup-safe.json` and `cleanup-final-safe.json`.

The unchanged existing administration credential revoked the temporary management key `5111db86999e736a1e6c6534906bff2a` and scoped cache key `d9746964692a86dcd1cc0c95c69131de`. Both token lookups read absent, and independent repeat GETs explicitly returned HTTP 404 at `22:55:50.928Z` and `22:55:51.246Z`. Safe receipt: `.scratch/artifacts-a1001r8e2/temporary-token-http-absence-safe.json`. No existing administration credential or customer resource was changed.

## Measurements and usage boundaries

| Measurement | Observed value | Evidence and limit |
|---|---|---|
| Initial resource provisioning | 16.575 seconds | Namespace acknowledgment `22:31:46.547Z` to empty controller acknowledgment `22:32:03.122Z`; `.scratch/artifacts-a1001r8e2/provision-safe.json`. Excludes preflight, schema seed and deployed pipeline readiness. |
| Preflight REST requests | 3 | Instrumented preflight invocation only. |
| Initial provisioning REST requests | 26 | Includes reads, creation and initial Git-token revocation; not all account, binding or Git operations. |
| First unchanged-SDK check/build | 19.629 seconds, PASS | A passing fixture check/build does not establish a deployed preview. |
| First unchanged-SDK trusted preview deploy | 2.665 seconds, FAIL | Repeated disposed-main-stub RPC error; no verified preview. |
| Candidate attempts | 3 of maximum 10 | One unchanged-SDK candidate, two corrected candidates; all failed preview deployment. No further attempts. |
| Billable Artifacts operations/storage | UNKNOWN | No complete provider billing counters or invoice captured. |
| Container CPU/memory/disk and R2 cache charges | UNKNOWN | Workflow/runner wall time is not billed CPU or full container lifetime. |
| Workers, Durable Objects, Workflows and D1 charges | UNKNOWN | Request receipts are not complete billable usage. |
| Corrected first check/build and preview deploy | 13.784 seconds PASS; 13.557 seconds FAIL | `workflow-patched-first-safe.json`; green checks followed by interrupted deployment. |
| Corrected second check/build and preview deploy | 10.133 seconds PASS; 13.135 seconds FAIL | `workflow-patched-second-safe.json`; repeated interrupted deployment. |
| Final export | 527 ms, PASS | `export-final-safe.json`; refs/object IDs and object integrity verified. |
| Final Git revocations | 191–610 ms per token revoke plus absence lookup | Seven active IDs; lists read empty at `22:54:29.366Z`. Delayed observations do not establish exact propagation latency. |
| Final cleanup | 26.360 seconds | `22:54:26.390Z`–`22:54:52.750Z`, including token inventory/revocation, runner removal, drain, resource teardown and temporary token absence readbacks. |
| Teardown helper REST requests | 56 plus 2 final admin readbacks | Instrumented providers only; separate administration revocation requests, repeat readbacks, earlier observations, Git and binding calls are outside this count. |

## Adoption decision — DEFER

The retry did not prove two consecutive successful unapproved main previews or a fresh owner-approved exact publication. The original run's two main failures remain unchanged, and the fresh unchanged-SDK candidate reproduced disposed-stub failure with a canonical running orphan. After the demonstrated SDK idle-call correction passed its actual-source regressions, both corrected live candidates still failed deployment with a different container-stopped error. Their inactive container readbacks improve the cleanup observation, but do not establish the exact cause of either failure or show reliable preview execution. No stop-reason or internal lifecycle log was captured; timings alone cannot establish causality.

Artifacts Git hosting, ref/history export and full teardown passed again. The original trial separately established feature previews, exact owner-approved publication, stale/base safeguards, access removal and real memory permissions with test identities; this retry does not rerun or expand those results. Defer customer adoption while the live pipeline reliability failure remains. Billable usage and recurring cost remain UNKNOWN, and no customer migration is triggered.

Before hosted rollout, separate work must connect real customer sign-in and team membership, approval screens, onboarding, client/hook and VM integration, Cloudflare Access offboarding, service metadata export, legal/data ownership and existing-project migration. These disposable fixture results do not establish service-scale reliability.
