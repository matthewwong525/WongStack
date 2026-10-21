# Design

## Context

See proposal.md for why. The two findings, by fingerprint, are in `/root/security-audit-skill/WongStack/run-1/FINDINGS-DETAIL.md`: `wong-setup/private-access.mjs:provisionAccess:shared-staging-production-access-audience` and `scripts/cf-secrets.mjs:push/staging-worker-holds-production-runtime-secrets`. Both were reproduced at 08f9788e. The source still matches them at 823693df.

Today:

- `provisionAccess` (`private-access.mjs`) creates one self-hosted Access application whose destinations are both Worker IDs plus the production default host. `closeOpenConfig`/`wranglerConfig` (`provision.mjs`) write its one `CF_ACCESS_AUD` and `CF_ACCESS_APP_ID` into production and `env.staging`. This repo's `app/wrangler.jsonc` shows the same AUD and app id at lines 25-26 and 75-76.
- `identityFromClaims` (`app/worker/access.ts`) checks `aud`, `iss`, `exp`, `nbf` only. That is correct once each Worker has its own audience, so the Worker needs no change.
- `check-private-access.mjs` *requires* the shared app: `production.appId !== staging.appId … throw 'must share one private app'`. `cf-deploy.sh` runs it for production and staging, and `cf-preview.sh` runs it for staging.
- `cf-secrets.mjs push` loads staging from `.dev.vars.staging`, else from production's `.dev.vars`. Only `WONG_ACCESS_LOGIN_MANAGEMENT` (`PRIVATE_ACCESS`) is refused on staging. `check` fails when any production secret name is missing from staging.
- `projectCode` reports saving ready only when *every* Worker holds `WONG_CODE_WRITE`. `codeInConfig` adds `ARTIFACTS` and `CODE_CHECKS` to production and staging. `cloudflareReadKey` is given `[production, staging]`.
- `login-management.ts` reads and writes one app (`CF_ACCESS_APP_ID`) and one policy (`authority.policyId`), and revokes that app's sessions.
- One verification service token (`CF_ACCESS_CLIENT_ID/SECRET` in `.env`) is admitted by the one app. `verify-staging.sh` and `verify-journeys.mjs` send it to previews.
- This repo has no `app/.dev.vars.staging`. `secrets:push` therefore gave staging production's `WONG_CODE_READ` (`cf-secrets.mjs shared` → `shared: WONG_CODE_READ`).

## Goals / Non-Goals

**Goals:** an assertion issued for staging never authenticates on production; the staging Worker holds no production credential (business values, `WONG_CODE_WRITE`, `WONG_CLOUDFLARE_READ`, `WONG_ACCESS_LOGIN_MANAGEMENT`, a namespace-wide `ARTIFACTS` binding, the production checker secret); an existing install moves over with the one `provision.mjs access` step it already runs.

**Non-Goals:** the CI deploy token's reach from branch code, teammate branches running code on pickup, and instant removal. Each has its own workspace. Changes to `access.ts`'s verifier are out too: distinct audiences are the fix.

## Decisions

### Two Access applications, one per Worker

`provisionAccess` creates or reuses two owned apps:

| | production app (existing) | staging app (new) |
|-|-|-|
| name | `WongStack <repo> (<base>)` | `WongStack <repo> (<base>) previews` |
| domain | `<worker>.<sub>.workers.dev` | `<staging>.<sub>.workers.dev` |
| destinations | production Worker + public anchor, `LIVE_OVERRIDES` | staging Worker + public staging host, `GIT_OVERRIDE` |
| session | 720h | 720h |
| login methods | its own `allowed_idps`; the PIN on a new app | the live app's |
| policies | `… people`, `… verification` | `… previews people`, `… previews verification` |

State and the install record grow `access.staging = { appId, audience, humanPolicyId, machinePolicyId, serviceTokenId }`. `access.workers` keeps both Workers for naming, but each app's destinations are built from its own Worker only. `accessConflicts` takes both owned ids, so neither owned app counts as a conflict for the other.

`closeOpenConfig` and `wranglerConfig` write production's AUD and app id to the top-level vars, and staging's to `env.staging.vars`. `wranglerConfig` takes them from `access.staging`. On an existing private config, `provision` and `accessSetup` both write each environment's own pair (`accessInConfig`), so a `provision` rerun that splits an install leaves no stale staging audience. The fragment in `.agents/skills/wong-sync/references/stack-pack-fragments.md` gets `<staging access audience>` and `<staging access app id>` placeholders. A script test keeps the fragment and `app/wrangler.jsonc` equal, so both move together.

*Alternative considered:* keep one app and bind tokens to a Worker some other way, such as a host claim check in `identityFromClaims`. An Access assertion carries no host or Worker claim, so this needs a custom claim or a second signature. Two apps is what Access is built for, and the verifier already enforces `aud`.

### The split order on an existing install

`accessSetup` (`provision.mjs access`) splits a shared install in this order. Each step is checkpointed and safe to rerun:

1. Create the staging app with **no** destinations, then attach its policies. Copy the people list from production's current people policy.
2. PUT the production app with only its own destinations.
3. PUT the staging app's destinations (staging Worker + host).
4. Write `env.staging` vars. Prune the staging Worker's secrets to exactly the names `app/.dev.vars.staging` declares, none when it is absent: the rule `secrets:push` uses, shared through `scripts/lib-staging-secrets.mjs`. Production is never touched. `wrangler versions secret delete` is used when the plain delete answers 10215 (memory #1218). The report names the removed keys for rotation, and the step rolls the read-only Cloudflare key itself when staging held it. Both are tied to the split, not to this run's deletes: before step 1 changes anything, `provisionAccess` records the names staging holds as `stagingHeld` in the provisioning state, and marks the read key to roll if it is among them; the prune adds any name it is about to delete, and checkpoints, before the first delete. The report names `stagingHeld` less the staging file's names, and a finished run clears it. So a rerun after a stop part-way still rolls the key and names every key, and a `provision` rerun that splits the install rolls the key and names the Access step as a to-do. A clone with no state judges from what staging still holds: the stop and its rerun happen on one machine.

Between steps 2 and 3 (two consecutive API calls, seconds apart) the staging Worker has no edge in front of it. Whatever branch code it runs could answer a visitor, but no visitor's request carries a fresh assertion there, so it captures nothing new. Until staging's next deploy, its committed vars still name production's AUD, which the staging app no longer issues, so staging's own gate answers 401. Attaching staging first is not an option: `accessConflicts`, and Access itself, refuse a Worker destination two apps claim.

Sign-ins issued before the split keep the old (production) AUD and stay valid on production until they expire, at most 30 days. Matthew chose to let them run out rather than make everyone sign in again. No production verifier change, no session revocation, and no checker rotation is done at the split: `accessSetup` uses the live app's recorded service token as it is, never making, rotating or saving it, and makes only the previews token. A fresh `provision` still makes or recovers the live token as before.

### The deploy gate

`check-private-access.mjs` inverts its rule. The two environments must have **different** app ids and audiences and the same team, and each app's destinations must match its own table row above. A config whose two environments still share an app id:

- `--environment staging` (branch deploys and `cf-preview.sh`) fails: *previews still share the live app's sign-in; run setup's Access step (wiki/stack/employee-access.md#finish-access-setup) and publish.*
- `--environment production` passes with a warning naming the same step. The live app keeps publishing. A shared app is a risk to the live app only through branch code on staging, and that path is now refused.

### Secrets: staging loads only its own file

`cf-secrets.mjs`:

- `PRODUCTION_ONLY_SECRETS = {WONG_ACCESS_LOGIN_MANAGEMENT, WONG_CODE_WRITE, WONG_CLOUDFLARE_READ}`. This replaces `PRIVATE_ACCESS` everywhere it is used: the staging config scan, the staging source refusal, the check. The `MEMORY_` binding prefix stays separate.
- `push` with no `.dev.vars.staging` loads production and does **not** call `secret bulk --env staging`. It prints `staging — no .dev.vars.staging; previews hold none of: <names>`.
- With no staging Worker yet (wrangler answers 10007), there is nothing to remove: production loads and the push passes with a note. Any other unreadable list still fails the push.
- With a staging file, validation (before any write, as today) also refuses: any production-only name, and any key whose value digest equals production's for the same name (`readKeyDigests`). Only names are printed.
- While the config's two environments still share one Access app id or audience, `push` loads production alone and leaves staging as it is, printing a note that names the Access step. Pruning first would leave that step nothing to name for rotation, and no read key to roll.
- `push` makes staging hold exactly the staging file's names. It deletes every staging secret name the file lacks, through the same 10215 fallback. When no staging file exists, that means every name, which is how existing installs lose the copied values. An explicit `[file]` override still loads production only, as today.
- `check` drops the rule that a production secret is missing from staging. It prints those names as previews lacking them. It keeps failing on a staging-only name and on any production-only name present on staging. While the config's two environments still share one Access app id or audience, a production-only name on staging is a warning naming the Access step, so `deploy.yml`'s check before every deploy doesn't stop the live app's publishing on an updated install.
- `shared` is unchanged in shape. With no staging file it says `previews hold no keys`.

*Alternative considered:* fail the whole push when `.dev.vars.staging` is missing (the audit's proposal). Matthew chose that previews get none, so a first install's key reaches the live app at once.

### Project code and the read key stay on production

- `projectCode` checks `WONG_CODE_WRITE`/`WONG_CODE_READ` on production only. `provision` and `accessSetup` pass `workers: [production]`.
- `codeInConfig` adds `ARTIFACTS` and `CODE_CHECKS` to production only, and removes an existing `env.staging` entry of either. The binding twin check in `cf-secrets` already ignores both (`BINDING_KEYS` has neither).
- `cloudflareReadKey` gets `workers: [production]`, and the `waiting` path for staging goes. `SETUP_MADE`'s special case in `check` folds into the production-only set.
- `saveStep`/`codeStep` (`code.ts`) return `"live"` on staging when the source is GitHub or Artifacts. `keyState` (`levels.ts`) shows `Live app only` for a key the live app alone may hold: `cloudflare` and `code`, marked `liveOnly` in `keys.ts`. *Not on previews yet* stays for keys a preview may get.

### Sign-in lists mirrored by the live app

The login-management key's stored JSON (`version` 3) adds `staging: { appId, policyId }`. `workerKey` reuses the key only when its recorded ids match, so the access step rolls it once to add them. The ids are recorded in the provisioning state and in the install record's `components.accessKey`; a machine with no state file, such as a fresh clone, judges reuse from the record. In `login-management.ts`:

- `read` reads both apps. Production keeps today's checks (id, aud, Worker destination). The staging app must match `authority.staging.appId`, and its policies pass the same review: at most the people policy plus one service-token-only policy. A failure is `login_resource_mismatch` / `login_policy_review_required` as today.
- `updatePolicy` PUTs the same include list to both people policies. The readback must match both before `ready`.
- `sessions` revokes both apps.
- An authority without `staging` (an install not yet split) behaves exactly as today.

*Alternative considered:* one reusable account policy attached to both apps. `read` deliberately refuses a reusable policy, so that a policy shared with an app this install doesn't own can't admit people. Keeping two app-scoped policies keeps that guard.

### A separate checker for previews

`machineCredential` runs once per app. Production keeps `CF_ACCESS_CLIENT_ID/SECRET`. Staging gets a new token `WongStack <stagingAppId> verification`, saved as `CF_ACCESS_STAGING_CLIENT_ID/SECRET` in `.env`, both declared blank in `.env.example`. Each app's verification policy admits only its own token. Preview callers read the staging pair: `verify-staging.sh`, `verify-journeys.mjs`, and `eval-verify.mjs`'s scrub list. Live callers keep the production pair: `live-look.sh`, `probe-private-access.mjs`, and cloud schedules.

## Risks / Trade-offs

- [A preview captured a live-app sign-in before the split] → it works on production until its `exp`, at most 30 days, by Matthew's choice. Revoking the production app's sessions would not reach `/_memory/*`, which is edge-public and checks only the token itself, so cutting these off would need an issued-after check in the verifier. That stays a follow-up if wanted.
- [An install updates but never runs the access step] → preview deploys fail with the step named, and live publishing continues. `/verify` reports previews as unavailable with that reason.
- [Previews lose the project hand-out (`WONG_CODE_READ`) and business keys] → the Access panel and `cf-secrets check` name what previews lack. The staging walkthrough already skips a service whose staging key isn't its own (`staging-walkthrough` spec, *Verification preserves staging and external systems*).
- [Rolling the login-management key on update] → `workerKey` already handles roll and rerun. The old value stops working only after the new one is stored.
- [Cloudflare refuses a staging secret delete with 10215] → fall back to `wrangler versions secret delete`. If that also fails, the push stops before claiming success and names the key. The next deploy can't carry the secret, because staging's new version is built from the stored set.
- [Old preview versions keep the keys staging held] → a delete, plain or as a new version, changes neither the running staging version nor older preview versions until the next branch deploy, and `wrangler versions deploy --env staging` has aimed at production before, so it isn't used. The keys were open to branch code anyway: the Access step's report and the changelog ask to rotate the GitHub key and every business key previews held.
- [This repo's live app, between the Access step and the publish] → the running old code reads only a version-2 login key (`login-management.ts`, strict schema), so managing people fails until this change's code is live. Other installs publish the update first, so the new code is live before the step rolls the key; the changelog's *Updating* note gives that order. Only this repo's short window in task 5.1 is affected. No code change: publish right after the step.
- [This repo's split lands before this change is on `main`] → `main`'s old gate requires one shared app, so after task 5.1 every deploy built from old code fails, live and preview: other open branches included. Run 5.1 right before this change's last save, publish nothing else until it ships, and rebase the sibling security branches onto it afterwards.
- [The sibling "Cut a removed person's access at once" also edits `login-management.ts`] → whichever lands second rebases. This change adds the staging mirror and nothing about timing.

## Migration Plan

1. Ship the code. `CHANGELOG.md`'s *Updating* note gives each install the order: publish the update (the live app publishes, previews pause), run setup's Access step once, then publish the config change it makes.
2. For this repo: run `provision.mjs access` against the live account (an outward write, confirmed first). Commit the new `env.staging` vars, then `npm run secrets:push` (prunes staging). Publish, and check that a preview opens with its own sign-in and that a staging-audience token gets 401 from production `/_memory/caller`.
3. Rollback: re-attach the staging Worker to the production app and revert the vars. The staging app can then be deleted. No data changes.
