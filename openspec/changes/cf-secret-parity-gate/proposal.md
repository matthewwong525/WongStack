# cf-secret-parity-gate

**Status:** ready-to-ship
**Open questions:** none

## Why

Since 8.0.0 the stack pack runs two Workers, and a Wrangler environment inherits nothing it doesn't redeclare. That makes **drift the default state**: Worker secrets are per-Worker with nothing syncing them, so every new secret needs two `wrangler secret put` calls and a forgotten one is only discovered at runtime. Nothing in the pack detects the gap, and the pack's own twin table gets cron triggers wrong in a way that fails silently.

## What Changes

- **New `scripts/cf-secrets.mjs`**, with `secrets:push` and `secrets:check` package scripts. `.dev.vars` becomes the declared source of truth for Worker **runtime** secrets: push loads it into production and `.dev.vars.staging` (falling back to `.dev.vars`) into `--env staging`, via `wrangler secret bulk`, which reads dotenv `KEY=VALUE` natively.
- **The script refuses `.env` by name.** `.env` holds `CLOUDFLARE_API_TOKEN` — a user-scoped, self-widening, account-root credential — plus the Access service tokens. None may enter a Worker's runtime secret store, where a log leak or code-exec bug would escalate to the whole Cloudflare account. The `.env` / `.dev.vars` split is a safety boundary and is enforced in code, not by convention.
- **`secrets:check` is a parity gate wired into `.github/workflows/deploy.yml`.** Because `.dev.vars` is git-ignored and so absent in CI, the authoritative comparison is **Worker against Worker** — production's secret names against staging's — plus an assertion that every stateful binding declared at the top level of `wrangler.jsonc` reappears inside `env.staging`. **Names only, never values.** Without `CLOUDFLARE_API_TOKEN` the secret half skips with a clear message rather than failing, matching the workflow's existing build-only fallback; the credential-free binding half still runs.
- **New committed `.dev.vars.example`**, carrying the runtime secrets' *names* with blank values, mirroring the `.env.example` convention. It gives the expected key set a reviewable home in git and drives warnings — never failures, since it is uncorroborated.
- **Fragment updates**: `.gitignore` `.dev.vars` → `.dev.vars*` with a `!.dev.vars.example` negation, so a per-environment secrets file can't be committed while the example stays committable; the `package.json` fragment gains the two new scripts.
- **Doc bug fix — cron triggers.** Verified against wrangler's `config-schema.json`: only `vars` and bindings are non-inheritable. `triggers` is an ordinary **inheritable** key, so `env.staging` inherits top-level crons and fires on schedule against the staging database. `wiki/stack/d1-pipeline.md` currently tells readers to *omit* crons from `env.staging` to keep staging manual — which does the opposite of what it claims. Corrected to the explicit override `"triggers": { "crons": [] }`, with the inheritable-vs-non-inheritable distinction stated where the docs assert "inherits nothing it doesn't redeclare".
- **Release**: `VERSION` bump and a newest-first `CHANGELOG.md` entry, since this edits the payload.

**Non-goals**: no per-PR environments; no secret-value synchronisation or storage (the gate compares names only, and values never leave `.dev.vars`); no change to `secrets-convention`, which is deliberately stack-neutral and must not gain wrangler or Cloudflare assumptions — everything here is pack-scoped.

## Capabilities

### New Capabilities
- `cf-secret-parity`: `.dev.vars` as the declared source of truth for Worker runtime secrets, the two-Worker push, the refusal to read `.env`, and the names-only secret-and-binding parity gate in CI.

### Modified Capabilities
- `stack-pack`: the twin-table requirement gains the corrected cron-trigger rule (an explicit empty-crons override, not omission) and the inheritable-key distinction; the zero-config-scripts requirement extends to `cf-secrets.mjs` and distinguishes `.env` (CI/provisioning credentials) from `.dev.vars` (Worker runtime secrets); the config-fragments requirement covers `.dev.vars*` and the two new package scripts.

## Impact

- **New**: `scripts/cf-secrets.mjs`, `.dev.vars.example`.
- **Modified**: `.github/workflows/deploy.yml` (a parity-check step), `.gitignore` (`.dev.vars*` + the `!.dev.vars.example` negation), `wiki/stack/d1-pipeline.md` (twin table, inheritance explanation, the secret-model section), `.claude/skills/wong-sync/references/stack-pack-fragments.md` (`.gitignore`, `package.json`, and `wrangler.jsonc` fragments), `.claude/skills/wong-sync/references/payload-manifest.md` (the new script and example file), `VERSION`, `CHANGELOG.md`. (`.claude/skills/**` and `.agents/skills/**` are hardlinked to the same inodes; git tracks the `.agents/` path.)
- **Behavioural**: pack repos gain a CI check that can newly fail on a repo whose two Workers already disagree — the intended outcome, and the message names the missing keys or bindings so the fix is mechanical.
- **Dependencies**: none added. `wrangler secret bulk` and `wrangler secret list` are existing CLI surface.

## Decision log

- **2026-08-01** — Planned and implemented in one session; all 27 tasks landed, `VERSION` 8.1.0 → 8.2.0. Five decisions were revised *during* implementation, each because building the thing exposed something the plan had wrong:
  - **The gate compares Worker-against-Worker, not against `.dev.vars`.** The original spec had the check diffing each Worker against the declared file — unrunnable, because `.dev.vars` is git-ignored and therefore absent in CI, which is the one place the check must run. Worker-vs-Worker needs no file, no value, no local state, and states the property we actually want more directly. A committed `.dev.vars.example` was added as a warn-only declared list; it also covers the one case Worker-vs-Worker structurally cannot see (a key missing from *both*).
  - **`lib-wrangler-config.mjs` deliberately left unmodified.** Adding an object parser there was the obvious move and would have broken adoption: `/wong-sync` never modifies a file a target already has, so a `cf-secrets.mjs` importing a new export would land in a pre-8.2 repo and crash immediately. The script imports only exports that have existed since v8 and carries its own JSONC parsing. Duplication bought clean copy-if-absent adoption.
  - **No `env.staging` at all now skips rather than fails.** Found by running the check against this repo's own template app, which has no staging environment — it would have gone permanently red, the exact outcome the pack's build-only fallback exists to prevent. The gate catches drift *within* the two-Worker model; it does not demand the model.
  - **The `CLOUDFLARE_*` / `CF_ACCESS_*` key check ships fatal, not as a warning.** The design had it advisory on the reasoning that the file boundary is the real control. That reasoning explains why it can't be *primary*, not why it should be survivable: warning and then pushing lands the account-root credential in the Worker regardless.
  - **`push` takes an optional file argument and resolves symlinks.** Without an argument the `.env` refusal was unreachable dead code — `push` only ever read `.dev.vars`, so nobody could point it at `.env`. The argument is exactly the path a person reaches for when they want "the file with the secrets in it," which is what makes the refusal worth having; `realpath` closes the `.dev.vars -> .env` route to the same mistake.
  - Also corrected a **documentation bug** verified against wrangler's `config-schema.json`: only `vars` and bindings are non-inheritable, so `triggers` inherits. `d1-pipeline.md` told readers to *omit* crons from `env.staging` to keep staging manual, which silently does the opposite — staging inherits production's schedule and fires against the staging database. Now an explicit `"triggers": { "crons": [] }`, with the inheritable/non-inheritable split stated because the two failure directions are opposite and both silent.
  - **Ruled out:** a key-name deny-list as the primary `.env` guard (fails open on any credential nobody named); requiring `.dev.vars.staging` always (ceremony for repos that never diverge, and an empty-by-obligation file silently blanks staging); deriving the declared key list from `.env.example` (conflates the two credential roles this change exists to separate); linking the pack page from `wiki/development/secrets.md` (would couple the stack-neutral page to Cloudflare and dead-link in repos that declined the pack).
  - **Verified by execution**, not inspection: JSONC parsing with `//` inside comments, quoted commas and trailing commas; missing KV/R2/queue-*consumer* detected; service-binding-pointing-at-production warned; clean config exits 0; explicit `.env` refused; `.dev.vars -> .env` symlink refused; a pasted `CLOUDFLARE_API_TOKEN` refused; all three CI states; this repo's own check green; all internal wiki anchors resolve.
  - **Not verified:** no live Cloudflare account was used, so the `wrangler secret bulk` / `secret list` round-trip against real Workers is untested — `push` reached the wrangler invocation and stopped at auth.
