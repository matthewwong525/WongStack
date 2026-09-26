# Provision Cloudflare

This runbook turns a fresh WongStack install into a running app with session memory. [`/wong-setup`](../SKILL.md) asks for the token (Step 1) before it plans the install. `/apply` runs Steps 2–5 after the payload lands. `/wong-sync` follows the parts an update adds. The user does two things: sign up for Cloudflare and create one token.

```
   the user's whole job                     everything below is this runbook
   ─────────────────────────                ──────────────────────────────
   1. sign up at Cloudflare                 widen the user token
   2. create a token (two checkboxes)       resolve the account
   3. paste it when asked                   create the memory store
                                            create prod + staging D1
                                            write the wrangler config
                                            mint the CI deploy token → GitHub
                                            → hand back the URL after /save
```

**Idempotent.** Every step checks first, reuses what exists, and reports the reuse as a success. A run that stopped partway runs again from the top.

**Write for someone who does not know what a database is.** Every prompt names an outcome, every failure names the one thing to fix, and no step asks the user to invent a name. If you are about to say `D1`, `binding`, or `9109`, say what it means instead.

## Boundaries

- **No commits or pushes.** Step 1a makes the folder a GitHub repository; everything else this runbook writes lands uncommitted, and `/save` checkpoints it.
- **`curl` against Cloudflare, not `wrangler`.** Provisioning needs no app dependency installed. Node, which OpenSpec already requires, is used only to apply the memory schema and to read one value out of a JSON response. See [required tools](../../../../wiki/development/required-tools.md).
- **Never print a token value.** Not in a summary, not in an error, not in a command you echo.
- **The user token stays on the host.** It lives only in the primary worktree's `.env`. It never becomes a GitHub secret, and no step copies it anywhere else.
- **Ask before creating or deleting anything billable.** State what you are about to make, then make it. Every question is [a choice with a recommendation](../../explore/references/asking-the-user.md), in the plain voice above.
- **The widen and the two mints are not in that rule's scope — do them, then report them.** They cost nothing and are reversible, and a user who pastes a two-permission token has authorized them ([the standing authorization](../../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized)).

## Step 1 — the credential

### 1a. The GitHub repository

CI reads its deploy key from a GitHub secret, so the repository must exist before Step 4d. Check GitHub before any Cloudflare call:

```bash
gh auth status
[ -e .git ] || git init -b main
git remote get-url origin || gh repo create "$(basename "$PWD")" --private --source . --remote origin
```

- **`gh auth status` fails** → **stop before any Cloudflare call**, and tell the user to run `gh auth login`. Nothing is created.
- **`origin` exists** → use it, and create nothing.

### 1b. Make the file, not the user

Resolve the durable credential file before asking for or accepting a value. Do not infer worktrees from a hosting tool's directory names; ask Git:

```bash
ACTIVE_ROOT=$(git rev-parse --show-toplevel)
GIT_DIR=$(git rev-parse --path-format=absolute --git-dir)
COMMON_DIR=$(git rev-parse --path-format=absolute --git-common-dir)

if [ "$GIT_DIR" = "$COMMON_DIR" ]; then
  PRIMARY_ROOT="$ACTIVE_ROOT"
else
  PRIMARY_ROOT=$(dirname "$COMMON_DIR")
fi

git -C "$PRIMARY_ROOT" rev-parse --show-toplevel
DURABLE_ENV="$PRIMARY_ROOT/.env"
ACTIVE_ENV="$ACTIVE_ROOT/.env"
```

The last command must resolve back to `PRIMARY_ROOT`. If any command fails or the paths disagree, stop **before** asking for the token: say the primary worktree could not be resolved safely. Never fall back to the linked checkout.

Confirm Git ignores the destination: `git -C "$PRIMARY_ROOT" check-ignore -q .env`. In a fresh folder the committed `.gitignore` does not exist yet, so add the `.env*` / `!.env.example` and `.dev.vars*` / `!.dev.vars.example` pairs to the file returned by `git rev-parse --path-format=absolute --git-path info/exclude`, then re-run the check. This is immediate local protection; the install still commits the `.gitignore` fragment. If the re-check fails, stop before accepting a secret.

Absent `DURABLE_ENV` → create it with the blank `CLOUDFLARE_*` lines from the source's [`.env.example`](../../../../.env.example) and say plainly: *"I made a private `.env` file. Git ignores it, so its values stay on this machine."* Present → leave it alone.

If `ACTIVE_ROOT` differs from `PRIMARY_ROOT` and `ACTIVE_ENV` is a regular file rather than a symlink, preserve it untouched and say: *"This linked worktree also has its own `.env`. I am using the durable primary-worktree copy and left the duplicate untouched."* Do not read values for comparison, print them, delete either file, or merge one into the other.

Every later reference to `.env` means `DURABLE_ENV`. When writing a variable, replace only its exact `KEY=` line or append that one line; preserve every unrelated line.

### 1c. Ask for the token

If `CLOUDFLARE_API_TOKEN` in `DURABLE_ENV` is empty, ask for it, giving the route from [the credentials page](../../../../wiki/stack/cloudflare-credentials.md), which owns the click path. The short form: **My Profile → API Tokens → Create Custom Token**, two permission rows (`User ▸ API Tokens ▸ Edit`, `Account ▸ API Tokens ▸ Edit`), and **Account Resources: Include → their account**, the field people miss. Say what it is for: *"This token stays on this computer. I use it to set up your hosting and to make a smaller token for automatic publishing."*

Have them paste it into the durable file, or paste it to you and narrowly write the one variable yourself. Re-read `DURABLE_ENV`, export the value for the calls below without printing it, and continue. **No token → setup stops here and writes nothing else**; pasting the token later continues setup from this step.

### 1d. Verify before doing anything

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify
```

Success returns the token's own `id`, which Step 2 needs. **Translate every failure** with the [failure map](failure-map.md): the user gets the cause and the one fix, never `9109` or `Invalid API Token` as the headline. The two common ones are a token made under the account instead of **My Profile**, and an unset **Account Resources** field.

## Step 2 — the token widens itself

**Do this without asking, and report what you granted afterward.** Follow [the widen protocol](permission-groups.md): resolve group ids by name, `PUT` the widened set with the two API-token groups preserved, re-verify, and probe each added surface. The user granted two groups; this runbook grants itself only the groups in [a normal provision](permission-groups.md#a-normal-provision), and the Access groups only when a user asks for a login wall.

If the widen did not take: **stop, provision nothing**, and list the permission names for the user to add by hand.

## Step 3 — which account

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/accounts
```

- **Exactly one** → use it, and say which one you are using.
- **More than one** → **stop and ask.** Make each account an option with its name and id, wait for an explicit choice, and **create nothing until you have it**. Never infer the account from the repo name, the email, or the order the API returned them. A personal token often sees a personal account *and* a shared work one; undoing a wrong choice means deleting resources from an account you may not administer.
- **Zero, with a valid token** → the Account Resources miss ([failure map](failure-map.md)). Explain, offer to re-check once they have saved it. Create nothing.

Write the chosen id narrowly to `CLOUDFLARE_ACCOUNT_ID` in `DURABLE_ENV`.

## Step 4 — provision

Ask once before the billable parts, as [a two-option choice](../../explore/references/asking-the-user.md): *"Set it up (Recommended) — your private memory store, a real database and a practice one, and automatic publishing"* or *"Stop here — nothing is created on Cloudflare"*.

### 4a. Name things; don't ask

Derive every name from the repository name. State what you chose; never make the user invent one.

```
   repo "recipe-box"  →  database   recipe-box-db
                         staging    recipe-box-db-staging
                         worker     recipe-box
                         staging    recipe-box-staging  (the env.staging name)
                         memory     recipe-box-memory   (database and bucket)
                         shared     wong-memory         (the account's memory Worker,
                                    wong-memory-keys     and its keys database)
                         CI token   recipe-box-deploy
```

If a name is taken by something this repo did not create, say so and offer a suffix.

Apply the id-free config fragments now — `package.json` scripts, `.env.example` variables, the `.gitignore` entries — from [`stack-pack-fragments.md`](../../wong-sync/references/stack-pack-fragments.md). The `package.json` fragment's `db:migrate:staging` and `db:migrate:prod` are **filled, not copied**: write the literal names above, because no copied payload file may carry a database name.

### 4b. The memory store

[The memory convention](../../../../wiki/development/memory.md) owns what it holds and who can read it. It is a separate database with no staging twin, and the app's Worker never binds it.

1. **Is R2 on?** `GET /accounts/{account_id}/r2/buckets`. Success means yes. An error that says to enable R2 means no: R2 needs a payment method on file, and no token can turn it on. Give the dashboard step (**Storage & databases → R2 → Overview → add the R2 subscription**) and continue without a bucket: *"Memory works without it; it just won't keep full session transcripts until R2 is on."*
2. **The database.** Reuse `<repo>-memory` from `GET /accounts/{account_id}/d1/database`, or `POST` it.
3. **The bucket, only when R2 is on.** Reuse or `POST /accounts/{account_id}/r2/buckets` with `{"name":"<repo>-memory"}`. Buckets are private by default; never turn on public access.
4. **Record** the ids under `components.memory` in `.claude/.wong-stack.json` — `accountId`, `databaseId`, `database`, and `bucket` (or `null`). They are not secrets.
5. **Attach the memory Worker.** With `M="node $(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs"`, run `$M worker deploy`. It creates the account's `wong-memory` Worker and `wong-memory-keys` database the first time, attaches this repo's database and bucket, keeps every other repo's attachment, and records the Worker URL. It needs `Workers Scripts Write` and `D1 Write`; widen for a permission it names.
6. **Apply the schema** with `$M migrate`. With a Worker recorded, it runs with `CLOUDFLARE_API_TOKEN`.
7. **The admin key.** Run `$M member add "$(git config user.email)" --admin --env`. It writes the key to `CLOUDFLARE_MEMORY_TOKEN` in the primary checkout's `.env` and never prints it. Mint no Cloudflare token for memory. **Never** set the key as a GitHub secret: CI must not read transcripts.
8. **Verify** with `$M digest`: it reads through the Worker with the new key.

**Re-runs.** A store that verifies is current; create nothing. A store with no bucket, on an account that now has R2, gets its bucket: create it, record it, and run `$M worker deploy` to attach it. The key does not change.

**Moving an older store.** A store with no `components.memory.worker` still reaches Cloudflare with an old `<repo>-memory` token. Move it in this order:
1. Run steps 5 and 7.
2. Check `$M digest` through the Worker.
3. Only when that passes, delete the old token: find `<repo>-memory` in `GET /user/tokens`, then `DELETE /user/tokens/{id}`.

If the check fails, put the old token back in `.env` and stop. Teammates who held the old token need a member key: [add a teammate](../../../../wiki/development/memory.md#add-or-remove-a-teammate).

### 4c. The two app databases and the config

`GET /accounts/{account_id}/d1/database` first — reuse by name. Otherwise `POST` each: production, and a staging copy that branch deploys run against, so a branch can never write to real data. Say it in those terms: *"Two databases: the real one, and a practice one your test versions use."*

Create `app/wrangler.jsonc` from the `wrangler.jsonc` fragment in [`stack-pack-fragments.md`](../../wong-sync/references/stack-pack-fragments.md) with the **real ids**: the production database in the top-level `d1_databases` entry, and the staging database inside `env.staging`'s own `d1_databases` entry. The fragment's rules are owned there — follow them, don't restate them. The config carries the Worker entry point as well as the ids (`main`, `assets`, `compatibility_date`, `compatibility_flags`), because the fragment is the only thing that creates this file. The [app scaffold](../../wong-sync/references/payload-manifest.md#the-app-scaffold) brought `worker/index.ts` and the site; never ask the user to write a Worker.

### 4d. The CI deploy token

CI gets its own narrow token, never the user token. The user token can mint tokens, so a copy in CI would let any workflow take over the account.

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

  Write `policy.json` outside the repo (a temporary file), and delete it after. It holds no secret.
- **The token exists and `gh secret list` shows `CLOUDFLARE_API_TOKEN`** → current; change nothing.
- **The token exists and the secret is missing, or the user asks to rotate** → roll it with `PUT /accounts/{account_id}/tokens/{token_id}/value` and pipe that response's `result` into `gh secret set CLOUDFLARE_API_TOKEN` the same way.

`gh secret set` needs only the `repo` scope that `gh auth login` grants, and seals the value before it leaves the machine. Say what the token can do: *"Automatic publishing uses its own small key. It can update your site and its databases, and nothing else."*

### 4e. The workflow

Confirm `.github/workflows/deploy.yml` exists; it ships with the payload. It is a thin driver: [the pipeline scripts own every deploy decision](../../../../wiki/stack/d1-pipeline.md#ci-is-github-actions).

Check `gh auth status` for the `workflow` scope; missing → offer `gh auth refresh --scopes workflow`. [Why, and the failure it prevents](../../../../wiki/development/required-tools.md#gh-needs-the-workflow-scope).

### 4f. First deploy

The workflow deploys on push, so the first deployment happens when `/save` pushes. Never push from here. A red build is `gh run view --log-failed`; no Cloudflare credential is needed to diagnose it.

`GET /accounts/{account_id}/workers/subdomain` gives `<subdomain>`; compute the patterns, don't ask:

```
   production   https://<worker>.<subdomain>.workers.dev
   previews     https://<branch>-<worker>-staging.<subdomain>.workers.dev
```

The preview line is a **pattern**. CI harvests each commit's real URL from the deploy output ([how it reaches the tooling](../../../../wiki/stack/d1-pipeline.md#how-the-alias-url-reaches-the-tooling)).

**Say the URL may not work for a minute or two.** A new `workers.dev` hostname serves a `404` or Cloudflare's *"There is nothing here yet"* placeholder for a short time after the first deploy. Warn before handing it over, because a user who sees a placeholder unwarned concludes the deploy failed.

### 4g. Smoke-test what you built

After `/save` reports the first deploy, fetch the production URL once and check it. A run that reports a URL it never fetched is reporting a guess.

```bash
curl -s -o /dev/null -w '%{http_code}' "https://<worker>.<subdomain>.workers.dev/"
```

A public app returns `200`. Retry across the propagation window before calling it a failure, and on a real mismatch name the request and what it returned. An app behind a login wall is checked by [the Access runbook](../../../../wiki/stack/cloudflare-access.md#verify-it-works--in-a-browser), not here.

## Step 5 — the closing report

State, in plain language:

- Session memory: on, with or without transcripts
- The production URL, and the preview URL pattern with one branch filled in as an example
- What was created, and what was reused from a previous run
- What the user token was granted, that it stays in `.env` on this computer, and that it can be [narrowed back](../../../../wiki/stack/cloudflare-credentials.md#narrowing-back)
- That CI publishes with its own small key, `<repo>-deploy`
- That the app is **public**: anyone with the link can open it. A login wall is [the Access runbook](../../../../wiki/stack/cloudflare-access.md).

End on the URL and the one next command.

## Hard rules

- **Idempotent.** Reuse, never duplicate. Report reuse as a success, not a warning.
- **Nothing committed.** `/save` owns that.
- **No token values in output**, ever. The deploy token's value goes from the API response to `gh secret set` through a pipe and nowhere else.
- **The user token never leaves the host.**
- **Plain language at every failure.** The user always knows which single thing to fix.
- **Never assume the account.** Ask whenever the count is not exactly one.
- **Names derived, not requested.**
