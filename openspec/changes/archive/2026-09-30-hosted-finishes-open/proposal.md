# Proposal

**Status:** ready-to-ship

**Branch:** sneaky-camel

**Open questions:** none

## Why

A hosted WongStack customer whose Cloudflare account has no card still gets a stopped setup: the server install halts where setup on your own computer now finishes. The hosted dashboard is ready to show "login off" and to turn the login on later, so the server install should finish the same way.

## What Changes

- **A hosted install finishes without a card.** When Cloudflare wants a card before it turns on the email login, the server install goes on: the app goes live with the login off, and the dashboard hears that it is off instead of getting a login key. Any other login problem still stops the install, and a site that already has the login never opens.
  ```text
  BEFORE
  token ──▶ install ──▶ login?
                          │ needs a card
                          ▼
                     stop, failed

  AFTER
  token ──▶ install ──▶ login?
                          │ needs a card
                          ▼
                 app live, login off
                          │
                          ▼
              dashboard: "login: off"
  ```
- **Adding the card later turns the login on.** After the card, choosing *Turn on the login* on the dashboard runs the install again. It turns the login on, sends the dashboard its login key, and leaves the settings change for your assistant to publish. It never overwrites your work.
  ```text
  card added ──▶ Turn on the login
                        │
                        ▼
          login made, key to dashboard
                        │
                        ▼
       change waits in your app folder
                        │
                        ▼
         your assistant publishes it
  ```
- **A slow early check no longer blocks it.** Before the card question, the install checks that Cloudflare accepted its permissions. On a hosted install, a login check Cloudflare still refuses after about a minute no longer stops it; the card question decides.
- **Older servers behave as today.** Only servers built from this version ask for the open finish, so an older server still stops, and the dashboard already knows how to tell them apart.

Non-goals: the dashboard side (already shipped); detecting a card through Cloudflare; changing setup on your own computer; opening a site for any reason but the missing card.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `install-onboarding`: the unattended installer, when its host asks for it, finishes open on Zero Trust onboarding instead of stopping, and a rerun on an open install turns it private, leaving the edits uncommitted.
- `server-agent`: the agent declares contract 2, asks the installer for the open finish, and the README documents contract 2's open access result.
- `managed-workspace-access`: an open install delivers an open result with no management token through the same private channel.
- `cloudflare-provisioning`: the widen may let a still-refused Access probe pass when the caller will finish open, leaving the decision to the Zero Trust step.

## Impact

`server/agent/agent.mjs` (`CONTRACT = 2`, `openWithoutLogin: true` in the installer's stdin), `server/install-wongstack.mjs` (the job's `openWithoutLogin`, the reconnect's `keepConfig` choice, the widen option), `server/access-result.mjs` (the open result), `.agents/skills/wong-setup/scripts/provision.mjs` (`widen`'s `openWithoutLogin`), `server/README.md` (contract 2, the job field, the open result), `wiki/stack/cloudflare-access.md`, `.agents/skills/wong-setup/references/cloudflare.md`, tests under `scripts/tests/` (`server-install`, `server-agent`, `server-agent-contract`, `provision`), and a CHANGELOG entry. A minor payload release, since `widen` ships in the payload. Depends on wongstack-cloud PR #52 (contract 2 accepted), already live.

## Decision log

- **2026-09-30** — Assumed: the hosted side's shape is settled by wongstack-cloud's `card-later-on-hosted` design (contract 2, the exact open-result keys, reconnect turns private and leaves the config uncommitted), because the request quoted it and PR #52 is merged.
- **2026-09-30** — Asked whether to guard the widen step's Access checks on a no-card account → chose to guard it: on the open path, an Access probe still refused after the full wait no longer stops the install.
- **2026-09-30** — Assumed: the installer finishes open only when its job carries `openWithoutLogin: true`, which the contract-2 agent adds, because the agent and the installer can come from different commits and a contract-1 agent's open result would be refused by the dashboard.
- **2026-09-30** — Assumed: a reconnect on an installed repo whose `app/wrangler.jsonc` still carries `WORKSPACE_LOGIN` runs `provision` without `keepConfig`, the same rerun `/wong-setup` uses to turn private, because that path is tested and also adds the storage bucket once R2 is on.
- **2026-09-30** — Assumed: an open result mints and revokes no token, and ignores `cleanupTokenIds`, because the open result has no cleanup field and an open install never held a management token.
- **2026-09-30** — Assumed: the widen guard applies only when the installer asks for the open finish; `/wong-setup`'s runbook keeps its widen call as is, because the request covers the server installer only. Its unverified no-card run stays an open thread.
- **2026-09-30** — Assumed: a real hosted install on a no-card account is recorded unverified until wongstack-cloud's staging walk, because no such account is at hand; fake-Cloudflare tests cover it here.
- **2026-09-30** — Assumed: gate tasks 5.1 and 5.2 complete in the ship's one checkpoint: its `/save` runs CI and records the unverified no-card thread, because `/ship` allows one checkpoint and stops before merge if CI fails.
- **2026-09-30** — Assumed: Archive checkpoint for the ship, numbered 28.8.0 from main's 28.7.0.
