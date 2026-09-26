# Server setup script

**Status:** ready-to-ship
**Branch:** server-setup-script
**Open questions:** none

## Why

A person who wants their agents on an always-on server has no WongStack way to make one. Today the only server build lives inside one hosted service, so a fork cannot change which tools its servers get, and a person who hosts their own server has nothing to run. The build belongs in WongStack: a fork owns its server template, and any host, a hosted service included, only runs it.

## What Changes

- **`server/setup.sh` turns a fresh Ubuntu 24.04 server into a WongStack workspace.** It runs as root, asks nothing, and is safe to run again. It makes the workspace user (`WORKSPACE_USER`, default `wong`). It installs Node.js 24, `git`, `gh`, OpenSpec, Paseo, Claude Code, Codex, OpenCode, and agent-browser with its Chrome. Then it starts Paseo as a service for that user. It checks its own result last and exits non-zero with the name of what is missing. (review.html#/setup)
- **`server/README.md` is the contract a host relies on.** It gives the command, the one input, what exists after a zero exit, what the script never does (open a port, hold a secret, or touch a host's own files), and the size budget. A fork edits the script and keeps the contract, and its servers change with it.
- **A size budget keeps the script small enough to embed.** Hetzner, for one, limits first-boot data to 32 KiB, so a host that embeds the script needs it small. A test holds the script to 12 KiB and checks its shell syntax and the contract's tool list.
- **Required tools say where Paseo comes from.** The [required-tools page](../../../wiki/development/required-tools.md) keeps "WongStack never installs Paseo" for your own machine, and names the server script as the one place that installs it: a server you give to agents.
- **Release 20.2.0** with a changelog entry.

**Non-goals:** No change to setup on your own machine, and no installer for macOS or another Linux. The script is not in the payload: an installed repo does not get it, because a server template belongs to the source you fork. No cloud-specific agent, token, or firewall: a host adds its own.

## Capabilities

### New Capabilities

- `server-setup`: The server setup script, its inputs, its end state, and the host contract.

### Modified Capabilities

- `toolchain-dependencies`: The required-tools page names the server script as the one place WongStack installs Paseo.

## Impact

- **New:** `server/setup.sh`, `server/README.md`, and `scripts/tests/server-setup.test.mjs`.
- **Edited:** `wiki/development/required-tools.md`, `.agents/skills/wong-sync/references/payload-manifest.md` (the "Not copied" list), `README.md` (the layout table), `VERSION`, and `CHANGELOG.md`.
- **Hosts:** a hosted service stops keeping its own copy of the build and runs this script from a pinned commit of WongStack or a fork.

## Decision log

- **2026-09-26** — Asked how far the change goes → chose **move the script and let a person choose their fork**. This change is the WongStack half; the host's source choice ships in the host's own repo.
- **2026-09-26** — Asked how a host gets the script → chose **the host pins a commit and embeds the script**. So the script has a size budget and needs no network fetch of itself.
- **2026-09-26** — Asked who installs Paseo → chose **the script**. A fork that removes Paseo breaks chat on a host that needs it; the contract says so.
- **2026-09-26** — Asked the order of the two pull requests → chose **WongStack first**.
- **2026-09-26** — Assumed: the path is `server/setup.sh`, a top-level folder, so a host has one stable path to fetch and a person finds it next to its README.
- **2026-09-26** — Assumed: the script is source-only, not payload, like `wong-setup`. A server template is a property of the source you fork, and an installed repo has no use for it.
- **2026-09-26** — Assumed: the budget is 12 KiB. With the base64 cost (4/3) that leaves room in a 32 KiB first-boot limit for a host's own agent and config.
- **2026-09-26** — Assumed: the one input is `WORKSPACE_USER`, default `wong`. Everything else is fixed in the script, and a fork changes it by editing the script.
- **2026-09-26** — Landed the script, its README contract, the size test, the required-tools line, the "Not copied" entry, the layout row, and 20.2.0. The script ports the hosted service's cloud-init build step for step, with the user as an input and the self-check added. It has not run end to end yet; the hosted service's first staging build after this merge is that run.
- **2026-09-26** — CI passed on PR #122 (`47bf7c1`): test, payload, and build. Distilled facts before the archive: no reusable fact. Archived with `--skip-specs`, because `/save` already synced the deltas into `openspec/specs/`. After the merge, `/ship` tags `v20.2.0` and publishes the release per the release ritual.
