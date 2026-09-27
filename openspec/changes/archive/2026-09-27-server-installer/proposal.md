# Server installs come from WongStack

**Status:** ready-to-ship
**Branch:** fabulous-tiger
**Open questions:** none

## Why

The hosted cloud sets up WongStack on each customer's server with its own copy of the installer. That copy is stuck on WongStack 20.0.0, and it lives in the cloud's repo, so nobody who forks WongStack can change what it installs. Since then, memory moved into each app's own site, and the old installer doesn't set that up. It also repeats, by hand, the Cloudflare steps `/wong-setup` already does, so the two drift apart.

## What Changes

- **The server installer moves into WongStack.** It sits beside the server setup script. The cloud runs the copy from the WongStack version it pins, as it already does for the setup script. Fork WongStack, change the installer, and your servers install your version.
  ```text
  your WongStack (or your fork)
   ├─ server setup script
   └─ server installer ◀── new home
          │  the cloud runs both
          ▼  from one pinned version
    customer's server
          │
          ▼
    their repo: WongStack, the app,
    memory, and automatic publishing
  ```
- **A server install gets today's WongStack, memory included.** The installer puts in the same WongStack version it came from. It sets up memory the current way: memory lives in the app's own site, the person gets their admin memory key, and full transcripts are kept when Cloudflare storage is on.
- **Setup and the installer share one set of Cloudflare steps.** `/wong-setup` still asks its questions: which account, and whether to create things. It then runs the same code the server installer runs. A fix to one now fixes both.
  ```text
   /wong-setup          server installer
   (asks first)         (choices made ahead)
        │                     │
        └──────────┬──────────┘
                   ▼
        one set of Cloudflare steps
   (memory, databases, config, publishing)
  ```
- **WongStack's own checks cover the installer.** Its tests install today's WongStack into a practice repo, against a pretend Cloudflare. A new WongStack file the installer misses now fails before release, not on a customer's server.
- **One real test before it ships.** We make a throwaway server, install into a throwaway repo, check the site and memory answer, then delete everything.

Non-goals: changing the cloud itself; it moves to the new installer in its own change. The steps `/wong-sync` uses to move older repos stay as they are. How `/wong-setup` copies WongStack's files into a folder doesn't change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `install-onboarding`: the source ships an unattended server installer with a host contract beside `server/setup.sh`.
- `cloudflare-provisioning`: one provisioning script does the Cloudflare work for both `/wong-setup` and the server installer.

## Impact

- New: `server/install-wongstack.mjs`, `.agents/skills/wong-setup/scripts/provision.mjs`, and their tests under `scripts/tests/`.
- Changed: `server/README.md` (the installer's host contract), `.agents/skills/wong-setup/references/cloudflare.md` (Steps 2 and 4 call the script), `scripts/tests/.c8rc.json` and `.github/workflows/payload.yml` (lint and coverage reach `server/`), `CHANGELOG.md`.
- Source-only: `server/` and `wong-setup` never reach an installed repo, so `/wong-sync` brings nothing new to targets.
- Downstream: wongstack-cloud drops `vm/install-wongstack.mjs` and runs `server/install-wongstack.mjs` from its pinned commit, in a separate change.

## Decision log

- **2026-09-27** — Asked where the installer should live → chose WongStack, as a pull request here, so a fork owns its server template (settled before this plan).
- **2026-09-27** — Asked where the real server test runs → chose a fresh throwaway server with a throwaway repo, deleted afterward.
- **2026-09-27** — Asked whether `/wong-setup` should use the installer's Cloudflare code → chose yes, share one provisioning script.
- **2026-09-27** — Assumed: the installer installs the WongStack checkout it runs from, its `VERSION` and commit, not a version written in the code, because the cloud already pins a source commit per server, and a fork's installer must install the fork. The request named 26.1.0; `main` is now 26.5.0, so the first release to carry the installer is what it installs.
- **2026-09-27** — Assumed: the host clones the source at its pinned commit into `~/.cache/wong-stack/WongStack` and runs the installer from there, not from a lone file in first-boot data, because the installer now imports the shared provisioning script and reads the payload from that clone. This also drops the first-boot size budget for the installer.
- **2026-09-27** — Assumed: the job on stdin and the last-line reason codes (`done`, `token`, `repo`, `cloudflare`, `push`) stay as they are in wongstack-cloud, because the cloud's agent and dashboard already read them.
- **2026-09-27** — Assumed: the admin memory key goes to the git email of the workspace user, because the cloud sets it from GitHub when the person connects, and setup's runbook uses `git config user.email` too.
- **2026-09-27** — Assumed: the widen always adds `Workers R2 Storage Write`, because the token can't tell whether R2 is on without it, and `.env.example` already lists R2 among provisioning's groups. The real server test confirms both R2 on and off.
- **2026-09-27** — Assumed: the app config is built from the `wrangler.jsonc` fragment in `stack-pack-fragments.md`, and the target's `.env.example` is the source's own, not text written into the code, because the old installer's copies had drifted (it still named a memory Cloudflare token).
- **2026-09-27** — Assumed: a minor release, like `server/setup.sh` in 20.2.0, because it adds a source-only feature and changes setup's runbook.
- **2026-09-27** — Check: `.github/workflows/payload.yml` now lints `server/`, and `scripts/tests/.c8rc.json` counts `server/*.mjs` toward coverage. Both reach new code; no check is loosened.
- **2026-09-27** — Built tasks 1.1–3.3 in a helper: `provision.mjs`, `server/install-wongstack.mjs`, their tests with a pretend Cloudflare, the README contract, the runbook calling the script, and the changelog entry. The full script suite passed locally (434 pass, 11 skipped); oxlint and c8 run only in CI. The "R2 is off" code `10042` is assumed until the real server test confirms it. Saved for task 2.3 (coverage and lint in CI); tasks 4.1–4.2 wait for a green run and the person's OK.
- **2026-09-27** — Real server test passed on a throwaway Hetzner CX23 (fsn1, Ubuntu 24.04), from this branch at `e492af8`. `server/setup.sh` exited 0. The installer printed `done` in 16 s, pushed `feat: install WongStack 26.5.0` to a throwaway private repo, and recorded the memory Worker and bucket. The repo's first Deploy and Test runs passed, the site and `/apps/hello/api/greeting` answered 200, and `memory.mjs digest` read through the Worker with the admin key. A rerun printed `done` with the same commit, a clean tree, the same `.env`, and untouched secrets. No token appeared in the pushed commit or the output.
- **2026-09-27** — Assumed: the "R2 is off" code `10042` stays unconfirmed, because the test account has R2 on and nobody can turn it off by token; the thread stays open in memory.
- **2026-09-27** — Cleanup removed the Hetzner server and SSH key, the Worker `wongstack-install-test` (no staging Worker was ever deployed), the three D1 databases, the memory bucket, and the `wongstack-install-test-deploy` token. The GitHub repo `matthewwong525/wongstack-install-test` still exists: deleting it needs the `delete_repo` scope.
- **2026-09-27** — Deleted the throwaway GitHub repo `matthewwong525/wongstack-install-test` after the person granted `gh` the `delete_repo` scope. Nothing from the test is left standing.
- **2026-09-27** — Distilled: the real-server test steps went into `server/README.md` as *Test a change on a real server*, the page that owns both scripts. No wiki page changed.
- **2026-09-27** — Archive checkpoint for 26.8.0: merged `main` twice (26.6.0 and 26.7.0). The installer builds the wrangler config from the fragment, so it picks up 26.6.0's `disallow_importable_env` flag unchanged. The new tests' temp folders now start with `wong-test-`, the 26.7.0 convention. The full script suite passed locally again (464 pass, 11 skipped).
