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
- **2026-10-21** — Check: the kept preview check `employee-onboarding/a-person-tries-to-publish-through-the-app` no longer expects the preview to serve `git-upload-pack`. It now expects the push refused (401), the project route saying the project is not available from this app (503), and Access status still answering, because previews no longer hold a GitHub key and hand the project out from the live app only.
