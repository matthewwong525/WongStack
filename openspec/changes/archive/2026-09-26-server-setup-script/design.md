## Context

A hosted service builds each workspace server from a cloud-init file in its own repo. That file mixes two jobs: the service's own control channel (its agent, token, and firewall) and the workspace itself (the user, the tools, and Paseo). Only the second job is WongStack's. This change moves it into the source as a plain script with a written contract.

## Goals / Non-Goals

**Goals:** one script, runnable by hand on any Ubuntu 24.04 server or embedded by a host; a contract a host can rely on without reading the script; a fork changes its servers by editing one file.

**Non-Goals:** macOS or other Linux distributions; a host's agent, token, firewall, or health reporting; putting the script into installed repos.

## Decisions

- **A shell script, not cloud-init YAML.** A host's first-boot format differs by provider, and a person on a plain VPS has no cloud-init to hand. Bash on Ubuntu runs everywhere the contract applies. The host wraps it in its own format.
- **`set -euo pipefail`, then a final check.** The strict mode stops at the first failed command. The final check catches the other failure: a fork that drops an install and still exits 0. The check prints `missing: <name>` so a host can show it.
- **Everything the old cloud-init installed, in the same order.** Node.js 24 from NodeSource, `gh` from GitHub's apt repository, the npm globals (`@fission-ai/openspec`, `@getpaseo/cli`, `@openai/codex`, `opencode-ai`, `agent-browser`), Claude Code with its own installer as the workspace user, then agent-browser's Chrome. Root installs Chrome's system libraries with `agent-browser install --with-deps`, removes root's own browser copy, and the workspace user gets the browser in its own home.
- **The AppArmor profile goes with the browser.** Ubuntu 24.04 blocks the user namespaces that Chrome's sandbox needs. The profile lets only agent-browser's Chrome use them, so the sandbox stays on. Its path uses the workspace user's home.
- **Paseo runs as a systemd service for the workspace user**, on `127.0.0.1:6767`, with `Restart=always`. A host that pairs devices calls `paseo daemon pair` as that user.
- **Safe to run again.** User creation, apt sources, and the service unit are written so a second run replaces them with the same content; `systemctl enable --now` on a running unit is a no-op. No step deletes the user's home or Paseo's data.
- **12 KiB budget, tested.** `scripts/tests/server-setup.test.mjs` checks the size, runs `bash -n`, and checks that the final check names each tool the contract promises. It runs in the existing Payload checks job, so no new CI job.
- **Source-only.** The payload manifest lists `server/` under "Not copied", like `wong-setup`. A fork is the template; an installed repo is a project.

## Risks / Trade-offs

- **An upstream installer changes** (NodeSource, Claude Code, agent-browser) → the script fails at build time with a non-zero exit, which a host sees at once. The same risk existed in the old cloud-init.
- **A fork breaks the contract** → the final check fails the build and names the gap; a host can offer its default source instead.
- **No test runs the script end to end in CI** → a full run needs a fresh server and several minutes. The hosted service's first build after the merge is the end-to-end check, and its staging walk records it.
