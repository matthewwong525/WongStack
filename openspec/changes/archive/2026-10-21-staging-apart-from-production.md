<!-- openspec-archive v1 2026-10-21-staging-apart-from-production -->
<!-- file proposal.md utf8 14553 -->
# Proposal

**Status:** ready-to-ship
**Branch:** thankful-hound
**Open questions:** none

## Why

The Cloudflare security check found two ways code on a preview can act on the live app. Anyone who can save a branch controls the code a preview runs. Today that preview holds the live app's business keys and your GitHub write key, and its sign-in also works on the live app. So a teammate given only *Can install the project* could save a branch that copies keys, or copies your sign-in when you open the preview, then reads everyone's memory on the live app as you, for up to 30 days.

## What Changes

- **Previews get their own sign-in.** The live app and previews each get their own sign-in, so a preview sign-in opens only previews. A sign-in copied on a preview is refused by the live app. The checker that walks previews gets its own preview-only pass too. A sign-in made before the switch still works on the live app until it expires, at most 30 days.
  ```mermaid
  flowchart TD
    pv["preview sign-in"] --> preview["preview opens"]
    pv -. "copied" .-> live["live app refuses"]
  ```

- **Previews hold only keys made for them.** Saving a key fills the live app. Previews get only the keys you give them on purpose, as test keys. Until then they hold none, and the save names the keys previews lack. A preview key with the same value as the live one is refused. Keys a preview already holds from the live app are removed the next time keys are saved, and that can't be undone: you'd add test keys back yourself.
  | Key | Live app | Previews |
  |-|-|-|
  | Business keys (Stripe and the like) | yours | only test keys you add |
  | Your GitHub write key | yes | never |
  | Cloudflare look-ups key | yes | never |
  | Sign-in list key | yes | never (as today) |

- **Saving code and Cloudflare look-ups are live-app only.** On a preview, Access shows those two keys as *Live app only*, not *Not on previews yet*, so nobody waits for a step that will never come. A project kept in Cloudflare loses its write access on previews the same way.
  ```screen
  <div class="row gap">
    <div class="card col gap phone">
      <span class="tag-outline">Before, on a preview</span>
      <div class="row gap"><span class="grow">Project code</span><span class="tag">Not on previews yet</span></div>
      <div class="row gap"><span class="grow">Cloudflare</span><span class="tag">Not on previews yet</span></div>
    </div>
    <div class="card col gap phone">
      <span class="tag-outline">After, on a preview</span>
      <div class="row gap"><span class="grow">Project code</span><span class="tag">Live app only</span></div>
      <div class="row gap"><span class="grow">Cloudflare</span><span class="tag">Live app only</span></div>
    </div>
  </div>
  ```

- **The same people can sign in to both.** When you add or remove someone in Access, the live app updates both sign-in lists, so teammates still open the previews of their own changes.
  ```mermaid
  flowchart LR
    add[you add a person] --> live["live app's list"]
    add --> prev["previews' list"]
  ```

- **An existing install moves over with one step.** After updating, previews stop publishing until you run setup's Access step once. That step splits the sign-in, removes the live app's write keys from previews, and updates the app's settings for you to publish. The live app keeps publishing throughout.
  ```mermaid
  flowchart TD
    update --> stop["previews paused"] --> step["Access step"]
    step --> publish --> ok["previews back"]
  ```

**Non-goals:** keeping the deploy key away from branch code, stopping teammate branches from running code on pickup, cutting a removed person's access at once, and the memory store's guards. Each is planned in its own workspace from the same security check. A shorter sign-in for previews is out too: once the live app refuses a preview sign-in, a shorter one only means signing in more often.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cloudflare-provisioning`: staging gets its own Access application, audience and verification service token; the deploy gate refuses a preview deploy while they are shared; `secrets:push` loads staging only from `app/.dev.vars.staging`, refuses production-only names and production's values, and prunes the rest; `secrets:check` no longer requires staging to hold every production name; `WONG_CODE_WRITE`, `WONG_CLOUDFLARE_READ` and the `ARTIFACTS`/`CODE_CHECKS` bindings stay on production; the login-management key mirrors the people policy to both applications.
- `key-access`: a preview names keys only the live app holds as *Live app only*.
- `secrets-convention`: a key saved through the key link reaches the live app; previews get only their own file's keys.

## Impact

- Setup: `.agents/skills/wong-setup/scripts/private-access.mjs` (`provisionAccess`, `accessExceptions`, `provisionAccessPolicies`, `machineCredential`, `cloudflareReadKey`, `loginManagementKey`), `provision.mjs` (`closeOpenConfig`, `wranglerConfig`, `projectCode`, `codeInConfig`, `accessSetup`), `.env.example`.
- Gates: `scripts/lib-access-config.mjs`, `scripts/check-private-access.mjs`, `scripts/cf-secrets.mjs`.
- App: `app/worker/employee-access/login-management.ts`, `code.ts` (`saveStep`), `app/src/apps/access/levels.ts` (`keyState`), the status contract that carries the environment.
- Preview callers of the checker: `.agents/skills/verify/scripts/verify-staging.sh`, `verify-journeys.mjs`, `scripts/eval-verify.mjs`.
- This repo's own `app/wrangler.jsonc` and its live Cloudflare Access setup (one outward run of the Access step).
- Tests: `scripts/tests/cf-secrets.test.mjs`, `provision.test.mjs`, `access-config.test.mjs`, `access-coverage.test.mjs`, `app/worker/access.test.ts`, `app/worker/employee-access/login-management.test.ts`, the code and levels tests.
- Docs: `wiki/stack/cloudflare-access.md`, `staging-bindings.md`, `project-git-route.md`, `employee-project.md`, `employee-access.md`, `cloudflare-credentials.md`, `wiki/development/secrets.md`, `CHANGELOG.md`.

## Decision log

- **2026-10-21** — Asked what previews get when no preview key file exists → chose none: the live app still gets its keys, and the save names what previews lack.
- **2026-10-21** — Asked how previews save code without your GitHub write key → chose they can't: saving is live-app only, and a Cloudflare-kept project loses its write access on previews too.
- **2026-10-21** — Asked who signs in to previews → chose the same people as the live app, kept in step by the live app.
- **2026-10-21** — Asked whether to cut off live-app sign-ins a preview may already have copied → chose to let them run out (at most 30 days), so nobody signs in again.
- **2026-10-21** — Assumed: the preview checker gets its own pass, because a checker pass the live app also accepts would hand branch code every app and key on the live app.
- **2026-10-21** — Assumed: a preview key equal to the live one is refused, because you asked that previews get their own keys and a copy defeats it.
- **2026-10-21** — Assumed: the Cloudflare look-ups key leaves previews, because it reads every Worker's logs, the live app's included. This drops the deferred plan to give previews a copy.
- **2026-10-21** — Assumed: previews keep the 30-day sign-in, because once the live app refuses a preview sign-in, a shorter one only adds sign-ins.
- **2026-10-21** — Assumed: while the sign-in is still shared, only preview deploys stop and the live app keeps publishing, because blocking live publishing until the step runs would stall every install's fixes.
- **2026-10-21** — Assumed: one change covers both findings, because both fix the same promise (a preview can't act on the live app) and touch the same setup step.
- **2026-10-21** — Asked whether to run setup's Access step on this repo's live Cloudflare account → chose yes, right before the last save, then publish straight away.
- **2026-10-21** — Assumed: `probe-private-access.mjs` gains a `--preview` flag that uses the preview checker, because setup's check list probes a preview and the live checker can no longer open one.
- **2026-10-21** — Check: `scripts/cf-secrets.mjs` `check` no longer fails when staging lacks a production key name; it lists them and passes, because previews now hold only their own keys and a missing one is expected. It still fails on a staging-only name and on any live-app-only key on staging.
- **2026-10-21** — Check: `scripts/check-private-access.mjs` lets the live publish pass with a warning while both environments still share one Access app, because blocking live publishing until the Access step runs would stall every install's fixes; the preview publish still fails.
- **2026-10-21** — Check: `scripts/tests/provision.test.mjs` drops the tests for storing the read-only Cloudflare key on staging and for staging's `waiting` path, because that key is now live-app only and the path is gone; new tests assert staging never gets it.
- **2026-10-21** — Check: `scripts/cf-secrets.mjs` `check` only warns on a live-app-only key on staging while both environments share one Access app or audience, because failing would stop every updated install's live publishing until the Access step runs; it fails again once they are split.
- **2026-10-21** — Assumed: the Access step prunes staging through Cloudflare's API by the rule `secrets:push` uses, shared in `scripts/lib-staging-secrets.mjs`, rather than by running `secrets:push`, because the push also loads production and its Wrangler calls need the app's packages installed.
- **2026-10-21** — Assumed: old preview versions keep the keys staging held until those keys are rotated, and the step's report and the changelog ask for the rotation, because `wrangler versions deploy --env staging` has aimed at production before.
- **2026-10-21** — Assumed: the Access step rolls the read-only Cloudflare key itself when staging held it, because setup made that key and no person has a step to rotate it.
- **2026-10-21** — Assumed: the Access step uses the live app's recorded checker token as it is and stops, naming `provision`, if the token is gone, because the design promises no checker rotation at the split and `provision` still makes or recovers it.
- **2026-10-21** — Assumed: the live app keeps its login methods when it has any, and an app with none gets the email PIN, because a new app starts with none and Cloudflare reads an empty list as every login method, which setup never chose.
- **2026-10-21** — Assumed: only a staging Worker that doesn't exist yet (Wrangler's 10007) lets `secrets:push` pass with nothing removed, because any other unreadable list could hide keys previews copied.
- **2026-10-21** — Assumed: `provision` writes each environment's own Access pair into an existing private config except with `--keep-config`, because that flag promises to leave committed files alone, and the deploy gate then names the Access step.
- **2026-10-21** — Assumed: no code change for the gap where the old live code reads only a version-2 login key, because only this repo's few minutes between task 5.1's Access step and its publish are affected.
- **2026-10-21** — Assumed: the install record's `components.accessKey`, and the report's `accessKey`, carry the key's policy and previews ids, because a fresh clone has no provisioning state; such a machine still rotates the previews checker when its `.env` lacks it, since rotation is the only way to save it there.
- **2026-10-21** — Assumed: while both environments still share one Access app id or audience, `secrets:push` loads the live app alone and leaves staging untouched, its own test file included, because pruning before the Access step leaves that step nothing to name for rotation and no read-only key to roll.
- **2026-10-21** — Assumed: the split records the keys staging holds in the provisioning state (`stagingHeld`) before it creates the previews app, and the prune adds any name before its first delete, because a key save or a stopped run can empty staging before the Access step reports; the install record is left out, because a stop and its rerun happen on one machine, and a clone judges from what staging still holds.
- **2026-10-21** — Assumed: the Access step names `stagingHeld` less the staging file's names, then clears it at the end of a finished run, and a `provision` rerun that splits an install rolls the read-only key and lists the Access step as a to-do without clearing it, because only the Access step removes the keys and reports what to rotate.
- **2026-10-21** — Assumed: the changelog's update order is publish the update, run the Access step, then publish its config change, because the step rolls the login key to version 3, which the old live code can't read; publishing the live app works before the split, and only previews pause.
- **2026-10-21** — Checkpoint: built through 4.4 with two review rounds (11 fixes: live publishing before the split, staging pruned by the Access step, no live checker rotation, login methods kept, missing staging Worker, provision rerun writes vars, key reuse from the install record, rotation advice tied to the split, update order). Ran the Access step on this repo's live account: previews app created, wongstack-staging moved onto it, staging's copied WONG_CODE_READ removed; `cf-secrets check` shows staging holds none of production's keys. Saving for CI and the preview check (6.1, 6.2).
- **2026-10-21** — Archive checkpoint: CI passed on the saved branch, and the preview check passed. The live app refuses the preview's sign-in with 401 on `/_memory/caller` and the git route, and accepts its own. Access on a preview shows Cloudflare and Project code as *Live app only*. Main's Deploy had failed since this repo's Access step ran: main's own code refuses the split sign-in. Putting `WONG_CODE_READ` back on previews didn't clear it, so the key came off again. Asked whether to publish past the failed main Deploy → chose to skip the ship tool's main-checks gate this once, because this change is the fix.
- **2026-10-21** — Check: `.agents/verification/journeys/employee-onboarding/a-person-tries-to-publish-through-the-app.json` no longer expects the preview to serve `git-upload-pack`. It now expects the push refused (401), the project route saying the project is not available from this app (503), and Access status still answering, because previews no longer hold a GitHub key and hand the project out from the live app only.

<!-- end proposal.md -->
<!-- file design.md utf8 16520 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 8131 -->
# Tasks

## 1. Secrets: staging loads only its own file

- [x] 1.1 `scripts/cf-secrets.mjs`: replace `PRIVATE_ACCESS`/`SETUP_MADE` with one `PRODUCTION_ONLY_SECRETS` set (`WONG_ACCESS_LOGIN_MANAGEMENT`, `WONG_CODE_WRITE`, `WONG_CLOUDFLARE_READ`). In `push`: drop the fallback to `.dev.vars` for staging; refuse a staging file naming a production-only key or repeating production's value digest, before any write; delete staging secret names the staging file lacks (all of them when there is no file), falling back to `wrangler versions secret delete` on 10215. In `check`: list production names staging lacks without failing, and fail on a staging-only or production-only name. In `shared`: say previews hold no keys when there is no staging file. Update `USAGE`. Verify with `node --test scripts/tests/cf-secrets.test.mjs`.
- [x] 1.2 Regression tests in `scripts/tests/cf-secrets.test.mjs` (fingerprint `scripts/cf-secrets.mjs:push/staging-worker-holds-production-runtime-secrets`). With a stub `npx`: a push with no `.dev.vars.staging` runs no `secret bulk --env staging` and deletes staging's existing names; a staging file naming `WONG_CODE_WRITE` is refused with no wrangler call; a staging file repeating production's value is refused, with no value in the output; `check` passes when previews lack a business key and fails when staging holds `WONG_CODE_WRITE`. Verify the first test fails on 823693df's `cf-secrets.mjs` and passes after 1.1.
- [x] 1.3 Docs: `wiki/stack/staging-bindings.md` (*One declared list of secrets, two Workers* becomes each Worker's own file; the read key line), and `wiki/development/secrets.md` (key link step 4: a new key reaches the live app; previews only through `.dev.vars.staging`). Verify with `node scripts/check-payload-links.mjs`.

## 2. Setup: two Access applications and the split

- [x] 2.1 `.agents/skills/wong-setup/scripts/private-access.mjs`: `provisionAccess` creates or reuses the production app (production Worker + anchor) and a previews app (staging Worker + staging host, `GIT_OVERRIDE`), recording `state.access.staging`. On an install whose recorded app holds both Workers, it splits in the design's order. `accessConflicts` gets both owned ids; `accessDestinations` builds per app; `provisionAccessPolicies` and `machineCredential` run per app, with the people list copied to the new app and the staging token saved as `CF_ACCESS_STAGING_CLIENT_ID/SECRET`. Verify with `node --test scripts/tests/provision.test.mjs`.
- [x] 2.2 `provision.mjs`: `wranglerConfig` and `closeOpenConfig` write each environment's own `CF_ACCESS_AUD`/`CF_ACCESS_APP_ID`, with the matching placeholders in `.agents/skills/wong-sync/references/stack-pack-fragments.md`. `projectCode` judges production only; `codeInConfig` binds `ARTIFACTS`/`CODE_CHECKS` to production only and removes staging's entries; `cloudflareReadKey` gets `[production]`; `loginManagementKey` stores `staging: { appId, policyId }` (version 3). `accessSetup` runs the split, then deletes `WONG_CODE_WRITE`, `WONG_CODE_READ` and `WONG_CLOUDFLARE_READ` from the staging Worker. Add both new names to `.env.example`. Verify with `node --test scripts/tests/provision.test.mjs` and the fragment-equality test.
- [x] 2.3 Regression tests in `scripts/tests/provision.test.mjs` (fingerprint `wong-setup/private-access.mjs:provisionAccess:shared-staging-production-access-audience`), against the fake Cloudflare API: a fresh provision makes two apps with distinct audiences, each with only its own Worker, and a config whose two environments hold different AUD and app ids; `accessSetup` on a shared-app record splits it, keeps the people list on both, leaves each machine policy admitting only its own token, and removes the three secrets from staging; a rerun changes nothing; `projectCode` reports saving ready with the key on production alone. Verify the split test fails on 823693df's source and passes after 2.1–2.2.
- [x] 2.4 Docs: `wiki/stack/cloudflare-access.md` (two applications, the previews checker, the check list), `wiki/stack/employee-access.md#finish-access-setup` (what the step now does), `wiki/stack/project-git-route.md` and `employee-project.md` (the write key and Artifacts binding are live-app only), `wiki/stack/cloudflare-credentials.md` (read key on the live app only). Verify with `node scripts/check-payload-links.mjs` and `node scripts/measure-context.mjs --check`.

## 3. Gates: refuse a preview on the live app's sign-in

- [x] 3.1 `scripts/check-private-access.mjs` (via `scripts/lib-access-config.mjs`): require different app ids and audiences and the same team; check each app's destinations against its own Worker. A shared config fails `--environment staging` and warns on `--environment production`, naming the Access step. Verify with `node --test scripts/tests/access-config.test.mjs scripts/tests/access-coverage.test.mjs`.
- [x] 3.2 Regression tests: in `access-config.test.mjs`/`access-coverage.test.mjs`, a config with one shared audience fails the staging gate and passes the production gate with a warning; in `app/worker/access.test.ts`, an assertion carrying the staging audience returns null from `getAccessIdentity` under production vars, for the header, the `cf-access-token` header and a git Basic password. Add a committed-config test that `app/wrangler.jsonc`'s two environments hold different `CF_ACCESS_AUD` values (it fails until task 5.1). Verify with `node --test` on the script tests and `npm test` in `app/`.

## 4. App: mirrored sign-in lists and live-only keys

- [x] 4.1 `app/worker/employee-access/login-management.ts`: with `authority.staging`, `read` reviews both apps, `updatePolicy` writes and reads back both people policies, and `sessions` revokes both apps; without it, behaviour is unchanged. Tests in `login-management.test.ts`: an add reaches both policies; a staging app with an extra allow policy is refused; an old authority touches one app. Verify with `npm test` in `app/`.
- [x] 4.2 `app/worker/employee-access/code.ts` (`saveStep`/`codeStep` give `"live"` on staging), `app/worker/keys.ts` (`liveOnly` on `cloudflare` and `code`), `app/src/apps/access/levels.ts` (`keyState` shows *Live app only*), and the status contract carrying it. Tests beside each: a preview shows *Live app only* for both keys and *Not on previews yet* for a business key. Verify with `npm test` in `app/`.
- [x] 4.3 Preview callers use the preview checker: `.agents/skills/verify/scripts/verify-staging.sh`, `verify-journeys.mjs`, and `scripts/eval-verify.mjs`'s scrub list read `CF_ACCESS_STAGING_CLIENT_ID/SECRET`; live callers are unchanged. Update `scripts/tests/verify-scripts.test.mjs`/`verify-journeys.test.mjs` fixtures. Verify with `node --test` on those files.
- [x] 4.4 `CHANGELOG.md`: a `## Next (major) — Previews get their own sign-in and keys` entry, with an *Updating* note: publish the update (previews pause), run setup's Access step once, then publish its config change. Verify it sits at the top of the entries.

## 5. This repo's own Cloudflare (outward, confirm first)

- [x] 5.1 Right before the last save, and with nothing else being published until this ships (design: Risks), ask Matthew, then run `provision.mjs access` against this repo's live Cloudflare account. Commit the new `env.staging` vars, run `npm run secrets:push` (staging is pruned; there is no `.dev.vars.staging`), and confirm with `node scripts/cf-secrets.mjs check` that staging holds no `WONG_CODE_*` or `WONG_CLOUDFLARE_READ`. Verify the committed-config test from 3.2 now passes.

## 6. Verification

- [x] 6.1 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate staging-apart-from-production --strict --no-interactive`, then `/save` for CI.
- [x] 6.2 On the saved branch's preview: it opens with its own sign-in and the preview checker; Access shows *Live app only* for Project code and Cloudflare. A token minted for the preview (`cloudflared access token` on the preview host) gets 401 from the live app's `/_memory/client/v4/accounts/x/caller`, while the live app's own token gets 200. Verify by `/verify` with the requests' status codes recorded.

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 13518 -->
## ADDED Requirements

### Requirement: Previews have their own sign-in

The live app and staging with its previews SHALL each be protected by their own Access application, with their own audience and their own verification service token. A sign-in or machine assertion issued for staging or a preview SHALL NOT authenticate on the live app, on any route, including the routes the Worker checks itself. Both applications SHALL admit the same people: adding or removing a person through the live app SHALL update both sign-in lists, and SHALL leave each application's machine policy intact. Setup SHALL create both applications on a new install. The Access step SHALL split an existing shared application without changing who can sign in or how: the live application SHALL keep its login methods, and the previews application SHALL get the same ones. The deploy gate SHALL refuse a staging or preview deploy while the two environments share an application or audience, naming the Access step. It SHALL still let the live app publish, with a warning.

#### Scenario: A sign-in copied on a preview

- **WHEN** code running on a preview records a visitor's sign-in and sends it to the live app's memory or git route
- **THEN** the live app refuses it as signed out, while the same person's own live-app sign-in still works

#### Scenario: An install that still shares one sign-in

- **WHEN** an updated install whose two environments still share an Access application pushes a branch
- **THEN** the preview deploy stops and names the Access step, and a publish to the live app still goes through

### Requirement: Each Worker loads its own secrets file

`app/.dev.vars` SHALL be the declared list of the live app's runtime secrets, and `secrets:push` SHALL load it into the production Worker alone. Staging SHALL hold only what a git-ignored `app/.dev.vars.staging` declares; with no such file, staging SHALL hold no runtime secret. A push SHALL leave staging holding exactly the staging file's names, removing any other; with no staging Worker yet, it SHALL load production and pass with a note. While the two environments still share one Access application or audience, a push SHALL load production alone and leave staging as it is, with a note naming the Access step. The Access step SHALL prune staging by the same rule, and SHALL NOT change production's secrets. Before it changes anything, the split SHALL record the keys staging held; the Access step SHALL name those it removes for rotation, and roll the read-only Cloudflare key when staging held it, until it has done both once, even after a stopped run. A linked worktree with no copy SHALL read the primary worktree's files. The staging file SHALL NOT declare a production-only secret: the login-management key, the project write key, or the read-only Cloudflare key. It SHALL NOT give any key the same value production holds. Both sources and the staging config SHALL be validated before the first provider write; an invalid source SHALL load nothing into either Worker. Output SHALL name keys only, never values.

#### Scenario: No staging file

- **WHEN** `secrets:push` runs with `app/.dev.vars` and no `app/.dev.vars.staging`
- **THEN** production gets every key, staging is left holding none, and the output names the keys previews lack

#### Scenario: A push before the Access step

- **WHEN** `secrets:push` runs while both environments still name one Access application or audience
- **THEN** production gets every key, staging keeps what it holds, and the output names the Access step

#### Scenario: An Access step stopped part-way

- **WHEN** the Access step stops after removing the read-only Cloudflare key from staging, and runs again
- **THEN** the rerun rolls that key, and names for rotation every key staging held at the split

#### Scenario: A staging file that reaches production

- **WHEN** `app/.dev.vars.staging` declares `WONG_CODE_WRITE`, or repeats production's value for any key
- **THEN** the push fails before either Worker changes and names the key without its value

### Requirement: A gate keeps previews to their own keys

`secrets:check` SHALL fail when staging holds a runtime secret production does not declare, when staging holds a production-only secret (only warning, naming the Access step, while the two environments still share one Access application or audience), when a stateful top-level binding is absent from `env.staging`, or when staging config carries private Access management authority. It SHALL exclude documented production-only memory bindings. It SHALL list, without failing, the production secrets staging lacks. It SHALL only warn about disagreement with `app/.dev.vars.example`, compare names only, and never read or print secret values.

#### Scenario: Previews lack a business key

- **WHEN** production holds `STRIPE_SECRET_KEY` and staging does not
- **THEN** the check passes and names `STRIPE_SECRET_KEY` as missing on previews, with no value in its output

#### Scenario: Staging holds the project write key

- **WHEN** the staging Worker's secret names include `WONG_CODE_WRITE`
- **THEN** the check fails and names it; while both environments still name one Access application, it passes with a warning naming the Access step, so the live app keeps publishing

### Requirement: Setup supplies the read-only Cloudflare key to the live app only

Setup SHALL create a Cloudflare key limited to reading settings, logs and usage, with no permission that changes anything and none that reads databases, stored files, key-value data, queues or memory. It SHALL store the key for the production Worker alone and record its identifier for reuse and rotation. The key SHALL NOT reach staging or previews, and the Access step SHALL remove a copy staging already holds. The key SHALL NOT be the user token, the deploy key or the login-management key, and the user token SHALL still never reach a Worker. A rerun SHALL reuse the key when the production Worker holds it. Updating an existing installation SHALL perform the same step. When the available Cloudflare token cannot create the key, the step SHALL be reported as missing with the private key link and SHALL NOT block the rest of setup or the update.

#### Scenario: A fresh install

- **WHEN** setup finishes
- **THEN** the production Worker holds the read-only key, staging holds no copy, the user token is in neither Worker, and the employer can give a person Cloudflare: Read from Access without another step

#### Scenario: The token cannot create keys

- **WHEN** the saved Cloudflare token lacks permission to create the key
- **THEN** the step is reported missing with the private key link, and Access shows Cloudflare with one step left

## MODIFIED Requirements

### Requirement: Protection covers every address of this workspace

The workspace's Access protection SHALL cover its production and staging Workers across default addresses, custom domains, routes, branch aliases, and unique version URLs, including addresses added later and previews created before adoption. The live app's application SHALL cover only the production Worker, and the previews' application only the staging Worker. Provisioning SHALL NOT gate unrelated Workers or create account-wide protection. More-specific conflicting policies SHALL prevent a successful coverage report until resolved.

#### Scenario: A new preview or custom domain

- **WHEN** a new version, alias, or custom domain reaches a protected workspace Worker
- **THEN** the same allowed emails control access without a manual hostname-policy update

#### Scenario: A shared Cloudflare account

- **WHEN** the account also contains unrelated Workers and a conflicting preview policy
- **THEN** unrelated Workers keep their access settings, and this workspace is not reported fully protected until its conflicting policy is resolved

### Requirement: Machine access uses explicit authentication

Provisioning SHALL supply a dedicated app-specific service-token policy for automated verification on each of the two applications, each admitting only its own service token: one for the live app, one for staging and previews. Automated checks of a preview SHALL use the preview token, never the live app's. Membership updates SHALL preserve both machine policies. The Access step SHALL NOT create or rotate the live app's service token; it SHALL make only the previews token. The production memory route and the project's git route SHALL be the only automatic exceptions to the edge sign-in wall, and the Worker SHALL verify the company sign-in on each of them itself; other public routes require explicit reviewed configuration. Staging and CI branch previews SHALL carry no memory bindings.

#### Scenario: Automated checks and memory

- **WHEN** automated checks use the dedicated service token and a memory caller sends a valid company sign-in
- **THEN** each reaches its intended protected service, while an anonymous memory or git caller is denied by the Worker

#### Scenario: Team membership changes

- **WHEN** a person is added or removed
- **THEN** machine permissions and the two Worker-checked routes remain intact, and no broad public prefix becomes exempt

### Requirement: Setup supplies what Access needs

Setup SHALL record the owner's email as committed nonsecret configuration for both Workers, and SHALL create a key limited to Access application-and-policy writes. It SHALL store the key with the account identifier and both applications' human-policy identifiers as the production Worker's login-management secret, and record the key's identifier for reuse and rotation. The key SHALL NOT be the deploy key, SHALL NOT be written to staging, and a rerun SHALL reuse it while its recorded identifiers still match, judged from the committed install record when the machine has no provisioning state. Updating an existing installation SHALL perform the same step. When the available Cloudflare token cannot create the key, the step SHALL be reported as missing with the private key link and SHALL NOT block the rest of setup or the update.

#### Scenario: A fresh install

- **WHEN** setup finishes on an account with sign-in turned on
- **THEN** the owner email is in both Workers' committed configuration, production holds the login-management secret, staging holds none, and the owner can add a person from Access without another step

#### Scenario: An existing install updates

- **WHEN** an installation made before this change updates and its saved token can create keys
- **THEN** the update adds the owner email and the production secret and leaves existing people's access unchanged

#### Scenario: The token cannot create keys

- **WHEN** the saved Cloudflare token lacks permission to create the key
- **THEN** the step is reported missing with the private key link, and Access still opens and names the step left

### Requirement: Setup tells the app which project it hands out

Setup and the Access step SHALL record, as committed nonsecret configuration, the one project the app hands out, on the live app and on staging. On an install whose project is kept in the employer's Cloudflare account they SHALL also connect the live app to that repository, so no key is made or pasted; staging SHALL get no connection that can write to it. On a GitHub install they SHALL leave the read-only key to the employer through the private key link, and SHALL report it as missing with its numbered steps. Whether the project can be handed out and saved SHALL be judged from the production Worker alone; the project write key SHALL never be required on, or stored for, staging. They SHALL NOT raise that key as a to-do, and setup's closing report SHALL NOT mention it: the employer is asked in Access when they first let someone install the project. Running the step again SHALL change nothing that is already right. The account token SHALL still never reach a Worker.

#### Scenario: A Cloudflare-kept install updates

- **WHEN** the Access step runs on an install with no GitHub
- **THEN** the app is connected to its own repository, Project code shows as saved after the next publish, and no key was asked for

#### Scenario: A GitHub install updates

- **WHEN** the Access step runs on a GitHub install with no read-only key saved
- **THEN** the project is recorded, the report names the key as missing with its steps, no to-do asks for it, and Connect keeps working as before for everyone

#### Scenario: Setup finishes on GitHub with no teammate yet

- **WHEN** setup finishes a new GitHub install
- **THEN** its closing report says nothing about a read-only GitHub key, and the employer is not asked for one

## REMOVED Requirements

### Requirement: One secrets file loads both Workers

**Reason**: Staging ran production's keys, which any pushed branch's code could read.
**Migration**: Replaced by *Each Worker loads its own secrets file*; add test keys to `app/.dev.vars.staging` for previews that need a service.

### Requirement: A gate keeps the two Workers in step

**Reason**: Staging no longer mirrors production's secret names; a missing preview key is expected, not drift.
**Migration**: Replaced by *A gate keeps previews to their own keys*.

### Requirement: Setup supplies the read-only Cloudflare key

**Reason**: The key reads every Worker's logs, the live app's included, so it must not sit where branch code runs.
**Migration**: Replaced by *Setup supplies the read-only Cloudflare key to the live app only*; the Access step removes staging's copy.

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/key-access/spec.md utf8 708 -->
## ADDED Requirements

### Requirement: A preview names the keys only the live app holds

On a preview, Access SHALL show a key that only the live app may ever hold, the Cloudflare look-up key and Project code's saving, as held by the live app only. It SHALL NOT offer a step for it or say it is coming to previews. A key a preview may get from its own file SHALL keep saying it is not on previews yet.

#### Scenario: The employer opens Access on a preview

- **WHEN** the employer opens a person's keys on a preview of an install whose live app holds the Cloudflare key and Project code
- **THEN** both say they are on the live app only, and a business key the preview lacks says it is not on previews yet

<!-- end specs/key-access/spec.md -->
<!-- file specs/secrets-convention/spec.md utf8 1959 -->
## MODIFIED Requirements

### Requirement: The person gives a key through a private key link

When a task needs a key that the live files lack, or the person asks for the key link, the agent SHALL send a private link in the same reply, without first asking whether the person is ready. The link SHALL have every private link's safety: a new address and secret key each time, one link at a time, ending private input once every asked-for key is saved, on explicit closure, or at its time limit. The page SHALL offer one field for each key the agent named, and only those, and a primary action that saves entries and returns to the requesting task in one tap. The agent SHALL name only keys already declared in `.env.example` or `app/.dev.vars.example`. A saved key SHALL go to the matching ignored live file, in the primary worktree and in a seeded branch copy, and a key the live site reads SHALL then reach the live app; previews SHALL get only keys from their own file. Only successful persistence of every requested key SHALL declare readiness and notify the originating workspace, with no value in that notification. Failed or partial saves SHALL preserve successes, keep missing or failed entries editable, and SHALL NOT declare readiness. The agent SHALL learn only the names of the saved keys.

#### Scenario: A task needs a missing key

- **WHEN** a task needs `STRIPE_SECRET_KEY`, which `app/.dev.vars.example` declares and `app/.dev.vars` lacks, and the person pastes it on the key link's page and taps its save-and-continue action
- **THEN** it lands in `app/.dev.vars`, the originating workspace is notified and pushes it to the live app, the chat names `STRIPE_SECRET_KEY`, and no command, log, tracked file, or chat message holds its value

#### Scenario: An undeclared name

- **WHEN** the agent asks for a key named in neither example file
- **THEN** no link opens until the name is declared blank, with its comment, in the right example file

<!-- end specs/secrets-convention/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-21

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 83172 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-21-staging-apart-from-production</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

/* Tailwind's shadow-xs, shadow-sm and shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the
   bottom, so a layer reads as above the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --look-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --look-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; }
  .item > .drawing:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 var(--pad); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--foreground); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--border); background:var(--muted); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen .skeleton { animation:none; min-height:1em; } .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .sk-bar { display:block; height:.75em; border-radius:.375em; background:color-mix(in oklab, var(--muted-foreground) 25%, transparent); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  .item > .table { grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; overflow-x:auto; border-top:1px solid var(--border); }
  .item > .table:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:var(--pad); min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted-foreground); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--background); }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--muted); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { grid-template-columns:repeat(3, minmax(0, 1fr)); padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-10-21-staging-apart-from-production">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-21-staging-apart-from-production</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The Cloudflare security check found two ways code on a preview can act on the live app. Anyone who can save a branch controls the code a preview runs. Today that preview holds the live app's business keys and your GitHub write key, and its sign-in also works on the live app. So a teammate given only <i>Can install the project</i> could save a branch that copies keys, or copies your sign-in when you open the preview, then reads everyone's memory on the live app as you, for up to 30 days.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Previews get their own sign-in.</b> The live app and previews each get their own sign-in, so a preview sign-in opens only previews. A sign-in copied on a preview is refused by the live app. The checker that walks previews gets its own preview-only pass too. A sign-in made before the switch still works on the live app until it expires, at most 30 days.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-1-picture-1" tabindex="0" style="width:26.462em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 344 185" width="344" height="185" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_pv_preview_0"><path d="M150.03,56C150.03,86 77.58,86 77.58,116L77.58,122"/><path class="pele-marker" d="M77.58,129L74.22,121L80.94,121Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_pv_live_0"><path d="M188.72,56C188.72,66.25 261.18,66.25 261.18,76.5L261.18,122" stroke-dasharray="3 4"/><path class="pele-marker" d="M261.18,129L257.82,121L264.54,121Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_pv_live_0"><rect x="236.55" y="78.5" width="49.24" height="21" rx="3" fill="var(--_bg)"/><text x="261.18" y="93.9" text-anchor="middle">copied</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="pv" transform="translate(169.38,32)"><rect x="-71.34" y="-24" width="142.69" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">preview sign-in</text></g><g class="pele-node pele-shape-rect" data-id="preview" transform="translate(77.58,153)"><rect x="-69.58" y="-24" width="139.15" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">preview opens</text></g><g class="pele-node pele-shape-rect" data-id="live" transform="translate(261.18,153)"><rect x="-74.02" y="-24" width="148.05" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">live app refuses</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Previews hold only keys made for them.</b> Saving a key fills the live app. Previews get only the keys you give them on purpose, as test keys. Until then they hold none, and the save names the keys previews lack. A preview key with the same value as the live one is refused. Keys a preview already holds from the live app are removed the next time keys are saved, and that can't be undone: you'd add test keys back yourself.</div></div><div class="table"><table class="tbl"><thead><tr><th>Key</th><th>Live app</th><th>Previews</th></tr></thead><tbody><tr data-note="item-2-row-1" tabindex="0"><td>Business keys (Stripe and the like)</td><td>yours</td><td>only test keys you add</td></tr><tr data-note="item-2-row-2" tabindex="0"><td>Your GitHub write key</td><td>yes</td><td>never</td></tr><tr data-note="item-2-row-3" tabindex="0"><td>Cloudflare look-ups key</td><td>yes</td><td>never</td></tr><tr data-note="item-2-row-4" tabindex="0"><td>Sign-in list key</td><td>yes</td><td>never (as today)</td></tr></tbody></table></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Saving code and Cloudflare look-ups are live-app only.</b> On a preview, Access shows those two keys as <i>Live app only</i>, not <i>Not on previews yet</i>, so nobody waits for a step that will never come. A project kept in Cloudflare loses its write access on previews the same way.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic screen" data-note="item-3-picture-1" tabindex="0" style="width:27.692em"><div class="sk" inert><div class="row gap">
  <div class="card col gap phone">
    <span class="tag-outline">Before, on a preview</span>
    <div class="row gap"><span class="grow">Project code</span><span class="tag">Not on previews yet</span></div>
    <div class="row gap"><span class="grow">Cloudflare</span><span class="tag">Not on previews yet</span></div>
  </div>
  <div class="card col gap phone">
    <span class="tag-outline">After, on a preview</span>
    <div class="row gap"><span class="grow">Project code</span><span class="tag">Live app only</span></div>
    <div class="row gap"><span class="grow">Cloudflare</span><span class="tag">Live app only</span></div>
  </div>
</div></div></div></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The same people can sign in to both.</b> When you add or remove someone in Access, the live app updates both sign-in lists, so teammates still open the previews of their own changes.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-4-picture-1" tabindex="0" style="width:26.923em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 350 152" width="350" height="152" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_add_live_0"><path d="M167.63,68C185.13,68 185.13,32 202.63,32L208.63,32"/><path class="pele-marker" d="M215.63,32L207.63,35.36L207.63,28.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_add_prev_0"><path d="M167.63,84C185.13,84 185.13,120 202.63,120L208.63,120"/><path class="pele-marker" d="M215.63,120L207.63,123.36L207.63,116.64Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="add" transform="translate(87.82,76)"><rect x="-79.82" y="-24" width="159.63" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">you add a person</text></g><g class="pele-node pele-shape-rect" data-id="live" transform="translate(278.73,32)"><rect x="-63.1" y="-24" width="126.19" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">live app's list</text></g><g class="pele-node pele-shape-rect" data-id="prev" transform="translate(278.72,120)"><rect x="-63.09" y="-24" width="126.18" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">previews' list</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>An existing install moves over with one step.</b> After updating, previews stop publishing until you run setup's Access step once. That step splits the sign-in, removes the live app's write keys from previews, and updates the app's settings for you to publish. The live app keeps publishing throughout.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-5-picture-1" tabindex="0" style="width:13.308em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 173 448" width="173" height="448" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_update_stop_0"><path d="M86.02,56L86.02,97"/><path class="pele-marker" d="M86.02,104L82.66,96L89.38,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_stop_step_0"><path d="M86.02,152L86.02,193"/><path class="pele-marker" d="M86.02,200L82.66,192L89.38,192Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_step_publish_0"><path d="M86.02,248L86.02,289"/><path class="pele-marker" d="M86.02,296L82.66,288L89.38,288Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_publish_ok_0"><path d="M86.02,344L86.02,385"/><path class="pele-marker" d="M86.02,392L82.66,384L89.38,384Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="update" transform="translate(86.02,32)"><rect x="-42.46" y="-24" width="84.93" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">update</text></g><g class="pele-node pele-shape-rect" data-id="stop" transform="translate(86.02,128)"><rect x="-78.02" y="-24" width="156.05" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">previews paused</text></g><g class="pele-node pele-shape-rect" data-id="step" transform="translate(86.02,224)"><rect x="-61.13" y="-24" width="122.26" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Access step</text></g><g class="pele-node pele-shape-rect" data-id="publish" transform="translate(86.02,320)"><rect x="-43.34" y="-24" width="86.69" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">publish</text></g><g class="pele-node pele-shape-rect" data-id="ok" transform="translate(86.02,416)"><rect x="-68.68" y="-24" width="137.36" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">previews back</text></g></g></svg></div></div></details></li>
</ol>
<p class="aside"><b>Non-goals:</b> keeping the deploy key away from branch code, stopping teammate branches from running code on pickup, cutting a removed person's access at once, and the memory store's guards. Each is planned in its own workspace from the same security check. A shorter sign-in for previews is out too: once the live app refuses a preview sign-in, a shorter one only means signing in more often.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked what previews get when no preview key file exists → chose none: the live app still gets its keys, and the save names what previews lack.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked how previews save code without your GitHub write key → chose they can't: saving is live-app only, and a Cloudflare-kept project loses its write access on previews too.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked who signs in to previews → chose the same people as the live app, kept in step by the live app.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked whether to cut off live-app sign-ins a preview may already have copied → chose to let them run out (at most 30 days), so nobody signs in again.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the preview checker gets its own pass, because a checker pass the live app also accepts would hand branch code every app and key on the live app.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: a preview key equal to the live one is refused, because you asked that previews get their own keys and a copy defeats it.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the Cloudflare look-ups key leaves previews, because it reads every Worker's logs, the live app's included. This drops the deferred plan to give previews a copy.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: previews keep the 30-day sign-in, because once the live app refuses a preview sign-in, a shorter one only adds sign-ins.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: while the sign-in is still shared, only preview deploys stop and the live app keeps publishing, because blocking live publishing until the step runs would stall every install's fixes.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: one change covers both findings, because both fix the same promise (a preview can't act on the live app) and touch the same setup step.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked whether to run setup's Access step on this repo's live Cloudflare account → chose yes, right before the last save, then publish straight away.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: <code>probe-private-access.mjs</code> gains a <code>--preview</code> flag that uses the preview checker, because setup's check list probes a preview and the live checker can no longer open one.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-21</p>Check: <code>scripts/cf-secrets.mjs</code> <code>check</code> no longer fails when staging lacks a production key name; it lists them and passes, because previews now hold only their own keys and a missing one is expected. It still fails on a staging-only name and on any live-app-only key on staging.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-21</p>Check: <code>scripts/check-private-access.mjs</code> lets the live publish pass with a warning while both environments still share one Access app, because blocking live publishing until the Access step runs would stall every install's fixes; the preview publish still fails.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-21</p>Check: <code>scripts/tests/provision.test.mjs</code> drops the tests for storing the read-only Cloudflare key on staging and for staging's <code>waiting</code> path, because that key is now live-app only and the path is gone; new tests assert staging never gets it.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-21</p>Check: <code>scripts/cf-secrets.mjs</code> <code>check</code> only warns on a live-app-only key on staging while both environments share one Access app or audience, because failing would stop every updated install's live publishing until the Access step runs; it fails again once they are split.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the Access step prunes staging through Cloudflare's API by the rule <code>secrets:push</code> uses, shared in <code>scripts/lib-staging-secrets.mjs</code>, rather than by running <code>secrets:push</code>, because the push also loads production and its Wrangler calls need the app's packages installed.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: old preview versions keep the keys staging held until those keys are rotated, and the step's report and the changelog ask for the rotation, because <code>wrangler versions deploy --env staging</code> has aimed at production before.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the Access step rolls the read-only Cloudflare key itself when staging held it, because setup made that key and no person has a step to rotate it.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the Access step uses the live app's recorded checker token as it is and stops, naming <code>provision</code>, if the token is gone, because the design promises no checker rotation at the split and <code>provision</code> still makes or recovers it.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the live app keeps its login methods when it has any, and an app with none gets the email PIN, because a new app starts with none and Cloudflare reads an empty list as every login method, which setup never chose.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: only a staging Worker that doesn't exist yet (Wrangler's 10007) lets <code>secrets:push</code> pass with nothing removed, because any other unreadable list could hide keys previews copied.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: <code>provision</code> writes each environment's own Access pair into an existing private config except with <code>--keep-config</code>, because that flag promises to leave committed files alone, and the deploy gate then names the Access step.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: no code change for the gap where the old live code reads only a version-2 login key, because only this repo's few minutes between task 5.1's Access step and its publish are affected.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the install record's <code>components.accessKey</code>, and the report's <code>accessKey</code>, carry the key's policy and previews ids, because a fresh clone has no provisioning state; such a machine still rotates the previews checker when its <code>.env</code> lacks it, since rotation is the only way to save it there.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: while both environments still share one Access app id or audience, <code>secrets:push</code> loads the live app alone and leaves staging untouched, its own test file included, because pruning before the Access step leaves that step nothing to name for rotation and no read-only key to roll.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the split records the keys staging holds in the provisioning state (<code>stagingHeld</code>) before it creates the previews app, and the prune adds any name before its first delete, because a key save or a stopped run can empty staging before the Access step reports; the install record is left out, because a stop and its rerun happen on one machine, and a clone judges from what staging still holds.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the Access step names <code>stagingHeld</code> less the staging file's names, then clears it at the end of a finished run, and a <code>provision</code> rerun that splits an install rolls the read-only key and lists the Access step as a to-do without clearing it, because only the Access step removes the keys and reports what to rotate.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the changelog's update order is publish the update, run the Access step, then publish its config change, because the step rolls the login key to version 3, which the old live code can't read; publishing the live app works before the split, and only previews pause.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-21</p>Checkpoint: built through 4.4 with two review rounds (11 fixes: live publishing before the split, staging pruned by the Access step, no live checker rotation, login methods kept, missing staging Worker, provision rerun writes vars, key reuse from the install record, rotation advice tied to the split, update order). Ran the Access step on this repo's live account: previews app created, wongstack-staging moved onto it, staging's copied WONG_CODE_READ removed; <code>cf-secrets check</code> shows staging holds none of production's keys. Saving for CI and the preview check (6.1, 6.2).</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-21</p>Archive checkpoint: CI passed on the saved branch, and the preview check passed. The live app refuses the preview's sign-in with 401 on <code>/_memory/caller</code> and the git route, and accepts its own. Access on a preview shows Cloudflare and Project code as <i>Live app only</i>. Main's Deploy had failed since this repo's Access step ran: main's own code refuses the split sign-in. Putting <code>WONG_CODE_READ</code> back on previews didn't clear it, so the key came off again. Asked whether to publish past the failed main Deploy → chose to skip the ship tool's main-checks gate this once, because this change is the fix.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-21</p>Check: <code>.agents/verification/journeys/employee-onboarding/a-person-tries-to-publish-through-the-app.json</code> no longer expects the preview to serve <code>git-upload-pack</code>. It now expects the push refused (401), the project route saying the project is not available from this app (503), and Access status still answering, because previews no longer hold a GitHub key and hand the project out from the live app only.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line or picture to note it</p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" hidden>
    <button type="button" data-ready="build"><span class="spinner" hidden aria-hidden="true"></span><span>Build it</span></button>
    <button type="button" data-ready="publish" aria-expanded="false" aria-controls="ready-confirm">Build and publish</button>
    <div id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><p>Goes live, can't be undone.</p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span>Yes, publish</span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: 'Change #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot.
    // A screen's words sit in many small boxes: join every piece of text with a space.
    const row = el.tagName === 'TR', cells = row ? c.querySelectorAll('td') : el.classList.contains('screen') ? texts(c)
      : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = Array.prototype.map.call(cells, function (n) { return n.textContent.replace(/\s+/g, ' ').trim(); }).join(row ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return { id: n.id, label: n.label, text: n.text }; }); }
  function acknowledge(notes) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), n = notes.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: bullets(notes).join('\n') });
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes);
      says('Sent ' + plural(n) + ' to the chat.');
      toast('Sent ' + plural(n) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── visible build choices, with publish confirmation above the footer ──
  let version = null;
  const publishButton = $('ready').querySelector('[data-ready="publish"]');
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    publishButton.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen && !$('ready').hidden) publishButton.focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready');
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(pending === (step === 'yes' ? 'publish' : step) && step !== 'publish'));
      const spinner = b.querySelector('.spinner');
      if (spinner) {
        const active = pending === (step === 'yes' ? 'publish' : step);
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : step === 'yes' ? 'Yes, publish' : 'Build it';
      }
    });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length) body.text = bullets(notes).join('\n');
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
        : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || step === 'publish') {
      says('');
      $('ready-confirm').hidden = step === 'cancel';
      publishButton.setAttribute('aria-expanded', String(step === 'publish'));
      bar();
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
