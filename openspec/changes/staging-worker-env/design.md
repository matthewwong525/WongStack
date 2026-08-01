## Context

The pack's current staging model is one Worker with two databases. `wrangler.jsonc` carries a single `d1_databases` entry holding `database_id` (production) and `preview_database_id` (staging); on a non-production branch `scripts/cf-build.sh` migrates staging and then `scripts/swap-d1-id.js` regex-swaps the two ids so the resulting deploy binds staging.

That design rests on an assumption that only holds for HTTP handlers. Cloudflare Workers Builds uploads a **version** on non-production branches — which is why previews are served at `<branch-alias>-<worker>.workers.dev` — and a version is not a deployment:

```
                        HTTP req    queue msg   cron   DO alarm
  version (preview) ──▶    ✓           ✗         ✗       ✗
  deployment (prod) ──▶    ✓           ✓         ✓       ✓
```

Queue consumers, cron triggers, and every other non-request entry point are attached to the Worker's **deployed** version. A branch version never receives them; the production deployment does, running production code against production bindings. The swap is therefore not an imperfect isolation — it is isolation of exactly one code path, and silently absent for the rest.

The unit of isolation on Cloudflare is the **Worker**, and a Wrangler environment is how you get a second one. The constraint that originally blocked this — Workers Builds running a single fixed deploy command for all branches — does not actually hold: the deploy command is configurable, confirmed during exploration. That makes a deploy wrapper the natural sibling of the existing build wrapper.

## Goals / Non-Goals

**Goals:**

- Staging is a real deployment of a separate Worker, so queues, crons, and any future non-request handler run branch code against staging bindings.
- The config-rewriting hack is removed, not replaced by a different one. No script mutates `wrangler.jsonc`.
- Per-commit preview URLs survive the switch to a custom deploy command.
- The pack states a rule that answers "what does staging bind to?" for bindings it does not yet ship, so the next stateful resource does not reopen this bug.
- Repos already carrying the old scripts have a written upgrade path, since `/wong-sync` will not modify a file that exists.

**Non-Goals:**

- Per-PR Worker environments. Explicitly declined and documented as declined (see Decisions).
- Any change to migration mechanics, timestamp prefixes, forward-only rules, the seeded-staging model, or the production-recovery runbooks.
- Application changes in this repo's `app/` — it is the scaffold SPA and binds no database.

## Decisions

### A Wrangler environment, not a second queue

Adding a staging queue alone does nothing: a queue consumer is registered against a Worker, so a second queue naming the same Worker as consumer still delivers to the deployed production version. The environment is what creates a second Worker (`env.staging.name`), and only a second Worker can carry its own consumer registration.

Alternative considered: keep one Worker and gate behavior on an environment variable at runtime. Rejected — the bindings themselves are the thing that must differ, and a runtime branch means production code paths carry staging logic forever.

### `cf-deploy.sh`, the fourth pack script

Workers Builds exposes one deploy command, so branch logic lives in a script the same way `cf-build.sh` already handles the build:

```
  scripts/cf-build.sh    npm run build      migrate the right D1, then build
  scripts/cf-deploy.sh   deploy command     deploy to the right Worker
```

Behavior:

| Branch | Command(s) |
|---|---|
| production | `wrangler deploy` |
| any other | `wrangler versions upload --env staging --preview-alias <branch>` then `wrangler deploy --env staging` |

Both non-production commands carry `--env staging`. Without it the version upload reverts to being a version of the *production* Worker, bound to production D1 — reintroducing exactly the bug this change removes. This is the single sharpest edge in the design and is called out in the script's header comment and the wiki page.

The script keeps the pack's zero-config property: it reads the branch from `WORKERS_CI_BRANCH`, the production branch from `CF_PRODUCTION_BRANCH` (default `main`), and locates the wrangler config through the shared `lib-wrangler-config.mjs` resolution rule. No repo-specific value is baked in, so every copy stays byte-identical.

### Two preview URLs with different capabilities

A branch push now produces two reachable URLs:

```
  <branch>-<worker>-staging.workers.dev   version alias — HTTP only, per-commit
  <worker>-staging.workers.dev            the deployed staging Worker — queues, crons
```

Keeping the alias preserves per-commit UI review, which the pack has today and which the custom deploy command would otherwise silently switch off. The cost is that "why didn't my import run?" is now answerable by "you were on the alias URL" — so the capability difference is documented at the point the URLs are introduced, not in a footnote.

Alternative considered: drop the alias and have one URL per branch. Rejected — the alias is free, already relied on, and its absence would be discovered as a regression.

### Twin by default, prefix only when a twin is impossible

Two ways to isolate a stateful binding, and they are not equally cheap:

- **Twin** — a second resource with a different id behind the same binding name. Zero application code; the Worker never learns which one it got.
- **Prefix** — one shared resource with staging namespaced inside it. Every write site must cooperate, forever, and one forgetful call site writes into production data.

That asymmetry decides it. The pack states **twin by default**, and the R2 key-prefix approach is explicitly rejected: a second bucket is free and needs no code, a prefix is a permanent tax on every future call site.

| Binding | Staging | Note |
|---|---|---|
| D1 | twin database | already the model |
| Queues | twin queue | producer *and* consumer both inside `env.staging` |
| R2 | twin bucket | not a key prefix |
| KV | twin namespace | |
| Durable Objects | free | DO storage is per-Worker; a separate Worker is already isolated |
| Cron triggers | declare or omit | omit unless staging should fire on its own schedule |
| Secrets | re-put per environment | `wrangler secret put --env staging` — the easiest one to forget |
| Service bindings | **must** repoint | a staging Worker bound to a production service is a silent cross-environment call |

The last two are the ones that bite. A missing secret fails loudly on first run; a service binding left pointing at production fails quietly — staging code, production side effects.

### Staging stays shared; per-PR environments are declined

Cloudflare does not give a Worker per PR, and the pack will not build one. A per-PR environment needs a created-migrated-seeded D1, its own queue, its own secrets, its own bucket, its own Access policy, and a teardown on PR close, or orphaned resources accumulate — a provisioner larger than most apps that would use it.

This is also less of a change than it appears: the pack's staging **database** has always been shared across branches, and `d1-pipeline.md` already documents branches stomping each other with `db:reset:staging` as the recovery. Code isolation now matches the isolation the data never had. The wiki records the decision so it is not re-litigated; the escape hatch is small, since `cf-deploy.sh` already knows the branch name.

### `swap-d1-id.js` is deleted, not deprecated

Keeping it would leave two contradictory staging models in the pack. It is removed from the manifest and the repo, and `preview_database_id` disappears from the fragment. `reset-staging-d1.mjs` and the `db:migrate:staging` script switch from `--preview` to `--env staging` in the same change, so `--preview` appears nowhere in the pack afterwards.

## Risks / Trade-offs

- **The Workers Builds deploy command must be repointed by hand.** → It is a one-time dashboard setting and the first step of the adoption runbook; a repo that forgets keeps the default command and simply gets today's behavior, which is not worse than the status quo.
- **`--env staging` omitted from `versions upload` reinstates the original bug, quietly.** → Called out in the script comment and the wiki; the script constructs both commands from one shared flag so they cannot drift apart.
- **Two branches pushing within the same window overwrite the staging Worker.** → Accepted, and consistent with the already-shared staging database. Documented alongside the existing shared-staging caveat.
- **Staging secrets and service bindings are per-environment and easy to miss.** → Both are rows in the twin table and steps in the adoption runbook; the service-binding case is flagged as the silent one.
- **`/wong-sync` cannot deliver this to a repo that already has the pack** — it never modifies an existing file, so `cf-build.sh` stays stale and `swap-d1-id.js` stays present. → The adoption runbook is the deliverable that covers it, surfaced through the adapt step as a proposal like any other present-file gap.
- **A repo mid-upgrade has an `env.staging` block but the old deploy command.** → The runbook orders the steps so the config lands before the dashboard is repointed; in that intermediate state branch deploys behave as they do today.

## Migration Plan

The adoption runbook, in the order a human runs it:

1. Create the staging twins: D1 (or reuse the existing `preview_database_id` database), queue, bucket, KV namespace as applicable.
2. Add the `env.staging` block to `wrangler.jsonc`; remove `preview_database_id`.
3. `wrangler secret put --env staging <NAME>` for every secret the Worker reads.
4. Repoint any service binding inside `env.staging` at its staging counterpart.
5. Add an Access policy for the staging Worker's hostname.
6. Take the new `scripts/cf-deploy.sh` and the updated `cf-build.sh` / `reset-staging-d1.mjs`; delete `scripts/swap-d1-id.js`.
7. Update the `package.json` `db:*` scripts from `--preview` to `--env staging`.
8. Set the Workers Builds **deploy command** to `bash scripts/cf-deploy.sh`.
9. Push a branch; confirm both URLs respond and that a queue message is handled by the staging Worker against the staging database.

Rollback is restoring `swap-d1-id.js`, reverting the fragment, and resetting the dashboard's deploy command to the default — no data migration is involved, since the staging database is a seeded fixture that `db:reset:staging` rebuilds.

## Open Questions

None blocking. Two are worth revisiting after a repo has run on this for a while: whether the version-alias upload is worth its extra build time once the staging Worker URL is habitual, and whether cron triggers should default to declared-but-disabled in `env.staging` rather than omitted.
