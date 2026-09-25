# Prepare WongStack for an open-source release

**Status:** in-progress
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
