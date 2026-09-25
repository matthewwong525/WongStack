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
