<!-- openspec-archive v1 2026-09-25-prepare-open-source-release -->
<!-- file proposal.md utf8 13532 -->
# Prepare WongStack for an open-source release

**Status:** ready-to-ship
**Branch:** fix/wongstack-release-102
**Open questions:** none

## Why

WongStack is a public repo, but it has no license, and its one-paste setup prompt is broken: `raw.githubusercontent.com` does not follow the `.claude` symlink, so the README's setup URL returns `404`. The GitHub secret `CLOUDFLARE_API_TOKEN` is the user's own token. That token can mint other tokens, so any workflow in the repo can take over the whole Cloudflare account. The memory store (17.0.0) already needs a Cloudflare account in every repo, so the separate `/wong-cloudflare` door and the opt-in stack pack now add steps without adding choice. `wongstack-cloud` will run setup on hosted VMs, and nothing tests the parts of WongStack that it relies on.

## What Changes

- **BREAKING:** `/wong-cloudflare` is removed. `/wong-setup` always starts from an empty folder. It asks for one Cloudflare token and provisions everything in one step: the memory store, the two app databases, the starter app, the CI deploy token, and the first deploy. The provisioning runbook and its references move into `wong-setup/references/`. A folder that already has files gets a clear stop, not a partial install. (review.html#/setup)
- **BREAKING:** The stack pack and the app scaffold become core. A new install always gets the Cloudflare pipeline, the starter app, and the UI pages, and its install record sets `components.stackPack`, `components.appScaffold`, and `components.ui` to `true`. `/wong-sync` still honors those flags in repos that were installed before this release.
- **BREAKING:** CI gets a narrow deploy token, not the user token. Setup uses the user token to mint an account-owned token named `<repo>-deploy`, with only `Workers Scripts Write`, `D1 Write`, and `Account Settings Read`. Setup sends that token directly to the GitHub secret `CLOUDFLARE_API_TOKEN` and writes it to no file. The user token stays only in the primary worktree's `.env` on the host. (review.html#/tokens)
- `.env.example`, the README, and the credentials page state that the user token starts with two permissions and grants itself only the groups that each step needs. They also state what setup grants and how to narrow the token again.
- **BREAKING:** One real agent folder. `.codex` becomes a symlink to `.agents`, as `.claude` already is. `.codex/config.toml` and `.codex/hooks.json` move to `.agents/config.toml` and `.agents/hooks.json`. New installs get the same layout: a real `.agents/` folder with `.claude` and `.codex` links. A probe confirms that Codex follows the link and loads each skill once. (review.html#/layout)
- The README setup URL uses the real path `.agents/skills/wong-setup/SKILL.md`, and a test checks that each raw URL in the README names a real file in the git tree, not a path through a link.
- Open-source files: an MIT `LICENSE`, a `SECURITY.md` that says how to report a vulnerability and which token holds which power, and a history scan for committed secrets before the release.
- Contract tests pin what `wongstack-cloud` relies on: the setup URL, the variable and secret names, the `deploy.yml` secrets, the deploy token's permission list, and the branch logic of `cf-deploy.sh` run against a fake `wrangler` (production, staging, and preview alias). One live run on a throwaway repo from the host confirms that staging still deploys and that the deploy token is enough.
- `/wong-sync` gives installed repos a migration task: move a real `.claude/` folder to `.agents/` with both links, remove the `wong-cloudflare` skill, and replace the GitHub secret with a minted deploy token.
- Access and teardown move from the skill into the `wiki/stack/` runbooks, which already own most of those steps.
- Release as WongStack 18.0.0.

**Non-goals:** No setup into a folder that already has files. No change to the memory store, its token, or the staging model. No rewrite of archived changes, the changelog, or git history, even where they name private downstream repos. No change to `wongstack-cloud` itself: its brief still says "create the repo from the template", and that repo owns the move to a blank-folder setup.

## Capabilities

### New Capabilities

- `agent-config-layout`: One real `.agents/` folder, with `.claude` and `.codex` as links to it, in the source and in every install. Codex config and hooks live in that folder.
- `open-source-release`: The license, the security policy, the history secret scan, and a setup URL that resolves on `raw.githubusercontent.com`.
- `downstream-contract`: Deterministic tests of the paths, names, and deploy behavior that `wongstack-cloud` and installed repos rely on, and the live smoke run that proves staging.

### Modified Capabilities

- `cloudflare-provisioning`: Provisioning is a step of `/wong-setup`, not a skill. It always provisions the pack. CI gets a minted deploy token. Teardown is a runbook.
- `install-onboarding`: Setup starts from an empty folder, needs a Cloudflare token, and provisions everything in one step.
- `stack-pack`: The pack is core for new installs. Late adoption through `/wong-cloudflare` is removed.
- `app-scaffold`: The scaffold is core for new installs.
- `structured-asks`: The Codex setting lives in `.agents/config.toml`, reached through the `.codex` link.
- `cloudflare-access-guide`: The stack section is no longer optional, and the Access runbook is the only path to the login wall.
- `wong-sync`: Sync plans the layout, skill, and secret migration for repos installed before this release.

## Impact

This change touches `wong-setup` (it gains the provisioning runbook), `wong-sync`, the payload manifest and `payload-files.json`, `.agents/.wong-stack.json`, `.codex/`, `README.md`, `AGENTS.md`, `.env.example`, `.github/workflows/deploy.yml` comments, `scripts/check-payload-links.mjs`, the `wiki/stack/` and `wiki/development/` pages that name `/wong-cloudflare`, and the three pack scripts that name it in messages. It adds `LICENSE`, `SECURITY.md`, and new tests under `scripts/tests/`. It deletes `.agents/skills/wong-cloudflare/`. Installed repos (WongOS, ClaymooApp) need one `/wong-sync` to move their layout and replace their GitHub secret. They should also roll their user token, because CI could read it until now. On Windows, a clone with `core.symlinks=false` sees each link as a plain file, as `.claude` already does today.

## Decision log

- **2026-09-25** — Asked for the release list → the user gave eight items. The memory store (#102) is done and merged as 17.0.0 during this plan, so this change is based on it.
- **2026-09-25** — Asked what to do with `.codex/` → chose a symlink into `.agents/`, and the user asked for a `.claude` link as well. `.claude` is already a link in this repo, so the new part is giving installs the same layout.
- **2026-09-25** — Asked the license → chose MIT.
- **2026-09-25** — Asked how far `/wong-setup` and `/wong-cloudflare` merge → the user chose to remove `/wong-cloudflare` and to assume that setup always starts from a blank folder.
- **2026-09-25** — Asked what proves that `wongstack-cloud` and staging still work. No answer before the user redirected, so the recommended option is **assumed**: contract tests in CI plus one live run by hand from the host. A live test in CI needs a token that can create resources, and that contradicts the narrow-secret goal.
- **2026-09-25** — Found: the README's setup URL returns `404` on `raw.githubusercontent.com` through `.claude/`, and `200` through `.agents/`. Assumed: the README links the real path, and a test prevents a regression.
- **2026-09-25** — Assumed: a blank-folder setup makes the pack and the scaffold core, because a blank folder has no app of its own and every user is assumed to use Cloudflare. The `ui` category becomes core for the same reason.
- **2026-09-25** — Assumed: a non-empty folder gets a clear stop, because a partial install into an unknown repo is the case this change stops supporting. The stop is cheap to change in review.
- **2026-09-25** — Assumed: the deploy token is minted with `POST /accounts/{account_id}/tokens`, so it belongs to the account and outlives one person's user token. Its value goes straight to `gh secret set` and is never written to disk. On a later run, setup reuses a token that already exists and rolls its value only when the secret is missing.
- **2026-09-25** — Assumed: the deploy token gets `Workers Scripts Write`, `D1 Write`, and `Account Settings Read`, plus `Workers R2 Storage Write` only when the app's config binds a bucket. The live smoke run confirms this set. The secret keeps the name `CLOUDFLARE_API_TOKEN`, because `wrangler` reads that name natively and `deploy.yml` stays the same.
- **2026-09-25** — Assumed: Access and teardown move into the `wiki/stack/` runbooks, because they are rare and optional, and `wiki/stack/cloudflare-access.md` already owns the Access steps.
- **2026-09-25** — Assumed: the history scan uses `git log -p` with the token patterns from `memory/scripts/lib/scan.mjs`. The results are reported in this change, and no git history is rewritten.
- **2026-09-25** — Assumed: the downstream names in archives and the changelog stay, because archives are an immutable record. Live payload prose is checked for private names.
- **2026-09-25** — Assumed: release 18.0.0, because removing a skill, changing the layout, and changing the secret all break installed repos until they sync.
- **2026-09-25** — Probed the `.codex` link (task 1.1) with Codex 0.155.1 in this trusted worktree. With `.codex` → `.agents`, `codex features list` shows `default_mode_request_user_input` as `true`, and `codex debug prompt-input` lists 19 skills with no duplicate. In an untrusted scratch copy the flag is `false` with the real folder too, so trust, not the link, controls it. `codex exec` runs no `SessionStart` hook in either layout, because no hook trust is recorded yet, so the interactive hook trust prompt through the link is unverified. Codex reads the same `hooks.json` bytes at the same logical path. Claude Code shows no warning for `config.toml` or `hooks.json` in the shared folder. Kept the link.
- **2026-09-25** — Scanned history (task 1.2): `git log -p --all`, 327 commits, 229,816 added lines, with the `scan.mjs` patterns, a `CLOUDFLARE_*TOKEN=` value pattern, and the host `.env` values. Three hits, none a credential: `CLOUDFLARE_ACCOUNT_ID` in `.agents/.wong-stack.json` (an identifier, not a secret), and two made-up fixtures in `scripts/tests/memory-store.test.mjs` (`ghp_abcdefghijklmnopqrstuvwxyz` and a sample JWT). Clean.
- **2026-09-25** — Changed during apply: a new install records `components.stackPack`, `components.appScaffold`, and `components.ui` as `true`, instead of writing no flag. `preflight.mjs` selects the `pack` and `scaffold` categories only when those flags are `true`, so an install with no flag would get no pack update on a later sync. Always-true flags keep the preflight unchanged.
- **2026-09-25** — Ran the live smoke (task 8.1) from the host with the user token `WongStack User Token`. It used a throwaway private repo `wongstack-smoke18` holding this branch's pack scripts, `deploy.yml`, `app/`, and `schema/`, two new databases, and a deploy token minted with `POST /accounts/{id}/tokens` and piped into `gh secret set`. Read back, the token's policy is `D1 Write; Workers Scripts Write; Account Settings Read` on the one account. With only that secret, CI passed on `main` (production `200`, `/api/` `200`) and on `feature/smoke` (staging Worker `200`, preview alias `https://feature-smoke-wongstack-smoke18-staging.<subdomain>.workers.dev` published and `200`). A new migration applied to staging only (production table count `0`, staging `1`), then to production after the merge (`1`). No permission was missing, so the table in `permission-groups.md` stands. The run exercised the provisioning calls and CI directly, not a full agent-driven setup conversation.
- **2026-09-25** — Tore the smoke down (task 8.2) by exact name: both Workers, both databases, and the deploy token are deleted, and the account is back to 13 databases. The GitHub repo `matthewwong525/wongstack-smoke18` could not be deleted, because `gh` lacks the `delete_repo` scope. Its secrets are deleted, and it is private and empty of credentials; the owner deletes it with `gh auth refresh -s delete_repo` then `gh repo delete matthewwong525/wongstack-smoke18`.
- **2026-09-25** — Saved the full implementation for CI (task 9.2). Setup now owns provisioning, `wong-cloudflare` is deleted, `.codex` is a link, the deploy token replaces the user token in CI, `LICENSE` and `SECURITY.md` exist, and three new test files join the suite. `SECURITY.md` links GitHub private vulnerability reporting, which is off for this repository; turning it on is a repository setting the owner decides. The delta specs are reconciled into `openspec/specs/`, and the `app-scaffold` Purpose placeholder is filled so every main spec validates.
- **2026-09-25** — Distilled facts before the archive: added the Codex layout check (`codex features list`, `codex debug prompt-input`, trusted checkout only) to `wiki/development/required-tools.md`. The other live facts are this change's open threads and this repo's token state, not reusable process.
- **2026-09-25** — Archived after CI passed on PR #103 (`0db00d3`). The delta specs were already reconciled into `openspec/specs/`, so the archive used `--skip-specs`.

<!-- end proposal.md -->
<!-- file design.md utf8 8635 -->
## Context

See [proposal.md](proposal.md#why) for the motivation. The facts that shape the approach:

- `.claude` is already a link to `.agents` in this repo. `.codex/` is a real folder with `config.toml` (the Default-mode `request_user_input` feature) and `hooks.json` (the memory `SessionStart` hook from 17.0.0).
- Installs get a real `.claude/` folder today, because the payload manifest writes logical `.claude/` paths. Codex reads `.agents/skills` natively, so a Codex user in an installed repo does not see the WongStack skills now.
- `raw.githubusercontent.com` returns `404` for `.claude/skills/wong-setup/SKILL.md` and `200` for `.agents/skills/wong-setup/SKILL.md` (checked on 2026-09-25).
- `/wong-cloudflare` sets the GitHub secret `CLOUDFLARE_API_TOKEN` to the widened user token. That token holds `API Tokens Write` and `Account API Tokens Write`. The memory token (17.0.0) already shows the mint pattern: the user token mints a narrow token by name-resolved permission groups.
- CI calls only `cf-build.sh` (`wrangler d1 migrations apply`, `wrangler types`), `cf-deploy.sh` (`wrangler deploy`, `wrangler versions upload --preview-alias`), and `cf-secrets.mjs check` (reads Worker secret names).
- `wong-setup` is source-only. `wong-sync` runs from a source checkout. So a runbook in `wong-setup/references/` can serve both a fresh install and a legacy repo's sync.
- `wongstack-cloud` is a private repo that has only a brief. Its VM flow expects a user to paste a Cloudflare token in the first chat. This change defines the contract that the flow should use: the blank-folder setup prompt.
- This repo's own `CLOUDFLARE_API_TOKEN` is account-scoped and cannot mint tokens. The live smoke run needs a user-scoped token.

## Goals / Non-Goals

**Goals:**

- One entry point for a new user, and one prompt that works on a fresh machine.
- No credential in CI that can mint credentials.
- Tests that fail before a downstream user sees a break.

**Non-Goals:**

- No change to how the memory store works or to the staging model. `cf-build.sh` and `cf-deploy.sh` keep their behavior. Only their messages that name `/wong-cloudflare` change.
- No Windows-specific handling of links beyond a documented note.

## Decisions

### 1. Provisioning becomes a setup reference, not a skill

Move `wong-cloudflare/SKILL.md` Steps 1–5 and the memory-store section into `wong-setup/references/cloudflare.md`. Move `failure-map.md` and `permission-groups.md` beside it. Delete Step 0 (the door and the pack offer), because a blank folder always gets the pack and the scaffold. Move Step 6 (Access) into `wiki/stack/cloudflare-access.md`, which already owns most of it, and move the teardown into a new `## Teardown` section of `wiki/stack/getting-started.md`. The wiki ships to targets. A reference in a source-only skill does not.

Setup's order becomes: check that the folder is empty → ask for the token (Step 1 of the runbook, before planning) → `/explore` exit round → `/plan` → `/apply`, which lands the payload and then runs the runbook → `/save`, which pushes and so triggers the first deploy. The token comes first because every later step needs it, and a stop before any file is written leaves nothing to clean up.

*Alternatives:* keep `/wong-cloudflare` as a re-run door. The user rejected this. Folding provisioning into `/wong-sync` was also rejected, because sync must stay a plan-only verb.

### 2. The deploy token is account-owned and never stored

`POST /accounts/{account_id}/tokens` with the name `<repo>-deploy`, policies resolved by name through the existing widen protocol, and resources limited to the one account. The response value goes into `gh secret set CLOUDFLARE_API_TOKEN` through standard input. The runbook shows the pipe, so the value is never in a shell variable that a later command could echo. On a re-run, `GET /accounts/{id}/tokens` finds the token by name, and `gh secret list` shows whether the secret exists. When the token exists and the secret is missing, `PUT /accounts/{id}/tokens/{token_id}/value` rolls it.

An account-owned token outlives one person's user token and is visible in the account's token list, so a teammate can audit and revoke it. The permission list lives once in `permission-groups.md` as a "CI deploy token" table, and the contract test reads that table.

*Alternatives:* a user-owned token (`POST /user/tokens`), like the memory token. It dies with the user and is invisible to other admins. A second `.env` variable for the deploy token was rejected, because nothing on the host needs it.

### 3. `.codex` becomes a link, after a probe

Move `.codex/config.toml` to `.agents/config.toml` and `.codex/hooks.json` to `.agents/hooks.json`, then replace `.codex/` with a link to `.agents`. Probe first with Codex 0.155:

1. `request_user_input` is callable in Default mode.
2. The memory hook runs, and the trust prompt shows.
3. Each skill appears once, because Codex may scan both `.agents/skills` and `.codex/skills`.

When the probe shows duplicate skills, keep `.codex/` as a real folder that holds only the two files, and record that result. The same probe runs in Claude Code for the reverse case.

The payload manifest keeps logical `.claude/` paths. The install step writes them under `.agents/` and creates both links. `payload-files.json` lists `.claude/config.toml` and `.claude/hooks.json` as logical paths, so one path form covers every payload file.

### 4. Pack, scaffold, and ui fold into core

`payload-files.json` keeps the `pack`, `scaffold`, and `ui` keys, because `/wong-sync` still reads them for legacy repos. The setup plan installs all categories for a new install and records `stackPack`, `appScaffold`, and `ui` as `true`, so the unchanged preflight selects every category on a later sync. This removes the component questions from setup without a special case in sync.

### 5. Tests are deterministic, and one live run is recorded

- `scripts/tests/downstream-contract.test.mjs` reads the README, `.env.example`, `deploy.yml`, `permission-groups.md`, `payload-files.json`, and the git tree (`git ls-tree`), and checks every raw URL path with `git cat-file -t` and the mode (not `120000`).
- `scripts/tests/cf-deploy.test.mjs` puts a fake `npx` first on `PATH`. The fake records its arguments and prints a preview URL, and the test runs `cf-deploy.sh` on fixture wrangler configs.
- `scripts/tests/agent-layout.test.mjs` checks the link modes in the tree and that no tracked path begins with `.claude/` or `.codex/`.

These join the existing `node --test` suite that `payload.yml` runs. The live smoke run is a task that uses a disposable repository such as `wongstack-test-e2e`, not a CI job.

### 6. Open-source files

The MIT `LICENSE` has the copyright holder "Matthew Wong" and the year 2026. The owner confirms the name at review. `SECURITY.md` uses GitHub private vulnerability reporting and has a three-row table of the tokens. The history scan is a single `git log -p --all` pass with the patterns from `memory/scripts/lib/scan.mjs`, plus `CLOUDFLARE_[A-Z_]*TOKEN=` followed by a value. It prints only the commit and the file of each match.

## Risks / Trade-offs

- [Codex loads skills twice through the link] → The probe runs first, with a real-folder fallback that keeps only two files.
- [The deploy token lacks a permission that `wrangler` needs, such as for a custom domain route] → The live smoke run records what CI needed. The table in `permission-groups.md` is the one place to add a permission, and the runbook adds `Workers Routes Write` on the zone only when the config has routes.
- [Legacy repos keep the user token in CI until they sync] → The CHANGELOG entry and `SECURITY.md` say to sync and roll the user token. `/wong-sync` plans it.
- [A blank-folder-only setup blocks a user who wants WongStack in an existing repo] → This is the chosen scope. The stop message says so plainly, and the scope is cheap to widen later.
- [Links on Windows without `core.symlinks`] → This is the same limitation `.claude` has today. `required-tools.md` documents it.
- [`wongstack-cloud`'s brief assumes a template clone] → That repo owns the change. The contract tests give it a stable target.

## Migration Plan

1. Land this change as 18.0.0.
2. For each installed repo (WongOS, ClaymooApp), `/wong-sync` plans the layout move, the skill removal, and the secret replacement. The user rolls the user token's value from the Cloudflare dashboard and updates the host `.env`.
3. Rollback: revert the merge commit. Legacy repos that synced keep a working deploy token, because the secret name did not change.

<!-- end design.md -->
<!-- file tasks.md utf8 7969 -->
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
- [x] 9.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `openspec validate prepare-open-source-release --strict --no-interactive`. Then run `/save` so CI runs the new tests.

<!-- end tasks.md -->
<!-- file specs/agent-config-layout/spec.md utf8 2321 -->
## Purpose

Keep every agent's project configuration in one real `.agents/` folder, with `.claude` and `.codex` as links to it, so the source and every install have one copy of each skill, rule, hook, and setting.

## ADDED Requirements

### Requirement: One real agent folder with a link per agent

The WongStack source and every new install SHALL keep skills, rules, hooks, and agent settings in one real `.agents/` folder. `.claude` and `.codex` SHALL be symbolic links to `.agents`. No payload file SHALL exist at a real path under `.claude/` or `.codex/`. The Codex project settings SHALL be at `.agents/config.toml`, and the Codex `SessionStart` hook SHALL be at `.agents/hooks.json`. The Claude settings SHALL stay at `.agents/settings.json`.

#### Scenario: The source tree has one real folder

- **WHEN** a reader lists the source repository's root
- **THEN** `.agents` is a directory, and `.claude` and `.codex` are links whose target is `.agents`
- **AND** git records no file under a `.claude/` or `.codex/` path

#### Scenario: A new install gets the same layout

- **WHEN** setup installs WongStack into an empty folder
- **THEN** the target has a real `.agents/` folder with the payload, and `.claude` and `.codex` links to it

### Requirement: Each agent loads the shared folder correctly

Codex SHALL read `.codex/config.toml` and `.codex/hooks.json` through the link, and SHALL load each skill once, not once through `.agents/skills` and again through `.codex/skills`. Claude Code SHALL read `.claude/settings.json`, `.claude/skills`, and `.claude/rules` through the link. Neither agent SHALL fail on the other agent's files in the shared folder. Where a probe shows that an agent does not meet one of these conditions, the change SHALL keep that agent's files at a real path and record why.

#### Scenario: Codex follows the link once

- **WHEN** a trusted Codex session starts in a checkout with the shared layout
- **THEN** `request_user_input` is available in Default mode and the memory digest loads
- **AND** each WongStack skill appears once in the skill list

#### Scenario: Claude ignores Codex files

- **WHEN** a Claude Code session starts in the same checkout
- **THEN** the memory digest loads from `.claude/settings.json`
- **AND** `config.toml` and `hooks.json` cause no error or warning

<!-- end specs/agent-config-layout/spec.md -->
<!-- file specs/app-scaffold/spec.md utf8 1464 -->
## ADDED Requirements

### Requirement: The app scaffold ships in the core payload

The payload SHALL include WongStack's own `app/` — a React-on-Workers-with-D1 application — as part of the core payload for new installs. Setup starts from an empty folder, so every new install SHALL receive the scaffold, and its install record SHALL set `components.appScaffold: true` beside `components.stackPack: true`.

For a repo installed before 18.0.0, `/wong-sync` SHALL continue to honor `components.appScaffold`: a repo whose record has `components.stackPack: true` and lacks `appScaffold: true` SHALL receive none of the scaffold's files, and `appScaffold: true` without `stackPack: true` remains an invalid state.

#### Scenario: A new install receives the scaffold

- **WHEN** setup installs WongStack into an empty folder
- **THEN** the target receives `app/`, and the provisioning step creates its wrangler config

#### Scenario: A legacy repo without the flag receives no scaffold

- **WHEN** `/wong-sync` runs in a legacy repo with `components.appScaffold` absent or false
- **THEN** no file under `app/` is written to it
- **AND** the repo's own application layout is untouched

## REMOVED Requirements

### Requirement: An opt-in app scaffold ships in the payload

**Reason**: Setup starts from an empty folder, so every new install takes the scaffold.
**Migration**: See "The app scaffold ships in the core payload", which keeps the flag for legacy repos.

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/cloudflare-access-guide/spec.md utf8 1367 -->
## REMOVED Requirements

### Requirement: The stack section stays optional and does not make WongStack stack-specific

**Reason**: Setup starts from an empty folder and always provisions Cloudflare, so the stack section is core.
**Migration**: None for readers. The section stays at `wiki/stack/`; its new rules are in "The stack section is core and reachable".

## ADDED Requirements

### Requirement: The stack section is core and reachable

The `wiki/stack/` section SHALL be linked from `wiki/README.md` as core process, and its hub SHALL link every page in the section. The pages SHALL contain nothing specific to any single app — every example is generic. The Access runbook SHALL be the only path to the login wall: it SHALL say to widen the user token into the Access groups and to turn on the Worker's enforcement in the same step, because a public Worker that trusts an identity header lets anyone send that header.

#### Scenario: The section is reachable but not orphaned

- **WHEN** a reader opens `wiki/README.md`
- **THEN** it links the `wiki/stack/` hub
- **AND** the hub links every page in the section

#### Scenario: A user asks for a login wall

- **WHEN** a user asks an agent to put the app behind a login
- **THEN** the agent follows the Access runbook, widens the user token into the Access groups, and turns on enforcement in the same step

<!-- end specs/cloudflare-access-guide/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 9179 -->
## MODIFIED Requirements

### Requirement: CI is wired without user involvement

The provisioning step SHALL mint a separate account-owned deploy token named `<repo>-deploy`, scoped to the chosen account only, and SHALL set it as the GitHub repository secret `CLOUDFLARE_API_TOKEN`, with `CLOUDFLARE_ACCOUNT_ID` beside it. The deploy token SHALL carry only `Workers Scripts Write`, `D1 Write`, and `Account Settings Read`, plus `Workers R2 Storage Write` only when the app's wrangler config binds an R2 bucket. It SHALL NOT carry any token-write, Access, or user permission. The deploy token's value SHALL go directly to `gh secret set` and SHALL NOT be written to any file or printed. The user token SHALL NOT be set as a GitHub secret, and SHALL stay only in the primary worktree's durable `.env`. Minting the deploy token SHALL be covered by the same standing authorization as the widen. Neither step SHALL require the user to visit a web interface.

On a later run, the step SHALL reuse an existing `<repo>-deploy` token. It SHALL roll the token's value and set the secret again only when the secret is missing or the user asks to rotate it.

Before relying on a push, the step SHALL check that the stored `gh` credentials carry the `workflow` scope, since it is absent from `gh auth login`'s minimum set and its absence fails only at push time with wording a newcomer cannot act on. Where it is missing the step SHALL offer `gh auth refresh --scopes workflow` with a plain-language reason.

#### Scenario: Secrets reach GitHub, not the repo

- **WHEN** the provisioning step wires CI
- **THEN** the GitHub secret `CLOUDFLARE_API_TOKEN` holds the minted `<repo>-deploy` token
- **AND** the user token is in no GitHub secret and no committed file
- **AND** the user is not asked to open a web interface

#### Scenario: The deploy token is narrow

- **WHEN** the deploy token is minted
- **THEN** its policy has `Workers Scripts Write`, `D1 Write`, and `Account Settings Read` on the chosen account, and R2 only when the app binds a bucket
- **AND** it cannot create, edit, or read API tokens

#### Scenario: The deploy token value never reaches disk

- **WHEN** the deploy token is minted or rolled
- **THEN** its value is piped to `gh secret set` and is in no file, log, or report

#### Scenario: The workflow scope is checked before the push

- **WHEN** the step reaches CI wiring in a repo whose `gh` credentials lack `workflow`
- **THEN** it surfaces this before the push rather than after
- **AND** it offers the refresh command with a plain-language explanation

#### Scenario: The deploy model is unchanged by the choice of CI

- **WHEN** the workflow runs
- **THEN** it delegates the branch decision to the pack's build and deploy scripts rather than reimplementing it
- **AND** production, the staging Worker, and the per-commit preview alias behave exactly as they do under Cloudflare Workers Builds

### Requirement: Everything provisioned can be torn down

A teardown runbook in `wiki/stack/` SHALL remove the resources a provisioning run created — both Workers, both D1 databases, the memory store, the deploy and memory tokens, any Access resources, and the GitHub secrets — so repeated testing does not leak billable infrastructure. Teardown SHALL name every resource it intends to delete and require confirmation before deleting, and SHALL report anything it declined to touch.

#### Scenario: Teardown removes what provisioning created

- **WHEN** a user asks an agent to tear down a provisioned repo
- **THEN** the agent follows the runbook, lists the Workers, databases, memory store, tokens, and secrets it will remove, and asks for confirmation
- **AND** on confirmation it removes them and reports the result of each

#### Scenario: Teardown leaves unrelated resources alone

- **WHEN** the account contains databases or Workers that this repo did not create
- **THEN** teardown does not delete them
- **AND** it names them as skipped

## REMOVED Requirements

### Requirement: A provisioning skill stands the app up from a single API token

**Reason**: `/wong-cloudflare` is removed. Provisioning is a step of `/wong-setup`, which starts from an empty folder and always provisions the pack.
**Migration**: See "Setup provisions the app from a single API token". A repo installed before 18.0.0 runs `/wong-sync`, which plans the removal of the skill.

### Requirement: The provisioning skill provisions the memory store in every repo

**Reason**: The memory store is provisioned by setup's provisioning step, not by a separate skill.
**Migration**: See "Setup provisions the memory store in every install". An installed repo that lacks a store follows setup's provisioning runbook from the source checkout through `/wong-sync`.

### Requirement: Where the skill is present, it is the whole door to the pack

**Reason**: `/wong-cloudflare` is removed. Setup starts from an empty folder and always provisions the pack, so no repo needs a late-adoption door.
**Migration**: A repo installed before 18.0.0 runs `/wong-sync`, which plans the removal of the skill. A repo that never took the pack keeps its flags, and `/wong-sync` continues to honor them.

## ADDED Requirements

### Requirement: Setup provisions the app from a single API token

`/wong-setup` SHALL include a provisioning step that takes an empty folder from "has a Cloudflare token" to "has a memory store, a deployed Worker backed by two D1 databases, and a CI pipeline." The runbook SHALL live in `wong-setup/references/` and SHALL NOT be a separate skill. It SHALL provision the stack pack in every new install, with no `components.stackPack` gate. It SHALL drive the Cloudflare REST API directly and SHALL NOT require `node`, `npm`, or `wrangler` on the machine running it. It SHALL write nothing outside the repo and the host's durable `.env`, and SHALL leave its repo changes uncommitted for `/save`. Every step SHALL be idempotent, so that a failed run can run again and reuse what already exists.

#### Scenario: Provisioning runs as part of setup

- **WHEN** setup runs in an empty folder with a Cloudflare user token
- **THEN** it provisions the memory store, both app databases, the binding, the deploy token, and the GitHub secrets in one step
- **AND** it reports the production URL and the preview URL pattern after the first deploy

#### Scenario: A run is repeated after a failure

- **WHEN** the provisioning step runs again after it stopped partway
- **THEN** it reuses every resource that already exists and reports it as reused
- **AND** it creates only what is missing

#### Scenario: Repo changes are left for review

- **WHEN** provisioning finishes writing the D1 binding, workflow file, install record, and env entries
- **THEN** those edits sit uncommitted in the working tree
- **AND** the provisioning step runs no git command in the repo

### Requirement: Setup provisions the memory store in every install

Setup's provisioning step SHALL provision the memory store in every new install: it SHALL create the `<repo>-memory` D1 database, and the private R2 bucket of the same name when R2 is enabled, apply the memory migrations, and use the user token to mint a separate memory token that carries only D1 permissions, plus R2 permissions when a bucket exists. It SHALL write that token to the git-ignored `.env`, SHALL NOT set it as a CI secret, and SHALL record the resource ids under `components.memory` in `.claude/.wong-stack.json`. A run that finds the store already provisioned SHALL change nothing. Minting the memory token is covered by the same pre-authorization as the widen. Creating the database and bucket SHALL still require asking, as other billable resources do.

Before it creates the bucket, the step SHALL check whether R2 is enabled on the account. R2 needs a payment method on file even inside its free tier, and an API token cannot enable it. When R2 is not enabled, the step SHALL provision the database and the token without a bucket, record the absence under `components.memory`, and report that transcripts are not stored, with the dashboard step that turns R2 on. A later run that finds R2 enabled SHALL add the bucket and SHALL add R2 permissions to the existing memory token.

#### Scenario: The memory token is narrow

- **WHEN** provisioning mints the memory token
- **THEN** the token carries D1 permissions, and R2 permissions only when a bucket exists, and no token-write, Worker, or Access permission
- **AND** it is written to `.env` and not to any CI secret

#### Scenario: R2 is not enabled

- **WHEN** provisioning creates the memory store on an account where R2 is not enabled
- **THEN** it creates the memory database and token, and no bucket
- **AND** it reports that transcripts are not stored and names the dashboard step that enables R2

#### Scenario: R2 is enabled later

- **WHEN** a later run finds R2 enabled and the store has no bucket
- **THEN** it creates the bucket, adds R2 permissions to the memory token, and records the bucket

#### Scenario: Provisioning runs again

- **WHEN** the memory store and token already exist and verify
- **THEN** the run reports the store as current and creates nothing

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/downstream-contract/spec.md utf8 3194 -->
## Purpose

Pin, in deterministic tests, the paths, names, and deploy behavior that downstream users rely on, so that a WongStack change cannot silently break `wongstack-cloud`, installed repos, or the staging model.

## ADDED Requirements

### Requirement: Contract tests pin what downstream setup relies on

The source repository's CI SHALL run tests that fail when any of these change without the test being updated in the same commit: the README setup URL path; the name `/wong-setup` and the location of its provisioning runbook; the environment variable names `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_MEMORY_TOKEN` in `.env.example`; the GitHub secrets that `deploy.yml` reads; and the deploy token's permission list. Each failure SHALL name the downstream surface it protects.

#### Scenario: A rename breaks the contract

- **WHEN** a commit renames a pinned variable, secret, path, or permission
- **THEN** the contract test fails and names the surface that depends on it

#### Scenario: The workflow reads only the named secrets

- **WHEN** the test reads `.github/workflows/deploy.yml`
- **THEN** the only Cloudflare secrets it reads are `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`

### Requirement: The deploy branch logic is tested without Cloudflare

The pack's deploy script SHALL be tested against a fake `wrangler` that records its arguments. The tests SHALL cover the default branch deploying the production Worker, another branch deploying the staging Worker and uploading a preview alias, the preview URL output, and a refusal when the resolved Worker name would be production on a non-production branch. The tests SHALL need no network and no credential.

#### Scenario: A feature branch deploys only to staging

- **WHEN** the deploy script runs with a non-default branch and the fake `wrangler`
- **THEN** every recorded `wrangler` call targets the staging environment
- **AND** the script prints the preview URL that the fake reported

#### Scenario: The default branch deploys production

- **WHEN** the deploy script runs with the default branch
- **THEN** it calls `wrangler deploy` for the production Worker and uploads no preview alias

### Requirement: A live smoke run proves staging with the deploy token

Before release, one live run SHALL provision a throwaway repository from an empty folder with a user token on the host, push a branch, and confirm that CI deployed the staging Worker and published a preview URL with only the minted deploy token as its secret. The run SHALL then merge or push to the default branch to confirm the production deploy, and SHALL tear down every resource it created. The change SHALL record the result, the permissions the deploy token needed, and any permission that was missing.

#### Scenario: The deploy token is enough

- **WHEN** the throwaway repository's CI runs with the minted deploy token
- **THEN** migrations apply, the staging Worker deploys, and the preview URL returns `200`

#### Scenario: The smoke run cleans up

- **WHEN** the smoke run finishes
- **THEN** the teardown runbook removes the Workers, databases, memory store, and tokens it created, and reports anything skipped

<!-- end specs/downstream-contract/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 3530 -->
## MODIFIED Requirements

### Requirement: Warm one-paste front door

The README SHALL present a short, beginner-friendly paste-able setup prompt that keeps the URL-read mechanism pointed at `wong-setup/SKILL.md` so the README does not drift from the runbook. The URL SHALL name the file's real path in the git tree, `.agents/skills/wong-setup/SKILL.md`, not a path through the `.claude` link. The prompt and surrounding copy SHALL frame WongStack as an agent-agnostic, repo-native AI knowledge center that centralizes process and captures knowledge through work. The README SHALL tell the user to start in an empty folder, and SHALL name a Cloudflare account and one user token as requirements. The README SHALL mention Claude Code as an easy place to run the prompt while making clear that any coding agent with file, edit, and shell access can follow it.

#### Scenario: Newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one short prompt to paste that reads and follows the `wong-setup` runbook URL
- **AND** they understand the setup creates a knowledge-centered workflow in an empty folder and needs a Cloudflare account

#### Scenario: Agent-agnostic prompt

- **WHEN** a user runs the prompt in Claude Code, Codex, Cursor, or another capable coding agent
- **THEN** the prompt wording does not depend on Claude-only behavior
- **AND** the README explains the agent needs to read files, edit files, run shell commands, and ask questions

### Requirement: Setup provisions the memory store

The installation plan SHALL include setup's provisioning step, and SHALL install the session-start hooks and the `memory` skill. Setup SHALL ask for the Cloudflare user token before the install is planned. When no token is available, setup SHALL stop before it writes any file, and SHALL say what the token is for and where to create it. It SHALL NOT report the install as complete with memory or hosting working when no store or Worker exists.

#### Scenario: A token is available

- **WHEN** the installation tasks run with a Cloudflare user token in `.env`
- **THEN** the memory store and the app are provisioned, and the install record lists the store under `components.memory`

#### Scenario: No token yet

- **WHEN** a user starts setup without a Cloudflare token
- **THEN** setup writes nothing, and it gives the click path for the token and says that pasting it continues setup

## ADDED Requirements

### Requirement: Setup starts from an empty folder

`/wong-setup` SHALL install WongStack only into an empty folder, or a folder whose only entries are `.git` with no commits. For any other folder it SHALL stop before planning, write nothing, and say that setup starts from an empty folder. A folder that already has an install record SHALL still go to `/wong-sync`. The install SHALL always include the core payload, the Cloudflare pipeline, the starter app, and the UI pages, with no component question.

#### Scenario: An empty folder installs

- **WHEN** a user runs setup in an empty folder with a Cloudflare token
- **THEN** setup plans and applies the full install without asking which components to take

#### Scenario: A folder with files stops

- **WHEN** a user runs setup in a folder that has files and no install record
- **THEN** setup writes nothing and says that it starts from an empty folder

#### Scenario: An installed repo syncs

- **WHEN** a user runs setup in a repo with `.claude/.wong-stack.json`
- **THEN** setup goes to `/wong-sync`

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/open-source-release/spec.md utf8 2653 -->
## Purpose

Make the public WongStack repository safe and legal to reuse: a license, a way to report security problems, no committed secrets, and a setup prompt whose URL works for a first-time reader.

## ADDED Requirements

### Requirement: The repository carries an open-source license and a security policy

The repository root SHALL contain an MIT `LICENSE` with the copyright holder and year, and a `SECURITY.md`. `SECURITY.md` SHALL say how to report a vulnerability privately, and SHALL name each Cloudflare credential WongStack uses, where it is stored, and what it can do. The README SHALL link both files.

#### Scenario: A reader checks reuse terms

- **WHEN** a reader opens the repository on GitHub
- **THEN** GitHub detects the MIT license
- **AND** the README links `LICENSE` and `SECURITY.md`

#### Scenario: A reader finds the credential powers

- **WHEN** a reader opens `SECURITY.md`
- **THEN** it names the user token, the deploy token, and the memory token, where each is stored, and which one can mint other tokens

### Requirement: The setup URL resolves for a first-time reader

Every `raw.githubusercontent.com` URL in the README SHALL name a path that is a regular file in the git tree of the default branch. It SHALL NOT pass through a symbolic link, because that host returns `404` for a path through a directory link. A deterministic test SHALL fail when a README raw URL names a path that is not a regular file in the tree.

#### Scenario: The setup prompt URL loads

- **WHEN** a user pastes the README setup prompt into a coding agent
- **THEN** the agent fetches the `wong-setup` runbook with HTTP `200`

#### Scenario: A link path is rejected

- **WHEN** a README raw URL names a path under `.claude/`
- **THEN** the test fails and names the URL and the real path to use

### Requirement: The release is scanned for committed secrets

Before the release, the full git history SHALL be scanned for credential patterns: GitHub tokens, API keys, AWS keys, JWTs, bearer headers, and Cloudflare token-shaped values in `.env`-style assignments. The change SHALL record the scan result without printing a match. A true match SHALL stop the release until the credential is rotated. History SHALL NOT be rewritten as part of this change.

#### Scenario: The scan is clean

- **WHEN** the history scan finds no credential
- **THEN** the change records the scan date, the patterns, and a clean result

#### Scenario: The scan finds a credential

- **WHEN** the history scan finds a live credential
- **THEN** the release stops, the credential's name and commit are reported without its value, and the owner is asked to rotate it

<!-- end specs/open-source-release/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 2289 -->
## ADDED Requirements

### Requirement: The Cloudflare stack pack ships in the core payload

The payload SHALL include a Cloudflare stack pack — the D1 pipeline and deploy scripts, a seed template, guided config fragments, and pipeline docs — as part of the core payload. Every new install SHALL receive the pack, and setup SHALL record `components.stackPack: true` and `components.appScaffold: true` in the new install record, so that a later sync selects both categories. Setup SHALL NOT ask the user whether to take either.

A repo installed before 18.0.0 MAY carry `components.stackPack` and `components.appScaffold`. `/wong-sync` SHALL continue to honor those flags for such a repo: a repo with `components.stackPack` false or absent SHALL receive none of the pack's files, and a repo with `stackPack: true` and no scaffold SHALL receive no `app/` file.

#### Scenario: A new install receives the pack

- **WHEN** setup installs WongStack into an empty folder
- **THEN** the target receives the pack scripts, the seed template, the workflow, and the pipeline docs
- **AND** its install record has `components.stackPack` and `components.appScaffold` set to `true`

#### Scenario: A legacy repo that declined the pack is unaffected

- **WHEN** `/wong-sync` runs in a repo whose install record has `components.stackPack` false
- **THEN** no pack script, seed file, config fragment, or pipeline doc is written to it

#### Scenario: A legacy repo keeps its own app

- **WHEN** `/wong-sync` runs in a repo with `components.stackPack: true` and no `components.appScaffold`
- **THEN** no `app/` file is written to it

## REMOVED Requirements

### Requirement: An opt-in Cloudflare stack pack ships in the payload

**Reason**: Setup starts from an empty folder, so every new install takes the pack.
**Migration**: See "The Cloudflare stack pack ships in the core payload", which keeps the flags for legacy repos.

### Requirement: The pack is adoptable after setup

**Reason**: Every new install receives the pack, and `/wong-cloudflare`, the late-adoption door, is removed.
**Migration**: A legacy repo that wants the pack sets `components.stackPack: true` and runs `/wong-sync`, which lands the pack files and plans provisioning from setup's provisioning runbook in the source checkout.

<!-- end specs/stack-pack/spec.md -->
<!-- file specs/structured-asks/spec.md utf8 807 -->
## MODIFIED Requirements

### Requirement: WongStack enables supported Codex questions in Default mode

The WongStack source repository and every install SHALL enable Codex's supported Default-mode structured-input feature through trusted project configuration at `.agents/config.toml`, which Codex reads as `.codex/config.toml` through the `.codex` link. It SHALL NOT require a user-wide configuration change or a collaboration-mode switch.

#### Scenario: Trusted WongStack session uses Default mode

- **WHEN** a compatible Codex client starts a Default-mode session in a trusted WongStack checkout
- **THEN** `request_user_input` is callable for a structured question
- **AND** the user's global Codex configuration is unchanged
- **AND** the project setting has no scope outside the WongStack checkout

<!-- end specs/structured-asks/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 1245 -->
## ADDED Requirements

### Requirement: Sync migrates repos installed before 18.0.0

A sync that brings in 18.0.0 SHALL plan these tasks for a repo that needs them: move a real `.claude/` folder to `.agents/` and add `.claude` and `.codex` links to it, preserving every local file; move a real `.codex/config.toml` and `.codex/hooks.json` into `.agents/`, merging with any local entries; remove the `wong-cloudflare` skill; and, where the repo has the stack pack, mint a `<repo>-deploy` token from the user token in the host `.env` and set it as the GitHub secret `CLOUDFLARE_API_TOKEN`. The plan SHALL recommend rolling the user token's value, because CI could read it before this release. The sync SHALL follow setup's provisioning runbook from the source checkout for the token step.

#### Scenario: A legacy layout moves

- **WHEN** `/wong-sync` runs in a repo with a real `.claude/` folder
- **THEN** its plan moves the folder to `.agents/`, adds both links, and lists every local file it preserves

#### Scenario: The GitHub secret is replaced

- **WHEN** `/wong-sync` runs in a stack-pack repo whose GitHub secret holds the user token
- **THEN** its plan mints the deploy token, replaces the secret, and recommends rolling the user token

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-25

~~~
<!-- end .openspec.yaml -->
<!-- file review-visuals.html utf8 19868 fence=~~~ -->
~~~html
<section class="visual flow" id="setup" data-kind="flow" data-states="after today">
  <p class="caption">How a new user sets up WongStack: after this change, and today.</p>
  <div class="frame">
    <div class="state state-after">
      <h2>After</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-prompt">
          <h3>You paste the README prompt <span class="tag">Changed</span> <i class="callout">1</i></h3>
          <p>The URL is <code>.agents/skills/wong-setup/SKILL.md</code>. It returns <code>200</code>.</p>
          <details><summary>Details</summary><p>Actor: you. Action: paste the one prompt from the README into an agent in a folder. Result: the agent reads the real file on <code>raw.githubusercontent.com</code>. Today the URL goes through the <code>.claude</code> link and returns <code>404</code>. A test checks that each raw URL in the README names a real file in the git tree.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-empty-check">
          <h3><code>/wong-setup</code> checks the folder <span class="tag">New</span> <i class="callout">2</i></h3>
          <p>Setup starts only from an empty folder.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-setup</code>. Action: look for files in the folder. Result: one of two paths.</p></details>
        </div>
        <p class="flow-connector">↓ Is the folder empty?</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="after-not-empty">
            <h3>If no <span class="tag">New</span></h3>
            <p>Setup stops with a clear message. It installs nothing.</p>
            <details><summary>Details</summary><p>Actor: <code>/wong-setup</code>. Action: stop before it writes a file. Result: the message tells you to start again in an empty folder. No partial install stays behind.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-empty">
            <h3>If yes <span class="tag">New</span></h3>
            <p>Setup continues.</p>
            <details><summary>Details</summary><p>Actor: <code>/wong-setup</code>. Action: go to the next step. Result: the token question.</p></details>
          </div>
        </div>
        <p class="flow-connector">↓ Only the "yes" path continues</p>
        <div class="step flow-card" data-target-id="after-token">
          <h3>Setup asks for one Cloudflare token <span class="tag">New</span></h3>
          <p>The token is necessary. Setup does not continue without it.</p>
          <details><summary>Details</summary><p>Actor: you. Action: create a user token with two permissions and give it to setup. Result: setup writes it to the primary worktree's <code>.env</code>. The <code>tokens</code> item shows where each token goes.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-install">
          <h3>One install through the normal workflow <span class="tag">Changed</span> <i class="callout">3</i></h3>
          <p>The core payload lands. The stack pack, the starter app, and the UI pages are core now.</p>
          <details><summary>Details</summary><p>Actor: <code>/explore</code>, <code>/plan</code>, <code>/apply</code>, <code>/save</code>. Action: install the payload in one change. Result: the skills, the Cloudflare pipeline, the starter app, and the UI pages. Setup does not write <code>components.stackPack</code> or <code>components.appScaffold</code>.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-provision">
          <h3>Setup provisions Cloudflare in one step <span class="tag">New</span> <i class="callout">4</i></h3>
          <p>The runbook is in <code>wong-setup/references/</code>.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-setup</code>. Action, in this order: widen the user token for each step, find the account, create the memory store, create the production and staging databases, write the binding, and mint the deploy token. Result: all Cloudflare resources exist, and CI has its own narrow token.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-deploy">
          <h3>First deploy and smoke test <span class="tag">New</span></h3>
          <p>Setup sets the GitHub secret. <code>/save</code> starts the first deploy.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-setup</code> and <code>/save</code>. Action: send the deploy token to the GitHub secret, push, let CI deploy, and run a smoke test on the result. Result: a working app.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-url">
          <h3>Setup reports the live URL <span class="tag">Changed</span></h3>
          <p>Access and teardown are wiki runbooks, not a skill.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-setup</code>. Action: report the URL and what it created. Result: you have a live app. To add a login wall or to remove everything, follow the <code>wiki/stack/</code> runbooks.</p></details>
        </div>
      </div>
    </div>
    <div class="state state-today">
      <h2>Today</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-prompt">
          <h3>You paste the README prompt <span class="tag">Changed</span></h3>
          <p>The URL goes through <code>.claude/</code>. It returns <code>404</code>.</p>
          <details><summary>Details</summary><p>Actor: you. Action: paste the prompt. Result: <code>raw.githubusercontent.com</code> does not follow the <code>.claude</code> link, so the agent cannot read the setup skill.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-setup">
          <h3><code>/wong-setup</code> runs <span class="tag">Changed</span></h3>
          <p>It accepts an existing repo or an empty folder.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-setup</code>. Action: evaluate the repo. Result: an install plan for the repo that is there.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-install">
          <h3>Install through the normal workflow <span class="tag">Kept</span></h3>
          <p><code>/explore</code>, <code>/plan</code>, <code>/apply</code>, and <code>/save</code> install the payload.</p>
          <details><summary>Details</summary><p>Actor: the workflow skills. Action: install the core payload. Result: the skills, with no stack pack and no starter app.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-memory">
          <h3>Memory store through <code>/wong-cloudflare</code> <span class="tag">Removed</span></h3>
          <p>Optional. With no token, setup skips it.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-cloudflare</code>. Action: create the memory store and its narrow token. Result: session memory, if you gave a token.</p></details>
        </div>
        <p class="flow-connector">↓ Later, as a separate run</p>
        <div class="step flow-card" data-target-id="today-offer">
          <h3><code>/wong-cloudflare</code> offers the stack pack <span class="tag">Removed</span></h3>
          <p>You adopt the pack and the starter app, or you decline.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-cloudflare</code>. Action: ask to adopt the pack. Result: a second change that adds the pipeline and the app.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-provision">
          <h3>Widen the token and create the databases <span class="tag">Changed</span></h3>
          <p>The skill grants the groups it needs and creates production and staging.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-cloudflare</code>. Action: widen the user token, create the databases, and write the binding. Result: the resources for the app.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-secret">
          <h3>The user token becomes the GitHub secret <span class="tag">Removed</span></h3>
          <p>CI gets the token that can mint other tokens.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-cloudflare</code>. Action: copy the user token to <code>CLOUDFLARE_API_TOKEN</code>. Result: each workflow in the repo can read a token with full account power.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-deploy">
          <h3>Deploy <span class="tag">Kept</span></h3>
          <p>CI deploys the app.</p>
          <details><summary>Details</summary><p>Actor: CI. Action: run <code>deploy.yml</code>. Result: a live URL.</p></details>
        </div>
      </div>
    </div>
  </div>
  <div class="notes">
    <ol>
      <li>The README links the real path, not the path through a link. <code>raw.githubusercontent.com</code> does not follow symlinks. A test stops a regression.</li>
      <li>A non-empty folder gets a clear stop, not a partial install. A partial install into an unknown repo is the case that this change stops supporting. This stop is easy to change in review.</li>
      <li>A blank folder has no app of its own, and each user is assumed to use Cloudflare. Thus the pack, the scaffold, and the UI pages become core. Repos that were installed before this release keep their flags, and <code>/wong-sync</code> honors them.</li>
      <li>Provisioning is a step of <code>/wong-setup</code>, not a second skill. The memory store already needs a Cloudflare account in each repo, so a separate door adds steps and no choice.</li>
    </ol>
  </div>
</section>

<section class="visual flow" id="tokens" data-kind="flow" data-states="after today">
  <p class="caption">Where each Cloudflare token lives: after this change, and today.</p>
  <div class="frame">
    <div class="state state-after">
      <h2>After</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-user-token">
          <h3>User token, on the host only <span class="tag">Changed</span> <i class="callout">1</i></h3>
          <p>It stays in the primary worktree's <code>.env</code>. It mints the other two tokens.</p>
          <details><summary>Details</summary><p>You create it with two permissions: <code>User ▸ API Tokens ▸ Edit</code> and <code>Account ▸ API Tokens ▸ Edit</code>. Set Account Resources to Include ▸ your account. Setup grants itself only the permission groups that each step needs. Setup reports each group that it granted. You can narrow the token back to the two permissions after setup. <code>.env.example</code>, the README, and the credentials page say this.</p></details>
        </div>
        <p class="flow-connector">↓ Mints two tokens</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="after-memory-token">
            <h3><code>&lt;repo&gt;-memory</code> <span class="tag">Kept</span></h3>
            <p>Goes to <code>.env</code> on the host.</p>
            <details><summary>Details</summary><p>Actor: setup. Action: mint the narrow memory token and write it to <code>.env</code>. Result: the memory scripts read and write the store. CI never gets this token. This change does not change it.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-deploy-token">
            <h3><code>&lt;repo&gt;-deploy</code> <span class="tag">New</span> <i class="callout">2</i></h3>
            <p>Account-owned. It can deploy and nothing more.</p>
            <details><summary>Details</summary><p>Actor: setup. Action: mint it with <code>POST /accounts/{account_id}/tokens</code>. Permissions: <code>Workers Scripts Write</code>, <code>D1 Write</code>, and <code>Account Settings Read</code>. Setup adds <code>Workers R2 Storage Write</code> only when the app's config binds a bucket. Result: a token that belongs to the account, so it outlives one person's user token. On a later run, setup reuses the token and rolls its value only when the secret is missing.</p></details>
          </div>
        </div>
        <p class="flow-connector">↓ Only the deploy token continues, through a pipe</p>
        <div class="step flow-card" data-target-id="after-secret">
          <h3><code>gh secret set CLOUDFLARE_API_TOKEN</code> <span class="tag">Changed</span> <i class="callout">3</i></h3>
          <p>The value goes straight to GitHub. No file gets it.</p>
          <details><summary>Details</summary><p>Actor: setup. Action: pipe the minted value into <code>gh secret set</code>. Result: the secret holds the deploy token. The value is never written to disk, a note, or a log. The secret keeps its name, because <code>wrangler</code> reads that name natively.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-ci">
          <h3><code>deploy.yml</code> and <code>wrangler</code> deploy <span class="tag">Kept</span></h3>
          <p>Production, staging, and the preview alias use the deploy token.</p>
          <details><summary>Details</summary><p>Actor: CI. Action: run <code>cf-deploy.sh</code> with the secret. Result: the same three deploy paths as today. A workflow that reads the secret can deploy code, but it cannot mint tokens or take over the account. Contract tests run <code>cf-deploy.sh</code> against a fake <code>wrangler</code>. One live run from the host confirms that the permission list is enough.</p></details>
        </div>
      </div>
    </div>
    <div class="state state-today">
      <h2>Today</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-user-token">
          <h3>User token, widened <span class="tag">Changed</span></h3>
          <p>It can mint tokens. It sits in the host <code>.env</code>.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-cloudflare</code>. Action: widen the token with each group it needs. Result: one token with power over the whole account.</p></details>
        </div>
        <p class="flow-connector">↓ Goes to two places</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="today-memory-token">
            <h3><code>&lt;repo&gt;-memory</code> <span class="tag">Kept</span></h3>
            <p>Minted and written to <code>.env</code> only.</p>
            <details><summary>Details</summary><p>Actor: <code>/wong-cloudflare</code>. Action: mint the narrow memory token. Result: the token stays on the host.</p></details>
          </div>
          <div class="flow-branch" data-target-id="today-copy">
            <h3>Copied to <code>CLOUDFLARE_API_TOKEN</code> <span class="tag">Removed</span></h3>
            <p>The GitHub secret is the user token itself.</p>
            <details><summary>Details</summary><p>Actor: <code>/wong-cloudflare</code>. Action: copy the user token to the secret. Result: the token that can mint tokens is in CI.</p></details>
          </div>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-risk">
          <h3>Each Actions workflow can read it <span class="tag">Removed</span></h3>
          <p>Risk: a workflow can take over the Cloudflare account.</p>
          <details><summary>Details</summary><p>Actor: any workflow in the repo. Action: read the secret. Result: it can mint a new token with any permission. Installed repos should roll their user token after they sync.</p></details>
        </div>
      </div>
    </div>
  </div>
  <div class="notes">
    <ol>
      <li>The user token starts with two permissions. Setup widens it only for each step, and it reports what it granted. Thus you can see the token's power and narrow it again.</li>
      <li>The deploy token belongs to the account, not to a person. When the person who ran setup leaves, CI still deploys. The permission list is the smallest set that deploys the Worker and migrates D1. The live smoke run confirms it.</li>
      <li>A pipe from the mint call to <code>gh secret set</code> keeps the value off the disk. The secret name does not change, so <code>deploy.yml</code> stays the same.</li>
    </ol>
  </div>
</section>

<section class="visual tree" id="layout" data-kind="tree">
  <p class="caption">Files this change adds, edits, and removes at the repo root. The same layout goes to each new install.</p>
  <div class="frame">
    <ul>
      <li class="edit">.agents/ <span class="why">the one real agent folder</span></li>
      <li class="add">.agents/config.toml <span class="why">moved from <code>.codex/config.toml</code></span></li>
      <li class="add">.agents/hooks.json <span class="why">moved from <code>.codex/hooks.json</code></span></li>
      <li>.agents/settings.json</li>
      <li class="add">.agents/skills/wong-setup/references/cloudflare.md <span class="why">new folder; the provisioning runbook</span></li>
      <li class="add">.agents/skills/wong-setup/references/failure-map.md <span class="why">moved from <code>wong-cloudflare</code></span></li>
      <li class="add">.agents/skills/wong-setup/references/permission-groups.md <span class="why">moved from <code>wong-cloudflare</code>; adds the deploy token's list</span></li>
      <li class="del">.agents/skills/wong-cloudflare/ <span class="why">skill removed; Access and teardown go to <code>wiki/stack/</code></span></li>
      <li class="edit">.agents/skills/wong-sync/references/payload-files.json <span class="why">pack, scaffold, and ui fold into core; <code>wong-cloudflare</code> removed</span></li>
      <li>.claude → .agents <span class="why">link, as today</span></li>
      <li class="edit">.codex → .agents <i class="callout">1</i> <span class="why">a real folder becomes a link</span></li>
      <li class="edit">.env.example <span class="why">the user token's two permissions and the deploy token</span></li>
      <li class="add">LICENSE <span class="why">MIT</span></li>
      <li class="edit">README.md <i class="callout">2</i> <span class="why">setup URL uses <code>.agents/skills/wong-setup/SKILL.md</code></span></li>
      <li class="add">SECURITY.md <span class="why">how to report a vulnerability; which token holds which power</span></li>
      <li class="add">scripts/tests/cf-deploy.test.mjs <span class="why">three deploy paths against a fake <code>wrangler</code></span></li>
      <li class="add">scripts/tests/downstream-contract.test.mjs <span class="why">names and paths that <code>wongstack-cloud</code> relies on</span></li>
    </ul>
  </div>
  <div class="notes">
    <ol>
      <li>A probe confirms that Codex follows the <code>.codex</code> link and loads each skill one time. Codex can find the same skills through <code>.agents/skills/</code> and through the link, so it could load each skill two times. On Windows, a clone with <code>core.symlinks=false</code> sees each link as a plain file. <code>.claude</code> has this problem today, so the change adds no new risk.</li>
      <li><code>raw.githubusercontent.com</code> serves only real files in the git tree. It does not follow a link. Thus the README names the real path under <code>.agents/</code>.</li>
    </ol>
  </div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 67453 fence=~~~ -->
~~~html
<!-- wong-review:2 -->
<!doctype html>
<!--
  WongStack review kit. The shared offline viewer lives here.
  Authors write review-visuals.html using review-author.md and review-examples.html.
  build-review.mjs fills the proposal and visual slots. Generated pages contain
  the viewer, so archives open without a server or adjacent source files.
-->

<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — 2026-09-25-prepare-open-source-release</title>
<style>
  :root { --ink:#333; --line:#9a9a9a; --fill:#e9e9e9; --fill2:#f6f6f6; --note:#fff4c2; --mark:#1a73e8; --markbg:#eaf2fd; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.4 "Helvetica Neue", Arial, sans-serif; color:var(--ink); background:#d9d9d9; }
  a { color:inherit; }

  /* chrome: the reviewer's toolbar */
  .chrome { position:sticky; top:0; z-index:9; background:#222; color:#eee; padding:8px 14px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; font-size:13px; min-height:41px; }
  .chrome b { font-weight:600; }
  .chrome .group { display:flex; gap:6px; align-items:center; }
  .chrome .group:empty { display:none; }
  .chrome button { font:inherit; padding:3px 9px; background:#444; color:#eee; border:1px solid #666; border-radius:3px; cursor:pointer; }
  .chrome button[aria-pressed="true"] { background:#eee; color:#222; }
  .chrome button.annotate[aria-pressed="true"] { background:var(--mark); color:#fff; border-color:var(--mark); }
  .chrome .hint { opacity:.7; margin-left:auto; }
  .chrome .tools { display:contents; }
  .chrome .tools-toggle { display:none; }

  /* layout: What Changes panel + stage */
  .layout { display:flex; align-items:flex-start; }
  .panel { flex:0 0 340px; position:sticky; top:41px; max-height:calc(100vh - 41px); overflow:auto; background:#fff; border-right:2px solid var(--line); padding:16px 18px; font-size:13px; }
  .panel h2 { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#666; margin:18px 0 6px; }
  .panel h2:first-child { margin-top:0; }
  .panel p { margin:0 0 8px; }
  .panel ol.changes { margin:0; padding:0; list-style:none; counter-reset:c; }
  .panel ol.changes li { counter-increment:c; position:relative; margin:0 0 4px; padding:6px 8px 6px 30px; border:1px solid transparent; border-radius:3px; cursor:pointer; }
  .panel ol.changes li::before { content:counter(c); position:absolute; left:8px; top:7px; width:16px; height:16px; border-radius:50%; background:var(--fill); color:#666; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .panel ol.changes li:hover { background:var(--fill2); }
  .panel ol.changes li.on { border-color:var(--mark); background:var(--markbg); }
  .panel ol.changes li.on::before { background:var(--mark); color:#fff; }
  .panel ol.changes li .kind { display:block; font-size:11px; color:var(--mark); margin-top:2px; }
  .panel ol.changes li.dead .kind { color:#c00; }
  .panel ol.changes li.text .kind { color:#888; }
  .panel code { background:var(--fill); padding:0 3px; overflow-wrap:anywhere; }
  .panel .notes-list { margin:0; padding-left:18px; }
  .panel .notes-list li { margin:0 0 6px; cursor:pointer; }
  .panel .notes-list .where { color:#666; font-size:11px; display:block; }
  .panel .notes-list button { border:0; background:none; color:var(--ink); text-align:left; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-list { margin:0; padding-left:18px; }
  .panel .draft-list li { margin:0 0 6px; }
  .panel .draft-list button { border:0; background:none; color:var(--ink); text-align:left; text-decoration:underline; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-count { display:inline-block; margin-left:6px; padding:0 6px; border:1px solid var(--line); border-radius:12px; white-space:nowrap; }
  .panel .empty { color:#666; list-style:none; margin-left:-18px; }
  .stage { flex:1; min-width:0; }
  .item-header { max-width:960px; margin:24px auto 0; padding:20px 24px; background:#fff; border:2px solid var(--line); overflow-wrap:anywhere; }
  .item-header[hidden] { display:none; }
  .item-header h1 { margin:0; font-size:20px; scroll-margin-top:calc(var(--chrome-h, 41px) + 12px); }
  .item-header .position { margin:0 0 10px; color:#666; font-size:13px; }

  /* one visual at a time */
  .visual:not([data-active]) { display:none !important; }
  .visual[data-active] { display:block !important; }
  .frame { max-width:960px; margin:12px auto 24px; background:#fff; border:2px solid var(--line); box-shadow:0 2px 0 #bbb; overflow-wrap:anywhere; }
  .visual:not(.screen) .frame { padding:24px; }
  .caption { max-width:960px; margin:12px auto 0; font-size:12px; color:#666; }
  .caption + .frame { margin-top:6px; }
  .state { display:none; }
  .state[data-on] { display:block; }

  /* lo-fi screen primitives — the screen visual's vocabulary */
  .topbar { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:2px solid var(--line); background:var(--fill2); }
  .logo { width:34px; height:34px; border:2px solid var(--line); background:var(--fill); position:relative; }
  .logo::before, .logo::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 48%, var(--line) 48%, var(--line) 52%, transparent 52%); }
  .logo::after { transform:scaleX(-1); }
  .nav { display:flex; gap:14px; }
  .nav span { padding:4px 0; border-bottom:2px solid transparent; }
  .nav span.on { border-color:var(--ink); font-weight:600; }
  .body { padding:20px; }
  h1 { font-size:20px; margin:0; }
  .row { display:flex; gap:12px; align-items:center; }
  .row.between { justify-content:space-between; }
  .btn { display:inline-block; padding:7px 14px; border:2px solid var(--ink); border-radius:3px; background:#fff; cursor:pointer; user-select:none; }
  .btn.primary { background:var(--ink); color:#fff; }
  .btn.ghost { border-color:transparent; text-decoration:underline; }
  .input { display:inline-block; min-width:220px; padding:7px 10px; border:2px solid var(--line); border-radius:3px; background:#fff; color:#888; }
  table { width:100%; border-collapse:collapse; margin-top:16px; }
  th { text-align:left; font-size:12px; color:#666; border-bottom:2px solid var(--line); padding:8px 6px; }
  td { padding:10px 6px; border-bottom:1px solid #ddd; }
  tr.click { cursor:pointer; }
  .tag { display:inline-block; padding:1px 8px; border:1px solid var(--line); border-radius:10px; font-size:12px; }
  .box { border:2px dashed var(--line); background:var(--fill2); padding:30px; text-align:center; color:#666; margin-top:16px; }
  .skeleton { height:14px; background:var(--fill); margin:14px 0; width:70%; }
  .skeleton.s { width:40%; }
  .kv { display:grid; grid-template-columns:140px 1fr; gap:8px 12px; margin:16px 0; }
  .kv dt { color:#666; } .kv dd { margin:0; }
  .muted { color:#666; }
  .hero { height:120px; background:var(--fill); border:2px solid var(--line); position:relative; margin:12px 0; }
  .hero::before, .hero::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 49.5%, var(--line) 49.5%, var(--line) 50.5%, transparent 50.5%); }
  .hero::after { transform:scaleX(-1); }
  .callout { display:inline-flex; width:18px; height:18px; border-radius:50%; background:#c00; color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; }
  .notes { max-width:960px; margin:0 auto 40px; background:var(--note); border:1px solid #d8c66a; padding:12px 18px; font-size:13px; }
  .notes ol { margin:6px 0 0; padding-left:20px; }
  .notes .brief { margin:0 0 6px; }

  /* flow: lanes of steps */
  .lane { display:flex; align-items:center; gap:10px; padding:10px 0; flex-wrap:wrap; }
  .lane + .lane { border-top:1px solid #ddd; }
  .lane .label { flex:0 0 70px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; }
  .lane.today .step { color:#777; border-style:dashed; }
  .step { padding:8px 12px; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-sequence { max-width:720px; margin:0 auto; }
  .flow-card, .flow-branch { display:block; padding:14px; min-width:0; overflow-wrap:anywhere; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-card h3, .flow-branch h3 { margin:0 0 7px; font-size:15px; }
  .flow-card p, .flow-branch p { margin:0; }
  .flow-card details, .flow-branch details { border-top:1px solid #d5d5d5; margin-top:11px; padding-top:9px; }
  .flow-card details p, .flow-branch details p { margin-top:8px; }
  .flow-connector { text-align:center; margin:10px 0; color:#666; font-weight:600; }
  .flow-branches { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
  .step.gone { text-decoration:line-through; color:#999; }
  .arrow { color:#999; }
  .arrow::before { content:"→"; }

  /* diff: before / after text */
  .diff { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .diff > div > .label, .tree .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:6px; }
  .diff pre { margin:0; padding:10px 12px; background:var(--fill2); border:1px solid #ddd; font:12px/1.5 Menlo, Consolas, monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
  .diff .line { display:block; }
  .diff .del { color:#999; text-decoration:line-through; }
  .diff .add { border-left:3px solid var(--mark); margin-left:-12px; padding-left:9px; background:var(--markbg); }

  /* tree: files touched */
  .tree ul { list-style:none; margin:0; padding:0; font:13px/1.8 Menlo, Consolas, monospace; }
  .tree li { padding-left:4px; }
  .tree li::before { display:inline-block; width:18px; color:#888; }
  .tree li.add::before { content:"+"; color:var(--mark); font-weight:700; }
  .tree li.edit::before { content:"~"; }
  .tree li.del::before { content:"−"; }
  .tree li.del { color:#999; text-decoration:line-through; }
  .tree li .why { color:#666; font:12px "Helvetica Neue", Arial, sans-serif; margin-left:10px; }

  /* text stage: a bullet with no visual, and the landing */
  .textstage h1 { font-size:22px; margin:0 0 12px; }
  .textstage p { font-size:16px; max-width:640px; }
  .textstage ol { font-size:15px; max-width:640px; padding-left:22px; }
  .textstage ol li { margin:0 0 6px; cursor:pointer; }
  .textstage ol li:hover { text-decoration:underline; }
  .textstage .muted { font-size:13px; }

  /* highlight: the mark named by the hash */
  .marked { outline:3px solid var(--mark); outline-offset:3px; box-shadow:0 0 0 6px var(--markbg); }
  tr.marked { outline-offset:0; }
  .diff .add.marked, .tree li.marked { outline-offset:0; box-shadow:none; }

  /* annotate */
  body.annotating .visual[data-active] .frame { cursor:crosshair; }
  .hovering { outline:2px dashed var(--mark); outline-offset:2px; }
  .pin { display:inline-flex; width:18px; height:18px; border-radius:3px; background:var(--mark); color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; cursor:pointer; }
  .pin.stale { background:#999; }
  .popover { position:fixed; z-index:10; width:300px; background:#fff; border:2px solid var(--mark); border-radius:4px; padding:10px; box-shadow:0 4px 14px rgba(0,0,0,.25); font-size:13px; }
  .popover .where { color:#666; font-size:11px; margin-bottom:6px; word-break:break-word; }
  .popover textarea { width:100%; height:70px; font:inherit; padding:6px; border:1px solid var(--line); border-radius:3px; resize:vertical; }
  .popover .row { margin-top:8px; }
  .popover button { font:inherit; padding:4px 10px; border:1px solid var(--line); background:#fff; border-radius:3px; cursor:pointer; }
  .popover button.save { background:var(--mark); color:#fff; border-color:var(--mark); }
  .popover .del { margin-left:auto; color:#c00; }
  .popover .status { margin:8px 0 0; color:#666; }
  .storage-status { font-size:12px; color:#666; }
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#222; color:#eee; padding:8px 14px; border-radius:3px; font-size:13px; z-index:11; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  #copybuf { position:fixed; left:-9999px; top:0; }
  .error { color:#c00; }

  /* chrome extras: step through changes, phone/desktop view, the panel toggle */
  .chrome .count { opacity:.8; min-width:44px; text-align:center; white-space:nowrap; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { min-width:0; overflow-wrap:anywhere; }

  /* phone: stage full width, the list is a sheet, the note box docks to the bottom */
  @media (max-width: 760px) {
    body { font-size:15px; }
    .chrome { display:grid; grid-template-columns:auto 1fr auto; gap:6px; padding:6px 8px; }
    .chrome > b, .chrome .hint, .chrome #viewport { display:none !important; }
    .chrome .menu, .chrome .tools-toggle { display:inline-block; }
    .chrome > .group { justify-content:center; gap:4px; }
    .chrome .tools { display:none; grid-column:1 / -1; min-width:0; }
    .chrome .tools.open { display:flex; flex-wrap:wrap; gap:8px; padding-top:6px; }
    .chrome .tools .group { flex-wrap:wrap; min-width:0; }
    .chrome .tools button { max-width:100%; overflow-wrap:anywhere; }
    .layout { display:block; }
    .panel { display:none; position:fixed; left:0; right:0; bottom:0; z-index:8; border-right:0; padding:14px 16px 40px; }
    body.menu .panel { display:block; }
    .panel ol.changes li { padding:10px 10px 10px 32px; }
    .frame { margin:12px 8px; }
    .item-header { margin:12px 8px 0; padding:14px; }
    .caption { margin:12px 8px 0; }
    .notes { margin:0 8px 24px; }
    .visual:not(.screen) .frame { padding:14px; }
    .body { padding:14px; }
    .diff { grid-template-columns:1fr; }
    .flow-branches { grid-template-columns:1fr; }
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    body.editor-open .stage { padding-bottom:240px; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { min-height:40px; min-width:40px; padding:6px 8px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · 2026-09-25-prepare-open-source-release</b>
  <button class="menu" id="menu" aria-expanded="false" aria-controls="panel">Changes</button>
  <div class="group"><button id="prev" title="Previous change" aria-label="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change" aria-label="Next change">›</button></div>
  <button class="tools-toggle" id="tools-toggle" aria-expanded="false" aria-controls="tools">Tools</button>
  <div class="tools" id="tools">
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
    <span class="storage-status" id="storage-status" hidden>Notes and drafts last for this session only.</span>
  </div>
  </div>
  <span class="hint">Click a change on the left. Grey = layout only. Blue = what changes. Red dots = reasoning below.</span>
</div>

<script type="text/markdown" id="proposal">
<!-- proposal:start -->
## Why

WongStack is a public repo, but it has no license, and its one-paste setup prompt is broken: `raw.githubusercontent.com` does not follow the `.claude` symlink, so the README's setup URL returns `404`. The GitHub secret `CLOUDFLARE_API_TOKEN` is the user's own token. That token can mint other tokens, so any workflow in the repo can take over the whole Cloudflare account. The memory store (17.0.0) already needs a Cloudflare account in every repo, so the separate `/wong-cloudflare` door and the opt-in stack pack now add steps without adding choice. `wongstack-cloud` will run setup on hosted VMs, and nothing tests the parts of WongStack that it relies on.

## What Changes

- **BREAKING:** `/wong-cloudflare` is removed. `/wong-setup` always starts from an empty folder. It asks for one Cloudflare token and provisions everything in one step: the memory store, the two app databases, the starter app, the CI deploy token, and the first deploy. The provisioning runbook and its references move into `wong-setup/references/`. A folder that already has files gets a clear stop, not a partial install. (review.html#/setup)
- **BREAKING:** The stack pack and the app scaffold become core. A new install always gets the Cloudflare pipeline, the starter app, and the UI pages, and its install record sets `components.stackPack`, `components.appScaffold`, and `components.ui` to `true`. `/wong-sync` still honors those flags in repos that were installed before this release.
- **BREAKING:** CI gets a narrow deploy token, not the user token. Setup uses the user token to mint an account-owned token named `<repo>-deploy`, with only `Workers Scripts Write`, `D1 Write`, and `Account Settings Read`. Setup sends that token directly to the GitHub secret `CLOUDFLARE_API_TOKEN` and writes it to no file. The user token stays only in the primary worktree's `.env` on the host. (review.html#/tokens)
- `.env.example`, the README, and the credentials page state that the user token starts with two permissions and grants itself only the groups that each step needs. They also state what setup grants and how to narrow the token again.
- **BREAKING:** One real agent folder. `.codex` becomes a symlink to `.agents`, as `.claude` already is. `.codex/config.toml` and `.codex/hooks.json` move to `.agents/config.toml` and `.agents/hooks.json`. New installs get the same layout: a real `.agents/` folder with `.claude` and `.codex` links. A probe confirms that Codex follows the link and loads each skill once. (review.html#/layout)
- The README setup URL uses the real path `.agents/skills/wong-setup/SKILL.md`, and a test checks that each raw URL in the README names a real file in the git tree, not a path through a link.
- Open-source files: an MIT `LICENSE`, a `SECURITY.md` that says how to report a vulnerability and which token holds which power, and a history scan for committed secrets before the release.
- Contract tests pin what `wongstack-cloud` relies on: the setup URL, the variable and secret names, the `deploy.yml` secrets, the deploy token's permission list, and the branch logic of `cf-deploy.sh` run against a fake `wrangler` (production, staging, and preview alias). One live run on a throwaway repo from the host confirms that staging still deploys and that the deploy token is enough.
- `/wong-sync` gives installed repos a migration task: move a real `.claude/` folder to `.agents/` with both links, remove the `wong-cloudflare` skill, and replace the GitHub secret with a minted deploy token.
- Access and teardown move from the skill into the `wiki/stack/` runbooks, which already own most of those steps.
- Release as WongStack 18.0.0.

**Non-goals:** No setup into a folder that already has files. No change to the memory store, its token, or the staging model. No rewrite of archived changes, the changelog, or git history, even where they name private downstream repos. No change to `wongstack-cloud` itself: its brief still says "create the repo from the template", and that repo owns the move to a blank-folder setup.
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">
<header class="item-header" id="item-header" hidden><p class="position" id="item-position"></p><h1 id="item-title" tabindex="-1"></h1></header>

<!-- short fallback for an empty proposal or an invalid direct link -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<section class="visual flow" id="setup" data-kind="flow" data-states="after today">
  <p class="caption">How a new user sets up WongStack: after this change, and today.</p>
  <div class="frame">
    <div class="state state-after">
      <h2>After</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-prompt">
          <h3>You paste the README prompt <span class="tag">Changed</span> <i class="callout">1</i></h3>
          <p>The URL is <code>.agents/skills/wong-setup/SKILL.md</code>. It returns <code>200</code>.</p>
          <details><summary>Details</summary><p>Actor: you. Action: paste the one prompt from the README into an agent in a folder. Result: the agent reads the real file on <code>raw.githubusercontent.com</code>. Today the URL goes through the <code>.claude</code> link and returns <code>404</code>. A test checks that each raw URL in the README names a real file in the git tree.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-empty-check">
          <h3><code>/wong-setup</code> checks the folder <span class="tag">New</span> <i class="callout">2</i></h3>
          <p>Setup starts only from an empty folder.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-setup</code>. Action: look for files in the folder. Result: one of two paths.</p></details>
        </div>
        <p class="flow-connector">↓ Is the folder empty?</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="after-not-empty">
            <h3>If no <span class="tag">New</span></h3>
            <p>Setup stops with a clear message. It installs nothing.</p>
            <details><summary>Details</summary><p>Actor: <code>/wong-setup</code>. Action: stop before it writes a file. Result: the message tells you to start again in an empty folder. No partial install stays behind.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-empty">
            <h3>If yes <span class="tag">New</span></h3>
            <p>Setup continues.</p>
            <details><summary>Details</summary><p>Actor: <code>/wong-setup</code>. Action: go to the next step. Result: the token question.</p></details>
          </div>
        </div>
        <p class="flow-connector">↓ Only the "yes" path continues</p>
        <div class="step flow-card" data-target-id="after-token">
          <h3>Setup asks for one Cloudflare token <span class="tag">New</span></h3>
          <p>The token is necessary. Setup does not continue without it.</p>
          <details><summary>Details</summary><p>Actor: you. Action: create a user token with two permissions and give it to setup. Result: setup writes it to the primary worktree's <code>.env</code>. The <code>tokens</code> item shows where each token goes.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-install">
          <h3>One install through the normal workflow <span class="tag">Changed</span> <i class="callout">3</i></h3>
          <p>The core payload lands. The stack pack, the starter app, and the UI pages are core now.</p>
          <details><summary>Details</summary><p>Actor: <code>/explore</code>, <code>/plan</code>, <code>/apply</code>, <code>/save</code>. Action: install the payload in one change. Result: the skills, the Cloudflare pipeline, the starter app, and the UI pages. Setup does not write <code>components.stackPack</code> or <code>components.appScaffold</code>.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-provision">
          <h3>Setup provisions Cloudflare in one step <span class="tag">New</span> <i class="callout">4</i></h3>
          <p>The runbook is in <code>wong-setup/references/</code>.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-setup</code>. Action, in this order: widen the user token for each step, find the account, create the memory store, create the production and staging databases, write the binding, and mint the deploy token. Result: all Cloudflare resources exist, and CI has its own narrow token.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-deploy">
          <h3>First deploy and smoke test <span class="tag">New</span></h3>
          <p>Setup sets the GitHub secret. <code>/save</code> starts the first deploy.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-setup</code> and <code>/save</code>. Action: send the deploy token to the GitHub secret, push, let CI deploy, and run a smoke test on the result. Result: a working app.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-url">
          <h3>Setup reports the live URL <span class="tag">Changed</span></h3>
          <p>Access and teardown are wiki runbooks, not a skill.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-setup</code>. Action: report the URL and what it created. Result: you have a live app. To add a login wall or to remove everything, follow the <code>wiki/stack/</code> runbooks.</p></details>
        </div>
      </div>
    </div>
    <div class="state state-today">
      <h2>Today</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-prompt">
          <h3>You paste the README prompt <span class="tag">Changed</span></h3>
          <p>The URL goes through <code>.claude/</code>. It returns <code>404</code>.</p>
          <details><summary>Details</summary><p>Actor: you. Action: paste the prompt. Result: <code>raw.githubusercontent.com</code> does not follow the <code>.claude</code> link, so the agent cannot read the setup skill.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-setup">
          <h3><code>/wong-setup</code> runs <span class="tag">Changed</span></h3>
          <p>It accepts an existing repo or an empty folder.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-setup</code>. Action: evaluate the repo. Result: an install plan for the repo that is there.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-install">
          <h3>Install through the normal workflow <span class="tag">Kept</span></h3>
          <p><code>/explore</code>, <code>/plan</code>, <code>/apply</code>, and <code>/save</code> install the payload.</p>
          <details><summary>Details</summary><p>Actor: the workflow skills. Action: install the core payload. Result: the skills, with no stack pack and no starter app.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-memory">
          <h3>Memory store through <code>/wong-cloudflare</code> <span class="tag">Removed</span></h3>
          <p>Optional. With no token, setup skips it.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-cloudflare</code>. Action: create the memory store and its narrow token. Result: session memory, if you gave a token.</p></details>
        </div>
        <p class="flow-connector">↓ Later, as a separate run</p>
        <div class="step flow-card" data-target-id="today-offer">
          <h3><code>/wong-cloudflare</code> offers the stack pack <span class="tag">Removed</span></h3>
          <p>You adopt the pack and the starter app, or you decline.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-cloudflare</code>. Action: ask to adopt the pack. Result: a second change that adds the pipeline and the app.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-provision">
          <h3>Widen the token and create the databases <span class="tag">Changed</span></h3>
          <p>The skill grants the groups it needs and creates production and staging.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-cloudflare</code>. Action: widen the user token, create the databases, and write the binding. Result: the resources for the app.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-secret">
          <h3>The user token becomes the GitHub secret <span class="tag">Removed</span></h3>
          <p>CI gets the token that can mint other tokens.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-cloudflare</code>. Action: copy the user token to <code>CLOUDFLARE_API_TOKEN</code>. Result: each workflow in the repo can read a token with full account power.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-deploy">
          <h3>Deploy <span class="tag">Kept</span></h3>
          <p>CI deploys the app.</p>
          <details><summary>Details</summary><p>Actor: CI. Action: run <code>deploy.yml</code>. Result: a live URL.</p></details>
        </div>
      </div>
    </div>
  </div>
  <div class="notes">
    <ol>
      <li>The README links the real path, not the path through a link. <code>raw.githubusercontent.com</code> does not follow symlinks. A test stops a regression.</li>
      <li>A non-empty folder gets a clear stop, not a partial install. A partial install into an unknown repo is the case that this change stops supporting. This stop is easy to change in review.</li>
      <li>A blank folder has no app of its own, and each user is assumed to use Cloudflare. Thus the pack, the scaffold, and the UI pages become core. Repos that were installed before this release keep their flags, and <code>/wong-sync</code> honors them.</li>
      <li>Provisioning is a step of <code>/wong-setup</code>, not a second skill. The memory store already needs a Cloudflare account in each repo, so a separate door adds steps and no choice.</li>
    </ol>
  </div>
</section>

<section class="visual flow" id="tokens" data-kind="flow" data-states="after today">
  <p class="caption">Where each Cloudflare token lives: after this change, and today.</p>
  <div class="frame">
    <div class="state state-after">
      <h2>After</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-user-token">
          <h3>User token, on the host only <span class="tag">Changed</span> <i class="callout">1</i></h3>
          <p>It stays in the primary worktree's <code>.env</code>. It mints the other two tokens.</p>
          <details><summary>Details</summary><p>You create it with two permissions: <code>User ▸ API Tokens ▸ Edit</code> and <code>Account ▸ API Tokens ▸ Edit</code>. Set Account Resources to Include ▸ your account. Setup grants itself only the permission groups that each step needs. Setup reports each group that it granted. You can narrow the token back to the two permissions after setup. <code>.env.example</code>, the README, and the credentials page say this.</p></details>
        </div>
        <p class="flow-connector">↓ Mints two tokens</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="after-memory-token">
            <h3><code>&lt;repo&gt;-memory</code> <span class="tag">Kept</span></h3>
            <p>Goes to <code>.env</code> on the host.</p>
            <details><summary>Details</summary><p>Actor: setup. Action: mint the narrow memory token and write it to <code>.env</code>. Result: the memory scripts read and write the store. CI never gets this token. This change does not change it.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-deploy-token">
            <h3><code>&lt;repo&gt;-deploy</code> <span class="tag">New</span> <i class="callout">2</i></h3>
            <p>Account-owned. It can deploy and nothing more.</p>
            <details><summary>Details</summary><p>Actor: setup. Action: mint it with <code>POST /accounts/{account_id}/tokens</code>. Permissions: <code>Workers Scripts Write</code>, <code>D1 Write</code>, and <code>Account Settings Read</code>. Setup adds <code>Workers R2 Storage Write</code> only when the app's config binds a bucket. Result: a token that belongs to the account, so it outlives one person's user token. On a later run, setup reuses the token and rolls its value only when the secret is missing.</p></details>
          </div>
        </div>
        <p class="flow-connector">↓ Only the deploy token continues, through a pipe</p>
        <div class="step flow-card" data-target-id="after-secret">
          <h3><code>gh secret set CLOUDFLARE_API_TOKEN</code> <span class="tag">Changed</span> <i class="callout">3</i></h3>
          <p>The value goes straight to GitHub. No file gets it.</p>
          <details><summary>Details</summary><p>Actor: setup. Action: pipe the minted value into <code>gh secret set</code>. Result: the secret holds the deploy token. The value is never written to disk, a note, or a log. The secret keeps its name, because <code>wrangler</code> reads that name natively.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-ci">
          <h3><code>deploy.yml</code> and <code>wrangler</code> deploy <span class="tag">Kept</span></h3>
          <p>Production, staging, and the preview alias use the deploy token.</p>
          <details><summary>Details</summary><p>Actor: CI. Action: run <code>cf-deploy.sh</code> with the secret. Result: the same three deploy paths as today. A workflow that reads the secret can deploy code, but it cannot mint tokens or take over the account. Contract tests run <code>cf-deploy.sh</code> against a fake <code>wrangler</code>. One live run from the host confirms that the permission list is enough.</p></details>
        </div>
      </div>
    </div>
    <div class="state state-today">
      <h2>Today</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-user-token">
          <h3>User token, widened <span class="tag">Changed</span></h3>
          <p>It can mint tokens. It sits in the host <code>.env</code>.</p>
          <details><summary>Details</summary><p>Actor: <code>/wong-cloudflare</code>. Action: widen the token with each group it needs. Result: one token with power over the whole account.</p></details>
        </div>
        <p class="flow-connector">↓ Goes to two places</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="today-memory-token">
            <h3><code>&lt;repo&gt;-memory</code> <span class="tag">Kept</span></h3>
            <p>Minted and written to <code>.env</code> only.</p>
            <details><summary>Details</summary><p>Actor: <code>/wong-cloudflare</code>. Action: mint the narrow memory token. Result: the token stays on the host.</p></details>
          </div>
          <div class="flow-branch" data-target-id="today-copy">
            <h3>Copied to <code>CLOUDFLARE_API_TOKEN</code> <span class="tag">Removed</span></h3>
            <p>The GitHub secret is the user token itself.</p>
            <details><summary>Details</summary><p>Actor: <code>/wong-cloudflare</code>. Action: copy the user token to the secret. Result: the token that can mint tokens is in CI.</p></details>
          </div>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-risk">
          <h3>Each Actions workflow can read it <span class="tag">Removed</span></h3>
          <p>Risk: a workflow can take over the Cloudflare account.</p>
          <details><summary>Details</summary><p>Actor: any workflow in the repo. Action: read the secret. Result: it can mint a new token with any permission. Installed repos should roll their user token after they sync.</p></details>
        </div>
      </div>
    </div>
  </div>
  <div class="notes">
    <ol>
      <li>The user token starts with two permissions. Setup widens it only for each step, and it reports what it granted. Thus you can see the token's power and narrow it again.</li>
      <li>The deploy token belongs to the account, not to a person. When the person who ran setup leaves, CI still deploys. The permission list is the smallest set that deploys the Worker and migrates D1. The live smoke run confirms it.</li>
      <li>A pipe from the mint call to <code>gh secret set</code> keeps the value off the disk. The secret name does not change, so <code>deploy.yml</code> stays the same.</li>
    </ol>
  </div>
</section>

<section class="visual tree" id="layout" data-kind="tree">
  <p class="caption">Files this change adds, edits, and removes at the repo root. The same layout goes to each new install.</p>
  <div class="frame">
    <ul>
      <li class="edit">.agents/ <span class="why">the one real agent folder</span></li>
      <li class="add">.agents/config.toml <span class="why">moved from <code>.codex/config.toml</code></span></li>
      <li class="add">.agents/hooks.json <span class="why">moved from <code>.codex/hooks.json</code></span></li>
      <li>.agents/settings.json</li>
      <li class="add">.agents/skills/wong-setup/references/cloudflare.md <span class="why">new folder; the provisioning runbook</span></li>
      <li class="add">.agents/skills/wong-setup/references/failure-map.md <span class="why">moved from <code>wong-cloudflare</code></span></li>
      <li class="add">.agents/skills/wong-setup/references/permission-groups.md <span class="why">moved from <code>wong-cloudflare</code>; adds the deploy token's list</span></li>
      <li class="del">.agents/skills/wong-cloudflare/ <span class="why">skill removed; Access and teardown go to <code>wiki/stack/</code></span></li>
      <li class="edit">.agents/skills/wong-sync/references/payload-files.json <span class="why">pack, scaffold, and ui fold into core; <code>wong-cloudflare</code> removed</span></li>
      <li>.claude → .agents <span class="why">link, as today</span></li>
      <li class="edit">.codex → .agents <i class="callout">1</i> <span class="why">a real folder becomes a link</span></li>
      <li class="edit">.env.example <span class="why">the user token's two permissions and the deploy token</span></li>
      <li class="add">LICENSE <span class="why">MIT</span></li>
      <li class="edit">README.md <i class="callout">2</i> <span class="why">setup URL uses <code>.agents/skills/wong-setup/SKILL.md</code></span></li>
      <li class="add">SECURITY.md <span class="why">how to report a vulnerability; which token holds which power</span></li>
      <li class="add">scripts/tests/cf-deploy.test.mjs <span class="why">three deploy paths against a fake <code>wrangler</code></span></li>
      <li class="add">scripts/tests/downstream-contract.test.mjs <span class="why">names and paths that <code>wongstack-cloud</code> relies on</span></li>
    </ul>
  </div>
  <div class="notes">
    <ol>
      <li>A probe confirms that Codex follows the <code>.codex</code> link and loads each skill one time. Codex can find the same skills through <code>.agents/skills/</code> and through the link, so it could load each skill two times. On Windows, a clone with <code>core.symlinks=false</code> sees each link as a plain file. <code>.claude</code> has this problem today, so the change adds no new risk.</li>
      <li><code>raw.githubusercontent.com</code> serves only real files in the git tree. It does not follow a link. Thus the README names the real path under <code>.agents/</code>.</li>
    </ol>
  </div>
</section>

</div><!-- /stage -->
</div><!-- /layout -->

<div class="toast" id="toast"></div>
<textarea id="copybuf" aria-hidden="true"></textarea>

<script>
  // kit: a load-time failure shows on the page instead of a blank stage
  window.addEventListener('error', function (e) {
    var p = document.getElementById('panel');
    if (p) p.innerHTML = '<p class="error"><b>Review script error:</b> ' + String(e.message).replace(/</g, '&lt;') + ' <span class="muted">(line ' + e.lineno + ')</span></p>' + p.innerHTML;
  });

  // ── routing: #/<visual>[/<state>][/<mark>] ──
  const FILE = 'review.html';
  const CHANGE = document.title.replace(/^Review — /, '');
  const visuals = [...document.querySelectorAll('.visual')];
  const $states = document.getElementById('states');
  const $panel = document.getElementById('panel');
  let current = { id: '_landing', state: 'default', mark: null, bullet: -1 };
  let bullets = [];   // [{text, anchor, id, state, mark, ok}]

  function statesOf(v) { return (v.dataset.states || 'default').split(' '); }
  // resolve the two optional segments: a state if it names one, else a mark
  function resolve(id, a, b) {
    const v = visuals.find(x => x.id === id);
    if (!v || id[0] === '_') return null;
    const allowed = statesOf(v);
    let state, mark;
    if (a && allowed.includes(a)) { state = a; mark = b || null; }
    else if (a && b) return null;               // a is not a state, but a mark follows: bad state
    else { state = allowed[0]; mark = a || null; }
    if (mark && !v.querySelector('[data-mark="' + mark + '"]')) return null;
    return { v, state, mark };
  }
  function ownerIndex(id) { return bullets.findIndex(x => x.ok && x.id === id); }
  function show(id, a, b) {
    if ($pop) closePopover(false);
    const r = resolve(id, a, b);
    const v = r ? r.v : visuals.find(x => x.id === (id === '_text' ? '_text' : '_landing'));
    const state = r ? r.state : 'default', mark = r ? r.mark : null;
    visuals.forEach(x => x.toggleAttribute('data-active', x === v));
    v.dataset.state = state;
    v.querySelectorAll('.state').forEach(function (block) { block.toggleAttribute('data-on', block.classList.contains('state-' + state)); });
    current = { id: v.id, state, mark, bullet: r ? ownerIndex(v.id) : -1 };
    document.querySelectorAll('.marked').forEach(x => x.classList.remove('marked'));
    if (mark) v.querySelectorAll('[data-mark="' + mark + '"]').forEach(x => x.classList.add('marked'));
    renderStates(v, state);
    renderHeader();
    renderPanelState();
    renderFeedback();
    const multi = statesOf(v).length > 1;
    const want = v.id[0] === '_' ? '#/' : '#/' + v.id + (multi && (state !== statesOf(v)[0] || mark) ? '/' + state : '') + (mark ? '/' + mark : '');
    if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { location.hash = want; } }
  }
  function showText(i) {      // a bullet with no visual
    document.getElementById('textframe').innerHTML = '<p class="muted">No visual for this change. Read its full text above and leave feedback if needed.</p>';
    current = { id: '_text', state: 'default', mark: null, bullet: i };
    document.querySelectorAll('.marked').forEach(function (x) { x.classList.remove('marked'); });
    visuals.forEach(x => x.toggleAttribute('data-active', x.id === '_text'));
    renderStates(null); renderHeader(); renderPanelState(); renderFeedback();
    try { history.replaceState(null, '', '#/change/' + (i + 1)); } catch (e) { location.hash = '#/change/' + (i + 1); }
  }
  function renderStates(v, state) {
    $states.innerHTML = '';
    if (!v || statesOf(v).length < 2) return;
    const lab = document.createElement('span'); lab.textContent = 'State:'; $states.appendChild(lab);
    statesOf(v).forEach(st => {
      const b = document.createElement('button');
      b.textContent = st; b.setAttribute('aria-pressed', st === state);
      b.onclick = () => { show(v.id, st, null); requestAnimationFrame(() => window.scrollTo(0, 0)); }; $states.appendChild(b);
    });
  }
  function fromHash() {
    const seg = location.hash.split('/').slice(1);
    // no change chosen: a phone opens the list over the landing, a desktop opens the first bullet
    if (!seg[0] && bullets.length) {
      if (!phoneMedia.matches) return goBullet(0);
      show('_landing', null, null);
      return setMenu(true);
    }
    if (seg[0] === 'change' && bullets[+seg[1] - 1]) return goBullet(+seg[1] - 1);
    show(seg[0] || '_landing', seg[1] || null, seg[2] || null);
  }
  window.addEventListener('hashchange', fromHash);

  // ── proposal panel + landing ──
  function inline(md) {
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
  function renderHeader() {
    const header = document.getElementById('item-header');
    const b = bullets[current.bullet];
    header.hidden = !b;
    if (!b) return;
    document.getElementById('item-position').textContent = 'Change ' + (current.bullet + 1) + ' of ' + bullets.length;
    document.getElementById('item-title').innerHTML = inline(b.text);
  }
  function parseProposal() {
    const raw = document.getElementById('proposal').textContent.replace(/<\\\/script/gi, '</script').replace(/<!--[\s\S]*?-->/g, '');
    const sections = {}; let cur = null;
    raw.split('\n').forEach(line => {
      const h = line.match(/^## (.+)/);
      if (h) { cur = h[1].trim(); sections[cur] = []; return; }
      if (cur) sections[cur].push(line);
    });
    const why = (sections['Why'] || []).join('\n').trim().split(/\n\s*\n/).map(p => '<p>' + inline(p.replace(/\n/g, ' ')) + '</p>').join('');
    bullets = []; let tail = [];
    const items = []; let open = false;   // fold a wrapped bullet back onto one line
    (sections['What Changes'] || []).forEach(line => {
      if (/^- /.test(line)) { items.push(line); open = true; return; }
      if (open && line.trim()) { items[items.length - 1] += ' ' + line.trim(); return; }
      if (!line.trim()) open = false;
      items.push(line);
    });
    items.forEach(line => {
      const li = line.match(/^- (.+)/);
      if (!li) { if (line.trim()) tail.push(line.trim()); return; }
      const m = li[1].match(/\(?(?:review\.html)?#\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?\)?\s*$/);
      if (m) {
        const r = resolve(m[1], m[2] || null, m[3] || null);
        bullets.push({ text: li[1].slice(0, m.index).trim(), anchor: '#/' + [m[1], m[2], m[3]].filter(Boolean).join('/'), id: m[1], state: r ? r.state : null, mark: r ? r.mark : null, ok: !!r, kind: r ? r.v.dataset.kind : null });
      } else bullets.push({ text: li[1].trim(), anchor: null });
    });
    const seen = new Set();
    bullets.forEach(b => { if (!b.ok) return; if (seen.has(b.id)) b.ok = false; else seen.add(b.id); });
    return { why, tail: tail.map(t => '<p>' + inline(t) + '</p>').join('') };
  }
  function renderPanel() {
    const p = parseProposal();
    let html = '<h2>Why</h2>' + p.why + '<h2>What Changes</h2><ol class="changes">';
    bullets.forEach((b, i) => {
      const cls = !b.anchor ? 'text' : b.ok ? '' : 'dead';
      const kind = !b.anchor ? 'no visual' : b.ok ? b.kind + ' · ' + b.anchor : 'dead link · ' + b.anchor + ' — no such visual, state, or mark';
      html += '<li class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" aria-current="false">' + inline(b.text) + '<span class="kind">' + kind + '</span><span class="draft-count" hidden></span></li>';
    });
    html += '</ol>' + p.tail + '<h2>Notes <span id="notecount"></span></h2><ol class="notes-list" id="notelist"></ol><h2>Drafts <span id="draftcount"></span></h2><ol class="draft-list" id="draftlist"></ol>';
    $panel.innerHTML = html;
    document.getElementById('landing').innerHTML = bullets.length
      ? '<h1>Choose a change</h1><p class="muted">Use the change list or Next to open a visual.</p>'
      : '<h1>No changes to review</h1><p class="muted">This proposal has no What Changes entries yet.</p>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.bullet === i;
      li.classList.toggle('on', on);
      li.setAttribute('aria-current', on ? 'true' : 'false');
    });
    renderCount();
  }
  function goBullet(i) {
    const b = bullets[i]; if (!b) return;
    closePopover(); setMenu(false);
    if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.getElementById('item-title').focus({ preventScroll:true }); });
  }

  // ── annotation and browser-local feedback ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, .flow-branch, .diff .line, .diff pre, .tree li, .caption, .textstage p';
  const KEY = 'rv-notes:' + CHANGE;
  const DRAFT_KEY = 'rv-drafts:v1:' + CHANGE;
  let storageAvailable = true;
  function readStored(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { storageAvailable = false; return fallback; }
  }
  let notes = readStored(KEY, []);
  if (!Array.isArray(notes)) notes = [];
  const draftStore = readStored(DRAFT_KEY, { version:1, drafts:[] });
  let drafts = draftStore && draftStore.version === 1 && Array.isArray(draftStore.drafts) ? draftStore.drafts : [];
  function persist() {
    if (storageAvailable) {
      try {
        localStorage.setItem(KEY, JSON.stringify(notes));
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ version:1, drafts:drafts }));
      } catch (e) { storageAvailable = false; }
    }
    document.getElementById('storage-status').hidden = storageAvailable;
    renderFeedback();
  }
  const $ann = document.getElementById('annotate');
  let annotating = false, $pop = null, editor = null, editorTrigger = null;
  $ann.onclick = () => setAnnotating(!annotating);
  function setAnnotating(on) {
    annotating = on; $ann.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('annotating', on);
    closePopover(false); document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
  }
  function target(el) {
    if (el.closest('.popover, .chrome, .pin, details, a[href^="#/"]')) return null;
    const scope = el.closest('.visual[data-active]');
    if (!scope) return null;
    const t = el.closest('.flow-card, .flow-branch') || el.closest(ANNOTATABLE);
    return t && scope.contains(t) ? { scope:scope, el:t } : null;
  }
  document.addEventListener('mouseover', e => {
    if (!annotating) return;
    document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
    const t = target(e.target); if (t) t.el.classList.add('hovering');
  });
  function pathOf(scope, el) {
    const steps = [];
    for (let n = el; n && n !== scope; n = n.parentElement) steps.unshift([...n.parentElement.children].indexOf(n));
    return steps.join('.');
  }
  function elAt(scope, path) {
    if (!scope || !path) return null;
    let n = scope;
    for (const i of path.split('.')) n = n && n.children[+i];
    return n || null;
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('.pin, .callout, .kind, .why').forEach(x => x.remove());
    if (el.matches('.flow-card, .flow-branch')) c.querySelectorAll('details').forEach(x => x.remove());
    const content = el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent;
    const value = content.replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('flow-branch') ? 'branch'
      : el.classList.contains('step') ? 'step' : el.classList.contains('line') ? 'line' : el.closest('.tree') ? 'file' : el.tagName.toLowerCase();
    return kind + ' "' + value + '"';
  }
  function recordFor(el) {
    const scope = el.closest('.visual[data-active]');
    return { itemId:current.id === '_text' ? '_text:' + current.bullet : current.id,
      scope:'visual', visual:current.id, state:current.state, targetId:el.dataset.targetId || null,
      path:pathOf(scope, el), label:labelOf(el) };
  }
  function sameTarget(a, b) {
    return a.itemId === b.itemId && a.visual === b.visual && a.state === b.state &&
      (a.targetId && b.targetId ? a.targetId === b.targetId : a.path === b.path && a.label === b.label);
  }
  function findTarget(n) {
    const scope = document.getElementById(n.visual);
    if (!scope) return null;
    let el = null;
    if (n.targetId) el = [...scope.querySelectorAll('[data-target-id]')].find(x => x.dataset.targetId === n.targetId && (!x.closest('.state') || x.closest('.state').classList.contains('state-' + n.state)));
    if (!el && !n.targetId) el = elAt(scope, n.path);
    return el && labelOf(el) === n.label ? el : null;
  }
  function whereOf(n) {
    if (n.visual === '_text') return '#/change/' + (Number(String(n.itemId).split(':')[1]) + 1);
    const v = visuals.find(x => x.id === n.visual);
    return '#/' + n.visual + (v && statesOf(v).length > 1 ? '/' + n.state : '');
  }
  function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function newId() { return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8); }
  function renderFeedback() {
    document.querySelectorAll('.pin').forEach(p => p.remove());
    const list = document.getElementById('notelist'), draftList = document.getElementById('draftlist');
    if (!list || !draftList) return;
    list.innerHTML = ''; draftList.innerHTML = '';
    document.getElementById('notecount').textContent = notes.length ? '(' + notes.length + ')' : '';
    document.getElementById('draftcount').textContent = drafts.length ? '(' + drafts.length + ')' : '';
    notes.forEach((n, i) => {
      const el = findTarget(n), stale = !el;
      if (el) {
        const pin = document.createElement('button'); pin.className = 'pin'; pin.dataset.note = n.id;
        pin.setAttribute('aria-label', 'Open note ' + (i + 1)); pin.textContent = String(i + 1);
        (el.tagName === 'TR' ? el.cells[0] : el).appendChild(pin);
      }
      const li = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button';
      button.innerHTML = '<span class="where">' + escapeHtml(whereOf(n)) + ' · ' + escapeHtml(n.label) + (stale ? ' · moved target' : '') + '</span>' + escapeHtml(n.text);
      button.onclick = () => openRecord(n, false);
      li.appendChild(button); list.appendChild(li);
    });
    if (!notes.length) list.innerHTML = '<li class="empty">No saved notes yet.</li>';
    drafts.forEach(d => {
      const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
      button.textContent = whereOf(d) + ' · ' + d.label + (findTarget(d) ? '' : ' · moved target');
      button.onclick = () => openRecord(d, true);
      li.appendChild(button); draftList.appendChild(li);
    });
    if (!drafts.length) draftList.innerHTML = '<li class="empty">No drafts.</li>';
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i], itemId = b && b.ok ? b.id : '_text:' + i;
      const count = drafts.filter(d => d.itemId === itemId).length;
      const badge = li.querySelector('.draft-count'); badge.hidden = !count;
      badge.textContent = count + (count === 1 ? ' draft' : ' drafts');
    });
    document.getElementById('storage-status').hidden = storageAvailable;
  }
  function closePopover(restore) {
    if ($pop) $pop.remove();
    $pop = null; editor = null; document.body.classList.remove('editor-open');
    if (restore && editorTrigger && editorTrigger.isConnected) editorTrigger.focus();
    editorTrigger = null;
  }
  function openRecord(n, isDraft) {
    closePopover(false); setMenu(false);
    if (n.visual === '_text') goBullet(Number(String(n.itemId).split(':')[1]));
    else show(n.visual, n.state, null);
    const el = findTarget(n);
    if (el) el.scrollIntoView({ block:'center' });
    const saved = isDraft && n.savedId ? notes.find(x => x.id === n.savedId) : !isDraft ? n : null;
    openPopover(isDraft ? n : saved || n, el, saved || null);
  }
  function openPopover(record, anchorEl, saved) {
    closePopover(false);
    const original = record || recordFor(anchorEl);
    const prior = saved || (record && record.id ? record : null);
    const matching = drafts.find(d => sameTarget(d, original) && (d.savedId || null) === (prior ? prior.id : null));
    editor = { meta:{ itemId:original.itemId, scope:'visual', visual:original.visual, state:original.state,
      targetId:original.targetId || null, path:original.path, label:original.label },
      savedId:prior ? prior.id : null, draftId:matching ? matching.id : (record && record.savedId !== undefined ? record.id : null) };
    editorTrigger = anchorEl;
    const initial = matching ? matching.text : (record && record.text !== undefined ? record.text : prior ? prior.text : '');
    $pop = document.createElement('div'); $pop.className = 'popover';
    const moved = !anchorEl ? '<p class="status">Original target moved. This draft stays here until you choose a new target.</p>' : '';
    $pop.innerHTML = '<div class="where">' + escapeHtml(whereOf(original)) + ' · ' + escapeHtml(original.label) + '</div>' + moved
      + '<textarea aria-label="Note text" placeholder="What should change here?"></textarea>'
      + '<div class="row"><button class="save">Save</button><button class="close">Close</button><button class="discard">Discard draft</button>'
      + (prior ? '<button class="del">Delete saved note</button>' : '') + '</div><p class="status">Drafts are excluded from Copy notes.'
      + (storageAvailable ? '' : ' Notes and drafts last for this session only.') + '</p>';
    const ta = $pop.querySelector('textarea'); ta.value = initial;
    ta.oninput = () => {
      const text = ta.value;
      let d = drafts.find(x => x.id === editor.draftId);
      if (!text.trim() && !editor.savedId) {
        if (d) drafts = drafts.filter(x => x.id !== d.id);
        editor.draftId = null;
      } else if (d) d.text = text;
      else { d = Object.assign({ id:newId(), savedId:editor.savedId, text:text }, editor.meta); drafts.push(d); editor.draftId = d.id; }
      persist();
    };
    $pop.querySelector('.save').onclick = () => {
      const text = ta.value.trim(); if (!text) return;
      const id = editor.savedId || newId();
      const savedNote = Object.assign({ id:id, text:text }, editor.meta);
      const index = notes.findIndex(x => x.id === id);
      if (index < 0) notes.push(savedNote); else notes[index] = savedNote;
      drafts = drafts.filter(x => x.id !== editor.draftId);
      closePopover(true); persist();
    };
    $pop.querySelector('.close').onclick = () => closePopover(true);
    $pop.querySelector('.discard').onclick = () => { drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    const del = $pop.querySelector('.del');
    if (del) del.onclick = () => { notes = notes.filter(x => x.id !== editor.savedId); drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); $pop.querySelector('.save').click(); } };
    document.body.appendChild($pop); document.body.classList.add('editor-open');
    if (!phoneMedia.matches) {
      const r = anchorEl ? anchorEl.getBoundingClientRect() : document.getElementById('item-header').getBoundingClientRect();
      const W = 300, H = $pop.offsetHeight || 190;
      let top = r.top, left = r.right + 10;
      if (left + W > innerWidth) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 8; if (top + H > innerHeight) top = r.top - H - 8; }
      $pop.style.top = Math.max(50, top) + 'px'; $pop.style.left = left + 'px';
    }
    ta.focus();
  }
  let touchStart = null, touchMoved = false;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) { touchStart = { x:t.clientX, y:t.clientY }; touchMoved = false; } }, { passive:true });
  document.addEventListener('touchmove', e => { const t = e.touches[0]; if (t && touchStart && Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 8) touchMoved = true; }, { passive:true });
  document.addEventListener('click', e => {
    if (e.target.closest('.popover')) return;
    const pin = e.target.closest('.pin');
    if (pin) { e.preventDefault(); const n = notes.find(x => x.id === pin.dataset.note); if (n) openRecord(n, false); return; }
    const li = e.target.closest('.panel ol.changes li');
    if (li) { goBullet(+li.dataset.i); return; }
    const panelLink = e.target.closest('.panel a[href*="#/"]');
    if (panelLink) { e.preventDefault(); const s = panelLink.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
    const local = e.target.closest('.visual[data-active] a[href^="#/"]');
    if (local) {
      e.preventDefault(); const s = local.getAttribute('href').split('#/')[1].split('/');
      if (s[0] === current.id) { show(s[0], s[1], s[2]); requestAnimationFrame(() => window.scrollTo(0, 0)); }
      else toast('Use Changes to select another change.');
      return;
    }
    if (e.target.closest('details')) return;
    if (touchMoved) { touchMoved = false; return; }
    if (annotating) {
      const t = target(e.target);
      if (t) { e.preventDefault(); openPopover(recordFor(t.el), t.el, null); }
      return;
    }
    const localState = e.target.closest('.visual[data-active] [data-local-state]');
    if (localState) { show(current.id, localState.dataset.localState, null); return; }
    const step = e.target.closest('.visual[data-active] .flow-card, .visual[data-active] .flow-branch');
    if (step) { const detail = step.querySelector('details'); if (detail) detail.open = !detail.open; }
  });
  document.addEventListener('keydown', e => {
    const editing = e.target.matches('textarea,input,[contenteditable="true"]') || !!e.target.closest('[contenteditable="true"]');
    if (e.key === 'Escape') { if ($pop) closePopover(true); return; }
    if (editing) return;
    if (e.key === 'a') { setAnnotating(!annotating); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.panel ol.changes li')) { e.preventDefault(); goBullet(+e.target.dataset.i); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.flow-card, .flow-branch')) {
      e.preventDefault();
      if (annotating) openPopover(recordFor(e.target), e.target, null);
      else { const detail = e.target.querySelector('details'); if (detail) { detail.open = !detail.open; detail.querySelector('summary').focus(); } }
    }
  });
  document.querySelectorAll('.flow-card, .flow-branch').forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from ' + FILE + ' (' + notes.length + '):'];
    notes.forEach((n, i) => lines.push((i + 1) + '. ' + whereOf(n) + ' · ' + n.label + ' — ' + n.text));
    return lines.join('\n');
  }
  document.getElementById('copy').onclick = function () {
    if (!notes.length) return toast('No saved notes yet');
    const text = notesText(), buf = document.getElementById('copybuf'); buf.value = text;
    const done = () => toast('Copied ' + notes.length + ' saved note' + (notes.length === 1 ? '' : 's'));
    const fallback = () => { buf.select(); buf.setSelectionRange(0, 99999); document.execCommand('copy'); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  };
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

  // ── phone: the chrome's height drives the panel; the list is a sheet; step through changes ──
  function chromeHeight() { document.documentElement.style.setProperty('--chrome-h', document.querySelector('.chrome').offsetHeight + 'px'); }
  window.addEventListener('resize', chromeHeight);
  function setMenu(open) {
    document.body.classList.toggle('menu', open);
    document.getElementById('menu').setAttribute('aria-expanded', open);
  }
  document.getElementById('menu').onclick = () => setMenu(!document.body.classList.contains('menu'));
  document.getElementById('tools-toggle').onclick = function () {
    const open = document.getElementById('tools').classList.toggle('open');
    this.setAttribute('aria-expanded', open);
    chromeHeight();
  };
  function currentBullet() { const li = document.querySelector('.panel ol.changes li.on'); return li ? +li.dataset.i : -1; }
  function renderCount() {
    const i = currentBullet();
    document.getElementById('count').textContent = i < 0 ? bullets.length + ' changes' : (i + 1) + ' / ' + bullets.length;
    document.getElementById('prev').disabled = i <= 0;
    document.getElementById('next').disabled = i >= bullets.length - 1;
    const v = document.querySelector('.visual[data-active]');
    document.getElementById('viewport').style.display = v && v.classList.contains('screen') ? '' : 'none';
    chromeHeight();
  }
  document.getElementById('prev').onclick = () => { const i = currentBullet(); if (i > 0) goBullet(i - 1); };
  document.getElementById('next').onclick = () => { const i = currentBullet(); if (i < bullets.length - 1) goBullet(i + 1); };
  document.addEventListener('keydown', e => { if (e.target.matches('textarea,input,[contenteditable="true"]') || e.target.closest('[contenteditable="true"]')) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });

  // ── viewport: phone or desktop layout of a screen; a phone is a phone already ──
  const phoneMedia = matchMedia('(max-width: 760px)');
  function setViewport(vp) {
    document.body.dataset.viewport = vp;
    document.querySelectorAll('#viewport button').forEach(b => b.setAttribute('aria-pressed', b.dataset.vp === vp));
  }
  document.querySelectorAll('#viewport button').forEach(b => b.onclick = () => setViewport(b.dataset.vp));
  setViewport(phoneMedia.matches ? 'phone' : 'desktop');
  phoneMedia.addEventListener('change', e => setViewport(e.matches ? 'phone' : 'desktop'));

  renderPanel();
  fromHash();
  chromeHeight();
</script>
</body>
</html>

~~~
<!-- end review.html -->
