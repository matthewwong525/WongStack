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
