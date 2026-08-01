---
name: wong-cloudflare
description: Stand the Cloudflare app up from a single API token — the provisioning leg of the stack pack. Given one user-scoped token holding just two permission groups, it widens its own permissions, resolves the account, creates the production and staging D1 databases, writes the binding into wrangler.jsonc, sets the GitHub repository secrets, ensures the Actions workflow is present, and deploys — then reports the live URL. Also owns the opt-in Cloudflare Access branch (a login wall, adopted together with the Worker code change) and the teardown that removes what it created. Only for a repo that took the stack pack (components.stackPack true). Use when you want to provision, set up, deploy, or tear down the Cloudflare infrastructure — hosting, the databases, or the deploy pipeline — or when someone asks to make the app reachable at a real address.
user-invocable: true
---

# /wong-cloudflare

Turns a repo that took the [stack pack](../wong-sync/references/payload-manifest.md#the-opt-in-stack-pack) into a running app. The user does two things — sign up for Cloudflare, create one token — and this skill does the rest.

```
   the user's whole job                     everything below is this skill
   ─────────────────────────                ──────────────────────────────
   1. sign up at Cloudflare                 widen the token
   2. create a token (two checkboxes)       resolve the account
   3. paste it when asked                   create prod + staging D1
                                            write the binding
                                            set the GitHub secrets
                                            ensure the workflow
                                            → hand back the URL
```

**Re-runnable, and expected to be.** The token usually arrives long after `/wong-setup` finished. Every step is idempotent: a resource that already exists is reused and reported, never duplicated.

**Write for someone who does not know what a database is.** Every prompt names an outcome, every failure names the one thing to fix, and no step asks the user to invent a name. If you find yourself about to say `D1`, `binding`, or `9109`, say what it means instead.

## Boundaries

- **No git in this repo.** Everything this skill writes lands uncommitted; `/save` checkpoints it. Never commit, branch, push, or open a PR here.
- **`curl` only against Cloudflare.** Not `wrangler`, not a Node script — provisioning must work on a machine with no runtime installed. (`node` is fine in the pack's *build* scripts, which run in CI. See [required tools](../../../wiki/development/required-tools.md).)
- **Never print a token value.** Not in a summary, not in an error, not in a command you echo.
- **Ask before creating or deleting anything billable.** State what you're about to make, then make it.

## Step 0 — the gate

Read `.claude/.wong-stack.json`. If `components.stackPack` is not `true`, stop:

> This repo didn't take the Cloudflare stack pack, so there's nothing to provision. If you want to add it, run `/wong-sync` — it'll offer the pack.

Also confirm the repo has a wrangler config (`wrangler.jsonc`, `wrangler.json`, or `wrangler.toml`, at the root or one directory down). No config means the pack's files never landed; point at `/wong-sync`.

## Step 1 — the credential

### 1a. Make the file, not the user

Look for `.env` at the repo root.

- **Absent, and `.env.example` exists** → copy `.env.example` to `.env` yourself. Say so plainly: *"I made a `.env` file for your settings. It's ignored by git, so what you put in it never leaves your machine."*
- **Absent, and no `.env.example`** → the pack's fragment never landed. Point at `/wong-sync`.
- **Present** → leave it alone.

Then confirm git actually ignores it: `git check-ignore -q .env`. If it does **not**, stop and fix `.gitignore` before asking for any secret. A token in a committed file is the one failure this skill must never cause.

### 1b. Ask for the token — with the exact click path

If `CLOUDFLARE_API_TOKEN` in `.env` is empty, ask for it. Give the route literally; do not paraphrase the screen. The full walkthrough is [the credentials page](../../../wiki/stack/cloudflare-credentials.md), and the short version is:

```
   Cloudflare dashboard
     → My Profile  (the avatar menu, top right — NOT the account/Workers area)
     → API Tokens
     → Create Token
     → Create Custom Token  ("Get started" next to it)

   Permissions — add these two rows:
     User    ▸ API Tokens ▸ Edit
     Account ▸ API Tokens ▸ Edit

   Account Resources:
     Include ▸ <their account>        ← the field people miss
```

Call out **Account Resources** every time. It is the most-missed field on the screen, and skipping it produces a token that looks valid and can do nothing.

Two things to say while they're there:

- They see the token **once**. Copy it before leaving the page.
- Two checkboxes is all it needs. The skill grants itself anything else, on demand, and can hand the permissions back afterward.

Have them paste it into `.env` (or paste it to you and write it yourself). Then re-read `.env` and continue.

### 1c. Verify before doing anything

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify
```

Success returns the token's own `id` — you need it in Step 2, and it costs no extra permission to learn.

**Translate every failure.** The raw response is for you; the user gets the cause and the fix. See [failure map](references/failure-map.md) for the full table. The two that matter most:

| What you see | What to tell them |
|---|---|
| `/user/tokens/verify` rejects the token | It was made in the wrong place — under the account instead of **My Profile**. Cloudflare has two token screens and only the profile one works here. Walk them back through 1b. |
| Token verifies, but the account list (Step 3) comes back empty | The **Account Resources** field was left unset. They can edit the existing token — no need to make a new one — and add `Include → <account>`. |

Never show `9109`, `10000`, or `Invalid API Token` as the headline. Keep the raw response available if they ask.

## Step 2 — the token widens itself

The user granted two permission groups. Everything else, you grant yourself. This is the mechanism that lets optional features cost nothing up front — someone who never wants a login wall never ticks a Zero Trust box.

```
   /user/tokens/verify              → your own token id
   /user/tokens/{id}                → your current policy document
   /user/tokens/permission_groups   → name → id lookup
   PUT /user/tokens/{id}            → the widened set
   /user/tokens/verify + a probe    → confirm it took
```

**Resolve permission-group ids by name at runtime**, from `/user/tokens/permission_groups`. Do not hardcode ids from a doc — they drift, and one name is ambiguous. Where two groups share a name, select the one whose `scopes` contains `com.cloudflare.api.account`; `Access: Apps and Policies Write` exists twice and the zone-scoped copy is the wrong one. [Recorded ids](references/permission-groups.md) are a fallback and a test fixture, not the lookup path.

For a normal provision, widen into:

| Group | For |
|---|---|
| `Workers Scripts Write` | deploying the Worker |
| `D1 Write` | creating databases, applying migrations |
| `Account Settings Read` | resolving account context |
| `Workers CI Read` | reading build state (Cloudflare files Builds under "CI" — searching for "build" finds nothing) |
| `User Details Read` | self-verification |

Add the Access groups **only** when the user asks for a login wall (Step 6).

**The `PUT` replaces the policy list wholesale.** The new set must still contain `API Tokens Write` (user scope) and `Account API Tokens Write` (account scope) — drop them and the token can never widen again, including on the next run. Preserve the existing account resource block as-is rather than rebuilding it.

Re-verify, then probe one endpoint per permission you added. If the widen didn't take:

> Stop. Provision nothing. Report which surfaces are unavailable and list the permission names for the user to add by hand — that path still works, it's just more clicking.

Cloudflare could restrict self-escalation in future. This check is what makes that arrive as a clear message instead of a confusing half-provision.

## Step 3 — which account

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/accounts
```

- **Exactly one** → use it, and say which one you're using.
- **More than one** → list them by name and ask. Do not guess, and do not fall back to whatever `wrangler` would pick. People commonly have a personal account and a work one, and provisioning into the wrong one is annoying to undo.
- **Zero, with a valid token** → this is the Account Resources miss from Step 1c. Explain the field, offer to re-check once they've saved it. Create nothing.

Write the chosen id to `CLOUDFLARE_ACCOUNT_ID` in `.env`.

## Step 4 — provision

Everything here is idempotent. Check first, create only what's missing, and report what you reused.

### 4a. Name things; don't ask

Derive every name from the repository name. State what you chose; never make the user invent one.

```
   repo "recipe-box"  →  database   recipe-box-db
                         staging    recipe-box-db-staging
                         worker     recipe-box          (or wrangler.jsonc's existing name)
```

If a name is taken by something this repo didn't create, say so and offer a suffix. Only change a name if the user raises it.

### 4b. The two databases

`GET /accounts/{account_id}/d1/database` first — reuse anything already there by name. Otherwise `POST` each. You need both: production, and a staging copy that previews run against so a branch can never write to real data.

Say it in those terms. *"Two databases: the real one, and a practice one your test versions use."*

### 4c. The binding

Write both ids into the wrangler config's `d1_databases` entry — production as `database_id`, staging as `preview_database_id`. Keep the two distinct; the preview swap refuses to run when they match.

`migrations_dir` is resolved **relative to the wrangler config**, not the repo root. In the `app/` layout that means `../schema/migrations`. Get it wrong and wrangler reports no migrations rather than erroring — a silent failure worth checking once.

### 4d. GitHub secrets

```bash
gh secret set CLOUDFLARE_API_TOKEN  --body "<value from .env>"
gh secret set CLOUDFLARE_ACCOUNT_ID --body "<value from .env>"
```

This needs nothing from the user — the `repo` scope `gh auth login` already grants covers it, and `gh` seals the value with the repository's public key before sending. Neither value enters a committed file.

### 4e. The workflow

Confirm `.github/workflows/deploy.yml` exists (it ships with the pack). Missing means `/wong-sync` didn't land it — say so rather than authoring one here.

The workflow is a thin driver: it sets `CF_BRANCH` and runs [`cf-build.sh`](../../../wiki/stack/d1-pipeline.md#the-scripts) then [`cf-deploy.sh`](../../../wiki/stack/d1-pipeline.md#the-scripts), which already own the whole branch split — default branch to the production Worker, every other branch to the staging Worker plus a preview alias. Nothing about the deploy model changes with CI; the same scripts run either way.

**Check the `workflow` OAuth scope before relying on the push.** It is *not* in `gh auth login`'s default set (`repo`, `read:org`, `gist`), and without it pushing a workflow file fails at push time with `refusing to allow an OAuth App to create or update workflow`:

```bash
gh auth status    # look for 'workflow' in the token scopes
```

Missing → have them run `gh auth refresh --scopes workflow` and explain why in plain language: *"GitHub needs your permission before a tool can add an automated deploy step. This is that permission."*

### 4f. First deploy

The workflow deploys on push, so the first deployment happens when `/save` pushes. Never push from here.

A red build is `gh run view --log-failed` — the same surface `/save` and `/ship` already read. No Cloudflare credential needed to diagnose it.

Report the URLs:

```
   production   https://<worker>.<subdomain>.workers.dev
   previews     https://<branch>-<worker>.<subdomain>.workers.dev
```

`GET /accounts/{account_id}/workers/subdomain` gives you `<subdomain>` — compute the URLs, don't ask.

## Step 5 — the closing report

State, in plain language:

- The production URL, and the preview URL pattern with one branch filled in as an example
- What was created, and what was reused from a previous run
- That the changes are **uncommitted** — `/save` is the next step
- The offer to narrow the token back down (Step 2 in reverse), and that they can always widen it again
- That the app is **public**: anyone with the link can open it. If they want a login wall, that's Step 6.

Do not end on a menu. End on the URL and the one next command.

## Step 6 — the login wall (only if asked)

Access is **opt-in**. Nothing above requires it, and a public app is a legitimate choice.

When someone does want it, two things happen together and must never be separated:

1. **Widen into the Access groups** (`Access: Apps and Policies Write`, `Access: Organizations, Identity Providers, and Groups Write`, `Access: Service Tokens Write`) — account-scoped copies, resolved by name — then follow [the Access runbook](../../../wiki/stack/cloudflare-access.md).
2. **Change the Worker to read the identity header**, in the same step.

```
   public Worker + code that trusts Cf-Access-Authenticated-User-Email
        = anyone can send that header and become any user
```

That is why the template Worker ships trusting nothing. The header is only meaningful once a proxy in front is guaranteed to set it, so the code change is part of adopting Access — never a step ahead of it.

One step in that runbook is **unverified**: creating the Zero Trust organization on an account that has never used Zero Trust. Both accounts available during design already had one, so it couldn't be tested. Say so, and give the dashboard fallback rather than implying it was proven.

## Teardown

Provisioning creates real, billable resources, so removing them is part of this skill rather than a follow-up. Given a repo it provisioned:

1. **Enumerate** what a run creates — the two databases, the Worker, and any Access resources — and show the list.
2. **Confirm** before deleting anything. Name each resource; deleting a database destroys its data.
3. **Delete** what this repo created.
4. **Report** what was removed *and what was skipped* — anything whose name doesn't match this repo, anything the user declined. Never delete by guess.

GitHub secrets and the workflow file are left in place unless asked; they hold no data and are harmless.

## Hard rules

- **Idempotent.** Reuse, never duplicate. Report reuse as a success, not a warning.
- **Nothing committed.** `/save` owns that.
- **No token values in output**, ever.
- **Plain language at every failure.** The user should always know which single thing to fix.
- **Never assume the account.** Ask whenever the count isn't exactly one.
- **Names derived, not requested.**

Once this finishes, run `/save` to checkpoint — the wrangler config and `.env` changes are sitting uncommitted.
