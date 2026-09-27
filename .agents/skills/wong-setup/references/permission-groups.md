# The widen protocol and the permission-group ids

A token's policy grants Cloudflare permission groups. The user grants two on the token screen; [the provisioning runbook](cloudflare.md) grants itself the rest on demand with this protocol, which [`provision.mjs`](../scripts/provision.mjs) runs. `scripts/tests/provision.test.mjs` fails when the script's groups differ from the tables below.

## The sequence

```
   /user/tokens/verify              → your own token id
   /user/tokens/{id}                → your current policy document
   /user/tokens/permission_groups   → name → id lookup
   PUT /user/tokens/{id}            → the widened set
   /user/tokens/verify + a probe    → confirm it took
```

## The rules

- **The widen is [pre-authorized](../../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized): don't ask; report what you granted.**
- **Resolve ids by name at runtime**, from `/user/tokens/permission_groups`. The ids below are a fallback and test fixture, never the lookup: ids drift, groups are added, and one name is ambiguous ([the traps](#the-two-traps)).
- **The `PUT` replaces the policy list wholesale.** Keep `API Tokens Write` (user scope) and `Account API Tokens Write` (account scope) in it, or the token can never widen again. Keep the account `resources` block as it is, never rebuilt: without it, the token verifies but sees no accounts.
- **Re-verify, then probe one endpoint per added permission.** A widen that "succeeded" but didn't take starts a half-provision.
- **A widen takes up to about a minute to propagate.** The first probe after a `PUT` can return `403` on a permission the token now holds, so **a first `403` is not a permission problem.** Retry with backoff (about 2s, 4s, 8s, 15s, 30s); only a `403` at the end is real. Access endpoints are slowest: one adopter's run stopped on an Access `403` that would have cleared within the minute. Lost `resources` does *not* clear with time; it shows an empty `/accounts`, not a `403`.
- **If the widen didn't take, stop and provision nothing.** Report which surfaces are unavailable, and list the permission names for the user to add by hand. Should Cloudflare ever restrict self-escalation, this turns it into a clear message, not a half-provision.

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/user/tokens/permission_groups?per_page=1000"
```

There were **392 groups** at writing, so the endpoint needs `per_page=1000`; the default page hides most.

## Verified ids

Read from the live API against a real account.

### What the user grants

The whole ask on the token screen; the runbook grants itself every other group below. The *Key* is the group's name in a dashboard template link: [the token link](../../../../wiki/stack/cloudflare-credentials.md#create-the-token) asks for these two, with Edit. The keys were checked on a real Cloudflare dashboard on 2026-09-27.

| Name | Scope | Key | Id |
|---|---|---|---|
| `API Tokens Write` | `com.cloudflare.api.user` | `api_tokens` | `686d18d5ac6c441c867cbf6771e58a0a` |
| `Account API Tokens Write` | `com.cloudflare.api.account` | `account_api_tokens` | `5bc3f8b21c554832afc660159ab75fa4` |

**Both must survive every widen** (the wholesale-`PUT` rule above).

### A normal provision

| Name | Scope | For | Id |
|---|---|---|---|
| `Workers Scripts Write` | account | deploying the Worker | `e086da7e2179491d91ee5f35b3ca210a` |
| `D1 Write` | account | creating databases, applying migrations | `09b2857d1c31407795e75e3fed8617a1` |
| `Account Settings Read` | account | resolving account context | `c1fde68c7bcc44588cbb6ddbc16d6480` |
| `Workers CI Read` | account | reading build state (see the traps) | `ad99c5ae555e45c4bef5bdf2678388ba` |
| `Workers CI Write` | account | repointing a Workers Builds fallback | `2e095cf436e2455fa62c9a9c2e18c478` |
| `User Details Read` | user | self-verification | `8acbe5bb0d54464ab867149d7f7cf8ac` |
| `Workers R2 Storage Write` | account | checking whether R2 is on, and the memory bucket | `bf7481a1826f439697cb59a20b22293e` |

### The CI deploy token

The GitHub secret gets its own token, never the user token. [The provisioning runbook](cloudflare.md#4d-the-ci-deploy-token) mints it with only these groups, on the one account; it cannot mint or edit tokens, so a leak from CI cannot widen itself. This table is the one list: `scripts/tests/downstream-contract.test.mjs` pins it for hosted setups, and `scripts/tests/provision.test.mjs` holds the script to it.

| Name | Scope | When | Id |
|---|---|---|---|
| `Workers Scripts Write` | account | always | `e086da7e2179491d91ee5f35b3ca210a` |
| `D1 Write` | account | always | `09b2857d1c31407795e75e3fed8617a1` |
| `Account Settings Read` | account | always | `c1fde68c7bcc44588cbb6ddbc16d6480` |
| `Workers R2 Storage Write` | account | only when the wrangler config binds an R2 bucket | `bf7481a1826f439697cb59a20b22293e` |
| `Workers Routes Write` | zone | only when the wrangler config has `routes` on a custom domain | `28f4b596e7d643029c524985477ae49a` |

`Workers Routes Write` is zone-scoped: its `resources` entry names the zone, not the account.

### The opt-in Access branch

Added only when a user asks for a login wall; droppable afterward.

| Name | Scope | Id |
|---|---|---|
| `Access: Apps and Policies Write` | account | `1e13c5124ca64b72b1969a67e8829049` |
| `Access: Organizations, Identity Providers, and Groups Write` | account | `bfe0d8686a584fa680f4c53b5eb0de6d` |
| `Access: Service Tokens Write` | account | `a1c0fec57cf94af79479a6d827fa518c` |
| `Zero Trust Write` | account | `b33f02c6f7284e05a6f20741c0bb0567` |

## The two traps

**`Access: Apps and Policies Write` exists twice**, with different scopes and ids:

```
   1e13c5124ca64b72b1969a67e8829049   com.cloudflare.api.account        ✅ this one
   959972745952452f8be2452be8cbb9f2   com.cloudflare.api.account.zone   ❌ zone-scoped
```

Match on `scopes` containing `com.cloudflare.api.account`, never on position, since order is not guaranteed. The zone-scoped copy yields a token that accepts the policy, then fails every account-level Access call.

**Builds is filed under "CI".** No group name contains "build"; Workers Builds permissions are `Workers CI Read` and `Workers CI Write`.

## Reading a token's current policy

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify        # → the token's own id

curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/{id}          # → its policy document
```

A policy pairs a permission-group list with a `resources` map. An empty `/accounts` after a widen means lost resources ([failure map](failure-map.md)).
