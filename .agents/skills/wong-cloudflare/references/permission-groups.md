# Permission-group ids

Cloudflare permission groups are what a token's policy actually grants. [The skill](../SKILL.md) needs their ids to build a widened policy set.

**Resolve ids by name at runtime.** These recorded values are a fallback and a test fixture — never the lookup path:

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/user/tokens/permission_groups?per_page=1000"
```

Ids drift, groups are added, and one name is genuinely ambiguous. A hardcoded id that silently stops matching is worse than a lookup that fails loudly.

## Verified ids

Read from the live API against a real account. The count was **392 groups** at the time of writing, which is why the endpoint needs `per_page=1000` — the default page hides most of them.

### What the user grants

These two are the whole ask on the token screen. Every other group below, the skill grants itself.

| Name | Scope | Id |
|---|---|---|
| `API Tokens Write` | `com.cloudflare.api.user` | `686d18d5ac6c441c867cbf6771e58a0a` |
| `Account API Tokens Write` | `com.cloudflare.api.account` | `5bc3f8b21c554832afc660159ab75fa4` |

**Both must survive every widen.** `PUT /user/tokens/{id}` replaces the policy list wholesale — drop these and the token loses the ability to widen again, permanently, including on the next run.

### A normal provision

| Name | Scope | Id |
|---|---|---|
| `Workers Scripts Write` | account | `e086da7e2179491d91ee5f35b3ca210a` |
| `D1 Write` | account | `09b2857d1c31407795e75e3fed8617a1` |
| `Account Settings Read` | account | `c1fde68c7bcc44588cbb6ddbc16d6480` |
| `Workers CI Read` | account | `ad99c5ae555e45c4bef5bdf2678388ba` |
| `Workers CI Write` | account | `2e095cf436e2455fa62c9a9c2e18c478` |
| `User Details Read` | user | `8acbe5bb0d54464ab867149d7f7cf8ac` |
| `Workers R2 Storage Write` | account | `bf7481a1826f439697cb59a20b22293e` |

### The opt-in Access branch

Added only when a user asks for a login wall, and droppable afterward.

| Name | Scope | Id |
|---|---|---|
| `Access: Apps and Policies Write` | account | `1e13c5124ca64b72b1969a67e8829049` |
| `Access: Organizations, Identity Providers, and Groups Write` | account | `bfe0d8686a584fa680f4c53b5eb0de6d` |
| `Access: Service Tokens Write` | account | `a1c0fec57cf94af79479a6d827fa518c` |
| `Zero Trust Write` | account | `b33f02c6f7284e05a6f20741c0bb0567` |

## The two traps

**`Access: Apps and Policies Write` exists twice.** Same name, different scope, different id:

```
   1e13c5124ca64b72b1969a67e8829049   com.cloudflare.api.account        ✅ this one
   959972745952452f8be2452be8cbb9f2   com.cloudflare.api.account.zone   ❌ zone-scoped
```

Match on `scopes` containing `com.cloudflare.api.account`, never on position in the response — ordering is not guaranteed. Picking the zone-scoped copy produces a token that accepts the policy and then fails every account-level Access call.

**Builds is filed under "CI".** There is no permission group whose name contains "build" — searching all 392 for it returns nothing, which is how [the credentials page](../../../../wiki/stack/cloudflare-credentials.md) came to hedge about the name. Workers Builds permissions are `Workers CI Read` and `Workers CI Write`.

## Reading a token's current policy

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify        # → the token's own id

curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/{id}          # → its policy document
```

A policy pairs a permission-group list with a `resources` map. Preserve the existing resources block when widening rather than rebuilding it — that map is what ties the token to the user's account, and losing it produces a token that verifies but sees no accounts (the empty-`/accounts` symptom in the [failure map](failure-map.md)).
