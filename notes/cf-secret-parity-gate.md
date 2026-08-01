---
slug: cf-secret-parity-gate
started: 2026-08-01
updated: 2026-08-01
consolidated:
---

# Secrets and parity across the two-Worker stack

Started as a question, not a change: *now that staging is a full environment, what changes about secrets, how are they synced, and can I trust that staging green means prod green?* The change came out of answering it.

## What the user has, and what they asked

Their app runs the stack pack's two-Worker model (v8.0.0 `env.staging`). They wanted to know what to do differently with secrets, and whether testing on staging is a real guarantee for production.

Their own framing, which turned out to be right and drove the design: **keep the secrets on prod and staging Workers the same as `.env` locally** — one source of truth, pushed everywhere. They were unsure it made sense.

They also stated, unprompted, the fact that reshaped the cron half of this work: **"For crons we don't have them working on staging, only manual triggers."**

## The three-kinds-of-secret split

The thing that makes this confusing is that "secret" means three different things in this stack, and only one of them changed when staging arrived:

- **CI credentials** (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) — GitHub repo secrets. One pair, shared by both environments. Unaffected by staging.
- **Worker runtime secrets** — per-Worker, nothing syncs them. This is the entire new burden.
- **Local dev** — `.dev.vars`, which `wrangler dev` reads.

The user's instinct was right but pointed at the wrong file. `.env` is what you *authenticate with*; `.dev.vars` is what the *Worker reads*. `.dev.vars` already corresponds exactly to the Worker's runtime environment, which is what makes "one file loads both Workers" safe rather than catastrophic. Pushing `.env` would put an account-root credential into a Worker.

## Staging→prod parity: what it does and doesn't buy

Answered honestly rather than reassuringly, because the user asked whether they could *be sure*:

**Proves** — the runtime, the bindings, the build, and (new with the two-Worker model) that queues and crons actually run.

**Doesn't prove:**
1. **Migrations against real data.** Staging is a seeded fixture, not a mirror. `ADD COLUMN ... NOT NULL` passes on a 12-row seed and fails on 400k production rows with NULLs. Time Travel is the net here, not staging.
2. **Migration ordering.** Staging replays in filename order after a reset; production applies incrementally in merge order. The additive/order-independent rule is what makes staging predictive at all.
3. **Config drift.** `env.staging` inherits nothing it doesn't redeclare (among vars and bindings) — drift is the default, not the exception. This is what became the gate.
4. **Cron scheduling** — see below.

Also flagged the operational gotcha that isn't a parity issue but bites identically: two preview URLs per branch, and only the deployed staging Worker URL runs queues and crons. "Why didn't my import run" is almost always the alias URL.

## The cron correction

The user said staging is manual-trigger-only. Checking *how* that's enforced turned up a real doc bug, verified against wrangler's `config-schema.json`: **only `vars` and bindings are non-inheritable — `triggers` inherits.** The pipeline docs said to *omit* crons from `env.staging` to keep staging manual, which does the opposite: staging inherits production's schedule and fires against the staging database, silently.

So the user's setup is safe today only because they have no crons declared. The day they add one, staging starts firing unasked.

Residual gap now that it's correct: manual-trigger-only means the *handler* is tested and the *schedule* isn't. Mitigation recorded in the docs — keep `scheduled()` and the manual trigger calling the same function, and verify the cron expression in the Worker's Triggers tab after deploy, since it's only ever verifiable in production.

## Design tension worth remembering

Two constraints pulled against each other repeatedly and decided several calls:

- **`/wong-sync` never modifies a file a target already has.** So any new capability must work as a *standalone new file* against untouched old files. This is why `lib-wrangler-config.mjs` was left alone despite being the obvious home for a config parser — extending it would have shipped a script that crashes on copy-in for every pre-8.2 repo.
- **A pack repo must never get a permanently red check.** The existing build-only fallback establishes it. It's why the gate skips (never fails) on no token *and* on no `env.staging`, the latter found only by running the check against this repo's own template app.

The general lesson, worth keeping: in this codebase "fails loudly" and "fails the build" are not the same goal. The gate's job is catching drift within a model, not forcing adoption of it.

## Guidance given for their per-change workflow

1. New secret → it lands in `.dev.vars`, `secrets:push` loads both. Add the blank documented line to `.dev.vars.example` in the same commit.
2. New stateful binding → add to `env.staging` in the same edit. Twin it, never a key prefix.
3. Schema change → additive and self-contained; update `schema/seed.sql` in the same change.
4. Before merging a migration that touches existing data → reason about production's data explicitly, because staging structurally cannot.
5. Exercise on the staging Worker URL, not the alias, when queues or crons are involved.

Divergence rule they should apply: same values are fine by default; diverge via `.dev.vars.staging` for anything with third-party **write** side effects — payment, outbound email/SMS, webhooks — since sharing those re-opens at the API layer the hole that twinning D1 closes.

## Open thread

The `wrangler secret bulk` / `secret list` round-trip was never exercised against a live Cloudflare account — `push` reached the wrangler invocation and stopped at auth. The parsing is defensive (retries without `--format json`, reports "could not read secret names" rather than asserting false parity), but the happy path is unproven against real Workers. Worth confirming on the user's next real push.
