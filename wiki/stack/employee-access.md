# Employee access activation

Employee access starts with the existing business app's verified owner and a private installation record. [Company login](cloudflare-access.md) proves a caller's identity; an email in the public install record cannot establish ownership.

## Verify the existing installation

The trusted operator checks the production origin, Cloudflare account, Worker identifier, Access application and managed human policy against provider readback. Preserve unrelated login policies and machine access. Check the existing GitHub repository's numeric ID and name with its owner. Open sites and managed starters stay on their existing setup path.

The core endpoint `GET /api/access/identity` returns the owner's current signed-in identity. The Worker verifies the Access assertion before returning that person's nonsecret email, subject, issuer, audience and routing identifiers. Compare the person with the independently confirmed owner. An employee can read their own identity too; this response gives no right to nominate an owner. The private operator helper that automates this comparison is still pending. Do not ask anyone to find or paste a JWT.

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

The core operation `POST /api/access/activate` requires the owner's current authenticated app session, the exact production origin, and that same origin in the `Origin` header. Its private operator command is still pending; do not claim end-to-end setup ready until that command and its live checks are delivered. That command must keep the session in private OS-user state; no reusable credential belongs in a prompt or command argument. This core operation accepts no owner or target choices from its request body. Missing private configuration, foreign routing, a service caller or a different signed subject leaves activation unavailable or denied.

Activation creates one immutable installation/owner record in the app database. Repeating it for the same record is safe. Changing its owner, repository or target requires a separate reviewed migration; this endpoint refuses an implicit transfer. Writes and readback use a D1 session starting at the primary, and installation plus audit writes form one transaction. A missing migration or failed write reports unavailable without exposing provider errors.

This first storage step leaves app-policy enforcement and project issuance disabled. It assigns no employee and grants no app. Later reviewed route mappings, explicit grants, separate login-management/GitHub connections and publishing protections must pass their own checks before those surfaces become ready. A successful owner activation alone does not mean employees can connect or clone.

## Enable current app checks

The nonsecret `WONG_ACCESS_POLICY` rollout latch belongs in the installation's committed production `vars` in [its Worker configuration](../../app/wrangler.jsonc). Leave it absent before policy activation. The owner setup consumer is still pending: it must verify the installation, reviewed [main-route mappings](company-api.md#map-business-routes-before-employee-policy) and explicit employee grants before enabling `policy_enabled` in the app database and setting the latch to `on`. Do not enable it from public install metadata, a request body or an automatic update. Project editing remains a separate disabled surface.

With the latch absent, legacy and managed HTTP/static installs keep their existing routing without a policy database read. With `on`, business calls require the pinned enabled database policy and current signed human identity. An empty policy, absent migration/database, foreign installation, malformed nonempty latch or failed read denies access. Missing choices cannot become automatic app assignments. The owner remains pinned to the signed subject; the owner email alone cannot establish owner access.

Preserve the enabled latch, database policy, route mappings and tombstones on sync and rollback. Removing the latch would restore legacy routing and is not a rollback. Preview policy checks use a separate synthetic installation and app database; they never borrow production's owner record or provider credentials. The latch is declared in the blank environment maps for discovery, but it is a committed setting, not a secret to copy between Workers.

## Preserve data and rollback

The [app migration](../../schema/migrations/0001_employee_access.sql) adds only tables prefixed `wong_access_`. Existing business tables and the separately installed [memory store](../development/memory-key.md) are untouched. New employees begin without project editing or app grants. Removed-member rows remain as tombstones; receipt rows preserve pending revocation and bounded expiry information.

To stop setup before policy activation, remove the private activation binding and leave these tables intact. Once employee policy or token issuance is enabled, disable new issuance while preserving denials, tombstones, receipts and retries. Deploy a compatible policy-enforcing version. Reverting to code that ignores enabled employee policy would restore access. Retiring an integration requires revoking its tracked credentials and removing only its provider resources; copies already downloaded and independently installed memory remain separate.

Part of the [Cloudflare stack](README.md).
