# Failure map

This page maps what the Cloudflare API returns to **the one thing the user should change**. A correctly made token missing one checkbox returns `10000 Authentication error`, which never says which. [The provisioning runbook](cloudflare.md) translates with it; an agent may read the raw response, but it never leads the message.

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

### Getting the computer ready

[Get the computer ready](tools.md) stops on each of these with nothing written, except a helper that fails to install; running setup again starts from the check.

| Symptom | Cause | What to say |
|---|---|---|
| The person says no to an install | They'd rather not add the tool | Name what it is for (*"Node.js runs the planning and memory tools; without it, setup can't continue"*), and that a yes later picks up here. |
| An install asks for a password, or `sudo -n true` fails | The system installer needs admin rights the agent can't type | Use the user-folder route. Stop only when that fails too, naming the failed download. |
| `agent-browser` or `cloudflared` is still missing after its install | A download failed, or the system refused it | Don't stop. Name it and what it's for (*"The tool that sends you a private link to my browser didn't install"*), say you'll offer it again the first time you need it, and continue. |
| `git` is missing on Linux with no passwordless `sudo` | `git` has no user-folder route | Ask them to install Git from their system's software app, then run setup again. |
| No `one-time code` line in `gh`'s output | `gh` failed before the browser step, or changed its wording | Show the output's last line and offer one more try. Never guess a code. |
| `gh auth status` still fails after they said done | The approval wasn't finished, or ran in another GitHub account | Start the sign-in again for a fresh code: *"The approval didn't reach me. Here's a new code."* |
| The email lookup returns nothing | No verified primary email on the GitHub account, or `user:email` is missing | Ask them to verify an email at [GitHub's email settings](https://github.com/settings/emails), then check again. |
| The link test still fails with Developer Mode on | The setting needs a new session, or policy blocks links | Ask them to reopen the agent app, then test again. On a work computer, IT may have to allow Developer Mode. |

### Token creation

| Symptom | Cause | What to say |
|---|---|---|
| `POST /user/tokens/verify` → `1000 Invalid API Token`, but account-scoped calls work | Made under **Account → API Tokens**, not **My Profile → API Tokens** | Only the profile token screen works, and this token can't be converted. Walk them through the click path for a new one. |
| `GET /user` → `9109` | `User Details Read` is missing | Cosmetic, self-verification only. Mention it; don't block. |
| `GET /user/tokens` → `9109` | `API Tokens Write` is missing | The widen can't run. Add the permission, or grant the full list by hand. |
| `GET /accounts` → `success: true`, `count: 0` | **Account Resources** was left unset | The most common miss. Edit the existing token; no new one needed. |
| Any account-scoped call → `10000 Authentication error` | A missing permission for that surface, or the account is out of scope | Non-empty `/accounts` → a permission; empty → the resources field. Check in that order. |

`count: 0` with `success: true` is the tell: Cloudflare reports an out-of-scope account as *no accounts*, not an error, so an unset field looks like an empty account.

### Widening

| Symptom | Cause | What to say |
|---|---|---|
| The run stalls at the widen, asking whether it may change the token's permissions | The standing authorization wasn't read | Handing over a two-permission token *is* the consent ([the standing authorization](../../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized)). Widen, then report what you granted; asking is a failure, not caution. |
| `PUT /user/tokens/{id}` → `4xx` | Malformed policy, or a permission the owner lacks | A token reaches only as far as its owner; if the user isn't a full account admin, an admin must grant the missing permissions. |
| `PUT` succeeds, re-probe still fails | Propagation, or a wrong group id | Re-probe once. Still failing → resolve the id by name again and check the `com.cloudflare.api.account` scope ([the traps](permission-groups.md#the-two-traps)). |
| Widen works, next run can't widen | `API Tokens Write` was dropped from the replaced policy set | Unrecoverable by API; a new token is needed. Both original groups must survive every `PUT`. |

### Provisioning

| Symptom | Cause | What to say |
|---|---|---|
| D1 create → name conflict | A database of that name exists | Reuse it if this repo made it; else offer a suffix. Never delete to make room. |
| `wrangler` reports no migrations to apply | `migrations_dir` resolves from the wrangler config, not the repo root | In the `app/` layout it must be `../schema/migrations`. It fails silently; check it once. |
| `cf-deploy.sh` refuses: branch resolves to the production Worker | `env.staging` has no `name` of its own, or the environment wasn't applied at build time | Declare `name: <worker>-staging` inside `env.staging`; for a vite-plugin build, confirm `CLOUDFLARE_ENV=staging` at build time. The guard worked: nothing deployed. |
| A pack script stops: staging database not declared | `env.staging` lacks its own `d1_databases` entry | Add the staging twin's `database_name` (and id) inside the environment block; the scripts refuse to touch production. |

### GitHub

| Symptom | Cause | What to say |
|---|---|---|
| Push rejected: `refusing to allow an OAuth App to create or update workflow` | The `workflow` OAuth scope is missing | `gh auth refresh --scopes workflow`, a quick browser consent ([why](../../../../wiki/development/required-tools.md#gh-needs-the-workflow-scope)). Check **before** the first push. |
| `gh secret set` → `HTTP 403` | No admin rights on the repo | Secrets need admin; on someone else's repo, the owner sets them. |
| The workflow runs but Cloudflare auth fails | Secrets unset, or set on the wrong repo | Confirm with `gh secret list`. The values live in the primary worktree's `.env` and can be set again anytime. |
| A feature branch deployed over production | `CF_PRODUCTION_BRANCH` doesn't match the default branch | The workflow reads it from the repo, so the default branch was renamed. `cf-deploy.sh`'s log line prints both. |

## What not to do

- **Don't retry a permission error**; it fails the same way. Fix the cause.
- **Don't make a second token** when the first can be edited: the id is stable, so the value in the primary worktree's `.env` stays valid.
- **Don't paraphrase the dashboard.** "Set the account resources" isn't enough; name the field and value, in on-screen order.
- **Don't print the token** while debugging. Print its id, which `/user/tokens/verify` returns and is safe to show.
