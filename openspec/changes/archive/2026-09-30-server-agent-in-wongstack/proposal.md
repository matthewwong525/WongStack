# The server's helper lives in WongStack

**Status:** ready-to-ship

**Branch:** salty-kolibri

**Open questions:** none

## Why

Each wongstack.com server runs a small helper that takes wongstack.com's requests: pair a device, connect GitHub, install WongStack, copy the server. Today the helper lives in wongstack.com's own code. It is packed onto a server once and never changes, so a fork owner can't change it. Servers built before a newer helper can't connect Cloudflare, and nothing but a rebuild fixes them. Moving the helper here, beside the setup script, lets your fork decide what its servers run. A written, numbered agreement lets wongstack.com check a fork before building from it.

## What Changes

- **The helper moves into WongStack, beside the setup script.** A server built from WongStack, or from your fork, runs the helper from that same copy at the same version. Change the helper in your fork, and your next server gets your version. A running server keeps the helper it was built with; rebuilding is how it gets a newer one.
  ```text
   WongStack or your fork
   ┌──────────────────────┐
   │ server/              │
   │   setup.sh           │
   │   install-wongstack  │
   │   agent/  ◀── new    │
   └──────────┬───────────┘
              │ at build time
              ▼
   ┌──────────────────────┐
   │ your server          │
   │ helper, fixed until  │
   │ the next rebuild     │
   └──────────┬───────────┘
              │ "I follow v1,
              │  I run abc1234"
              ▼
         wongstack.com
  ```
- **The helper and wongstack.com follow a written agreement, version 1.** The server folder's guide spells out each message between them: the check-in, each request and its answer, the private Cloudflare result, and the setup report. The helper says which version it follows and which version of your repo it runs, so wongstack.com can check a fork before building from it. A fork that changes the helper keeps to the agreement, as it does for the setup script.
- **The setup script loses its size limit.** It was capped so a host could pack it into a server's small first-boot data. wongstack.com now downloads it instead, so a fork can grow its setup script freely.
- **Nothing changes for an installed repo.** The helper stays out of what installs copy, like the setup script.

**Non-goals:** a helper that updates itself on a running server; moving existing servers; wongstack.com's side (first boot, checking a fork's helper, the dashboard), which the wongstack.com plan "agent-from-source" covers; changing which version installs WongStack into your repo.

## Capabilities

### New Capabilities

- `server-agent`: the host agent in `server/agent/`, its contract version, its versioned wongstack.com API (poll, jobs, results, access-result delivery, setup report), and that it runs the source it was built from without changing itself.

### Modified Capabilities

- `install-onboarding`: "The server script keeps the host contract" drops the 12 KiB budget and its test.

## Impact

- New: `server/agent/agent.mjs` (declares `CONTRACT = 1`), `server/agent/copy.mjs`, `server/agent/management.mjs`, `server/agent/source.mjs`, moved from wongstack-cloud's `vm/`. The host copy `vm/install-wongstack.mjs` is not moved: the agent imports `run`, `jobFolder`, `repoFolder`, `CLOUDFLARE_CALL`, and `setEnv` from `server/install-wongstack.mjs`, and `cloudflare` from `.agents/skills/wong-setup/scripts/provision.mjs`.
- Tests: `scripts/tests/server-agent*.test.mjs`, moved from `vm/*.test.mjs`; `scripts/tests/.c8rc.json` gains `server/agent/*.mjs`; the size-budget test in `scripts/tests/server-setup.test.mjs` goes.
- Docs: `server/README.md` gains "The agent" section with contract 1 and loses "The size budget"; `CHANGELOG.md` gets a `## Next (minor)` entry.
- Not the payload: `server/` stays source-only, so installed repos and `/wong-sync` see nothing.
- Other repo: wongstack-cloud's plan `agent-from-source` (workspace large-lion) waits for this release, then points first boot at `/opt/wongstack/source/server/agent/agent.mjs` and drops its `vm/` copies.

## Decision log

- **2026-09-30** — Assumed: settled before this chat, the agent and its helpers move to `server/agent/` with their tests, import the installer's shared names instead of a host copy, and stay out of the payload; a fork gains no new power, since its `setup.sh` already runs as root and can read the agent token; wongstack.com still verifies everything the agent sends.
- **2026-09-30** — Assumed: no self-update, no fallback to a previous version, and no supported-versions list in the poll reply, because the user dropped self-update in a review note on the wongstack.com plan (`agent-from-source`), and the user pointed this chat at that plan.
- **2026-09-30** — Assumed: the shared names are the wongstack.com plan's: entry `server/agent/agent.mjs`, `export const CONTRACT = 1`, the source unpacked root-owned at `/opt/wongstack/source`, poll request `{ contract, commit, paseo }` with no `features`, reply `{ jobs, interval }`, because both plans must match and that plan said it follows this one's README.
- **2026-09-30** — Assumed: the agent reports `SOURCE_COMMIT` from `/etc/wongstack/agent.env` as its commit, because first boot unpacks a GitHub tarball with no `.git` to ask.
- **2026-09-30** — Assumed: wongstack.com keeps writing the systemd unit and running the setup report from its bootstrap, because its plan owns first boot; this README documents both as the host's side of contract 1.
- **2026-09-30** — Assumed: drop the 12 KiB `setup.sh` budget, because it existed only for first-boot data and wongstack.com now downloads the script.
- **2026-09-30** — Assumed: install jobs keep running the installer from a separate workspace-user clone at the job's `sourceRepo`/`sourceCommit`, as `vm/source.mjs` does today, because the wongstack.com plan keeps the installer's commit unchanged.
- **2026-09-30** — Assumed: this ships as a minor release with a changelog entry, because past `server/` changes did and wongstack.com pins a release.
- **2026-09-30** — Assumed: this does not wait for wongstack-cloud PR #47, because #47 changes only the dashboard's first message; the only order is that this ships before wongstack.com's `agent-from-source`.
- **2026-09-30** — Assumed: the README says the agent opens no inbound port except `copy-send`'s one-time listener for the job's peer, instead of a flat "never", because that job does listen; and `payload-manifest.md`'s not-copied list names the `server/` agent, because it is source-only like `setup.sh`.
- **2026-09-30** — Check: `scripts/tests/.c8rc.json` adds `server/agent/*.mjs` to coverage, because the moved agent must count toward the coverage floor; this tightens the check.
- **2026-09-30** — Check: `server/agent/agent.mjs` keeps its `c8 ignore` on the process entry point, moved unchanged from wongstack-cloud, because only systemd runs that block and the tests call `main` directly.
- **2026-09-30** — Assumed: task 4.2 sends the PR and README section before merge and the release commit right after it, because a task must be ticked before the archive and the commit exists only after merge.
- **2026-09-30** — Assumed: archived for shipping as release 28.4.0, because every task is ticked and the PR's checks passed.
- **2026-09-30** — Assumed: renumbered to release 28.5.0 after merging main, because 28.4.0 shipped first as tidy-open-threads.
