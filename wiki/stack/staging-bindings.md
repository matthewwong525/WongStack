# Staging bindings and secrets

How the staging Worker gets its own copy of every database, queue, bucket, and secret, so a branch never writes to production. It is part of the [deploy and data pipeline](d1-pipeline.md) on the [Cloudflare stack](README.md): staging is [a whole second Worker](d1-pipeline.md#why-staging-is-a-whole-worker), and this page covers what that Worker must declare for itself.

## Twin every stateful binding

Among `vars` and bindings, an environment **inherits nothing it doesn't redeclare**. Every stateful binding must appear inside `env.staging` pointing at its own resource — a *twin*, not a shared resource with a staging namespace inside it.

That scope matters, because the rest of the config behaves the *opposite* way:

```
  non-inheritable   vars, bindings        env.staging starts EMPTY
                                          → forget one and staging lacks it

  inheritable       triggers, limits,     env.staging starts from PRODUCTION
                    observability, …      → forget one and staging silently
                                            acquires production's behaviour
```

Both directions are silent. The first is the one the twin table below covers; the second is why [cron triggers](#cron-triggers-inherit-omitting-them-does-not-disable-them) need an explicit override rather than an omission.

That's a deliberate rule, and the reason is cost:

- A **twin** is a second resource behind the same binding name. It needs **zero application code** — the Worker never learns which one it got.
- A **prefix** (one bucket, staging keys under `staging/`) needs **every call site to cooperate**, forever. One forgetful write goes into production data.

So: twin by default; a prefix only where a twin genuinely isn't available.

| Binding | In staging | Note |
|---|---|---|
| D1 | twin database | must declare its own `database_name` and `database_id` — the scripts read them from inside the environment, and every staging step stops when either matches production's, since an entry copied from production and renamed by hand still points at live data |
| Queues | twin queue | **producer and consumer both**, or staging messages land on the production consumer |
| R2 | twin bucket | not a `staging/` key prefix |
| KV | twin namespace | |
| Durable Objects | nothing to do | DO storage is per-Worker; a separate Worker is already isolated |
| Cron triggers | **explicit** `"triggers": { "crons": [] }` | inheritable — omitting the key inherits production's schedule, it does not disable it |
| Secrets | `npm run secrets:push` | loads both Workers from `app/.dev.vars`; see [the secret model](#one-declared-list-of-secrets-two-workers) |
| Service bindings | **repoint** at the staging counterpart | |

The last two bite differently. A missing staging secret fails **loudly** on the first run. A service binding copied into `env.staging` but left pointing at production fails **quietly** — staging code, production side effects, no error anywhere.

You don't have to catch either by eye: **`npm run secrets:check`** fails the build when a binding declared at the top level is missing from `env.staging` or when the two Workers' secret names disagree, and warns when a staging service binding still targets production's service. It runs on every push.

The exact JSONC to merge is in the pack's [config fragments](../../.agents/skills/wong-sync/references/stack-pack-fragments.md).

### Cron triggers inherit; omitting them does not disable them

The row above is the one place the twin table's logic inverts, so it is worth stating on its own. `triggers` is an **inheritable** key. Declare crons at the top level and leave `env.staging` silent, and the staging Worker inherits that schedule and fires on it — against the staging database, with no error and nothing in the config that looks wrong.

To keep staging manual-only, say so:

```jsonc
"env": {
  "staging": {
    "triggers": { "crons": [] }
  }
}
```

Omit the key **only** when staging genuinely should run production's schedule.

Exercising a cron by manual trigger instead is the convention, and it costs less than it looks: what goes untested is the *schedule*, not the handler. A new scheduled job gets a manual trigger, reachable on staging only, and `scheduled()` and the trigger call the same function so the tested path can't drift from the real one. [`/verify`](../development/staging-walkthrough.md#why-a-walk-runs-the-way-it-does) runs the job through that trigger on the staging Worker's own URL, since an alias version runs no queue consumer. The cron expression itself is only ever verifiable in production — check the Worker's Triggers tab after the first deploy.

## One declared list of secrets, two Workers

`env.staging` is a second Worker, so it has a second secret store. Nothing syncs the two: a `wrangler secret put` reaches exactly one of them, which makes "remember two commands, forever" the maintenance burden and drift the default state. A secret missing from staging is the most common staging failure. It is the friendly kind: the binding is absent, so the Worker throws on first use rather than doing something subtly wrong.

The pack collapses that to one declared list.

```
  app/.dev.vars          ─┬─▶  production Worker
  (git-ignored,           │
   your real values)      └─▶  staging Worker    ← unless app/.dev.vars.staging exists

  app/.dev.vars.example  committed, names only — what `secrets:check` compares against
```

```bash
npm run secrets:push    # load both Workers from app/.dev.vars
npm run secrets:check   # do the two Workers still agree?
```

The files sit beside `app/wrangler.jsonc`, because the script reads them from the folder that holds the wrangler config. `wrangler dev` reads `.dev.vars` from the same folder, so one file serves local development and both deployments. In a linked worktree, `app/.dev.vars` is the branch's own copy; the [secrets convention](../development/secrets.md#worktrees-and-branch-copies) owns how its edits reach the primary. A worktree with no copy pushes from the primary checkout's `app/.dev.vars`. A branch copy pushes its own values, branch-only ones included, to both Workers — push from the primary checkout when production must match `main`.

### `.env` and `.dev.vars` are not interchangeable

| File | Holds | Reaches |
|---|---|---|
| `.env` (repo root) | what you and the pack's scripts authenticate **with** — chiefly `CLOUDFLARE_API_TOKEN` | Cloudflare's API. **Never a Worker.** |
| `app/.dev.vars` (beside `wrangler.jsonc`) | what the **Worker** reads off `env` | both Workers, via `secrets:push` |

Each has a committed, values-blank `.example` beside it: `.env.example` at the root, `app/.dev.vars.example` in `app/`.

`CLOUDFLARE_API_TOKEN` can widen its own permissions and create account resources. Put it in a Worker's runtime environment and any log leak or code-execution bug there escalates to the whole Cloudflare account. `secrets:push` **refuses** to load `.env` — it resolves symlinks first, and it also stops if `.dev.vars` itself contains a `CLOUDFLARE_*` or `CF_ACCESS_*` key. That's a guard rather than a note in a doc because the two files look interchangeable and the mistake only has to happen once.

### Same values by default; diverge where writes escape

`secrets:push` falls back to `.dev.vars` for staging, so both Workers get identical values unless you create a git-ignored **`app/.dev.vars.staging`**. No command changes; the file's existence is the switch. [The live app's key for its sign-in list](employee-access.md#the-key) is production-only, and setup stores it for you: leave its name out of staging entirely, even as a blank declaration. A preview keeps [a practice list](employee-access.md#the-practice-list-on-previews) and needs no key. Both target files/config are validated before the first push, so an unsafe fallback or override loads nothing.

Identical values are fine for read-only or harmless credentials. **Diverge for anything with third-party write side effects** — payment keys, outbound email and SMS, webhook targets. Sharing those lets a branch on staging charge a real card or email a real customer: the same production-contamination hole that twinning the database closes, re-opened one layer up at the API. It fails quietly, in the same family as a service binding left pointing at production.

**Copy `app/.dev.vars` to `app/.dev.vars.staging` and swap each such key for a test key**: a payment provider's test-mode key, a sandbox inbox. The file replaces `.dev.vars` for staging whole, so a key it leaves out is not loaded. The check before publishing uses a service freely only when staging has its own key for it, and leaves a service on a shared key alone, so a missing test key costs a check, never a real charge.

```bash
node scripts/cf-secrets.mjs shared   # which keys does staging share with production?
```

It prints key names in two lists, `own` and `shared`, and never a value; with no staging file, every key is shared. It compares the two files on this machine and makes no network call, because a deployed secret can't be read back: after editing either file, run `secrets:push` so the Workers match. It can only compare, so a live key pasted into the staging file still reads as `own`.

### What the gate can and can't see

`secrets:check` compares **names only** — no value is read, printed, or logged, so it is safe in CI where output is retained. Because `app/.dev.vars` is git-ignored and absent in CI, the assertion that *fails* is Worker against Worker: production's secret names against staging's, except the documented production-only Access management names. The check rejects those names on staging. `app/.dev.vars.example` is consulted when present, but only to **warn** — it is uncorroborated, and a repo may set a secret out of band.

That leaves one blind spot by construction: a key missing from *both* Workers looks like perfect parity. The example file's warning is what covers it, which is the reason to keep it current.

The check **skips rather than fails** on any of three conditions, so adopting the pack never produces a permanently red check:

| Condition | What it means | What is still checked |
|---|---|---|
| No wrangler config at all | The state the pack ships in, before provisioning writes one | Nothing — there is nothing to read |
| No `CLOUDFLARE_API_TOKEN` | Not provisioned yet | The binding half: production's bindings against `env.staging`'s |
| No `env.staging` | Not on the two-Worker model | The secret half, if a token is present |

Each skip prints why, and exits successfully. Only real drift fails: a production binding missing from a declared `env.staging`, or the two Workers' secret names disagreeing. The first row was the gap that made the promise above untrue for the pack's own shipping state — CI was red on the first push after adoption, at a step that ran before the token guard.

## Next

- The rest of the pipeline, from build to deploy: [deploy and data pipeline](d1-pipeline.md).
- The token the scripts authenticate with: [Cloudflare credentials](cloudflare-credentials.md).
- Back to the stack overview: [Cloudflare stack](README.md).
