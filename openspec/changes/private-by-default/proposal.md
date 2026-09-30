# Private sites and previews by default

**Status:** in-progress
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
