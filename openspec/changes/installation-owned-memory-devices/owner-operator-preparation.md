# Owner operator preparation

This is a source-only part of task 1.4. The first-owner request/CSRF/candidate slice passed at `e992cef873b0c84eb1937f6e05379a6c6b2a91f7`; its [acceptance record](owner-candidate-contract.md) passed at `a0f0fc3b2830fd27f6852552edf64848ec70513a`. This preparation slice passed its own source gate as recorded below. Tasks 1.4 and 1.3b remain unchecked. No memory installation, live human candidate or operator confirmation is presumed to exist.

## Source acceptance record

The checkpoint owner reported `SOURCE_GATE_RESULT=SUCCESS` at exact revision `c52c1efc63eef6a5c37872221b78fccb79abb664`: [build 37051066033](https://github.com/matthewwong525/WongStack/actions/runs/37051066033), [payload/scripts 37051066035](https://github.com/matthewwong525/WongStack/actions/runs/37051066035), and [app tests 37051066030](https://github.com/matthewwong525/WongStack/actions/runs/37051066030), all required push checks successful. Skipped duplicate PR entries are excluded. The full script suite passed 1,241 tests with zero failures; coverage was 92.62% statements/lines, 89.05% branches and 94.52% functions, with unchanged floors.

The preceding `22fdefdd8df705e351d5e385b9def0ebcaeae3c6` payload gate failed four tests because hooks were assigned to a copied fixture object. The single-file repair wraps the actual synthetic provider callback and preserves the read-only/query/state assertions, adding counters for injected mutations/errors. The corrected test hash is `f46c369f891ec994c94978c7e9ec5cb2f95cd80237a0658a5b364c33da390c5e`; the two modules and this document's pre-record contents were unchanged through the successful gate. No local suites/build/lint were run.

Only the source freeze was released. No CLI, route, consumer, principal, confirmation, provider call or live integration acceptance followed. The next dependency is the [durable receipt design](owner-receipt-design.md); only change-local design work is authorized at this checkpoint.

## Reserved source boundary

Exactly four new paths belong to this slice:

- `.agents/skills/memory/scripts/lib/owner-review.mjs`
- `.agents/skills/memory/scripts/lib/owner-confirmation-input.mjs`
- `scripts/tests/memory-owner-review.test.mjs`
- This change-local preparation document.

Schema 10, migration discovery/manifest, initializer/status, the gated REST probe and its snapshot, existing acceptance documents, routing, consumers, CLI, shared installer/setup/wiki and `areas.json` remain unchanged. The checkpoint owner retains all git, PR and provider operations. Tests use the existing synthetic SQLite/provider fixtures; no helper is invoked against a live provider. No local suites, builds or lint substitute for the exact remote source gate.

## What the helpers do

`readMemoryOwnerReview(operator, { installation, candidateId })` is a trusted-process, read-only preparation helper. It validates the complete installation pin and candidate ID before making requests. It reuses the initializer's resource and Access readbacks: database and optional bucket, both production Worker identities, active 100% deployment bindings, shared memory resources, pinned origins and actual Access configuration. Missing/open login, service-only human policy, wrong resources and unsupported protection fail closed. It requires the completed bootstrap receipt and exact persisted installation/repository IDs.

The final candidate query rechecks pending installation and intent, active configured provider, matching verified/prospective email, owner purpose, pending state and 10-minute lifetime. It rejects future-dated, expired, revoked, consumed and recovery/link candidates. Captured authorization and pin revisions must still match after the provider reads. An existing active owner blocks this first-owner path; it is not recovery.

The result is a private display snapshot containing `candidateId`, the exact `installation`, `verifiedEmail`, `providerConfigurationId`, `issuer` and Unix-seconds `expiresAt`. It contains no subject, code hash, plaintext comparison code, confirmation receipt, principal, grant or memory-ready result. It must be rendered as text only in a trusted operator interface and kept out of logs, URLs and install metadata. The helper makes only provider GETs and read-only SQL through POST `/query`; it neither sends mutation batches nor records an audit or consumes the candidate. Repeating the read grants nothing.

This is not the planned `inspectMemoryOwnerCandidate` export: that operation must additionally persist a durable review receipt. A snapshot may become stale immediately after reading and cannot authorize a future mutation. Provider readback validates configuration, not a new human login or actual edge reachability. Current policy admission/session behavior and all candidate/target authority must be checked again by the eventual confirmation flow. Do not wire this preparation helper into setup or present it as ownership acceptance.

`validateMemoryOwnerConfirmation(input)` is pure validation with no provider or database argument. It accepts exactly the [planned confirmation fields](operator-contract.md): full installation pin, candidate ID, confirmation ID, comparison code, and the three explicit `true` flags `targetReviewed`, `verifiedIdentityReviewed`, `codeMatched`. IDs must be opaque bounded strings; unknown fields, cloud roles, credentials, partial review flags and coercible truthy values are rejected. Flags are caller assertions about an explicit operator action, never authentication.

The comparison code accepts exactly eight uppercase characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, either contiguous or with one middle hyphen. It rejects lowercase, whitespace, lookalike characters and extra punctuation. It returns the eight uppercase characters for later hashing. It does not compare a stored hash or look up, consume or authenticate the confirmation ID. Even a syntactically valid nonexistent receipt passes this parser and confers no authority. Returned values are copied/frozen to prevent later mutation of the caller's input changing the prepared values. The ephemeral result includes the code and must not be logged or persisted.

Errors use the existing safe `MemoryOperatorError`. Structural errors are `invalid-input`; non-true review flags are `confirmation-required`; malformed code format is `code-mismatch`. Inspection errors distinguish `candidate-unavailable`, `installation-conflict`, `schema-unsupported`, `protection-unavailable`, `target-mismatch`, `operator-denied` and `provider-unavailable`, without exposing provider bodies or private input. None produces a synthetic ready or grant result.

## Durable confirmation remains a separate dependency

The accepted operator contract requires inspect and confirm to work across trusted-process/CLI invocations, with one-use review receipts and exact lost-response recovery. A process-local map would not meet that contract. Schema 10 has no appropriate receipt table; the identity-review ledger requires existing principals and must not be repurposed for first-owner authorization. This slice therefore adds neither a migration nor a pretend receipt. Altering the initializer's trusted SQL bundle would also change the pending schema-10 probe target and requires a separately coordinated source/probe revision.

The later reviewed receipt design must bind at least the exact installation/resource-origin pin, candidate ID and identity/code snapshot, provider configuration, owner intent, authorization/pin revisions and a deadline no later than candidate expiry. It needs a durable random confirmation ID, terminal consumed state, immutable outcome/principal and audit references. Private identity/code hashes stay server-side. Receipt issuance must not create a principal or change owner intent. Its schema, manifest, upgrade compatibility and exact source tests must be coordinated before editing those shared dependencies.

The future confirm operation must revalidate operator authority, current deployment/protection and the exact receipt/candidate/intent/code, then consume them and create the principal, binding, owner membership and structured audit as one guarded transaction. Competing confirmations need one winner; partial writes must fail closed. A lost-response retry may confirm the exact committed outcome without creating a second owner, reopening an expired candidate or resurrecting removed membership. Wrong receipt, target, code, expired review, changed claims/pins, service identity and login-off must fail. Actual transport guarantees and live rollback/concurrency observations remain separate from SQLite evidence; the pending initializer probe cannot be treated as already passed or as automatic owner-confirm acceptance.

The planned public library names `inspectMemoryOwnerCandidate` and `confirmMemoryOwner`, operator CLI and explicit human/operator workflow remain absent. First-owner confirmation still requires a platform operator in hosted mode until a separately reviewed customer interface exists. No public confirmation endpoint or cloud-role seed is introduced. Task 1.4 also retains its recovery, legacy automatic-admin retirement and real human/operator acceptance work.

## Tests and handoff

The source tests cover read-only private display on standalone/separate Workers; exact target and candidate substitution; invalid input before any provider request; expiry, future dates, purpose, changed intent/claims and owner state; missing bootstrap evidence; stale authorization/pin revisions; production bindings and active deployment protection; service/login-off denial; provider permission/errors; explicit confirmation flags; code normalization and rejected formats; immutable input copies; and absence of writes, receipts, grants or provider calls from the pure parser.

Acceptance requires the serialized remote build, app tests and full payload/scripts gate at the exact handed revision. No tests are skipped or coverage floors changed. A successful source gate releases only this preparation slice. Durable receipt/confirmation implementation, task 1.3b's coordinated live phases, CLI/routes/consumer integration and real login → owner confirmation → device approval → permitted memory → revoke → denial acceptance remain separate.
