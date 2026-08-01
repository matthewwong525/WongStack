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
