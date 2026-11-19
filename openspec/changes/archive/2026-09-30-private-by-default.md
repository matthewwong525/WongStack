<!-- openspec-archive v1 2026-09-30-private-by-default -->
<!-- file proposal.md utf8 21665 -->
# Private sites and previews by default

**Status:** ready-to-ship
**Branch:** zero-trust-defaults
**Open questions:** none

## Why

WongStack sites and previews are public today, and adding or removing someone in wongstack-cloud does not update who can open the team’s site. Every new workspace should start private, whether installed through wong-setup or wongstack-cloud, with the same team controlling access everywhere.

## What Changes

- **BREAKING: Every new workspace starts private.** Both wong-setup and wongstack-cloud automatically enable Zero Trust, with no enable-or-public question. The owner signs in by email, and the site's default address, custom domains, staging site, mini apps, and every preview require an allowed email. Protection follows the site when an address changes.
  ```text
  Setup or cloud install
          │
          ▼
  Default address ──┐
  Custom domains ──┼──▶ Sign in ──▶ Workspace
  Staging ─────────┤       ▲
  All previews ────┘       │
                   Owner and team emails
  ```
- **Login sessions last 30 days by default.** People sign in again when their session expires. Removing someone still revokes access before those 30 days are up.
  ```text
  Sign in ──▶ Session lasts 30 days ──▶ Sign in
                       │
                 Removed earlier?
                       ▼
                 Access revoked
  ```
- **Adding and removing emails also changes site access.** Adding a person through wongstack-cloud allows that email; removing them removes permission and clears the workspace's existing login sessions, so the remaining team signs in again. Failed updates stay pending and retry; the cloud service keeps a restricted, encrypted key so this works even when the owner's server is offline.
  ```text
  Add email ──────▶ Allow on site and previews
  Remove email ──▶ Deny and end login sessions
                          │
                    Failed update?
                          ▼
                  Keep pending and retry
  ```
- **Automated work keeps working.** Saved memory remains protected by its own keys, and checks use a dedicated machine login. An incomplete security setup blocks access rather than publishing a public workspace.
  ```text
  Person ──▶ Email login ──────────▶ Site
  Checks ──▶ Dedicated key ────────▶ Site
  Memory ──▶ Existing memory key ──▶ Memory
  ```
- **Existing workspaces get a checked upgrade.** Carry over the owner and current team, protect their existing addresses and previews, and verify a real email login before calling the upgrade finished. Public sites and webhook routes need explicitly chosen exceptions; the public wongstack-cloud sign-up service stays reachable.
  ```text
  Existing workspace
          │
          ▼
  Keep owner and team ──▶ Protect all addresses
                                  │
                                  ▼
                         Check an email login
  ```

**Non-goals:** WARP enrollment, device posture or network controls; inviting teammates into Cloudflare's administrative account; protecting unrelated Workers in a shared account; putting the public wongstack-cloud product website behind the customer workspace wall.

## Capabilities

### New Capabilities

- `managed-workspace-access`: The server-install contract for owner identity, app-scoped protection, and automatic cloud-managed membership, including revocation and reliable synchronization.

### Modified Capabilities

- `install-onboarding`: Interactive and unattended installation automatically enable Zero Trust without offering a public-site choice.
- `cloudflare-provisioning`: Private provisioning, Worker-scoped coverage, machine access, and checked completion replace the public and custom-domain-only defaults.
- `app-scaffold`: The scaffold enforces verified Access identity on pages, assets, APIs, and mini apps from its first deployment.
- `wong-sync`: Existing installs receive an explicit security migration that preserves intended public surfaces and their own code.

## Impact

- WongStack: shared provisioning, server installer and contract, Worker entry point and asset routing, pack fragments, deploy checks, setup/sync/verify guidance, environment declarations, and a major release note.
- wongstack-cloud: a coordinated downstream change must supply the owner's verified email, capture scoped Access management credentials securely, synchronize team changes independently of VM availability, migrate existing owners, and pin the source release. This source plan specifies that contract; downstream implementation belongs in its own workspace and plan, linked before the private installer handoff and downstream implementation. The complete user request remains unfinished until both changes pass their gates and the live team flow is verified.
- Feature branch: `zero-trust-defaults`.

## Decision log

- **2026-09-30** — Assumed: use Worker-scoped Access destinations for production and staging, because Cloudflare's August 2026 documentation now includes all associated addresses and previews; the repo's August custom-domain-only guidance predates that support.
- **2026-09-30** — Assumed: use exact owner and teammate emails with one-time PIN available, because the user asked to manage access by email and this needs no external identity provider.
- **2026-09-30** — Assumed: protect the customer's whole workspace, while preserving the public cloud sign-up service and only explicitly reviewed public routes, because customers must still be able to sign up and machines must still authenticate.
- **2026-09-30** — Assumed: carry this into existing managed installs as well as new ones, because the request includes removals and protection of everything, rather than only future sign-ups.
- **2026-09-30** — Assumed: the cloud control plane retains an encrypted, account-scoped Access-only management token, because membership removal must not depend on an owner's server being online; the broad installation token keeps its existing transient delivery and host-only storage.
- **2026-09-30** — Assumed: revoke sessions for this workspace's Access application on removal, because the policy-management permission already supports it and it avoids changing sessions on unrelated applications; the remaining team must sign in again.
- **2026-09-30** — Assumed: plan the shared source contract here and implement the cloud integration in a linked downstream change, because these two repositories own different parts of one outcome and neither half alone fulfills the request.
- **2026-09-30** — Asked whether interactive wong-setup should ask if the person wants to enable Zero Trust → chose to add that choice, with Enable recommended and the answer remembered. This supersedes mandatory private access for standalone setup.
- **2026-09-30** — Assumed: unattended wongstack-cloud installation stays private by default, because the follow-up names wong-setup and does not retract the original cloud-managed default or email synchronization request.
- **2026-09-30** — Asked whether wong-setup should also enable protection automatically → chose automatic Zero Trust for wong-setup as well as wongstack-cloud, superseding the preceding setup opt-in choice.
- **2026-09-30** — Asked which token should last 30 days by default → chose the login/session token; people authenticate again after expiry and removal still revokes access. Automation credentials and Cloudflare API-token lifetimes are separate.
- **2026-09-30** — Asked to use wongstack-cloud emails rather than require the person during testing → use unique `walk+<random>@wongstack.com` addresses and the existing dedicated walk inbox for real email login and teammate revocation tests. These disposable test identities do not grant access to real customer workspaces.
- **2026-09-30** — Asked to save a testing token or equivalent → persist dedicated service credentials and test browser sessions securely outside git, and make the verification path reuse the workspace's declared machine credentials. A machine test remains separate from the email-login and removed-session tests; never add a deployed auth bypass or give CI policy-write access.
- **2026-09-30** — Observed in the live disposable [provider probe](provider-probe.md): two Worker destinations protect all tested addresses but a Worker-only app did not deliver its initial email PIN. Keep both Worker destinations and add the production default `workers.dev` address as the same application's exact public destination and legacy domain, mirroring the narrow memory override. A fresh dedicated email login then worked without any custom-domain requirement; native human and machine requests carry the signed assertion needed by the existing verifier.

- **2026-09-30** — Assumed: independent shared provisioning can proceed after the successful provider probe while the linked cloud plan finishes. Agreement on the complete cloud plan remains mandatory before the private installer handoff and downstream integration; all original verification tasks remain required.
- **2026-09-30** — Confirmed from the provider permission model: the retained Access-only management token cannot delete API tokens. Use a fresh transient setup credential for rotation cleanup when available; otherwise retain an explicit pending credential-cleanup outcome and never claim local deletion revoked it.

- **2026-09-30** — Agreed the linked `sync-workspace-access` cloud plan and version-1 private result-file/VM-authenticated delivery contract. Results echo the authoritative target/owner and actual canonical source identity; cleanup uses account-token endpoints and retains the Access wall until all owned content surfaces are decommissioned. The CI-gated source pin and final release pin remain delivery steps.
- **2026-09-30** — Clarified task 2.6 as configuration and credential preparation checked with fixtures; deployed production/staging verification stays mandatory in task 6.1. This lets enforcement and deployment checks be implemented before the first source checkpoint, without publishing an incomplete guard or dropping live evidence.
- **2026-09-30** — Reviewed and expanded this source repo's older, owned staging runbook wall in place before content deployment, preserving its audience and existing human/machine policies. Default production/staging and the custom staging address now challenge anonymous requests; keyed memory still works. The live readback exposed reordered provider JSON keys, requiring semantic comparison. Full deployment and browser verification remain pending; see [source-migration.md](source-migration.md).
- **2026-09-30** — Clarified task 2.7 as session-default implementation and signed-expiration tests before deployment. Live early removal of an unexpired human session stays mandatory in task 6.3 with the cloud membership flow. Existing reviewed shorter human policies remain separate from the app duration returned by the version-1 contract.

- **2026-09-30** — Source checkpoint: tasks 1.1, 2.1–2.7, 3.1–3.3 and 4.1–4.3 are implemented and checked; app tests (47 at 100% coverage), script tests (702 passing, 10 existing environment skips), lint, payload links, strict specs and context limits passed. The in-place source wall and real dedicated email session work before the new guard deploy. Cloud membership/provider/status/transport work, the exact CI-gated feature pin, real server and standalone installs, deployed origin enforcement, and existing-session removal remain required before archive or release. See [implementation-evidence.md](implementation-evidence.md).

- **2026-09-30** — Check: `app/knip.jsonc` changes only the entry comment to reflect the now-enforced signed-identity verifier; no entries, exclusions, limits, or checks changed. The settings-change detector also flags comments, so this records the unchanged gate rather than weakening it.

- **2026-09-30** — The reviewed feature checkpoint and five-address human/machine/anonymous matrix passed, including current staging origin enforcement, 720-hour human cookies and keyed production memory. A real Ubuntu server install and unchanged rerun also passed; its private fixture stays intact for authenticated cloud adoption and live removal, so cleanup and task 6.2 remain pending. See [deployed-evidence.md](deployed-evidence.md). The final released source revision must replace the reviewed feature pin before downstream merge.

- **2026-09-30** — Clarified the memory-isolation wording as staging and CI branch previews: native production version URLs execute the production version and inherit its bindings. Production memory remains independently key-authenticated on its narrow route; all business content remains covered by the Worker wall. This records the actual provider boundary without claiming old production versions lose their memory bindings.

- **2026-09-30** — Standalone live verification found `.nvmrc` missing from the canonical payload inventory even though both shipped CI workflows require it. Add it to the full payload and a workflow-to-inventory contract check; the disposable fixture has the exact reviewed source file. Existing installer separately copied it. New files in the initial fixture legitimately trigger settings review; record initialization reasons without weakening checks.

- **2026-09-30** — Live standalone preview OTP authenticated a 720h organization session but could not set an app cookie because the newly created production anchor remained workers.dev-disabled. The same preview completed after CI enabled production. Enable only an owned new production bootstrap anchor after all native human/machine policies are confirmed; retain its unavailable body and disabled previews. Existing Worker publication choices remain preserved. This is necessary for preview-first setup without publishing business content early.

- **2026-09-30** — The corrected bootstrap callback passed a controlled live replay on the existing standalone fixture, with no new resources: production contained only unavailable content, interrupted owned-policy read left it disabled, recovery enabled its protected default but kept previews disabled, and fresh OTP reached the real staging alias with signed 720h app cookies. Production was restored to its already CI-green immutable version. The same fixture separately passed production/staging/preview human, machine, anonymous and memory-key checks; cleanup is retained in this source task handoff until the fixture checkpoint/merge finishes.

- **2026-09-30** — Standalone final walkthrough and production merge checks passed, then all recorded standalone test resources/repository and private credential files were removed with Workers decommissioned before their Access wall. Cloud original9795 authenticated receipt/restart recovery passed without export replay; all five saved still-unexpired720h owner cookies were denied after initial adoption. Preserve the separate server fixture and leave its VM off during the coordinator’s pending scheduled-retry gate. Source/cloud final publication and the disposable dashboard-authority host rolling gate remain required.

- **2026-09-30** — The completed natural offline removal, explicit rejection of a still-valid pre-removal native OTP, owner reauthentication and preserved original machine/memory satisfy the live membership task. Keep the fixture for remaining reconnect/dashboard-authority gates. Add a fixture-only CI production-version upload for the requested actual native production preview/memory boundary; the ordinary production deploy reports no version preview, and source payload behavior stays unchanged.

- **2026-09-30** — Native production-version task6.6 completed on the same retained fixture: actual CI-reported immutable/alias URLs, owner/machine/anonymous content, independent keyed-memory boundaries and unchanged production deployment all passed. No source payload change or source export/reconnect; retain fixture for mandatory disposable-dashboard host rolling and existing-owner reconnect before cleanup/final release.

- **2026-09-30** — Cloud accepted the final native gate and fixture evidence checkpoint4aac9ed with green Test36695840442/Deploy36695840453. Remaining coordinated cloud task5.3 is actual disposable-dashboard host rolling/existing-owner reconnect preserving custom code and sticky protection, then final source release pin, exact-pin checks, PR33 reconciliation and parent cleanup. Route/storage/provider tests already cover legacy branches, and actual teammate VM offboarding preserved the wall; no additional live membership or teardown cycle is required. Original acknowledged9795 authority and source733 feature pin remain unchanged.

- **2026-09-30** — At the user’s request, independently retried creating a disposable user-token copy with the primary token’s exact policies and required API Tokens Write/Account API Tokens Write/Account Settings Read groups. After correcting only the expiry serialization format, Cloudflare returned HTTP400/error1001: “sub-token is not allowed to have permissions to manage other tokens.” No child was created and the parent token was unchanged. This confirms the dashboard-created disposable setup credential remains required for actual host rolling; no root-token substitution.

- **2026-09-30** — Personal Cloudflare bot detection prevented the remote browser login. User created the dedicated disposable user token on their own device from the prefilled form, then delivered it through a browserless private key link. Completion971fcb05549158bf1fbf5495cb7c2988 handled once; required groups and selected-account access independently verified. Separate mode0600 credential file is ready for the new actual host job at reviewed source733; both primary host setup values remain unchanged, original9795 receipt is never replayed, and parent owns disposable-family cleanup. The temporary distinct input declaration must be removed with fixture cleanup rather than shipped as a new runtime requirement.

- **2026-09-30** — The deployed authenticated cloud connect route accepted the supplied disposable dashboard credential at12:45:04 for new job5325cf65-269c-493f-82cd-30a14b8b9879, same connectionb59b94bc-3215-44a7-a2f4-b27444675823/generation2 and exact reviewed source733. The original9795 acknowledged job stays done/immutable; old Access tokenfbd5fc7dab06ec11f60b3461a81fc4d3 is the new job’s owned cleanup target. Coordinator verified retained server168049667, clean fixture4aac9ed/custom branch, both workflows, defaultmain/main5a28b927 and open fixture PR1 before starting the CI-reviewed actual host agent. Parent keeps owner browser idle and cleanup held until completion; no membership mutation or host-root substitution.

- **2026-09-30** — First actual generation2 host tick ran exact source733 at12:48:56 and failed at12:49:21 with generic cloudflare reason before private export/rolling; final failed status was acknowledged, original9795 journal stayed done/acknowledged. Read-only diagnostics confirm disposable token active with all13 widened groups, exact cached source733, intact app/Worker/policy ownership, clean custom target, GitHub secret-list exit0 and pinned names GET checks200. A suggested secret-row escaping defect was withdrawn after actual expression evaluation passed; no speculative source change. Cause remains undiagnosed; preserve fixture and do not replay generation2 or weaken output filtering.

- **2026-09-30** — Actual authenticated host generation3 reconnect at reviewed733 completed one source execution, one private delivery and one final report with rolled=true. The original setup value is denied and its replacement retains the same disposable family; old Access authority was deleted, new Access-only authority adopted, custom files/non-setup keys/sticky wall/original machine preserved. The failed generation2 remains failed, cause undiagnosed, never replayed; original9795 remains immutable. Independent fresh owner70requests across seven hosts passed35human200/35anonymous302 with720h sessions. All implementation/live tasks now pass against both reviewed feature gates. Parent cleanup decommissioned all owned fixture content before its wall, resources/server/repo/private credentials and disposable family; unrelated source/cloud services remain. Cloud retains safe audit receipts and retires only dedicated staging authority. Final source archive/CI/walk/merge produces the RELEASE SHA for coordinated cloud exact-pin CI/PR33 reconciliation/publication, which remains a publication gate rather than unfinished implementation.

- **2026-09-30** — Archive checkpoint:26/26 tasks complete, strict validation passed and all capability deltas already match main specs. Source release is numbered from the current green default branch; final archive checkpoint is gated by full CI and a deployed walkthrough before merge. Downstream receives the actual merged RELEASE SHA and must pass its exact-pin full gate before coordinated publication. No credentials/check thresholds were weakened.

- **2026-09-30** — Final release union preserves newer default-branch releases27.9.0 and27.10.0 (improve outcome workflow and usable browser handovers), including their payload manifest wording and this change's CI Node inventory. Default-branch CI is green; conflicts were resolved as the union of intent. Release numbered28.0.0 from27.10.0.

<!-- end proposal.md -->
<!-- file design.md utf8 23893 -->
# Design

## Context

See [proposal.md](proposal.md) for the outcome. Shared provisioning lives in `.agents/skills/wong-setup/scripts/provision.mjs`; `server/install-wongstack.mjs` and interactive setup use it. It currently creates databases, memory, config, and a narrow CI deploy token, without Access or deployed Workers. The first push publishes the app. `app/worker/access.ts` verifies signed human and service-token assertions, but `index.ts` does not call it. Static assets normally skip the Worker; the current `run_worker_first` list covers only APIs, memory, and mini apps.

The read-only inspection of `/root/wongstack-cloud` found email-based team additions in `app/worker/team.ts`, shared removal in `removePlace` including own-Hetzner flows, encrypted transient installation jobs in `cloudflare-connect.ts`, and VM jobs for GitHub grant/revoke. Cloudflare management credentials are not retained by that control plane today. A teammate's Cloudflare login email must be their cloud account email, not the GitHub noreply address used for memory authorship.

## Goals / Non-Goals

**Goals:** automatically enable private access in both interactive and unattended installs; no anonymously reachable business pages or assets at first deployment; coverage that follows each owned Worker; reliable team updates without a live VM; a coordinated upgrade for existing installs.

**Non-goals:** blanket account-wide Access, automatic Cloudflare admin membership, or bypassing the user's cloud account billing/onboarding requirements. Source and downstream work remain in their own repositories; the source contract alone is not completion of the complete request.

## Decisions

### 0. Enable protection automatically for every installation

Both `/wong-setup` and the unattended cloud installer provision private access without an enable-or-public question. Install records and generated production/staging config describe the protection actually provisioned; no automatic public mode is exposed by the shared provisioner or scaffold. Missing configuration and failed setup remain closed, never an inferred public choice. A deliberately public app or webhook route needs a separately reviewed change with explicit exceptions. This does not change which payload components are installed.

### 1. Attach Access to the two Workers

Create one owned self-hosted Access application containing two `worker` destinations: production and staging, identified by Cloudflare Worker IDs. These cover routes, custom domains, default `workers.dev`, stable staging, branch aliases, and unique version URLs without touching unrelated Workers. Include the production default `workers.dev` hostname as the application's `domain` and an exact `public` destination in that same application: the live probe's Worker-only app did not deliver its initial email PIN, while this default-address anchor completed a fresh email login without requiring a custom domain. Mirror production's narrow memory override on the exact public destination so its higher precedence does not challenge memory. The Worker destinations provide continuing coverage for every other address; the anchor is neither a bypass nor a separate hostname app. Record account, actual Worker IDs/names, Access app ID/AUD, team domain, owned policy IDs, and service-token ID in the install’s non-secret metadata.

Current official documentation supports this destination type:

- [Worker-level Access and precedence](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).
- [Destination schemas and public path overrides](https://developers.cloudflare.com/api/typescript/resources/zero_trust/subresources/access/).
- [Worker lookup by ID or name](https://developers.cloudflare.com/api/resources/workers/subresources/beta/subresources/workers/methods/get/).

Before implementation depends on this, probe the real account with disposable resources: confirm returned IDs, supported destination schemas, all-address coverage, and actual email login on `workers.dev`. A documented API feature is not a live test result. The observed schema, default-address anchor, initial-login diagnostics, and independent human/machine results are recorded in [provider-probe.md](provider-probe.md). Unsupported account features stop the private install with an actionable reason, never substitute an open app. Account-wide defaults were rejected because customers can have unrelated Workers.

Inspect more-specific hostname, path, and `preview_worker` applications before adopting an existing Worker; they take precedence over the Worker application. A managed bypass conflict prevents a protected-success report. Existing rules owned by others are identified for reviewed migration, never silently edited or deleted.

### 2. Default to exact verified emails and a real email login

Include only the verified owner's email and the cloud team's current real-person emails. Normalize case and whitespace, deduplicate, reject invalid or synthetic `.invalid` addresses, and keep owner permission independent of teammate removals. Extra workspaces owned by the same person add no fictitious identity. Do not grant an entire email domain or Cloudflare account membership.

Ensure a Zero Trust organization exists and one-time PIN can authenticate allowed emails; reuse existing identity providers and organization settings. Add the required account-scoped Access provisioning permission groups to the shared widen. First-time Zero Trust plan/onboarding may require a dashboard action: record and return that need without publishing business content. Interactive setup obtains a reachable email when the local identity is missing or a GitHub noreply address. Cloud installations receive `ownerEmail` from the verified signed-in cloud user; caller request bodies cannot override it. Existing installation jobs missing that field fail with an actionable compatibility reason rather than guessing.

### 2a. Set the human login/session token default to thirty days

Set the owned Access application's `session_duration` to `720h` (30 days), with the human allow policy inheriting it or explicitly using the same duration. Apply this to the application covering production, staging, and all previews; preserve the duration during email-policy reconciliation. An installation may retain an explicitly reviewed shorter custom duration, but a new installation does not fall back to Cloudflare's 24-hour application default. Do not change account-wide global-session or existing IdP settings to achieve this app-scoped default.

The user clarified that this is the human login/session token, not the Access service credential, the management API token, or the installation token. Keep those lifetimes separate. The Worker verifies JWT `exp` as before; no request may extend an expired assertion. Removal still changes the allowlist and revokes application sessions without waiting 30 days. Test returned API configuration and signed assertions on both sides of their expiry boundary with a controlled clock, plus live revocation of a still-unexpired session.

Cloudflare documents application and policy session durations up to one month in [session management](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/) and the `session_duration` API field in [application creation](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/methods/create/). A shorter existing global or IdP session can require reauthentication when starting a new application session; this setting is the workspace application's token lifetime, not an account-wide promise of uninterrupted SSO.

### 3. Keep incomplete provisioning closed, including static assets

Use the existing JWT verifier for explicit signed identity and independent origin protection. Set `assets.run_worker_first: true`, verify before serving the SPA, assets, APIs, and mini apps, then return the asset binding for allowed page requests. Missing configuration is a closed unavailable state; absent, expired, forged, or wrong-app assertions are denied. `SKIP_AUTH` is accepted only by explicit local-development configuration; deployed config validation forbids it in production, staging, and uploaded previews. No plain identity header creates an identity. Memory always requires its own keys.

Create the named Workers initially with a small unavailable response and with public preview routing disabled, obtain their IDs, attach Access, write audience/team vars to both environments, and then allow the first normal CI deployment. Keep these bootstrap steps idempotent and never upload starter assets before the gate exists. Deployment checks verify the recorded gate and refuse content/preview publication if coverage is missing. CI needs Access read permissions only for that check; policy writes and token management remain outside CI. Neither build backend rewrites the committed config.

The production default hostname must already answer the native login callback when standalone setup first deploys only a branch preview. Checkpoint `bootstrapLoginPending` before uploading a new production unavailable Worker, preserve it through interrupted setup, then activate only that Worker's default hostname after readback confirms the owned app/audience/destinations and both exact policies. Keep its body unavailable and previews disabled; business content waits for CI. Read back publication settings, clear the one-time marker after success, and preserve existing/adopted or subsequently changed publication choices. The live provider callback check remains task 1.3's final gate; source fixture checks alone do not complete it.

### 4. Keep machine authentication narrow

Production's sole default edge exception is the exact `/_memory/*` route on its Worker destination, implemented with documented path overrides. It still requires the existing memory key and grants no access to other paths, assets, or app databases. Staging and preview deployments have no memory bindings. Do not add an implicit `/public/*` exception; webhook and intentionally public paths are explicit reviewed configuration with their own route authentication.

Create an app-specific service token with a separate `non_identity` policy (Cloudflare's API service-auth decision). Keep its ID/secret in the ignored durable `.env` for verification; send to GitHub secrets only when a deployed smoke check requires it. Policy reconciliation preserves this policy while changing human emails. Health probes and browser/request verification use the machine credential, but the human-login test uses an independent browser session without injected service headers.

### 5. Synchronize membership from a durable cloud source of truth

This portion is implemented and tested in a linked `wongstack-cloud` change, using its team and billing conventions. At successful setup, mint a separate account-scoped management token with only `Access: Apps and Policies Write`. Cloudflare scopes this permission to the account, not an individual application: document that residual privilege and enforce app/policy IDs and ownership checks in the integration. The token cannot deploy Workers, access D1/R2, manage API tokens, or manage Cloudflare account members. The control plane encrypts it with its existing `DATA_KEY`, never storing the broad installation token. Transport is a structured authenticated VM-to-control-plane result over TLS; keep token values out of stdout, stderr, URLs, arguments, install records, and logs. Provisioning's public CLI still prints only safe metadata and its existing final status.

Keep credentials and Access metadata in an owner-scoped connection record. Team writes create a durable desired-state revision and outbox entry in the same D1 transaction. A serialized reconciler per owner derives the complete latest allowlist, never blindly replaying an old add. It checks the revision again after each external update and immediately reconciles newer work. Duplicate jobs and reruns are safe; add/remove/add races converge to the newest state.

Queue synchronization when a real person is added or joins a legacy invitation, when an invitation is canceled or a member removed, and when installation/reconnection or a migration finishes. Include removal via own-Hetzner paths and every shared offboarding path. Synthetic extra-workspace rows never grant identities. For removals, update the human allowlist and revoke application tokens; [this endpoint](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/methods/revoke_tokens/) needs the same permission and affects this workspace, while per-user organization revocation would affect unrelated apps. Remaining teammates sign in again. Revocation acknowledgement and effective browser denial are separate evidence; report Cloudflare propagation honestly rather than promising zero latency.

The membership record tracks desired/applied revision and pending/failed reason. A failed update retries with bounded backoff and remains durable for scheduled reconciliation. A UI response must distinguish pending security work from applied access; never say a removed user is fully denied when revocation failed. Credential invalidation requires secure reconnect and does not disable the login wall. VM deletion or owner-server downtime does not stop the reconciler. Preserve existing billing and GitHub/memory offboarding behavior. The retained Access-only token cannot manage or delete API tokens. Reconnection may use the fresh transient setup credential to delete an old management token before it is discarded or rolled. When that credential is unavailable, credential deletion remains explicitly pending until an authorized cleanup can run; local deletion alone never claims the API token was revoked. Preserve workspace protection during cleanup and leave unrelated Access resources untouched.

### 5a. Agreed cloud installer contract

The downstream plan is [sync-workspace-access](/root/.paseo/worktrees/27cot6mt/hard-moth/openspec/changes/sync-workspace-access/review.html), with the agreed version-1 fields and delivery semantics in its [design section 2](/root/.paseo/worktrees/27cot6mt/hard-moth/openspec/changes/sync-workspace-access/design.md#2-agreed-source-task-25-wire-contract-version-1). The cloud workspace is `Automatic private workspace access`, branch `hard-moth`; its source pin follows the first source implementation checkpoint and is updated to the final release commit before publication.

The server job adds required `ownerEmail` and optional `managementResult: {version: 1, recipient: {ownerId, vmId, jobId, connectionId, generation}, path, cleanupTokenIds}`. The trusted host supplies recipient fields and the private result path; standalone setup needs no cloud export. The installer writes a version-1 result atomically outside the repo, file mode 0600 and directory mode 0700, echoing recipient, selected account, target repo and owner email. Its other fields are `source: {repo, commit}`, `appId`, `aud`, `teamDomain`, `anchorHostname`, `policyIds: {human, machine}`, `workers: {production: {id, name}, staging: {id, name}}`, `sessionDuration`, restricted account `tokenId`/`token`, and `cleanup: {revokedTokenIds, pendingTokenIds}`. Source identity is canonical GitHub `owner/name` from the actual checked-out origin, compared case-insensitively; the commit is the actual 40-character HEAD. No broad setup token, machine secret, memory key or human session enters this result.

The host consumes only its exact job-derived regular private file, excluding symlinks and unsafe ownership/permissions, and delivers it over TLS to `POST /api/agent/jobs/:id/access` using its own VM bearer credential. Source code never inherits that credential. The cloud compares the recipient, owner email, target, account, pinned source and connection generation to its authoritative records before encrypting the restricted token. Lost receipts retry the same private result; identical delivery is idempotent, stale/deleted/mismatched jobs cannot adopt it. The public installer still emits only its safe metadata and final status. The server contract/tests cover the source side; the linked cloud plan covers authenticated endpoint adoption and durable reconciliation.

Old management credentials are account tokens: delete only recorded IDs through `DELETE /accounts/<accountId>/tokens/<tokenId>` using transient setup authority, never the user-token endpoint or retained Access-only credential. Unavailable cleanup stays pending. Keep the Access wall during connection/VM deletion while any covered Worker, old version or alias can serve business content; app/policy removal comes only after separately authorized decommissioning verifies those surfaces unavailable. Existing unguarded previews and revoked-token replay must not become reachable during cleanup.

## Risks / Trade-offs

- **Access-only account token is still sensitive** → encryption, owner isolation, redacted errors, no list/detail endpoint returns it, limited permission groups, tracked token rotation/deletion; its account-wide scope is disclosed in the migration.
- **Wrong owner email causes lockout** → verified cloud identity and actual email-login tests, never infer from git noreply.
- **Static assets bypass the guard** → Worker-first routing for every path and tests for HTML, JS, CSS, mini-app files, API routes, and alternate hostnames.
- **Old versions remain anonymously callable** → Worker-level edge coverage includes all versions; explicitly test an old unique version URL and alias after upgrade.
- **More-specific apps weaken coverage** → check Access precedence and migrate conflicts with review; the Worker guard denies unsigned access independently.
- **First-time onboarding or unsupported API blocks setup** → retain closed bootstrap and a recoverable setup state.
- **Removal clears all workspace sessions** → disclose it in the plan; remaining emails and machine policy retain permission to authenticate again.
- **Worker-level Access does not support WebSockets** → inventory existing app protocols before migrating; an existing WebSocket app needs reviewed hostname-based coverage for every address, or remains marked pending migration. Do not report unsupported live traffic as working.

## Migration Plan

1. Prove the native Worker destinations on disposable resources before changing defaults. Prepare the linked cloud plan against its current worktree and link its artifacts here before server-to-cloud integration; independent shared provisioning proceeds after the provider probe, while its public control-plane routes stay outside the workspace policy.
2. Land the source implementation as a major release with a clear updating note and pin the cloud integration to that tested source commit. Keep new managed sign-ups behind rollout control until the downstream understands `ownerEmail`, secure result delivery, and membership synchronization.
3. Upgrade this meta-repo's own app through the same private configuration using a reachable owner identity. Protect its production and staging Workers; memory remains key-authenticated. Do not gate other business projects in this Cloudflare account.
4. For each existing managed owner, inventory real Worker IDs, existing rules, owner/team emails, public paths, and protocols; install protection and management connection, backfill the current roster, revoke old app sessions, and verify production, staging, an existing preview, and a fresh preview. Offline VMs do not block cloud-side email updates after connection adoption. Owners lacking a management connection remain explicitly pending until secure reconnection establishes it.
5. For standalone installed repos, `/wong-sync` plans a reviewed migration with the same coverage and preserves locally adapted app code and explicitly intended public surfaces; it must not silently copy an enforcing Worker over a custom app. Earlier recorded public choices inform the reviewed migration rather than permanently excluding the install from the new defaults. An existing public app remains labeled public/unmigrated until protection is actually verified; updates never claim an unprotected install is private.
6. Roll back to a previous application version while retaining Access and its current membership. A failed security rollout pauses sign-ups/upgrades; rollback never removes the wall or restores removed emails. Do not mark the full request finished until the linked cloud flow passes live add/remove tests.

## Validation

Extend fake-Cloudflare provisioning and real-signed JWT tests, including automatic protection in both installation paths, account-scoped permission selection, bootstrap ordering, idempotent interrupted installs, invalid owner emails, asset interception, configuration absence, credential leaks, and precedence conflicts. Add cloud tests for ownership isolation, exact allowlists, synthetic places, failed revocation, offline/deleted VMs, retry persistence, concurrent membership revisions, legacy joins/cancellation, and all removal paths.

Use `/save` for CI builds and tests; no local app builds. The server contract requires a real disposable-server install, first deploy, memory digest, and idempotent rerun. Live evidence covers anonymous denial, real owner email login, added teammate login, removed teammate denial with their previously valid session, machine access, valid/invalid memory keys, an old preview, and a fresh preview at default and custom hostnames where configured. Clean up only the disposable resources created for verification.


## Retained fixture native production-version check

The current default production CI path deploys but does not upload a version preview; no actual native production version URL was reported. The mandatory live boundary can use a fixture-only CI `wrangler versions upload --preview-alias fixture-production` against the built production config. For only this fixture branch when temporarily default, skip publishing to the deployed Worker and instead perform the same read-only coverage check before version upload; this keeps the existing green default production deployment unchanged. Ordinary nondefault staging CI remains unchanged. Its printed URL is evidence; no URL is synthesized from a version ID. [Cloudflare documents version upload returning the actual version URL](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/). Keep the existing signed guard, owned app/destinations/human/machine policies, production database/memory bindings and target content intact. Existing read-only coverage checking must precede upload. The parent coordinates a temporary default-branch choice only if needed for this disposable fixture's production CI path, restoring the recorded `main` before any cloud reconnect. No source payload/workflow change is required.

Task6.6 helper edits only the installed fixture's CI upload behavior and its existing fixture plan evidence. The retained installed repository is `/home/wong/private-server-munoxync` on server168049667; strict transport uses source parent's ignored `.scratch/private-server-preview-command.py` (runs as wong). If remote `rg` is missing use the available search command. Read target owning docs/rules and scripts first. Do not read/copy `.env`, private result/host journals or credentials, run local/remote app builds, mint/change tokens/policies, create servers or Workers, run source export, or perform git/CI actions; parent owns those through `/save`. Preserve the adapted Hello markers and source9795 adopted receipt. Existing source tasks5/6.2/6.4 remain external gates, not new implementation for this helper. Return the minimal fixture change plus validation and exact pending CI step.

<!-- end design.md -->
<!-- file tasks.md utf8 9263 -->
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

- [x] 5.1 Implement the linked cloud plan in its own workspace: verified owner email, source pin, secure Access-only connection delivery/storage, and existing-owner backfill; verify downstream credential isolation and installer contract tests pass before enabling managed sign-ups.
- [x] 5.2 Deliver transactional desired membership/outbox revisions and serialized scheduled reconciliation on add, legacy join, canceled invitation, shared removal, and own-Hetzner offboarding; verify retries and add/remove/add races converge correctly, with no synthetic or cross-owner grants.
- [x] 5.3 Remove email permission and revoke this workspace's app sessions, persist failures visibly, preserve owner/machine permissions, and rotate or delete management connections safely; verify failures never report completed revocation and VM downtime/deletion does not prevent provider updates.
- [x] 5.4 Complete the cloud plan's own docs, checks, review/status behavior, and `/save` preview; verify its public login/sign-up and webhooks remain reachable and link its evidence here. Downstream implementation and reviewed feature gates are delivered; coordinated final publication follows the source release pin.

## 6. Deployed integration evidence

- [x] 6.1 Run `/save` for the source CI gate and deployed preview, then verify an anonymous visitor is denied and a real allowed email renders production, staging, an existing version/alias, and a fresh branch preview on default and configured custom hostnames; include independent machine and memory checks.
- [x] 6.2 Exercise `server/setup.sh` and the installer on a disposable real server, including first CI deploy, owner email login, memory digest, and idempotent rerun; record evidence and remove only the test server/repo/Cloudflare resources created for this check.
- [x] 6.3 Verify live cloud add/remove with a real teammate who already has an active session, including owner-server downtime, pending retry, preserved owner access, and expected reauthentication of remaining teammates; record provider propagation and do not claim zero-latency revocation.
- [x] 6.4 Verify existing-owner upgrade and this source repo's own protected app, preserving unrelated Workers and explicit public services; report remaining unverified or pending migrations, and mark the complete request done only after both repositories' gates and the live membership flow pass.
- [x] 6.5 Verify a standalone `/wong-setup` installation automatically protects its pages and previews without an enable-or-public question; rerun it to confirm idempotency and test a failed protection step stays closed.

- [x] 6.6 Publish an actual native production-version preview through CI on the same retained server fixture Worker, with its existing protection and memory bindings; obtain the URL from Wrangler/CI output, verify anonymous denial, original machine and real-owner access plus independent valid/invalid memory keys, and preserve the default production deployment and customized fixture content. Do not construct a URL, create new resources, mint/change credentials or rerun source export. This is the only new implementation task: existing pending cloud/reconnect/cleanup/release gates remain parent/coordinator work. Build only the fixture CI upload, leaving source payload deploy behavior unchanged, then return the CI gate to parent `/save`.

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 1546 -->
# App scaffold delta

## REMOVED Requirements

### Requirement: The Access module ships inert

**Reason**: An unused identity verifier does not protect the starter app or assets by default.
**Migration**: Use signed assertion verification before every protected route and asset response, with explicit development-only authentication substitution and separately reviewed public exceptions.

## ADDED Requirements

### Requirement: The starter app requires verified identity

The scaffold SHALL require a verified signed Access identity scoped to this workspace before serving its HTML, static assets, APIs, or mini apps. It SHALL recognize a human by verified email and a machine by verified service-token identity. Missing configuration SHALL fail closed; missing, forged, expired, or wrong-application assertions SHALL be denied. Plain email headers SHALL NOT authorize a request. Only explicit local-development configuration SHALL substitute an identity; deployed environments SHALL reject that development bypass. Memory SHALL remain independently authenticated by its memory keys.

#### Scenario: A caller attempts direct asset access

- **WHEN** a caller requests HTML, JavaScript, CSS, a mini-app asset, or an API with no valid assertion, including a forged email header
- **THEN** no protected content is returned

#### Scenario: Valid human and machine callers

- **WHEN** a human or service-token caller presents an assertion valid for this workspace
- **THEN** the caller reaches the intended app resource under the verified identity

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 6975 -->
# Cloudflare provisioning delta

## REMOVED Requirements

### Requirement: The login wall is opt-in and adopted whole

**Reason**: Protection is now automatic for both interactive setup and cloud-managed workspaces, rather than requiring a later separate runbook.
**Migration**: Enable protection during all new installations; existing installs receive a reviewed migration that preserves explicitly intended public surfaces.

### Requirement: Access gates only this app's own hostnames

**Reason**: Worker-scoped protection replaces the obsolete custom-domain requirement and automatic public-prefix bypass.
**Migration**: Attach protection to the app's production and staging Workers, covering their default addresses and previews, with only reviewed route exceptions.

## ADDED Requirements

### Requirement: Workspaces are private from their first deployment

Provisioning SHALL protect production and staging business content with Cloudflare Access before it becomes reachable. The owner SHALL authenticate with a reachable verified email. Missing permissions, organization onboarding, unsupported protection, or incomplete configuration SHALL stop private setup without publishing public business content. An interrupted run SHALL reuse owned resources and remain recoverable.

#### Scenario: First deployment

- **WHEN** a new workspace's first deployment completes
- **THEN** an anonymous visitor cannot read its pages, static assets, mini apps, or APIs, and its owner can authenticate by email

#### Scenario: Security setup stops

- **WHEN** provisioning cannot establish the login wall
- **THEN** business content remains unavailable and the report names what is needed to continue

#### Scenario: Preview login before production content

- **WHEN** native protection and both owned exact human and machine policies are confirmed for newly created bootstrap Workers before production business content is uploaded
- **THEN** the protected unavailable production login anchor permits the native email callback, its previews remain disabled, and incomplete protection remains unavailable and recoverable

### Requirement: Protection covers every address of this workspace

The workspace's Access protection SHALL cover its production and staging Workers across default addresses, custom domains, routes, branch aliases, and unique version URLs, including addresses added later and previews created before adoption. Provisioning SHALL NOT gate unrelated Workers or create account-wide protection. More-specific conflicting policies SHALL prevent a successful coverage report until resolved.

#### Scenario: A new preview or custom domain

- **WHEN** a new version, alias, or custom domain reaches a protected workspace Worker
- **THEN** the same allowed emails control access without a manual hostname-policy update

#### Scenario: A shared Cloudflare account

- **WHEN** the account also contains unrelated Workers and a conflicting preview policy
- **THEN** unrelated Workers keep their access settings, and this workspace is not reported fully protected until its conflicting policy is resolved

### Requirement: Machine access uses explicit authentication

Provisioning SHALL supply a dedicated app-specific service-token policy for automated verification. Membership updates SHALL preserve that machine policy. The production memory route SHALL remain authenticated by its memory keys and SHALL be the only automatic route exception; other public routes require explicit reviewed configuration. Staging and CI branch previews SHALL carry no memory bindings.

#### Scenario: Automated checks and memory

- **WHEN** automated checks use the dedicated service token and a memory caller uses a valid memory key
- **THEN** each reaches its intended protected service, while an anonymous memory caller is denied

#### Scenario: Team membership changes

- **WHEN** a person is added or removed
- **THEN** machine permissions and exact memory-route authentication remain intact, and no broad public prefix becomes exempt

### Requirement: Login sessions last thirty days by default

Newly provisioned workspace Access applications and human policies SHALL issue login/session tokens valid for 30 days by default, across production, staging, and previews. Membership reconciliation SHALL retain that configured duration. The lifetime SHALL NOT defer removal or session revocation, or change service credential and API-token expiry. Expired assertions SHALL be denied and require reauthentication.

#### Scenario: A normal session expires

- **WHEN** an allowed person's default login/session token reaches 30 days after issue
- **THEN** it no longer authorizes workspace requests and the person must authenticate again

#### Scenario: Removal before thirty days

- **WHEN** a person is removed while their login/session token has not expired
- **THEN** the normal removal and revocation flow denies that session after provider propagation without waiting for the thirty-day expiry

## MODIFIED Requirements

### Requirement: The closing report says only what was checked

Before reporting success, provisioning SHALL check the actual production URL and report whether protection is configured, whether real human login is verified, and whether memory is reachable. It SHALL warn when a new address is not ready and SHALL never equate successful configuration or machine authentication with proven human access. It SHALL say memory is on only when a read through the production Worker answered.

#### Scenario: Production not live yet

- **WHEN** the memory read has not answered
- **THEN** the report says memory starts once the site first goes live

#### Scenario: A mismatch

- **WHEN** the fetched URL does not answer as its configuration implies
- **THEN** the run reports a failure naming the request, not success

#### Scenario: Configuration without human evidence

- **WHEN** the API configuration and service-token probe succeed but nobody has completed a real email login
- **THEN** the report labels human login unverified and does not call the entire security rollout complete

### Requirement: CI deploys with its own narrow token

CI SHALL deploy with a separate `<repo>-deploy` token limited to deploying Workers and databases on the chosen account, plus storage only when the app binds a bucket and Access read permission for coverage checks. It SHALL be unable to manage tokens or change Access policies. Its value MUST go straight to the GitHub secret, never to a file or the screen; a later run SHALL reuse it and roll it only when the secret is missing or the person asks.

#### Scenario: Secrets reach GitHub

- **WHEN** CI is wired
- **THEN** the GitHub secret holds the deploy token, and no GitHub secret holds the user token

#### Scenario: Protection is missing

- **WHEN** CI cannot establish that the workspace is protected
- **THEN** it refuses to publish business content or a new reachable preview, and does not try to change Access policies

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 995 -->
# Install onboarding delta

## ADDED Requirements

### Requirement: All installations enable Zero Trust automatically

Both `/wong-setup` and the unattended cloud-managed installer SHALL enable Zero Trust for the workspace's production and staging sites, assets, APIs, mini apps, and previews without asking an enable-or-public question. The owner SHALL authenticate by a reachable email. Setup SHALL preserve memory-key authentication and SHALL NOT make business content public when protection is incomplete. A deliberately public surface requires a separately reviewed exception.

#### Scenario: Interactive setup

- **WHEN** a person installs WongStack through `/wong-setup`
- **THEN** setup automatically provisions protected hosting and does not ask whether to enable protection

#### Scenario: Setup cannot finish protection

- **WHEN** either installation path cannot finish its Zero Trust setup
- **THEN** setup reports the recoverable blocker without publishing public business content

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/managed-workspace-access/spec.md utf8 5464 -->
# Managed workspace access

## Purpose

Keep each cloud-managed WongStack workspace private and synchronize its email permissions with the team's membership, even when workspace servers are unavailable.

## ADDED Requirements

### Requirement: Managed installation receives the owner's verified email

The server installation contract SHALL accept the cloud owner's verified, reachable email independently of git authorship. It SHALL allow that owner on the installed workspace and return non-secret protection metadata sufficient for app-scoped management. Missing or invalid owner identity SHALL fail private installation without publishing public content. Team emails SHALL NOT imply Cloudflare administrative membership.

#### Scenario: GitHub uses a private author address

- **WHEN** the cloud owner signs in with a reachable email but git uses a noreply address
- **THEN** workspace login uses the verified cloud email and preserves git authorship

#### Scenario: An old installation job lacks owner identity

- **WHEN** a job has no reachable verified owner email
- **THEN** private installation stops with a recoverable compatibility reason rather than guessing an identity

### Requirement: Cloud team emails determine human permissions

For a managed workspace, human access SHALL comprise its verified owner and current real-person team emails, normalized and deduplicated. A person added through the hosted control plane SHALL receive permission to authenticate to the workspace and all its previews. Removal or invitation cancellation SHALL withdraw that email while preserving the owner and remaining team. Synthetic extra-workspace identities SHALL NOT receive permissions. All managed add, legacy join, and removal paths SHALL converge on this behavior.

#### Scenario: Add and remove a teammate

- **WHEN** the owner adds a person's email and later removes that person
- **THEN** the email is first allowed and subsequently denied on production, staging, and previews, while remaining teammates retain permission

#### Scenario: Another workspace for the owner

- **WHEN** the owner adds or removes their own extra workspace
- **THEN** no synthetic email is allowed and the owner's human access is preserved

### Requirement: Removal invalidates existing workspace sessions

Removing an email SHALL invalidate existing sessions for the managed workspace's Access application in addition to changing its policy. The remaining team SHALL be able to authenticate again. Completion SHALL require both the policy change and revocation to be acknowledged; effective denial SHALL be verified against an existing session within Cloudflare's actual propagation behavior. Unrelated Access applications SHALL NOT have their policies or sessions modified.

#### Scenario: A removed person has a valid session

- **WHEN** removal completes while that person holds a previously valid workspace login
- **THEN** that login ceases to authorize workspace requests after provider propagation, and the removed email cannot establish a new authorized login

#### Scenario: Revocation fails

- **WHEN** the allowlist update succeeds but session revocation fails
- **THEN** revocation remains pending for retry and the system does not claim the person's access is fully revoked

### Requirement: Membership synchronization survives failures and races

Team changes SHALL persist desired access durably and synchronize independently of workspace VM availability. Failed provider calls SHALL retain retryable work with an observable pending or failed status. Concurrent updates and retries SHALL converge on the latest team rather than restoring a removed email from an older job. Successful updates SHALL be idempotent and isolated to the owner's recorded workspace resources.

#### Scenario: The owner server is offline

- **WHEN** membership changes while all owner servers are offline or removed
- **THEN** the control plane can still apply the access change using its managed connection

#### Scenario: An old add retries after removal

- **WHEN** a failed add retries after the same email was removed
- **THEN** the latest membership controls the result and the retry does not restore permission

### Requirement: The cloud management connection is restricted and private

Automatic membership management SHALL use a separate encrypted credential scoped to the selected account and Access policy management and application-session revocation, without deployment, database, storage, administrative membership, or API-token-management permissions. The connection SHALL bind to its owner and recorded application. Credential values SHALL NOT appear in public installer output, logs, arguments, repository files, or user-facing API responses. The broad installation token SHALL retain its existing transient control-plane handling. Invalid management credentials SHALL request secure reconnection while leaving workspace protection in place.

#### Scenario: The management connection is established

- **WHEN** installation supplies the cloud management connection through its authenticated private channel
- **THEN** the control plane stores only the restricted credential encrypted, and ordinary responses expose safe metadata alone

#### Scenario: Another owner names this application

- **WHEN** an authenticated owner attempts to manage another owner's recorded resources
- **THEN** the request is denied without making provider changes or revealing a credential

<!-- end specs/managed-workspace-access/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 1376 -->
# Wong sync delta

## ADDED Requirements

### Requirement: Existing installs receive a reviewed privacy migration

An update to private defaults SHALL plan protection for the existing production and staging Workers, their default addresses and previews, the owner, and the current team. It SHALL preserve locally adapted app code and explicitly intended public routes. Earlier recorded public choices SHALL inform the reviewed migration rather than silently excluding the install from the new defaults. It SHALL identify unavailable owner identities, management connections, conflicting Access rules, and unsupported protocols instead of silently weakening coverage. The update SHALL distinguish public or pending installs from verified private installs, and SHALL NOT mark migration complete from configuration alone.

#### Scenario: An existing public workspace

- **WHEN** an install updates from a public-default release
- **THEN** its plan includes a checked privacy migration for existing and new previews with the owner's current team, rather than only copying new guidance

#### Scenario: A locally adapted public app

- **WHEN** the installed app has custom routes or WebSocket traffic
- **THEN** the plan preserves its code, identifies necessary reviewed exceptions or compatible coverage, and leaves the migration explicitly pending until its access behavior works

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-30

~~~
<!-- end .openspec.yaml -->
<!-- file deployed-evidence.md utf8 22854 -->
# Deployed source and server evidence

## Reviewed feature checkpoint

Source feature revision `9795b516c54917afd55510b0c7fa2e761f014c1b` passed the aggregate `/save` gate on [PR 213](https://github.com/matthewwong525/WongStack/pull/213). [Build/deploy](https://github.com/matthewwong525/WongStack/actions/runs/36675391307), [app tests](https://github.com/matthewwong525/WongStack/actions/runs/36675391357), and [payload checks](https://github.com/matthewwong525/WongStack/actions/runs/36675391298) passed. First-run failures were corrected by making a shared spec generic and recording a comment-only knip change; a later existing review-note browser timeout passed on retry, with all ten browser checks independently passing locally. No check settings were weakened.

## Source addresses

A fresh dedicated email login and securely saved session (outside git, mode 0600) reached production default, staging default, staging custom, the earlier `app-design-finished` staging alias, and the new `zero-trust-defaults` staging alias. Five paths on each address (HTML, shared CSS, Hello page and JavaScript, health API) produced 75 independent requests: anonymous 302, human 200, machine 200. All app cookies had the expected app audience, dedicated test email, and a signed 720-hour lifetime. Forged identity headers and a development-bypass query were challenged. The staging memory route returned 404, while a separate memory-key read through source production answered successfully.

The new signed origin guard is deployed on current staging/default/custom and the new preview. Source production and the pre-existing alias retain the native Access wall on their earlier content until the source release deploys. These observations do not claim the new guard was uploaded to those older versions. The native wall preserves protection across that release boundary.

## Real Ubuntu server and unattended install

An isolated Ubuntu 24.04 `cx23` server in the dedicated staging project ran `server/setup.sh` from the reviewed source. All ten promised commands were present, Node was `v22.23.3`, OpenSpec was `1.13.2`, and `paseo.service` was active. The installer ran as workspace user `wong`, using a reachable dedicated cloud-fixture owner independently of git authorship. It returned `done`, and the owned private target repo's first commit passed [Test](https://github.com/matthewwong525/private-server-munoxync/actions/runs/36676504580) and [Deploy](https://github.com/matthewwong525/private-server-munoxync/actions/runs/36676504584).

The owner's fresh PIN login rendered the deployed starter; saved human cookies were 720 hours and mode 0600. An independent machine request returned 200 and anonymous access returned 302. `memory.mjs digest` succeeded; an additional read through the recorded production memory Worker returned an admin-authorized result from the empty store. The installer rerun returned `done`, with the same pushed HEAD, app, policies, Workers and management-token ID.

The version-1 management file echoed the exact source pin, target/account/owner and preallocated staging recipient. It was a workspace-user-owned regular file mode 0600 inside mode 0700; the rerun preserved it. It was retained privately until cloud established authoritative matching account/VM/job records and acknowledged authenticated delivery; the acknowledged host recovery then deleted it. No value appears in this evidence. This direct installer run proves no cloud host root-token rolling behavior; that belongs to downstream host tests.

Server, repo and Cloudflare resources remain retained for the coordinated dashboard-authority/host-reconnect checks. Task 6.2 remains pending until owned-resource cleanup completes. Live membership/removal and offline retry are verified below; actual host rolling, existing-owner cloud recovery and final release checks remain required.

## Delivered server fixture previews

The same server fixture app (`d2394c31-9120-4231-8dce-ec4181488ac1`) protects its actual production/default, staging/default, two immutable staging versions and one branch alias. These are separate from the removed ten-address prerequisite provider app and the source app above; no custom domain was created for this repository.

| Surface | Actual CI URL | Version |
| --- | --- | --- |
| Production | https://private-server-munoxync.matthewwong525.workers.dev | `20061c0a-88d3-4084-b7f6-6eb5adee3d47` |
| Staging | https://private-server-munoxync-staging.matthewwong525.workers.dev | `1ec06a0a-b72c-41d3-afdb-0d1ac271a636` |
| Old version | https://0a093e66-private-server-munoxync-staging.matthewwong525.workers.dev | `0a093e66-64e3-418d-a62b-bd41cdeb7656` |
| Fresh version | https://4d4df37c-private-server-munoxync-staging.matthewwong525.workers.dev | `4d4df37c-15e2-4a99-b285-126d815108c1` |
| Alias | https://fixture-preview-coverage-private-server-munoxync-staging.matthewwong525.workers.dev | Fresh version above |

The [first preview CI](https://github.com/matthewwong525/private-server-munoxync/actions/runs/36680037920) returned the old version and alias URLs. The [second preview CI](https://github.com/matthewwong525/private-server-munoxync/actions/runs/36680266277) returned the fresh version and updated alias URLs. Both Test and Deploy gates passed. After the alias moved, a five-path matrix on every address verified anonymous 302, independent machine 200 and saved real-owner human 200 (75 requests). The old Hello marker remained on the old immutable URL; staging/fresh/alias served the fresh marker. All five application cookies had signed 720-hour lifetimes and were saved outside git in mode 0600. This preserves the cloud fixture's original private result and sticky resources.

A second `server/setup.sh` attempt encountered the normal unattended package-upgrade lock; after the operating system finished it, the retry completed successfully. No lock was deleted or system updater killed.

## Standalone installation and preview-first login

The full standalone payload was installed into an empty dedicated target by the standalone runbook, without invoking the server installer. It recovered from induced Access app creation failure using the same bootstrap Workers; while protection was incomplete their default addresses were unavailable. The completed provisioning rerun created or updated no resources and retained machine/memory credentials. The inventory now includes the Node version file both shipped CI workflows require, with a workflow-to-payload contract test.

[Standalone PR 1](https://github.com/matthewwong525/private-standalone-munoxync/pull/1) passed the first staging gate at `279f569`. Initial check-review failures were resolved by recording the newly introduced exact starter settings; none was weakened. The already-green fixture branch was temporarily the disposable repository default for the normal production CI path at `fb48225`, then default `main` was restored. [Production Deploy](https://github.com/matthewwong525/private-standalone-munoxync/actions/runs/36680629755) and its Test gate passed. Production, staging default and actual CI alias each passed all five content paths with separate anonymous 302, machine 200 and real-owner human 200 (45 requests). Every application cookie was signed for 720 hours and saved privately. A production memory-key query returned admin-authorized data; the unkeyed query returned 401 and staging returned 404.

Preview-first human login initially failed to finish at the still-disabled production callback. The source correction records newly created bootstrap ownership, verifies the owned app and both exact policies, then enables only its protected unavailable production default once; previews stay disabled and adopted/existing publication choices are preserved. All 77 focused provision/installer tests passed, covering policy/application mismatches, interrupted uploads/activation, lost receipts and retry markers.

The live callback check reused the same disposable standalone resources. It deliberately replaced production fixture content with the standard unavailable bootstrap response and disabled its default/previews, then replayed a controlled pending ownership marker in a separate private test journal. An induced policy-read interruption preserved disabled settings and machine 404. Recovery through the source function enabled the default only after exact provider readback: anonymous 302, machine 503 with only the setup-incomplete response, and previews still disabled. A fresh dedicated owner OTP reached the existing staging alias while production still contained no business content; its new app cookies were 720 hours. The original CI-green production version `0ff51cce-2849-42b8-b77d-81a3aac7c3b3` was restored afterward, with no forced operation. This replay proves the native callback; automated first-creation ownership-marker behavior is additionally covered by the source contract tests.

The standalone fixture archive checkpoint `d099df1f65b522759d742cee8d4eebefb999249f` passed CI and its final deployed walkthrough: real-owner browser rendered the workspace, anonymous access challenged, and machine HTML/health requests returned expected bodies. The generic browser runner initially classified the intentional anonymous challenge as a block; its single retry separated that negative request probe from authenticated journeys. No protection or credential changed during the walk. The fixture PR was squash-merged at `a357b2de15626b0be604fb8123aaa0697718b0cb`; production Test36687349504 and Deploy36687349543 passed, followed by 30 anonymous/machine content requests and independent memory boundary checks. Owned cleanup removed both Workers (all versions/aliases before removing their wall), three D1 databases, the memory bucket, deploy token, Access app/policies and service token, then the dedicated GitHub repository and private standalone credential/session files. Reused organization, PIN provider, subdomain and setup user token were retained. The removed repository links above identify historical evidence, rather than live surfaces.

The real cloud server fixture remains retained beyond the two-hour staging sweep with `wongstack-env=private-check` and `wongstack-retain=access-live-gates`. Parent owns teardown after coordinated live/dashboard-authority gates. Cloud adoption of the original9795 result returned200 through authenticated private host transport; an intentionally lost first receipt retained the file, identical retry fsynced acknowledgement before unlink, and final status recovered in a separate process without source export replay or token rolling. The parent preserved the original signed720h owner session: all five actual fixture hosts denied its still-unexpired cookies with302 at07:31:37UTC. This is initial-adoption revocation evidence, distinct from teammate removal and actual broad host rolling. The cloud coordinator subsequently powered off the retained VM for the live failure/scheduled-retry gate; parent restarted it only after the completed-evidence notice recorded below.


## Delivered cloud membership, offline retry and owner recovery

Cloud PR43 passed its updated733 default-source checkpoint at `057bb960a2817ee47563b1883ac2e6189cd8d8df`: Test36686982895 and Deploy36686982876 passed after complete cloud app/VM/script/type checks. The original adopted fixture9795 receipt/job/generation and restricted token ID were preserved.

The coordinator added a real dedicated teammate through the deployed cloud route, authenticated its native email session, and verified all five fixture hosts before removal. At07:49:55UTC the retained owner server was actually shut down, then only the dedicated account token was temporarily reduced from Access Write to Read to induce a visible pending removal/revocation. Its original permission was restored at07:51:53 without changing token ID or secret. The natural08:15 scheduled sweep applied/revoked revision4, cleared the outbox and pending reason at08:15:34.332, with no manual retry or due-time change. At08:16:57 all25 old real teammate requests across the five hosts returned302; those signed720h cookies remained unexpired and matched the removed email/audience. Port22 still timed out at08:20, confirming recovery did not rely on the VM. This records observed propagation, rather than instantaneous revocation. The original owner session was separately preserved and denied after initial app revocation.

After the coordinator completed the offline gate and explicitly authorized restart, parent powered on the same server168049667 at08:20:13.322; provider readback reported running at08:20:52.248 with all retention labels unchanged. A separate new browser/profile completed a fresh dedicated owner native OTP, rendered all five actual hosts and saved new private state separately. The five-path human/anonymous matrix passed50 requests at08:22:21.855: owner200 with actual content/health bodies, anonymous302, correct owner/audience and signed720h app cookies, with no service headers. Old/fresh immutable versions retained their correct Hello markers. Original saved session snapshots were not overwritten. Independent machine/memory read-only verification passed at08:26:30 through strict known-host transport as workspace user wong, using the original uid1000/mode0600 installed credentials without copying or printing them. All25 machine content requests returned200 and25 anonymous requests302 across the same five hosts. The original production memory-key query answered with admin role and0facts; an invalid key returned401, while the valid key plus original machine headers returned404 on all four staging/version/alias memory routes. Provider readback retained app/audience/anchor and the human/machine policy IDs, with only the owner allowed, the removed email and synthetic grants absent, and the original service ID in its separate non_identity policy. No new machine token/policy, copied environment, source re-export or root-token substitution was used. Native production-version URLs were unavailable at this earlier checkpoint; the later CI publication and completed independent evidence below supersede that limitation. The removed email’s fresh OTP request produced no new inbox mail during its bounded wait; that establishes an issuance observation, not a completed code-verification denial. The coordinator completed one same-identity re-add/remove cycle: a fresh native OTP issued at08:28:34 while allowed at revision5 was privately submitted within one minute after removal and returned explicit “That account does not have access,” with no app cookie. A transient provider failure remained visibly pending until its outbox cleared; final desired/applied/revoke/revoked are6/6/6/6 with null reason and unchanged connection/token/source authority. Parent saved the fresh owner session separately before this second app-wide revocation; independent requests at08:33:07 denied all five old owner cookies302 while they remained signed720h/unexpired and matched the owner. Corrected safe provider readback confirms both actual Worker destination IDs, owner-only human permission and original non_identity service policy. No further membership mutations are planned; retained resources remain for the dashboard-authority/reconnect gates.


## Native production-version preview and memory

The retained fixture's narrowly scoped CI route builds its production configuration, runs the existing read-only Access coverage check, and uploads a version without switching production. It changes only the installed fixture workflow; the source payload and shared deploy script remain unchanged. A first documentation-only attempt at1e4bc7b passed CI but correctly skipped build/upload and produced no production preview, so it is not claimed as publication evidence. A harmless HTML comment then triggered the actual build at `304d3aa6c57cd6d59f206e59a91873c135b1f586`; [Test36693485638](https://github.com/matthewwong525/private-server-munoxync/actions/runs/36693485638) and [Deploy36693485851](https://github.com/matthewwong525/private-server-munoxync/actions/runs/36693485851) passed. The production build, upload and GitHub deployment publication ran successfully; the ordinary production switch was skipped. Default branch `main` was restored before reconnect.

Wrangler returned both actual URLs for version `2aaf0a9d-ba87-481a-9b35-4919d730b382`, published as GitHub deployment6755593736:

- https://2aaf0a9d-private-server-munoxync.matthewwong525.workers.dev
- https://fixture-production-private-server-munoxync.matthewwong525.workers.dev

Parent real-owner checks at09:09:44.268 passed20 requests across both hosts/five paths: owner200 with expected HTML/assets/health bodies, anonymous302, exact owner/audience and signed720h app cookies. The real browser rendered both uploaded pages; new private state was saved mode0600 separately from the old revoked snapshots. Independent cloud checks at09:09:53.401 used strict known-host transport as uid1000 and the unchanged mode0600 installed pair:10 original-machine200 and10 anonymous302. Both native production-version memory endpoints independently returned200/count0 with the valid installed memory key, and401 for invalid/missing keys, all without service headers. The same valid key plus original machine headers returned404 on all four staging/default/old/fresh/alias memory routes. These results do not claim an admin-role field in the native-version response. Original production/default health still returned200 for the original machine.

Parent readback at09:05:57.326 and independent cloud provider readback at09:10:42.897 confirmed the original production deployment `df2e2ebe-84b4-482e-8e90-5fa48b263894`, version `20061c0a-88d3-4084-b7f6-6eb5adee3d47`, remains at100%; the uploaded native version exists. Safe cloud evidence is retained in `/tmp/wongcloud-access-live/native-production-memory.evidence.json` and `/tmp/wongcloud-access-live/fixture-native-production-readback.evidence.json`, without credential values. No resource creation, token/policy change, source export, install or reconnect occurred during this gate. Task6.6 is complete; actual disposable-dashboard host rolling and existing-owner reconnect remain separate mandatory gates.

The final fixture evidence checkpoint `4aac9ed8f7882968bb32dcd4a2f53fcde0c07b3e` passed Test36695840442/Deploy36695840453 and was accepted by cloud. The native CI hold is released. Actual install/reconnect still requires the separately created disposable dashboard user setup credential and coordinated pin; neither primary host setup credential may substitute. Complete route/storage/provider tests cover legacy branches, and actual teammate VM offboarding preserved protection, so no extra live membership/teardown cycle is planned. Final source release pin, exact-pin full gates, cloud PR33 reconciliation and parent-owned teardown remain outstanding.


## Actual cloud host reconnect, token rolling and completed teardown

[Cloud authenticated host evidence](https://github.com/matthewwong525/wongstack-cloud/pull/43#issuecomment-5912326888) records the real deployed connect, poll, private Access-result and final-status endpoints. The disposable dashboard-created user setup token was supplied privately; neither host root setup credential substituted. Generation2 failed before export or rolling after about25seconds with generic cloudflare reason; its cause remains undiagnosed. Read-only checks passed, including all13 provisioning groups, actual GitHub secret listing, provider resources and exact installed Access policies. A mistaken escaping hypothesis was explicitly withdrawn; no speculative source fix was made. One authorized fresh generation3 job858001f2-5ace-415b-9084-8370bfb26976 executed reviewed733 once at13:24:12–13:24:41, delivered one private result, acknowledged it before unlinking, reported done/rolled=true once, and preserved original9795 and failed generation2 receipts without replay.

The old disposable setup value returned401; its replacement verified200/active with the same user family116479b118888d148d333e74f12b706e and selected account. Values stayed private. Old account Access tokenfbd5fc7dab06ec11f60b3461a81fc4d3 returned404. New token1689534a35e34f6bb4ff3fead2d2e2ac had exactly account Access Apps and Policies Write; cloud sealed it at generation3 and confirmed healthy7/7/7/7, empty outbox/reason/cleanup and done job with cleared payload. The target retained clean HEAD4aac9ed, all custom/tracked files and all non-setup environment keys, defaultmain and its open fixture PR/workflows. Original app/audience/anchor/Worker/policy IDs, owner-only720h human permission, separate original machine and default production deployment remained unchanged. Source child excluded AGENT_TOKEN.

Cloud original-machine checks passed35content200/35anonymous302 across seven actual hosts. Production keyed memory answered admin/0facts; native production versions returned valid200/count0 without service headers, invalid/missing401; four staging memory routes stayed404. Parent fresh owner reauthentication at13:40:45.340 independently passed35human200/35anonymous302 across all seven hosts/five paths, matching exact owner/audience and720h signed sessions without service headers. Old revoked snapshots were preserved through those checks. This proves recovery by a fresh successful job after the undiagnosed first failure, rather than a proven transient cause.

Parent teardown completed13:43:41.687. Both fixture Workers and every version/alias were deleted before removing the Access app/wall. All three owned D1 databases, R2 bucket, deploy and generation3 Access tokens, Access policies and original machine token were removed. The disposable user token family was deleted; both normal host setup tokens were retained. Server168049667, dedicated SSH key/firewall and the fixture GitHub repository were deleted; firewall deletion waited for the asynchronous server detach without changing other resources. Owned private credential/session/profile/SSH files and the temporary input key/declaration were removed after credential exclusion. Unrelated source, cloud and walk-inbox Worker IDs remained unchanged, as did shared organization/PIN/subdomain. Fixture links above are now historical evidence.

Cloud has no remaining live resource dependency and is retiring only dedicated staging bearer/connection/sealed credentials and auth state without membership or billing mutation. All three safe job outcomes/receipts and binding audit metadata remain, including immutable original9795. Source and cloud reviewed feature full gates and all agreed live behavior passed. Cloud task5.3 remains a coordinated publication gate for final source RELEASE SHA/exact full checks and PR33 reconciliation; no final cloud merge is claimed yet.

<!-- end deployed-evidence.md -->
<!-- file implementation-evidence.md utf8 5803 -->
# Private provisioning implementation evidence

## Source preparation

- Task 1.3 source preparation: new production unavailable Workers persist a one-time `bootstrapLoginPending` ownership marker before upload; it survives incomplete upload, policy, activation, or receipt processing. Native app/audience/destinations and both exact human/machine policies are read back before default-host activation. GET/POST/GET subdomain checks enable only that production anchor, keep its previews disabled and body unavailable, and clear the marker after confirmation. Existing/adopted and later publication choices remain untouched. The provisioning/installer suites passed all 77 tests, including failure ordering, lost receipts, provider mismatch, idempotent recovery, and adoption; changed-code lint, payload links, config, retired names, strict change validation, and context checks passed. No remote resources or app builds were performed by the helper. The parent must still establish the isolated native callback evidence before task 1.3 is ticked. The subdomain contract is documented by [Cloudflare](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/subdomain/).

- Task 1.2: live standalone setup exposed `.nvmrc` missing from the full payload inventory, although both shipped workflows require it. The canonical core list now supplies it, setup checks it beside both workflows, and the release rule covers its path. A contract check follows both shipped workflows and their local action, requiring each static Node-version, local action, and script dependency to be in the payload; installer selection/behavior remains unchanged. The focused payload/installer suite passed all 26 tests, including fresh installation and reruns; changed-test lint, strict change validation, payload links, OpenSpec config, retired names, and context checks passed (26,566 instruction words / 190,635 bytes; startup 2,188 words).

- Tasks 2.1–2.3: fake-provider tests cover account-scoped Access permission lookup, unreachable/synthetic identities, interrupted organization/PIN/bootstrap/app/credential setup, resource ownership, all-page hostname/path/preview conflicts, exact owner/team policies, independent machine policy, and production-only memory overrides. The saved source-provider observation that destination object keys reorder has a semantic-equality regression case.
- Task 2.5: installer tests cover old jobs, verified email independent of git authorship, trusted recipient/path validation, no symlinks, actual HTTPS/SSH GitHub origin and HEAD, a private atomic result, restricted account permissions, idempotent delivery-file reuse, recorded account-token cleanup, pending failures, and absence of credentials from output/arguments/commits. Authenticated cloud endpoint authorization remains the linked cloud change's verification.
- Task 2.6: generated production/staging and flattened preview config tests require Worker-first assets, the recorded app/audience/domain/Worker IDs, and no local authentication substitution. Dedicated local configuration never binds production memory or uses remote D1. Secret-push checks reject local auth variables. The reusable private probe reads only ignored primary `.env` credentials and outputs only independent anonymous/machine statuses.

These are code/configuration checks, not deployed proof of the new origin guard. Native edge coverage and real initial email login were established by the disposable [provider probe](provider-probe.md); the source's own updated production/staging/old/new previews, human removal, standalone/server installs, and linked cloud delivery remain pending the required deployed tasks in group 6. The management token's Cloudflare permission remains account-scoped, with app/owner restrictions enforced by the integration.

- Tasks 2.7/3.1–3.2: real RS256 token tests cover the exact 30-day expiry boundary, human/machine identities, forged headers, signature/audience failures, all asset/mini/API/unknown paths, and valid/invalid independent memory keys. The app's full `npm test` passed 47 tests with 100% statement/branch/function/line coverage, lint, knip, and duplicate checks.
- Task 3.3: fake-provider coverage checks reject wrong actual Worker IDs, broad/missing destinations, malformed/unreviewed policies, custom-host/preview conflicts, authentication secret overrides, and generated local configs. Shell tests cover both CI branch backends and host preview denial before any content command. The parent live CI-scope probe passed production and staging with exact account Apps/Policies Read and denied human-policy writes; its safe observation is in `source-migration.md`.
- Tasks 4.1–4.3: setup guides now require automatic protection and reachable login identity, retain linked Access headings while correcting the former hostname-only limitations, and describe local development and separate verification outcomes. Sync migration preserves local handlers/data and explicitly reviews public/protocol/precedence choices and pending managed reconnection. One Next major entry was added; VERSION was not edited. Release/link/context checks are recorded after final verification.

Final preparation checks: 702 script tests passed (712 discovered; 10 existing environment skips), zero failures. c8 statements/lines 87.60%, branches 87.69%, functions 92.46% exceeded existing floors. Script lint passed. Payload links, OpenSpec config, all 29 strict specs and this strict change, retired names, and context headroom passed. Instruction totals: 26,575 words / 190,618 bytes against 27,084 / 190,845 baseline; startup 2,188 words below 2,200 ceiling. Shellcheck is absent on this host and remains a required CI check. No app build or preview publication was run by this helper.

<!-- end implementation-evidence.md -->
<!-- file provider-probe.md utf8 8927 -->
# Worker-scoped Access provider probe

Observed on 2026-09-30 in Cloudflare account `040f88e2bf4f25fb0b91b7cb24f3d442`. Task 1.1 passed: fresh dedicated email login through the default-address anchor and all ten protected addresses succeeded without machine headers or a custom-domain requirement. The owned disposable resources have been removed.

## Owned disposable resources

- Resource prefix: `wong-private-probe-munk6fj5`.
- Production Worker name: `wong-private-probe-munk6fj5-prod`; real Worker ID from `GET /workers/workers/<name>`: `e3b547bbd79e4b8483bb17b43cee48a3`.
- Staging Worker name: `wong-private-probe-munk6fj5-staging`; real Worker ID: `1a24e990814f41f68d3007f56b23c0b0`.
- Access app: `f46f5a2b-0c59-4323-8923-de7d1c663af8`.
- Human allow policy: `6daf42a1-98ae-4aa9-9c95-fbd0260fc750`; exact email `matthewwong525@gmail.com`.
- Separate machine `non_identity` policy: `48a19b80-0977-4889-9de2-c359771dcbbf`; disposable 24-hour service token `d39cad01-31b2-42f5-b75c-ee4e54d27d18`.
- Custom domain IDs: `b8314f76f9324020b885274f8588bc480c7e8b8f` (production) and `0bb5b1f6fa60e37dd421c5fc3ae79f5fd812cda3` (staging).

The existing organization `startuptemplate.cloudflareaccess.com` and its existing one-time-PIN provider were reused. No unrelated Workers, domains, policies, identity providers, or organization settings were modified. The shared user token received the four documented account-scoped Access provisioning groups while retaining its existing policy resources; token verification and organization/provider reads then passed. First-time organization creation was not tested by this already-onboarded account.

## API contract observed

`POST /accounts/<account>/access/apps` accepted one self-hosted app with two destinations, each `{"type":"worker","worker_id":"<actual Worker ID>"}`. Production alone carried `overrides: [{"behavior":"public","path_pattern":"/_memory/*"}]`. No account-wide or wildcard-hostname destination was created.

The app and exact-email human policy accepted `session_duration: "720h"`; a subsequent application GET retained that duration, both destinations, the override, and both policies. This confirms returned configuration, not JWT lifetime or early revocation. The machine policy used `decision: "non_identity"`, Cloudflare's actual API spelling for service authentication.

Workers were first deployed with a disposable unavailable 503 response. The old versions were uploaded before attaching Access; fresh content and aliases were uploaded afterward. Probe content contained no app assets or business data. Custom hostnames were attached after protection; their initial DNS/certificate propagation failure cleared before the checks below.

## Edge results

| Destination | Anonymous request | Dedicated machine request |
| --- | --- | --- |
| Production default `workers.dev` | 302 to the existing Access organization | 200, `Disposable Access probe fresh` |
| Staging default `workers.dev` | 302 | 200, fresh marker |
| Production old version `cd8a3dfb-963e-4cf9-9650-dcd33d567820` | 302 | 200, old marker |
| Staging old version `912fe195-9613-43ba-81ea-214d223c9c07` | 302 | 200, old marker |
| Production fresh version `43607bd4-2449-4f27-bf95-dc1286acc68d` | 302 | 200, fresh marker |
| Staging fresh version `a61633dc-b7cf-4997-9ff0-f3abf4b7709b` | 302 | 200, fresh marker |
| Production and staging `branch-probe` aliases | 302 | 200, branch marker |
| Production and staging custom `wongstack.com` hostnames | 302 | 200, fresh marker |

Default URLs are `https://<Worker name>.matthewwong525.workers.dev`; version URLs prepend the first eight characters of the version ID and `-`; alias URLs prepend `branch-probe-`. Custom URLs are `https://<Worker name>.wongstack.com`.

Production `/_memory/read` and `/_memory/read/deep` reached the probe's independent test-key check without an Access identity: absent test key returned 401, valid disposable test key returned 200. `/_memory` and `/_memoryx/read` returned the Access 302 challenge even with that test key. This probes only the provider's narrow override; the real memory implementation and its keys still need their own tests.

## Email login and the default-address anchor

The parent completed real one-time-PIN login through the dedicated cloud walk inbox and observed all ten default/custom/old/fresh/alias hosts render their expected probe markers in the browser without service headers. The application cookies matched the original app audience and exact test email, and `exp - iat` was 720h. The separate staging diagnostic app's cookie used its own audience and also lasted 720h. Browser session state was saved separately at `/root/.wong-stack/access-tests/private-by-default-human-session.json` with mode 0600; safe host results were read from `/tmp/private-access-human-results.json`.

For the approved automated email-login test, the disposable human policy was changed to the exact dedicated test address `walk+private44653bbbf55e6c4e@wongstack.com`. Application and policy GETs confirmed that address, the existing one-time-PIN identity provider, and the 720h duration. With only Worker destinations, the parent observed no delivered Access OTP after fresh challenges/resends, while a cloud staging sign-in message to the same address arrived immediately. The exact-hostname diagnostic app then delivered its Access OTP and completed login; that organization session also reached all native Worker addresses. This isolates a native-only initial-login problem without mistaking machine responses for human success. [Cloudflare's OTP guidance](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/) states the code-sent message is also shown when policy blocks delivery; [troubleshooting](https://developers.cloudflare.com/cloudflare-one/access-controls/troubleshooting/) also names delivery suppression.

Two scoped diagnostics were added without widening that exact test identity:

- A separate hostname-based app `3ff0a6da-ccc5-4fd9-84d4-653029dcc73b`, named `wong-private-probe-munk6fj5-hostname-diagnostic`, protected only the disposable staging custom hostname, with the same exact-email and separate machine policies. Its OTP/login succeeded. It has now been deleted, restoring native protection for that hostname.
- Adding the production custom hostname as the original app's legacy `domain` while supplying only its two Worker destinations failed with HTTP 400, code `12130`, `domain not included in destinations`. Adding the matching exact `public` destination as well succeeded and retained both Worker IDs, the memory override, policies, and 720h.
- The original app was changed to use its production default `workers.dev` address as `domain`, retaining both actual Worker destinations and adding only that matching exact public destination with a mirrored `/_memory/*` override. The custom public destination was removed. An independent fresh browser profile completed its initial email OTP directly on that default address; all ten protected hosts then rendered their expected markers. The staging custom hostname now used the original app audience, after the diagnostic app's removal. Anonymous/service/key boundary checks still passed with this shape.

A separate native-only `identity-probe` alias confirmed the incoming `Cf-Access-Jwt-Assertion` header is present for the machine caller, its audience matches this application, and its claims contain a service `common_name` rather than a human email. The fresh human profile reached that same alias and confirmed a signed assertion, matching application audience, human email present, service name absent, and `iat: 1790741160`, `exp: 1793333160` (720h). No raw token was returned or logged. `ctx.access` was absent for both callers in this probe, so the existing signed-JWT verifier does not need to depend on that context.

Dedicated probe service credentials and safe resource metadata were saved outside git under `/root/.wong-stack/access-tests/private-by-default.json` (directory 0700, file 0600). Existing primary-worktree credentials were not changed. Fresh browser state was saved separately under `/root/.wong-stack/access-tests/private-by-default-human-fresh-session.json` with mode 0600. Probe cleanup has invalidated these disposable credentials and sessions; the saved service record explicitly marks resources deleted, so future verification must provision dedicated credentials for its own workspace.

Cleanup removed only the two custom domain IDs, two disposable Workers, original disposable Access app, and disposable service token listed above; the extra diagnostic app had already been removed. Subsequent account-level Worker/domain/Access-app/service-token list checks returned no resources with this probe prefix. Existing organization settings and unrelated resources remain unchanged. Credential values are intentionally absent from this file.

<!-- end provider-probe.md -->
<!-- file restricted-authority.md utf8 3487 -->
# Source management-token authority evidence

Verified against the live Cloudflare account on 2026-09-30 using the source's actual `writeManagementResult` function in `server/access-result.mjs`. The private version-1 result supplied the disposable credential to the probe; no credential value appeared in output or this evidence.

The provisioning credential independently read the minted account token's metadata. It contained exactly one allow policy, exactly the selected account resource, and exactly `Access: Apps and Policies Write` (account scope, group `1e13c5124ca64b72b1969a67e8829049`). No Worker, token-management, member, D1, or R2 permission group was present.

| Live operation with the restricted credential | Result |
| --- | --- |
| Read the owned Access application | 200, success |
| Update the owned human policy with its unchanged reviewed content | 200, success |
| List account API tokens | 403, denied |
| List user API tokens | 403, denied |
| Download the existing Worker script | 403, denied |
| Read existing Worker content via the documented `/content/v2` endpoint | 403, denied |
| Publish an unavailable Worker under a fresh disposable fixture name | 403, denied; no Worker created |
| List D1 databases | 401, denied |
| List R2 buckets | 403, denied |
| List account members | 403, denied |
| List Worker metadata | 200, success: observed residual read authority |

The metadata-list result matters: do not claim every Worker API is forbidden. The credential could list Worker metadata despite its single Access permission group. Worker content and publication remained denied. The cloud provider client must continue excluding all Worker APIs rather than treating provider permission names as a complete description of reachable endpoints. Account-wide Access authority remains the primary disclosed residual privilege.

The first probe stopped when Worker metadata unexpectedly succeeded. A second used an incorrect Worker-content route and received 405, which was not accepted as authority evidence. The final probe used Cloudflare's documented [content endpoint](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/content/methods/get/) and passed all listed operation expectations, explicitly preserving the observed metadata exception. Each run revoked its disposable account token and removed the private result. No source wall or policy was removed, no source session was revoked, and no content was deployed.

## Source fixture evidence

`scripts/tests/server-install.test.mjs` includes:

- “management handoff is private, restricted, bound to the actual source, and idempotent”: asserts the exact single Access-only account policy, actual checked-out source, recipient, private-file modes, one management token on rerun, and exclusion of broad setup/memory/machine secrets from the result, logs, arguments and commit.
- “unsafe or mismatched management recipients and paths fail before provisioning”: rejects malformed or unauthorized recipient/path, symlinks and mismatched result reuse.
- “management reconnect cleans up recorded account tokens and persists failed cleanup for retry”: uses account-token deletion, retains pending cleanup on failure, preserves the login wall, and never deletes another resource family.

The source helper reported all 23 installer tests passed. This is local fixture evidence; the source commit's CI gate and real server/cloud delivery tests remain pending.

<!-- end restricted-authority.md -->
<!-- file review.html utf8 57783 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-30-private-by-default</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-30-private-by-default">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-30-private-by-default</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">WongStack sites and previews are public today, and adding or removing someone in wongstack-cloud does not update who can open the team’s site. Every new workspace should start private, whether installed through wong-setup or wongstack-cloud, with the same team controlling access everywhere.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>BREAKING: Every new workspace starts private.</b> Both wong-setup and wongstack-cloud automatically enable Zero Trust, with no enable-or-public question. The owner signs in by email, and the site's default address, custom domains, staging site, mini apps, and every preview require an allowed email. Protection follows the site when an address changes.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">Setup or cloud install</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">        │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">        ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">Default address ──┐</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">Custom domains ──┼──▶ Sign in ──▶ Workspace</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">Staging ─────────┤       ▲</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">All previews ────┘       │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">                 Owner and team emails</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Login sessions last 30 days by default.</b> People sign in again when their session expires. Removing someone still revokes access before those 30 days are up.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">Sign in ──▶ Session lasts 30 days ──▶ Sign in</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">                     │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">               Removed earlier?</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">                     ▼</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">               Access revoked</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Adding and removing emails also changes site access.</b> Adding a person through wongstack-cloud allows that email; removing them removes permission and clears the workspace's existing login sessions, so the remaining team signs in again. Failed updates stay pending and retry; the cloud service keeps a restricted, encrypted key so this works even when the owner's server is offline.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">Add email ──────▶ Allow on site and previews</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">Remove email ──▶ Deny and end login sessions</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">                        │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">                  Failed update?</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">                        ▼</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">                Keep pending and retry</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Automated work keeps working.</b> Saved memory remains protected by its own keys, and checks use a dedicated machine login. An incomplete security setup blocks access rather than publishing a public workspace.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">Person ──▶ Email login ──────────▶ Site</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">Checks ──▶ Dedicated key ────────▶ Site</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">Memory ──▶ Existing memory key ──▶ Memory</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Existing workspaces get a checked upgrade.</b> Carry over the owner and current team, protect their existing addresses and previews, and verify a real email login before calling the upgrade finished. Public sites and webhook routes need explicitly chosen exceptions; the public wongstack-cloud sign-up service stays reachable.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">Existing workspace</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">        │</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">        ▼</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">Keep owner and team ──▶ Protect all addresses</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">                                │</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">                                ▼</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">                       Check an email login</span></pre></div></details></li>
</ol>
<p class="aside"><b>Non-goals:</b> WARP enrollment, device posture or network controls; inviting teammates into Cloudflare's administrative account; protecting unrelated Workers in a shared account; putting the public wongstack-cloud product website behind the customer workspace wall.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: use Worker-scoped Access destinations for production and staging, because Cloudflare's August 2026 documentation now includes all associated addresses and previews; the repo's August custom-domain-only guidance predates that support.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: use exact owner and teammate emails with one-time PIN available, because the user asked to manage access by email and this needs no external identity provider.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: protect the customer's whole workspace, while preserving the public cloud sign-up service and only explicitly reviewed public routes, because customers must still be able to sign up and machines must still authenticate.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: carry this into existing managed installs as well as new ones, because the request includes removals and protection of everything, rather than only future sign-ups.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: the cloud control plane retains an encrypted, account-scoped Access-only management token, because membership removal must not depend on an owner's server being online; the broad installation token keeps its existing transient delivery and host-only storage.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: revoke sessions for this workspace's Access application on removal, because the policy-management permission already supports it and it avoids changing sessions on unrelated applications; the remaining team must sign in again.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: plan the shared source contract here and implement the cloud integration in a linked downstream change, because these two repositories own different parts of one outcome and neither half alone fulfills the request.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked whether interactive wong-setup should ask if the person wants to enable Zero Trust → chose to add that choice, with Enable recommended and the answer remembered. This supersedes mandatory private access for standalone setup.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: unattended wongstack-cloud installation stays private by default, because the follow-up names wong-setup and does not retract the original cloud-managed default or email synchronization request.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked whether wong-setup should also enable protection automatically → chose automatic Zero Trust for wong-setup as well as wongstack-cloud, superseding the preceding setup opt-in choice.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked which token should last 30 days by default → chose the login/session token; people authenticate again after expiry and removal still revokes access. Automation credentials and Cloudflare API-token lifetimes are separate.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked to use wongstack-cloud emails rather than require the person during testing → use unique <code>walk+&lt;random&gt;@wongstack.com</code> addresses and the existing dedicated walk inbox for real email login and teammate revocation tests. These disposable test identities do not grant access to real customer workspaces.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked to save a testing token or equivalent → persist dedicated service credentials and test browser sessions securely outside git, and make the verification path reuse the workspace's declared machine credentials. A machine test remains separate from the email-login and removed-session tests; never add a deployed auth bypass or give CI policy-write access.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Observed in the live disposable <a href="provider-probe.md">provider probe</a>: two Worker destinations protect all tested addresses but a Worker-only app did not deliver its initial email PIN. Keep both Worker destinations and add the production default <code>workers.dev</code> address as the same application's exact public destination and legacy domain, mirroring the narrow memory override. A fresh dedicated email login then worked without any custom-domain requirement; native human and machine requests carry the signed assertion needed by the existing verifier.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: independent shared provisioning can proceed after the successful provider probe while the linked cloud plan finishes. Agreement on the complete cloud plan remains mandatory before the private installer handoff and downstream integration; all original verification tasks remain required.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Confirmed from the provider permission model: the retained Access-only management token cannot delete API tokens. Use a fresh transient setup credential for rotation cleanup when available; otherwise retain an explicit pending credential-cleanup outcome and never claim local deletion revoked it.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Agreed the linked <code>sync-workspace-access</code> cloud plan and version-1 private result-file/VM-authenticated delivery contract. Results echo the authoritative target/owner and actual canonical source identity; cleanup uses account-token endpoints and retains the Access wall until all owned content surfaces are decommissioned. The CI-gated source pin and final release pin remain delivery steps.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Clarified task 2.6 as configuration and credential preparation checked with fixtures; deployed production/staging verification stays mandatory in task 6.1. This lets enforcement and deployment checks be implemented before the first source checkpoint, without publishing an incomplete guard or dropping live evidence.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Reviewed and expanded this source repo's older, owned staging runbook wall in place before content deployment, preserving its audience and existing human/machine policies. Default production/staging and the custom staging address now challenge anonymous requests; keyed memory still works. The live readback exposed reordered provider JSON keys, requiring semantic comparison. Full deployment and browser verification remain pending; see <a href="source-migration.md">source-migration.md</a>.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Clarified task 2.7 as session-default implementation and signed-expiration tests before deployment. Live early removal of an unexpired human session stays mandatory in task 6.3 with the cloud membership flow. Existing reviewed shorter human policies remain separate from the app duration returned by the version-1 contract.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Source checkpoint: tasks 1.1, 2.1–2.7, 3.1–3.3 and 4.1–4.3 are implemented and checked; app tests (47 at 100% coverage), script tests (702 passing, 10 existing environment skips), lint, payload links, strict specs and context limits passed. The in-place source wall and real dedicated email session work before the new guard deploy. Cloud membership/provider/status/transport work, the exact CI-gated feature pin, real server and standalone installs, deployed origin enforcement, and existing-session removal remain required before archive or release. See <a href="implementation-evidence.md">implementation-evidence.md</a>.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-30</p>Check: <code>app/knip.jsonc</code> changes only the entry comment to reflect the now-enforced signed-identity verifier; no entries, exclusions, limits, or checks changed. The settings-change detector also flags comments, so this records the unchanged gate rather than weakening it.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>The reviewed feature checkpoint and five-address human/machine/anonymous matrix passed, including current staging origin enforcement, 720-hour human cookies and keyed production memory. A real Ubuntu server install and unchanged rerun also passed; its private fixture stays intact for authenticated cloud adoption and live removal, so cleanup and task 6.2 remain pending. See <a href="deployed-evidence.md">deployed-evidence.md</a>. The final released source revision must replace the reviewed feature pin before downstream merge.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Clarified the memory-isolation wording as staging and CI branch previews: native production version URLs execute the production version and inherit its bindings. Production memory remains independently key-authenticated on its narrow route; all business content remains covered by the Worker wall. This records the actual provider boundary without claiming old production versions lose their memory bindings.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Standalone live verification found <code>.nvmrc</code> missing from the canonical payload inventory even though both shipped CI workflows require it. Add it to the full payload and a workflow-to-inventory contract check; the disposable fixture has the exact reviewed source file. Existing installer separately copied it. New files in the initial fixture legitimately trigger settings review; record initialization reasons without weakening checks.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Live standalone preview OTP authenticated a 720h organization session but could not set an app cookie because the newly created production anchor remained workers.dev-disabled. The same preview completed after CI enabled production. Enable only an owned new production bootstrap anchor after all native human/machine policies are confirmed; retain its unavailable body and disabled previews. Existing Worker publication choices remain preserved. This is necessary for preview-first setup without publishing business content early.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>The corrected bootstrap callback passed a controlled live replay on the existing standalone fixture, with no new resources: production contained only unavailable content, interrupted owned-policy read left it disabled, recovery enabled its protected default but kept previews disabled, and fresh OTP reached the real staging alias with signed 720h app cookies. Production was restored to its already CI-green immutable version. The same fixture separately passed production/staging/preview human, machine, anonymous and memory-key checks; cleanup is retained in this source task handoff until the fixture checkpoint/merge finishes.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Standalone final walkthrough and production merge checks passed, then all recorded standalone test resources/repository and private credential files were removed with Workers decommissioned before their Access wall. Cloud original9795 authenticated receipt/restart recovery passed without export replay; all five saved still-unexpired720h owner cookies were denied after initial adoption. Preserve the separate server fixture and leave its VM off during the coordinator’s pending scheduled-retry gate. Source/cloud final publication and the disposable dashboard-authority host rolling gate remain required.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>The completed natural offline removal, explicit rejection of a still-valid pre-removal native OTP, owner reauthentication and preserved original machine/memory satisfy the live membership task. Keep the fixture for remaining reconnect/dashboard-authority gates. Add a fixture-only CI production-version upload for the requested actual native production preview/memory boundary; the ordinary production deploy reports no version preview, and source payload behavior stays unchanged.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Native production-version task6.6 completed on the same retained fixture: actual CI-reported immutable/alias URLs, owner/machine/anonymous content, independent keyed-memory boundaries and unchanged production deployment all passed. No source payload change or source export/reconnect; retain fixture for mandatory disposable-dashboard host rolling and existing-owner reconnect before cleanup/final release.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Cloud accepted the final native gate and fixture evidence checkpoint4aac9ed with green Test36695840442/Deploy36695840453. Remaining coordinated cloud task5.3 is actual disposable-dashboard host rolling/existing-owner reconnect preserving custom code and sticky protection, then final source release pin, exact-pin checks, PR33 reconciliation and parent cleanup. Route/storage/provider tests already cover legacy branches, and actual teammate VM offboarding preserved the wall; no additional live membership or teardown cycle is required. Original acknowledged9795 authority and source733 feature pin remain unchanged.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>At the user’s request, independently retried creating a disposable user-token copy with the primary token’s exact policies and required API Tokens Write/Account API Tokens Write/Account Settings Read groups. After correcting only the expiry serialization format, Cloudflare returned HTTP400/error1001: “sub-token is not allowed to have permissions to manage other tokens.” No child was created and the parent token was unchanged. This confirms the dashboard-created disposable setup credential remains required for actual host rolling; no root-token substitution.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Personal Cloudflare bot detection prevented the remote browser login. User created the dedicated disposable user token on their own device from the prefilled form, then delivered it through a browserless private key link. Completion971fcb05549158bf1fbf5495cb7c2988 handled once; required groups and selected-account access independently verified. Separate mode0600 credential file is ready for the new actual host job at reviewed source733; both primary host setup values remain unchanged, original9795 receipt is never replayed, and parent owns disposable-family cleanup. The temporary distinct input declaration must be removed with fixture cleanup rather than shipped as a new runtime requirement.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>The deployed authenticated cloud connect route accepted the supplied disposable dashboard credential at12:45:04 for new job5325cf65-269c-493f-82cd-30a14b8b9879, same connectionb59b94bc-3215-44a7-a2f4-b27444675823/generation2 and exact reviewed source733. The original9795 acknowledged job stays done/immutable; old Access tokenfbd5fc7dab06ec11f60b3461a81fc4d3 is the new job’s owned cleanup target. Coordinator verified retained server168049667, clean fixture4aac9ed/custom branch, both workflows, defaultmain/main5a28b927 and open fixture PR1 before starting the CI-reviewed actual host agent. Parent keeps owner browser idle and cleanup held until completion; no membership mutation or host-root substitution.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>First actual generation2 host tick ran exact source733 at12:48:56 and failed at12:49:21 with generic cloudflare reason before private export/rolling; final failed status was acknowledged, original9795 journal stayed done/acknowledged. Read-only diagnostics confirm disposable token active with all13 widened groups, exact cached source733, intact app/Worker/policy ownership, clean custom target, GitHub secret-list exit0 and pinned names GET checks200. A suggested secret-row escaping defect was withdrawn after actual expression evaluation passed; no speculative source change. Cause remains undiagnosed; preserve fixture and do not replay generation2 or weaken output filtering.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Actual authenticated host generation3 reconnect at reviewed733 completed one source execution, one private delivery and one final report with rolled=true. The original setup value is denied and its replacement retains the same disposable family; old Access authority was deleted, new Access-only authority adopted, custom files/non-setup keys/sticky wall/original machine preserved. The failed generation2 remains failed, cause undiagnosed, never replayed; original9795 remains immutable. Independent fresh owner70requests across seven hosts passed35human200/35anonymous302 with720h sessions. All implementation/live tasks now pass against both reviewed feature gates. Parent cleanup decommissioned all owned fixture content before its wall, resources/server/repo/private credentials and disposable family; unrelated source/cloud services remain. Cloud retains safe audit receipts and retires only dedicated staging authority. Final source archive/CI/walk/merge produces the RELEASE SHA for coordinated cloud exact-pin CI/PR33 reconciliation/publication, which remains a publication gate rather than unfinished implementation.</li>
<li class="decision card" id="decision-37" data-note="decision-37" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Archive checkpoint:26/26 tasks complete, strict validation passed and all capability deltas already match main specs. Source release is numbered from the current green default branch; final archive checkpoint is gated by full CI and a deployed walkthrough before merge. Downstream receives the actual merged RELEASE SHA and must pass its exact-pin full gate before coordinated publication. No credentials/check thresholds were weakened.</li>
<li class="decision card" id="decision-38" data-note="decision-38" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Final release union preserves newer default-branch releases27.9.0 and27.10.0 (improve outcome workflow and usable browser handovers), including their payload manifest wording and this change's CI Node inventory. Default-branch CI is green; conflicts were resolved as the union of intent. Release numbered28.0.0 from27.10.0.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
<!-- file source-migration.md utf8 4341 -->
# Source workspace migration evidence

## Reviewed ownership

The live account inventory on 2026-09-30 identified this repo's existing test application, `WongStack staging (Access runbook verification)`, ID `10a98858-5fe3-4650-a57f-a02786a1e851`. Memory fact 21 records its creation for the source's Access runbook verification on 2026-08-02. Its only destination was `wongstack-staging.ithinkwong.com`; its app-local policies allowed the two maintainers and the dedicated verification service token. No other source-host overlap was found.

## Protection migrated before content deployment

Expanded that application in place, keeping its ID, audience, both allowed human emails, and machine policy. Renamed it to the shared provisioner's owned application name, attached the actual `wongstack` and `wongstack-staging` Worker IDs, and added the production default-address login anchor. Production's Worker and anchor have only the `/_memory/*` public override; staging has none. The application's and human policy's new default are both `720h`. The reviewed old `24h` was the runbook fixture's previous default, rather than a requested custom override.

Provider readback confirmed the unchanged audience and complete new destinations. The private shared Git provisioning state records these owned identifiers for the provisioner's next run. No application, Worker, domain, policy, or service token was deleted. No app content was uploaded by this migration.

Cloudflare reordered destination and override object keys in its response. This exposed a false failure in stringified-object comparison; semantic comparison is required, while retaining complete destination validation.

## Initial checks

Anonymous requests to the production default address, staging default address, and existing staging custom domain each returned `302` to the existing Zero Trust organization. Production `/_memory/read` without a key returned `401`; the bare `/_memory` and lookalike `/_memoryx/read` remained behind Access (`302`). A real memory digest succeeded through the existing production memory Worker and admin key after migration.

The shared provisioner's live rerun created a dedicated verification service token and saved its pair in the ignored primary and branch `.env` files, each mode 0600. Machine requests to all three addresses returned `200`. The selected account's new `wongstack-deploy` token went directly to GitHub's sealed secret store. A later idempotent rerun added only the account-scoped `Access: Apps and Policies Read` group to that CI token without rolling its value or rewriting the GitHub secret.

A fresh browser profile, without service headers, completed email PIN login using the dedicated `wongstack-cloud` walk inbox. Production, staging, and the staging custom domain rendered. Their signed app cookies each have `exp - iat = 720h`, the expected workspace audience, and the test email. The session is saved outside git with mode 0600; the browser's initial state-save command timed out although it wrote the file, and a completed retry plus private-file inspection verified the save. The organization cookie has a different audience, as expected.

These checks are preparation, not completion of tasks 6.1 or 6.4. Actual guarded app deployment, existing/fresh previews, and coordinated cloud membership verification remain pending. The dedicated test email is temporary and must be removed after those checks, preserving both maintainers.

## Live deployment-check scope

A temporary token with the exact current CI token's policies passed `checkPrivateAccess` for both production and staging. Its groups were `Workers Scripts Write`, `D1 Write`, `Workers R2 Storage Write`, `Account Settings Read`, and account-scoped `Access: Apps and Policies Read`. The check read actual Worker IDs, secret names, default subdomain, application/destinations and policies, and application precedence; it published nothing. Neither organization nor identity-provider API permission was needed.

An unchanged-content Access human-policy write using that CI credential returned `403`, proving the new read scope did not authorize policy writes. The temporary token was revoked afterward. Source-owned identifiers, machine credentials, team permissions, and app/policy session durations remained unchanged on the provisioner's rerun.

<!-- end source-migration.md -->
