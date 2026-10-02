# Durable first-owner review and confirmation

The nineteen-path source implementation passed its exact remote gate as recorded below. The operator preparation source gate passed at `c52c1efc63eef6a5c37872221b78fccb79abb664`; [its acceptance record](owner-operator-preparation.md) retains the exact checks and test repair. Tasks 1.4 and 1.3b remain unchecked. The approved source boundary remains the twelve original plus seven additional paths below. Only postgate change-local acceptance documentation is now released; committed implementation and shared files remain unchanged pending coordination. No live call, private snapshot/runner mutation or provider operation is authorized for this session.

## Source acceptance record

The checkpoint owner reported `SOURCE_GATE_RESULT=SUCCESS` at exact revision `2206f32d63931d969cb55d22fce57e84a4e33efd`: required actual push [build 37056253246](https://github.com/matthewwong525/WongStack/actions/runs/37056253246), [payload/scripts 37056253235](https://github.com/matthewwong525/WongStack/actions/runs/37056253235) and [app tests 37056253233](https://github.com/matthewwong525/WongStack/actions/runs/37056253233) all passed. Skipped duplicate PR runs are excluded. The full script suite passed 1,263 tests with zero failures or skips; coverage was 92.73% statements/lines, 89.19% branches and 94.58% functions, with unchanged floors, includes and exclusions. No local suites, builds or lint were run.

All nineteen implementation handoff hashes and the separately held preparation document hash were committed unchanged. SQL 0001–0010 was verified byte-identical to exact `3a6b9b6f1241cc926b9b9fb48b6a8cd3a0198614`. Working `areas.json` remained untouched and unstaged. The gate validates the committed source and fixture behavior; it does not establish live REST transaction behavior, human ownership or device readiness.

Only the source freeze was released. The parent is materializing a wholly new exact-2206 snapshot with independently rehashed extracted files and exact check receipts. No newly owned target exists at this checkpoint, and no private live runner/input has been relabeled or executed. Original-POST-owned target receipts, actual active Worker/Access/binding/origin pins and individually reviewed transport, initializer and owner-confirmation phase plans remain prerequisites. The old exact-3a snapshot/private history remains immutable and **UNEXECUTED/PENDING**. The real unused human mailbox remains pending and must not be inferred or seeded. No route, consumer, CLI or device activation, owner grant, provider call or live integration handoff follows from this source result; tasks 1.4 and 1.3b remain unchecked.

## Chosen compatibility boundary

The checkpoint owner selected **path B**: explicitly supersede the unexecuted schema-10 probe with a new, fully gated schema-11 snapshot and reviewed plan. The closed trial created no primary memory database, Workers or installation; there is no live schema-10 installation from that trial to upgrade. Preserve the immutable exact `3a6b9b6f1241cc926b9b9fb48b6a8cd3a0198614` snapshot, private authority records and source-gate evidence with their **unexecuted/pending live history**. Its successful source gate remains valid historical evidence. It supplies no schema-11 source or live evidence.

New implementation must support fresh schema 11 and exact completed schema-11 retries. It must explicitly refuse a completed schema-10 installation with `schema-unsupported`, preserving all rows, IDs, origins, receipts and configuration. An absent schema-11 receipt, partial migration, legacy/nonempty foreign store or future schema also fails closed. No automatic adoption, reset, repin, new IDs or schema-10 upgrade is part of this slice. A separately reviewed managed upgrade or legacy-owner migration may be added later. No old deployment should be upgraded to this runtime under a claim of compatibility before that work exists.

## Forward schema and initializer

Append `0011_owner_confirmation_receipts.sql`; preserve SQL 0001–0010 byte-for-byte. Add its exact hash to the trusted manifest. The new tables serve three distinct purposes:

| Record | Required binding and lifetime |
| --- | --- |
| Schema completion receipt | Installation/repository, schema version 11, digest of the ordered migration filenames/versions/SHA-256 values, original bootstrap request hash and operator audit reference. Immutable and retained. |
| Owner review receipt | Random confirmation ID, candidate ID, full target pin digest, provider/intent and candidate snapshot digest, authorization/pin revisions, inspection time and expiry. Pending/consumed/expired/revoked lifecycle with immutable terminal state and outcome references. |
| Owner confirmation attempt/completion | Exact review ID and input digest, installation, candidate, outcome principal/binding and structured audit references. A unique first-owner attempt per installation; completion is immutable and written only after all required state agrees. Incomplete attempts never count as accepted ownership. |

The source uses separate `memory_owner_attempts` and `memory_owner_completions` tables with immutable/retained records; it must not overload `memory_identity_reviews`, which requires existing principals. Private subject/email/code hashes remain in the server-side candidate/review snapshot. No plaintext code, browser assertion, credential or cloud-role authority enters these tables or audit messages.

Fresh bootstrap generates installation/repository IDs once, loads and verifies every trusted SQL asset, and creates no principal, membership, review or owner-confirmation attempt. It writes the schema-11 manifest receipt and the existing final bootstrap completion receipt only after verifying the new schema and all initial metadata. The original owner email remains a prospective restriction, not proof. Setup status remains pending-owner; it never infers a machine grant.

Managed retries must require the exact expected schema versions, manifest digest, original request hash, completion/audit references and target pins. A version marker alone is insufficient. The same operation/input or explicitly pinned matching installation returns the original IDs without replaying SQL. Changed manifest, missing receipt, changed configuration or ambiguous partial effects fail closed and retain the database for inspection. A lost response can be recovered only by reading the exact completed outcome.

Keep meaningful completed-schema-10 source fixtures. They must include the real schema-10 bootstrap/configuration/completion relationship, not just ten migration numbers. New tests assert explicit refusal and unchanged snapshots. Existing partial-bootstrap, response-loss and concurrent-initializer tests stay; adjust statement-index fixtures deliberately so their injected failure still occurs after the intended DDL/metadata step. Do not merely replace the expected version number or remove the previous checks.

## Durable inspection receipt

The future `inspectMemoryOwnerCandidate` remains a trusted-process capability, as defined in [operator-contract.md](operator-contract.md). It must verify provider access to the exact account/resources, active production deployment bindings, shared memory store and current Access protection. Current human allow rules must still admit the candidate's verified email; a verification-service policy cannot substitute. It then rechecks the exact pending candidate, owner intent, provider, verified identity, absence of a prior owner/confirmation attempt and schema/bootstrap receipts.

Use a canonical, versioned serialization for digests. The review snapshot binds the complete installation/resource/origin pin; candidate ID, purpose, subject, verified email, code hash and creation/expiry times; provider ID/issuer/audience; prospective owner intent; and authorization/pin revisions. Bind a projection of the reviewed deployment/protection facts, including actual Worker IDs, active version IDs, relevant bindings and Access policy/destination configuration. Raw provider envelopes, secrets and unrelated volatile metadata are excluded. Any material change requires a new inspection and explicit operator review.

Inspection persists a short-lived receipt, valid for at most ten minutes and never beyond candidate expiry. It grants nothing and does not extend the candidate. Repeated inspection of an identical live snapshot may return the same pending receipt; terminal or expired receipts cannot reopen. A uniqueness rule for candidate/snapshot prevents inspection retries from multiplying equivalent receipts. The private result exposes only the existing planned display fields and confirmation ID; no subject, hash or code is returned. The human supplies the comparison code from the protected app screen.

## Explicit confirmation and atomic outcome

`confirmMemoryOwner` first uses the strict input parser, then independently authenticates its trusted operator transport. The three `true` flags represent an actual review of target, verified identity and matching code; they are not credentials. Require a real candidate created by a fresh verified human request. A synthetic mailbox, cloud project role, service assertion or typed email never supplies human proof.

Before attempting any mutation, revalidate current resource/protection readbacks and the exact durable receipt, target, candidate snapshot, owner intent, revisions, expiry and code hash. A changed deployment/protection projection invalidates the review. There is no public owner-confirm HTTP endpoint, and this first-owner method never becomes recovery or role reassignment.

One guarded database transaction must reserve the unique first-owner attempt, create the principal/binding/owner membership, consume the candidate/intent/review, advance authorization revision and finalize the structured audit and completion receipt. Every mutation is tied to the same exact attempt. Concurrent identical or competing confirmations cannot create multiple owners. The accepted state must be reconstructible from all linked rows, not a successful REST envelope or an isolated principal row.

In addition to proving rollback on the intended transport, retain an explicit fail-closed barrier: reserve the attempt before creating authority, set the installation to maintenance before principal/binding/membership writes, and restore its prior pending setup state only as the final guarded transition after exact completion validation. The unique attempt prevents a second attempt from adopting partial work. Existing human authorization denies maintenance; subsequent device/data handlers must preserve that denial. Tests must exercise a deliberately nontransactional transport double: interrupted work may remain, but it cannot open memory or be silently retried into ownership. An incomplete attempt/completion mismatch stays blocked for separately reviewed operator recovery. No automatic delete/reset/recreate or rollback script is inferred.

An identical retry after a lost response reads the immutable exact outcome and current state. If complete, it may return the ordinary no-device-proof setup result; it creates nothing and does not reactivate removed membership or devices. If incomplete, conflicting or unsupported, it fails closed. A consumed review cannot authorize a different candidate, principal or target. Successful first-owner confirmation yields pending-device, never ready. Provider readbacks and the database transaction are not one distributed transaction; results must not claim that they are. External protection changes still require revalidation and can block the result.

## New probe snapshot and separate live phases

The new source gate must pass required push app build/tests and full payload/scripts with unchanged floors. Only afterward may the checkpoint owner materialize a new exact-SHA snapshot containing the complete import graph, schema-11 manifest and SQL/assets. Do not mix in files from the current working tree. Verify each asset hash and a canonical snapshot/manifest digest; retain those beside the exact source check receipts.

Revise the probe plan contract explicitly for schema 11. Its digest must bind plan protocol/version, exact source SHA, expected schema version, ordered migration-manifest digest, extracted asset/snapshot digest, target ownership digest, initialization input digest, actual active Worker/Access/binding/origin pins, phase list and bounds. Recheck them before each phase. Old protocol/input/evidence is rejected; no compatibility fallback relabels a schema-10 run. An ownership manifest still needs the original successful POST creation receipt for a newly authorized, owned `kind=d1/environment=memory` target; a GET or old closed-trial receipt cannot establish new ownership.

The checkpoint owner must review the new concrete plan and separately supply private transport and execution authority. The old private runner/input is not relabeled or reused automatically. No target creation, credentials, owner intent or live phase follows from choosing path B, writing these documents or passing the source gate.

1. **Transport observation:** a newly reviewed bounded phase on the exact owned target, with positive DDL/metadata, deliberate late failure/rollback, durable intents and sanitized evidence. A pass records current observations, not a future REST guarantee.
2. **Schema-11 initialization:** separately coordinated after matching transport evidence. Use the canonical new exports on an empty target, actual closed production app/memory protection, and pinned shared resources. Exercise concurrent identical/conflicting initialization and simulated successful-response loss. Read back both bootstrap and manifest receipts, stable IDs, schema 11, pending-owner and no principal/member/device/credential. Retain the resulting store; do not reset it for a rerun.
3. **Owner inspection/confirmation:** a separate future source and live acceptance plan, using the genuinely signed-in human candidate and explicit operator target/identity/code review. Prove receipt creation/replay/expiry, transactional rollback at meaningful mutation boundaries, competing confirmations, lost-response outcome recovery and fail-closed incomplete states. Initializer PASS is not evidence for this transaction. No synthetic candidate may establish a real owner under a transport test pretext.

The third phase needs a concrete, separately reviewed mechanism for its bounded failure/concurrency experiments; this design does not authorize fault injection into an arbitrary customer store or new public endpoints. A failure retains all effects and evidence for review. Consumer exports remain unwired until their own explicit handoff. Devices enrollment, memory read/write/revocation and full human acceptance remain later tasks.

## Proposed implementation reservation

The checkpoint owner authorized source implementation in these twelve original paths:

- `.agents/skills/memory/migrations/0011_owner_confirmation_receipts.sql` (new)
- `.agents/skills/memory/scripts/lib/installation-migrations.mjs`
- `.agents/skills/memory/scripts/lib/installation-state.mjs`
- `.agents/skills/memory/scripts/lib/installation-operator.mjs`
- `.agents/skills/memory/scripts/lib/owner-review.mjs`
- `.agents/skills/memory/scripts/lib/owner-operator.mjs` (new)
- `.agents/skills/memory/scripts/lib/owner-confirmation-state.mjs` (new)
- `scripts/tests/memory-owner-confirmation.test.mjs` (new)
- `scripts/tests/memory-owner-review.test.mjs`
- `scripts/tests/memory-operator.test.mjs`
- `openspec/changes/installation-owned-memory-devices/operator-contract.md`
- This new design document.

The checkpoint owner also approved these seven additions for exactly these purposes:

| Path | Exact purpose |
| --- | --- |
| `.agents/skills/memory/scripts/lib/installation-resources.mjs` | Return a sanitized stable deployment/protection projection for receipt binding, without loosening existing validation. |
| `scripts/tests/fixtures/memory/schema10.mjs` (new) | Preserve a nonsecret completed-schema-10 fixture and assert refusal without adoption. |
| `scripts/tests/memory-operator-resources.test.mjs` | Verify material readback changes invalidate receipt binding and private/unrelated fields are excluded. |
| `scripts/pilots/memory-rest/plan.mjs` | New schema/snapshot/manifest/pin digest-bound plan contract and rejection of old plans. |
| `scripts/pilots/memory-rest/initialization.mjs` | Require the new plan/manifest receipts and exact schema-11 postconditions. |
| `scripts/tests/memory-rest-probe.test.mjs` | Keep existing meaningful transport cases and add old-plan, mixed-snapshot and schema-11 receipt rejection. |
| `openspec/changes/installation-owned-memory-devices/rest-probe.md` | Mark exact old live phases unexecuted/superseded and document the separately gated new plan. |

If inspection of the source identifies another dependency, stop at that file boundary and coordinate it; do not expand this reservation silently. The private snapshot, runner, manifest, provider transports, resources, git/PR operations and live phases remain solely parent-owned. Shared installer/setup/wiki and `areas.json` are excluded. No tests are deleted/skipped, no coverage include/floor changes are requested, and old source evidence is never rewritten as new acceptance.


## Implementation checkpoint

The source now appends migration 0011 and its hash without changing earlier SQL; the initializer writes and verifies `memory_schema_receipts` together with the original completion/audit. The new completed-schema-10 fixture verifies refusal without writes. `owner-operator.mjs` implements durable inspection and explicit confirmation, while `owner-confirmation-state.mjs` owns guarded statements and the maintenance/completion barrier. These exports are unwired. `installation-resources.mjs` returns a digest of sorted, explicitly projected critical fields and independently checks human email admission.

The probe now requires protocol 2, schema 11, exact manifest/asset/source snapshot receipts and protection pins. Its private context must independently verify the extracted snapshot before each phase; echoing an input digest is not verification. Old/mixed plans and evidence are refused. No owner-confirmation live probe is added or authorized: those experiments still need their own concrete plan and exact human/operator prerequisites.

Tests cover all eleven confirmation statement interruption points, deliberate nontransactional partial effects, missing barrier/completion steps with success envelopes, stale in-flight revisions, competing/identical attempts, expired/revoked/wrong-code reviews, independent human-policy admission, response-loss recovery and removed-membership nonresurrection. Existing source failure assertions and coverage floors remain. Static validation is separate from the required remote suites; tasks 1.4/1.3b remain unchecked even if this source gate passes.
