# The widen protocol and the permission-group ids

A token's policy grants Cloudflare permission groups. The user grants two on the token screen; [the provisioning runbook](cloudflare.md) grants itself the rest on demand with this protocol, which [`provision.mjs`](../scripts/provision.mjs) runs. [The Artifacts route](../../../../wiki/stack/artifacts-route.md#the-permissions-it-adds) adds four. `scripts/tests/provision.test.mjs` fails when the script's groups differ from the tables below.

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
- **Resolve ids by name at runtime**, from `/user/tokens/permission_groups?per_page=1000`; the default page hides most of the 392 groups. The ids below are a fallback and test fixture, never the lookup: ids drift, groups are added, and one name is ambiguous ([the traps](#the-two-traps)).
- **The `PUT` replaces the policy list wholesale.** Keep `API Tokens Write` and `Account API Tokens Write` in it, or the token can never widen again. Never rebuild the account `resources` block: without it, the token verifies but sees no accounts.
- **Re-verify, then probe one endpoint per added permission.** A widen that "succeeded" but didn't take starts a half-provision.
- **A widen takes up to about a minute to propagate.** The first probe after a `PUT` can return `401` (code `10000`) or `403` on a permission the token now holds, so **a first `401` or `403` is not a permission problem.** Retry with backoff (about 2s, 4s, 8s, 15s, 30s); only a refusal at the end is real. Access endpoints are slowest: one adopter's run stopped on an Access `403` that would have cleared within the minute. Lost `resources` does *not* clear with time; it shows an empty `/accounts`, not a `403`.
- **If the widen didn't take, stop and provision nothing.** Report which surfaces are unavailable, and list the permission names for the user to add by hand. Should Cloudflare ever restrict self-escalation, this turns it into a clear message, not a half-provision.

`/user/tokens/permission_groups` needs `?per_page=1000`: the default page hides most of some 400 groups.

## Verified ids

Read from the live API on a real account.

### What the user grants

The *Key* is the group's name in a dashboard template link: [the token link](../../../../wiki/stack/cloudflare-credentials.md#create-the-token) asks for these two, with Edit; checked on a real Cloudflare dashboard on 2026-09-27.

| Name | Scope | Key | Id |
|---|---|---|---|
| `API Tokens Write` | user | `api_tokens` | `686d18d5ac6c441c867cbf6771e58a0a` |
| `Account API Tokens Write` | account | `account_api_tokens` | `5bc3f8b21c554832afc660159ab75fa4` |

### A normal provision

| Name | Scope | For | Id |
|---|---|---|---|
| `Workers Scripts Write` | account | deploying the Worker | `e086da7e2179491d91ee5f35b3ca210a` |
| `D1 Write` | account | databases and migrations | `09b2857d1c31407795e75e3fed8617a1` |
| `Account Settings Read` | account | account context | `c1fde68c7bcc44588cbb6ddbc16d6480` |
| `Workers CI Read` | account | reading build state | `ad99c5ae555e45c4bef5bdf2678388ba` |
| `Workers CI Write` | account | repointing a Workers Builds fallback | `2e095cf436e2455fa62c9a9c2e18c478` |
| `User Details Read` | user | self-verification | `8acbe5bb0d54464ab867149d7f7cf8ac` |
| `Workers R2 Storage Write` | account | the R2 check and the memory bucket | `bf7481a1826f439697cb59a20b22293e` |
| `Access: Apps and Policies Write` | account | private application and policies | `1e13c5124ca64b72b1969a67e8829049` |
| `Access: Organizations, Identity Providers, and Groups Write` | account | organization and email login | `bfe0d8686a584fa680f4c53b5eb0de6d` |
| `Access: Service Tokens Write` | account | separate machine authentication | `a1c0fec57cf94af79479a6d827fa518c` |
| `Zero Trust Write` | account | private workspace setup | `b33f02c6f7284e05a6f20741c0bb0567` |
| `Browser Run Write` | account | the cloud browser, for sites that block the agent's own | `adddda876faa4a0590f1b23a038976e4` |

### The CI deploy token

The GitHub secret gets its own token, never the user token. [The provisioning runbook](cloudflare.md#4d-the-ci-deploy-token) mints it with only these groups, on one account; it cannot mint or edit tokens, so a leak from CI cannot widen itself. `scripts/tests/downstream-contract.test.mjs` pins this table for installed repos.

| Name | Scope | When | Id |
|---|---|---|---|
| `Access: Apps and Policies Read` | account | always | `7ea222f6d5064cfa89ea366d7c1fee89` |
| `Workers Scripts Write` | account | always | `e086da7e2179491d91ee5f35b3ca210a` |
| `D1 Write` | account | always | `09b2857d1c31407795e75e3fed8617a1` |
| `Account Settings Read` | account | always | `c1fde68c7bcc44588cbb6ddbc16d6480` |
| `Workers R2 Storage Write` | account | when the config binds an R2 bucket | `bf7481a1826f439697cb59a20b22293e` |
| `Workers Routes Write` | zone | when the config has `routes` on a custom domain | `28f4b596e7d643029c524985477ae49a` |

`Workers Routes Write` is zone-scoped: its `resources` entry names the zone, not the account.

### The read-only look-up key

An allow-list for the app's Cloudflare look-ups, so a new product that stores data never joins by default. A zone row's `resources` entry names every zone in this account.

| Name | Scope | Id |
|---|---|---|
| `Account Settings Read` | account | `c1fde68c7bcc44588cbb6ddbc16d6480` |
| `Workers Scripts Read` | account | `1a71c399035b4950a1bd1466bbe4f420` |
| `Workers Tail Read` | account | `05880cd1bdc24d8bae0be2136972816b` |
| `Workers CI Read` | account | `ad99c5ae555e45c4bef5bdf2678388ba` |
| `Account Analytics Read` | account | `b89a480218d04ceb98b4fe57ca29dc1f` |
| `Access: Apps and Policies Read` | account | `7ea222f6d5064cfa89ea366d7c1fee89` |
| `Access: Audit Logs Read` | account | `b05b28e839c54467a7d6cba5d3abb5a3` |
| `Billing Read` | account | `7cf72faf220841aabcfdfab81c43c4f6` |
| `Zone Read` | zone | `c8fed203ed3043cba015a93ad1616f1f` |
| `DNS Read` | zone | `82e64a83756745bbbb1c9c2701bf816b` |
| `Analytics Read` | zone | `9c88f9c5bce24ce7af9a958ba9c504db` |

## The two traps

**`Access: Apps and Policies Write` exists twice**, with different scopes and ids:

```
1e13c5124ca64b72b1969a67e8829049   com.cloudflare.api.account        ✅
959972745952452f8be2452be8cbb9f2   com.cloudflare.api.account.zone   ❌
```

Match on `scopes` containing `com.cloudflare.api.account`, never on position: order is not guaranteed. The zone-scoped copy yields a token that accepts the policy, then fails every account-level Access call.

**Builds is filed under "CI".** No group name contains "build"; Workers Builds permissions are `Workers CI Read` and `Workers CI Write`.
