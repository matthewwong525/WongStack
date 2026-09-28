# Design

## Context

26.21.0 added `hand-over.mjs`, which starts a Cloudflare quick tunnel per link and exits 3 with `HANDOVER_NEEDS=cloudflared` when the tool is missing; the agent then asks and installs it. `/verify` installs `agent-browser` the same way at its first browser journey. `/wong-setup`'s [get the computer ready](../../../.agents/skills/wong-setup/references/tools.md) checks `git`, `gh`, Node.js, and OpenSpec, asks once, and stops on any decline or failure.

`server/setup.sh` builds agent servers with no prompt and already installs `agent-browser` and its Chrome. wongstack-cloud builds every new server from it: `app/worker/source.ts` fetches `server/setup.sh` at the source's default-branch head and embeds it in first-boot data (budget 12 KiB; the script is about 3.3 KiB). Both wongstack-cloud plans are 4 GB servers behind a Hetzner firewall with no rules, which drops inbound traffic only.

## Goals / Non-Goals

**Goals:**
- A computer readied by setup, and every server `setup.sh` builds, has `agent-browser` with Chrome and `cloudflared`.
- One install question in setup, as today.
- The server script's final check and `server/README.md`'s end state can't drift apart unnoticed.

**Non-Goals:**
- A `cloudflared` service, a named tunnel, or a Cloudflare login.
- Installing either tool during `/wong-sync`.
- Any change to `hand-over.mjs`, `/verify`, or wongstack-cloud.

## Decisions

- **Helpers are a step after the four tools in `tools.md`.** After `git`, `gh`, Node.js, and OpenSpec pass, check `command -v agent-browser` and `command -v cloudflared`. The one ask names every missing tool, the helpers included, in plain words: *a browser for me to use* and *a tool that sends you a private link to it*. One yes covers all.
- **Helper routes.**
  - `agent-browser`: `npm install -g agent-browser` (add `--prefix ~/.local` when a global install needs `sudo`), then `agent-browser install` for its Chrome. On Linux, `agent-browser install --with-deps` only when `sudo -n true` succeeds.
  - `cloudflared`: the routes [required tools](../../../wiki/development/required-tools.md) already owns (Homebrew, `winget`, or Linux's package repository with passwordless `sudo`, else the release binary in `~/.local/bin`). `tools.md` links there; it does not copy the commands.
- **A helper failure is not a stop.** A failed helper install prints one plain line naming the tool and what it's for, then setup continues; `hand-over.mjs` and `/verify` still install at first need. `failure-map.md` gets a row for it. A *no* to the ask still stops setup, as today, since the core tools are in the same question.
- **Server: Cloudflare's apt repository, as root.** A step after *GitHub CLI*, in the same shape:

  ```bash
  step "Cloudflare Tunnel"
  curl -fsSL -o /etc/apt/keyrings/cloudflare-main.gpg https://pkg.cloudflare.com/cloudflare-main.gpg
  chmod go+r /etc/apt/keyrings/cloudflare-main.gpg
  echo "deb [signed-by=/etc/apt/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" >/etc/apt/sources.list.d/cloudflared.list
  apt-get update
  apt-get install -y cloudflared
  ```

  It lands in `/usr/local/bin`, on the workspace user's path, and updates with `apt`. `hand-over.mjs` passes `--no-autoupdate`, so the apt copy is never replaced underneath it. The script runs no `cloudflared service install`.
- **The server check lists it.** `for tool in … agent-browser cloudflared`, so a failed install exits non-zero with `missing: cloudflared`.
- **A test ties check to contract.** `server-setup.test.mjs` reads the tool words after `for tool in` in `setup.sh` and the backticked names in *The end state*'s first bullet of `server/README.md`, and asserts the two sets are equal.
- **wongstack-cloud gets it with no change.** The next server it builds after merge fetches the new script. Servers built earlier fall back to the consent install.

## Risks / Trade-offs

- **Setup downloads more** → Chrome is about 150 MB; a slow connection makes setup's tool step longer, once. The ask says so.
- **Chrome's system libraries missing on Linux without passwordless `sudo`** → the first browser use fails with the library error; `/verify` already owns that fix.
- **pkg.cloudflare.com down during a server build** → `set -e` stops the script like any other failed download, and a rerun finishes it.
- **An apt upgrade changes `cloudflared`'s log shape** → `hand-over.mjs` parses the quick-tunnel line; its tests pin that shape, and the real-server run in the tasks checks the current one.
