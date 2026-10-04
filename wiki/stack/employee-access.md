# Employee access activation

Employee access starts with the existing business app's verified owner and a private installation record. [Company login](cloudflare-access.md) proves a caller's identity; an email in the public install record cannot establish ownership.

## Verify the existing installation

The trusted operator checks the production origin, Cloudflare account, Worker identifier, Access application and managed human policy against provider readback. Preserve unrelated login policies and machine access. Check the existing GitHub repository's numeric ID and name with its owner. Open sites and managed starters stay on their existing setup path.

The core endpoint `GET /api/access/identity` returns the owner's current signed-in identity. The Worker verifies the Access assertion before returning that person's nonsecret email, subject, issuer, audience and routing identifiers. Compare the person with the independently confirmed owner. An employee can read their own identity too; this response gives no right to nominate an owner. The [private owner consumer](../../scripts/employee-owner-setup.mjs) reads that identity through the existing employee-login transport. Do not ask anyone to find or paste a JWT.

## Configure the private owner record

After those checks, prepare `WONG_ACCESS_ACTIVATION` privately as a JSON object with these fields:

| Field | Verified value |
|---|---|
| `version` | `1` |
| `installationId` | A new UUID retained for this installation |
| `origin` | Exact production HTTPS origin, with no path or trailing slash |
| `accountId` | Cloudflare account identifier |
| `workerId` | Production Worker's opaque provider identifier |
| `accessAppId`, `accessPolicyId` | Existing Access application and managed human policy UUIDs |
| `issuer`, `audience` | Verified Access issuer and this app's audience |
| `ownerSubject`, `ownerEmail` | Independently confirmed owner's signed app identity |
| `repositoryId`, `repositoryName` | Existing numeric repository ID and `owner/name` |

Store the record through the [private runtime-secret procedure](staging-bindings.md#env-and-devvars-are-not-interchangeable). Never generate it from a public marker, git email, first visitor or service token. Keep it outside tracked files and ordinary mini-app bindings. Use a separate empty staging value; staging never activates a production installation.

The core operation `POST /api/access/activate` requires the owner's current authenticated app session, the exact production origin, and that same origin in the `Origin` header. The private operator runs `node scripts/employee-owner-setup.mjs activate` after independently comparing the identity and configuring the pin. Actual owner/provider acceptance remains required before calling onboarding ready. That command must keep the session in private OS-user state; no reusable credential belongs in a prompt or command argument. This core operation accepts no owner or target choices from its request body. Missing private configuration, foreign routing, a service caller or a different signed subject leaves activation unavailable or denied.

Activation creates one immutable installation/owner record in the app database. Repeating it for the same record is safe. Changing its owner, repository or target requires a separate reviewed migration; this endpoint refuses an implicit transfer. Writes and readback use a D1 session starting at the primary, and installation plus audit writes form one transaction. A missing migration or failed write reports unavailable without exposing provider errors.

This first storage step leaves app-policy enforcement and project issuance disabled. It assigns no employee and grants no app. Later reviewed route mappings, explicit grants, separate login-management/GitHub connections and publishing protections must pass their own checks before those surfaces become ready. A successful owner activation alone does not mean employees can connect or clone.

## Enable current app checks

The nonsecret `WONG_ACCESS_POLICY` rollout latch belongs in the installation's committed production `vars` in its generated `app/wrangler.jsonc` Worker configuration. Leave it absent before policy activation. The private owner consumer verifies a separately reviewed `WONG_ACCESS_ROLLOUT` record containing `version: 1`, the exact built `apps` catalogue, `mainRoutes` entries (`route` and `access`), and explicit `people` entries (`email`, `apps`, `editing`). It compares the route mappings and current roster/grants before enabling `policy_enabled`; unknown choices remain closed. Do not enable it from public install metadata, a request body or an automatic update. Project editing remains a separate disabled surface.

With the latch absent, legacy and managed HTTP/static installs keep their existing routing without a policy database read. With `on`, business calls require the pinned enabled database policy and current signed human identity. An empty policy, absent migration/database, foreign installation, malformed nonempty latch or failed read denies access. Missing choices cannot become automatic app assignments. The owner remains pinned to the signed subject; the owner email alone cannot establish owner access.

Preserve the enabled latch, database policy, route mappings and tombstones on sync and rollback. Removing the latch would restore legacy routing and is not a rollback. Preview policy checks use a separate synthetic installation and app database; they never borrow production's owner record or provider credentials. The latch is declared in the blank environment maps for discovery, but it is a committed setting, not a secret to copy between Workers.

## Read current app access

The core endpoint `GET /api/access/apps` supplies the frontend's current role, policy revision and allowed app slugs. It reads the same primary policy snapshot as business calls, keeps no positive permission cache and returns `Cache-Control: no-store`. Its catalogue comes from frontend app manifests, so an app with no API still needs an explicit grant. The verified owner sees the built catalogue; a current employee with no selected business apps retains Access self-service when that app is present. Removal denies the readback, and unavailable authority returns a safe retryable error.

Before rollout, readback returns only `state: legacy`. It assigns no owner, employee or app grant and establishes no onboarding readiness. The frontend's existing legacy behavior remains until the reviewed policy is enabled. [Company discovery](company-api.md#discover-only-what-the-task-needs) separately filters action contracts using these same current grants. Frontend links and static bundles supply no business API permission.

## Preserve data and rollback

The [policy migration](../../schema/migrations/0001_employee_access.sql) and [connection migration](../../schema/migrations/0002_employee_connections.sql) add only tables prefixed `wong_access_`. Existing business tables and the separately installed [memory store](../development/memory-key.md) are untouched. New employees begin without project editing or app grants. Removed-member rows remain as tombstones; receipt rows preserve pending revocation and bounded expiry information.

To stop setup before policy activation, remove the private activation binding and leave these tables intact. Once employee policy or token issuance is enabled, disable new issuance while preserving denials, tombstones, receipts and retries. Deploy a compatible policy-enforcing version. Reverting to code that ignores enabled employee policy would restore access. Retiring an integration requires revoking its tracked credentials and removing only its provider resources; copies already downloaded and independently installed memory remain separate.

## Private operator sequence

Use the owner's existing company login through `node scripts/company-api.mjs login --origin <production HTTPS origin>` before setting the rollout latch. The session remains in private OS-user state outside any checkout. Read `node scripts/employee-owner-setup.mjs identity`, compare it with the independently confirmed owner, then run `activate`. Neither command can choose an owner from a request body, public install marker or first visitor.

Privately configure `WONG_ACCESS_ROLLOUT`, then run the consumer's `prepare` operation to register the reviewed app catalogue while keeping enforcement disabled. Save the explicit roster/grants through the owner-only people operation; login reconciliation remains unavailable at this stage. Preserve the existing human login policy while preparing. Deploy the committed production latch `on`, run `rollout`, and retry pending provider work only after both latch and database enforcement are active. The pinned owner can still read identity and finish this transition while employee policy is closed. Once enabled, preserve enforcement on rollback.

## Connect login management

Generate a private random 32-byte base64url `WONG_ACCESS_SEAL_KEY`. Store it only through the runtime-secret procedure. Privately configure `WONG_ACCESS_LOGIN_MANAGEMENT` with `version: 1`, the separate Access-only `token`, pinned `accountId`, `appId`, `policyId`, current `policyName`, independently reviewed `initialEmails`, `permission: "Access: Apps and Policies Write"`, and `scope: "selected-account"`. The trusted operator independently verifies its account scope and exact permissions; token verification alone does not reveal the granted permission set. Never reuse the deploy or broad provisioning token.

Cloudflare scopes this credential to the account, covering more than one application. The finite core adapter limits every call to the recorded application and human policy. It rejects shared policies and unreviewed human/bypass policies, preserves the separate machine policy, and retains existing approval, requirement, exclusion and isolation controls. The `connect` consumer operation seals this material; it does not admit employees before reviewed enforcement. Mini-app handlers receive none of these private bindings.

The owner-only `retry` operation runs durable policy, application-session and tracked-token work independently. It uses a bounded installation lease, current generations and authoritative readback. Session revocation is application-wide and reports provider acceptance separately from unverified propagation; remaining people may have to sign in again. A stale mutation converges to the latest desired roster. An unknown older policy write remains observable and prevents a newer removal being called complete even if its latest email readback matches. A transport timeout cannot prove cancellation. Such uncertainty requires controlled provider/operator evidence; repeated reads alone cannot establish that an earlier write will never finish. No automatic scheduler is installed and existing schedules remain unchanged.

## Connect and verify GitHub

Before registration, the trusted operator privately prepares `WONG_GITHUB_PUBLICATION`: `version: 1`, independently confirmed human `ownerGithubId`/`ownerGithubLogin`, recorded `repositoryOwnerId`/`repositoryOwnerType`, reviewed `environments` (`name`, exact `branches`) and default-branch `workflows` (`path`, provider blob `sha`). These pins express the review; they cannot alone establish readiness. The core reads the actual repository/App owner, verifies the human's GitHub user identity and repository administration, and independently inspects every supported provider protection.

The owner starts the finite `POST /api/access/github/start` operation. `kind: register` supplies a manifest POST destination under the pinned repository owner's GitHub account or organization. The manifest contains separate conversion and installation callback URLs, narrowly reviewed permissions and disabled webhooks. GitHub approval is performed by the owner on GitHub. `kind: install` instead reuses the sealed customer App with fresh one-use state/cookie; pending organization approval can resume without registering another App. Both callbacks require the current pinned business owner and a short-lived one-use attempt with an HttpOnly browser nonce. They clean consumed callback URLs with a redirect and no-referrer policy.

The customer App requests Contents/Pull requests write; Checks, Actions, Statuses and Deployments read; and owner-only Administration, Secrets and Environments read. Secret-list inspection returns names/metadata, never secret values. Employee tokens explicitly omit those inspection permissions, have no Workflows or secret writes, and target only the recorded numeric repository. Unsupported operations cannot expand their grants.

The supported publication verifier requires organization-owned classic branch restrictions excluding Apps and teams, enforced administrator checks, no force pushes/deletions and no unreviewed inherited rules. It supports read-only CI plus deployment jobs using literal, privately reviewed environments. Every such environment requires the independently verified human owner's approval, prevents self-review and administrator bypass, and has exact branch policies; production has a default-branch-only policy. Preview credentials also require the owner's protected environment approval. Repository and inherited organization secret metadata must show no secrets accessible outside those environments. Workflow blobs must match the reviewed provider hashes; dynamic environments, reusable/matrix jobs, unknown triggers or permissions, unavailable inspection rights and changed workflow files block readiness. The trusted operator must separately verify other hosting integrations/deployment triggers during controlled acceptance; this core does not provision or move secrets, disable pipelines or alter protections.

The ordinary template's shared repository-level deployment credentials and dynamic environment are unsafe for this boundary and remain blocked. A personal repository without the required provider protections remains blocked too. Connection verification is not evidence of actual employee clone/PR/check/preview operations; controlled installation acceptance is still required. The `check` consumer refreshes provider status; `editing` enables issuance only after current enforcement and independent protection pass. Owners continue publishing through their existing reviewed workflow.

## Private issuance and removal

`POST /api/access/token` accepts only a private machine UUID and receipt UUID through the employee's signed app identity. It checks current editing authority before provider work and again before delivery. Tokens remain sealed with the employee, machine, repository, grant revision and actual expiry before they are returned to the private helper. Lost local responses reuse the exact completed receipt. Unknown issuance cannot create another token blindly on the same machine. A creation admitted for at most ten minutes can use an App JWT valid nine more minutes; an unknown outcome therefore keeps a conservative eighty-minute deadline after admission, rather than claiming expiry exactly one hour after the request began.

Editing removal blocks issuance/renewal and retains assigned app grants. Full removal commits a durable tombstone and immediately denies new app/API/self-service calls. Known tokens are revoked from sealed receipts; raced or failed revocations remain pending, and uncertain creation remains pending until resolved or its conservative deadline expires. Separate policy/session/token outcomes and nonsecret audit rows are available to the owner. Downloaded copies, independently granted native GitHub access and separately installed memory remain outside this removal.

`GET /api/access/setup` returns only the caller's current role, app grants, editing assignment and independent provider availability. Its authenticated API readback establishes no local clone, machine connection or memory grant. The bootstrap must establish those independently. Legacy/unavailable policy supplies no onboarding readiness.

## Keep production authority out of previews

Before the first secret push, create a separate ignored `app/.dev.vars.staging` and explicitly leave `WONG_ACCESS_ACTIVATION`, `WONG_ACCESS_SEAL_KEY`, `WONG_ACCESS_LOGIN_MANAGEMENT`, `WONG_ACCESS_ROLLOUT` and `WONG_GITHUB_PUBLICATION` empty there. The existing secret tooling otherwise defaults to copying production values when that file is absent. Never use that fallback for connection authority. Preview tests use synthetic nonproduction state; core management additionally rejects every environment except production. Distribution updates must preserve this separation and existing customized schedules/configuration. No live connection material is created or changed by source tests.

Part of the [Cloudflare stack](README.md).
