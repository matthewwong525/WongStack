## Purpose

Let a signed-in installation member approve their own computers and inspect or revoke the resulting narrowly scoped memory access.

## ADDED Requirements

### Requirement: A machine uses a trusted installation address

A machine SHALL discover its app address only from trusted local installation metadata or explicit initial routing supplied by the person. It SHALL pin the installation and repository identity to that HTTPS origin, refuse changed pins and authenticated redirects, and SHALL NOT discover installations from email alone. Git remote hosting SHALL NOT determine memory authorization.

#### Scenario: A new external computer
- **WHEN** no trusted app address is available
- **THEN** connection requires the installation's app URL, with the signed-in approver choosing the person without contacting a central account directory

#### Scenario: A branch substitutes another app
- **WHEN** a worktree or remote change supplies an address or installation ID different from the established pin
- **THEN** no request secret or credential is sent to it and connection stops with repinning guidance

### Requirement: Enrollment is short-lived and recipient-bound

A machine SHALL create a request lasting at most ten minutes, bound to one installation, repository, requested permission ceiling and initiating secret. The request SHALL remain unassigned until a code-confirmed human approval binds it to the signed-in active principal. No email prompt, device fingerprint or anonymous account lookup SHALL determine that principal. Start/poll surfaces SHALL impose bounded durable quotas, input sizes and polling backoff and SHALL NOT send unsolicited notifications.

#### Scenario: A member's machine asks
- **WHEN** a valid machine request is initiated
- **THEN** the machine receives a comparison code and safe app link, and the signed-in member can explicitly approve it as themselves

#### Scenario: An attacker probes emails or floods requests
- **WHEN** requests attempt email lookup, guess request references or exceed request/poll limits
- **THEN** membership is not disclosed, storage/work remains bounded and no memory permission is created

### Requirement: Approval needs the intended human and matching code

Approval SHALL require this installation's valid human login, active membership, an unexpired pending request and explicit matching-code confirmation; it SHALL atomically bind that request to the approver. The approver SHALL see the installation, their signed-in account, requested scope, requester-supplied machine name and expiry before acting. Nobody SHALL retarget an already bound request to another principal; owners/admins SHALL NOT approve on behalf of others. Denial, expiry, membership removal and stale permission revisions SHALL prevent issuance.

#### Scenario: A person approves their machine
- **WHEN** the signed-in member confirms the matching chat code and approves the permitted scope
- **THEN** only the initiating machine becomes eligible to claim the approved credential

#### Scenario: Wrong person or wrong installation
- **WHEN** another human tries to take over an already bound request, or another installation, a service token or an anonymous caller attempts approval
- **THEN** no request is approved and private request details are not disclosed

### Requirement: Issuance is one-time and recoverable by the initiating machine

Private polling SHALL require the request secret and return status only. Claim SHALL require that secret and the candidate credential committed by the initiating machine and SHALL activate at most one device credential. Retrying after response loss SHALL confirm only that same issuance. Approval links, browsers and logs SHALL contain no machine credential or request secret, and server storage SHALL retain only their hashes.

#### Scenario: Claim response is lost
- **WHEN** a valid claim activates the precommitted credential but its response is lost
- **THEN** the initiating machine can confirm the same credential without issuing a second one

#### Scenario: Secret substitution or replay
- **WHEN** a caller has only the public code, a wrong request secret, another candidate credential, or a denied/expired request
- **THEN** polling or issuance requiring the missing proof is refused and replay creates no additional device

### Requirement: Device access has bounded renewal and immediate revocation

Credentials SHALL expire within thirty days, rotate only while still valid and authorized, and require human reapproval within ninety days of approval. Browser logout or browser-session expiry SHALL NOT revoke an otherwise valid device grant; required reauthorization SHALL need valid human login and a new explicit device approval. Rotation SHALL invalidate the prior generation immediately. Every memory call and renewal SHALL consult current membership, device status and scope; removal, revocation and downgrade SHALL take effect without waiting for credential expiry. A principal SHALL hold at most ten active devices, with explicit revocation required before adding an eleventh.

#### Scenario: A machine renews
- **WHEN** an active device rotates before expiry and its approval deadline
- **THEN** one new generation succeeds, the prior generation stops, and a lost response can be recovered using the prepared new credential

#### Scenario: Revoked, expired or removed
- **WHEN** a device is revoked, its member is removed, or its credential/approval expires
- **THEN** its next memory call and renewal are denied and it cannot silently regain access

### Requirement: Human management is protected against cross-site and replayed actions

Human mutations SHALL require same-origin authenticated requests with session-bound CSRF protection, current role checks and atomic state transitions. GET requests SHALL NOT mutate authority. Unknown routes, alternate path encodings and unsupported methods SHALL fail closed. Responses SHALL not be cached or expose another person's device/request details.

#### Scenario: A foreign page submits approval
- **WHEN** a browser submits a mutation with foreign/missing Origin or missing/mismatched CSRF proof
- **THEN** nothing changes even if the browser has a valid app cookie

#### Scenario: Concurrent actions race
- **WHEN** claim, denial, role removal or rotation race
- **THEN** only transitions permitted by committed current authorization succeed and stale actions create no grant

### Requirement: Devices is usable for approval and revocation

Devices SHALL list the person's pending requests and connected machines with scope, activity and expiration, and permit explicit denial and revocation. Owners/admins SHALL see only the additional controls their roles authorize. Phone and keyboard flows SHALL expose loading, empty, unavailable, failed and terminal states, with no optimistic success or secret display.

#### Scenario: A member revokes a laptop on a phone
- **WHEN** the member confirms revocation from their device list
- **THEN** the UI reports confirmed removal and the next call from that laptop is denied

#### Scenario: The list cannot load
- **WHEN** loading fails or the login cannot access the request
- **THEN** the page gives retry or correct-login guidance without inventing device state or disclosing another person's request

### Requirement: Client state stays private and cannot change identity silently

Device credentials and pending secrets SHALL be stored outside tracked files with OS-user-only access and atomic updates. Hooks SHALL reuse one pending request, respect polling backoff, and never bypass required approval. Identity-bound queued writes SHALL remain private and SHALL NOT be replayed under another principal or installation. Ordinary memory calls SHALL never fall back to a Cloudflare account token.

#### Scenario: Concurrent session starts
- **WHEN** two sessions on one machine need connection or renewal
- **THEN** they coordinate one local device lifecycle without printing credentials or creating request spam

#### Scenario: The account changes while writes are queued
- **WHEN** a different principal later connects on the machine
- **THEN** previous queued writes remain quarantined until their original identity is proven and are not relabeled
