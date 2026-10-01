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
