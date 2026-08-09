# Cloudflare credentials

One token gets everything running. Create it with **two checkboxes**, save it in the primary worktree's `.env`, and the agent grants itself whatever else it needs — [provisioning](../../.claude/skills/wong-cloudflare/SKILL.md), deploys, build logs, and (only if you want it) the [Access](cloudflare-access.md) login wall.

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

**Do not skip Account Resources.** Leaving it unset produces a token that verifies successfully and can see nothing — Cloudflare reports the out-of-scope account as *no accounts* rather than as an error, so it reads like an empty Cloudflare account. If that happens you can edit the existing token; you don't need a new one, and the value in the primary worktree's `.env` stays valid because the token id doesn't change.

Two checkboxes really is the whole ask. Everything else — Workers, D1, build logs, Zero Trust — the agent grants on demand.

## Store it

```bash
# Cloudflare — user-scoped API token from My Profile → API Tokens.
# Two permissions: User ▸ API Tokens ▸ Edit, Account ▸ API Tokens ▸ Edit.
CLOUDFLARE_API_TOKEN=
# Your Cloudflare account ID (dashboard → Workers & Pages → right sidebar).
CLOUDFLARE_ACCOUNT_ID=
```

`.env.example` uses these same two names, blank. Provisioning creates the primary worktree's durable `.env` from the active branch's example, confirms the destination is ignored, and fills `CLOUDFLARE_ACCOUNT_ID` once it knows which account you picked. The [secrets convention](../development/secrets.md) owns worktree resolution and duplicate-file handling.

> **This page owns the token variable's name.** `CLOUDFLARE_API_TOKEN` is what wrangler reads natively, and what `scripts/cf-secrets.mjs`, `.github/workflows/deploy.yml`, `/wong-cloudflare`, and the GitHub repository secret all read. Every other surface that mentions it — the `.env.example` template, the [config fragment](../../.claude/skills/wong-sync/references/stack-pack-fragments.md#envexample--cloudflare-variables) — links here rather than restating it, so there is one place to change and no second definition to drift from.
>
> **Renaming it is a behavioural change, not a docs edit.** The name has flipped between `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_USER_TOKEN` three times across releases, in both directions, because a rename in a template looks exactly like prose in review. It isn't: it changes what a provisioned repo does. A change to this name requires a `VERSION` bump and a `CHANGELOG.md` entry like any other behavioural change — and the symptom when it's wrong is silent, since a token under an unread name looks identical to "not provisioned yet".

CI gets its copy as **GitHub repository secrets** — provisioning sets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` with `gh secret set`, so the pack's Actions workflow can deploy. The token therefore lives in exactly two authoritative places, neither committed: the primary worktree's git-ignored `.env`, and GitHub's sealed secret store. (A repo on the Workers Builds fallback needs neither: that CI runs inside Cloudflare.)

## How two checkboxes become enough

The token rewrites its own permissions: it reads its own id and policy, looks permission groups up by name, and `PUT`s itself a wider set. Verified working against the live API: a token with only `API Tokens Write` widened itself and nine endpoints went from `Authentication error` to resolving. **The token id doesn't change**, so the durable `.env` is written once — no rotation, no second secret, no re-paste.

The full protocol — the call sequence, the rules that keep the token able to widen again, and every group granted for a normal setup or an [Access](cloudflare-access.md) login wall — is owned by [the widen protocol reference](../../.claude/skills/wong-cloudflare/references/permission-groups.md). The practical payoff: someone who never wants authentication never grants anything Zero-Trust-shaped.

### The widen is pre-authorized

> **This page owns the standing authorization.** Providing a token that carries these two permission groups **is** the permission to widen it — the groups exist for no other purpose, and a token that couldn't widen itself would be useless here. An agent that reaches the widen performs it and reports which permissions it granted; it does not stop to ask whether it may change the token's scope. Every other surface that instructs an agent to widen — [the skill](../../.claude/skills/wong-cloudflare/SKILL.md), [the protocol reference](../../.claude/skills/wong-cloudflare/references/permission-groups.md) — restates that as a rule and links here for the reasoning.

The authorization covers the widen and nothing else:

- **Creating or deleting anything billable still asks first.** Widening costs nothing; a database is a different question.
- **A widen that fails or doesn't verify still stops the run.** Nothing is provisioned on an unconfirmed permission set — see [the protocol reference](../../.claude/skills/wong-cloudflare/references/permission-groups.md).
- **Narrowing back is still offered, never assumed.** Below.

Read it against the trade-off two sections down: this is a real grant, on a token that is effectively account-root, and it's stated here so the permission and its cost are read together.

### Narrowing back

The same call in reverse. Provision, then hand the extra permissions back; widen again next time you need them. Offered, never automatic. The one rule that must survive any hand-editing: the two API-token groups stay in the policy, or the token can never widen again (the wholesale-`PUT` rule in [the protocol reference](../../.claude/skills/wong-cloudflare/references/permission-groups.md)).

## The security trade-off, stated plainly

**A token that can widen itself is effectively account-root.** It is bounded only by what its owner can do. The two-checkbox starting point is cosmetic, not a security boundary, and this page won't pretend otherwise.

Self-widening and least privilege are mutually exclusive, and this design chose usability: you visit the dashboard once either way, so ticking two boxes instead of nine saves a real step — and it means optional features cost nothing up front. If you'd rather have least privilege, grant the specific groups above by hand and skip the widening; everything downstream works the same.

Treat the token like a root password. Its one machine-local copy lives in the primary worktree's git-ignored `.env`; provisioning also sends it directly to GitHub's sealed repository-secret store and never creates a linked-worktree copy.

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

**Or let `/walk` create it.** A walk that meets the login wall with no pair stored mints one named for the repo, confirms the policy accepts it, writes both values here, and retries — under the same [standing authorization](#the-widen-is-pre-authorized) that lets the token widen itself, and widening into the Access permission groups first if it has to. So this pair may appear in your `.env` without you putting it there; that's the walkthrough's [self-repair](../development/staging-walkthrough.md#when-the-walk-cant-get-in), and it reports what it minted. A pair you set by hand is never replaced.

### What a service-token request looks like at the Worker

This is the part that catches people out, because it is the opposite of what the two headers above suggest:

- **The two headers you sent are stripped at the edge.** `CF-Access-Client-Id` and `CF-Access-Client-Secret` do not reach your Worker; Access consumes them.
- **No email header is set.** Access sets `Cf-Access-Authenticated-User-Email` for a *human* who signed in through your identity provider. A service token has no email, so the header is simply absent. A Worker that authenticates by reading it therefore rejects **every machine caller** — CI, scripts, and WongStack's own [`/walk`](../development/staging-walkthrough.md) — with a `401`, while working fine in your browser. That asymmetry is why the header pattern looks correct right up until automation needs in.
- **What does arrive** is `cf-access-jwt-assertion` — the signed assertion — alongside the ordinary `cf-connecting-ip`, `cf-ipcountry`, `cf-ray`, and `cf-visitor`.

So the assertion is the only signal that covers humans and machines both. In its verified claims, a human carries `email` and a service token carries `common_name` (the token's Client ID, with `sub` an empty string) — one code path, both callers. That is what [`app/worker/access.ts`](cloudflare-access.md#the-auth-model-verify-the-signed-assertion) does, and why the Access runbook rejects plain header trust.

## Worker secrets are per environment

The credentials above are yours — they live in the primary worktree's `.env` and let *you* and an agent talk to Cloudflare. A **Worker secret** is different: it belongs to a deployed Worker, and the runtime reads it off `env`. An API key the Worker itself calls out with is this kind.

Secrets are scoped to a single Worker, and [staging is a separate Worker](d1-pipeline.md#why-staging-is-a-whole-worker). So every secret has to be put twice:

```bash
npx wrangler secret put GEMINI_API_KEY                  # the production Worker
npx wrangler secret put GEMINI_API_KEY --env staging    # the staging Worker
```

Forgetting the second one is the single most common staging failure, and it's the friendly kind — the binding is simply missing, so the Worker throws on first use rather than doing something subtly wrong. Add a secret to production and put it in staging in the same sitting.

Locally, the same values go in `.dev.vars` (git-ignored, per the [secrets convention](../development/secrets.md)) — `wrangler dev` reads that instead.

## Next

- What the token is used to build: [the provisioning skill](../../.claude/skills/wong-cloudflare/SKILL.md).
- Turning on a login wall: [Cloudflare Access](cloudflare-access.md).
- How staging gets its own Worker and its own bindings: [Deploy and data pipeline](d1-pipeline.md).
- Back to the stack overview: [Cloudflare stack](README.md).
