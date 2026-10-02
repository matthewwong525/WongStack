# Artifacts and Workers Builds trial evidence

The split trial stopped at repository connection setup. Run `a1002b7e4` used fresh disposable resources in the explicit platform account `040f88e2bf4f25fb0b91b7cb24f3d442`. The native connection request failed before a CI test Workflow or managed build could run. Two green previews, failed-test gating and approval-controlled publication therefore remain **UNKNOWN**, rather than passed or demonstrated provider build failures. Defer customer adoption. The [first trial](evidence.md) and [retry](retry-evidence.md) remain separate, unchanged evidence.

## Source gate and preflight

Revised source checkpoint `e71b364` passed every remote check before live setup, including 959 script cases. Split-backend contracts cover failed tests refusing Builds, exact-commit receipt and preview validation, the absence of Sandbox deployment calls, production approval checks and managed resource cleanup. These checks establish source behavior under their fixtures; they do not prove the native Artifacts integration works live.

At `2026-10-02T02:42:45.599Z`, three read-only preflight requests observed the selected account, Workers Paid entitlement and readable Artifacts namespaces. No billing change or widening of an existing token occurred. Safe receipt: `.scratch/artifacts-a1002b7e4/preflight-safe.json`.

The run created separate expiring management and user-scoped Builds API credentials, both expiring at `2026-10-02T05:42:21Z`. Their safe IDs are `885c53b6c19de0482bc55252bf8089b8` and `404b5c3b7490e79f040e264e4f28071d`. Their values remain private. Builds API authentication and build deployment authentication are different capabilities; [Cloudflare's API guide](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/) requires a user-scoped Builds API token. No deployment token was created or registered with Builds for this run. Two pre-existing registered build tokens were left untouched. Safe receipts: `token-receipt-safe.json` and `builds-api-token-receipt-safe.json` in the same scratch folder.

## Resource inventory and finite bounds

The split harness plans seventeen resources under `wong-artifacts-pilot-a1002b7e4`: one namespace, two repositories, three Workers, three D1 databases, two R2 buckets, one Workflow, one container application, two Durable Object namespaces, one repository connection and one manual-only build trigger. Setup stopped after the minimum connection prerequisites:

| Resource | Actual setup outcome |
|---|---|
| Artifacts namespace | Created: `wong-artifacts-pilot-a1002b7e4` |
| Project repository | Created: `wong-artifacts-pilot-a1002b7e4-project`; fixture pushed to `main` |
| Staging Worker | Created: `wong-artifacts-pilot-a1002b7e4-staging`; Worker tag observed |
| Repository connection | Reserved, then request rejected; no acknowledged connection ID |
| Managed build trigger | Reserved; never created; staging trigger list was empty |
| Remaining twelve planned resources | Never created |

Project repository ID `3qfzjttgcsgvlwjf` received `refs/heads/main` at `f76fbcce26db2999397d7b535dd990ca4fb548e0`; the fixture included project configuration. Staging Worker tag `3f1fc535597e4da18cb28c26a9373d98` was observed. Namespace, repository and Worker acknowledgments span `02:59:18.408Z`–`02:59:22.752Z` (4.344 seconds); this excludes preflight, Git push and connection setup. Safe receipt: `.scratch/artifacts-a1002b7e4/setup-safe.json`.

The intended bounds remain ten CI candidates, one concurrent test runner and thirty minutes per runner, plus ten managed builds with twenty-minute timeouts and no automatic start retries. Stop after two consecutive repeated infrastructure failures. The connection prerequisite failed before any candidate execution; no build attempts were consumed and no Sandbox runner was deployed.

[Workers Builds pricing](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/) rechecked on `2026-10-02` lists 6,000 included monthly minutes on paid plans, then $0.005 per minute, and a twenty-minute build timeout. Ten fully timed-out builds would total 200 minutes, or $1.00 before allowances. This is an estimate, not a spending cap or measured charge. CI container compute/cache, Artifacts operations/storage, Workers, D1 and Workflows remain separate. No managed build ran in this trial; no provider invoice or complete billed-usage counters were captured.

## Native connection attempt — FAIL

At `2026-10-02T03:00:03.720Z`, `PUT /accounts/{account}/builds/repos/connections` identified the fresh project and namespace with `provider_type: "artifacts"`. The actual response was HTTP 400, `success: false`, error `12002`, `Invalid request body`, with no acknowledged connection ID. Safe receipt: `.scratch/artifacts-a1002b7e4/connection-evidence-safe.json`.

The [public Builds API schema](https://developers.cloudflare.com/api/resources/workers_builds/) lists `github`, `gitlab`, `gitlab_internal` and `origin` as provider values; it omits `artifacts`. That mismatch is evidence of a possible API-contract gap, not proof of which request field caused the rejection. The response does not diagnose its invalid field. No provider substitution, invented receipt or speculative repeated mutation was used.

Cloudflare's [Artifacts integration guide](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/artifacts-integration/) explicitly documents connecting an existing Worker through Settings → Builds, selecting an Artifacts namespace and repository, and saving the connection. The rejected REST request does **not** establish that Artifacts is unsupported by Workers Builds. Both attempted browser routes encountered a security challenge and were closed; no authenticated dashboard session was available to complete that documented path. An observed native connection acknowledgment remains the next prerequisite.

## Live cases

| Case | Outcome | Actual observation |
|---|---|---|
| Explicit account, entitlement and Artifacts preflight | PASS | Selected account and paid entitlement observed through three read-only requests. |
| Fresh Artifacts Git fixture push | PASS | Fixture `f76fbcce26db2999397d7b535dd990ca4fb548e0` pushed to the disposable project's `main` branch; `setup-safe.json`. |
| Staging Worker identity and absent managed triggers | PASS | Worker tag observed; trigger list empty before setup and again during quiescence; `setup-safe.json`, `quiesce-safe.json`. |
| Native Artifacts connection through attempted REST request | FAIL | HTTP 400 / error 12002; no connection ID acknowledged. |
| Native connection through dashboard | UNKNOWN | Security challenges prevented reaching an authenticated connection flow. |
| Two consecutive green exact-commit previews | UNKNOWN | No CI test Workflow or managed build started. |
| Failed test starts no managed build | UNKNOWN | Deliberately red candidate never executed; zero builds at setup is not this negative case. |
| Unapproved passing previews leave production unchanged | UNKNOWN | No production Worker or passing preview existed in this run. |
| Failed/stale approval rejection through deployed controller | UNKNOWN | Controller was never deployed. Remote contracts alone do not pass the live case. |
| Owner-approved exact publication | UNKNOWN | No passing candidate existed and no publication was attempted. |
| All advertised refs exported and independently restored | PASS, limited | The sole advertised `main` ref/object ID matched and `git fsck --full` passed; this run contains no branch/tag coverage; `export-safe.json`. |
| Manifest-only cleanup and credential revocation | PASS | All three created resources deleted, four issued credentials revoked and no leftovers; `cleanup-safe.json`, `token-absence-safe.json`. |

## Export and cleanup

At `2026-10-02T03:01:29.520Z`, all advertised refs/history were exported into an independent local bare destination. The source and restored `refs/heads/main` both identified `f76fbcce26db2999397d7b535dd990ca4fb548e0`, and `git fsck --full` passed. The safe receipt records 708 ms. This setup-only repository had one advertised ref and no branches or tags beyond `main`; the first two reports retain their separate multi-ref coverage. No GitHub destination or service-metadata export was tested. Safe receipt: `.scratch/artifacts-a1002b7e4/export-safe.json`.

The operator stopped setup at the failed connection prerequisite. No test Workflow, container application, controller, D1 database, R2 bucket, build trigger, registered deployment token or managed build was created. At `03:01:36.632Z`, staging readbacks observed zero triggers and zero builds. The connection reservation was reconciled as `not-created` from the rejected request without a resource acknowledgment; the trigger reservation was reconciled as `not-created` because no creation request was sent. There is no documented connection GET/list endpoint, so the report does not claim an independent connection lookup proved absence. Safe receipt: `quiesce-safe.json`.

At `03:01:48.454Z`, manifest-only cleanup reported all three created resources deleted, both tracked Git credentials revoked, both temporary API credentials revoked and no leftovers. Git-token DELETE acknowledgments preceded repository deletion; this run did not measure credential refusal or independent Git-token absence after revocation. The initial repository token `hhu64o23ryte6n9i` and bootstrap write token `p6noh54jeqcnbnar` were the only issued Git credentials; there were no CI-issued keys. The unchanged existing administration credential independently queried both temporary API token IDs at `03:01:52.747Z`; each returned HTTP 404 / code 1003. Those API-token readbacks prove observed absence, not exact revocation propagation latency. Safe receipts: `cleanup-safe.json` and `token-absence-safe.json`.

At `03:03:26.400Z`, a Builds token-registry GET returned HTTP 200, with two entries before and after the trial and identical pre-existing registration IDs. Neither existing registration was selected, changed or deleted. Safe receipt: `existing-registry-safe.json`. No existing customer resources or administration credential were altered. Cleanup passed for this setup attempt; execution of the split pipeline remains blocked.

## Measurements and usage limits

| Measurement | Observed value | Limit |
|---|---|---|
| Preflight REST requests | 3 | This invocation only; not all billable operations. |
| Minimum resource provisioning | 4.344 seconds | First namespace to staging Worker acknowledgment; excludes remaining setup. |
| Connection attempts | 1 rejected REST request | No acknowledged connection or managed trigger. |
| CI test candidates executed | 0 | No test Workflow or runner existed. |
| Managed builds started | 0 | No build duration, preview latency or billed build measurement. |
| Approved publications | 0 | No publication or production identity evidence. |
| Git export and restore | 708 ms, PASS | One advertised ref and object integrity; no GitHub import. |
| Build and revocation propagation time | UNKNOWN | No live build; final token GETs prove observed absence only. |
| Artifacts usage, Worker usage and billed charges | UNKNOWN | No complete counters or invoice captured. |

## Recommendation — DEFER

Keep the tooling unmerged for review and defer adoption for hosted customer projects. Cleanup is complete, but this run does not determine whether the split resolves the earlier Sandbox deployment failures, because the native repository connection blocked execution first. Next obtain a documented or observed native connection path with an actual acknowledged ID, then repeat the bounded green/red previews and owner-approval cases against fresh resources. Preserve all prior reports and the failed REST response.

Real customer sign-in, hosted team synchronization, approval screens, memory client/hook and VM integration, Cloudflare Access offboarding, service-metadata export and existing-project migration still require separate work. This disposable fixture trial changes none of those customer integrations.
