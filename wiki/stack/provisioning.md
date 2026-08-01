# Provisioning

Everything the [Cloudflare stack](README.md) needs, stood up from **one API token**. The user signs up and creates a token with two checkboxes; from there the whole path — permissions, databases, the binding, the CI wiring, the first deploy — is API calls an agent can make.

This is the runbook. [`/wong-cloudflare`](../../.claude/skills/wong-cloudflare/SKILL.md) executes it, and an agent without that skill can follow this page instead. If you're the person *doing* the setup rather than automating it, read [getting started](getting-started.md) — the same path in five steps and no jargon.

## What is and isn't automatable

Naming the manual steps honestly is half the value here:

| Step | Who | Why |
|---|---|---|
| Cloudflare signup | human | Account creation is a person with a browser. |
| The first token | human | Only the dashboard can issue one. Chicken and egg. |
| `gh auth login` | human | Interactive by design. |
| Everything below | **agent** | Plain REST, plus `gh` for secrets. |
| Zero Trust org (opt-in) | human-ish | See [the unverified step](#the-one-unverified-step). |

That's **two browser visits total**, both at signup. There is no "connect your repo" click, because CI is GitHub Actions rather than Workers Builds — Cloudflare's own CI [cannot be wired up through its API at all](#5-ci-wiring).

## 1. The token

The user creates it once, following the [click path on the credentials page](cloudflare-credentials.md#create-the-token). Two permission groups, plus the account in **Account Resources**:

```
   User    ▸ API Tokens ▸ Edit
   Account ▸ API Tokens ▸ Edit
   Account Resources: Include ▸ <their account>
```

Store it as `CLOUDFLARE_API_TOKEN` in `.env`, per the [secrets convention](../development/secrets.md). Create `.env` from `.env.example` for them and confirm git ignores it — never ask someone to hand-make a dotfile and verify their own ignore rules.

Verify before anything else:

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify
```

That returns the token's own `id`, which the next step needs and which costs no extra permission to learn. When it fails, translate — the raw codes name nothing useful. The two failures worth memorizing:

- **The token was made under the account, not the profile.** Cloudflare has two token screens; only `My Profile → API Tokens` produces a token that can reach `/user/*`. A new token is required — this one can't be converted.
- **`/accounts` returns `success: true, count: 0`.** Not an empty account: the **Account Resources** field was left unset. The existing token can be edited, so nothing needs re-pasting.

The full table is the skill's [failure map](../../.claude/skills/wong-cloudflare/references/failure-map.md).

## 2. The token widens itself

The user granted two permission groups. Everything else the agent grants itself:

```
   /user/tokens/verify              → own token id
   /user/tokens/{id}                → current policy document
   /user/tokens/permission_groups   → name → id  (392 groups; needs per_page=1000)
   PUT /user/tokens/{id}            → widened policy set
   /user/tokens/verify + a probe    → confirm it took
```

Verified working: a token holding only `API Tokens Write` widened itself across Workers, D1, Access, and Zero Trust, and nine endpoints went from `10000 Authentication error` to resolving. **The token id is stable across a widen**, so `.env` is written once and never rotated.

Three rules that are easy to get wrong:

- **Resolve ids by name at runtime.** Ids drift, and `Access: Apps and Policies Write` exists twice — match the copy whose `scopes` contain `com.cloudflare.api.account`, not the zone-scoped one. [Recorded ids](../../.claude/skills/wong-cloudflare/references/permission-groups.md) are a fallback, not the lookup.
- **The `PUT` replaces policies wholesale.** The new set must still carry `API Tokens Write` and `Account API Tokens Write`, or the token can never widen again — including on the next run, which is unrecoverable without a new token.
- **Preserve the existing `resources` block.** Rebuilding it is how you end up with a token that verifies and sees no accounts.

Grant only what the current job needs. A normal provision wants `Workers Scripts Write`, `D1 Write`, `Account Settings Read`, `Workers CI Read`, and `User Details Read`. The Access groups are added **only** when someone asks for a login wall — which is what makes [Access opt-in](#the-one-unverified-step) genuinely free.

> **This token is effectively account-root.** A token that can widen itself is bounded only by what its owner can do, so calling it "narrow" because it starts with two checkboxes would be a lie. Self-widening and least privilege are mutually exclusive; this design chose usability. Narrowing back afterward is the same call in reverse, and is offered rather than automatic.

## 3. Which account

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/accounts
```

Ask whenever the count isn't exactly one. `wrangler`'s usual single-account shortcut breaks for anyone with a personal and a work account, and provisioning into the wrong one is tedious to undo. Zero accounts with a valid token is the Account Resources miss from step 1 — explain the field, create nothing.

Write the id to `CLOUDFLARE_ACCOUNT_ID` in `.env`.

## 4. Resources

Everything here is idempotent: check first, create what's missing, report what was reused.

**Names are derived from the repo name and stated, never asked.** Someone setting this up has no opinion about what to call a database, and asking is a place to stall.

| What | Endpoint | Notes |
|---|---|---|
| Production database | `POST /accounts/{id}/d1/database` | `GET` first; reuse by name. |
| Staging database | same | The practice copy every preview binds. |
| Worker subdomain | `GET /accounts/{id}/workers/subdomain` | Gives the URL pattern — compute it, don't ask. |

Write both ids into the wrangler config's `d1_databases` entry — production as `database_id`, staging as `preview_database_id`. Keep them distinct; [the preview swap](d1-pipeline.md#the-scripts) refuses to run when they match. `migrations_dir` resolves relative to the wrangler config, not the repo root, so the `app/` layout needs `../schema/migrations` — get it wrong and wrangler reports no migrations instead of erroring.

## 5. CI wiring

```bash
gh secret set CLOUDFLARE_API_TOKEN  --body "<value>"
gh secret set CLOUDFLARE_ACCOUNT_ID --body "<value>"
```

**Secrets need nothing from the user.** The `repo` scope `gh auth login` already grants covers them, and `gh` seals each value with the repository's public key before sending, so nothing transits or lands in plaintext.

The workflow file is the one place this leg bites:

> Pushing `.github/workflows/*.yml` requires the **`workflow`** OAuth scope, which is **not** in `gh auth login`'s minimum set (`repo`, `read:org`, `gist`). Without it the push fails with `refusing to allow an OAuth App to create or update workflow` — at push time, long after setup reported success.

Check `gh auth status` for it *before* relying on a push, and repair with `gh auth refresh --scopes workflow`. [`/wong-setup`](../../.claude/skills/wong-setup/SKILL.md) requests it during the browser visit it already performs, so a repo set up after this change never hits it.

The workflow ships with the pack and is deliberately thin — it sets `CF_BRANCH` and runs `cf-build.sh` then `cf-deploy.sh`, which already own the entire branch split. **Choosing Actions changes no deploy behavior**: the same scripts decide which Worker a branch lands on, so production, the staging Worker, and the per-commit preview alias all work exactly as [the pipeline](d1-pipeline.md) describes.

Before the secrets exist the workflow builds without deploying, so an unprovisioned repo gets a real PR check rather than a permanently red one.

**Why Actions rather than Cloudflare's own Workers Builds:** Builds cannot be connected to a repo through its API at all — no repo connection, no branch config, no first trigger — so it costs three dashboard steps per repo forever, and its GitHub App needs browser OAuth that `gh` can't grant. Actions is `gh secret set` plus a file, it produces a real pull-request check, and a red build is `gh run view --log-failed` — the surface `/save` and `/ship` already read. The honest costs: Actions minutes are billable on private repos (2,000/month free; public unlimited), and the credentials also live in GitHub secrets.

## 6. The result

```
   production   https://<worker>.<subdomain>.workers.dev
   previews     https://<branch>-<worker>.<subdomain>.workers.dev
```

Everything provisioning writes — the wrangler config, `.env` — is **uncommitted**. `/save` checkpoints it, and the push is what triggers the first release.

Say plainly that the app is **public**: anyone with the link can open it. That's a legitimate default and most adopters want it.

## The one unverified step

Authentication is opt-in, and the reason is partly evidential. Creating a Zero Trust organization on an account that has **never** onboarded Zero Trust — `POST /accounts/{id}/access/organizations` — could not be tested during design, because both available accounts already had an org. Plan selection may be dashboard-only on a cold account.

So: [Access](cloudflare-access.md) is documented rather than provisioned, and if the API call fails on a cold account, the fallback is the dashboard. This page would rather say *untested* than imply otherwise.

Everything else on this page was run against the live API.

## Teardown

Provisioning creates real, billable resources, so removing them ships with it rather than after. Enumerate → confirm → delete → **report what was skipped as well as what went**. Never delete by guess: a database whose name doesn't match this repo is someone else's.

This matters most for repeated fresh-repo testing, where every run otherwise leaks a Worker and two databases.

## Next

- The five-step version for the person doing it: [getting started](getting-started.md).
- The token screen in detail: [Cloudflare credentials](cloudflare-credentials.md).
- What happens on every push afterward: the [D1 pipeline](d1-pipeline.md).
- Adding a login wall: [Cloudflare Access](cloudflare-access.md).
- Back to the stack overview: [Cloudflare stack](README.md).
