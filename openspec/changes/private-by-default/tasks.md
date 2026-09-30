# Tasks

## 1. Provider contract and coordinated cloud plan

- [x] 1.1 Probe Worker-scoped Access on disposable production/staging Workers, confirming actual Worker IDs, two destinations, default/custom hostnames, old/new previews, memory override, service auth, and real email login through the dedicated wongstack-cloud walk inbox; securely save separate test credentials/session state, record observed results and stop if native protection is unavailable.

- [x] 1.2 Include the CI Node version file in the full payload inventory for standalone setup, verify installed workflows reference files the payload ships, and preserve existing installer behavior. Keep runbook wording within the context budget and record this live-setup correction.

- [x] 1.3 Keep a new standalone preview login usable before production business content is first deployed: after owned native app and human/machine policies are confirmed, enable only the newly created production bootstrap login anchor while preserving its unavailable response and disabled previews. Persist a recoverable ownership marker, preserve existing Worker publication choices, and verify interruption/rerun ordering and no business content before protection. Confirm the native callback with an isolated live bootstrap fixture.

## 2. Shared provisioning and server contract

- [x] 2.1 Add automatic Access permission widening, reachable owner-email validation, and recoverable Zero Trust organization/one-time-PIN setup for both install paths; extend provisioning tests for account-scoped permissions, missing identity/onboarding, interrupted reruns, and no public fallback.
- [x] 2.2 Provision unavailable bootstrap Workers, resolve their real IDs, create/reuse only owned Worker-scoped Access resources, detect higher-precedence conflicts, and record safe identifiers; test no app assets are published before protection and unrelated resources remain untouched.
- [x] 2.3 Provision exact-email and separate machine policies plus the production memory-only exception; extend tests for deduplication, synthetic identity exclusion, owner retention, narrow exceptions, and machine-policy preservation.

### Coordinated cloud contract before installer integration

- [x] 2.4 Create a separate wongstack-cloud workspace and plan from its current owning docs and managed-service memory, with its membership migration, existing team status/retry presentation, encrypted Access-only connection, authenticated installer result delivery, and all add/remove routes; link that plan here and verify both contracts agree before implementation.
- [x] 2.5 Extend the server input contract with `ownerEmail` and an authenticated private management-result handoff, mint an Access-only account token, and retain existing safe stdout/status behavior; test missing old-job fields, recipient authorization, idempotency, and secret redaction, and document the full contract in `server/README.md`.
- [x] 2.6 Update shared config fragments and environment declarations for Access identifiers, local development, and separate machine credentials; provide repeatable verification using saved, ignored credentials without logging them; verify generated production/staging configurations intercept all assets and reject deployment of authentication bypasses using configuration tests, then document closed/pending results and the management token’s residual account scope. Live production/staging verification remains required in 6.1 after the source checkpoint.
- [x] 2.7 Set the owned application's human login/session-token default to `720h` (30 days), ensure the human policy uses/inherits it, and retain it during membership reconciliation; test returned configuration and real-signed JWT expiration boundaries without changing service/API credential lifetimes, then document the app-scoped duration and reviewed custom overrides. Live early revocation of a still-unexpired human session remains required in 6.3 after cloud deployment.

## 3. Worker enforcement and deployment checks

- [x] 3.1 Enforce the existing signed-JWT verifier before pages, static assets, APIs, and mini apps, retaining key-authenticated memory; extend real-signed token and entry-point tests for human/service identity, missing config, wrong audience/signature, forged headers, and valid/invalid memory keys.
- [x] 3.2 Make every app path run through the Worker before the asset binding, including staging and previews, and restrict explicit authentication substitution to local development; verify generated configs and routing tests cover HTML, JS, CSS, mini-app assets, and unknown routes.
- [x] 3.3 Add read-only Access coverage checks to both deploy backends and the CI deploy token, refusing content/preview publication when protection is missing; test with fake Wrangler/provider responses and document failure/recovery without granting CI policy-write permissions.

## 4. Setup, update, and release guidance

- [x] 4.1 Make `/wong-setup` enable Zero Trust automatically without an enable-or-public question, and update the Access wiki and linked setup/credentials/stack/preview/memory/verification guidance; verify no live guide promises public default previews or requires custom domains for native Worker protection, preserving linked headings where required.
- [x] 4.2 Add the existing-install migration to sync guidance and release updating notes, including owner/team backfill, local code preservation, explicit public route review, protocol/precedence conflicts, and pending reconnection; verify a locally adapted install is not overwritten or falsely reported private and previous public choices receive explicit review.
- [x] 4.3 Add one `## Next (major)` changelog entry without changing VERSION; verify payload links, OpenSpec configuration, and retired-name checks pass, and measure context headroom if skill text changes.

## 5. Downstream wongstack-cloud delivery

- [ ] 5.1 Implement the linked cloud plan in its own workspace: verified owner email, source pin, secure Access-only connection delivery/storage, and existing-owner backfill; verify downstream credential isolation and installer contract tests pass before enabling managed sign-ups.
- [ ] 5.2 Deliver transactional desired membership/outbox revisions and serialized scheduled reconciliation on add, legacy join, canceled invitation, shared removal, and own-Hetzner offboarding; verify retries and add/remove/add races converge correctly, with no synthetic or cross-owner grants.
- [ ] 5.3 Remove email permission and revoke this workspace's app sessions, persist failures visibly, preserve owner/machine permissions, and rotate or delete management connections safely; verify failures never report completed revocation and VM downtime/deletion does not prevent provider updates.
- [ ] 5.4 Complete the cloud plan's own docs, checks, review/status behavior, and `/save` preview; verify its public login/sign-up and webhooks remain reachable and link its evidence here. Keep this group unfinished until downstream implementation is delivered.

## 6. Deployed integration evidence

- [x] 6.1 Run `/save` for the source CI gate and deployed preview, then verify an anonymous visitor is denied and a real allowed email renders production, staging, an existing version/alias, and a fresh branch preview on default and configured custom hostnames; include independent machine and memory checks.
- [ ] 6.2 Exercise `server/setup.sh` and the installer on a disposable real server, including first CI deploy, owner email login, memory digest, and idempotent rerun; record evidence and remove only the test server/repo/Cloudflare resources created for this check.
- [ ] 6.3 Verify live cloud add/remove with a real teammate who already has an active session, including owner-server downtime, pending retry, preserved owner access, and expected reauthentication of remaining teammates; record provider propagation and do not claim zero-latency revocation.
- [ ] 6.4 Verify existing-owner upgrade and this source repo's own protected app, preserving unrelated Workers and explicit public services; report remaining unverified or pending migrations, and mark the complete request done only after both repositories' gates and the live membership flow pass.
- [x] 6.5 Verify a standalone `/wong-setup` installation automatically protects its pages and previews without an enable-or-public question; rerun it to confirm idempotency and test a failed protection step stays closed.
