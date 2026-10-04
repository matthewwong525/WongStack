# Existing-install compatibility and route inventory

Read-only source inventory, 2026-10-04. No resource was provisioned, no provider policy changed, and the Cloud picker remains outside this change.

The parent verified [#259](https://github.com/matthewwong525/WongStack/pull/259) merged at `2026-10-04T14:32:37Z`, head `82af26dbcbcb77c11c41fe1e3087108ae868e858`. The local setup contract in [private-access.mjs](../../../.agents/skills/wong-setup/scripts/private-access.mjs) records owned Worker/application/policy IDs and independent coverage/human-login status. This change consumes an existing protected business app/API installation. Repository grants/authentication remain manual for every provider; no repository automation is required.

## Current target

The public `.agents/.wong-stack.json` and [production configuration](../../../app/wrangler.jsonc) agree on:

| Resource | Recorded value |
|---|---|
| Account | `040f88e2bf4f25fb0b91b7cb24f3d442` |
| Access issuer | `https://startuptemplate.cloudflareaccess.com` |
| Audience | `b0e998ce836c59c284ff427902e65228fbbf2e5de3b1c77d26d2c81928cd2590` |
| Access application | `10a98858-5fe3-4650-a57f-a02786a1e851` |
| Human policy | `bcd7dbd7-0906-4793-b28d-0d945f7daa4c` |
| Independent machine policy | `2d042e45-ba2b-458c-93be-63a3f93db921` |
| Production Worker | `wongstack`, `37236d316a9d49028048b9217deae927` |
| Staging Worker | `wongstack-staging`, `bc809703c01f47528ff4e5449cf36e12` |
| App database | `wongstack-db`, `322d78e8-19e1-4bf0-8489-faa13c66deb1` |
| Recorded owner email | `matthewwong525@gmail.com` |

The record still says `humanLogin: unverified`. `app/wrangler.jsonc` now carries the recorded owner email as `WONG_OWNER_EMAIL` for both Workers; that committed value, with a verified human sign-in, is the owner authority. No repository ID, private pin or signed-subject pin is involved. The live app has no sign-in list key yet: task 10.3 runs `provision.mjs access` once, with a confirm, after publishing. No private setup record or credential value was read for this inventory.

## Routes to preserve

| Existing surface | Current handling | Employee-policy treatment to implement |
|---|---|---|
| `/`, static assets, `/apps/` redirect | Signed Access identity or explicit open starter | Current role/app readback; preserve shell/branding |
| `/apps/hello/`, `/apps/hello/api/greeting` | Hello page and described `hello.greeting` | App `hello`, preserve validation/guards |
| `/apps/tips/` | Customized Tips page; no server route | App `tips`; remains meta-only in distribution |
| `GET /api/health` | Described `main.health`, harmless health | Explicit reviewed infrastructure exception |
| `/api/actions`, `/api/openapi.json` | Verified company discovery | Filter current grants before ETags/contracts |
| `/_memory/*` | Independent memory credential before business identity | Preserve memory's authority and target |
| `/_walk/*` | Signed verification picture route, restricted bucket access | Preserve its independent verification contract |
| `/?memory_login_link=...` | Verified human machine-label association, clean redirect | Preserve existing memory-only labeling |
| `/api/access/setup`, `/api/access/apps` | Undescribed finite core readback | Every signed-in person's own prompt, apps and role |
| `/api/access/status`, `/api/access/people`, `/api/access/retry` | Undescribed finite owner operations | The recorded owner only; a preview keeps a practice list |

No other bare main business handlers exist in this source router. Installed customized routes require their own read-only inventory and reviewed app mappings before policy activation; this inventory cannot establish that for another business. New app IDs receive no automatic assignment. Existing action/record guards remain conjunctive.

## Retained source baseline and final acceptance

Previous remote checkpoints in [source-checks.md](source-checks.md) establish current app/discovery guards and durable Cloudflare policy/session reconciliation for the first build. Their original task numbers and withdrawn GitHub evidence remain historical records; they do not cover this revision.

This revision removes the private owner activation, the rollout list, the policy latch, the sealing key, the sealed database copy, the owner-setup script and the identity/activation routes. The owner is the recorded email; the built app folders are the catalogue; permissions start at the owner's first open, after listing everyone the sign-in list already admits with every app. Additive tables and deprecated fields remain intact: `wong_access_connections` now holds only the newest generation the sign-in list is known to match, and `wong_access_receipts`, `wong_access_attempts` and the repository columns stay inert. Home and direct app navigation enforce current permissions while branding and the removable welcome stay intact.

No live owner sign-in or provider change is established by this inventory or synthetic tests. Task 10.1 is the source gate, 10.2 the preview with its practice list, and 10.3 the live key step and a real second person. Production management credentials remain excluded from staging.
