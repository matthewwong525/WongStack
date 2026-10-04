# Acceptance target and grant ledger

**State:** preparation only; not authority. Null or unresolved fields block live use.

The machine-readable [compatibility manifest](compatibility.json) keeps prepared identities separate from actual publication receipts. This ledger names targets, scopes and ownership; it contains no token values, private context, recipient token hash or secret-derived hash. The parent may append sanitized read-only preflight observations. Every created ID requires its own operation receipt before use or deletion. A matching name never establishes ownership.

## Existing resources to preserve

| Field | Prepared value | Required readback |
| --- | --- | --- |
| Environment | Cloud staging | Exact deployed service version and code SHA |
| Service Worker | `wongstack-cloud-staging`; preflight version `05dafc8c-77f8-451a-80f4-544fe29a9b22` | [Observation-at-time](provider-preflight.json); final maintenance/acceptance deployed receipt remains pending |
| Existing DB | `1029a8e7-be64-42c0-bf9a-de49f87a2322` | Binding and current migration inventory |
| Account | `040f88e2bf4f25fb0b91b7cb24f3d442` | [Read-only preflight](provider-preflight.json); Artifacts inventory401 is unknown, not absence |
| Owner ID/email | `5c5eca98-d495-45d3-9f7a-4da7b9d1b17a` / `operations@claymoo.com` | Fresh select-only owner readback; subscription canceled; sign-in still separate |
| Workspace/VM ID | No eligible ready workspace; exactly one disposable VM proposed, planned UUID `83ec40bf-8873-4b75-a1b5-49151f2b1b8d` | Fresh separate provisioning approval binds exact owner/UUID/source/type/location; append actual ready/runtime/recipient receipts before hosted use |
| Recipient/generation | Unresolved | Nonsecret recipient identity/generation and boolean match; never store token hash |
| Agent | Contract5 required; default remains contract4 | Actual source/runtime/guard and root ownership readback |
| Existing production/VM/secrets | Preserve all | Before/after configuration hashes and exact IDs; secret presence booleans only |

## Proposed disposable inventory

Prospective target names are listed below; actual provider identities and absence readbacks remain pending. Record expected-absence readbacks before creation; never adopt a pre-existing name. For each row append exact target, kind, owner/project, create operation ID, immutable returned resource ID, authoritative readback reference and approved teardown method.

| Kind | Bound/scope | Removal and proof |
| --- | --- | --- |
| Disposable staging VM/IPv4 | Exactly one EUCPX22 4GB VM at most2h; one primaryIPv4; no backups/snapshots/volumes/new shared firewall | Exact provider server/IP IDs and canonical absence after deletion; preserve existing service/user/DB/shared firewall, revoke run-issued agent/pairing authority, name any owned tombstone. Power-off continues billing |
| Artifacts namespace | One new uniquely named namespace | Delete only if a supported method is verified; otherwise retain the named empty namespace as an approved leftover after both owned repos are absent |
| Starter repo | One, frozen main at exact prepared tree | Repo-specific publishing grant revoked immediately after freeze; exact repo deletion after handoff/evidence |
| Customer repo | One deterministic `ws-<owner/workspace digest>` | Exact refs/repo removed after same-operation recovery and evidence; canonical absence |
| Customer Worker | One immutable Worker ID; initial503 only | Exact owned preview/version/deployment and script removal; canonical absence and URLs cease serving |
| Access app/policies | One Worker destination; one exact owner Allow plus one observer non_identity policy | Preserve until all serving endpoints cease; then delete exact IDs and inventory |
| Observer token | One project token, at most24h | Revoke exact token ID; inventory absence and old authentication denied |
| Workspace Git grant/context | One customer-repo write grant, at most24h; original context/retry generations | Preserve for uncertain recovery; revoke exact grant/context, deny old authority |
| SDK read grants | At most50 total, exact customer repo, at most1h | Complete before/after inventory each Workflow, exact token-ID correlation and revocation; no unidentified grant allowed |
| Starter publish grant | One starter-repo write grant, at most1h | Revoke after freezing, canonical absence and old access denied |
| Runner resources | One container app/DO class+namespace/image digest; at most40 serial instances | Consume/cancel logs; supported exact stop/destroy and full inventory including failed/orphan instances; image/app/namespace cleanup |
| Backup bucket | One dedicated R2 bucket; no cache, at most5GiB | Read back at most24h deletion lifecycle on backups/ and cache/; enumerate/delete objects/versions, prove empty and remove exact bucket |
| Workflow/subscription | One binding/subscription filtered to exact customer repo; at most8 check+2 release Workflows | Stop admission, reconcile uncertain runs, supported terminate/delete/readback; preserve existing provision channel |
| R2 credential | At most one pair, exact backup bucket, only if SDK requires it | Record owning token/key IDs only; revoke and prove absence; customer process gets neither key |
| Platform authority | Preserve existing suitable secret; otherwise at most one specifically approved account token | Disclose necessary account scope; guard exact targets; revoke only run-issued authority |
| Workspace/service artifacts | One checkout/Paseo registration and acceptance-owned hosted_starter rows | Preserve evidence/recovery first; remove exact owned checkout/registration/ciphertext; preserve unrelated user/VM/enrollment/billing rows |

Every unsupported deletion method, pagination permission/error, unidentified grant, retained migration tag or namespace is a prerequisite/leftover with exact ID, reason, cost, protection and next readback. Expiry, snapshot TTL, SDK success or destroy logs do not establish absence. No wildcard deletion, replacement credential, VM creation, subscription or trial is authorized by preparation. The user chose preparing one exact staging owner/VM contract5 Source override through existing provisioning; ordinary paid access remains required outside the separately approved preparation of this exact internal staging exception. No ready workspace, unavailable Artifacts inventory and missing exact ordinary recipe/owner/target/runtime/cleanup/cost inputs block live use. Nested Docker is deferred and adds no inventory for this functionality trial. No customer-isolation or full-acceptance claim is permitted.

## Prepared internal owner and target names

These names/IDs are prospective and create nothing. The owner selected preparation of a one-VM staging-only access exception without changing subscription/billing records. Live activation remains a separately explicit item of the final bound request. Preserve all normal paid access and deny foreign/expired authority.

- Owner: `5c5eca98-d495-45d3-9f7a-4da7b9d1b17a` / `operations@claymoo.com`; current subscription canceled.
- Planned workspace UUID: `83ec40bf-8873-4b75-a1b5-49151f2b1b8d`; planned project `hp_d3fd2bfec810475cd45de5bf97eced82`.
- Planned namespace: `ha-83ec40bf`; starter repo `starter`; app repo/Worker `ws-d3fd2bfec810475cd45de5bf97eced82`.
- Planned backup bucket: `ha-83ec40bf-backup`; Workflow `ha-83ec40bf-ci`.
- Actual resource absence/inventory, immutable server/IP/image/worker/Access IDs, existing firewall, location and execution-day pricing are pending. Name selection is not ownership or creation authority.
- The REST namespace guide documents create/get/list but no delete route. If no supported deletion is verified, the exact empty namespace is a proposed retained leftover for the final request; never invent DELETE or report it absent.

## Proposed run-only platform credential

Read-only permission discovery found the existing host token active, with API Tokens Write, but lacking Artifacts and Workers Containers permission groups. Do not widen it, transfer it to check/build or treat401 as namespace absence. The final exact request may approve minting at most one separate finite platform execution token for account040f88e2bf4f25fb0b91b7cb24f3d442, solely for the reviewed trial management/deploy/cleanup paths. Its account-wide provider scope must be disclosed and enforced by exact target guards. Record only returned token ID and configured expiry; store plaintext in the intended ignored live file/runtime secret, never evidence. Actual issuance capability/scopes must be read back under that approval; discovery is not issuance.

Candidate necessary account-scoped groups from authenticated permission discovery:

| Group | ID | Intended use |
| --- | --- | --- |
| Artifacts Read |71b0df4c5b6c4d3196f4428d7a6580ea | Complete namespace/repo/grant inventory |
| Artifacts Write |f9e1ba803b8d4d52b4d4184825b07a28 | Exact two repos, starter freeze, grant revoke/cleanup |
| Workers Scripts Write |e086da7e2179491d91ee5f35b3ca210a | Named app and reviewed staging configuration only |
| Workers Containers Read/Write |cfd39eebc07c4e3ea849e4b3d2644637 / bdbcd690c763475a985e8641dddc09f7 | Exact trial container/image inventory/lifecycle |
| Workers CI Write |2e095cf436e2455fa62c9a9c2e18c478 | Exact Workflow/customer-only subscription |
| Workers R2 Storage Write |bf7481a1826f439697cb59a20b22293e | Exact disposable backup bucket/lifecycle/cleanup |
| Access: Apps and Policies Write |1e13c5124ca64b72b1969a67e8829049 | Account-scoped exact Worker protection |
| Access: Service Tokens Write |a1c0fec57cf94af79479a6d827fa518c | Exact app observer token and revocation |

This is a candidate permission set, not configured authority. Remove any unnecessary group when the actual CLI/API path is verified; no API-token-management, Memory, billing or unrelated account scope enters the run token. R2 object credential, if the pinned SDK requires it, is a separately listed bucket-scoped pair in the same final request. Cost-preflight.md records partial current rates and unresolved feasibility.
