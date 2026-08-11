# The widen protocol and the permission-group ids

Cloudflare permission groups are what a token's policy actually grants. The user grants two of them on the token screen; [the skill](../SKILL.md) grants itself everything else it needs, on demand, using this protocol. This page owns the mechanics — the skill states the outcome and points here.

## The sequence

```
   /user/tokens/verify              → your own token id
   /user/tokens/{id}                → your current policy document
   /user/tokens/permission_groups   → name → id lookup
   PUT /user/tokens/{id}            → the widened set
   /user/tokens/verify + a probe    → confirm it took
```

## The rules

- **You are already authorized to do this — don't ask, and report what you granted.** A user who supplied a token carrying the two API-token groups granted the widen by supplying it; stopping to ask permission is a failure mode, not caution ([the standing authorization](../../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized), which owns the reasoning and the limits — billable resources still get asked about, and the rules below still stop a run that can't verify).
- **Resolve ids by name at runtime**, from `/user/tokens/permission_groups`. The recorded values below are a fallback and a test fixture — never the lookup path. Ids drift, groups are added, and one name is genuinely ambiguous (see the traps). A hardcoded id that silently stops matching is worse than a lookup that fails loudly.
- **The `PUT` replaces the policy list wholesale.** The new set must still contain `API Tokens Write` (user scope) and `Account API Tokens Write` (account scope) — drop them and the token can never widen again, including on the next run. Preserve the existing account `resources` block as-is rather than rebuilding it; that map is what ties the token to the account, and losing it produces a token that verifies but sees no accounts.
- **Re-verify, then probe one endpoint per permission added.** A widen that "succeeded" but didn't take is how a half-provision starts.
- **A widen takes up to about a minute to propagate — retry before concluding anything.** The first probe after a `PUT` can return `403` on a permission the token now genuinely holds. **Do not diagnose a first `403` as a permission problem.** Retry with backoff (roughly 2s, 4s, 8s, 15s, 30s — about a minute total) and only treat it as a real failure if it is *still* failing at the end. Access endpoints are the worst offenders: one adopter saw Access `403` for about a minute after a successful widen, and the probe protocol read that as "the widen didn't take" and stopped a run that would have worked. A `403` that persists past the window is real; one that clears on retry was never a failure. Distinguish this from the lost-`resources` symptom below, which does *not* clear with time — that one shows an empty `/accounts`, not a `403`.
- **If the widen didn't take: stop, provision nothing.** Report which surfaces are unavailable and list the permission names for the user to add by hand — that path still works, it's just more clicking. Cloudflare could restrict self-escalation in future; this check is what makes that arrive as a clear message instead of a confusing half-provision.

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/user/tokens/permission_groups?per_page=1000"
```

The count was **392 groups** at the time of writing, which is why the endpoint needs `per_page=1000` — the default page hides most of them.

## Verified ids

Read from the live API against a real account.

### What the user grants

These two are the whole ask on the token screen. Every other group below, the skill grants itself.

| Name | Scope | Id |
|---|---|---|
| `API Tokens Write` | `com.cloudflare.api.user` | `686d18d5ac6c441c867cbf6771e58a0a` |
| `Account API Tokens Write` | `com.cloudflare.api.account` | `5bc3f8b21c554832afc660159ab75fa4` |

**Both must survive every widen** — see the wholesale-`PUT` rule above.

### A normal provision

| Name | Scope | For | Id |
|---|---|---|---|
| `Workers Scripts Write` | account | deploying the Worker | `e086da7e2179491d91ee5f35b3ca210a` |
| `D1 Write` | account | creating databases, applying migrations | `09b2857d1c31407795e75e3fed8617a1` |
| `Account Settings Read` | account | resolving account context | `c1fde68c7bcc44588cbb6ddbc16d6480` |
| `Workers CI Read` | account | reading build state (see the traps) | `ad99c5ae555e45c4bef5bdf2678388ba` |
| `Workers CI Write` | account | repointing a Workers Builds fallback | `2e095cf436e2455fa62c9a9c2e18c478` |
| `User Details Read` | user | self-verification | `8acbe5bb0d54464ab867149d7f7cf8ac` |
| `Workers R2 Storage Write` | account | only when the app adds an R2 bucket | `bf7481a1826f439697cb59a20b22293e` |

**`Browser Rendering Write` is no longer granted.** It existed for one consumer — the walkthrough's remote browser on Cloudflare Browser Run — and `/verify` now drives a local browser through `agent-browser`, so the group has no user. Granting a permission nothing consumes contradicts the narrow-token principle this widen and its narrow-back offer exist to serve. A token widened by an earlier version still carries it; that is harmless, and the existing narrow-back offer removes it along with every other group the skill granted.

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

**Builds is filed under "CI".** There is no permission group whose name contains "build" — searching all 392 for it returns nothing. Workers Builds permissions are `Workers CI Read` and `Workers CI Write`.

## Reading a token's current policy

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify        # → the token's own id

curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/{id}          # → its policy document
```

A policy pairs a permission-group list with a `resources` map. An empty `/accounts` after a widen is the lost-resources symptom in the [failure map](failure-map.md).
