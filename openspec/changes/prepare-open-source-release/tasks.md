## 1. Probes

- [x] 1.1 Probe the `.codex` link with Codex 0.155 in a scratch copy: move `config.toml` and `hooks.json` into `.agents/`, replace `.codex/` with a link to `.agents`, and start a trusted Default-mode session. Confirm that `request_user_input` is callable, that the memory hook runs, and that each skill appears once. Repeat in Claude Code, and confirm that `config.toml` and `hooks.json` cause no warning. Record the result in the Decision log. If Codex loads skills twice, keep `.codex/` as a real folder that holds only the two files, per design decision 3.
- [x] 1.2 Scan the full git history for committed secrets (`git log -p --all`) with the patterns in `memory/scripts/lib/scan.mjs`, plus `CLOUDFLARE_[A-Z_]*TOKEN=` followed by a value. Print only the commit and the file of each match. Record the date, the patterns, and the result in the Decision log. Stop and ask the owner to rotate any live credential before you continue.

## 2. Agent folder layout

- [x] 2.1 Move `.codex/config.toml` to `.agents/config.toml` and `.codex/hooks.json` to `.agents/hooks.json`, and replace `.codex/` with a link to `.agents` (or apply the probe's fallback), per review.html#/layout.
- [x] 2.2 Update `payload-files.json` and the payload manifest: list `.claude/config.toml` and `.claude/hooks.json` as logical paths, and state that an install writes the payload under a real `.agents/` folder with `.claude` and `.codex` links. Update the preflight and `scripts/check-payload-links.mjs` wherever they read `.codex/`.
- [x] 2.3 Add `scripts/tests/agent-layout.test.mjs`: `.claude` and `.codex` are mode `120000` links to `.agents` in `git ls-tree`, and no tracked path begins with `.claude/` or `.codex/`.
- [x] 2.4 Update `wiki/development/required-tools.md` with the Windows `core.symlinks` note, and update every live doc that names `.codex/hooks.json` or `.codex/config.toml`.

## 3. Setup absorbs provisioning

- [x] 3.1 Create `.agents/skills/wong-setup/references/cloudflare.md` from `wong-cloudflare/SKILL.md` Steps 1–5 and its memory-store section. Drop Step 0 and every `components.stackPack` gate. Move `failure-map.md` and `permission-groups.md` beside it, and fix their links, per review.html#/setup.
- [x] 3.2 Rewrite `wong-setup/SKILL.md`: the empty-folder check and its stop message, the token ask before planning, no component questions, the full-payload install, and the provisioning runbook run by `/apply` after the payload lands. Keep the redirect of an installed repo to `/wong-sync`, per review.html#/setup.
- [x] 3.3 Move Step 6 (Access) into `wiki/stack/cloudflare-access.md`, and add a `## Teardown` section to `wiki/stack/getting-started.md` that covers both Workers, both databases, the memory store, the deploy and memory tokens, Access resources, and the GitHub secrets.
- [x] 3.4 Delete `.agents/skills/wong-cloudflare/`. Replace every live reference to `/wong-cloudflare` (the 30 files outside archives and `CHANGELOG.md`, including the messages in `cf-build.sh`, `cf-secrets.mjs`, `lib-wrangler-config.sh`, `verify-staging.sh`, and `memory/scripts/lib/store.mjs`) with setup's provisioning runbook or the owning wiki runbook.
- [x] 3.5 Update `payload-files.json` and the manifest so that a new install takes the `pack`, `scaffold`, and `ui` categories with no flag, and so that `/wong-sync` still honors legacy `components.stackPack` and `components.appScaffold`. Remove `wong-cloudflare` from `core.skillDirs`.
- [x] 3.6 Update the `openspec/specs/cloudflare-provisioning/spec.md` Purpose directly, because it says that the capability is gated on `components.stackPack`.

## 4. Deploy token

- [x] 4.1 Add a "CI deploy token" table to `permission-groups.md` with `Workers Scripts Write`, `D1 Write`, and `Account Settings Read`, plus the conditional `Workers R2 Storage Write` and zone `Workers Routes Write` rows, per review.html#/tokens.
- [x] 4.2 In `references/cloudflare.md`, replace the GitHub-secrets step: mint `<repo>-deploy` with `POST /accounts/{account_id}/tokens`, pipe the value to `gh secret set CLOUDFLARE_API_TOKEN` through standard input, reuse the token by name on a re-run, and roll it only when the secret is missing or the user asks. Keep the `workflow` scope check, per review.html#/tokens.
- [x] 4.3 Rewrite the Cloudflare block of `.env.example`, the token section of `wiki/stack/cloudflare-credentials.md`, and the README requirements. State that the user token starts with two permissions and grants itself only the groups each step needs, that setup reports what it granted, that it can be narrowed again, and that it stays in the host `.env` and never goes to CI. Update the `deploy.yml` header comment to name the deploy token.

## 5. Sync migration

- [x] 5.1 Add the 18.0.0 migration to `wong-sync`: move a real `.claude/` to `.agents/` with both links and preserve local files, merge `.codex/` files into `.agents/`, remove the `wong-cloudflare` skill, mint the deploy token through setup's runbook from the source checkout, replace the secret, and recommend rolling the user token.
- [x] 5.2 Extend `scripts/tests/wong-sync-preflight.test.mjs` with a legacy fixture that has a real `.claude/` folder, `.codex/hooks.json`, and a `wong-cloudflare` skill, and assert that the preflight lists the move, the merge, and the removal.

## 6. Open source and README

- [x] 6.1 Add an MIT `LICENSE` (Matthew Wong, 2026; the owner confirms the name at review) and `SECURITY.md` with private vulnerability reporting and the table of the user, deploy, and memory tokens.
- [x] 6.2 Update `README.md`: the setup URL is `.agents/skills/wong-setup/SKILL.md`, start in an empty folder, a Cloudflare account and one user token are requirements, `/wong-cloudflare` is removed from the command table, and it links `LICENSE` and `SECURITY.md`. Update `AGENTS.md` and `wiki/development/README.md` where they describe `/wong-cloudflare` or the opt-in pack.
- [x] 6.3 Check the live payload prose (outside archives and `CHANGELOG.md`) for private downstream names, and make them generic.

## 7. Contract tests

- [x] 7.1 Add `scripts/tests/downstream-contract.test.mjs`: every README raw URL names a regular file in `git ls-tree` (not mode `120000`); `.env.example` declares `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_MEMORY_TOKEN`; `deploy.yml` reads only the two Cloudflare secrets; the deploy-token table matches the pinned list; and `wong-setup/references/cloudflare.md` exists. Each failure names the surface it protects.
- [x] 7.2 Add `scripts/tests/cf-deploy.test.mjs` with a fake `npx` first on `PATH`. Cover a default-branch production deploy with no alias, a feature-branch staging deploy with a preview alias and the printed URL, and the refusal of a production Worker name on a non-production branch.

## 8. Live smoke run

- [x] 8.1 From the host, with a user-scoped token (this repo's `CLOUDFLARE_API_TOKEN` is account-scoped, so ask for one if none is available), run the setup prompt in an empty folder for a throwaway repo such as `wongstack-test-e2e`. Push a branch, and confirm that migrations apply, the staging Worker deploys, and the preview URL returns `200` with only the deploy token as the secret. Then confirm the production deploy. Record the permissions CI needed in the Decision log, and update the table in `permission-groups.md` if one was missing.
- [x] 8.2 Tear the throwaway repo down with the new teardown runbook. Record what was removed and what was skipped.

## 9. Release

- [x] 9.1 Bump `VERSION` to 18.0.0, and add a `CHANGELOG.md` entry that names the removed skill, the blank-folder setup, the core pack, the deploy token, the new layout, and the sync migration. The entry tells installed repos to sync and roll their user token.
- [ ] 9.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `openspec validate prepare-open-source-release --strict --no-interactive`. Then run `/save` so CI runs the new tests.
