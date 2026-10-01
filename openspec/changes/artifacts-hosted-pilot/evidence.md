# Artifacts disposable trial evidence

Run `a1001f4c9` uses platform account `040f88e2bf4f25fb0b91b7cb24f3d442`. This is a technical trial with invented identities and data. Harness contract checks passed remotely on `90404de`; compatibility fixes also passed remotely on `b75a89d` (25 pilot cases, 948 script cases). The final HTTP 204 cleanup regression also passed remotely on `b9b94a7` (26 pilot cases, 949 script cases). Those checks are not live-provider evidence.

## Preflight — PASS

At `2026-10-01T21:32:31.305Z`, three read-only provider requests observed the explicitly selected account, Workers Paid entitlement, and readable Artifacts namespaces. No billing or token permissions were changed. Raw safe receipt: `.scratch/artifacts-a1001f4c9/preflight-safe.json`.

The exact planned inventory uses prefix `wong-artifacts-pilot-a1001f4c9`:

| Kind | Names or class names after the prefix |
|---|---|
| Artifacts namespace | prefix itself |
| Artifacts repositories | `-project`, `-isolation` |
| D1 databases | `-production`, `-staging`, `-memory` |
| R2 buckets | `-cache`, `-memory` |
| Workers | `-production`, `-staging`, `-controller` |
| Workflow | `-pipeline` |
| Container application | `-runner` |
| Durable Object namespaces | controller classes `PilotState`, `CiSandbox` |

Raw inventory: `.scratch/artifacts-a1001f4c9/inventory-safe.json`. Creation acknowledgments and IDs belong to the private run manifest. The bounds are ten candidate builds, one concurrent runner, thirty minutes per runner, and at most ten explicit publication attempts. These bounds are not a dollar cap.

## Cost estimate before execution

Pricing rechecked on `2026-10-01`: [Artifacts pricing](https://developers.cloudflare.com/artifacts/platform/pricing/) says operations/storage billing begins October 14, 2026. The current trial therefore has no Artifacts operations/storage charge under the published schedule. Future included monthly usage is 10,000 operations and 1 GB-month; overage is $0.15 per 1,000 operations and $0.50 per GB-month. Billable usage is UNKNOWN until measured; harness REST request counts do not measure all Git/binding operations.

The configured `standard-1` runner has 0.5 vCPU, 4 GiB memory and 8 GB disk. Using [Containers rates](https://developers.cloudflare.com/containers/platform/pricing/), full CPU utilization and ignoring included allowances, the estimate is `seconds × (4 × $0.0000025 + 0.5 × $0.000020 + 8 × $0.00000007)`: $0.074016 for a sixty-minute two-runner preview, or $1.11024 for twenty thirty-minute preview runners plus ten thirty-minute publication runners. This is estimated compute/memory/disk only. Startup, image pulls, network, R2 snapshots/cache, Workers, Durable Objects, Workflows, D1 and observability add usage; their actual trial cost is UNKNOWN. Existing account usage may already consume included allowances. No paid plan was enabled by this trial.

## Live cases

Each PASS below requires an actual provider observation. The bounded trial finished with verified cleanup. Adoption is deferred because the main-branch preview failed twice at the SDK/runner boundary, leaving its successful-preview case unverified.

## Test identity and real memory cases — PASS

The deployed controller reported `https://wong-artifacts-pilot-a1001f4c9-controller.matthewwong525.workers.dev`. From `2026-10-01T21:38:44.891Z` to `2026-10-01T21:38:45.374Z`, actual controller responses proved the following cases. The private replay script `.scratch/artifacts-a1001f4c9/access-cases.mjs` asserted each status and the exact privacy rows. Its setup response receipt was overwritten by the later removal pass; the table retains the observed setup result, and the removal provider responses remain in `.scratch/artifacts-a1001f4c9/removal-safe.json`.

| Case | Outcome | Live observation |
|---|---|---|
| Forged signed session | PASS | HTTP 403 |
| Expired signed session | PASS | HTTP 403 |
| Member adding another roster subject | PASS | HTTP 403 |
| Member approving publication | PASS | HTTP 403 |
| Join with caller-supplied owner email and GitHub token | PASS | HTTP 403; no fallthrough to GitHub join |
| Owner writes shared and personal facts | PASS | HTTP 200 from disposable D1 via the unchanged memory handler |
| Member writes under owner's identity | PASS | HTTP 403 |
| Member writes under own identity | PASS | HTTP 200 |
| Member fact reads and privacy | PASS | Three visible rows: own personal fact, own shared fact, owner's shared fact; owner's personal fact omitted |
| Owner fact reads | PASS | All four invented facts visible |
| Second issued member memory key | PASS | HTTP 200 before removal |

The owner added stable test subject `opaque-member`, email `member@example.com`. Artifacts issued tracked member keys `in39f9cyo8n03fmn` (read) and `uq89uwdey340fvgt` (write), expiring at `2026-10-01T22:08:17.409Z` and `2026-10-01T22:08:17.559Z`. Credential values remain in private scratch files. Scope rejection and revocation are recorded separately below. Removal tested both issued member memory keys while the owner retained access.

An initial fixture input used unsupported fact type `personal`; D1 rejected it with its real type constraint. The corrected privacy test uses supported type `project` and `shared=0`, and the observations above come from that successful run.

These signed fixture sessions exercise the replacement identity seam and real memory permissions. They do not prove customer sign-in, hosted membership synchronization, memory clients/hooks, Cloudflare Access session revocation, VM access removal or installer integration.

## Scoped Git and member removal cases

Before removal, the parent observed a successful read-key fetch, a read-key push rejected with HTTP 403 `Insufficient permissions`, and fetching the isolation repository rejected with HTTP 403 `Invalid or expired token`. Safe raw receipts: `.scratch/artifacts-a1001f4c9/member-read-before-safe.json`, `read-push-safe.json`, and `cross-repo-safe.json`. Each is a live PASS for its named repository permission case.

At `2026-10-01T21:39:32.539Z`, the owner requested removal of `opaque-member`. The controller finished at `2026-10-01T21:39:33.007Z`: 468 ms server elapsed and 615 ms observed request roundtrip. It reported complete only after provider readbacks for both tracked Git tokens and database absence readbacks for both memory keys. Safe raw receipt: `.scratch/artifacts-a1001f4c9/removal-safe.json`.

| Case | Outcome | Live observation after removal |
|---|---|---|
| Old signed member session | PASS | HTTP 403 |
| Removed member requesting a fresh memory key | PASS | HTTP 403 |
| First existing member memory key | PASS | HTTP 403 |
| Second existing member memory key | PASS | HTTP 403 |
| Owner signed session | PASS | HTTP 200 |
| Owner memory key | PASS | HTTP 200 |

At `2026-10-01T21:40:28.144Z`, real Git fetches with both old member keys returned HTTP 403 and the owner's Git key still fetched refs. These are live PASS results. The old member keys had not reached their `22:08:17Z` expiry, so this proves revocation rather than expiry. Safe raw receipt: `.scratch/artifacts-a1001f4c9/git-removal-safe.json`. The elapsed time from removal completion to the first observed Git denial was 55.137 seconds. That is an upper bound; the probe happened later and does not measure exact provider propagation latency.

## Initial pipeline compatibility observations

The first controller upload rejected the guide's `repoName`/`target` event configuration because pinned Wrangler 4.146.0 requires `repo_name`/`targets`. The harness config was corrected without changing the chosen pipeline, and the compatibility checkpoint `e6dcc51` passed its remote checks.

The first live candidate's check/build and trusted deploy runner steps succeeded. Its controller preview callback then failed with `Illegal invocation function incorrect this reference`: the harness passed Workers' global `fetch` as an object method. The adapter now calls it through `(...args) => fetch(...args)`. This was a controller harness defect, not a failed candidate test/build or evidence that the provider rejected deployment. Two further live compatibility fixes use short branch names for the Artifacts log endpoint and `redirect: "manual"` with explicit rejection of redirects when verifying previews, because the Workers runtime rejects `redirect: "error"`. The fresh green result below supersedes these failed preview attempts.

## Repository and pipeline cases

| Case | Outcome | Live observation and evidence |
|---|---|---|
| Create project and isolation repositories | PASS | Manifest-owned provider creation acknowledgments identify project `zacbn6qksj6sriu4` and isolation `jajzcnds0vylaxp7`; `.scratch/artifacts-a1001f4c9/provision-safe.json`. |
| Git push and fetch | PASS | Owner pushed a feature branch; member read-key and owner fetched its exact ref before removal; `.scratch/artifacts-a1001f4c9/initial-push-safe.json` and `member-read-before-safe.json`. |
| Green exact-commit preview | PASS | Candidate `aafa2ba68a69f63a3c6e507e0878161ea3e73ab5` entered checking at `2026-10-01T21:46:33.617Z`, reached preview-ready at `21:47:15.058Z`, and the controller verified its reported version URL served that SHA. `.scratch/artifacts-a1001f4c9/first-green-state-safe.json`; digest `293983c14a8accf489f9cc15055b83f3b669f5712a62019e89d6fb291beee5e0`. |
| Staging D1 isolation | PASS | At `2026-10-01T21:48:55.046Z`, that exact preview reported canary `staging-write`; a direct query of production D1 `16526ec5-881d-409d-9725-0bcfe84e5feb` still returned `production-only`. `.scratch/artifacts-a1001f4c9/isolation-safe.json`. An initial harness assertion used `response.value`; correcting it to the fixture's `response.canary` and rerunning produced this observation. |
| Duplicate push event | PASS | A second live Workflow with the same repo/ref/SHA completed at `2026-10-01T21:48:23.065Z` with zero runner steps. The candidate-attempt count remained 3 until the later red push; `.scratch/artifacts-a1001f4c9/duplicate-safe.json`, `workflow-duplicate-safe.json`, and `red-state-safe.json`. |
| Red checks block approval and publication | PASS | Candidate `cd75e2e668b0a362e82dc8796f9b251a9dee9bc0` hit the deliberate `FAIL_CHECK` assertion; its sole check/build runner failed in 2.538 seconds, with no deploy step. Controller recorded failed checks and rejected approval HTTP 403 (`Only the latest passing preview can be approved`), while production stayed null. `.scratch/artifacts-a1001f4c9/workflow-red-safe.json`, `red-state-safe.json`, and `red-rejected-approval-safe.json`. |
| Later commit invalidates an earlier approval | PASS | The owner approved green SHA `aafa2ba68a69f63a3c6e507e0878161ea3e73ab5` at `2026-10-01T21:48:19.543Z`, then pushed red SHA `cd75e2e668b0a362e82dc8796f9b251a9dee9bc0`. Publication Workflow `publish-71ee6c36-62f9-4cd5-bcff-6fcf21a94153` errored at `21:48:40.148Z` before any runner with `Authoritative repository branch head is unreadable or changed`. Production remained null. `.scratch/artifacts-a1001f4c9/stale-approval-safe.json`, `stale-publish-safe.json`, `workflow-stale-publication-safe.json`, and `red-state-safe.json`. |
| Owner approves and publishes exact result | PASS | Owner approved restored green SHA `aa08fb2e65c3c6554f5eb68a4fde53e8d82e4519` at `2026-10-01T21:51:32.557Z` with digest `27c88966a0dee85f4abd95e1031be068c54ea541f61727725de969d86fff1712`, base null. Publication Workflow completed at `21:51:57.839Z`. At `21:53:45.090Z`, actual production HTTP 200 reported that exact SHA, matching the ledger and version `799ae7de-b290-48fc-ae8b-338784c034a6`, while its canary remained `production-only`. `.scratch/artifacts-a1001f4c9/valid-approval-safe.json`, `workflow-publication-safe.json`, and `production-live-safe.json`. |
| Outdated production base blocks publication | PASS | Owner approval `043b3e42-3f9f-4159-b6e9-9db05827d336` authorized the same restored candidate against base null. After the first approval published it, this second publication errored at `2026-10-01T21:53:47.362Z` with `Failed checks, stale candidate, or outdated production base` and zero runner steps. `.scratch/artifacts-a1001f4c9/outdated-base-approval-safe.json`, `outdated-base-publish-safe.json`, and `workflow-outdated-base-safe.json`. |
| Consumed approval cannot publish twice | PASS | Replaying the successful publication approval at `2026-10-01T21:54:57.065Z` returned HTTP 403 `Owner approval record required`; `.scratch/artifacts-a1001f4c9/duplicate-publication-safe.json`. |
| Direct main pushes do not publish without approval | PASS, limited | Unapproved main commits `fe42659bd602115d962d77d1cdee42af0b1a141c` and `5027965204d2c9872bd90f48f36398a27848d212` triggered previews only; production ledger and actual HTTP identity stayed on owner-approved `aa08fb2e65c3c6554f5eb68a4fde53e8d82e4519`. Final HTTP 200 readback at `2026-10-01T22:06:43.775Z` retained `production-only`. Both main previews failed at the SDK/runner boundary, so this does not prove the safeguard after a successful main preview. `.scratch/artifacts-a1001f4c9/unapproved-main-push-safe.json`, `unapproved-main-repeat-push-safe.json`, `state-final-before-cleanup-safe.json`, and `production-final-before-cleanup-safe.json`. |
| Successful main preview remains unpublished without approval | UNKNOWN | Neither main attempt produced a verified passing preview. No further retries were made after the two provider/SDK failures. |
| Pipeline reliability under this bounded run | FAIL | Main's first check/build passed but its trusted preview failed with disposed RPC stub; the one bounded retry's check/build runner failed with WebSocket upgrade HTTP 503 after 140.073 seconds. An instance from the first failure remained running while the application allowed one slot. That orphan plausibly blocked the retry, but the causal link is an inference, not a proven provider diagnosis. `.scratch/artifacts-a1001f4c9/workflow-main-provider-failure-safe.json`, `workflow-main-retry-failure-safe.json`, and `container-cleanup-safe.json`. |

The first verified preview URL was [the reported immutable staging version](https://e2b8a4e6-wong-artifacts-pilot-a1001f4c9-staging.matthewwong525.workers.dev). It has been deleted with the trial. The production endpoint came from the Workers account-subdomain API and manifest-owned script name; it was then checked by HTTP, and was not substituted for a commit-specific preview.

An unapproved main push of `fe42659bd602115d962d77d1cdee42af0b1a141c` passed its candidate checks in 6.880 seconds, then its trusted preview step failed after 1.905 seconds with `RPCTransportError: RPC session was shut down by disposing the main stub`. Production stayed on approved SHA `aa08fb2e65c3c6554f5eb68a4fde53e8d82e4519`. This is an observed SDK/runner reliability failure, not a failing candidate check, and is preserved in `.scratch/artifacts-a1001f4c9/workflow-main-provider-failure-safe.json` and `main-rpc-failure-state-safe.json`. The one fresh main commit's retry ended at `2026-10-01T21:59:31.611Z` with `RPCTransportError: WebSocket upgrade failed: 503 Service Unavailable`; its sole check/build step lasted 140.073 seconds. No retry setting or pipeline strategy was changed.

## Full-ref export and restore — PASS

At `2026-10-01T21:56:00.591Z`, a mirror clone restored to an independent, initially empty local bare destination in 687 ms. All advertised refs/object IDs matched: feature `aa08fb2e65c3c6554f5eb68a4fde53e8d82e4519`, main `fe42659bd602115d962d77d1cdee42af0b1a141c`, and annotated tag `trial-snapshot` object `25a596077a79052bcfc56023e688cbd6351dff28`. `git fsck --full` exited successfully. Safe receipt: `.scratch/artifacts-a1001f4c9/export-safe.json`.

After the final main retry, a second independent mirror/restore completed at `2026-10-01T22:05:36.501Z` in 755 ms. Feature remained `aa08fb2e65c3c6554f5eb68a4fde53e8d82e4519`, main was `5027965204d2c9872bd90f48f36398a27848d212`, and annotated tag object remained `25a596077a79052bcfc56023e688cbd6351dff28`. All advertised refs/object IDs matched and `git fsck --full` again exited successfully. Safe receipt: `.scratch/artifacts-a1001f4c9/export-final-safe.json`.

These exports verify Git branches, tags and reachable object history at each moment. The local bare destination does not test a GitHub import. Approval/member/token metadata, D1 facts, infrastructure configuration and pipeline state remain outside this Git export.

## Cleanup — PASS, no leftovers

At `2026-10-01T22:05:41.305Z`, owner-authenticated stop returned true, the controller's event subscriptions were disabled through the Workers API, and every Workflow instance was observed terminal. The final stopped controller had seven candidate attempts, no active job and unchanged approved production. No more candidate builds or publication attempts were started.

Before deleting repositories, a fresh provider inventory observed fourteen active project Git keys: the owner's key plus thirteen SDK-created read keys. The isolation repository had none. All fourteen were explicitly revoked, and both repositories' active-key lists were empty at `22:07:11.910Z`. The two initial repository keys and both member keys had already been revoked; all eighteen known Git key IDs are recorded in the manifest. Safe receipts: `.scratch/artifacts-a1001f4c9/token-inventory-before-cleanup-safe.json` and `git-revocation-cleanup-safe.json`.

The owned container application `a03571c3-278e-41a8-b4a3-307e8bccd5af` was deleted before the final bucket drain. Its application-list readback was absent at `22:07:12.703Z`; a direct lookup of orphan instance `92990e9f769da6c21e0dd1e4de6b90ad0d38b43c74583d3e7902e9e78033168a` then returned absence. The still-live stopped controller drained twenty cache objects and zero memory objects at `22:08:03.885Z`, and read back both buckets empty. Safe receipts: `.scratch/artifacts-a1001f4c9/container-cleanup-safe.json`, `orphan-container-readback-safe.json`, and `drain-final-safe.json`.

Manifest-only teardown verified deletion of the Workflow, three Workers, both Durable Object namespaces, two repositories, two R2 buckets and three D1 databases. The authorized empty namespace probe returned HTTP 204 at `22:08:25.871Z`. The harness incorrectly attempted to parse its empty body as JSON and initially reported a leftover. An explicit namespace GET returned 404 and the namespace list omitted it at `22:09:08.660Z`, proving successful deletion. The manifest was reconciled from these readbacks; the provider adapter now handles 204 before parsing JSON. Safe receipts: `.scratch/artifacts-a1001f4c9/cleanup-safe.json` and `namespace-deletion-reconciliation-safe.json`. This observed namespace DELETE remains an undocumented compatibility result, not a supported API guarantee.

The separate existing administration credential revoked the temporary management token `114e94bc3de470157d4a7e6c71dd6d2e` and snapshot R2 token `c86d4f28d5af2e29e99e84330c349d41`. Both token GETs returned absence. Final receipt at `22:09:52.291Z` reports all fifteen resources deleted, every tracked credential revoked, manifest cleanup `verified`, and an empty leftover list: `.scratch/artifacts-a1001f4c9/cleanup-final-safe.json`. Existing administration credentials and customer resources were unchanged.

## Measurements and usage boundaries

| Measurement | Observed value | Evidence and limit |
|---|---|---|
| Initial resource provisioning | 16.874 seconds between first and last creation acknowledgments | Namespace at `21:32:19.561Z` through empty controller Worker at `21:32:36.435Z`; `.scratch/artifacts-a1001f4c9/provision-safe.json`. This excludes preflight, schema seed and controller/pipeline upload. |
| Pipeline resource readiness | `2026-10-01T21:35:46.405Z` | Successful controller deployment acknowledgment and Workflow/container/DO readbacks in the private manifest; not a measured end-to-end provisioning duration. |
| First verified green preview | 41.441 seconds from controller checking to preview-ready | `.scratch/artifacts-a1001f4c9/first-green-state-safe.json`; includes remote check/build, trusted staging deploy and HTTP SHA verification. |
| Restored green preview | 71.511 seconds from controller checking to preview-ready | Candidate `aa08fb2e65c3c6554f5eb68a4fde53e8d82e4519`, `21:49:20.526Z` to `21:50:32.037Z`; `.scratch/artifacts-a1001f4c9/restored-green-state-safe.json`. |
| Approved publication | 23.018 seconds trusted runner; 25.282 seconds approval to Workflow completion | `.scratch/artifacts-a1001f4c9/valid-approval-safe.json` and `workflow-publication-safe.json`; actual production SHA was checked separately afterward. |
| Deliberate red check/build runner | 2.538 seconds | `.scratch/artifacts-a1001f4c9/workflow-red-safe.json`; only the runner step, not event queue time. |
| Duplicate Workflow | 37 ms from Workflow start to completion; zero steps | `.scratch/artifacts-a1001f4c9/workflow-duplicate-safe.json`; no candidate build or deploy. |
| Main preview failures | First trusted preview step 1.905 seconds after green 6.880-second check/build; retry check/build failure after 140.073 seconds | `.scratch/artifacts-a1001f4c9/workflow-main-provider-failure-safe.json` and `workflow-main-retry-failure-safe.json`; RPC failures, not estimated billed CPU. |
| Candidate attempts | 7 of maximum 10; no further retries | `.scratch/artifacts-a1001f4c9/state-final-before-cleanup-safe.json`; one deliberate red failure and compatibility/SDK failures included. |
| Final export | 755 ms | `.scratch/artifacts-a1001f4c9/export-final-safe.json`; full advertised refs restored and object integrity verified. |
| Final cleanup completion | `2026-10-01T22:09:52.291Z`; all 15 resources deleted | `.scratch/artifacts-a1001f4c9/cleanup-final-safe.json`; includes temporary token absence readbacks. |
| Preflight REST requests | 3 | `.scratch/artifacts-a1001f4c9/preflight-safe.json`; provider instrumentation for this invocation only. |
| Initial provisioning REST requests | 26 | `.scratch/artifacts-a1001f4c9/provision-safe.json`; includes reads, creates and initial token revocation. Not all account or Artifacts Git/binding operations. |
| Member removal | 468 ms controller elapsed; 615 ms observed roundtrip | `.scratch/artifacts-a1001f4c9/removal-safe.json`. |
| Git revocation observation | Rejection observed within 55.137 seconds of removal completion | `.scratch/artifacts-a1001f4c9/git-removal-safe.json`; delayed probe gives an upper bound, not exact propagation latency. |
| Billable Artifacts operations/storage | UNKNOWN | No complete provider billing counter was captured. Git ref/object verification cannot establish charged storage. |
| Containers CPU/memory/disk and R2 cache | UNKNOWN measured cost | Runner/Workflow elapsed time is not billed CPU utilization or complete container lifetime. No usage invoice was captured. |
| Cache objects at `21:52:33.891Z` | 18 objects; 38,296 bytes | HTTP 200 signed S3 list of only manifest-owned cache bucket, using its scoped snapshot token; `.scratch/artifacts-a1001f4c9/cache-storage-observed-safe.json`. Point-in-time bytes do not measure cumulative storage duration or cache operations. |
| Workers, DO, Workflows and D1 | UNKNOWN measured cost | Request/query receipts show use, not complete billable totals or the remaining account allowances. |

The estimate above remains separate from these observations. The trial cannot establish service-scale reliability, recurring cost, or a cost per representative customer change until complete runner lifetimes and provider usage counters are measured.

## Adoption decision — DEFER

Artifacts successfully hosted and exported the disposable Git project. Feature previews identified immutable commits, owner approval controlled exact-result publication, stale/base/duplicate decisions were rejected, and real memory permissions plus member credential revocation worked with test principals. Cleanup is fully verified with no leftovers.

Defer adoption for customer projects: the custom pipeline failed twice at the SDK/runner boundary on main, and a verified passing main preview without approval was not achieved. Investigate disposed RPC sessions, orphan runner cleanup, single-slot recovery and HTTP 503 behavior, then repeat the missing live case with the same publication safeguards. This small run does not establish service-scale reliability or measured cost per customer change. No customer migration is triggered by this experiment.

Before a hosted product rollout, a separate plan must connect real customer sign-in and team membership, approval screens, onboarding, agent/installer and memory client/hook integration, Cloudflare Access and VM offboarding, service metadata export, legal/data ownership, and existing-project migration. No customer migration is triggered by this experiment.
