# Design

## Context

See [proposal.md](proposal.md) for intent and reviewed assumptions. This is regular WongStack. The full feature is now isolated on `installation-owned-memory-devices`, based directly on main at `3d9f248` (29.10.0), by explicit user instruction. Earlier implementation was coordinated on PR #238; its exact source receipts remain historical evidence. No hosted identity design is reused.

Observed owners and implementation seams:

| Surface | Current behavior and planned seam |
| --- | --- |
| `wiki/stack/cloudflare-access.md`, `app/worker/access.ts` | Signed Access JWT validation; human `id` currently equals email; service identities carry `common_name`. Retain app compatibility, add a stricter memory-human adapter. |
| `app/worker/index.ts` | All `/_memory/` dispatch precedes Access verification. Add exact public enrollment routes there and a separate protected core router after signed-human verification. |
| `.agents/skills/memory/worker/{memory-worker,statements}.mjs` | Keys/GitHub grants, email ownership, SQL filtering, email transcript prefixes. Replace authorization and ownership, retain memory semantics. |
| `.agents/skills/memory/scripts/` | `join` reads `gh auth token`; session-start autojoins/renews; `store.mjs` decodes key email and otherwise falls back to Cloudflare. Replace these paths together. |
| `.agents/skills/memory/migrations/0001…0006` | Immutable fact bodies/authors, mutable session metadata, `memory_keys`, `memory_admins`; migrations use the operator's Cloudflare token. Add forward migrations and a reviewed ownership ledger. |
| `app/worker/apps/index.ts`, `wiki/stack/mini-apps.md` | Mini-app handlers have neither memory binding; importable env is disabled. Keep this boundary. Devices has only frontend mini-app files, calling core endpoints. |
| `.agents/skills/wong-setup/scripts/{provision,private-access}.mjs`, `server/install-wongstack.mjs` | Shared provisioning currently creates the GitHub-linked admin key before login; open-without-login is supported. Replace with pending setup and explicit human completion. |
| `.agents/skills/wong-sync/references/payload-{manifest.md,files.json}` | Scaffold directory ships with source-only apps excluded; prose says only Hello ships. Explicitly classify Devices as built-in and test the complete dependency closure. |

Parent already searched memory and other work. Facts #474 (repo segmentation) and #422/#423/#363 (existing GitHub model) inform migration, not a veto on replacing it. Unrelated work remains untouched. The Artifacts pilot is now a companion change in the same PR; preserve its historical evidence and keep any shared-memory adapter compatibility work explicitly test-only.

## Goals / Non-Goals

**Goals:** one installation authority per existing repository memory store, existing app login for humans, explicit principal membership, recoverable device approval, immediate server-side revocation, preserved facts and privacy. Local Git worktrees may still organize client state; the Git remote provider is irrelevant to authentication.

**Non-Goals:** centralized identity, hosted owner IDs, new identity provider, mailbox delivery service, Git hosting migration, access to memory from arbitrary mini-app handlers, or support for unauthenticated approval. Membership here controls memory; the existing Access allow policy still controls admission to the rest of the app. No cloud management connection becomes a memory authority.

## Decisions

### 1. Give the installation and every person internal IDs

Create a random `installation_id` and `repository_id` in the memory DB and safe install record. One installation still serves one repository store; these IDs survive URL or Git remote changes. Cloning a template creates fresh IDs; deliberately restoring the same installation preserves IDs only with its authorization state. Pin the canonical HTTPS production app origin and memory origin separately; they default to the same origin for standalone installs. A dedicated memory Worker may share the exact installation DB and configuration, but may serve machine routes only on the pinned memory origin; human routes stay on the protected app origin.

`principals` holds random, opaque IDs and status. `identity_bindings` uniquely links `(installation_id, provider_configuration_id, issuer, subject)` to a principal, with current verified-email metadata, status and audit timestamps. A provider configuration records the allowed Access issuer and app audience; a provider replacement needs a reviewed transition. Principal IDs never come from email, Git authorship, Access `sub`, or a hosted service.

Cloudflare documents `sub` as an account-scoped user identifier unique to an email, changing after removal/re-addition; it documents human email as IdP-verified, and a service token's `sub` as empty. Thus `sub` is useful as a scoped login binding, **not an immutable human identity**. See [Cloudflare application-token claims](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/), checked 2026-10-02. This design does not assume an upstream OIDC subject exists or that `identity_nonce` is a durable identifier.

The core adapter requires the existing signature, exact issuer, accepted audience and lifetime checks plus `type=app`, nonempty string `sub`, well-formed verified email for display/invitations, and no service-token marker (`common_name`, even if an email is also present). Reject malformed/mixed claims. Local synthetic identity cannot satisfy the production adapter. Keep `AccessIdentity.id` compatibility for existing mini apps; only this adapter resolves memory principals. No cookie is copied to a machine or sent to an arbitrary identity URL.

An unknown binding has no membership. A changed subject or issuer with the same email becomes a recovery candidate, never an automatic link. Even a bound subject with a changed email suspends privileged human actions and asks for owner review; it does not silently add an identity alias. Owner linking records immutable, installation-scoped review evidence with the candidate ID, actor, target and new binding (forward migration 0009), so a new subject/issuer can be reviewed without misusing the same-subject replacement chain. It verifies the target login candidate and evidence of continuity, retires the old binding, revokes existing devices and pending requests, and requires new approvals. If continuity cannot be proven, create a new principal with no inherited private memory. Mailbox reassignment with unchanged provider claims is not detectable by the app: offboarding must remove membership and tombstone the old binding before reassignment. Re-invitation creates a new principal unless an owner explicitly approves recovery.

**Alternatives:** email as primary key leaks history on address reuse; bare `sub` assumes continuity Cloudflare does not promise; a central directory creates the hosted dependency the user rejected.

### 2. Explicit membership, first owner and recovery

`memberships` links principal/repository with `owner`, `admin`, `member`, or `reader`, status, revision and timestamps. Owner includes memory-admin data rights. Owners alone invite/remove people, change roles, resolve ownership and link login identities. Admins read all memory and revoke any device, but cannot grant membership or approve someone else's request. Members/readers manage only their own devices; readers' writes remain unshared. Devices receive only memory read/write scope and, if explicitly requested and reviewed, `memory:admin` for data administration. Even an owner's machine cannot manage human membership, bootstrap or identity linking.

Owner-created invitations have a 7-day expiry, an exact normalized email and a prospective role. A verified login matching an unclaimed invitation creates a fresh principal and consumes it once; this is an explicit owner grant plus provider proof, not trust in a typed address. A tombstoned binding or existing email collision goes to recovery instead. Access admission is an independent prerequisite: invitations explain that the owner may also need to add the person to the existing Access policy using the standalone provisioner. No broad Cloudflare token is stored in the Worker to do this. Removal commits the memory membership tombstone and revocations first; separate Access-policy removal/session revocation can remain visibly pending without preserving memory access.

First-owner setup uses the already established local operator authority (`CLOUDFLARE_API_TOKEN`, only in the standalone setup or private platform-operator environment):

1. Provisioning records a pending owner intent with exact email, installation ID and configured Access identity provider. No memory key is made.
2. The owner signs into `/apps/devices/`. A protected bootstrap POST records a 10-minute candidate containing the **verified** binding and displays a comparison code. Merely being first to log in grants nothing.
3. On the setup computer, `memory.mjs owner confirm <candidate-id>` (code and explicit confirmation through interactive/private stdin) verifies installation/resource ownership through the Cloudflare API, displays the candidate's verified identity, and atomically consumes that pending intent and candidate to create the owner. Code is a comparison aid, not operator authorization. Concurrent attempts have one winner. Never create an owner from git email, installer job owner IDs, verification service tokens or an old GitHub admin row.
4. The owner's computer then follows normal device approval. An unattended installer ends with a safe pending-human-action result and public app link, not a credential for its host.

Owner confirmation is disabled while login is off or Access configuration is incomplete. The public app may remain open under existing conventions; memory enrollment and human management stay closed. Existing active machines, if any, follow the explicit migration policy below, never anonymous authority.

Keep at least one active owner; reject ordinary last-owner removal/demotion. A lost sole-owner login uses an explicit operator recovery command that verifies target DB/Worker ownership, records reason and candidate code, links a newly verified human, and revokes old owner bindings and all owner devices. It bypasses neither login nor data provenance. Keep durable audit records of operator actions. No recovery secret or live credential is created by planning; live test credentials belong only to the subsequently authorized disposable verification.

### 3. Separate public machine protocol from protected human actions

Core auth state lives with memory in `MEMORY_DB`, in modules under `.agents/skills/memory/worker/`; the app imports only the routers. The frontend `app/src/apps/devices/{App.tsx,app.json,Devices.css,…}` has no privileged server-side mini-app handler.

| Route family (exact routing, unknown methods denied) | Caller and checks |
| --- | --- |
| `GET /_memory/device-info` | Public, production canonical origin only; protocol version and installation/repository IDs, no emails/counts/provider internals. |
| `POST /_memory/device-requests` | Anonymous enrollment only; validated installation ID, bounded machine label and requested scope; no email field; abuse limits below; never memory data. |
| `POST /_memory/device-requests/:id/poll` | Initiating machine's 256-bit request secret in Authorization; status only. |
| `POST /_memory/device-requests/:id/claim` | Same secret, approved unexpired request, precommitted candidate credential; one-time activation. |
| `POST /_memory/device-credentials/rotate` | Current device credential, active membership/device, bounded approval age; no human cookie. |
| `GET /_memory/device-credentials/self` | Current device credential; its safe metadata only. |
| Existing `/_memory/accounts/:account/d1/database/:db/query` and R2 object routes | Active device credential and principal scope; validate account/database/bucket against this install instead of ignoring path IDs. |
| `POST /_memory/join` | Retired: 410 with reconnect guidance; never contacts GitHub. |
| `/api/memory-auth/*` | Core router, signed **human** adapter, current principal/membership, same-origin protections; never reaches generic mini-app dispatch. |
| Other paths under either family | Closed 404/405; no asset fallback, suffix matches or alternate encoded paths. |

Protected endpoints are `GET session` (safe current status and CSRF material), `GET requests`, `GET requests/:id`, `POST requests/:id/approve`, `POST requests/:id/deny`, `GET devices`, `POST devices/:id/revoke`, `GET members`, `POST invitations`, `POST members/:id/role`, `POST members/:id/remove`, `POST identity-candidates`, `POST identity-candidates/:id/link`, and `POST setup/candidates`, relative to `/api/memory-auth/`. Session/candidate creation admits verified unbound humans only for their own pending status; other endpoints enforce the role matrix. Candidate listing is returned only to owners (and the candidate to themselves), never to an unauthenticated client. Member removal and role downgrade invalidate pending approvals and bump authorization revision; no request approved under stale privileges survives.

All human mutations require POST JSON, exact canonical Origin (no wildcard CORS), and a 10-minute random CSRF token, stored only as a hash and bound to installation, human binding and login assertion digest, issued by `GET session`. Reject missing/foreign/null origins and cross-site fetch metadata; no GET changes state. Never use a request-provided Host/origin to form approval links. Unknown object IDs and requests already bound to other people return indistinguishable unavailable responses. Unbound requests are accessible only by an unguessable request reference to eligible signed-in members; they are not listed installation-wide. Responses use `Cache-Control: no-store`; no secrets in URL/query/fragment, redirects, analytics, traces or log bodies. Referrer policy is `no-referrer`. Sanitize user-supplied machine names and never present them as attested hardware.

Use the existing production `/_memory/*` Access exception, with an exact allowlist **inside** the Worker; no new broad exception. `/api/memory-auth/*` and `/apps/devices/` retain Access protection, including every alias. The open-app branch must still invoke the human guard for all protected core endpoints. Verification service tokens may render the shell but receive no private device data or mutation authority.

Only the pinned canonical production memory origin serves machine memory/enrollment; production version/alias URLs reject them. Business content remains protected across all addresses. Existing old production versions can still bind the DB, so migration disables legacy key writes as well as deleting legacy hashes. Staging and ordinary previews keep both memory bindings absent and return 404, including bootstrap/poll/claim. The real acceptance test uses a separate disposable installation whose Worker is its own production endpoint and whose Access audience, DB, bucket, installation IDs and credentials are disjoint. This preserves the production-only boundary instead of introducing a production-memory preview switch.

### 4. Enrollment binds installation and machine first, then the approving person

Read canonical origin/IDs from trusted **primary** checkout metadata and a private local pin. A linked worktree, changed remote URL, environment token or branch edit cannot replace that pin. On a new clone, require user-supplied app URL or explicitly trusted installation metadata; do not treat arbitrary freshly cloned files as established trust. HTTPS only outside isolated tests, no userinfo/query/fragment, no redirect-following for authenticated calls. Display the chosen origin before connecting; `device-info` validates protocol and records IDs under that origin. A later origin or ID mismatch stops, with deliberate repinning required. There is no email-to-installation directory or search.

`memory.mjs join --app-url <url>` is the explicit start command; an omitted URL uses confirmed local metadata. There is no email argument or machine-to-browser fingerprint match. It creates a private request secret, random request nonce, and candidate credential, and durably stores them locally **before** sending. Creation sends only SHA-256 commitments for the locally generated request secret and candidate credential. Server keeps those hashes, an unguessable 128-bit-or-stronger request ID, a server-generated eight-character comparison code, installation/repo IDs, initially null recipient principal, sanitized label, requested permissions, and 10-minute deadline. A client nonce/hash makes a network retry return the same request within its lifetime rather than create duplicates. The comparison code is not an authorization secret and cannot poll or claim. No client assertion can choose principal or role.

The chat link goes to the pinned app's Devices page with only the unguessable request ID. It carries no authorization secret. The signed-in person's verified email and internal principal come from the app login; the agent never guesses them from IP address, browser fingerprint, hostname or git. New members finish invitation/login before approving. GET only shows the request and the signed-in account; it never reserves the request or creates a grant. Approval atomically binds the previously unbound request to that active principal and its current membership revision. Later login/email changes cannot retarget it. Poll reveals no member directory or candidate emails. No email lookup, enumeration endpoint or outbound email notification exists.

Rate limits: durable per-install rolling counters, at most 10 starts/IP/10 minutes and 100 starts/install/10 minutes; at most 3 approved-but-unclaimed requests per principal, with the cap applied only on authenticated approval. Do not expose a per-person count to anonymous clients. Poll at 5 seconds minimum with backoff/`Retry-After`; after 3 early polls return `slow_down`, never increase storage unboundedly. Limit JSON to 4 KiB, labels to 100 characters, exact allowed scopes; reject an email field instead of using it as identity. Expire/clean request rows 24 hours after expiry/claim; prune quota buckets after 20 minutes. Security audit metadata retains actor, action, target and result for 90 days, excluding codes, secrets, raw request bodies and transcript contents; durable principal/membership/revocation/ownership tombstones are not pruned with these ephemeral records. Browser listing is passive; never prompt all members or send emails on anonymous starts.

The first valid code-confirmed approval binds the request to the approving member; there is deliberately no predetermined recipient before that action. The screen prominently states “Connect this computer as <verified email>” and requires explicit code-match acknowledgement; the server checks the submitted code and the requested permission subset against current membership. A role-specific scope is offered only when that signed-in person has it. After binding, another person cannot approve, deny as owner of the device, retarget or claim it; owner/admin revocation remains allowed. Expired/denied/wrong-install requests cannot transition. Do not claim to detect the intended person before approval: someone who shares both the request link and code with another member is choosing that member as approver. A link scanner or GET cannot bind it. Enforce transitions atomically:

```text
pending ──▶ approved ──▶ claimed
   │            │
   └──▶ denied ◀┘  (deny before claim)
   │            │
   └──▶ expired ◀┘
```

Poll never returns a credential. Claim verifies request secret and the precommitted candidate credential, then atomically creates one device and credential hash and consumes the request. This is one issuance to the initiating machine; the credential was already securely generated/stored there, so losing the claim response does not lose its secret. Retrying can confirm the **same** activated credential, never create another. A different candidate, replay for another device or reused expired secret is refused. Revoke/removal between approve and claim wins via current-state checks. After success destroy request secret and pending state. The browser never receives the credential.

### 5. Credential lifetime, storage and failure behavior

Use versioned opaque credentials such as `wongd_v1.<random-id>.<256-bit-secret>`; neither email nor role is authority in the token. Device/credential records contain hash, principal, repository, installation, permission ceiling, generation, status, issued/expiry/last-used timestamps and absolute `reauthorize_at`. Check live membership, device status, current effective role and deadline for **every** memory request and renewal using primary/strongly consistent authorization reads. No positive grant cache; DB errors deny. Revocation is a durable tombstone checked before granting data, not merely deletion of a displayed device.

Browser logout or Access session expiry does not revoke a device. Device approval is a separate durable grant: at its deadline, on revocation/removal, or when credentials have already expired, memory pauses and a fresh valid app login plus explicit new approval is required. A browser login alone never renews machine authority.

Credentials expire after 30 days; session-start attempts rotation with 7 days left. Approval expires after 90 days regardless of rotation; a downgrade may reduce scope immediately, but an upgrade cannot raise an existing device's ceiling without approval. At most 10 active devices/principal: reject an eleventh with instructions to revoke one, rather than silently disconnecting an existing computer.

Rotation uses client-generated next secret, privately persisted first, and compare-and-swap on the current generation. The new hash activates atomically and old hash stops immediately (no 7-day overlap). Concurrent rotations have one winner. On a lost response the client probes with its saved candidate credential; success adopts it, otherwise it retries only while the old credential remains valid. Never restore an old generation after a confirmed rotation. Expired/revoked/reauthorization-required credentials cannot rotate or silently rejoin; show one actionable status and wait for a new approval. Network failure backs off; a valid current credential works until its deadline; writes spool under the pinned principal/installation. No retry floods.

Store new credentials in per-OS-user state outside the checkout, e.g. `${XDG_STATE_HOME:-~/.local/state}/wongstack/memory/<installation>/<repository>/`, directory 0700, files 0600, atomic fsync/rename, file ownership and symlink checks. Use private ACL equivalents on Windows and fail when permissions cannot be made private. A lock prevents concurrent hook/CLI rotation. A stable local device ID is independent of hostname. Shared worktrees for this OS user reuse that device; different OS users must not share credentials. Never automatically copy the new credential using worktree setup scripts.

`CLOUDFLARE_MEMORY_TOKEN` remains a documented explicit compatibility override for a new credential, but is validated against the local pin and server metadata and never interpreted as a Cloudflare token. Normal CLI usage reads the private device store. Old `.env` keys are retained privately until a new approved read succeeds, then removed; do not print them. `CLOUDFLARE_API_TOKEN` is accepted only by explicitly selected operator commands for migration/bootstrap/recovery, never ordinary memory or fallback. Update redaction patterns for both new credential and request-secret formats. Requests, bearer values, cookies and CSRF tokens never enter the spool, transcript, audit, screenshots or review evidence.

### 6. Principal ownership and legacy evidence

Add nullable immutable `owner_principal_id` to facts and sessions; preserve `author` as original display attribution. New writes get the principal from the active grant on the server. Facts/session ownership and new transcript keys use principal IDs, e.g. `sessions/<principal-id>/<session-id>`. A canonical retag/restatement operation copies original ownership, attribution, timestamp and source from a server-loaded source fact, with permission checks; callers cannot supply another owner as a free override. An admin's corrective action is audited with acting principal; admin data powers do not permit arbitrary historical impersonation or changing auth tables.

Refactor `statements.mjs` and client query templates together: only recognized parameterized memory read/write statement shapes for **all** roles, with server-bound principal and visibility. No generic SQL against auth, schema, migrations or mapping tables, even for admin devices. Deny comments/quoting/CTEs/multi-statements or schema-qualified forms outside those templates. Preserve search/FTS, fact tagging, append/supersede, session upsert, tag administration and upkeep through explicit allowed operations. Cover all query sites in memory scripts. This reduces the risk of introducing privileged tables behind the current broad admin SQL path.

Always enforce principal visibility, even with one active member or no active keys. Team is a display hint derived from memberships and historical owners, never a switch that widens reads after another person leaves. Shared project/reference/thread facts remain shared; user/feedback and unshared facts remain owner/admin only. Default admin digest/search is narrowed to the admin principal; `--everyone` explicitly widens it. Wiki people pages and git config are display/context sources, never permission aliases. Reader writes remain unshared. Validate source/session ownership and R2 keys separately; a shared fact never opens someone else's raw transcript.

Legacy mapping is an append-only ledger recording installation, exact selected fact/session IDs and raw keys, target principal, actor, evidence type/reference, snapshot hash, date and superseded mapping if corrected. Do not map every past or future row by an email prefix. Evidence can include an legacy-key challenge collected before expiry/cutover and bound to its stored GitHub ID in the restricted migration evidence **plus** the newly verified app login and owner confirmation, or explicit operator-reviewed backups/provenance when that key is lost. Legacy key possession alone grants no new membership or admin role. No live GitHub request is required for mapping; stored IDs remain historical evidence only. Without sufficient evidence leave rows unmapped and admin-only, including shared legacy rows whose provenance has not been reviewed. Exact row mappings prevent one email reused across people from claiming the entire history.

Keep legacy R2 objects in place. An explicit protected object-ownership ledger permits only mapped principals/admins to read their exact old keys; new clients do not derive access from email prefixes. Unmapped and pre-key transcripts remain admin-only. Never rewrite old transcript bytes or original authored fields to make the migration fit. New writes cannot overwrite a legacy object; replacing mutable transcript content uses versioned new keys, with authorized session pointer updates. If an R2 upload races revocation, recheck the live grant before committing its DB pointer; orphaned unreferenced objects are cleaned, never exposed. A request already authorized before revocation may have transmitted bytes; every subsequent request must be denied.

### 7. Distribution and coordinated surfaces

Ship the Devices frontend as a built-in alongside Hello. Update `payload-files.json` explicitly (document the built-in set in machine-readable inventory metadata consumed/checked by inventory tests), the manifest prose, scaffold/sync compatibility checks and source-only exclusions. The normal scaffold directory already includes a new Devices folder; tests must assert inclusion rather than rely on that accident. Core memory modules/migrations ship via the memory skill; the Worker dispatch, frontend and protocol version must update as one reviewed unit. Keep `tips` and other source-only apps excluded.

An existing target with `/apps/devices/` gets a conflict named in its sync plan and reviewed adaptation/relocation of its local app before installing the reserved built-in; never overwrite it. Preserve app branding, custom routes, login policy, skill renames and install record fields. Add safe IDs/origin/schema/protocol status to the primary record, never copy source IDs. Migrate only this repository's store.

Update `provision.mjs`, setup runbook, `server/install-wongstack.mjs`, `server/README.md`, and result/probe consumers coherently. Preserve existing machine-readable final installer outcome words; add a structured `memory.status = pending-owner | pending-device | ready` and action URL without secrets, with old consumers still reading `done` as infrastructure installed, never proof that memory login passed. Keep managed Access-policy jobs as Access-only; cloud owner IDs/service credentials do not seed memory roles. No wongstack-cloud changes or calls are needed. Remove memory's `GITHUB_REPOSITORY` dependency from deploy scripts/vars while leaving unrelated hosting/deployment uses intact.

#### Setup result contract (version 1)

The planned trusted-process exports and exact typed inputs/results are in [operator-contract.md](operator-contract.md). They are not implemented by the schema checkpoint. This contract adds no public confirmation endpoint.

Both standalone setup and a hosted backend return this nonsecret `memory` object. The hosted backend provisions Access with its private operator credential; a customer needs no Cloudflare account or token. This changes who operates the infrastructure, not human authentication or ownership. Hosting is optional. Per-project Access protects isolated production/staging/memory origins and immutable preview addresses. The dashboard opens only the backend-reported private app URL; it never serves candidate code on its own origin. Access email-policy/session updates and repository grants do not create memory principals or roles. Memory removal remains a separate explicit installation-owner operation.

```json
{
  "memory": {
    "protocolVersion": 1,
    "installationId": "opaque-installation-id",
    "repositoryId": "opaque-repository-id",
    "appUrl": "https://installed-app.example",
    "memoryOrigin": "https://installed-memory.example",
    "status": "pending-owner",
    "reason": "owner-unconfirmed",
    "action": {
      "kind": "confirm-owner",
      "url": "https://installed-app.example/apps/devices/",
      "operatorConfirmationRequired": true
    }
  }
}
```

`appUrl` and `memoryOrigin` are exact validated HTTPS origins from trusted installation configuration, not caller-supplied return URLs. IDs are installation-generated; none are cloud user IDs. `status` is `pending-owner`, `pending-device`, or `ready`. `reason` is null or an enumerated safe code: `owner-unconfirmed`, `no-current-device`, `login-required`, `access-unverified`, `maintenance`, `device-expired`, `device-revoked`, or `membership-removed`. Blocked setup remains pending at the appropriate stage; it never fabricates readiness. `action` is null while the verified app URL is unavailable, login/protection is unverified, or installation maintenance blocks progression. Otherwise it is `confirm-owner` with `operatorConfirmationRequired: true` before owner confirmation, or `connect-device` with `operatorConfirmationRequired: false` afterward. Both URLs are exactly the canonical app's `/apps/devices/`, with no credential, email, matching code or ownership candidate in the URL. A separate machine-created request may produce its own opaque review reference later.

Readiness is scoped to **this machine**. Provisioning alone can report `pending-owner` or `pending-device`, never `ready` because another device is connected. `ready` requires the calling machine's credential introspection against the pinned memory origin and current installation, membership, device and credential state; no boolean from the caller or cloud role is proof. A ready result has `reason: null` and `action: null`. A setup backend that does not receive device proof always returns `pending-device` after owner confirmation; the local client may combine that with a successful direct introspection. These fields contain no API token, service grant, Access cookie, CSRF proof, request secret, device credential or personal identity. They may be stored as a last-observed result but must be rechecked before claiming current access.

Initial owner confirmation remains a two-party protocol: the verified human creates the candidate in Devices, then an installation operator verifies installation target and matching code through the ordinary operator command. In hosted mode the backend executes this narrowly scoped operator action using its private credential only after explicit confirmation, not as an automatic consequence of cloud project creation or owner status. Until that adapter exists and completes, return `pending-owner`; do not ask the customer for the platform credential. The hosted transport is a consumer of the generic protocol and is outside this change. Staging/previews still have no production memory bindings and cannot confirm owners or approve devices. Tests must cover forged origins, stale status, a different connected machine, login disabled, missing protection, service-token denial, operator-confirmation pending and independent memory membership.

Release is `Next (major)` because old joins/keys and automatic admin provisioning change. Its plain Updating note names enable login, verify initial owner, review old ownership, reconnect machines, and the possible memory pause. Leave VERSION to `/ship`. Plan changes to memory-key/memory/required-tools/secrets docs, Access/mini-app/setup/sync docs, CLI help, hooks and current specs so GitHub is no longer presented as memory authority. Keep linked headings as compatibility anchors. Add areas for the new specs; retire removed live terms with scoped checks without rewriting archives or forbidding historical GitHub evidence.

## UX

### Use-case brief

An owner/member opens a phone from the current chat to approve one computer, usually a few times a year; they manage devices or people occasionally. Done means the initiating computer can use only permitted memory, or a rejected/revoked computer cannot. Assume phone use first. Mirror Hello's narrow main-app frame, shared stylesheet, plain labeled controls and announced results. Approval is common; initial owner, invitations, recovery and migration stay secondary.

### Flow

Chat displays installation URL, requester-supplied machine label, comparison code and permission summary → existing Access login → request detail → check matching code → approve/deny → terminal state and device list. Before approval, the signed-in account is clearly shown and the person can switch accounts; approval chooses that principal. A different account cannot take over an already bound request; show unavailable with the installation and sign-in guidance. No secret approval link, clipboard cookie or second login. The empty list copies a plain connection request into the person's existing chat; it does not start enrollment behind their back.

Opening a request link shows that pending request before approval. The page may retain this nonsecret request reference in tab-local state and refetch its detail on return; it never reserves or attributes the request on GET. The server list shows only already-associated requests and connected devices with scope, last use, expiry and reapproval date. Revoke uses an inline confirmation and announces success. Owner People section creates prospective invitations, sets roles and confirms removal; removal clearly says previous notes remain credited and app-policy removal may still be pending. Login binding recovery uses the same candidate-review form with identity/evidence context; high-risk changes have a clear confirmation, not an auto-link. Initial owner displays the operator comparison code and completion instructions. Login-off displays a closed setup explanation, no approval controls.

### Hierarchy

One filled action per focused state: Review request on list, Approve on detail, Revoke/Remove on their confirmation, Create invitation on invitation form, Confirm identity link on owner review, Copy connection request when empty, Retry on error. Deny/cancel/navigation are secondary. Scope and matching code precede approval. Pending network actions disable repeat submission; no optimistic approval/revocation. Loading is announced and controls stay disabled; terminal denied/expired states direct the person back to chat. Errors preserve forms and never display private fields from other people's requests.

### Review

[review.html](review.html) shows What Changes #1 (owner/pending/recovery), #2 (approval and terminal states), #3 (list/revoke/people forms), #4 (migration flow), and #5 (empty/loading/error/wrong-account states). Identity-link, role-change and success/pending confirmations are also sketched in What Changes #3. No new navigation framework or design library.

### Components

Existing `AppPage`, app registry and shared main frame/brand and `app/public/style.css`. New local components for request detail, device row, inline confirmation and owner people/candidate form; local `Devices.css`. Keyboard labels/focus, phone width, dark/light contrast, text status with live regions; code selectable and readable without color. No external UI dependency is needed.

## Migration Plan

1. **Prepare:** operator inventories schema, keys/admin rows, legacy direct-token usage, custom Worker routes/mini apps, Access state and every reachable production version. Make encrypted/private D1 and R2 backups and an ownership review manifest; record counts/hashes without transcript content in evidence. Require new login and owner readiness before committing cutover. Open installs may postpone this major update; once updated they do not get anonymous approval.
2. **Compatibility deployment:** ship new client/core code that recognizes migration-pending and fails closed, plus a maintenance control understood by all versions to be retained. No new GitHub joins/renewals. Source code is deployed through `/save` and the remote gate, then the authorized operator runs memory migrations; app pipeline must not apply memory migrations to ordinary app/staging DBs. Plan an announced memory pause; spool stays local.
3. **Freeze legacy authority:** use one transactional forward migration to snapshot historic auth evidence into restricted audit tables, clear `memory_keys` and `memory_admins`, add permanent reject-write triggers on the legacy auth tables, and set a minimum protocol/auth generation. Deny memory if schema/state incomplete. Retained old Workers cannot mint keys into those tables; remove/disable obsolete reachable versions as an additional deployment check. Do not rely on only switching the main alias. Prevent raw direct-token ordinary clients after this update; identify and remove that legacy local configuration after new success. A broad operator token remains infrastructure authority and must never be distributed to members.
4. **Adopt and map:** owner performs the new verified-login/operator flow; explicitly creates memberships and approves reviewed exact historic mappings. Record old GitHub admin information as evidence but grant owner/admin only through the new action. Unmapped rows remain admin-only. Reruns are idempotent and report pending conflicts; no blanket author-email update or immutable-trigger removal.
5. **Reconnect and verify:** every machine approves anew, proves scoped read/write, flushes only spool records whose principal/installation binding is established, then deletes its old local key. Never relabel a different user's queued facts when a machine changes login. Readiness report distinguishes infrastructure, human login, owner, device issuance and memory probe results.
6. **Rollback:** before cutover, cancel with legacy data unchanged. After cutover, roll forward or deploy the tested maintenance-capable rollback Worker, keeping new auth tables, tombstones, disabled legacy inserts and reviewed mappings. Do not roll back to unmodified old authentication, re-enable GitHub join, resurrect revoked keys, or restore an old DB snapshot into a public Worker. Restore data to an isolated DB, reapply revocation/auth-generation state and reconcile new writes before controlled adoption. Test this rollback artifact during `/save`.

## Risks / Trade-offs

- Access is email-centered and cannot detect mailbox reassignment by itself → explicit membership offboarding, tombstones, conservative relinking and provider-claim tests; no claim of globally stable person IDs.
- A local operator/Worker deployer can ultimately read or change this installation's DB → retain that existing trust boundary and audit operator recovery; ordinary machine credentials cannot use it.
- Anonymous enrollment can be spammed → no anonymous email lookup, bounded durable quotas, unguessable request references and passive UI; no notification amplification. Shared IPs may hit quotas and must retry later.
- The migration changes many client SQL shapes and default privacy checks → inventory every query/write path, run privacy regressions including last-member removal, and keep untouched historical bytes.
- R2 and D1 have no shared transaction → stage uploads, recheck before publishing pointers, clean orphans and test revoke races. Already transmitted data cannot be recalled.
- Existing Access policies admit humans separately from memory membership → make both statuses explicit in setup/invites/removal docs, with memory denial immediate even if provider updates are pending.
- Big coordinated update or locally customized Devices route → protocol/schema preflight, manifest closure tests, reviewed adaptation and fail-closed maintenance mode; never silently fall back to old authentication.

## Verification contract

Tasks below the design own execution. Required evidence combines automated negative tests and a real human login on a disposable standalone installation. Preview service-token success never counts as approval proof. All ordinary staging/preview routes must demonstrate absence of production memory bindings. Build/test/deploy checks run through `/save` remotely; the acceptance flow must be recorded as unverified until actually run; planning created no endpoint or credential.

## Separate Artifacts integration

The full memory/Devices feature has its own draft PR based on main. [PR #238](https://github.com/matthewwong525/WongStack/pull/238) retains Artifacts hosting and migration; neither change depends on the other for its source import graph. Future hosted memory integration consumes the generic installation contract only after the memory feature is delivered and its explicit integration handoff passes. Do not present historical simulated-identity pilot evidence or the prior combined source gate as acceptance of real login or either new split revision. Any test-only adapter changes stay Artifacts-owned and separately coordinated; no disposed trial is rerun by this split. Devices acceptance uses newly owned isolated resources, verified humans and individually reviewed live phases.

## Initialization/status implementation checkpoint

The ordinary Node-free operator library now prepares initialization/status with migration 0010 and a hash-checked release SQL bundle; see [the exact adapter contract](operator-contract.md). It reads both active Worker versions and settings, shares one DB/bucket and pin, accepts closed Access placeholders or the exact paired memory-only override, and never reports ready without this machine's proof. Initial IDs, provider/owner intent and a final immutable completion receipt are submitted together. Incomplete bootstrap metadata is never adopted on retry. No owner principal or device credential is minted.

Activation requires the serialized source gate plus a manifest-owned disposable REST DDL/metadata rollback/concurrency probe. SQLite fixture transaction tests and successful REST request shapes are not REST atomicity evidence; a live pass is observed behavior, not a future provider guarantee. The completion receipt remains required after either normal response or retry. Legacy adoption, Access enablement/repinning, owner candidate/CLI, handlers and Devices stay separate unfinished tasks.
