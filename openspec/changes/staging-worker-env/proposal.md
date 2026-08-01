# staging-worker-env

**Status:** ready-to-ship
**Open questions:** none

## Why

The stack pack's staging model isolates the *database* but not the *Worker*. On a non-production branch, Workers Builds uploads a **version** of the one production Worker, and a version only serves HTTP — queue consumers, cron triggers, and every other non-request handler run on the **deployed** version, with production bindings. So `swap-d1-id.js` only ever covered the request path: a repo that adds a queue cannot test it on staging at all, and staging messages get handled by production code against the production database.

The fix is to make staging a real deployment: a separate Worker declared as a Wrangler environment, with its own twin bindings. That also removes the config-rewriting hack the current design needs only because there is one Worker.

## What Changes

- **BREAKING** — `scripts/swap-d1-id.js` is **removed** from the pack, and `preview_database_id` is no longer part of the model. Staging D1 becomes a normal binding inside `env.staging`.
- **BREAKING** — the `wrangler.jsonc` config fragment gains an `env.staging` block (own Worker `name`, twin D1, twin queue, twin bucket) in place of the two-id `d1_databases` entry.
- **New** `scripts/cf-deploy.sh` — the pack's fourth zero-config script, wired to the Workers Builds **deploy** command. Default branch → `wrangler deploy`; any other branch → `wrangler versions upload --env staging --preview-alias <branch>` (keeps the per-commit preview URL) followed by `wrangler deploy --env staging` (updates the deployed staging Worker so queues and crons run branch code).
- `scripts/cf-build.sh` loses its swap leg; branch builds migrate staging via `--env staging` instead of `--preview`.
- `scripts/reset-staging-d1.mjs` targets staging via `--env staging` instead of `--preview`.
- **Twin-by-default becomes the stated rule**: every stateful binding gets a second resource inside `env.staging` rather than a namespace prefix, because a twin costs no application code and a prefix taxes every call site forever. Documented as a table covering D1, Queues, R2, KV, Durable Objects, cron triggers, secrets, and service bindings.
- `wiki/stack/d1-pipeline.md` is rewritten as the **staging-environment** page: the version-vs-deployment diagnostic up front, two environments instead of two databases, the twin table, why not per-PR environments, and the two-preview-URLs-differ-in-capability gotcha. Migration mechanics and both production-recovery runbooks carry over unchanged.
- An **adoption runbook** for repos already carrying the old scripts — `/wong-sync` never modifies a file that already exists, so the upgrade has to be a documented, human-run sequence surfaced through the adapt step.
- `VERSION` → 8.0.0, with a newest-first `CHANGELOG.md` entry.

## Non-goals

Per-PR Worker environments (a provisioner with per-PR databases, queues, secrets, and teardown — declined, and documented as declined). Changing migration mechanics, the seeded-staging model, or the recovery runbooks. Any application code in this repo's `app/`.

## Capabilities

### New Capabilities

_None — this changes how the existing pack behaves._

### Modified Capabilities

- `stack-pack`: staging isolation moves from a swapped binding on one Worker to a separate Worker declared as a Wrangler environment; the pack gains a deploy script and drops the swap script; the twin-by-default rule and the adoption runbook become stated requirements; the docs requirement moves from a two-database model to a two-environment model.

## Impact

- **Pack scripts** — `scripts/cf-build.sh` (edit), `scripts/cf-deploy.sh` (new), `scripts/reset-staging-d1.mjs` (edit), `scripts/swap-d1-id.js` (delete).
- **Payload manifest** — `.claude/skills/wong-sync/references/payload-manifest.md`: the pack's drop-in file list changes from three scripts to three (swap out, deploy in).
- **Config fragments** — `.claude/skills/wong-sync/references/stack-pack-fragments.md`: the `wrangler.jsonc` fragment and the `package.json` scripts fragment both change; a new Workers Builds deploy-command setting is added.
- **Wiki** — `wiki/stack/d1-pipeline.md` (rewritten), `wiki/stack/cloudflare-access.md` (the staging Worker's own hostname needs a policy), `wiki/stack/README.md` and `wiki/stack/cloudflare-credentials.md` (link and per-environment secrets).
- **Release** — `VERSION`, `CHANGELOG.md`.
- **Downstream repos** — every repo that took the pack has the old scripts and keeps them until a human follows the runbook; nothing breaks until they opt to upgrade.

## Decision log

- **2026-08-01** — Planned and implemented in one session; all 20 tasks complete, VERSION 8.0.0. The diagnosis that drove the whole change: a branch preview is a Workers Builds *version*, and a version serves only HTTP, so the old `swap-d1-id.js` binding swap isolated the request path and nothing else — queues, crons, and alarms always ran on the production deployment. Fixed by making staging a real Worker (`env.staging`). **Two things the plan didn't anticipate, both found while implementing:** (1) a twin staging D1 has its *own* `database_name`, so the name readers in `cf-build.sh` and `lib-wrangler-config.mjs` had to become environment-aware — reading the name from inside the `env.staging` block, and erroring explicitly rather than falling back to production's name; (2) `cf-deploy.sh` needs the same wrangler-config discovery `cf-build.sh` has, so rather than a third copy of that rule (bash, bash, and `.mjs`) it was extracted to `scripts/lib-wrangler-config.sh` and sourced by both — a build and its deploy resolving different apps would be a silent, ugly failure. Added as tasks 1.5 and 1.6. **Ruled out:** a second queue alone (a consumer binds to a Worker, not a version, so staging messages would still hit the production deployment); an R2 `staging/` key prefix (a twin bucket is free and needs no code, a prefix taxes every call site forever); dropping the per-commit version-alias URLs (they're generated by the default deploy command a custom one replaces, so keeping them is now an explicit line in `cf-deploy.sh`); per-PR Worker environments (documented as declined — it's an environment provisioner larger than the app). **Verified:** the scripts were exercised against a synthetic repo — production and staging name reads resolve correctly, a missing `env.staging` errors with the right message, the branch→alias sanitizer handles `feat/Add_Thing` and rejects unusable names, and every new wiki link and anchor resolves.
