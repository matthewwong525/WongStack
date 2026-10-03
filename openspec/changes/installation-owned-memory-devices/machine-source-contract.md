# Inactive machine authorization source contract

This task2.2/2.3 preparation is callable only by a trusted in-process infrastructure adapter. It adds no route, CLI, caller, credential transport, provider execution or legacy cutover. The existing Worker ignores machine maintenance, and the old migrate command discovers SQL broadly. Both remain blockers to runtime activation. SQL0012 alone adds empty tables and does not retire keys, seed identities or make memory ready.

## Separate authority and receipts

The complete `machineMigrations` manifest pins SQL0001–0012 byte hashes. Historical `memoryMigrations` remains schema11. Fresh schema12 initialization seeds the existing installation ID/resource row with minimum protocol2, then the separate machine configuration, bootstrap audit, manifest receipt and final bootstrap completion. It creates no human/email/provider/membership/owner intent or historical bootstrap/schema11 receipt. SQL0001–0011 and prior manifests/fixtures/snapshots remain unchanged. Completed10/11 are refused without writes or ID changes; their reviewed upgrade belongs to task4.2.

Managed12 readback requires the exact version sequence and table inventory, all machine receipt/mutation guards, separate schema12 manifest receipt and matching bootstrap operation/request/pin/audit chain. A missing final receipt, unexpected table, broken manifest, missing guard, incomplete attempt, different target or newer schema is not adopted or automatically repaired. Provider success envelopes alone do not establish completion. Stored bootstrap receipts remain immutable and distinct from current grant operations.

## Exported signatures

All libraries are Node-free. `operator` supplies trusted `cloudflare(method,path,body)` and `readMigration(filename)` infrastructure adapters. Possession of an ordinary machine credential, Access service token, cloud project role, public installation URL, email or repository clone never constructs this trusted adapter. The eventual transport/credential loader is absent and needs a separate review before use.

`machine-operator.mjs` exports:

- `inspectMachinePins(operator,target) -> sha256`: exact active Worker version, resource bindings and origin host/route projection. Reordering provider arrays or incidental timestamps does not change pins; changed critical fields do. No human Access email establishes machine authority. App protection/edge reachability are separate integration work.
- `initializeMachineMemory(operator,{target,operationId,expectedInstallation:null|{installationId,repositoryId},pinHash}) -> {memory,installation,snapshot,schemaVersion:12,appliedMigrations}`. Fresh target must be empty. Retry uses the same operation/request/pin; expected IDs verify existing identity and never authorize adoption or a different operation.
- `readMachineSetupStatus(operator,{installation}) -> {memory,snapshot}`. Installation includes the exact seven target fields plus opaque installation/repository IDs.

Target fields are `accountId,databaseId,bucketName,appWorkerName,memoryWorkerName,appUrl,memoryOrigin`. Every origin is canonical HTTPS production. `snapshot` is `{authRevision,pinRevision,snapshotHash}`; its digest binds configuration state, barrier, IDs, target and bootstrap request/pin.

`machine-enrollment.mjs` exports:

- `issueMachineGrant(operator,{installation,attemptId,expected,grantId,machineCommitment,capabilityHash,scope,expiresAt})` creates one short-lived grant with a maximum ten-minute life.
- `enrollMemoryMachine(operator,{installation,attemptId,expected,grantId,machineId,machineCommitment,capabilityHash,scope,credentialHash,credentialExpiresAt})` consumes exactly one matching grant and creates one stable machine namespace and hash-only credential. Scope cannot exceed the grant ceiling; credentials last at most30 days. The same opaque ID is inserted in generic `memory_principals` so existing facts/sessions ownership foreign keys work; no identity binding or human membership is seeded.
- `revokeMemoryMachine(operator,{installation,attemptId,expected,machineId,machineRevision,grantRevision})` advances the exact grant/machine revisions to retained tombstones and marks its generic principal removed. No credential, transcript or authored record is deleted.

The inactive `machineScopePolicy(scope)` explicitly represents separate shared-write and own-private-capture permissions. `memory:read` is reader scope: it can read permitted shared memory and capture its own private facts/sessions/transcripts, including private threads, but cannot publish shared records. Member/admin scopes add permitted shared writes; data administration never changes grants or auth tables. Future core capture routes must enforce that policy and authenticated ownership; the old data API is not wired to it.

Scopes are exactly `memory:read`, `memory:read memory:write`, or `memory:read memory:write memory:admin`. Commitments and credential/capability hashes are lowercase SHA256; no secret is generated, returned or logged by these exports. A future adapter must bind machine commitment to private initiating-machine state and deliver the private capability outside public results/git/URLs. Labels, hostname and email never establish continuity.

## Persistent proof and future public verification

These exports receive hashes through an already trusted in-process adapter. Accepting `capabilityHash`, `machineCommitment` or `credentialHash` is NOT public bearer-proof verification. Hashes alone must never authorize an Internet caller. The future protected core enrollment route must verify the raw privately delivered one-use capability against its stored hash and verify proof from the initiating machine before calling any mutation. Public setup/status never includes those private values.

The persistent machine commitment is the SHA256 commitment to a canonical machine public key, independent of its current thirty-day bearer. The machine keeps the matching private signing key and stable namespace in private OS-user state; future challenge proof binds the nonce, exact installation/repository/origin, grant, machine ID and current authorization/grant revision. A name, public-key digest or copied namespace file cannot substitute for possession proof. The current source fixture uses synthetic commitments; key generation/signature verification/nonce replay controls are not yet implemented and are required in the coordinated runtime/client slices.

Pending grants expire after ten minutes to bound enrollment. Consumption retains that grant as ongoing revocable authority; its original enrollment expiry does not expire an enrolled machine. Later unattended renewal can prove possession of the persistent private signing key even after a bearer has expired, if the same grant/machine are active and current. It rotates only the bearer in the same namespace. Revocation denies both persistent-key renewal and every old/new bearer; renewed setup is never inferred from a stale credential, and removed authority cannot silently reenroll. Renewal routes, durable local signing state and overlap rules remain unimplemented.

## Maintenance and completion

Each mutation validates current deployment/resource pins, exact configuration snapshot/revisions, target, input ceiling and durable prior grant evidence. Attempt reservation atomically closes maintenance and advances the global authorization revision in its SQL trigger. Every subsequent mutation carries the exact owned attempt/request/payload/snapshot/pin/revision barrier guard. A concurrent identical loser also checks the winner's audit identity and cannot continue another incomplete batch.

Only an immutable final completion can release maintenance. Both audit insertion and completion publication have SQL triggers that independently require the exact current issued grant, or consumed grant plus active machine/generic principal/credential, or matching revoked machine/grant/generic tombstone. Post-success JavaScript verification is additional proof, not the only barrier guard. Deliberately nontransactional partial authority writes remain in maintenance and refuse all automatic retry/repair; a separate explicit recovery procedure is unfinished.

Lost-response recovery returns only the original exact attempt's durable audit/completion and current outcome at its completed auth revision. Changed inputs, stale revisions, expired credentials, consumed/revoked grants or removed generic/machine authority cannot recover an active enrollment or issue a second credential. Identical/competing attempts either converge on that same exact receipt or refuse. An unrelated newer authorization operation can invalidate older result replay; callers must read current status rather than infer ready from historic completion.

Every public `memory` result is protocolVersion2, IDs/origins, `pending-setup` or `blocked` and a sanitized reason. It contains no secret, email or retired browser action URL. Even completed enrollment remains `pending-setup`: no `ready` export exists until later core authorization and a permitted operation proves access for THIS machine. Renewal, credential overlap and operating-system storage are future coordinated slices.

## Separate probe preparation and source limitations

`machine-plan.mjs` exports pure `planMachineMemoryProbe(manifest,input)`. Protocol3/source manifest version2 requires gated schema12 SQL/assets, exact source revision/manifest/asset digest, original create-response ownership receipt for the disposable memory D1, and exact phase/pin/target evidence. Old protocol2/schema11 snapshots, mixed assets and source-only PASS cannot supply live phase evidence. Transport, initialization and grants each get a separate plan digest; later plans require matching prior observed receipts and still set `executionAuthorized:false`, `ready:false`, `integrationReleased:false` and `officialGuarantee:false`. No new snapshot is extracted before task2.3's full exact remote gate. No runner or provider execution is supplied.

SQLite fixtures exercise atomic and intentionally nontransactional transport, every authority mutation boundary, missing outcome despite audit, stale revision races, grant expiry/ceiling/target/replay refusal, identical/competing attempts and revoked lost-response recovery. These are source contracts, not D1 REST rollback/concurrency guarantees or live acceptance. Task2.2/2.3 remain unchecked until the exact remote gate. Activation needs coordinated runtime/CLI/legacy cutover and separately owned live transport/initializer/grant phases; this source checkpoint releases none of them.
