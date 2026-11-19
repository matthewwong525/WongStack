<!-- openspec-archive v1 2026-08-01-cf-secret-parity-gate -->
<!-- file proposal.md utf8 9148 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 12491 -->
## Context

Since 8.0.0 the pack runs two Workers — production and `env.staging` — and a Wrangler environment inherits nothing it doesn't redeclare among `vars` and bindings. Secrets are stored per Worker with nothing syncing them, so the maintenance burden is "remember two commands, forever," and the failure surfaces at runtime in staging or, worse, not at all.

Three existing facts constrain the design:

- **Pack scripts are byte-identical across repos** (`stack-pack` spec). No repo-specific literal, no secret key names in the script. `scripts/lib-wrangler-config.mjs` already owns "where is the wrangler config" and "what does this environment declare."
- **`.env` and `.dev.vars` are different files with different blast radii.** `.env` holds `CLOUDFLARE_API_TOKEN`, a user-scoped credential that widens its own permissions and creates account resources. `.dev.vars` holds what the Worker reads off `env`.
- **The workflow must stay green on an unprovisioned repo.** `deploy.yml` already builds without deploying when `CLOUDFLARE_API_TOKEN` is unset, so a repo that hasn't run `/wong-cloudflare` gets a real PR check rather than a permanently red one.

## Goals / Non-Goals

**Goals:**
- One declared list of Worker runtime secrets; one command loads both Workers from it.
- Make the `.env` / `.dev.vars` boundary a mechanism rather than a convention.
- Detect secret and binding drift between the two Workers in CI, without ever handling a secret value.
- Fail loudly and mechanically — the message names the missing key or binding.

**Non-Goals:**
- Storing, encrypting, or synchronising secret *values* anywhere. Values live in `.dev.vars` on a maintainer's machine and in Cloudflare; the gate compares names.
- Changing `secrets-convention`, which is deliberately stack-neutral and must not acquire wrangler or Cloudflare assumptions. Everything here is pack-scoped.
- Per-PR environments. Declined in `d1-pipeline.md` and not revisited.

## Decisions

### `.dev.vars` is the source of truth, and `.env` is refused in code

`.dev.vars` already corresponds exactly to what the Worker reads, and `wrangler secret bulk` consumes dotenv `KEY=VALUE` natively (verified against wrangler's CLI help: JSON *or* `.env` form, up to 100 secrets per call), so no conversion layer is needed.

The refusal of `.env` is the reason this is a script rather than two documented one-liners. A documented `wrangler secret bulk <file>` invites someone to point it at `.env` — the file whose name they already associate with "the secrets" — and that single mistake puts an account-root credential into a Worker's runtime environment, where a log leak or code-execution bug escalates to the whole Cloudflare account. Refusing by explicit path check converts a silent catastrophic misuse into an exit code.

*Alternative considered:* a deny-list of key names (`CLOUDFLARE_*`, `CF_ACCESS_*`) instead of a file check. Rejected as the primary mechanism — it fails open on any credential nobody thought to name. The file boundary is the real control; the key-name check is a backstop for a credential pasted into `.dev.vars` directly.

Two details settled while testing:

- **The backstop is fatal, not a warning.** "Backstop, not the control" describes why it can't be the *primary* mechanism, not that it should be advisory. If `.dev.vars` genuinely contains `CLOUDFLARE_API_TOKEN`, warning and then pushing lands the credential in the Worker regardless — the precise outcome this exists to prevent. It exits non-zero.
- **`push` takes an optional file argument**, and the guard resolves symlinks before judging the name. Without an argument the guard was unreachable — `push` only ever read `.dev.vars`, so no one could point it at `.env` and the refusal was dead code. The argument is exactly the path a person reaches for when they want "the file with the secrets in it," which is what makes the refusal worth having; `realpath` closes the `.dev.vars -> .env` symlink route to the same mistake.

### Identical values by default; divergence by adding a file

Staging pushes `.dev.vars.staging` when it exists and `.dev.vars` otherwise. That makes "same values everywhere" the zero-configuration default (correct for the common case: read-only or harmless credentials) while divergence costs one file and no script edit.

Divergence is documented as *required* for secrets with third-party **write** side effects — payment keys, outbound email/SMS, webhook targets. Sharing those re-opens at the API layer precisely the production-contamination hole that twinning D1 closes, and it fails quietly, in the same family as the service-binding-left-pointing-at-production trap the docs already flag.

*Alternative considered:* requiring both files always. Rejected — it front-loads ceremony on repos that will never need divergence, and an empty-by-obligation `.dev.vars.staging` is a footgun that silently blanks staging's secrets.

### The gate compares the two Workers to each other, not to a local file

**This is the decision that shapes the CI step.** `.dev.vars` is git-ignored, so it does not exist in CI. A check defined as "diff `wrangler secret list` against `.dev.vars`" is therefore unrunnable in exactly the place it needs to run.

So the gate's CI-capable assertion is **Worker ↔ Worker**: list both environments' secret names and require them to match. That needs no file, no value, and no local state — and it is a more direct statement of the property we actually want, which is parity between the two environments.

The declared-list check is retained as a *local* affordance: when `.dev.vars` is present, the script also reports keys declared but not deployed. A committed **`.dev.vars.example`** carries the key *names* (blank values), mirroring the `.env.example` convention, so a new contributor learns what to fill in and the declared set has a reviewable home in git.

This forces a detail in the `.gitignore` fragment: `.dev.vars*` alone would swallow `.dev.vars.example`, so the fragment pairs the wildcard with a `!.dev.vars.example` negation. Ignoring real values while committing the name list is the whole point of the pair, and getting it wrong in either direction is silent — either the example never lands in git, or a per-environment file full of live secrets becomes committable.

*Alternative considered:* deriving the declared list from `.env.example`. Rejected — that file documents CI and provisioning variables too, so it would conflate the two roles this change exists to separate.

### Missing fails; extra warns

A name present in one environment and absent in the other is **drift** and fails the build. A name present in a Worker but absent from `.dev.vars.example` **warns**, because a repo may legitimately set something out of band and a hard failure would make the gate hostile to adopt on day one. Direction matters: the asymmetry keeps the gate honest about the case that actually breaks staging.

### The new script extends nothing it depends on

`lib-wrangler-config.mjs` resolves the config path and reads a `database_name` by regex; it does not parse the config into an object, which binding parity needs. The obvious move — add a parser to the library — collides with how the pack is distributed: **`/wong-sync` never modifies a file the target already has.** A repo that installed the pack before this release keeps its existing library, so a `cf-secrets.mjs` importing a newly-added export would land as a copied file that immediately crashes, and the fix would be gated behind the adapt step.

So `cf-secrets.mjs` imports only the exports that already exist in every v8 copy (`repoRoot`, `findWranglerConfig`) and carries its own JSONC parsing. The new file is then self-sufficient: it works the moment it is copied in, against an untouched library. The small duplication buys clean adoption, which is the trade the whole copy-if-absent model is built on.

A hand-rolled comment/trailing-comma stripper does the parsing, since the design adds no dependency. `wrangler.toml` is not parsed — the binding half reports that it cannot check and continues, rather than guessing.

### Binding parity reads the config, not the API

The binding half compares the top-level `wrangler.jsonc` binding keys against `env.staging`'s, through `lib-wrangler-config.mjs`. It is a pure config read — cheap, credential-free, and therefore runnable even on an unprovisioned repo.

Two carve-outs, both from the existing twin table: **Durable Objects** are excluded (DO storage is per-Worker, so a separate Worker is already isolated), and **service bindings** are checked for presence and additionally *warn* when `env.staging` declares a service binding whose target equals production's — the documented quiet failure of staging code invoking production. It warns rather than fails because a genuinely shared downstream service is a legitimate, if rare, choice.

### Skip, don't fail, without a credential — or without `env.staging`

The CI step follows `deploy.yml`'s existing `if: env.CLOUDFLARE_API_TOKEN != ''` shape for the secret half, and prints why it skipped. The binding half needs no credential and can run unconditionally — an unprovisioned repo still gets that much signal.

The same principle extends one step further, found by running the check against this repo: a config with **no `env.staging` at all** skips rather than fails. The meta-repo's own template app has no staging environment, and a repo partway through the adoption runbook doesn't either; failing there would produce exactly the permanently-red check the pack's CI is designed to avoid. The gate's job is catching drift *within* the two-Worker model, not demanding that a repo adopt it. Missing bindings inside a declared `env.staging` still fail.

## Risks / Trade-offs

- **The gate fails on day one for repos already drifted** → That is the intended finding, but it shouldn't look like a broken release. The CHANGELOG entry states plainly that adopting repos should run `secrets:push` once, and the failure message names the keys so the fix is mechanical.
- **`wrangler secret list` output format is version-dependent** → Parse defensively and pin nothing; the pack deliberately pins no wrangler version. Implementation verifies the shape against the installed CLI before relying on it, and a parse failure reports "could not read secret names" rather than asserting false parity.
- **A 100-secret cap on `secret bulk`** → Far beyond any realistic pack repo, but the push reports the count so hitting it is legible rather than a truncated load.
- **`.dev.vars.example` can drift from `.dev.vars`** → It is only a warning source, never authoritative for the pass/fail comparison, so drift degrades the affordance without producing a false failure.
- **Two Workers can agree and both be wrong** (the same key missing from both) → Worker↔Worker parity cannot catch this by construction; the declared-list warning against `.dev.vars.example` is what covers it, and it is a warning precisely because the example file is uncorroborated.

## Migration Plan

Additive throughout: a new script, a new workflow step, two fragment edits, one doc correction. No existing script changes behaviour, so a repo that syncs the new payload and does nothing else keeps deploying exactly as before — the check simply starts reporting.

The `.gitignore` widening (`.dev.vars` → `.dev.vars*`) and the `triggers.crons` override are guided fragment merges, applied with confirmation, never blind writes. Rollback is deleting the workflow step; nothing acquires state.

## Open Questions

- ~~Does the installed `wrangler secret list` support a stable machine-readable flag?~~ **Resolved during implementation.** It takes `--format` with choices `json` and `pretty`, and **`json` is already the default**; `--env` is a global flag, so both environments are readable the same way. Because the pack pins no wrangler version, the script asks for `--format json` explicitly and retries without the flag if an older CLI rejects it — either path is then `JSON.parse`d defensively, and a parse failure reports "could not read secret names" rather than asserting false parity.
- Should `secrets:push` refuse to run in CI? Leaning yes, mirroring how `cf-deploy.sh` no-ops off a laptop and `cf-build.sh` refuses to touch a remote database outside CI — but here the polarity is inverted (push is a *human* action), so it is called out rather than assumed.

<!-- end design.md -->
<!-- file tasks.md utf8 5550 -->
## 1. The secrets script

- [x] 1.1 Verify against the installed wrangler CLI what `wrangler secret list` emits (a machine-readable flag vs. parsed output) and confirm `wrangler secret bulk` accepts a dotenv file with `--env`; record the finding in design.md's Open Questions so the parsing choice is justified rather than assumed
- [x] 1.2 Read `scripts/lib-wrangler-config.mjs` and confirm it exposes config resolution plus per-environment binding reads; extend it only if needed, keeping it byte-identical across repos (no repo-specific literal) — **left unmodified by design**: it has no object parser, but adding one would break copy-if-absent adoption for pre-existing repos, so `cf-secrets.mjs` imports only the existing v8 exports and carries its own JSONC parsing (see design.md)
- [x] 1.3 Create `scripts/cf-secrets.mjs` with `push` and `check` modes, resolving the wrangler config through the shared library and naming no secret key of its own
- [x] 1.4 Implement the `.env` refusal: an explicit path check that exits non-zero *before* contacting Cloudflare, with a message explaining the `.env` (CI/provisioning) vs `.dev.vars` (Worker runtime) split
- [x] 1.5 Add the secondary key-name check for `CLOUDFLARE_*` / `CF_ACCESS_*`-shaped keys found in whatever file is being pushed — **shipped fatal, not as a warning**: a warning that then pushes lands the credential in the Worker anyway, which is the outcome the feature exists to prevent (design.md revised). Also made the refusal reachable by giving `push` an optional file argument, and symlink-resolved so `.dev.vars -> .env` is caught
- [x] 1.6 Implement `push`: `.dev.vars` → production, `.dev.vars.staging` → `--env staging` falling back to `.dev.vars` when absent; report the count of keys loaded per environment
- [x] 1.7 Implement `check` secret half — Worker-against-Worker name comparison, failing on divergence and naming the missing keys; parse defensively and report "could not read secret names" rather than asserting false parity
- [x] 1.8 Implement `check` binding half — top-level `wrangler.jsonc` bindings vs `env.staging`, excluding Durable Objects, with a warning when a staging service binding targets production's service
- [x] 1.9 Implement the `.dev.vars.example` warning layer: declared-but-absent and held-but-undeclared are warnings only, never failures
- [x] 1.10 Audit every output path — success, failure, warning, and thrown-error — to confirm no secret value can be printed, logged, or included in a diff
- [x] 1.11 Make the secret half skip with a success exit and an explanatory message when `CLOUDFLARE_API_TOKEN` is unset, while the credential-free binding half still runs

## 2. CI wiring

- [x] 2.1 Add a parity-check step to `.github/workflows/deploy.yml`, placed after install and not requiring a build
- [x] 2.2 Confirm the step behaves correctly in all three states: unprovisioned (binding half only, green), provisioned and in parity (green), provisioned and drifted (red, naming the keys or bindings)

## 3. Payload files and fragments

- [x] 3.1 Add a committed `.dev.vars.example` with documented, values-blank key names, mirroring the `.env.example` convention
- [x] 3.2 Update the `.gitignore` fragment in `.claude/skills/wong-sync/references/stack-pack-fragments.md` to `.dev.vars*` plus the `!.dev.vars.example` negation, and state why the pair is needed
- [x] 3.3 Add `secrets:push` and `secrets:check` to that file's `package.json` fragment, with the `app/` subdirectory path variant the other script entries already document
- [x] 3.4 Add the `"triggers": { "crons": [] }` override to that file's `wrangler.jsonc` fragment, with a line on why omission is not equivalent
- [x] 3.5 Register `scripts/cf-secrets.mjs` and `.dev.vars.example` as stack-pack drop-in files in `.claude/skills/wong-sync/references/payload-manifest.md`

## 4. Docs

- [x] 4.1 Fix the cron-triggers row of the twin table in `wiki/stack/d1-pipeline.md` — the explicit empty-crons override, not omission
- [x] 4.2 Scope the "an environment inherits nothing it doesn't redeclare" claim in that page to `vars` and bindings, and add the inheritable-vs-non-inheritable distinction with cron triggers as the worked example
- [x] 4.3 Update the twin table's secrets row to point at `secrets:push` instead of a hand-run `wrangler secret put --env staging`
- [x] 4.4 Add `scripts/cf-secrets.mjs` to the page's script table and the two `secrets:*` commands to its common-operations block
- [x] 4.5 Document the secret model on that page: `.dev.vars` as source of truth, identical values by default, and divergence via `.dev.vars.staging` as required for third-party write side effects (payment, outbound messaging, webhooks)
- [x] 4.6 Check whether `wiki/development/secrets.md` needs a pointer to the pack-specific page — **no change made**: the page already names `.dev.vars` as a stack variant without depending on it, and linking the pack page would both couple the neutral page to Cloudflare and produce a dead link in any repo that declined the pack

## 5. Release

- [x] 5.1 Bump `VERSION` (minor — additive capability, no existing behaviour changes)
- [x] 5.2 Add a newest-first `CHANGELOG.md` entry covering the secrets script, the parity gate, and the cron-inheritance correction, stating plainly that an adopting repo should run `secrets:push` once and that the gate may newly fail on an already-drifted repo
- [x] 5.3 Run `openspec validate --changes cf-secret-parity-gate` and confirm the change is clean before handing off to `/save`

<!-- end tasks.md -->
<!-- file specs/cf-secret-parity/spec.md utf8 9796 -->
## ADDED Requirements

### Requirement: `.dev.vars` is the declared source of truth for Worker runtime secrets

The pack SHALL treat `.dev.vars` as the single declared list of secrets the Worker reads at runtime, and both deployed Workers SHALL be loadable from it. A `secrets:push` operation SHALL load `.dev.vars` into the production Worker and `.dev.vars.staging` into the staging Worker via `wrangler secret bulk`, which accepts dotenv `KEY=VALUE` input directly, so no format conversion is performed. When `.dev.vars.staging` is absent the staging push SHALL fall back to `.dev.vars`, making identical values across both Workers the zero-configuration default and a divergent value an opt-in achieved by creating the second file.

Per-environment divergence SHALL be documented as the correct choice for any secret with third-party **write** side effects — payment keys, outbound email or SMS credentials, webhook targets — because sharing such a value re-creates at the API layer the production-contamination hole that twinning stateful bindings closes.

#### Scenario: One command loads both Workers

- **WHEN** a maintainer adds a secret to `.dev.vars` and runs `secrets:push`
- **THEN** the secret is loaded into the production Worker and into the staging Worker
- **AND** neither Worker requires a separate hand-run `wrangler secret put`

#### Scenario: Staging diverges by adding a file, not by editing a script

- **WHEN** a repo needs staging to hold a different value for a secret
- **THEN** creating `.dev.vars.staging` is sufficient and the staging push reads it instead of `.dev.vars`
- **AND** a repo with no such file gets identical values in both Workers

### Requirement: The secrets script refuses to read `.env`

The secrets script SHALL refuse, by explicit check rather than by convention, to load `.env` (or any file resolving to it) into a Worker's runtime secret store, and SHALL exit non-zero with an explanation naming the `.env` / `.dev.vars` split. `.env` holds `CLOUDFLARE_API_TOKEN` — a user-scoped credential that can widen its own permissions and create account resources — together with the Cloudflare Access service tokens. Placing any of them in a Worker's runtime environment would let a log leak or code-execution bug in the Worker escalate to the entire Cloudflare account, so the separation SHALL be enforced in code.

The push operation SHALL accept an optional explicit file argument. Without one the refusal would be unreachable — the push would only ever read its default file — and the explicit argument is precisely the route by which someone reaches for "the file with the secrets in it". The check SHALL resolve symlinks before judging a path, so a `.dev.vars` linked to `.env` is refused on the same grounds as `.env` itself.

The script SHALL additionally **fail**, not warn, when the file it is about to push declares a key matching a Cloudflare account-credential shape (`CLOUDFLARE_*`, `CF_ACCESS_*`). The file boundary cannot catch a credential pasted directly into `.dev.vars`, and a warning that then proceeds would place the credential in the Worker regardless — the outcome this requirement exists to prevent.

#### Scenario: A pointed-at `.env` is rejected

- **WHEN** someone runs the secrets script against `.env`
- **THEN** it exits non-zero without contacting Cloudflare
- **AND** the message explains that `.env` holds CI and provisioning credentials while `.dev.vars` holds Worker runtime secrets

#### Scenario: A symlink to the credential file is rejected

- **WHEN** `.dev.vars` is a symlink resolving to `.env`
- **THEN** the push exits non-zero on the same grounds, without contacting Cloudflare

#### Scenario: An account credential pasted into the source file stops the push

- **WHEN** `.dev.vars` declares a `CLOUDFLARE_*` or `CF_ACCESS_*` key
- **THEN** the push exits non-zero and names the offending key
- **AND** no secret is loaded into either Worker

#### Scenario: The account-root credential never reaches a Worker

- **WHEN** a repo has followed the pack's conventions and pushed its secrets
- **THEN** no deployed Worker holds `CLOUDFLARE_API_TOKEN` or an Access service token in its secret store

### Requirement: A parity gate compares the two Workers to each other, and staging's bindings to production's

The pack SHALL provide a `secrets:check` operation that fails when the two Workers have drifted. Because `.dev.vars` is git-ignored and therefore absent in CI, the authoritative comparison SHALL be **Worker against Worker** — the secret names held by production against those held by staging — which requires no local file, no secret value, and no state beyond the two environments themselves.

The check SHALL additionally assert that every stateful binding declared at the top level of `wrangler.jsonc` reappears inside `env.staging`, catching the drift class the twin rule describes: an environment inherits no binding it does not redeclare, so a binding added to production alone is simply absent in staging. This half SHALL be a pure config read requiring no credential, so it runs even on an unprovisioned repo. Durable Objects SHALL be excluded, their storage being per-Worker and so already isolated.

Failure output SHALL name the missing keys or bindings so the fix is mechanical.

#### Scenario: A secret added to only one Worker fails the check

- **WHEN** a secret exists in the production Worker but is missing from staging
- **THEN** `secrets:check` exits non-zero and names the missing key

#### Scenario: The check runs in CI without a local secrets file

- **WHEN** the gate runs in CI, where `.dev.vars` does not exist
- **THEN** it still compares the two environments' secret names
- **AND** it does not fail merely because no local secrets file is present

#### Scenario: A binding added to production alone fails the check

- **WHEN** a stateful binding is declared at the top level of `wrangler.jsonc` with no counterpart in `env.staging`
- **THEN** `secrets:check` exits non-zero and names the binding

### Requirement: A committed example file declares the expected secret names

The pack SHALL ship a committed `.dev.vars.example` carrying the **names** of the Worker's runtime secrets with blank values, mirroring the `.env.example` convention so a new contributor learns what to fill in and the expected key set has a reviewable home in git.

Where this declared set is available the gate SHALL report keys that are declared but absent from a Worker, and keys held by a Worker but undeclared, as **warnings** rather than failures — a repo may legitimately set a secret out of band, and the example file is uncorroborated. Only Worker-against-Worker divergence SHALL fail the build.

#### Scenario: An undeclared secret warns without breaking the build

- **WHEN** a Worker holds a secret that `.dev.vars.example` does not list
- **THEN** the gate reports it as a warning
- **AND** the check still passes if the two Workers otherwise agree

#### Scenario: A secret missing from both Workers is surfaced

- **WHEN** a key is declared in `.dev.vars.example` but held by neither Worker
- **THEN** the gate warns, since Worker-against-Worker parity cannot detect this case

### Requirement: The gate never discloses a secret value

The parity gate SHALL compare secret **names** only. It SHALL NOT read, print, log, diff, or transmit a secret value anywhere — including in success output, failure output, and error paths — so that the check is safe to run in CI where its output is retained in build logs.

#### Scenario: Failure output carries no value

- **WHEN** the check fails because a key is missing from one environment
- **THEN** the output names the key and no value appears in it

#### Scenario: CI logs stay safe to read

- **WHEN** the gate has run in CI
- **THEN** its retained log contains no secret value from any environment

### Requirement: The gate skips cleanly on a repo that has not adopted the model

The parity gate's **secret** half SHALL detect the absence of `CLOUDFLARE_API_TOKEN` and skip with an explanatory message and a success exit status, rather than failing. This matches the workflow's existing behaviour of building without deploying before provisioning, so a repo that has not yet run provisioning gets a real pull-request check instead of a permanently red one. The **binding** half needs no credential and SHALL still run, so an unprovisioned repo gets that signal.

The **binding** half SHALL likewise skip, not fail, when the wrangler config declares no `env.staging` at all. The gate's purpose is catching drift *within* the two-Worker model, not requiring a repo to adopt it: a repo partway through the adoption runbook, or one shipping a template app, would otherwise get exactly the permanently red check the pack's CI is designed to avoid. A binding missing from a *declared* `env.staging` still fails.

Where the config cannot be parsed as an object at all (a `wrangler.toml`), the gate SHALL report that it cannot check and continue, rather than inferring bindings.

#### Scenario: No credential means skip, not fail

- **WHEN** the workflow runs on a repo where `CLOUDFLARE_API_TOKEN` is unset
- **THEN** the parity step reports that it is skipping the secret comparison because the repo is not provisioned
- **AND** the check does not fail
- **AND** the binding comparison still runs

#### Scenario: Provisioning turns the gate on with no further edit

- **WHEN** a repo is provisioned and the secret is set
- **THEN** the same unchanged workflow step begins enforcing parity

#### Scenario: A repo not on the two-Worker model is not failed for it

- **WHEN** the gate runs against a wrangler config with no `env.staging`
- **THEN** it reports that it is skipping the binding comparison and exits zero

<!-- end specs/cf-secret-parity/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 6751 -->
## MODIFIED Requirements

### Requirement: Every stateful binding gets a staging twin, not a namespace prefix

The pack SHALL state, and its docs SHALL follow, a twin-by-default rule: each stateful binding in `env.staging` SHALL point at a second resource of the same kind rather than share the production resource behind a namespace prefix. A twin requires no application code; a prefix requires every call site to cooperate and lets one omission write into production data. A prefix SHALL be used only where a twin is genuinely unavailable.

The rule SHALL be documented as a table covering at least D1, Queues, R2, KV, Durable Objects, cron triggers, secrets, and service bindings, and SHALL call out that secrets are per-environment (`wrangler secret put --env staging`) and that a service binding left pointing at production is a silent cross-environment call.

The docs SHALL distinguish **non-inheritable** configuration — `vars` and the bindings, where an environment starts empty and drift means a binding is simply *absent* in staging — from **inheritable** configuration, where an environment starts from production's value and drift means staging silently *acquires* production's behaviour. The twin rule's "an environment inherits nothing it doesn't redeclare" SHALL be scoped to the non-inheritable set rather than stated of the config as a whole.

Cron triggers SHALL be documented as inheritable, and the guidance for keeping staging free of scheduled runs SHALL be the explicit override `"triggers": { "crons": [] }` inside `env.staging`. The docs SHALL NOT advise omitting the key, which leaves staging inheriting production's schedule and firing against the staging database — the opposite of the stated intent, with no error.

#### Scenario: R2 in staging is a second bucket

- **WHEN** a repo adds an R2 binding to a Worker that took the pack
- **THEN** the docs direct it to a second bucket inside `env.staging`
- **AND** a staging key prefix on the production bucket is explicitly rejected

#### Scenario: A newly added binding has a documented answer

- **WHEN** a repo adds a stateful binding the pack does not itself ship
- **THEN** the twin-by-default rule and its table answer what staging binds to without a new decision

#### Scenario: Keeping staging off a schedule

- **WHEN** a repo declares a cron trigger for production and wants staging exercised only by manual trigger
- **THEN** the docs direct it to declare an explicit empty `triggers.crons` inside `env.staging`
- **AND** omitting the key is documented as inheriting production's schedule rather than disabling it

### Requirement: The pack scripts are zero-config and byte-identical across repos

Every pack script SHALL be identical in every repo that installs it — no per-repo value SHALL be baked into a pack file. A script that needs the database name, an environment name, or the branch SHALL read it from the target-owned `wrangler.jsonc` or the CI environment. `scripts/cf-deploy.sh` SHALL hardcode no Worker name, environment id, or database id: it SHALL take the branch from `WORKERS_CI_BRANCH`, the production branch from `CF_PRODUCTION_BRANCH` (default `main`), and locate the wrangler config by the same root-then-subdirectory rule the other pack scripts share. `scripts/cf-secrets.mjs` SHALL follow the same rule, resolving the wrangler config and its environments through the shared config library and naming no secret key of its own.

The two credential files SHALL be kept distinct by role, and pack scripts SHALL read the one matching their purpose: `.env` holds the credentials **CI and the scripts themselves** use, chiefly `CLOUDFLARE_API_TOKEN`; `.dev.vars` holds the secrets **the Worker** reads at runtime. No pack script SHALL move a value from the former into a Worker's secret store.

#### Scenario: Two repos install the identical script

- **WHEN** two different repos both take the pack
- **THEN** their copies of each pack script are byte-for-byte identical
- **AND** each script resolves repo-specific values from `wrangler.jsonc`, the CI environment, `.env`, or `.dev.vars`, not from a constant in the script

#### Scenario: The deploy script picks the environment from the branch

- **WHEN** `cf-deploy.sh` runs in CI
- **THEN** it compares `WORKERS_CI_BRANCH` against `CF_PRODUCTION_BRANCH` to choose between a production deploy and a staging deploy
- **AND** it contains no hardcoded Worker name or database id

#### Scenario: The two credential files do not mix

- **WHEN** a pack script needs a credential
- **THEN** a script authenticating to Cloudflare reads `.env` and a script populating a Worker's secret store reads `.dev.vars`
- **AND** no script writes a `.env` value into a Worker

### Requirement: Config fragments are applied as guided merges, never blind writes

Pack files that must merge into a file the target already owns — `package.json` scripts, the `wrangler.jsonc` bindings and `env.staging` block, `.env.example` variables, and the `.gitignore` entry covering the local secrets files — SHALL be applied as guided edits following the `CLAUDE.md` WONG-STACK-block precedent: the fragment is shown and applied with confirmation, never written over the target's file wholesale. The pack SHALL also document the one setting it cannot merge — the Workers Builds **deploy command**, which a human sets to `bash scripts/cf-deploy.sh` in the dashboard.

The `package.json` fragment SHALL include the secrets push and check scripts alongside the existing build and database scripts. The `.gitignore` fragment SHALL ignore `.dev.vars` **and its per-environment variants**, so that adding a file such as `.dev.vars.staging` cannot commit real secret values, while explicitly re-including `.dev.vars.example` — a committed, values-blank file that a wildcard would otherwise swallow.

#### Scenario: Merging into an existing package.json

- **WHEN** the pack adds its `build`, `db:*`, and `secrets:*` scripts to a repo that already has a `package.json`
- **THEN** the fragment is presented and merged into the existing file, preserving the repo's other scripts and fields
- **AND** the file is not overwritten wholesale

#### Scenario: The deploy command is called out as a manual step

- **WHEN** a repo installs or adopts the pack
- **THEN** setting the Workers Builds deploy command is presented as an explicit human step, not a merged fragment

#### Scenario: A per-environment secrets file cannot be committed

- **WHEN** a repo creates `.dev.vars.staging` to give staging a divergent secret value
- **THEN** the pack's `.gitignore` entry already covers it
- **AND** no step is required to prevent the file being committed
- **AND** `.dev.vars.example` remains committable despite the wildcard

<!-- end specs/stack-pack/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-01

~~~
<!-- end .openspec.yaml -->
