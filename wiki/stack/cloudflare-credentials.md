# Cloudflare credentials

One token gets everything running. Create it with **two checkboxes**, paste it into `.env`, and the agent grants itself whatever else it needs — [provisioning](provisioning.md), deploys, build logs, and (only if you want it) the [Access](cloudflare-access.md) login wall.

This page is the token screen in detail: where to click, what to tick, what it can do afterward, and the security trade-off that design makes. Values land in `.env` per the [secrets convention](../development/secrets.md); real values never touch git.

> Dashboard labels drift and vary by plan. The permission *names* below were read from the live API, so they're accurate as names — but if a menu path doesn't match what you see, match on the concept.

## User-scoped, not account-scoped

This is the single most confusing trap in the stack, so lead with it:

> **Create the token under My Profile, not under your account.** Cloudflare has two token screens that look almost identical. Only the profile one produces a token that can reach the `/user/*` endpoints this setup depends on.

```
   My Profile → API Tokens          ✅ user-scoped — use this
   Account → … → API Tokens         ❌ account-scoped — /user/* rejects it
```

The symptom, if you get it wrong: `/user/tokens/verify` returns `Invalid API Token` even though account-level calls work fine. It reads like a broken token and is actually the wrong *kind* of token. There's no way to convert one — you make a new one.

## Create the token

Follow this literally. It's four menu steps, two permission rows, and one field people miss.

```
   Cloudflare dashboard
     → My Profile          (the avatar menu, top right — NOT the account area)
     → API Tokens
     → Create Token
     → Create Custom Token       ("Get started" beside it, below the templates)

   Permissions — add exactly two rows:
     ┌──────────┬─────────────┬──────┐
     │ User     │ API Tokens  │ Edit │
     ├──────────┼─────────────┼──────┤
     │ Account  │ API Tokens  │ Edit │
     └──────────┴─────────────┴──────┘

   Account Resources:
     Include ▸ <your account>        ← THE ONE PEOPLE MISS

   → Continue to summary → Create Token → copy it (shown once)
```

**Do not skip Account Resources.** Leaving it unset produces a token that verifies successfully and can see nothing — Cloudflare reports the out-of-scope account as *no accounts* rather than as an error, so it reads like an empty Cloudflare account. If that happens you can edit the existing token; you don't need a new one, and the value in `.env` stays valid because the token id doesn't change.

Two checkboxes really is the whole ask. Everything else — Workers, D1, build logs, Zero Trust — the agent grants on demand.

## Store it

```bash
# Cloudflare — user-scoped API token from My Profile → API Tokens.
# Two permissions: User ▸ API Tokens ▸ Edit, Account ▸ API Tokens ▸ Edit.
CLOUDFLARE_API_TOKEN=
# Your Cloudflare account ID (dashboard → Workers & Pages → right sidebar).
CLOUDFLARE_ACCOUNT_ID=
```

`.env.example` uses these same two names. Provisioning creates `.env` from it, confirms git ignores it, and fills `CLOUDFLARE_ACCOUNT_ID` for you once it knows which account you picked.

CI doesn't need a copy: Workers Builds runs inside Cloudflare and already has your account's credentials. The token in `.env` is what an agent uses to provision and to read a failed build's log.

## How two checkboxes become enough

The token rewrites its own permissions:

```
   /user/tokens/verify              → its own id
   /user/tokens/{id}                → its current policy
   /user/tokens/permission_groups   → name → id lookup
   PUT /user/tokens/{id}            → a wider policy set
```

Verified working against the live API: a token with only `API Tokens Write` widened itself and nine endpoints went from `Authentication error` to resolving. **The token id doesn't change**, so `.env` is written once — no rotation, no second secret, no re-paste.

What gets granted for a normal setup:

| Permission group | For |
|---|---|
| `Workers Scripts Write` | deploying the Worker |
| `D1 Write` | creating databases, applying migrations |
| `Account Settings Read` | resolving account context |
| `Workers CI Read` | reading build state |
| `User Details Read` | self-verification |

Only if you ask for a login wall: `Access: Apps and Policies Write`, `Access: Organizations, Identity Providers, and Groups Write`, `Access: Service Tokens Write`, `Zero Trust Write`. Someone who never wants authentication never grants anything Zero-Trust-shaped — which is the practical payoff of this design.

> **Workers Builds is filed under "CI".** The permission is `Workers CI Read` / `Workers CI Write`. There is no permission group whose name contains "build" — all 392 were searched. If you've ever hunted the picker for a Builds permission, that's why you didn't find one.

### Narrowing back

The same call in reverse. Provision, then hand the extra permissions back; widen again next time you need them. Offered, never automatic.

Whatever set you `PUT`, it must still contain `API Tokens Write` and `Account API Tokens Write` — the call replaces the policy list wholesale, and a token that drops them can never widen again. That one is unrecoverable without creating a new token.

## The security trade-off, stated plainly

**A token that can widen itself is effectively account-root.** It is bounded only by what its owner can do. The two-checkbox starting point is cosmetic, not a security boundary, and this page won't pretend otherwise.

Self-widening and least privilege are mutually exclusive, and this design chose usability: you visit the dashboard once either way, so ticking two boxes instead of nine saves a real step — and it means optional features cost nothing up front. If you'd rather have least privilege, grant the specific groups above by hand and skip the widening; everything downstream works the same.

Treat the token like a root password. It lives in exactly one place — the git-ignored `.env` — and nothing copies it anywhere else.

## Access service token

Only relevant if you turned on the [Access](cloudflare-access.md) login wall. A **service token** is how a non-interactive caller — CI, a script, anything without a browser — gets past Access to reach a gated preview URL.

It's an ID/secret pair sent as request headers:

```
   CF-Access-Client-Id:     <client id>
   CF-Access-Client-Secret: <client secret>
```

```bash
# Cloudflare Access service token — lets CI reach Access-gated preview URLs.
# Created under Zero Trust → Access → Service Auth; the policy must accept it.
CF_ACCESS_CLIENT_ID=
CF_ACCESS_CLIENT_SECRET=
```

Create it while you're setting up Access ([step 5](cloudflare-access.md#5-create-the-service-token-do-it-now)) — adding it later means re-opening the policy.

## Worker secrets are per environment

The credentials above are yours — they live in `.env` and let *you* and an agent talk to Cloudflare. A **Worker secret** is different: it belongs to a deployed Worker, and the runtime reads it off `env`. An API key the Worker itself calls out with is this kind.

Secrets are scoped to a single Worker, and [staging is a separate Worker](d1-pipeline.md#why-staging-is-a-whole-worker). So every secret has to be put twice:

```bash
npx wrangler secret put GEMINI_API_KEY                  # the production Worker
npx wrangler secret put GEMINI_API_KEY --env staging    # the staging Worker
```

Forgetting the second one is the single most common staging failure, and it's the friendly kind — the binding is simply missing, so the Worker throws on first use rather than doing something subtly wrong. Add a secret to production and put it in staging in the same sitting.

Locally, the same values go in `.dev.vars` (git-ignored, per the [secrets convention](../development/secrets.md)) — `wrangler dev` reads that instead.

## Next

- What the token is used to build: [provisioning](provisioning.md).
- Turning on a login wall: [Cloudflare Access](cloudflare-access.md).
- How staging gets its own Worker and its own bindings: [Deploy and data pipeline](d1-pipeline.md).
- Back to the stack overview: [Cloudflare stack](README.md).
