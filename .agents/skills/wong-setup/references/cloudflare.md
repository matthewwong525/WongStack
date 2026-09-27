# Provision Cloudflare

This runbook turns a fresh WongStack install into a running app with session memory. [`/wong-setup`](../SKILL.md) runs Step 1 before it plans the install, `/apply` runs Steps 2–5 after the payload lands, and `/wong-sync` follows the parts an update adds.

```
   the user's whole job                     everything below is this runbook
   ─────────────────────────                ──────────────────────────────
   1. sign up at Cloudflare                 widen the user token
   2. create a token (two permission rows)  resolve the account
   3. paste it when asked                   create the memory store
                                            create prod + staging D1
                                            write the wrangler config
                                            mint the CI deploy token → GitHub
                                            → hand back the URL after /save
```

**Idempotent.** Every step checks first, reuses what exists, and reports the reuse as a success. A run that stopped partway runs again from the top.

**Write for someone who does not know what a database is.** Name outcomes and the one fix, never make the user invent a name, and explain `D1`, `binding`, or `9109` instead of saying them.

## Boundaries

- **No commits or pushes.** Step 1a makes the GitHub repository; everything else lands uncommitted for `/save`.
- **`curl` against Cloudflare, not `wrangler`**, so no app dependency is needed. Node only applies the memory schema and reads JSON ([required tools](../../../../wiki/development/required-tools.md)).
- **Never print a token value** — not in a summary, an error, or an echoed command.
- **The user token stays on the host**, only in the primary worktree's `.env`. It never becomes a GitHub secret, and no step copies it.
- **Ask before creating or deleting anything billable.** State what you will make, then make it. Every question is [a choice with a recommendation](../../explore/references/asking-the-user.md).
- **The widen and the two mints are [pre-authorized](../../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized):** do them, then report them.

## Step 1 — the credential

### 1a. The GitHub repository

The repository must exist before Step 4d sets its secret. Check GitHub before any Cloudflare call:

```bash
gh auth status
[ -e .git ] || git init -b main
git remote get-url origin || gh repo create "$(basename "$PWD")" --private --source . --remote origin
```

- **`gh auth status` fails** → **stop before any Cloudflare call** and run [the GitHub sign-in](tools.md#2-the-github-sign-in) again: setup signed the person in before the clone, so this is a later sign-out. Nothing is created.
- **`origin` exists** → use it; create nothing.

### 1b. Make the file, not the user

Resolve the durable credential file before accepting a value, through the source checkout's [shared lookup](../../memory/scripts/lib/primary-root.mjs) (the target has no skills yet), never from a hosting tool's directory names. [The secrets convention](../../../../wiki/development/secrets.md#the-two-files) owns the rules.

```bash
ACTIVE_ROOT=$(git rev-parse --show-toplevel)
PRIMARY_ROOT=$(node "<source checkout>/.agents/skills/memory/scripts/lib/primary-root.mjs")
DURABLE_ENV="$PRIMARY_ROOT/.env"
ACTIVE_ENV="$ACTIVE_ROOT/.env"
```

If the lookup exits non-zero, stop **before** asking for the token and say the primary worktree could not be resolved safely. Never fall back to the linked checkout.

Confirm Git ignores the destination: `git -C "$PRIMARY_ROOT" check-ignore -q .env`. In a fresh folder, first add the `.env*` / `!.env.example` and `.dev.vars*` / `!.dev.vars.example` pairs to the file `git rev-parse --path-format=absolute --git-path info/exclude` returns, then re-check; the install still commits the `.gitignore` fragment. If the re-check fails, stop before accepting a secret.

Absent `DURABLE_ENV` → create it with the blank `CLOUDFLARE_*` lines from the source's [`.env.example`](../../../../.env.example) and say: *"I made a private `.env` file. Git ignores it, so its values stay on this machine."* Present → leave it alone.

If `ACTIVE_ROOT` differs from `PRIMARY_ROOT` and `ACTIVE_ENV` is a regular file, not a symlink, [leave it untouched](../../../../wiki/development/secrets.md#unseeded-linked-worktree-copies): never read its values to compare, print them, delete either file, or merge one into the other. Say: *"This linked worktree also has its own `.env`. I am using the durable primary-worktree copy and left the duplicate untouched."*

Every later `.env` means `DURABLE_ENV`. To write a variable, replace only its exact `KEY=` line or append that one line; keep every other line.

### 1c. Ask for the token

If `CLOUDFLARE_API_TOKEN` in `DURABLE_ENV` is empty, ask for it with the click path from [the credentials page](../../../../wiki/stack/cloudflare-credentials.md#create-the-token), calling out **Account Resources**, the field people miss. Say what it is for: *"This token stays on this computer. I use it to set up your hosting and to make a smaller token for automatic publishing."*

They paste it into the durable file, or to you and you write that one variable. Re-read `DURABLE_ENV`, export the value without printing it, and continue. **No token → setup stops here and writes nothing else**; pasting the token later continues from this step.

### 1d. Verify before doing anything

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify
```

Success returns the token's own `id`, which Step 2 needs. **Translate every failure** with the [failure map](failure-map.md): give the cause and the one fix, never `9109` or `Invalid API Token` as the headline.

## Step 2 — the token widens itself

**Do this without asking ([pre-authorized](../../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized)), then report what you granted.** Follow [the widen protocol](permission-groups.md). Grant only the groups in [a normal provision](permission-groups.md#a-normal-provision), and the Access groups only when a user asks for a login wall.

If the widen did not take: **stop, provision nothing**, and list the permission names for the user to add by hand.

## Step 3 — which account

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/accounts
```

- **Exactly one** → use it, and say which.
- **More than one** → **stop and ask.** Offer each account by name and id, wait for an explicit choice, and **create nothing until you have it**. Never infer the account from the repo name, the email, or the API's order.
- **Zero, with a valid token** → the Account Resources miss ([failure map](failure-map.md)). Explain, offer to re-check once they save it, and create nothing.

Write the chosen id narrowly to `CLOUDFLARE_ACCOUNT_ID` in `DURABLE_ENV`.

## Step 4 — provision

Ask once before the billable parts, as [a two-option choice](../../explore/references/asking-the-user.md): *"Set it up (Recommended) — your private memory store, a real database and a practice one, and automatic publishing"* or *"Stop here — nothing is created on Cloudflare"*.

### 4a. Name things; don't ask

Derive every name from the repository name and state it; never make the user invent one.

```
   repo "recipe-box"  →  database   recipe-box-db
                         staging    recipe-box-db-staging
                         worker     recipe-box
                         staging    recipe-box-staging  (the env.staging name)
                         memory     recipe-box-memory   (database and bucket, bound
                                                         to the production Worker only)
                         CI token   recipe-box-deploy
```

If a name is taken by something this repo did not create, say so and offer a suffix.

Apply the id-free config fragments now — `package.json` scripts, `.env.example` variables, the `.gitignore` entries — from [`stack-pack-fragments.md`](../../wong-sync/references/stack-pack-fragments.md). The `package.json` fragment's `db:migrate:staging` and `db:migrate:prod` are **filled, not copied**, with the literal names above: no copied payload file may carry a database name.

### 4b. The memory store

[The memory convention](../../../../wiki/development/memory.md) owns what it holds and who can read it. It is a separate database with no staging twin, bound only by the production Worker for the memory route under `/_memory/`; staging and previews never bind it.

1. **Is R2 on?** `GET /accounts/{account_id}/r2/buckets` succeeds → yes. An error saying to enable R2 → no: R2 needs a payment method on file, and no token can turn it on. Give the dashboard step (**Storage & databases → R2 → Overview → add the R2 subscription**) and continue without a bucket: *"Memory works without it; it just won't keep full session transcripts until R2 is on."*
2. **The database.** Reuse `<repo>-memory` from `GET /accounts/{account_id}/d1/database`, or `POST` it.
3. **The bucket, only when R2 is on.** Reuse or `POST /accounts/{account_id}/r2/buckets` with `{"name":"<repo>-memory"}`. Never turn on public access.
4. **Record** the ids under `components.memory` in `.claude/.wong-stack.json` — `accountId`, `databaseId`, `database`, and `bucket` (or `null`) — and the memory URL as `worker`: `https://<worker>.<subdomain>.workers.dev/_memory`, with `<subdomain>` from `GET /accounts/{account_id}/workers/subdomain`. None of them is a secret.
5. **Apply the schema.** With `M="node $(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs"`, run `$M migrate`. With a Worker recorded, it runs with `CLOUDFLARE_API_TOKEN`.
6. **The admin key.** Run `$M member add "$(git config user.email)" --admin --env`; it writes the key to `CLOUDFLARE_MEMORY_TOKEN` in the primary checkout's `.env` and never prints it. It needs `D1 Write`; widen if it names it. Mint no Cloudflare token for memory. Teammates [join through GitHub](../../../../wiki/development/memory.md#joining-through-github) once CI has deployed production. **Never** set the key as a GitHub secret: CI must not read transcripts.

Memory answers once CI deploys production; until then, facts wait in the local spool.

**Re-runs.** A store that verifies is current; create nothing. A store with no bucket, on an account that now has R2, gets one: create and record it, add `MEMORY_BUCKET` to the production config, and give `<repo>-deploy` the R2 row of [the CI deploy token table](permission-groups.md#the-ci-deploy-token). The key does not change.

**Moving an older store.** A store whose `CLOUDFLARE_MEMORY_TOKEN` is an old `<repo>-memory` Cloudflare token (not a `wongm_` key) moves to the production Worker. The old token works until the last step, because only a memory key goes to the Worker.
1. In the sync change: the memory route in `app/worker/index.ts` (the [app scaffold](../../wong-sync/references/payload-manifest.md#the-app-scaffold)'s one import and branch), `MEMORY_DB` and `MEMORY_BUCKET` in the production config as in 4c, `worker` in the install record as in step 4, the R2 row on `<repo>-deploy` when the store has a bucket, and `$M migrate`.
2. After that change merges and production deploys, run step 6, then check `$M digest` through the Worker.
3. Only when that passes, delete the old token: find `<repo>-memory` in `GET /user/tokens`, then `DELETE /user/tokens/{id}`.

If the check fails, put the old token back in `.env` and stop. Teammates who held the old token get a key on their next session by [joining through GitHub](../../../../wiki/development/memory.md#joining-through-github); `member add` is the fallback for someone without GitHub access.

### 4c. The two app databases and the config

`GET /accounts/{account_id}/d1/database` first — reuse by name. Otherwise `POST` each: production, and a staging copy for branch deploys, so a branch never writes real data. Say it plainly: *"Two databases: the real one, and a practice one your test versions use."*

Create `app/wrangler.jsonc` from the `wrangler.jsonc` fragment in [`stack-pack-fragments.md`](../../wong-sync/references/stack-pack-fragments.md) with the **real ids**: production's in the top-level `d1_databases` entry, staging's inside `env.staging`'s own `d1_databases` entry, and the 4b memory store at the top level only — `MEMORY_DB`, plus `MEMORY_BUCKET` when it has a bucket. Follow the fragment's own rules. Keep its Worker entry point and settings (`main`, `assets`, `compatibility_date`, `compatibility_flags`): the fragment is the only thing that creates this file. The [app scaffold](../../wong-sync/references/payload-manifest.md#the-app-scaffold) brought `worker/index.ts` and the site; never ask the user to write a Worker.

The same Worker serves the [mini apps](../../../../wiki/stack/mini-apps.md) under `/apps/`; they need no Worker or config of their own.

**Moving older mini apps.** An install with `mini-apps/wrangler.jsonc` runs mini apps on their own Workers, `<repo>-mini` and `<repo>-mini-staging`. They move to the main Worker:
1. In the sync change: the `/apps/` route in `app/worker/index.ts` (the [app scaffold](../../wong-sync/references/payload-manifest.md#the-app-scaffold)'s import and branch), `assets.binding` and `run_worker_first` from the `wrangler.jsonc` fragment, and deletion of `mini-apps/wrangler.jsonc`, `mini-apps/worker.ts`, `mini-apps/tsconfig.json`, `mini-apps/.gitignore`, and `mini-apps/apps/.assetsignore`.
2. After that change merges and production deploys, open `/apps/` and each saved app's `/apps/<name>/` on the production address.
3. Only when they answer, delete both Workers: `DELETE /accounts/{account_id}/workers/scripts/<repo>-mini`, then the same for `<repo>-mini-staging`. Then delete the `staging-mini` GitHub environment, if there is one.

If an app does not answer, keep the old Workers and stop.

### 4d. The CI deploy token

CI gets its own narrow token, never the user token ([why](../../../../wiki/stack/cloudflare-credentials.md#the-ci-deploy-token)).

```bash
# Find an existing token by name first.
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/tokens?per_page=100"
```

- **No `<repo>-deploy` token** → `POST /accounts/{account_id}/tokens` with the name `<repo>-deploy`, one policy with the groups in [the CI deploy token table](permission-groups.md#the-ci-deploy-token) (the `always` rows, plus a conditional row only when the wrangler config needs it), and `resources` limited to `com.cloudflare.api.account.<account_id>`. Pipe the response's `result.value` straight into the secret, so the value is never in a variable, a file, or the terminal:

  ```bash
  curl -s -X POST -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/tokens" --data @policy.json \
    | node -e 'const j=JSON.parse(require("fs").readFileSync(0));if(!j.success){console.error(JSON.stringify(j.errors));process.exit(1)}process.stdout.write(j.result.value)' \
    | gh secret set CLOUDFLARE_API_TOKEN
  gh secret set CLOUDFLARE_ACCOUNT_ID --body "$CLOUDFLARE_ACCOUNT_ID"
  ```

  Write `policy.json` to a temporary file outside the repo and delete it after; it holds no secret.
- **The token exists and `gh secret list` shows `CLOUDFLARE_API_TOKEN`** → current; change nothing.
- **The token exists and the secret is missing, or the user asks to rotate** → roll it with `PUT /accounts/{account_id}/tokens/{token_id}/value` and pipe that response's `result` into `gh secret set CLOUDFLARE_API_TOKEN` the same way.

`gh secret set` needs only the `repo` scope `gh auth login` grants. Say what the token can do: *"Automatic publishing uses its own small key. It can update your site and its databases, and nothing else."*

### 4e. The workflow

Confirm `.github/workflows/deploy.yml` exists; it ships with the payload, and [the pipeline scripts own every deploy decision](../../../../wiki/stack/d1-pipeline.md#ci-is-github-actions).

Check `gh auth status` for the `workflow` scope; missing → offer `gh auth refresh --scopes workflow` ([why](../../../../wiki/development/required-tools.md#gh-needs-the-workflow-scope)).

### 4f. First deploy

The workflow deploys on push, so the first deploy happens when `/save` pushes. Never push from here. Diagnose a red build with `gh run view --log-failed`; it needs no Cloudflare credential.

`GET /accounts/{account_id}/workers/subdomain` gives `<subdomain>`; compute the patterns, don't ask:

```
   production   https://<worker>.<subdomain>.workers.dev
   previews     https://<branch>-<worker>-staging.<subdomain>.workers.dev
```

The preview line is a **pattern**; CI harvests each commit's real URL from the deploy output ([how](../../../../wiki/stack/d1-pipeline.md#how-the-alias-url-reaches-the-tooling)).

**Say the URL may not work for a minute or two.** A new `workers.dev` hostname briefly serves a `404` or Cloudflare's *"There is nothing here yet"* placeholder after the first deploy. Warn before handing it over, or the user concludes the deploy failed.

### 4g. Smoke-test what you built

After `/save` reports the first deploy, fetch the production URL once and check it; never report a URL you did not fetch.

```bash
curl -s -o /dev/null -w '%{http_code}' "https://<worker>.<subdomain>.workers.dev/"
```

A public app returns `200`. Retry across the propagation window before calling it a failure; on a real mismatch, name the request and its answer. [The Access runbook](../../../../wiki/stack/cloudflare-access.md#verify-it-works--in-a-browser) checks an app behind a login wall, not this step.

Once production has deployed, check memory with `$M digest`, which reads through the production Worker with the admin key from 4b. Before that, the digest reports that the Worker does not answer yet.

## Step 5 — the closing report

State, in plain language:

- Session memory: on, with or without transcripts, only when 4g's digest answered. Otherwise: *"Memory starts once your site first goes live; until then, what I learn waits on this computer."*
- The production URL, and the preview URL pattern with one branch filled in as an example
- What was created, and what was reused from a previous run
- What the user token was granted, that it stays in `.env` on this computer, and that it can be [narrowed back](../../../../wiki/stack/cloudflare-credentials.md#narrowing-back)
- That CI publishes with its own small key, `<repo>-deploy`
- That the app is **public**: anyone with the link can open it. A login wall is [the Access runbook](../../../../wiki/stack/cloudflare-access.md).

End on the URL and the one next step. With the starter app, that step is: open the URL and copy the message in the box at the top into this chat; it walks the person through their first change.
