# Provision Cloudflare

Fresh setup provisions the app and closed memory, then admits this machine after reviewed publication; existing-store migration is separate. [`/wong-setup`](../SKILL.md) runs Step 1 before planning; `/apply` runs Steps 2–5 after copying; `/wong-sync` follows added steps.

**Idempotent.** Reuse existing owned resources; resume a stopped run from the top.

Use [plain words](../../explore/references/asking-the-user.md#write-in-plain-words): outcomes and one fix; explain `D1`, `binding`, or `9109`.

## Boundaries

- **Initial publication stays with `/save`.** Step 1a creates the repo. Only the pre-reviewed, retained generated `app/wrangler.jsonc` and `.claude/.wong-stack.json` delta may then be published by the trusted completion adapter. Preserve the upstream source pin, business code and unrelated staged work.
- **One script does Cloudflare work, not `wrangler`:** source [`provision.mjs`](../scripts/provision.mjs) needs only Node ([tools](../../../../wiki/development/required-tools.md)), including on servers. It prints JSON: created, reused, names, URLs. Stops exit 1 with `error.reason` (`token`, `cloudflare`, or `repo`) and `error.cause`; use the [failure map](failure-map.md).
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

- **`gh auth status` fails** → stop before Cloudflare, create nothing, and rerun [GitHub sign-in](tools.md#2-the-github-sign-in).
- **`origin` exists** → use it; create nothing.

### 1b. Make the file, not the user

Before accepting a secret, resolve its durable file through the source’s [shared lookup](../../memory/scripts/lib/primary-root.mjs) and [secrets convention](../../../../wiki/development/secrets.md#the-two-files); never infer it from hosting folder names.

```bash
ACTIVE_ROOT=$(git rev-parse --show-toplevel)
PRIMARY_ROOT=$(node "<source checkout>/.agents/skills/memory/scripts/lib/primary-root.mjs")
DURABLE_ENV="$PRIMARY_ROOT/.env"
ACTIVE_ENV="$ACTIVE_ROOT/.env"
```

A non-zero exit stops before the token ask: the primary worktree could not be resolved safely. Never use the linked checkout instead.

Confirm Git ignores the destination: `git -C "$PRIMARY_ROOT" check-ignore -q .env`. In a fresh folder, first add the `.env*` / `!.env.example` and `.dev.vars*` / `!.dev.vars.example` pairs to the file `git rev-parse --path-format=absolute --git-path info/exclude` returns, then re-check; the install still commits the `.gitignore` fragment. A failed re-check → stop before accepting a secret.

No `DURABLE_ENV` → create it with the blank `CLOUDFLARE_*` lines from the source's [`.env.example`](../../../../.env.example) and say: *"I made a private `.env` file. Git ignores it, so its values stay on this machine."* When `ACTIVE_ROOT` is not `PRIMARY_ROOT` and `ACTIVE_ENV` is a regular file, not a symlink, [leave both files untouched](../../../../wiki/development/secrets.md#unseeded-linked-worktree-copies): never read its values to compare, or merge one into the other. Say: *"This linked worktree also has its own `.env`. I am using the durable primary-worktree copy and left the duplicate untouched."*

Later `.env` means `DURABLE_ENV`; replace or append only the exact `KEY=` line.

### 1c. Ask for the token

When `CLOUDFLARE_API_TOKEN` in `DURABLE_ENV` is empty, ask with [the credentials page’s current token link](../../../../wiki/stack/cloudflare-credentials.md#create-the-token): open, check both rows, Create, copy. If it fails, give that page’s click path, emphasizing **Account Resources**. Explain that the token stays here and provisions hosting plus a smaller publishing token.

They paste into the durable file, or to you to write. Re-read `DURABLE_ENV`, export without printing. **No token → stop; write nothing else.** Resume here when supplied.

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

Follow [the widen protocol](permission-groups.md) granting only [normal provision](permission-groups.md#a-normal-provision), including Access; report the `granted` permissions.

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

The `checked` list labels names `free`, `ours` (created here), or `taken`. Name collisions and offer `base`, the first suffix freeing all names, e.g. `recipe-box-2`; servers take it unasked.

Apply the id-free fragments now (the `package.json` scripts, `.env.example` variables, and `.gitignore` entries) from [`stack-pack-fragments.md`](../../wong-sync/references/stack-pack-fragments.md). No copied payload file may carry a database name, so the script fills `db:migrate:staging` and `db:migrate:prod` with the literal names in 4c.

After the one ask, one command runs 4b through 4d:

```bash
$P provision --repo <owner/name> --base <base> --owner-email <reachable-owner-email> --open-without-login
```

Require a reachable owner email, rejecting `.invalid` and GitHub noreply; git authorship stays private. Setup creates/reuses Zero Trust/PIN, unavailable production/staging Workers and owned Worker-ID protection before content. Review hostname/path/preview overlaps; preserve unrelated resources. Service credentials stay in ignored primary/branch `.env`, public IDs in `components.access`; machine identity stays in private OS-user state. See [Access](../../../../wiki/stack/cloudflare-access.md).

**Open until the card.** Only Zero Trust onboarding refusal permits `--open-without-login`: `access.mode: open`, no Access resources, `WORKSPACE_LOGIN: "off"` ([details](../../../../wiki/stack/cloudflare-access.md#open-until-the-card)). Say anyone with the link can see the site; memory stays closed, and the closing card list explains the fix. Other refusals stop; private sites never open. Servers use this flag only when the host asks.

### 4b. The memory store

[The memory convention](../../../../wiki/development/memory-key.md) owns what it holds, who reads it, and why only the production Worker binds it; it has no staging twin.

1. **Is R2 on?** An error listing R2 buckets that says to enable R2 means no; the report says `"r2": false`. No token can turn R2 on ([without R2](../../../../wiki/development/memory.md#without-r2)), so continue without a bucket, and let [the card list](#the-card-list) at the close give the steps: *"Memory works without it; it just won't keep full session transcripts until R2 is on."*
2. **The database.** It creates `<repo>-memory` only when the name is free, retaining the original POST receipt before any managed retry. A retry reuses only that exact owned UUID/name/account receipt. Existing stores without it require separate reviewed legacy cutover; matching names and GET results cannot adopt them.
3. **The bucket, only when R2 is on.** It reuses or creates `<repo>-memory`, never with public access.
4. **Record.** It writes `components.memory` in `.claude/.wong-stack.json`: `accountId`, `databaseId`, `database`, `bucket` (or `null`), and the memory URL as `worker`, `https://<worker>.<subdomain>.workers.dev/_memory`. An account with no `workers.dev` subdomain gets one named for the GitHub owner. None is secret.
5. **Keep memory closed before publication.** Record protocol version 2 and `pending-setup`; never run the retired ordinary migration or mint an email/GitHub key. Preserve the original memory D1 creation receipt outside git. Missing or ambiguous ownership stops; a matching resource name cannot adopt it.

Reruns may add a missing bucket/configuration, never authority from clones, names, email or cloud identity. Legacy ownership cutover is reviewed; account tokens are not machine credentials. Report app and memory readiness separately.

### 4c. The two app databases and the config

Create/reuse distinct production and staging databases; branch deploys never write real data.

With no config, write the [fragment](../../wong-sync/references/stack-pack-fragments.md) with actual production/staging D1 and Access IDs; an open site gets blank Access IDs and `WORKSPACE_LOGIN: "off"` instead. Bind memory only at the top level, plus R2 when available. Fill the two `db:migrate:*` scripts. Preserve the fragment's entry point, assets, flags, and date. Existing config stays apart from a new memory bucket and [adding the card later](#adding-the-card-later); plan other privacy updates as a reviewed merge. The [scaffold](../../wong-sync/references/payload-manifest.md#the-app-scaffold) supplies the Worker.

[Mini apps](../../../../wiki/stack/mini-apps.md) use this Worker at `/apps/`, with no separate Worker/config.

**Moving older mini apps.** Apps kept outside the main app move into it by [the update's catch-up step](../../wong-sync/references/catch-up.md), `mini-apps-folder`. An install with its own mini-app Worker also merges `/apps/` routing and Worker-first assets into the main Worker. Remove the obsolete mini-app config, Worker, tsconfig, ignore files, and assetsignore only as reviewed changes. After production deploys, verify `/apps/` and every saved app; only then delete the old `<repo>-mini` and `<repo>-mini-staging` Workers and `staging-mini` GitHub environment. Keep them on failure.

### 4d. The CI deploy token

CI gets its own narrow token, never the user token ([why](../../../../wiki/stack/cloudflare-credentials.md#the-ci-deploy-token)). The script pipes every value to `gh secret set` on stdin, never an argument, a file, or the terminal.

- **No `<repo>-deploy` token** → it creates one on this account with [the CI deploy token table](permission-groups.md#the-ci-deploy-token)'s `always` rows, plus the R2 row only when the store has a bucket, and sets it as the `CLOUDFLARE_API_TOKEN` secret.
- **Token and `CLOUDFLARE_API_TOKEN` secret both exist** (`gh secret list`) → current; it only adds a row the token now needs.
- **The token exists, the secret doesn't** → it rolls the value and sets the secret. To rotate on request, run `gh secret delete CLOUDFLARE_API_TOKEN`, then the script again.

It sets a missing `CLOUDFLARE_ACCOUNT_ID` too. `gh secret set` needs only the `repo` scope from `gh auth login`. It can publish app/data changes and inspect private coverage; it cannot write Access policies.

### 4e. The workflow

Confirm `.github/workflows/test.yml`, `.github/workflows/deploy.yml`, and `.nvmrc` landed; [the pipeline scripts own every deploy decision](../../../../wiki/stack/github-actions.md).

Missing `workflow` scope → offer `gh auth refresh --scopes workflow` ([why](../../../../wiki/development/required-tools.md#gh-needs-the-workflow-scope)).

### 4f. First deploy

The workflow deploys on push, so the first deploy comes when `/save` pushes; never push from here. Diagnose a red build with `gh run view --log-failed`; it needs no Cloudflare credential.

Use the report's production URL. Treat preview URLs as patterns until CI returns an actual deployed URL ([discovery](../../../../wiki/stack/d1-pipeline.md#how-the-alias-url-reaches-the-tooling)). A new hostname may need a propagation retry.

### 4g. Smoke-test what you built

After `/save` reports the first deploy, continue automatically from the selected source checkout, without another interview:

```sh
node <source>/.agents/skills/wong-setup/scripts/provision.mjs complete-memory --dir <target> --repo <owner/name>
```

Completion uses ignored target `.env` transport and a private OS-user journal. Publication A’s exact Actions source/artifact receipt must match actual binding IDs, active settings, 100% Worker versions, protection and genuine version metadata. Activate the full core before grants; retain generated IDs, commit only the owned two-file delta and push B through the reviewed process. After its exact schema14 successor receipt, generate this computer’s private key, issue a key-bound one-use grant, enroll and perform an allowed operation. The publication ownership limits above apply.

Actions authenticates archive digest and JSON bytes. Poll up to ten minutes; timeout stays pending, and rerun resumes the retained source/attempts. Changed source, target or delta requires review. Other Git hosts/Workers Builds need an explicit trusted publication adapter and private durable journal; absent one, report pending. See [delivery](../../../../wiki/stack/d1-pipeline.md#memory-publication).

Then fetch the production URL once; never report a URL you did not fetch.

The check runs itself; never ask the person to sign in by email code on each site:

- **Private site:** run `node scripts/probe-private-access.mjs --url <url>` on production and on one preview. Expect the anonymous request closed and the machine request `2xx`.
- **Open site** (`access.mode` is `open`): fetch production and expect `200`.

Retry propagation; name a real failure. Human login stays unverified until Step 5's human check. The [browser runbook](../../../../wiki/stack/cloudflare-access.md#verify-it-works--in-a-browser) is for `/verify` and later changes, not setup.

Memory stays pending until the above deployment/admission checks pass; a source hash is not deployment proof. Ordinary digest checks follow admission.

## Step 5 — the closing report

State, in plain words:

- Session memory: report the strict version2 completion result. Only this computer’s successful allowed operation can report ready; a remote installer’s ready result leaves another computer pending.
- The production URL, and the preview pattern with one branch filled in
- What was created, and what was reused
- What the user token was granted, that it stays in `.env` on this computer, and that it can be [narrowed back](../../../../wiki/stack/cloudflare-credentials.md#narrowing-back)
- That CI publishes with its own small key, `<repo>-deploy`
- Private coverage, machine access, and human login as separate outcomes. An open site says instead: *"Anyone with the link can see your site."*
- When the target is not the open folder: its path, and *"Next time, open <target> in Paseo to chat."*
- When `command -v paseo` answers: how to chat from a phone, *"In Paseo, open Settings → your host → Pair Device."*
- The optional card list below, when the site is open or `r2` is `false`.

End with the URL and one next step: open the starter app, sign in once if private, and paste the top box’s message here to start the first change. **That paste verifies human login** from production; no staging/preview sign-in.

### The card list

[Without R2](../../../../wiki/development/memory.md#without-r2) and [open until the card](../../../../wiki/stack/cloudflare-access.md#open-until-the-card) share this list. Fill the account; show only missing storage (`r2: false`), login (open site), and card steps.

```text
Optional: add a card to Cloudflare
Free plans; light use costs nothing. Without it, anyone with
the link can see your site, and memory keeps no full chat
transcripts or pictures from a preview check.
1. Add a card        https://dash.cloudflare.com/<account>/billing/payment-info
2. Turn on storage   https://dash.cloudflare.com/<account>/r2/overview
3. Pick Free plan    https://one.dash.cloudflare.com/<account>/
Tell me when it's done.
```

Describe only missing benefits: with R2, an open site keeps transcripts but pictures await login. The person opens these links; never enter their card.

## Adding the card later

When the person says the card is on, run [Step 4](#step-4--provision)'s `provision` command again, flags and all. It turns on what the card unlocked: the private login, when Zero Trust now answers, and the memory bucket, when R2 is on. It edits `app/wrangler.jsonc` in place: it fills the `CF_ACCESS_*` ids, removes `WORKSPACE_LOGIN`, and adds `MEMORY_BUCKET`. Make by hand any edit its `todo` lists.

Then publish through `/save`, and once it deploys, run 4g's private check. If the report still says `open`, Zero Trust still wants its plan picked: send the list's step 3 again.
