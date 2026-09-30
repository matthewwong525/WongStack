# Provision Cloudflare

This runbook turns a fresh WongStack install into a running app with session memory. [`/wong-setup`](../SKILL.md) runs Step 1 before it plans the install, `/apply` runs Steps 2–5 after the payload lands, and `/wong-sync` follows the parts an update adds.

**Idempotent.** Reuse existing owned resources; resume a stopped run from the top.

**Write for someone who does not know what a database is**, in [plain words](../../explore/references/asking-the-user.md#write-in-plain-words): name outcomes and the one fix, and explain `D1`, `binding`, or `9109` instead of saying them.

## Boundaries

- **No commits or pushes.** Step 1a makes the GitHub repository; everything else lands uncommitted for `/save`.
- **One script does the Cloudflare work, not `wrangler`**, so no app dependency is needed: [`provision.mjs`](../scripts/provision.mjs), in the source checkout, needs only Node ([required tools](../../../../wiki/development/required-tools.md)); the server installer runs it too. Each command prints one JSON report: created, reused, names, URLs. A stop exits 1 with `error.reason` (`token`, `cloudflare`, or `repo`) and a plain `error.cause`; translate it with the [failure map](failure-map.md).
- **Never print a token value**: not in a summary, an error, or an echoed command.
- **The user token stays on the host**, only in the primary worktree's `.env`. No step copies it or makes it a GitHub secret.
- **Ask before creating or deleting anything billable**, as [a choice with a recommendation](../../explore/references/asking-the-user.md): say what you will make, then make it.
- **The widen and the two mints are [pre-authorized](../../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized):** do them, then report them.

## Step 1 — the credential

### 1a. The GitHub repository

Step 4d sets a secret on the repository, so check GitHub first, before any Cloudflare call:

```bash
gh auth status
[ -e .git ] || git init -b main
git remote get-url origin || gh repo create "$(basename "$PWD")" --private --source . --remote origin
```

- **`gh auth status` fails** → the person signed out since setup signed them in. **Stop before any Cloudflare call**, create nothing, and rerun [the GitHub sign-in](tools.md#2-the-github-sign-in).
- **`origin` exists** → use it; create nothing.

### 1b. Make the file, not the user

Resolve the durable credential file before accepting a value, by [the secrets convention](../../../../wiki/development/secrets.md#the-two-files), through the source checkout's [shared lookup](../../memory/scripts/lib/primary-root.mjs) (the target has no skills yet), never from a hosting tool's folder names.

```bash
ACTIVE_ROOT=$(git rev-parse --show-toplevel)
PRIMARY_ROOT=$(node "<source checkout>/.agents/skills/memory/scripts/lib/primary-root.mjs")
DURABLE_ENV="$PRIMARY_ROOT/.env"
ACTIVE_ENV="$ACTIVE_ROOT/.env"
```

A non-zero exit → stop **before** asking for the token, saying the primary worktree could not be resolved safely. Never fall back to the linked checkout.

Confirm Git ignores the destination: `git -C "$PRIMARY_ROOT" check-ignore -q .env`. In a fresh folder, first add the `.env*` / `!.env.example` and `.dev.vars*` / `!.dev.vars.example` pairs to the file `git rev-parse --path-format=absolute --git-path info/exclude` returns, then re-check; the install still commits the `.gitignore` fragment. A failed re-check → stop before accepting a secret.

No `DURABLE_ENV` → create it with the blank `CLOUDFLARE_*` lines from the source's [`.env.example`](../../../../.env.example) and say: *"I made a private `.env` file. Git ignores it, so its values stay on this machine."* When `ACTIVE_ROOT` is not `PRIMARY_ROOT` and `ACTIVE_ENV` is a regular file, not a symlink, [leave both files untouched](../../../../wiki/development/secrets.md#unseeded-linked-worktree-copies): never read its values to compare, or merge one into the other. Say: *"This linked worktree also has its own `.env`. I am using the durable primary-worktree copy and left the duplicate untouched."*

Later `.env` means `DURABLE_ENV`; replace or append only the exact `KEY=` line.

### 1c. Ask for the token

If `CLOUDFLARE_API_TOKEN` in `DURABLE_ENV` is empty, ask for it with the filled-in token link from [the credentials page](../../../../wiki/stack/cloudflare-credentials.md#create-the-token), read from that page rather than copied here: open it, check the two rows, Create, copy. When the link fails, give the page's click path instead, calling out **Account Resources**, the field people miss. Say what it is for: *"This token stays on this computer. I use it to set up your hosting and to make a smaller token for automatic publishing."*

They paste it into the durable file, or to you to write. Re-read `DURABLE_ENV` and export the value without printing it. **No token → setup stops here and writes nothing else**; pasting it later continues from this step.

### 1d. Verify before doing anything

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify
```

Success returns the token's own `id`. **Translate every failure** with the [failure map](failure-map.md): the cause and the one fix, never `9109` or `Invalid API Token` as the headline.

## Step 2 — the token widens itself

**Don't ask; widen, then report what you granted.** From the target's root, with `CLOUDFLARE_API_TOKEN` exported from `DURABLE_ENV`:

```bash
P="node <source checkout>/.agents/skills/wong-setup/scripts/provision.mjs"
$P widen
```

It runs [the widen protocol](permission-groups.md), granting only [a normal provision](permission-groups.md#a-normal-provision). Tell the user what the report's `granted` list names. Access permissions are part of normal private setup.

If it stops, **provision nothing**: give the cause, and list the permission names for the user to add by hand.

## Step 3 — which account

```bash
$P accounts
```

- **Exactly one** → use it, and say which.
- **More than one** → **stop and ask**, offering each by name and id, and **create nothing until the user picks.** Never infer it from the repo name, the email, or the API's order.
- **Zero, with a valid token** → the Account Resources miss ([failure map](failure-map.md)). Explain, offer to re-check once they save it, and create nothing.

Write the chosen id to `CLOUDFLARE_ACCOUNT_ID` in `DURABLE_ENV` and export it.

## Step 4 — provision

Ask once before the billable parts, as [a two-option choice](../../explore/references/asking-the-user.md): *"Set it up (Recommended) — your private memory store, a real database and a practice one, and automatic publishing"* or *"Stop here — nothing is created on Cloudflare"*.

### 4a. Name things; don't ask

The script derives every name from the repository name and checks it against the account; state them, and never make the user invent one:

```bash
$P names --repo "$(gh repo view --json nameWithOwner -q .nameWithOwner)"
```

The report's `checked` list marks each name `free`, `ours` (made by this repo earlier), or `taken`. Name any `taken` one and offer the report's `base`, the first suffix that frees every name, such as `recipe-box-2`; the server installer takes it unasked.

Apply the id-free fragments now (the `package.json` scripts, `.env.example` variables, and `.gitignore` entries) from [`stack-pack-fragments.md`](../../wong-sync/references/stack-pack-fragments.md). No copied payload file may carry a database name, so the script fills `db:migrate:staging` and `db:migrate:prod` with the literal names in 4c.

After the one ask, one command runs 4b through 4d:

```bash
$P provision --repo <owner/name> --base <base> --owner-email <reachable-owner-email> --open-without-login
```

Resolve a reachable owner email before provisioning; reject `.invalid` and GitHub noreply addresses. The git author email may remain private. Private setup reuses or creates Zero Trust/PIN, creates unavailable production/staging Workers, and attaches the owned Worker-ID app before content publication. Review overlapping hostname/path/preview apps first; preserve unrelated resources. Machine credentials are saved to ignored primary/branch `.env`; public identifiers go in `components.access`. See [Access](../../../../wiki/stack/cloudflare-access.md).

**Open until the card.** When Cloudflare wants a card before it turns on Zero Trust, `--open-without-login` lets setup finish: the report's `access.mode` is `open`, no Access resources are made, and the config carries `WORKSPACE_LOGIN: "off"` ([open until the card](../../../../wiki/stack/cloudflare-access.md#open-until-the-card)). Say it plainly, then go on: *"Cloudflare wants a card on file before it turns on the private email login, so for now anyone with your site's link can see it. Your memory stays private behind its own key. I'll show you how to add the card at the end."* Any other Access stop still stops setup, and a site that is already private never opens. Only this runbook passes the flag; the server installer doesn't, so it stops.

### 4b. The memory store

[The memory convention](../../../../wiki/development/memory.md#the-memory-key) owns what it holds, who reads it, and why only the production Worker binds it; it has no staging twin.

1. **Is R2 on?** An error listing R2 buckets that says to enable R2 means no; the report says `"r2": false`. No token can turn R2 on ([without R2](../../../../wiki/development/memory.md#without-r2)), so continue without a bucket, and let [the card list](#the-card-list) at the close give the steps: *"Memory works without it; it just won't keep full session transcripts until R2 is on."*
2. **The database.** It reuses or creates `<repo>-memory`.
3. **The bucket, only when R2 is on.** It reuses or creates `<repo>-memory`, never with public access.
4. **Record.** It writes `components.memory` in `.claude/.wong-stack.json`: `accountId`, `databaseId`, `database`, `bucket` (or `null`), and the memory URL as `worker`, `https://<worker>.<subdomain>.workers.dev/_memory`. An account with no `workers.dev` subdomain gets one named for the GitHub owner. None is secret.
5. **Apply the schema.** It runs the target's `memory.mjs migrate` with `CLOUDFLARE_API_TOKEN`, retrying while the new store takes effect. On a new store, it also links the GitHub account `gh` is signed in as, making it the admin.
6. **The admin key.** With no memory key in `.env`, it runs `memory.mjs member admin`, which writes a 30-day, self-renewing admin key, never printed, to `CLOUDFLARE_MEMORY_TOKEN` in the primary checkout's `.env`. No git email stops it with `repo`: ask the user to set one. A signed-out `gh` stops it with `cloudflare`: ask them to run `gh auth login`. Teammates [join through GitHub](../../../../wiki/development/memory.md#joining-through-github) once production is deployed. **Never** make the key a GitHub secret.

Memory answers once CI deploys production; until then, facts wait in the local spool. By hand, the memory commands are `$M`, with `M="node $(git rev-parse --show-toplevel)/.claude/skills/memory/scripts/memory.mjs"`.

**Re-runs.** A store that verifies is current. A store with no bucket, on an account that now has R2, gets one: the script creates and records it, adds `MEMORY_BUCKET` to the production config, and gives `<repo>-deploy` the R2 row of [the CI deploy token table](permission-groups.md#the-ci-deploy-token). The key stays. Make by hand any edit the report's `todo` lists.

**Moving an older store.** A store whose `CLOUDFLARE_MEMORY_TOKEN` is an old `<repo>-memory` Cloudflare token, not a `wongm_` key, moves to the production Worker; the old token works until the last step.
1. In the sync change: the memory route in `app/worker/index.ts` (the [app scaffold](../../wong-sync/references/payload-manifest.md#the-app-scaffold)'s one import and branch), `MEMORY_DB` and `MEMORY_BUCKET` in the production config as in 4c, `worker` in the install record as in step 4, the R2 row on `<repo>-deploy` when the store has a bucket, and `$M migrate`.
2. Once that change merges and production deploys, run step 6's `$M member admin` by hand, then check `$M digest` through the Worker.
3. Only when that passes, delete the old token: find `<repo>-memory` in `GET /user/tokens`, then `DELETE /user/tokens/{id}`.

If the check fails, put the old token back in `.env` and stop. Teammates who held the old token get a key next session by [joining through GitHub](../../../../wiki/development/memory.md#joining-through-github); nobody makes one by hand, so give GitHub access to anyone who lacks it.

### 4c. The two app databases and the config

Create/reuse distinct production and staging databases; branch deploys never write real data.

With no config, write the [fragment](../../wong-sync/references/stack-pack-fragments.md) with actual production/staging D1 and Access IDs; an open site gets blank Access IDs and `WORKSPACE_LOGIN: "off"` instead. Bind memory only at the top level, plus R2 when available. Fill the two `db:migrate:*` scripts. Preserve the fragment's entry point, assets, flags, and date. Existing config stays apart from a new memory bucket and [adding the card later](#adding-the-card-later); plan other privacy updates as a reviewed merge. The [scaffold](../../wong-sync/references/payload-manifest.md#the-app-scaffold) supplies the Worker.

The same Worker serves the [mini apps](../../../../wiki/stack/mini-apps.md) under `/apps/`; they need no Worker or config of their own.

**Moving older mini apps.** Merge `/apps/` routing and Worker-first assets into the main Worker. Remove the obsolete mini-app config, Worker, tsconfig, ignore files, and assetsignore only as reviewed changes. After production deploys, verify `/apps/` and every saved app; only then delete the old `<repo>-mini` and `<repo>-mini-staging` Workers and `staging-mini` GitHub environment. Keep them on failure.

### 4d. The CI deploy token

CI gets its own narrow token, never the user token ([why](../../../../wiki/stack/cloudflare-credentials.md#the-ci-deploy-token)). The script pipes every value to `gh secret set` on stdin, never an argument, a file, or the terminal.

- **No `<repo>-deploy` token** → it creates one on this account with [the CI deploy token table](permission-groups.md#the-ci-deploy-token)'s `always` rows, plus the R2 row only when the store has a bucket, and sets it as the `CLOUDFLARE_API_TOKEN` secret.
- **Token and `CLOUDFLARE_API_TOKEN` secret both exist** (`gh secret list`) → current; it only adds a row the token now needs.
- **The token exists, the secret doesn't** → it rolls the value and sets the secret. To rotate on request, run `gh secret delete CLOUDFLARE_API_TOKEN`, then the script again.

It sets a missing `CLOUDFLARE_ACCOUNT_ID` too. `gh secret set` needs only the `repo` scope from `gh auth login`. It can publish app/data changes and inspect private coverage; it cannot write Access policies.

### 4e. The workflow

Confirm `.github/workflows/test.yml`, `.github/workflows/deploy.yml`, and `.nvmrc` landed; [the pipeline scripts own every deploy decision](../../../../wiki/stack/d1-pipeline.md#ci-is-github-actions).

Missing `workflow` scope → offer `gh auth refresh --scopes workflow` ([why](../../../../wiki/development/required-tools.md#gh-needs-the-workflow-scope)).

### 4f. First deploy

The workflow deploys on push, so the first deploy comes when `/save` pushes; never push from here. Diagnose a red build with `gh run view --log-failed`; it needs no Cloudflare credential.

Use the report's production URL. Treat preview URLs as patterns until CI returns an actual deployed URL ([discovery](../../../../wiki/stack/d1-pipeline.md#how-the-alias-url-reaches-the-tooling)). A new hostname may need a propagation retry.

### 4g. Smoke-test what you built

After `/save` reports the first deploy, fetch the production URL once; never report a URL you did not fetch.

The check runs itself; never ask the person to sign in by email code on each site:

- **Private site:** run `node scripts/probe-private-access.mjs --url <url>` on production and on one preview. Expect the anonymous request closed and the machine request `2xx`.
- **Open site** (`access.mode` is `open`): fetch production and expect `200`.

Retry propagation; name a real failure. Human login stays unverified until Step 5's human check. The [browser runbook](../../../../wiki/stack/cloudflare-access.md#verify-it-works--in-a-browser) is for `/verify` and later changes, not setup.

Once production has deployed, check memory with `$M digest`, through the production Worker with 4b's admin key; before, it reports the Worker does not answer.

## Step 5 — the closing report

State, in plain words:

- Session memory: on, with or without transcripts, only when 4g's digest answered. Otherwise: *"Memory starts once your site first goes live; until then, what I learn waits on this computer."*
- The production URL, and the preview pattern with one branch filled in
- What was created, and what was reused
- What the user token was granted, that it stays in `.env` on this computer, and that it can be [narrowed back](../../../../wiki/stack/cloudflare-credentials.md#narrowing-back)
- That CI publishes with its own small key, `<repo>-deploy`
- Private coverage, machine access, and human login as separate outcomes. An open site says instead: *"Anyone with the link can see your site."*
- When `command -v paseo` answers: how to chat from a phone, *"In Paseo, open Settings → your host → Pair Device."*
- The optional card list below, when the site is open or `r2` is `false`.

End on the URL and the one next step. With the starter app: open the URL (on a private site, sign in once with the email code), and copy the message in the box at the top into this chat; it walks the person through their first change. **That paste is the human check**: once it arrives from the production link, report human login verified, with no sign-in on staging or previews.

### The card list

One list owns these steps; [without R2](../../../../wiki/development/memory.md#without-r2) and [open until the card](../../../../wiki/stack/cloudflare-access.md#open-until-the-card) link here. Fill in the account id, and show only the steps still missing: the storage step when `r2` is `false`, the login step when the site is open, and the card step with either.

```text
Optional: add a card to Cloudflare
Free plans; light use costs nothing. Without it, anyone with
the link can see your site, and memory keeps no full chat
transcripts.
1. Add a card        https://dash.cloudflare.com/<account>/billing/payment-info
2. Turn on storage   https://dash.cloudflare.com/<account>/r2/overview
3. Pick Free plan    https://one.dash.cloudflare.com/<account>/
Tell me when it's done.
```

Name only what the missing steps cost: an account with R2 but an open site loses no transcripts. The person opens the links in their own browser; never enter the card for them.

## Adding the card later

When the person says the card is on, run [Step 4](#step-4--provision)'s `provision` command again, flags and all. It turns on what the card unlocked: the private login, when Zero Trust now answers, and the memory bucket, when R2 is on. It edits `app/wrangler.jsonc` in place: it fills the `CF_ACCESS_*` ids, removes `WORKSPACE_LOGIN`, and adds `MEMORY_BUCKET`. Make by hand any edit its `todo` lists.

Then publish through `/save`, and once it deploys, run 4g's private check. If the report still says `open`, Zero Trust still wants its plan picked: send the list's step 3 again.
