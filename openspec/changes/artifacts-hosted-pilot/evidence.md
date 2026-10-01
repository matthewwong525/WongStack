# Artifacts disposable trial evidence

Run `a1001f4c9` uses platform account `040f88e2bf4f25fb0b91b7cb24f3d442`. This is a technical trial with invented identities and data. Harness contract checks passed remotely on `90404de`; those checks are not live-provider evidence.

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

Repository, pipeline, access, memory, export and cleanup cases are pending. None is a live PASS until its actual observation is recorded below. Adoption is deferred while core live cases or verified cleanup are missing.

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

The owner added stable test subject `opaque-member`, email `member@example.com`. Artifacts issued tracked member keys `in39f9cyo8n03fmn` (read) and `uq89uwdey340fvgt` (write), expiring at `2026-10-01T22:08:17.409Z` and `2026-10-01T22:08:17.559Z`. Credential values remain in private scratch files. Scope rejection and revocation remain separate pending Git cases. Two member memory keys and one owner key were issued, so later removal can test every existing key.

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

The first live candidate's check/build and trusted deploy runner steps succeeded. Its controller preview callback then failed with `Illegal invocation function incorrect this reference`: the harness passed Workers' global `fetch` as an object method. The adapter now calls it through `(...args) => fetch(...args)`. This was a controller harness defect, not a failed candidate test/build or evidence that the provider rejected deployment. A fresh live candidate is needed before preview/publication can be a PASS.
