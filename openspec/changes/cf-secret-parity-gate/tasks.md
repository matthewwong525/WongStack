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
