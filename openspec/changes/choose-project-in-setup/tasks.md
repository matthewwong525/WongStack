# Tasks

## 1. Existing-install and provider contracts

- [x] 1.1 Recheck the merged #259 records and inventory the target owner evidence, Access IDs, repository and custom routes; deliver compatibility/route findings with missing live trust recorded and no provisioning or Cloud picker changes. Actual owner/provider verification stays in 7.2.
- [x] 1.2 Record the documented GitHub App permissions/endpoints for clone, push, PR/check/preview operations, renewal and revocation, and the required provider publication boundary. Deliver the candidate narrow manifest, primary references and known blocked cases; actual endpoint/protection proof remains in 7.2 and editing stays disabled until it passes.

## 2. Core membership and app authorization

- [x] 2.1 Add additive app-D1 roster/grant/revision/connection/receipt tables and trusted owner activation, preserving customer data and rejecting first-visitor/service/foreign-target owner claims. Add migration and identity tests; verify through `/save`'s remote app gate and document activation/rollback in the owning stack wiki.

  The first remote gate passed at `8ba9ab9`: prefixed migration, private-pinned signed-owner activation, self-identity evidence endpoint, SQLite transaction/migration tests, signed-JWT routing tests, binding exclusion and activation/rollback guidance. Policy and issuance remain disabled; the private operator command and actual owner/provider acceptance remain pending. See [the installation inventory](implementation-inventory.md) and [GitHub contract](github-contract.md).
- [ ] 2.2 Add current membership/app authorization to mini-app and main dispatch, both described and bare routes, with explicit reviewed main-route mappings, owner/self-service exceptions, no permissive fallback and authoritative read consistency. Add denied, unmapped, action/record-guard and acknowledged-removal tests; verify through `/save`'s remote gate and document custom-route mapping beside company API guidance.

  Source ready for its remote gate: explicit trusted rollout latch, one primary D1 statement for current membership/grants, automatic mini-app scopes, reviewed main-route scopes, conjunctive described/bare dispatch, owner/self-service distinctions, committed configuration guidance and synthetic removal/guard tests. No local checks or live activation were run. Leave this task unchecked until its required remote gate passes. Discovery/navigation filtering remains task 2.3; complete onboarding stays unavailable until the later connection/setup/acceptance work passes.
- [ ] 2.3 Apply the same current grants to summaries, selected details, OpenAPI, conditional responses and frontend app-access readback. Test stale ETags, cross-user caching, shared-action mappings, empty/unavailable policy and new unassigned apps; verify through `/save`'s remote gate and update discovery docs.

## 3. Owner connections and private GitHub issuance

Build 3.1–3.4 as one connection slice. Keep each task unchecked until the shared remote gate at 3.4 passes; do not stop for intermediate source-only checks.

- [ ] 3.1 Configure separate sealed Access-only login-management authority and exact recorded-resource reconciliation in core modules; keep durable latest-generation retries and independent policy/session results. Exclude connection secrets/sealing authority from ordinary mini-app bindings, expose only finite owner-checked operations, and isolate staging from production writes. Add stale-add, partial-removal, owner-isolation and binding-exclusion tests for the shared gate at 3.4; document actual scope/private owner setup.
- [ ] 3.2 Add customer-owned GitHub App manifest registration/install callbacks with current owner, one-use attempt and CSRF checks; seal private material and independently verify the recorded repository, granted permissions and publication boundary. Add rejected/stale/organization-pending/protection tests for the shared gate at 3.4 and document one-time owner approval and App attribution.
- [ ] 3.3 Add private employee issuance/renewal limited to the single repository and reviewed permission subset, with per-machine receipt, pre/post authorization checks and audited nonsecret status. Add race, lost-response, expiry and foreign-target tests for the shared gate at 3.4; document that native GitHub membership is separate.
- [ ] 3.4 Add editing/full removal and tracked GitHub-token revocation, unknown-issuance expiry deadlines and retry results without restoring stale access. Verify the full 3.1–3.4 slice through `/save` with removal-during-issuance/renewal, provider-outage and residual-access tests; document downloaded-copy, external-membership and independent-memory limits.

## 4. Empty-folder assistant setup and repository workflow

Build 4.1–4.3 together, keeping all three unchecked until the shared remote script/app/payload gate at 4.3 passes.

- [ ] 4.1 Factor employee company transport away from repo/memory imports and publish a standalone version/digest-pinned bootstrap artifact through the reviewed distribution machinery. Support app-only API setup before a clone, canonical-origin login, approved browser URLs and authenticated readiness. Add empty-folder, headless-login, expired-session, redirect-refusal and missing-connection tests for the shared gate at 4.3; document the actual copy/paste procedure.
- [ ] 4.2 Add a private Git credential/provider invocation adapter using the same employee app identity, scoped renewal and no token-bearing URLs/argv/remotes or global personal-gh replacement. Verify clone/fetch/push/PR/check operations, no secret inheritance into hooks/builds and safe folder/dirty-work resume with remote tests at the shared gate at 4.3; document supported operations and owner-required publishing.
- [ ] 4.3 Adapt git-fronting skill connection checks to accept the verified private repository adapter while preserving spec reconciliation, resume, PR update, exact-head checks, archive and publication gates. Employee `/ship` must request the existing owner publication path without bypass. Verify the full 4.1–4.3 slice, workflow regressions and payload/context checks through `/save`; keep existing personal GitHub authentication usable.

## 5. Access mini app and employee home

Build 5.1–5.3 together. The shared remote app/UI/script gate is at 5.3; deployed interaction checks are completed in 7.1, and controlled live copy/paste acceptance in 7.2. Keep the three source tasks unchecked until the shared gate passes.

- [ ] 5.1 Build Access owner people/add-edit/connections/removal sections and employee self-service setup/status, with the proposal's empty/loading/pending/error states and server-enforced owner operations. Add colocated form/identity/copy/retry tests; include them in the shared source gate at 5.3 and phone/keyboard acceptance at 7.1, and document add-email/share-link onboarding.
- [ ] 5.2 Add the home Copy setup prompt action, allowed-app list and denied/empty/unavailable navigation. Preserve branding and the owner's removed-or-present tutorial while hiding employer personalization guidance from employees. Test clipboard fallback, announced status, unauthorized links and zero-app self-service through `/save`; document the new employee starting point.
- [ ] 5.3 Generate nonsecret setup/resume prompts pinned to the reviewed bootstrap release and business origin, with independent API/project readiness and honest memory-not-connected guidance. Verify the full 5.1–5.3 slice with remote UI/script tests through `/save`; actual pasted empty-folder app-only/editor instructions are checked under controlled acceptance in 7.2.

## 6. Distribution and reviewed updates

Build 6.1–6.2 together and verify distribution, instructions and payload checks at the shared remote gate at 6.2. Keep both unchecked until it passes.

- [ ] 6.1 Explicitly ship Access and bootstrap assets in payload inventory/stack pack while leaving other meta-only mini apps unshipped. Add a Next minor CHANGELOG entry with plain owner connection/activation steps, leave VERSION unchanged, and preserve customized app/routes/login/business data on sync. Add distribution/install regression and payload links/config/retired-name/context checks for the shared gate at 6.2.
- [ ] 6.2 Update setup/sync/company API/mini-app guidance for existing-app employee connections, private management exclusions and independent memory authority. Verify instructions against delivered artifacts and exact copied prompt; verify the full 6.1–6.2 slice through `/save` and rebuild/validate this review if implementation changes its scope. Do not implement new-project OAuth, Artifacts, memory enrollment or Cloud picker work.

## 7. End-to-end acceptance

- [ ] 7.1 Run `/save` for all required remote checks and a deployed preview, then verify owner/employee Access states, phone/keyboard operation and selected-app API/discovery denials with synthetic nonproduction provider bindings. Record exact evidence without local builds or weakening checks.
- [ ] 7.2 With the required controlled-installation authority, verify actual owner registration, email admission, an employee with no GitHub account connecting from an empty folder/remote host, clone/PR/check access, expiry renewal, app deselection during a valid session, editing revocation and full removal with provider propagation. Confirm GitHub attribution, owner publishing boundary and no secret leakage. Missing authority or incomplete provider outcomes remain unchecked/pending; remote source checks alone do not establish live readiness.
