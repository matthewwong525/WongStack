# Employee access

Access lets the verified employer choose which business apps each person can use. Employees sign in to the existing business app and copy its assistant setup prompt; repository access and memory keep their own authority.

## Verify the existing installation

The trusted operator checks the production origin, Cloudflare account, Worker identifier, Access application and managed human policy against provider readback. Preserve unrelated policies and machine access. Open sites and managed starters keep their existing setup path.

The finite `GET /api/access/identity` endpoint returns the current signed person's nonsecret email, subject, issuer, audience and routing identifiers after the Worker verifies the assertion. Compare this with the independently confirmed employer. A person's own identity readback gives no right to nominate an employer. The [private owner consumer](../../scripts/employee-owner-setup.mjs) reads it through that person's existing company login; nobody needs to paste a JWT.

## Configure the private owner record

Prepare `WONG_ACCESS_ACTIVATION` privately, after the independent checks:

| Field | Verified value |
|---|---|
| `version` | `1` |
| `installationId` | A new UUID retained for this installation |
| `origin` | Exact production HTTPS origin, without a path or trailing slash |
| `accountId`, `workerId` | Cloudflare account and production Worker's opaque identifier |
| `accessAppId`, `accessPolicyId` | Existing application and managed human policy UUIDs |
| `issuer`, `audience` | Verified Access issuer and this app's audience |
| `ownerSubject`, `ownerEmail` | Independently confirmed employer's signed app identity |

Repository IDs, names and provider readiness are unnecessary. Old repository fields may remain inert in private records/database rows; setup preserves them. Store the record using the [private runtime-secret procedure](staging-bindings.md#env-and-devvars-are-not-interchangeable), outside tracked files and ordinary mini-app bindings. Staging must omit the binding entirely.

`POST /api/access/activate` requires the independently pinned employer's current signed human session, exact production routing and matching `Origin` header. It accepts no owner/target choice from its body. Service identities, first visits, public markers, git email and foreign sessions establish no owner authority. Missing private configuration reports unavailable; takeover attempts are denied.

Activation and audit commit together, with primary readback. Repeated setup preserves the pinned employer/installation and customer data. A different owner or target requires a reviewed migration. Activation alone assigns no person or app and establishes no employee readiness. Additive migrations retain deprecated repository tables/columns without using them for authority.

## Enable current app checks

`WONG_ACCESS_POLICY` belongs in committed production Worker `vars`, not runtime secrets. Leave it absent before activation; once enabled, preserve it through sync and rollback. Removing it restores legacy routing and is not a safe rollback.

Privately review `WONG_ACCESS_ROLLOUT`: `version: 1`, the exact built `apps` catalogue, `mainRoutes` entries (`route`, `access`) and explicit `people` (`email`, `apps`). The core compares routes and current grants before enabling database enforcement. There is no editing field. Access itself remains self-service; its administration requires the employer regardless of app assignments.

With the latch absent, existing routing works without policy database reads. With `on`, each business call reads the current installation/membership/grants from one primary snapshot. Unknown mappings, unavailable authority and removed people deny business work. Zero-app employees retain only own setup/status. New people and new apps get no business grants automatically. App lists, direct app visits, described and bare APIs, discovery and conditional responses use the same current permissions; stricter action/record checks still apply. A committed deselection denies the next request during the same valid session; already admitted work may finish.

## Private operator sequence

Connect using the employer's own company login:

```bash
node scripts/employee-bootstrap.mjs login --origin https://business.example.com
node scripts/employee-owner-setup.mjs identity
node scripts/employee-owner-setup.mjs activate
node scripts/employee-owner-setup.mjs prepare
node scripts/employee-owner-setup.mjs connect
```

The identity-only connection lets a pinned employer finish closed rollout without claiming employee API readiness. Configure the private activation/rollout records before their respective operations. `prepare` registers the reviewed catalogue. Save explicit exact-email/app choices through Access; preserve the existing human login policy while preparing. Enable the production latch only with reviewed grants/routes, then run `employee-owner-setup.mjs rollout` and `retry`. Keep session state private outside checkouts. Existing memory credentials/targets remain untouched.

## Connect login management

Privately generate a random 32-byte base64url `WONG_ACCESS_SEAL_KEY`. Configure `WONG_ACCESS_LOGIN_MANAGEMENT` with `version: 1`, a separate Access-only `token`, pinned `accountId`, `appId`, `policyId`, current `policyName`, independently reviewed `initialEmails`, `permission: "Access: Apps and Policies Write"`, and `scope: "selected-account"`. Verify the credential's permissions and account scope independently; token verification alone cannot disclose that grant. Never reuse deployment/provisioning authority.

Cloudflare grants this permission across the selected account. The finite core constrains calls to the recorded application/human policy. It rejects shared or unreviewed policies, preserves machine access and existing approval/requirement/exclusion/isolation controls, and seals the material. Connection alone admits no employee before reviewed enforcement. Mini-app handlers receive none of these bindings.

The employer's `retry` operation reconciles policy and application sessions independently with durable generations and a bounded installation lease. Stale work converges to the desired current roster. An unknown older policy write stays visible and prevents calling later removal complete even if the newest readback matches: a timeout does not prove cancellation. Controlled operator/provider evidence must resolve that uncertainty. No scheduler is introduced.

Full removal immediately blocks new app/API/self-service requests. Policy removal and application-wide session revocation remain separate retryable outcomes. Session acceptance reports propagation unverified until independently observed, and remaining people may need to sign in again. Removing app access does not revoke manually granted repository access, downloaded copies or independent memory.

## Keep production authority out of previews

Before any secret push, create an ignored `app/.dev.vars.staging` containing only staging business keys. **Omit** `WONG_ACCESS_ACTIVATION`, `WONG_ACCESS_SEAL_KEY`, `WONG_ACCESS_LOGIN_MANAGEMENT` and `WONG_ACCESS_ROLLOUT` entirely, including blank declarations. Omit them from staging config bindings too. The secret tooling validates both files/config before its first provider write, refuses unsafe fallback/override sources, accepts these production-only names on production and fails if they appear on staging. Its safety guard also rejects a leftover withdrawn repository-management secret on staging.

Core management rejects staging. Synthetic source tests and browser simulations establish only their own nonproduction behavior; they prove no real owner activation, human email login or provider propagation. Actual acceptance requires a controlled installation with independently verified authority. Missing authority remains pending. Preview memory stays unavailable.

Part of the [Cloudflare stack](README.md).
