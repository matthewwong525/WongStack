# Disposable REST transport and initialization probe

Source preparation for task 1.3b, not execution authorization. The old schema-10 initializer source passed at `b2ba7f45cdfa7c0b9bd2c3b2d3b7298ae009b7b1`; the old probe source passed at `3a6b9b6f1241cc926b9b9fb48b6a8cd3a0198614` (build 37039809409, payload/scripts 37039809449, app tests 37039809448). Preserve that exact snapshot, private authority and source records immutably: its live phases were **UNEXECUTED/PENDING**, and path B explicitly supersedes that unexecuted plan. No primary memory target was created or initialized in the closed trial.

This revised source requires schema 11 and protocol 2 and has not yet passed its own exact source gate. After that gate, the parent must materialize and verify a wholly new exact-SHA SQL/assets/import snapshot, original owned new-target POST receipts and actual active Worker/Access/binding/origin pins, then review new concrete plans. The old private runner/input is not automatically reused, relabeled or mixed with current files. The parent owns private transport, resource receipts, provider mutations and all git/PR actions. Source PASS never authorizes execution or integration.

## Target and ownership

Use only a newly authorized planned project resource with `kind: d1` and `environment: memory`, after creation and its receipt are recorded. Production and staging business databases are excluded. No extra database, Worker, bucket, project or VM is needed. The probe cannot create or delete infrastructure, alter Access, deploy code, clear an entire DB or recreate a resource.

The parent normalizes the selected service ledger entry into its private ownership manifest. `receipt` must come from the **original successful creation response**, carried by the service's `creationReceipt`; a later GET can verify it but cannot establish ownership. The `source` field records that provenance, not a new provider-returned field. The account is the selected creation-request account, validated by the private transport. The source gate must name the exact committed probe revision that passed remote checks, including the scoped probe coverage include.

```json
{
  "version": 1,
  "account": "<32 lowercase hex account ID>",
  "prefix": "<existing trusted trial prefix>",
  "sourceGate": {
    "sourceCommit": "<new exact gated 40-hex revision>", "requiredChecks": "SUCCESS",
    "snapshot": {
      "sourceRevision": "<same new exact revision>", "schemaVersion": 11,
      "manifestHash": "<SHA-256 of ordered trusted migration manifest>",
      "assetDigest": "<SHA-256 of independently verified exact extracted asset list>"
    }
  },
  "resources": [{
    "kind": "d1", "environment": "memory", "status": "created",
    "id": "<database UUID>", "name": "<prefix>-<planned-project>-memory",
    "receipt": {
      "uuid": "<same database UUID>", "name": "<same database name>",
      "accountId": "<same account ID>", "source": "create-response"
    }
  }]
}
```

Preserve the original ledger/receipt as evidence; this normalized view does not replace it. An absent, duplicate, partial, conflicting or GET-only receipt blocks planning. Never fill these placeholders with guessed identifiers. The manifest and input stay in the parent's private trial directory with OS-private permissions; no credentials or owner email are printed by the planner.

## Read-only plan

The input requires `protocolVersion: 2`, the exact four-field `snapshot` matching `sourceGate.snapshot`, `protectionDigest` (the actual critical deployment/protection digest, or null for a transport-only plan), `sourceRevision`, a fresh 32-hex `runId`, `target: {accountId, databaseId, databaseName}`, and `initialization: null | InitializeMemoryInstallationInput` from [operator-contract.md](operator-contract.md). When present, the initialization target must name the same account/DB, `expectedInstallation` must be null, and its operation ID must be persisted before execution. The prospective owner intent remains private; the plan exposes only a digest of the complete initialization input.

```sh
node scripts/pilots/memory-rest/probe.mjs --manifest <private-manifest.json> --input <private-probe-input.json>
```

This CLI reads those files and prints the plan. It has no execute, token, resource-creation or credential-loading switch. Importing it also makes no provider call. The plan binds protocol/schema version, manifest and extracted-asset digests, actual protection pins, selected original receipt, source revision, run ID, target and optional initialization input to `planDigest`. Changing any bound value requires a new plan and evidence. `executionAuthorized`, `officialGuarantee` and `integrationReleased` are false.

For the complete probe, prepare the full input after the planned protected app/memory Workers exist. A transport-only plan can be prepared earlier with `initialization: null`; its PASS cannot be reused for a different full plan. Prefer one full plan to avoid repeating even temporary probe writes.

## Private runner contract

The source-only entry module exports `planMemoryRestProbe`, `runRestTransportProbe` and `runMemoryInitializationProbe`. Only the coordinating session invokes either mutation function after reviewing the exact phase, target, source gate and intent. No HTTP route exposes these functions. A flags object or browser request is not operator authority.

```ts
type Context = {
  // Read the current private normalized manifest immediately before a phase.
  readManifest(): Promise<Manifest>;
  // Rehash the immutable exact-SHA extracted SQL/assets/import graph independently.
  // Verify source revision and manifest hashes; never echo the requested input.
  readSnapshotReceipt(): Promise<{
    sourceRevision: string; schemaVersion: 11; manifestHash: string; assetDigest: string;
  }>;
  // Authenticated, fixed https://api.cloudflare.com/client/v4 origin; no redirects.
  // Return the unwrapped result, reject unsuccessful envelopes/query results.
  cloudflare(method: "GET" | "POST", path: string, body?: unknown,
    options?: { signal: AbortSignal }): Promise<unknown>;
  // Durable serialized append, awaited before writes. Atomically claim one INTENT
  // per (runId, phase); reject duplicate claims and never overwrite an old result.
  record(event: SanitizedProbeEvent): Promise<void>;
  // Read only this run's durable transport PASS; do not synthesize an object.
  readTransportEvidence(runId: string): Promise<TransportEvidence>;
  // Initializer phase only: the trusted release SQL bundle, hash-checked by core.
  readMigration(filename: string): Promise<string>;
};
```

The asset digest uses the SHA-256 of a UTF-8 JSON list of `{path, sha256}` entries sorted by exact repository-relative path (byte/ASCII order for these paths), with object keys in that order. Include the entire frozen executable import graph, SQL files and other loaded assets; exclude credentials, local configuration and uncommitted files. The parent owns materialization and verifies each entry against the exact gated commit before computing this digest. The manifest hash is `migrationManifestHash()` from that same snapshot: SHA-256 of the ordered trusted manifest JSON. `protectionDigest()` must come from successful actual resource/protection readback, not copied placeholders. The private snapshot receipt is revalidated before any phase INTENT or provider operation; unknown/changed receipts fail closed.

The parent retains its existing credential; the probe never reads or emits it. The transport must honor the supplied 20-second abort signal, reject redirects and preserve provider errors privately in memory for classification. For the deliberate SQL failure, the thrown error's `message` must retain the generated named CHECK-constraint marker. If the transport strips that marker, the probe fails conservatively; do not classify a timeout, 403 or arbitrary error as expected rollback. Error messages, SQL bodies and bound parameters are never copied into reports.

Only exact-account resource/Access readback routes and POST queries to the selected memory DB are allowed by the wrapper. Maximum calls: 30 in transport, 300 in initialization, with three concurrent initialization attempts and a 20-second admission barrier. If the current trial bounds are stricter, the parent enforces those too. An aborted HTTP write has an ambiguous outcome: stop and retain evidence; cancellation does not prove rollback. The evidence writer must be durable and exclusive before any mutating request; if unavailable, stop. Do not run another actor against the target during this coordinated phase.

## Phase A: REST transport observations

After the probe's source gate and separate execution coordination, call `runRestTransportProbe(context, input, reviewedPlan)`. It rereads the manifest, independently verified snapshot receipt and protocol/schema binding and refuses an old, mixed or changed plan. It records intent listing the six exact possible probe table names before provider queries.

1. GET the selected DB and compare UUID/name to its original receipt. Require an empty SQLite catalog apart from SQLite/D1 internal objects. Any business, memory, unknown or previous probe object blocks execution.
2. Send a positive REST batch using multistatement DDL, foreign keys, a trigger, bound metadata writes and a completion row. Read a joined receipt proving all three tables' rows exist.
3. Send a separate batch that creates its own three tables and metadata/completion row, then deliberately violates a named CHECK constraint. Require that exact failure and an empty catalog for the negative-case prefix, including its tables and trigger.
4. Record those observations, then a cleanup intent. Drop only the three positive-case tables named in the plan, in dependency order; their owned trigger disappears with its table. Recheck the whole target is empty. Emit PASS only after that readback and durable evidence append.

On any failure, emit a safe code and `retainForInspection: true`; there is **no catch/finally cleanup**, automatic retry, blanket clearing or resource deletion. A nontransactional negative batch leaves its effects for inspection and cannot pass. The positive-case objects also remain if a later failure occurs before reviewed cleanup. The parent can separately coordinate recovery after examining exact owned effects; this script does not infer permission from their names.

PASS fields include exact source revision, target, plan digest, `positiveObserved`, `rollbackObserved`, `emptyAfterCleanup`, `officialGuarantee: false`, and `integrationReleased: false`. This is current **observed REST behavior**, not an official future API guarantee. It says nothing about real login, ownership, device approval or accessible memory.

## Phase B: canonical initializer race and retry

This is a **separate coordinated mutation phase**, never automatically invoked by Phase A. Call `runMemoryInitializationProbe(context, input, reviewedPlan)` only after reviewing Phase A's durable PASS for the identical plan and target. Require the newly authorized planned app/memory Workers and optional memory bucket; both active 100% versions and settings must bind the same memory DB/bucket, have the correct production/Access pins and no local auth bypass. The actual critical projection must still match `protectionDigest`. Access must still be fully closed, even though the initializer validator recognizes a later narrow paired memory exception. No new resource or VM is required.

The phase requires the DB is still empty, then uses the **actual canonical exports**, not copied schema logic. Three attempts rendezvous before their first migration batch: two carry the same operation/input and the third differs only in operation ID. The first observed successful batch response is deliberately discarded once to test the initializer's response-loss recovery. This is simulated response loss around a real successful REST response, not a claim of an uncontrolled network failure.

Whichever operation wins must produce one stable installation pin. Every attempt for that operation must return it; the conflicting operation must report `installation-conflict`. A normal identical retry must keep the same IDs with no newly applied migrations. Read status and require pending-owner/owner-unconfirmed, exactly one bootstrap completion and one schema-11 manifest receipt matching the plan, and no owner reviews/attempts/completions, principals, memberships, devices, credentials or legacy keys/admins.

The resulting installation/schema is **retained** in the same planned memory DB. Do not reset it to repeat the race. It remains pending owner/device; no human identity is created. Record the stable installation pin and safe pending result for later review. A Phase B PASS does not replace the hosted service's temporary IDs automatically, wire consumers, confirm an owner, open Access, deploy handlers, approve a device or release integration. Those need the separate explicit handoff. On a failure, preserve all effects for inspection; no automatic clearing, recreating or retry against a fresh DB.

## Source checks and evidence limits

`scripts/tests/memory-rest-probe.test.mjs` uses disposable SQLite/provider fixtures to check exact ownership/gates, read-only CLI behavior, empty-store refusal, successful DDL/metadata, deliberately nontransactional failure retention, safe errors, durable-intent failures, scope/budget guards, stale/wrong evidence, closed Access, canonical concurrent retries and simulated response loss. These tests verify probe behavior; they do not count as live REST evidence. The root-owned C8 change includes exactly `scripts/pilots/memory-rest/*.mjs`, retaining existing floors/exclusions.

Pass the exact remote script/payload/app checks for the probe revision before any execution. Retain the original resource creation receipt, committed source revision, read-only plan, durable intent/outcome events and sanitized active configuration evidence. Record a missing/incomplete/error result as such. Task 1.3b remains unchecked until both separately coordinated live phases and their readbacks pass. No actual target IDs, active receipts or provider results are invented in this preparation.


## Owner-confirmation evidence is separate

Neither phase validates the durable owner-confirmation transaction. Its own source/live plan must prove real fresh human candidate creation, explicit operator target/identity/code review, receipt expiry/replay, wrong target/code/service denial, rollback/concurrency and exact lost-response outcome guards. Deliberate nontransactional source fixtures establish fail-closed behavior only. Do not invoke the owner library, create a synthetic owner or extend this initializer probe to confirmation automatically. Tasks 1.4 and 1.3b remain incomplete until their separately coordinated evidence is accepted.
