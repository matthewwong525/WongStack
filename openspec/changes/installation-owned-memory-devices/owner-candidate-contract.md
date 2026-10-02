# First-owner candidate source contract

This is an unwired part of task 1.4. It adds protected-request authorization, short-lived CSRF issuance and first-owner candidate creation using the existing schema 10. It does not add a route, Devices screen, operator confirmation, CLI command, principal, membership, device grant or consumer import. Its source gate is pending. Task 1.4 remains unchecked until its own source gate and later human/operator/live acceptance pass. The initializer's separate REST transport and canonical live phases remain pending; these fixtures do not supply that evidence.

## Call boundary

The two core modules are `.agents/skills/memory/worker/owner-request.mjs` and `.agents/skills/memory/worker/owner-candidates.mjs`. They take the production Worker **D1 binding**, never a REST callback. Their guarded batches rely on the binding's transaction behavior; the SQLite fixture exercises the same statement sequence without establishing a live provider guarantee.

A future privileged app handler must call `getAccessHumanIdentity(request, env)` freshly for that exact request, then pass its result to `resolveInitialOwnerRequest(db, request, env, human)`. A four-field object is not proof on its own: these modules do not verify JWT signatures. Never populate `human` from JSON, email headers, decoded assertions, a cloud role or a prior request's cached identity. The already-gated app adapter owns signature, issuer, audience, expiry and human-versus-service verification. The returned core context is a request-local, one-use capability bound to this D1 object; it is not serializable authority.

Only a production environment with the matching `MEMORY_DB`, configured Access issuer/audience/application and Worker ID is admitted. Any `SKIP_AUTH` or `WORKSPACE_LOGIN` override fails closed. Request URLs must use the persisted canonical app origin; Host/forwarding headers cannot substitute. Separate memory, preview and staging origins cannot create human candidates. Runtime deployment/resource readbacks still own the actual Worker-ID and D1/bucket pin checks; this module does not call the provider or claim to verify deployment resources. Ordinary mini apps must not receive these bindings or callable capabilities.

The live database must retain the completed initializer receipt and audit, active configured provider, pending owner intent and pending installation, with no active owner membership. Both the normalized verified email and configured prospective email must match the intent. This restricts who may propose a candidate; it neither proves historic memory ownership nor establishes a principal. The signed provider subject is retained for later operator review. Two subjects with the same verified email remain distinct candidates and gain no shared authority.

## Functions and request shape

```ts
resolveInitialOwnerRequest(db, request, env, human): Promise<OwnerRequestContext>
issueInitialOwnerCsrf(db, context): Promise<{ csrfToken: string; expiresAt: number }>
createInitialOwnerCandidate(db, context): Promise<{
  candidateId: string;
  comparisonCode: string;
  expiresAt: number;
}>
```

`OwnerRequestContext` exposes installation/repository IDs and the normalized verified email for this caller only. It is minted by the resolver and cannot be copied into a new capability. `expiresAt` is Unix seconds. These are internal function results, not a newly available public protocol. Future HTTP responses must be private, `Cache-Control: no-store`, and never put proof material or comparison codes in URLs, logs or install metadata.

- `GET /api/memory-auth/session` may issue a 10-minute CSRF token for this verified prospective owner. It creates only an ephemeral hashed proof, not a candidate or grant. A supplied Origin must match; cross-site and same-site-but-not-same-origin fetches are denied. No query or fragment is accepted.
- `POST /api/memory-auth/setup/candidates` requires that exact Origin, an acceptable same-origin fetch context, `Content-Type: application/json`, an empty JSON object of at most 256 UTF-8 bytes, and `X-Memory-CSRF`. There is no email, subject, role, installation or return-URL input. GET never creates a candidate. The future router must dispatch only these exact method/path combinations and must not expose a public operator confirmation endpoint.

The random 256-bit CSRF token is hashed server-side and bound to the installation, provider, signed subject and SHA-256 of the current verified Access assertion. Assertion-header precedence matches the app adapter; the Access cookie is used only when that header is absent. A renewed assertion requires a fresh session/CSRF request. Authorization bearer headers and Access service-token headers are rejected here in addition to the human adapter's service-identity rejection. Browser token material is never returned to a machine.

Creation atomically rechecks current owner authority and captured authorization/pin revisions, consumes the unexpired CSRF proof, revokes this same subject's previous pending first-owner candidate, inserts a new 10-minute candidate, and records a structured human audit referencing its candidate ID. The audit has no principal yet. Other subjects and terminal candidate history remain unchanged. Concurrent use of one CSRF token has one winner. Mutation failure rolls back replacement, insertion, proof consumption and audit together.

The code is eight uniformly generated characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, displayed as `ABCD-EFGH`. Only SHA-256 of the eight uppercase characters **without the hyphen** is stored. A later operator parser must normalize exactly this format and compare the hash for the exact target/candidate. The code is a comparison aid, not authorization or a machine credential. Its plaintext is returned once to the requesting app. A lost response is handled by explicitly requesting a replacement with fresh CSRF material, never by recovering plaintext or replaying the consumed proof.

There are at most 16 unexpired CSRF proofs and three newly created owner candidates per rolling ten minutes per installation/provider/subject, across assertions. Revoked and consumed candidates count toward that window. Each session request removes at most 64 expired proofs for the same subject. This bounds repeated candidate requests by one verified human; anonymous requests never reach this flow. Broader route abuse protection and retained-history cleanup remain handler/retention work, not a new public email lookup or an implicit schema change.

## Failure and remaining acceptance

`MemoryIdentityError` exposes only a safe code. `human-required`, `owner-request-denied` and `owner-setup-unavailable` disclose no other person's candidate or account directory. `owner-csrf-required` asks for fresh session material; `owner-csrf-unavailable` also covers the issuance cap or a changed setup state. `identity-change-conflict` means authority/proof/window changed; refresh setup and require a new explicit action. `identity-change-failed` may include a lost response, so do not blindly replay. `owner-candidate-unavailable` covers a candidate ending before readback. Database/provider error details are not returned.

The source fixture and tests are `scripts/tests/fixtures/memory/owner-candidate.mjs` and `scripts/tests/memory-owner-candidates.test.mjs`. They cover pending-only success on standalone/separate origins; hash-only storage; expiry; wrong person, installation, provider, assertion and origin; login-off/service rejection; typed-email denial; forged/reused contexts; CSRF replay and one-winner concurrency; stale owner/provider/pin state; incomplete bootstrap; replacement bounds; rollback and ambiguous responses. Fixture identity objects are synthetic already-verified adapter results, not substitutes for real JWT tests.

Operator inspect/confirmation/recovery, explicit target/identity/code confirmation, resource ownership checks, reviewed operator receipts, owner creation, automatic GitHub-admin retirement, CLI, routing, Devices UI and real browser acceptance remain unfinished. Hosted first-owner setup still needs a platform operator until a separately reviewed interface exists. No customer self-service or memory-ready result follows from these functions or their eventual source gate. No new live mailbox, owner intent or credential is created by this source slice.
