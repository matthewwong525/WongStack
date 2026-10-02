# One runner and direct API deployment

## Decision and scope

The user approved testing and building in one credential-free CI runner, then uploading its immutable output through the Workers API for preview and owner-approved publication. This replaces the blocked managed Builds connection for this experiment. No customer signup, existing project, public template source, or billing setting changes. The tooling remains unmerged.

The final corrected run is pending. The diagnostic run below demonstrates passing previews but does not establish successful publication. Preserve the [original trial](evidence.md), [SDK retry](retry-evidence.md) and [managed Builds attempt](workers-builds-evidence.md) as separate evidence.

## Diagnostic run: a1002d4f7

Account `040f88e2bf4f25fb0b91b7cb24f3d442`; fresh namespace `wong-artifacts-pilot-a1002d4f7`. The user-created `wongstack` namespace was not touched. Private receipts live under `.scratch/artifacts-a1002d4f7/`; these are workspace audit files, not published credentials or permanent artifact storage.

Source `0dfcd9e210cac0d68f6bc2db6b1ec246dfc895eb` passed all remote checks, including 966 script cases. The first candidate exposed a missing required Workflow retry delay. Source `bbb7ea36a1c5acad9dbb988cc96ad0601da53d51` passed the remote correction gate before redeployment. No candidate was built locally.

| Candidate | Outcome | Observation |
| --- | --- | --- |
| `f0c19ee9f544f2f653b515660be0cfad17987685` | FAIL | Tests/build passed in 6.182s; Workflow rejected the upload step's incomplete retry configuration before any upload. |
| `2addddcbff572af8ee15549f41454786ae0502ef` | FAIL | Tests/build passed in 12.092s and version `a148e179-42a9-41a5-91f0-c96a36c5b27b` uploaded. Workflow observed correct HTTP identity after one wait; the controller's independent immediate identity check failed. Later external HTTP 200 returned the exact SHA. Observer disagreement is proven; its underlying cause is not. |
| `c8a47b7474e3e0d14bd540c403a5fa533e517dbd` | PASS | Exact main preview `fcaf42cb-5b98-49e7-b02c-ff42d3075b0b`; controller start to ready 8.843s. |
| `b32a4b8c9dedee539bccae53a58a06ef3c3d385a` | PASS | Consecutive exact main preview `c802b133-d8e2-4ed2-9f17-1099a80949b8`; 9.214s. Production unchanged. |
| `e6fffde7f9394ef72aa6177dcf51eae513b6f8d6` | PASS, negative case | Deliberate `FAIL_CHECK` failed tests. Staging version IDs remained identical to the pre-push readback; no upload. Approval returned 403. |
| `a7edf2e5992cd9e045fae9f80baf34f44bc35bbc` | Preview PASS; publication FAIL | Exact preview `49ed8288-71d1-49ef-bbb2-c57bbb3ef8e4`. Preview ready in 9.283s. Approved production PUT succeeded, but its response had `deployment_id` and no `version_id`, so publication did not complete and its reservation remained held. Production routing was not enabled. |

The report does not interpret a successful script PUT as completed owner-approved publication.

Additional live cases:

- **PASS — stale approval:** attempting to approve an older main preview returned 403. Publishing its previously granted approval failed authoritative-head verification before any step or upload.
- **PASS — isolation:** a staging preview wrote `staging-write`; the independent production D1 read remained `production-only`. Every successful direct adapter preview checked its version's sole runtime binding against the staging DB.
- **PASS — duplicate event:** the duplicate Workflow completed with zero steps/runners and did not increment the six-candidate count.
- **PASS — access and memory:** invented member identities received scoped Git keys and two memory keys. Real memory-handler privacy and author checks passed. Member read/write Git fetches succeeded; read-only push and cross-repository fetch returned 403. Both removed members' old Git keys, memory keys and signed sessions were refused, with owner Git/session/memory access retained. Removal requests completed in 994ms and 398ms. These are observed request times, not a service-wide propagation guarantee or proof of real customer login/offboarding.
- **PASS — retained reservation:** after publication's unreadable version receipt, another approval's publication failed `Publication is serialized` with no upload. This is not an outdated-production-base proof, since the original publication never completed.
- **PASS — export:** after stopping the controller and disabling events, restored main, saved-feature and annotated tag `pilot-v1` into an independent bare repository. All advertised refs/object IDs matched and `git fsck --full` passed in approximately 515ms. No actual GitHub destination was tested.
- **PASS — teardown:** at 2026-10-02T04:44:25.121Z all fifteen owned resources were absent, all fifteen tracked credentials revoked, and no leftovers remained. The final manifest includes four member credentials already revoked and verified during access tests, alongside cleanup-discovered runner Git keys. Container inventory showed all six runner instances inactive before deleting the owned application; application/instance absence, empty bucket and token absence readbacks were recorded.

Key receipts: `workflow-summary-safe.json`, `case-verification-safe.json`, `git-access-safe.json`, `access-safe.json`, `removal-safe.json`, `export-final-safe.json`, `cleanup-final-safe.json`, and `orphan-container-readback-safe.json`.

## Cost and limits

Each run is limited to twelve candidates, one standard-1 runner at a time, thirty minutes per runner and no automatic runner/upload/deploy retries. Controller/Workflow identity polling is bounded. Expiring management and bucket-only snapshot credentials are revoked during cleanup. These bounds are not a dollar spending cap.

[Container pricing](https://developers.cloudflare.com/containers/platform/pricing/), checked 2026-10-02, gives a standard-1 maximum-capacity estimate of `seconds × (4 × $0.0000025 + 0.5 × $0.000020 + 8 × $0.00000007)`. Twelve full thirty-minute runners would be about $0.444 before included allowances. Workflows, Workers, Durable Objects, D1, R2 operations/storage, Artifacts and network costs are additional. Timings above are observed Workflow/controller timings, not metered container CPU or a measured account bill. This small fixture cannot establish service-scale cost or reliability.
