# One runner and direct API deployment

## Decision and scope

The user approved testing and building in one credential-free CI runner, then uploading its immutable output through the Workers API for preview and owner-approved publication. This replaces the blocked managed Builds connection for this experiment. No customer signup, existing project, public template source, or billing setting changes. The tooling remains unmerged.

**The final run proved the complete disposable flow:** Artifacts push → one CI runner for tests/build → Workers API preview → owner-approved Workers API publication. Provisioning and deployment used APIs without a manual repository or Builds connection step. One candidate still suffered a Sandbox interruption and required a fresh-commit retry; this establishes feasibility, not production reliability. Preserve the [original trial](evidence.md), [SDK retry](retry-evidence.md) and [managed Builds attempt](workers-builds-evidence.md) as separate evidence. Native Workers Builds remains unproven.

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

## Fresh propagation run: a1002e8k6

Source `215dc0d6e7d84a00f84955c722ef8966b1a0a959` passed all remote gates and 972 script cases before this fully fresh fifteen-resource run. Private receipts live under `.scratch/artifacts-a1002e8k6/`.

| Candidate | Outcome | Observation |
| --- | --- | --- |
| `5f98bb5d1c46a6fd386ac0c9c20a89cf22bfce13` | PASS | First-ever preview ready in 27.794s, including bounded readiness observation. |
| `68478aa2b4ef590cd07904c6999a496109efb086` | PASS | Consecutive preview ready in 9.761s. |
| `85da59494660491090929e72f9fd542c2e479736` | PASS, negative case | Deliberate red check; no new staging version and production version IDs unchanged. Approval refused. |
| `fe808a980cf511dee23df05f840ba972bcfa488a` | Preview PASS; publication FAIL | Preview ready in 12.881s. Production version `e7c0fc0e-52a4-4708-99a2-09d11ce93973` uploaded and deployment `0f527674-c3a5-4171-b028-f20978c49c73` acknowledged. POST returned only its ID, so an overly strict validator rejected it before readback/routing. Independent GET proved the exact version at 100%; the ledger reservation remained held. |

Stale approval/publication refusal also passed. Access and duplicate/base cases were not repeated before this run stopped; its successful upload/deployment alone is not a completed publication result. The correction accepts the observed ID-only acknowledgment, checks any supplied details, and still requires matching deployment ID, exact version and 100% assignment from GET before routing and HTTP identity.

Export restored main, saved-feature and an annotated tag with identical refs/history and `git fsck --full`, approximately 598ms. At 2026-10-02T04:56:46.240Z, all fifteen owned resources and nine tracked credentials were removed/revoked with no leftovers, recorded in `cleanup-final-safe.json`. No existing/customer resource or user namespace was used.

## Completed trial: a1002f9m2

Source `e43c070c432ff65cc22692c6aef7970409c4569c` passed all remote gates and 972 script cases before the final fresh run. Namespace `wong-artifacts-pilot-a1002f9m2` used the same explicit platform account and fifteen-resource inventory; the user's `wongstack` namespace was preserved. Provisioning took 18.255s. Private receipts live under `.scratch/artifacts-a1002f9m2/`.

| Candidate | Outcome | Observation |
| --- | --- | --- |
| `2216695ebf7ab9832cbf95a7631e1755e0b71b86` | PASS | First preview ready in 42.512s, version `4da18413-4f43-4c9d-ae90-2378b99eca09`. Tests/build took 29.438s; HTTP readiness required bounded waits. |
| `299a0a16e81892020036162e7c0a8dd3ec2b644a` | PASS | Consecutive main preview ready in 22.447s, version `1f6b6b3e-e3a6-45f7-a2b0-ec30345b5036`. Production unchanged. |
| `027d4691a029a862f89c3abfe5ffd3b67e376f56` | PASS, negative case | Deliberate failing test; no new staging version, production version IDs unchanged and approval refused. |
| `bc34f7bedb58d301e0030f13ba62d069b9a8f729` | FAIL, infrastructure | The sole check/build runner stopped after 8.234s with `OperationInterruptedError: The sandbox container stopped while the operation was pending.` No upload, preview or publication followed. |
| `ad514b424f3c36d957dc197a5444ae469654fab7` | Preview and publication PASS | Fresh-commit retry without source changes. Preview ready in 10.990s, staging version `0dc2d8da-9190-4b26-b823-5cddcc279b2f`. Owner approval published production version `cac7e8ad-b4b8-43d1-870e-353ef514cdc0`, with no Sandbox deployment runner. |

The completed publication uploaded the approved bytes, verified the production-only database binding, deployed that exact immutable version at 100%, read back its deployment, observed HTTP identity and marked the approval published. The artifact digest was `13f830701dfd6d67921ad02a3ca6ce789d40634cd90f26688d98c1972dea398b`. Upload start to verified HTTP identity took approximately 10.433s; independent HTTP 200 returned the exact approved SHA. The publication reservation was released only after completion.

All requested safeguards passed on this source:

- **Approval:** red and stale approval requests returned 403. A previously granted stale approval failed authoritative-head verification before any step. An approval for the final SHA against the old production base failed after publication, with zero deployment steps.
- **Duplicate push:** its Workflow completed with zero steps/runners; candidate attempts remained five.
- **Database isolation:** staging wrote its canary while independent production D1 and production HTTP retained `production-only`. Uploaded versions were checked for the intended database binding.
- **Access:** member read/write fetches succeeded; read-only push and cross-repository access were refused. Removing both test members denied their old Git keys, memory keys and signed sessions while retaining owner access. Removal requests took 905ms and 380ms. The real memory handler enforced privacy and author identity. These are simulated principals and observed request times, not customer SSO or a global revocation-time guarantee.
- **Export:** after stopping the controller and disabling events, restored main, saved-feature and annotated tag `pilot-v1` into an independent bare Git repository. Refs/object IDs matched and `git fsck --full` passed; export/restore took 547ms. No actual GitHub destination was tested.
- **Cleanup:** at 2026-10-02T05:06:05.039Z all fifteen owned resources were absent and all fourteen tracked service credentials revoked, with no leftovers. Member memory keys were invalidated during access removal; their disposable storage and controller were then deleted. Container application/instance absence, emptied buckets, resource absence and temporary token absence were verified. Live preview links no longer exist.

Receipts include `case-verification-safe.json`, `workflow-summary-safe.json`, `final-observation-safe.json`, `published-identity-safe.json`, `production-canary-safe.json`, `git-access-safe.json`, `removal-observations-safe.json`, `export-final-safe.json`, `resource-absence-readbacks-safe.json`, `orphan-container-readback-safe.json` and `cleanup-final-safe.json`.

## Recommendation

Proceed to a representative hosted-app pilot using the direct API backend. Keep this tooling on the existing review branch and create disposable Artifacts repositories for hosted projects; a fork of the public WongStack repository would add maintenance without further isolating the experiment. Integration into the hosted service remains separate work.

Do not migrate customers on this evidence alone. The one-runner design avoids the second deployment container, but the final trial still recorded one infrastructure failure. A production design needs safe runner retry/recovery, a representative application and asset build, real tenant/authentication integration, and broader reliability/cost observations. This tiny fixture does not prove arbitrary untrusted-code isolation, customer SSO offboarding, real GitHub migration or service scale. Native Workers Builds connection support remains unresolved; the working route runs both tests and builds in CI, then uploads via the Workers API.

## Cost and limits

Each run is limited to twelve candidates, one standard-1 runner at a time, thirty minutes per runner and no automatic runner/upload/deploy retries. Controller/Workflow identity polling is bounded. Expiring management and bucket-only snapshot credentials are revoked during cleanup. These bounds are not a dollar spending cap.

[Container pricing](https://developers.cloudflare.com/containers/platform/pricing/), checked 2026-10-02, gives a standard-1 maximum-capacity estimate of `seconds × (4 × $0.0000025 + 0.5 × $0.000020 + 8 × $0.00000007)`. Twelve full thirty-minute runners would be about $0.444 before included allowances. Workflows, Workers, Durable Objects, D1, R2 operations/storage, Artifacts and network costs are additional. Timings above are observed Workflow/controller timings, not metered container CPU or a measured account bill. This small fixture cannot establish service-scale cost or reliability.
