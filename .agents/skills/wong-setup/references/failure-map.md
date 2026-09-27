# Failure map

This page maps what the Cloudflare API returns to **the one thing the user should change**: `10000 Authentication error` is what a correctly-made token returns when one checkbox is missing, and it never says which. [The provisioning runbook](cloudflare.md) uses it to translate; the raw response stays available for an agent to read, but never leads the message.

## The rule

> Say the cause and the fix. Never lead with a code.

```
   ✗ "Provisioning failed: 9109 Unauthorized to access requested resource"

   ✓ "The token can't see your account yet — the Account Resources field
      on the token screen was left unset. You can edit the token you already
      made: set Account Resources to Include → your account, save, and I'll
      re-check. No need to create a new one."
```

## The map

### Token creation

| Symptom | Cause | What to say |
|---|---|---|
| `POST /user/tokens/verify` → `1000 Invalid API Token`, but account-scoped calls work | Token was created under **Account → API Tokens**, not **My Profile → API Tokens** | Only the profile token screen works here. Walk them back through the click path; a new token is needed, since this one can't be converted. |
| `GET /user` → `9109` | `User Details Read` is missing | Cosmetic, self-verification only. Mention it; don't block. |
| `GET /user/tokens` → `9109` | `API Tokens Write` is missing | The widen can't run. Add the permission, or grant the full list by hand. |
| `GET /accounts` → `success: true`, `count: 0` | **Account Resources** was left unset | The most common miss. Edit the existing token; no new one needed. |
| Any account-scoped call → `10000 Authentication error` | The permission for that surface isn't granted, or the account isn't in scope | Non-empty `/accounts` → a permission; empty → the resources field. Check in that order. |

`count: 0` with `success: true` is the tell: Cloudflare reports an out-of-scope account as *no accounts*, not an error, so an unset field reads like an empty account.

### Widening

| Symptom | Cause | What to say |
|---|---|---|
| The run stalls at the widen step, asking the user whether it may change the token's permissions | The standing authorization wasn't read | Handing over a two-permission token *is* the consent ([the standing authorization](../../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized)). Widen, then report what you granted; asking here is a failure mode, not caution. |
| `PUT /user/tokens/{id}` → `4xx` | Malformed policy, or a permission the owner doesn't have | A token reaches only as far as its owner. If the user isn't a full account admin, someone who is must grant the missing permissions. |
| `PUT` succeeds, re-probe still fails | Propagation, or the group id was wrong | Re-probe once. Still failing → resolve the id by name again and check the `com.cloudflare.api.account` scope ([the traps](permission-groups.md#the-two-traps)). |
| Widen works, next run can't widen | `API Tokens Write` was dropped from the replaced policy set | Unrecoverable via API; a new token is needed. Both original groups must survive every `PUT`. |

### Provisioning

| Symptom | Cause | What to say |
|---|---|---|
| D1 create → name conflict | A database of that name exists | Reuse it if this repo made it; otherwise offer a suffix. Never delete to make room. |
| `wrangler` reports no migrations to apply | `migrations_dir` is resolved relative to the wrangler config, not the repo root | In the `app/` layout it must be `../schema/migrations`. Fails silently; check it once. |
| `cf-deploy.sh` refuses: branch resolves to the production Worker | `env.staging` has no `name` of its own (or the environment wasn't applied at build time) | Declare `name: <worker>-staging` inside `env.staging`; for a vite-plugin build, confirm `CLOUDFLARE_ENV=staging` was set at build time. The guard worked: nothing was deployed. |
| A pack script stops: staging database not declared | `env.staging` lacks its own `d1_databases` entry | Add the staging twin's `database_name` (and id) inside the environment block; the scripts refuse to touch production. |

### GitHub

| Symptom | Cause | What to say |
|---|---|---|
| Push rejected: `refusing to allow an OAuth App to create or update workflow` | The `workflow` OAuth scope is missing | `gh auth refresh --scopes workflow`, a quick browser consent ([why](../../../../wiki/development/required-tools.md#gh-needs-the-workflow-scope)). Check **before** the first push. |
| `gh secret set` → `HTTP 403` | No admin rights on the repo | Secrets need admin; on someone else's repo, the owner sets them. |
| The workflow runs but Cloudflare auth fails | Secrets not set, or set on the wrong repo | Confirm with `gh secret list`. The values live in the primary worktree's `.env` per the secrets convention and can be set again anytime. |
| A feature branch deployed over production | `CF_PRODUCTION_BRANCH` doesn't match the repo's default branch | The workflow reads it from the repo, so the default branch was renamed. `cf-deploy.sh`'s log line prints both. |

## What not to do

- **Don't retry a permission error**; it fails identically. Fix the cause.
- **Don't create a second token** when the first can be edited: the id is stable, so the value already in the primary worktree's `.env` stays valid.
- **Don't paraphrase the dashboard.** "Set the account resources" isn't enough; name the field and the value, in on-screen order.
- **Don't print the token** while debugging. Print its id, which `/user/tokens/verify` returns and is safe to show.
