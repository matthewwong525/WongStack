---
name: wong-cloudflare
description: The one door to the Cloudflare stack pack. In a repo that hasn't taken the pack, it makes the offer itself, sets the manifest flag, lands the pack's files, and applies the config fragments; then — given one user-scoped API token holding just two permission groups — it widens the token's own permissions, resolves the account, creates the production and staging D1 databases, writes the env.staging binding with real ids, sets the GitHub repository secrets, ensures the Actions workflow is present, and reports the live URL. Also owns the opt-in Cloudflare Access branch (a login wall, adopted together with the Worker code change) and the teardown that removes what it created. Re-runnable at any time; a run without a token completes adoption and stops cleanly. Use when you want to adopt, provision, set up, deploy, or tear down the Cloudflare infrastructure — or when someone asks to make the app reachable at a real address.
user-invocable: true
---

# /wong-cloudflare

Turns a repo into a running app. The user does two things — sign up for Cloudflare, create one token — and this skill does the rest, including adopting the [stack pack](../wong-sync/references/payload-manifest.md#the-opt-in-stack-pack) if the repo hasn't taken it yet.

```
   the user's whole job                     everything below is this skill
   ─────────────────────────                ──────────────────────────────
   1. sign up at Cloudflare                 adopt the pack (if needed)
   2. create a token (two checkboxes)       widen the token
   3. paste it when asked                   resolve the account
                                            create prod + staging D1
                                            write the env.staging binding
                                            set the GitHub secrets
                                            ensure the workflow
                                            → hand back the URL
```

**Re-runnable, and expected to be.** The token usually arrives long after setup finished. Every step is idempotent: a resource that already exists is reused and reported, never duplicated — and a run with no token yet completes the adoption work and stops cleanly.

**Write for someone who does not know what a database is.** Every prompt names an outcome, every failure names the one thing to fix, and no step asks the user to invent a name. If you find yourself about to say `D1`, `binding`, or `9109`, say what it means instead.

## Boundaries

- **No git in this repo.** Everything this skill writes lands uncommitted; `/save` checkpoints it. Never commit, branch, push, or open a PR here.
- **`curl` only against Cloudflare.** Not `wrangler`, not a Node script — provisioning must work on a machine with no runtime installed. (`node` is fine in the pack's *build* scripts, which run in CI. See [required tools](../../../wiki/development/required-tools.md).)
- **Never print a token value.** Not in a summary, not in an error, not in a command you echo.
- **Ask before creating or deleting anything billable.** State what you're about to make, then make it.

## Step 0 — the door

Read `.claude/.wong-stack.json` (no manifest at all → WongStack isn't installed; point at `/wong-setup` and stop).

**`components.stackPack` is not `true`** → don't bounce; offer the pack here, in outcomes:

> *"Do you want this to be a real website people can open at an address? I can set up the hosting, the data storage, and automatic publishing — so every change you make gets its own link to look at before it goes live. It needs a free Cloudflare account and a few minutes. Totally optional; everything else works either way."*

Keep product names and file lists out of the prompt; have them ready for a user who asks. On a **no**, stop — nothing changes. On a **yes**:

1. Set `components.stackPack: true` in `.claude/.wong-stack.json`.
2. Land the pack's drop-in files: read and follow `.claude/skills/wong-sync/SKILL.md` **Steps 1–2 only** — refresh the cached clone, copy what's absent. The adapt step is not part of this.
3. Continue below.

**Whether the flag was just set or set long ago**, make sure the pack's config wiring is in: apply any missing **id-free fragments** — `package.json` scripts, `.env.example` variables, the `.gitignore` entries — as guided edits from [`stack-pack-fragments.md`](../wong-sync/references/stack-pack-fragments.md) (show → confirm → merge, never blind-write). The `wrangler.jsonc` block waits for Step 4, where the real ids exist; a missing wrangler config is created there from the fragment, not a reason to stop.

**No Cloudflare account or token yet?** Stop cleanly here: the files and wiring are in place, CI builds green without deploying, and a re-run with a token finishes the job. Say exactly that.

## Step 1 — the credential

### 1a. Make the file, not the user

Look for `.env` at the repo root. Absent → copy `.env.example` to `.env` yourself and say so plainly: *"I made a `.env` file for your settings. It's ignored by git, so what you put in it never leaves your machine."* Present → leave it alone.

Then confirm git actually ignores it: `git check-ignore -q .env`. If it does **not**, stop and fix `.gitignore` before asking for any secret. A token in a committed file is the one failure this skill must never cause.

### 1b. Ask for the token

If `CLOUDFLARE_API_TOKEN` in `.env` is empty, ask for it, giving the route from [the credentials page](../../../wiki/stack/cloudflare-credentials.md) — which owns the exact click path. The short form: **My Profile → API Tokens → Create Custom Token**, two permission rows (`User ▸ API Tokens ▸ Edit`, `Account ▸ API Tokens ▸ Edit`), and **Account Resources: Include → their account** — the field people miss, every time. They see the token once; two checkboxes is all it needs.

Have them paste it into `.env` (or paste it to you and write it yourself). Then re-read `.env` and continue.

### 1c. Verify before doing anything

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify
```

Success returns the token's own `id` — you need it in Step 2, and it costs no extra permission to learn.

**Translate every failure** using the [failure map](references/failure-map.md): the user gets the cause and the one fix, never `9109` or `Invalid API Token` as the headline. The two most common are a token made under the account instead of **My Profile**, and an unset **Account Resources** field — both are in the map with exact wording.

## Step 2 — the token widens itself

The user granted two permission groups; everything else, you grant yourself, on demand — which is what lets optional features cost nothing up front. Follow [the widen protocol](references/permission-groups.md): resolve group ids by name, `PUT` the widened set with the two API-token groups preserved, re-verify, and probe each added surface.

If the widen didn't take: **stop, provision nothing**, and list the permission names for the user to add by hand — that path still works, it's just more clicking.

## Step 3 — which account

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/accounts
```

- **Exactly one** → use it, and say which one you're using.
- **More than one** → list them by name and ask. Do not guess. Provisioning into the wrong account is annoying to undo.
- **Zero, with a valid token** → the Account Resources miss ([failure map](references/failure-map.md)). Explain, offer to re-check once they've saved it. Create nothing.

Write the chosen id to `CLOUDFLARE_ACCOUNT_ID` in `.env`.

## Step 4 — provision

Everything here is idempotent. Check first, create only what's missing, and report what you reused.

### 4a. Name things; don't ask

Derive every name from the repository name. State what you chose; never make the user invent one.

```
   repo "recipe-box"  →  database   recipe-box-db
                         staging    recipe-box-db-staging
                         worker     recipe-box          (or wrangler.jsonc's existing name)
                         staging    recipe-box-staging  (the env.staging name)
```

If a name is taken by something this repo didn't create, say so and offer a suffix. Only change a name if the user raises it.

### 4b. The two databases

`GET /accounts/{account_id}/d1/database` first — reuse anything already there by name. Otherwise `POST` each. You need both: production, and a staging copy that branch deploys run against so a branch can never write to real data.

Say it in those terms. *"Two databases: the real one, and a practice one your test versions use."*

### 4c. The binding

Merge the `wrangler.jsonc` fragment from [`stack-pack-fragments.md`](../wong-sync/references/stack-pack-fragments.md) with the **real ids you just created**: the production database in the top-level `d1_databases` entry, and the staging database inside `env.staging`'s own `d1_databases` entry — each with its own `database_name`, its own `migrations_dir`, and `env.staging` with its own Worker `name`. No config exists yet → create it from the fragment. The fragment's five rules (why the environment redeclares everything, the `migrations_dir` relative path, the cron-trigger exception) are owned there — follow them, don't restate them.

### 4d. GitHub secrets

```bash
gh secret set CLOUDFLARE_API_TOKEN  --body "<value from .env>"
gh secret set CLOUDFLARE_ACCOUNT_ID --body "<value from .env>"
```

This needs nothing from the user — the `repo` scope `gh auth login` already grants covers it, and `gh` seals the value with the repository's public key before sending. Neither value enters a committed file.

### 4e. The workflow

Confirm `.github/workflows/deploy.yml` exists (it ships with the pack; missing → the copy step in Step 0 didn't run — do it now). It's a thin driver: the [pipeline scripts own every deploy decision](../../../wiki/stack/d1-pipeline.md#ci-is-github-actions) — default branch to production, every other branch to the staging Worker plus a per-commit preview.

Check `gh auth status` for the `workflow` scope; missing → offer `gh auth refresh --scopes workflow`. [Why, and the failure it prevents](../../../wiki/development/required-tools.md#gh-needs-the-workflow-scope).

### 4f. First deploy

The workflow deploys on push, so the first deployment happens when `/save` pushes. Never push from here. A red build is `gh run view --log-failed` — the same surface `/save` and `/ship` already read; no Cloudflare credential needed to diagnose it.

Report the URLs — `GET /accounts/{account_id}/workers/subdomain` gives you `<subdomain>`; compute the patterns, don't ask:

```
   production   https://<worker>.<subdomain>.workers.dev
   previews     https://<branch>-<worker>-staging.<subdomain>.workers.dev
```

The preview line is a **pattern** — each commit's actual URL is harvested from the deploy's own output by CI ([how it reaches the tooling](../../../wiki/stack/d1-pipeline.md#how-the-alias-url-reaches-the-tooling)), never constructed by hand.

## Step 5 — the closing report

State, in plain language:

- The production URL, and the preview URL pattern with one branch filled in as an example
- What was adopted, created, and reused from a previous run
- That the changes are **uncommitted** — `/save` is the next step
- The offer to narrow the token back down ([the protocol](references/permission-groups.md), in reverse), and that they can always widen it again
- That the app is **public**: anyone with the link can open it. If they want a login wall, that's Step 6.

Do not end on a menu. End on the URL and the one next command.

## Step 6 — the login wall (only if asked)

Access is **opt-in**. Nothing above requires it, and a public app is a legitimate choice.

When someone does want it, two things happen together and must never be separated: widen into the Access groups ([the protocol](references/permission-groups.md)) and follow [the Access runbook](../../../wiki/stack/cloudflare-access.md), **and** change the Worker to read the identity header in the same step —

```
   public Worker + code that trusts Cf-Access-Authenticated-User-Email
        = anyone can send that header and become any user
```

— which is why the template Worker ships trusting nothing. One runbook step is **unverified**: creating the Zero Trust organization on an account that has never used Zero Trust. Say so, and give the dashboard fallback rather than implying it was proven.

## Teardown

Provisioning creates real, billable resources, so removing them is part of this skill rather than a follow-up. Given a repo it provisioned:

1. **Enumerate** what a run creates — the two databases, both Workers, and any Access resources — and show the list.
2. **Confirm** before deleting anything. Name each resource; deleting a database destroys its data.
3. **Delete** what this repo created.
4. **Report** what was removed *and what was skipped* — anything whose name doesn't match this repo, anything the user declined. Never delete by guess.

GitHub secrets and the workflow file are left in place unless asked; they hold no data and are harmless.

## Hard rules

- **The door never bounces.** A repo without the pack gets the offer here — on a yes this skill adopts (flag, files, fragments); it never sends the user to another command to come back later.
- **Idempotent.** Reuse, never duplicate. Report reuse as a success, not a warning.
- **Nothing committed.** `/save` owns that.
- **No token values in output**, ever.
- **Plain language at every failure.** The user should always know which single thing to fix.
- **Never assume the account.** Ask whenever the count isn't exactly one.
- **Names derived, not requested.**

Once this finishes, run `/save` to checkpoint — everything it wrote is sitting uncommitted.
