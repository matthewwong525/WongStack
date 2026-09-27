# Cloudflare credentials

One token gets everything running. Create it with **two permission rows** and save it in the primary worktree's `.env`. The agent then grants it only the permissions each step needs — [provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md), build logs, and (only if you want it) the [Access](cloudflare-access.md) login wall — and tells you what it granted. This user token stays on your computer. CI gets a [separate, smaller token](#the-ci-deploy-token).

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

**[Open the token form, filled in](https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22api_tokens%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_api_tokens%22%2C%22type%22%3A%22edit%22%7D%5D&accountId=*&zoneId=all&name=WongStack)**, signed in to Cloudflare. It opens under My Profile, named `WongStack`, for all accounts.

1. Check the form shows exactly two rows: **User · API Tokens · Edit** and **Account · API Tokens · Edit**.
2. **Continue to summary → Create Token.**
3. Copy the token. Cloudflare shows it once.

The link asks for all accounts, so the Account Resources field people miss in the steps below is already set. If you have two accounts, the agent asks which one to use.

Two permission rows really are the whole ask. The agent adds only the groups a step needs, when it needs them: Workers, D1, and account settings for provisioning, and the Access groups only if you ask for a login wall. The [widen protocol](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/permission-groups.md#a-normal-provision) lists each one.

### If the link doesn't work

If the form opens with a row missing, or doesn't open at all, make the token by hand. Follow this literally. It's four menu steps, two permission rows, and one field people miss.

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

## Store it

```bash
# Cloudflare — user-scoped API token from My Profile → API Tokens.
# Two permissions: User ▸ API Tokens ▸ Edit, Account ▸ API Tokens ▸ Edit.
CLOUDFLARE_API_TOKEN=
# Your Cloudflare account ID (dashboard → Workers & Pages → right sidebar).
CLOUDFLARE_ACCOUNT_ID=
```

`.env.example` uses these same two names, blank. Provisioning creates the primary worktree's durable `.env` from the active branch's example, confirms the destination is ignored, and fills `CLOUDFLARE_ACCOUNT_ID` once it knows which account you picked. The [secrets convention](../development/secrets.md) owns worktree resolution and duplicate-file handling.

> **This page owns the token variable's name.** `CLOUDFLARE_API_TOKEN` is what wrangler reads natively, and what `scripts/cf-secrets.mjs`, `.github/workflows/deploy.yml`, setup's provisioning, and the GitHub repository secret all read. On your computer it holds the user token; in the GitHub secret it holds the [CI deploy token](#the-ci-deploy-token). One name keeps wrangler and the workflow unchanged. Every other surface that mentions it — the `.env.example` template, the [config fragment](../../.agents/skills/wong-sync/references/stack-pack-fragments.md#envexample--cloudflare-variables) — links here rather than restating it, so there is one place to change and no second definition to drift from.
>
> **Renaming it is a behavioural change, not a docs edit.** The name has flipped between `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_USER_TOKEN` three times across releases, in both directions, because a rename in a template looks exactly like prose in review. It isn't: it changes what a provisioned repo does. A change to this name is a release with a `CHANGELOG.md` entry, like any other behavioural change — and the symptom when it's wrong is silent, since a token under an unread name looks identical to "not provisioned yet".

### The CI deploy token

**CI never gets the user token.** The user token can mint other tokens, so a copy in CI would let any workflow in the repo take over the account. Provisioning uses it to mint an account-owned token named `<repo>-deploy`, with only `Workers Scripts Write`, `D1 Write`, and `Account Settings Read` on your account ([the list](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/permission-groups.md#the-ci-deploy-token)). The value goes straight from Cloudflare to `gh secret set CLOUDFLARE_API_TOKEN` and is written to no file. `CLOUDFLARE_ACCOUNT_ID` goes beside it.

So each credential lives in one place: the user token in the primary worktree's git-ignored `.env`, and the deploy token in GitHub's sealed secret store. To rotate the deploy token, ask your agent; it rolls the value and sets the secret again. You see the token in the dashboard under **Manage Account → Account API Tokens**, where you or a teammate can revoke it. (A repo on the Workers Builds fallback needs no secret: that CI runs inside Cloudflare.)

The session memory store needs no Cloudflare token of its own. Provisioning uses this token to create the store and to write your memory key to `CLOUDFLARE_MEMORY_TOKEN`, which never becomes a GitHub secret. [The memory page](../development/memory.md#the-memory-key) owns that name and what a key can reach.

## How two permission rows become enough

The token rewrites its own permissions: it reads its own policy, looks permission groups up by name, and `PUT`s itself a wider set. Verified against the live API. **The token id doesn't change**, so the durable `.env` is written once — no rotation, no re-paste. [The widen protocol](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/permission-groups.md) owns the calls, the rules that keep the token able to widen again, and every group granted for a normal setup or an [Access](cloudflare-access.md) login wall. Someone who never wants a login wall never grants anything Zero-Trust-shaped.

### The widen is pre-authorized

> **This page owns the standing authorization.** Providing a token that carries these two permission groups **is** the permission to widen it, and to mint the CI deploy token and write the memory key with it — the groups exist for no other purpose, and a token that couldn't widen itself would be useless here. An agent that reaches the widen performs it and reports which permissions it granted; it does not stop to ask whether it may change the token's scope. Every other surface that instructs an agent to widen links here.

The authorization covers the widen and nothing else:

- **Creating or deleting anything billable still asks first.** Widening costs nothing; a database is a different question.
- **A widen that fails or doesn't verify still stops the run.** Nothing is provisioned on an unconfirmed permission set.
- **Narrowing back is still offered, never assumed.** Below.

Read it against [the trade-off](#the-security-trade-off-stated-plainly): this is a real grant, on a token that is effectively account-root.

### Narrowing back

The same call in reverse: provision, hand the extra permissions back, widen again next time. Offered, never automatic. The two API-token groups must stay in the policy, or the token can never widen again. Narrowing the user token does not touch the deploy token or memory keys.

## The security trade-off, stated plainly

**A token that can widen itself is effectively account-root.** It is bounded only by what its owner can do. The two-row starting point is cosmetic, not a security boundary, and this page won't pretend otherwise.

Self-widening and least privilege are mutually exclusive, and this design chose usability: you visit the dashboard once either way, so ticking two boxes instead of nine saves a real step — and it means optional features cost nothing up front. If you'd rather have least privilege, grant the specific groups above by hand and skip the widening; everything downstream works the same.

Treat the token like a root password. Its one copy lives in the primary worktree's git-ignored `.env`. Provisioning never sends it to GitHub and never creates a linked-worktree copy; CI gets the [deploy token](#the-ci-deploy-token) instead.

## Access service token

Only for an [Access](cloudflare-access.md) login wall: the ID/secret pair that lets CI, a script, or `/verify` reach a gated preview without a browser. [Cloudflare Access](cloudflare-access.md#5-create-the-service-token-do-it-now) owns how to create and store it, and [the auth model](cloudflare-access.md#the-auth-model-verify-the-signed-assertion) owns what reaches the Worker.

## Worker secrets are per environment

The credentials above are yours: they let *you* and an agent talk to Cloudflare. A **Worker secret** belongs to a deployed Worker, which reads it off `env` — an API key the Worker calls out with, say. [Staging is a separate Worker](d1-pipeline.md#why-staging-is-a-whole-worker), so each secret goes to both. [One declared list of secrets](d1-pipeline.md#one-declared-list-of-secrets-two-workers) owns how: `app/.dev.vars`, `npm run secrets:push`, and the parity check.

## Next

- What the token is used to build: [the provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md).
- Turning on a login wall: [Cloudflare Access](cloudflare-access.md).
- How staging gets its own Worker and its own bindings: [Deploy and data pipeline](d1-pipeline.md).
- Back to the stack overview: [Cloudflare stack](README.md).
