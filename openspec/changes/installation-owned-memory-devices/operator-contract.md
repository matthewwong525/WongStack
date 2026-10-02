# Generic memory operator adapter

Agreed integration contract, 2026-10-02. These exports are **planned, not callable yet**. Implementation belongs to tasks 1.4 and 6.1; the existing additive schema checkpoint does not implement them. Hosted integration must remain pending until their implementation and remote checks pass. No public owner-confirm endpoint is introduced.

The planned module is `.agents/skills/memory/scripts/lib/installation-operator.mjs`. It ships with ordinary WongStack. A standalone CLI or a trusted hosted backend imports it; neither the browser bundle nor a candidate build imports it. The backend retains its private Cloudflare credential. The library receives an authenticated API callback, never a credential field in the setup result.

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
  ) => Promise<unknown>;
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

Apply bundled forward migrations with transaction/marker safety. For a new empty installation, generate installation/repository IDs internally and persist them atomically with the operation ID and exact resource/origin/provider configuration. An identical operation retry returns the same IDs; a changed operation payload conflicts. An existing installation requires either the original operation ID and identical configuration or both expected IDs matching persisted state. Do not adopt an unrelated nonempty/legacy store, repin an origin, change owner intent or replace a provider silently; those require the explicit migration/recovery workflow. Never use a cloud project/user ID as a principal or installation ID.

The initializer creates an owner intent only, not a principal, membership, device or credential. The email restricts the prospective candidate and is neither proof nor historic ownership. With `access: null`, retain closed pending setup with `login-required`. An unverifiable configured policy yields `access-unverified` without activating memory. Initial production infrastructure can exist before protection is ready; the adapter must not claim protected readiness or expose business content. Initializer outputs are nonsecret. Store the `installation` pin in trusted operator/local metadata, not in arbitrary candidate-controlled config as new authority.

## Status and owner confirmation

`readMemorySetupStatus` accepts **no device proof** and can return only `pending-owner` or `pending-device`, including safe blocked reasons. A pre-existing owner or other connected machine cannot make it return `ready`. There is no `ready: true` input. The approved local machine separately introspects its private credential through the pinned core memory route; only that validated result can establish readiness for that machine.

Candidate creation is the existing planned protected app action after verified human Access login and CSRF validation. `inspectMemoryOwnerCandidate` reads that DB candidate, checks its installation, purpose, provider and 10-minute expiry, and produces a short-lived receipt bound to its exact revision, verified identity and the complete installation pin. This operator-only result includes personal display information for review; it is **not** the public setup result and must not enter logs or install metadata. Do not return the stored subject, code hash or comparison code. The matching code comes from the human's app screen.

Confirmation revalidates resource ownership, current Access configuration, candidate, unconsumed review receipt, intent and code hash. It atomically consumes the candidate/intent/receipt, creates one internal principal with owner membership, and records the operator audit without secrets or comparison codes. A competing confirmation has one winner. An identical retry after a lost response may return the same `pending-device` result only after verifying the consumed receipt's exact target/candidate outcome; it creates nothing new. A substituted target/candidate, expired receipt, wrong code or replay for a different outcome fails. Changed provider claims, login off, removed/replaced intent and stale protection fail closed. No browser cookie or JWT is accepted as an operator argument.

Successful confirmation still returns `pending-device`; the owner's computer must perform ordinary device enrollment and approval. Lost-owner recovery uses a separate explicit recovery command with evidence and revocations; this initializer/first-owner confirm API never doubles as recovery or role reassignment.

## Failure surface and integration sequence

Expected contract failures use a safe typed `MemoryOperatorError` with `code` from `invalid-input`, `target-mismatch`, `installation-conflict`, `schema-unsupported`, `operator-denied`, `candidate-unavailable`, `code-mismatch`, `confirmation-required`, `confirmation-expired`, `owner-already-confirmed`, `protection-unavailable`, or `provider-unavailable`, and `retryable: boolean`. Do not include raw provider bodies, SQL parameters, cookies or secrets in messages. Database/provider failures throw; they never become a synthetic ready result. Safe pending setup conditions use the `memory.reason` codes above.

Consumers can type their inputs against this contract now, but must not import nonexistent exports or substitute a hosted implementation. First integrate initialization/status after their remote tests; then connect operator review/confirmation after protected candidate creation and its negative cases pass. Verify actual login, owner confirmation, device approval, read/write and revoke on an isolated installation before claiming hosted or standalone acceptance. Schema 0007/0008 alone lacks separate app-origin pins, initialization idempotency and review receipts: add a forward migration when implementing this adapter, preserving the already-tested migrations.

## First private app publication and the platform operator

Hosted initialization may run while the production app is still the protected 503 placeholder. Its `pending-owner` URL is the eventual destination, not evidence that Devices is reachable. The hosted client must complete the first private app publication under its separately authorized initial-install flow before asking the customer to open Devices. A staging preview cannot perform this bootstrap: it has no memory bindings. Existing installations and later app changes retain their ordinary publication approval. Publication makes the human UI available; it grants no owner or device rights.

The initial concrete hosted operator mechanism is the ordinary `memory.mjs owner inspect` / `memory.mjs owner confirm` trusted-process CLI, run by a platform operator in the platform's private operator environment. It uses the same planned library above, the exact installation/resource pin and the platform's private credential. The customer first signs into the published app and creates a candidate; the platform operator inspects its verified identity and confirms the exact target and matching code through the existing trusted support/operator interaction. Confirmation input must not enter shell history, process arguments, logs or durable install metadata. The planned CLI reads the code and explicit confirmation interactively or via private stdin. No customer receives the platform credential, and a cloud account role alone never selects a memory principal.

Until an independently reviewed customer-facing operator interface is implemented, hosted setup truthfully has a manual platform-operator step. The client reports waiting for operator confirmation, not fully self-service completion. After confirmation it still reports pending device approval. The operator CLI/library themselves are not callable at this checkpoint; prioritize independently tested initialization/status exports in the next operator/provisioning slice after the membership gate, then candidate inspection/confirmation. Do not wire placeholder exports or advertise acceptance before those handoffs.
