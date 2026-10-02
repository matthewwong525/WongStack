# Generic memory operator adapter

Agreed integration contract, 2026-10-02. `initializeMemoryInstallation` and `readMemorySetupStatus` are now implemented for source review, **source-validated at b2ba7f45, inactive pending task 1.3b**. Candidate inspection/confirmation remain planned, not exported. Consumer integration remains inactive until the exact source gate and manifest-owned disposable probe pass. The sole earlier canonical initializer invocation is inside the separately coordinated Phase B probe, after Phase A transport evidence and the probe source gate; a source-only pass does not release integration. No public owner-confirm endpoint is introduced.

The initializer/status module is `.agents/skills/memory/scripts/lib/installation-operator.mjs`. It ships with ordinary WongStack. A standalone CLI or a trusted hosted backend imports it; neither the browser bundle nor a candidate build imports it. The backend retains its private Cloudflare credential. The library receives an authenticated API callback, never a credential field in the setup result.

```ts
type ResourceTarget = {
  accountId: string;
  databaseId: string;
  bucketName: string | null;
  appWorkerName: string;
  memoryWorkerName: string; // May equal appWorkerName on a standalone install.
  appUrl: string;          // Exact HTTPS origin; no path/query/fragment/userinfo.
  memoryOrigin: string;    // Exact HTTPS origin, independently pinned.
};

type InstallationPin = ResourceTarget & {
  installationId: string;
  repositoryId: string;
};

type AccessConfiguration = {
  providerConfigurationId: string;
  issuer: string;          // Exact https://<team>.cloudflareaccess.com issuer.
  audience: string;        // Human application's accepted audience.
  appApplicationId: string;
  memoryApplicationId: string; // May equal appApplicationId.
};

type OperatorContext = {
  cloudflare: (
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
  ) => Promise<unknown>; // Unwrapped Cloudflare result; reject unsuccessful envelopes.
  readMigration: (filename: string) => Promise<string>; // Trusted release bundle only; required by initialization.
};

type MemorySetupResult = {
  memory: {
    protocolVersion: 1;
    installationId: string;
    repositoryId: string;
    appUrl: string;
    memoryOrigin: string;
    status: "pending-owner" | "pending-device" | "ready";
    reason: null | "owner-unconfirmed" | "no-current-device" |
      "login-required" | "access-unverified" | "maintenance" |
      "device-expired" | "device-revoked" | "membership-removed";
    action: null | {
      kind: "confirm-owner" | "connect-device";
      url: string; // Exactly appUrl + "/apps/devices/".
      operatorConfirmationRequired: boolean;
    };
  };
};

initializeMemoryInstallation(operator: OperatorContext, input: {
  target: ResourceTarget;
  operationId: string;     // Random idempotency ID persisted before the call.
  expectedInstallation: null | {
    installationId: string;
    repositoryId: string;
  };
  access: AccessConfiguration | null;
  ownerIntent: { email: string }; // Prospective restriction, never identity proof.
}): Promise<MemorySetupResult & {
  installation: InstallationPin;
  schemaVersion: number;
  appliedMigrations: number[];
}>;

readMemorySetupStatus(operator: OperatorContext, input: {
  installation: InstallationPin;
}): Promise<MemorySetupResult>;

// Planned, not exported in the initialization/status checkpoint:
inspectMemoryOwnerCandidate(operator: OperatorContext, input: {
  installation: InstallationPin;
  candidateId: string;
}): Promise<{
  candidateId: string;
  installation: InstallationPin;
  verifiedEmail: string;
  providerConfigurationId: string;
  issuer: string;
  expiresAt: number;       // Unix seconds.
  confirmationId: string;  // Short-lived, single-use review receipt; not authority.
}>;

confirmMemoryOwner(operator: OperatorContext, input: {
  installation: InstallationPin;
  candidateId: string;
  confirmationId: string;
  comparisonCode: string;
  confirmation: {
    targetReviewed: true;
    verifiedIdentityReviewed: true;
    codeMatched: true;
  };
}): Promise<MemorySetupResult>;
```

## Authority and validation

`OperatorContext` is an in-process capability, not a serializable HTTP request or evidence of a human login. Its Cloudflare callback uses the existing authenticated provider transport and rejects unsuccessful provider envelopes. Runtime validation narrows every returned value. The library constructs exact account/resource API paths itself, verifies DB/bucket/Worker ownership and bindings, and checks Access protection/readback. Untrusted candidate code and ordinary service/device credentials cannot obtain this context. A deployment operator already has infrastructure authority; the adapter limits routine bootstrap and records an audit trail rather than pretending it can constrain a malicious infrastructure owner.

The backend must authenticate and authorize its operator-facing invocation independently and require explicit target/identity/code confirmation. The three true flags express that action; passing flags alone is not authentication. Never expose a route that accepts them from an anonymous caller, a device credential or a cloud-role object and automatically calls the adapter. The hosted operator interface is outside this change; until that exists, keep the result pending. A Cloudflare Access service-token assertion cannot create the human candidate or satisfy its verified identity.

## Initialization and retries

Initialization verifies the selected production app and memory Workers against `target`. Both bind the same exact installation memory DB and optional bucket; different Worker names must not cause a second identity store or fresh IDs. Ordinary staging/previews have no memory bindings. Deployment/install configuration pins distinct app and memory origins, and the Worker rejects machine operations on alternate/version origins. Protected human APIs exist only on the canonical app origin; a dedicated memory Worker exposes only the narrow reviewed machine routes. Access may admit these exact machine routes to the Worker, where their own protocol checks still apply.

Load every trusted forward SQL file and verify its SHA-256 against `installation-migrations.mjs` before writing any schema. The generic library imports no Node modules: a CLI supplies a filesystem reader outside this module, while a hosted backend bundles the same released SQL as text. Never accept SQL or a manifest supplied by candidate code. This checkpoint supports a fresh empty database and identical schema-10 managed retries; legacy/adoption and future managed upgrades require their separately reviewed migration implementation. Submit migrations, markers, IDs and metadata in one REST batch and write the immutable completion receipt last. The receipt must match the initial configuration hash and bootstrap audit; a partial schema or metadata write without it is an installation conflict, even if installation IDs already exist. For a new empty installation, generate installation/repository IDs internally and submit them with the operation ID and exact resource/origin/provider configuration in that same gated batch. An identical operation retry returns the same IDs; a changed operation payload conflicts. An existing installation requires either the original operation ID and identical configuration or both expected IDs matching persisted state. Do not adopt an unrelated nonempty/legacy store, repin an origin, change owner intent or replace a provider silently; those require the explicit migration/recovery workflow. Never use a cloud project/user ID as a principal or installation ID.

The initializer records a normalized prospective owner email and, when Access is configured, an owner intent only: no principal, membership, device, credential or GitHub administrator. `access: null` stores the prospective email but creates no provider-dependent intent; enabling Access later requires the explicit operator configuration/migration workflow, not an implicit rerun. The email restricts the prospective candidate and is neither proof nor historic ownership. With `access: null`, retain closed pending setup with `login-required`. An unverifiable configured policy yields `access-unverified` without activating memory. Initial production infrastructure can exist before protection is ready; the adapter must not claim protected readiness or expose business content. Initializer outputs are nonsecret. Store the `installation` pin in trusted operator/local metadata, not in arbitrary candidate-controlled config as new authority.

## Status and owner confirmation

`readMemorySetupStatus` accepts **no device proof** and can return only `pending-owner` or `pending-device`, including safe blocked reasons. A pre-existing owner or other connected machine cannot make it return `ready`. There is no `ready: true` input. The approved local machine separately introspects its private credential through the pinned core memory route; only that validated result can establish readiness for that machine.

Candidate creation is the existing planned protected app action after verified human Access login and CSRF validation. `inspectMemoryOwnerCandidate` reads that DB candidate, checks its installation, purpose, provider and 10-minute expiry, and produces a short-lived receipt bound to its exact revision, verified identity and the complete installation pin. This operator-only result includes personal display information for review; it is **not** the public setup result and must not enter logs or install metadata. Do not return the stored subject, code hash or comparison code. The matching code comes from the human's app screen.

Confirmation revalidates resource ownership, current Access configuration, candidate, unconsumed review receipt, intent and code hash. It atomically consumes the candidate/intent/receipt, creates one internal principal with owner membership, and records the operator audit without secrets or comparison codes. A competing confirmation has one winner. An identical retry after a lost response may return the same `pending-device` result only after verifying the consumed receipt's exact target/candidate outcome; it creates nothing new. A substituted target/candidate, expired receipt, wrong code or replay for a different outcome fails. Changed provider claims, login off, removed/replaced intent and stale protection fail closed. No browser cookie or JWT is accepted as an operator argument.

Successful confirmation still returns `pending-device`; the owner's computer must perform ordinary device enrollment and approval. Lost-owner recovery uses a separate explicit recovery command with evidence and revocations; this initializer/first-owner confirm API never doubles as recovery or role reassignment.

## Failure surface and integration sequence

Initialization/status failures use a safe typed `MemoryOperatorError` with `code` from `invalid-input`, `target-mismatch`, `installation-conflict`, `schema-unsupported`, `migration-bundle-invalid`, `operator-denied`, or `provider-unavailable`, and `retryable: boolean`. Future candidate methods additionally reserve `candidate-unavailable`, `code-mismatch`, `confirmation-required`, `confirmation-expired`, `owner-already-confirmed` and `protection-unavailable`. Do not include raw provider bodies, SQL parameters, cookies or secrets in messages. Database/provider failures throw; they never become a synthetic ready result. Safe pending setup conditions use the `memory.reason` codes above.

Consumers can review the implemented initializer/status signatures now, but must not invoke them live before both gates or substitute a hosted schema implementation. The two candidate methods remain nonexistent exports. First integrate initialization/status after their remote tests; then connect operator review/confirmation after protected candidate creation and its negative cases pass. Verify actual login, owner confirmation, device approval, read/write and revoke on an isolated installation before claiming hosted or standalone acceptance. Migration 0010 adds app/memory-origin pins, immutable initial operation/hash and a final completion receipt without editing 0007–0009. Candidate-review receipts remain future work.

## First private app publication and the platform operator

Hosted initialization may run while the production app is still the protected 503 placeholder. Its `pending-owner` URL is the eventual destination, not evidence that Devices is reachable. The hosted client must complete the first private app publication under its separately authorized initial-install flow before asking the customer to open Devices. A staging preview cannot perform this bootstrap: it has no memory bindings. Existing installations and later app changes retain their ordinary publication approval. Publication makes the human UI available; it grants no owner or device rights.

The initial concrete hosted operator mechanism is the ordinary `memory.mjs owner inspect` / `memory.mjs owner confirm` trusted-process CLI, run by a platform operator in the platform's private operator environment. It uses the same planned library above, the exact installation/resource pin and the platform's private credential. The customer first signs into the published app and creates a candidate; the platform operator inspects its verified identity and confirms the exact target and matching code through the existing trusted support/operator interaction. Confirmation input must not enter shell history, process arguments, logs or durable install metadata. The planned CLI reads the code and explicit confirmation interactively or via private stdin. No customer receives the platform credential, and a cloud account role alone never selects a memory principal.

Until an independently reviewed customer-facing operator interface is implemented, hosted setup truthfully has a manual platform-operator step. The client reports waiting for operator confirmation, not fully self-service completion. After confirmation it still reports pending device approval. The operator CLI and candidate methods are not callable at this checkpoint. Initialization/status code passed its source gate at b2ba7f45 and awaits the separately coordinated disposable probe, followed by a separate explicit integration handoff; candidate inspection/confirmation follows protected candidate creation. Do not wire placeholder exports or advertise acceptance before those handoffs.

## Exact resource and Access readback

Before initialization or status, inspect the selected account's database, optional bucket and both Worker identities. Each Worker must have a single active 100% deployment; read its version bindings as well as script settings. Critical memory/auth bindings must agree between them: the same exact `MEMORY_DB` and optional `MEMORY_BUCKET`, `WONG_ENVIRONMENT=production`, no `SKIP_AUTH`, and the actual Access team/audience/application/Worker IDs. Origins must be exact Worker default hostnames or observed custom domains; version hostnames cannot be inferred as canonical origins. No deployment, binding, Access or business-code mutations are performed. The caller still owns verification that other staging/previews have no memory bindings.

Read the Access organization, applications and policies, including overlapping applications. This implementation recognizes the ordinary explicit-email human allow policy and optional separate verification-service policy. Unknown policy shapes fail closed. A verification service selector can never stand in for the human allow policy. Missing login yields `login-required`; unverified provider/configuration/policy yields `access-unverified`. In either case, and during maintenance, `action` is null. Provider API/permission failures throw instead of becoming ready or an invented approval action.

Fully closed Access destinations are valid for pending placeholders. If a machine exception exists, require exactly the paired `/_memory/*` public override on the native memory Worker destination and its canonical memory-hostname public destination in the same Access application; public destinations take precedence. On separate Workers, app/staging destinations remain closed. Reject blanket, extra-path, preview, one-sided and malformed overrides. This validates configuration only: the installer keeps it closed until the canonical allowlist handler is deployed and live route probes pass. No result here proves a human login, reachable Devices page or machine-route acceptance.

## REST transport evidence gate

The [REST query API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/) documents batch and multistatement request shapes. The explicit rollback guarantee in the [D1 binding documentation](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch) describes the Worker binding, not an explicit REST guarantee. Do not equate them. The SQLite fixture exercises the intended transaction semantics and deliberately nontransactional partial writes; it is not provider evidence.

Before enabling consumer integration, pass tasks 1.3a and 1.3b on an explicitly owned disposable database through the actual authenticated REST transport. To establish task 1.3b, the canonical initializer may run only inside the separately coordinated Phase B probe, after the probe source gate and Phase A transport PASS. Probe successful DDL/metadata, deliberate late failure and rollback, simultaneous identical/conflicting initializers, and response-loss retries. Retain nonsecret resource-ownership and exact revision evidence. Even a pass establishes observed current behavior, not an official future API guarantee. Any partial effects, ambiguity or absent completion receipt fail closed; retain the target for explicit inspection and never silently adopt or clear it. Do not deploy a new public operator endpoint to bypass this requirement.

`appliedMigrations` reports versions whose batch success was observed by this invocation. It is empty on an unchanged retry or recovery after a lost success response; `schemaVersion` and the persisted completion receipt remain authoritative. A source gate alone does not release live integration or owner/Devices acceptance.

The exact source-only probe interface, ownership manifest, private transport/evidence requirements and separately coordinated phases are in [rest-probe.md](rest-probe.md). The CLI only prints a plan; importing the module does not execute a provider call. A successful source gate or transport phase never automatically calls the initializer.
