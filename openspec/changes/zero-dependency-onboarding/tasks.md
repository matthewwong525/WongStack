## 1. The provisioning skill

- [x] 1.1 Create `.claude/skills/wong-cloudflare/SKILL.md` — frontmatter, the stack-pack gate (reads `components.stackPack` from `.claude/.wong-stack.json`), and the runbook steps in outcome form; repo-relative paths only, no git in the repo
- [x] 1.2 Write the self-widening step: verify → read own policy → resolve permission-group ids **by name** → `PUT` a widened set that retains the original two groups → re-verify, per design Decision 1
- [x] 1.3 Write the account-resolution step: list accounts, proceed only on exactly one (stating which), otherwise ask; handle the zero-account case with the resources explanation
- [x] 1.4 Write the provisioning step: create prod + staging D1 with names **derived from the repo name and stated, never asked**, write both ids into `wrangler.jsonc`, compute the URLs, and walk the user through connecting the build — idempotent, reusing anything already present
- [x] 1.5 Write the opt-in Access branch: widen into the Access groups on request, point at the Access runbook, and pair enabling header trust with the Worker code change
- [x] 1.6 Write the teardown step: enumerate, confirm, delete, report — including what it skipped
- [x] 1.7 Add `references/permission-groups.md` recording the verified group ids as a fallback and test fixture, with the duplicate-name/scope caveat spelled out
- [x] 1.8 Add the closing report: production URL, preview URL pattern, what was created, what sits uncommitted, and the offer to narrow the token
- [x] 1.9 Write the `.env` step: create it from `.env.example` when absent, confirm `.gitignore` covers it, ask only for the token value to paste, and stop if the file would be committed
- [x] 1.10 Write the plain-language failure map — account-scoped-instead-of-user-scoped, empty Account Resources, and the `9109`/`10000` codes — each translated to the one field to fix, with the raw response kept for agents but not shown as the primary message

## 2. CI: GitHub Actions

- [x] 2.1 Add the pack's workflow file — sets `CF_BRANCH` and `CF_PRODUCTION_BRANCH`, installs in the resolved app dir, reads credentials from repository secrets, surfaces as a PR check
- [x] 2.2 Give `scripts/cf-build.sh` and `scripts/cf-deploy.sh` a CI-neutral `CF_BRANCH` with `WORKERS_CI_BRANCH` retained as fallback — no behavior change for a repo on Workers Builds
- [x] 2.3 Add `--app-dir` to `cf-build.sh` so the workflow installs where `package.json` actually is, without duplicating the resolution in YAML
- [x] 2.4 Make the unprovisioned path build without deploying, bypassing the build wrapper (which needs an `env.staging` D1 entry a fresh repo lacks)
- [x] 2.5 Confirm the v8 deploy model is untouched — the workflow delegates every branch decision to `cf-deploy.sh`

## 2b. Fix: branches deployed to production (found by the end-to-end test)

- [x] 2b.1 `cf-build.sh` exports `CLOUDFLARE_ENV=staging` on non-production branches — the plugin selects the environment at build time, and `--env` at deploy time is documented as having no effect
- [x] 2b.2 `cf-deploy.sh` drops `--env staging` when the build left a `.wrangler/deploy/config.json` redirect, so the flag never implies isolation that isn't happening
- [x] 2b.3 Add `wong_read_worker_name` to `lib-wrangler-config.sh`, resolving `configPath` relative to the redirect file's own directory
- [x] 2b.4 Add the fail-closed guard: refuse to deploy when a non-production branch resolves to the production Worker, naming both fixes
- [x] 2b.5 `cf-build.sh` regenerates binding types before building, so a binding added during provisioning doesn't fail `tsc`
- [x] 2b.6 Document the mechanism in `d1-pipeline.md` and the `env.staging.name` rule in the config fragments

## 2c. Fix: the CI gate silently reported "no checks"

- [x] 2c.1 `wait-for-checks.sh` probes whether `gh pr checks --json` exists and falls back to parsing the default output — `--json` is absent on gh 2.46, where the flag error was swallowed and reported as `NONE`
- [x] 2c.2 Stop discarding gh's stderr; report `RESULT: UNKNOWN` (with the message) for any empty result gh didn't explicitly attribute to "no checks"
- [x] 2c.3 Teach `/save` to report an unverified gate rather than "none configured", and `/ship` to refuse to merge on `UNKNOWN`
- [x] 2c.4 Amend the `Check-waiting reports the true gate result` requirement, which encoded the bug ("emptiness of the filtered output is the only such signal")

## 3. Docs

- [x] 3.1 Write the `wiki/stack/` provisioning runbook — token, self-widening sequence, account resolution, resources, the manual build connection, teardown; mark the Zero Trust cold-start step unverified with its dashboard fallback
- [x] 3.2 Add a CI section to `wiki/stack/d1-pipeline.md` — the workflow, the variable table, why not Workers Builds, and how to stay on it
- [x] 3.3 Update `wiki/stack/core-stack.md` — link provisioning and state that nothing runs locally
- [x] 3.4 Rework `wiki/stack/cloudflare-access.md` — Access as opt-in, public-by-default, and header trust adopted together with the Worker code change (with the impersonation risk stated)
- [x] 3.5 Rewrite `wiki/stack/cloudflare-credentials.md` — one `CLOUDFLARE_API_TOKEN`, the self-widening recipe, `Workers CI Read` named properly, and the account-root trade-off stated plainly
- [x] 3.6 Reconcile `.env.example` with the credentials page (same variable names, user-scoped token, correct creation path)
- [x] 3.7 Update `wiki/development/required-tools.md` — name `curl` as a pack-gated skill dependency and repair the "never inside a WongStack skill" wording
- [x] 3.8 Link the new runbook from the `wiki/stack/` hub; check every touched page against `wiki/wiki-style.md`
- [x] 3.9 Ensure the template Worker does not read the identity header while public
- [x] 3.10 Write the token creation click path — menu route, each permission row, and the **Account Resources** include flagged as the most-missed field; literal enough that someone who has never seen the screen cannot take a wrong turn
- [x] 3.11 Write the human-facing walkthrough of the whole path (numbered actions, plain language, browser steps called out as such), distinct from the agent runbook — this is what task 5.1 tests against
- [x] 3.12 Document in `required-tools.md` that runtimes install at the point of need, that `node` is permitted where already required, and which verbs work with no runtime at all

## 4. Payload wiring

- [x] 4.1 Register the new payload files in the stack-pack section of `.claude/skills/wong-sync/references/payload-manifest.md` (skill directory, workflow file, runbook, walkthrough)
- [x] 4.2 Rewrite `.claude/skills/wong-setup/SKILL.md` Step 6's stack-pack offer in outcome language — no product or component names in the prompt, the cost stated honestly, technical detail available on request — and name provisioning as the follow-on step that can run later
- [x] 4.3 Add the `workflow` scope to setup Step 5: request it in `gh auth login --scopes workflow`, detect its absence for an already-authed user in a pack repo, and offer `gh auth refresh --scopes workflow` with a plain-language reason
- [x] 4.4 Change setup Step 5's OpenSpec readiness so Node installs at the point of need, on consent, preferring a user-local install over `sudo` — and completes the runtime-free layer with a clear statement of what's unavailable if declined
- [x] 4.5 Mirror all payload changes into `.agents/skills/`

## 5. End-to-end test on a fresh repo

- [x] 5.1 Create a disposable GitHub repo and run the paste-the-prompt path (Leg 1) start to finish **as someone who does not know what a D1 database is** — follow the walkthrough as written, answer the offer as that person would, and record every point where the wording, not the mechanism, is what stalls
- [ ] 5.1a Run one pass on a machine with no Node installed, confirming the runtime-free layer completes and the point-of-need ask reads clearly
- [x] 5.2 Run provisioning (Leg 2) with a freshly created two-permission token; confirm the widen, the databases, the binding, the secrets, and the deploy
- [ ] 5.2a Confirm the `workflow` scope path: a fresh `gh auth login` grants it, and an already-authed account without it is caught during setup rather than at push
- [x] 5.3 Confirm Leg 3: push a branch, get a preview URL from `/save`, verify production is untouched and the preview runs on staging
- [x] 5.4 Run teardown; confirm nothing is left behind, then clean up the six pre-existing test databases separately
- [x] 5.5 Fold every correction the test surfaced back into the runbook and skill

## 6. Release

- [x] 6.1 Bump `VERSION` from 8.0.0 to 8.1.0 (minor — new capability; the CI switch is additive and opt-in per repo)
- [x] 6.2 Add the newest-first `CHANGELOG.md` entry covering provisioning, the Actions workflow, and the header-trust default change
