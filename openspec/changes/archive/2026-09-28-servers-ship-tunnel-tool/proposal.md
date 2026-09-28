# Setup installs the agent's browser and tunnel tool up front

**Status:** ready-to-ship
**Branch:** cloudflared-agent-browser
**Open questions:** none

## Why

Since 26.21.0, the agent can send you a private link to take over its browser, and that link needs Cloudflare's free tunnel tool. Today neither the agent's browser nor the tunnel tool comes with setup. Each waits until the first time it's needed, then stops to ask for an install. Setup already asks once, up front, for Git, GitHub's app, Node.js, and OpenSpec, so these two should be in that same question. On a server you give to agents, nobody is there to answer at all, and new wongstack-cloud servers are built by that same server setup.

## What Changes

- **Setup asks once for everything.** The one install question now also covers the agent's browser and the tunnel tool. After you say yes, nothing stops later to ask.
  ```text
  setup: "I need a few free tools:
   Git, GitHub's app, Node.js,
   OpenSpec, a browser for me,
   and a tool that sends you
   links to it. Install them?"
      │  yes
      ▼
  all six installed
      │
      ▼
  later: "Gmail wants a login:"
      │  private link, no wait
      ▼
  you log in from your phone
  ```
- **A failed browser or tunnel install doesn't stop setup.** Your assistant works without them. Setup tells you which one didn't install, carries on, and the agent asks again the first time it needs it.
- **A new agent server has both ready.** The server setup already installs the browser; now it installs the tunnel tool too, with no question.
- **wongstack-cloud picks it up on its own.** It builds each new server from WongStack's latest server setup, so every server it makes after this ships has the tool. Nothing changes in wongstack-cloud itself.
- **Computers and servers set up before this still work.** Their first hand-over asks and installs the tool, as it does today.
- **It costs no memory while idle.** The tunnel tool runs only while a link is open, at most 10 minutes, using roughly 30–50 MB. It is not a background service. The browser also runs only while the agent uses it.

Non-goals: no always-on tunnel, no tunnel service, no change to how the link works, no install for existing repos during an update, and no code change in wongstack-cloud.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `install-onboarding`: setup's one install question also covers `agent-browser` with its Chrome and `cloudflared`, and a failure of either doesn't stop setup; the server script's promised tools include `cloudflared`.
- `dependencies`: `agent-browser` and `cloudflared` arrive with setup or the server script, and otherwise install with consent at first need.

## Impact

- `.agents/skills/wong-setup/references/tools.md`: a *helpers* step after the four tools: `agent-browser` plus `agent-browser install`, and `cloudflared` by the routes in `required-tools.md`, covered by the same one yes; a failed helper is reported and skipped.
- `.agents/skills/wong-setup/references/failure-map.md`: a row for a helper that fails to install.
- `server/setup.sh`: a *Cloudflare Tunnel* step adds Cloudflare's apt repository and installs `cloudflared`; the final check lists it.
- `server/README.md`: *The end state* names `cloudflared`.
- `scripts/tests/server-setup.test.mjs`: the check's tool list equals the tools *The end state* names.
- `wiki/development/required-tools.md`: both rows and *Setup is the one skill that checks ahead* say setup installs them ahead.
- `wiki/stack/getting-started.md`: the list of tools setup may install names the browser and the tunnel tool.
- `CHANGELOG.md`: a `## Next (minor)` entry.
- wongstack-cloud: no change. `app/worker/source.ts` fetches `server/setup.sh` at the source's default-branch head for each new server, and its no-rule Hetzner firewall blocks only inbound traffic, so the tunnel's outbound connection works.

## Decision log

- **2026-09-28** — Asked how this chat should help, given the *Password tunnel for agent browser* chat already added `cloudflared` → chose to leave the hand-over itself to that chat, which shipped it as 26.21.0.
- **2026-09-28** — Asked whether the docs should state 4 GB as the minimum machine size → chose no; the numbers stayed in chat.
- **2026-09-28** — Assumed: the server setup installs `cloudflared` without asking, because it asks nothing by contract and a server given to agents needs a tunnel for every hand-over.
- **2026-09-28** — Assumed: the server installs `cloudflared` from Cloudflare's apt repository, the way the script installs `gh`, because it matches the server's architecture and updates with the system.
- **2026-09-28** — Assumed: no systemd service and no tunnel login, because `hand-over.mjs` starts a quick tunnel per link and stops it after, so the tool uses no memory between hand-overs.
- **2026-09-28** — Assumed: wongstack-cloud needs no change, because `resolveSource` reads the source's default-branch head for each new server; servers built earlier keep the consent install.
- **2026-09-28** — Assumed: a test ties the script's final check to the README's end-state list, because a tool added to one and not the other breaks the host contract silently.
- **2026-09-28** — Asked on the review page what Change #5 ("Your own computer is unchanged…") meant → explained that setup on your own computer did not install the tunnel tool ahead.
- **2026-09-28** — Asked whether setup on your own computer should install the tunnel tool up front, like Node.js and OpenSpec → chose yes; it joins setup's one install question, and the Change #5 bullet is gone.
- **2026-09-28** — Asked whether setup should install the agent's browser up front too → chose yes, in the same question.
- **2026-09-28** — Assumed: a failed browser or tunnel install reports and continues rather than stopping setup, because no setup step or core verb needs either, and the first-need install still catches it.
- **2026-09-28** — Assumed: on Linux without passwordless `sudo`, setup runs `agent-browser install` without `--with-deps`, because an agent can't type a password; a missing Chrome library then surfaces at first browser use.
- **2026-09-28** — Assumed: `/wong-sync` installs neither tool in existing repos, because a sync changes the repo, not the machine, and the first-need install covers them.
- **2026-09-28** — Assumed: a minor release, because setup now does more for every new install.
- **2026-09-28** — Asked whether to test the server setup on a real server → chose yes. A fresh CX23 in hel1 ran this branch's `setup.sh` to `workspace ready for wong` (exit 0); `cloudflared` 2026.9.3 landed at `/usr/local/bin/cloudflared` with no process and no service afterward. A quick tunnel from the workspace user registered in under 15 seconds at 39 MB, then stopped. The server and its SSH key were deleted.
- **2026-09-28** — Assumed: `required-tools.md` gets an *Installing cloudflared* heading holding the install commands, because `tools.md` links to them and the commands stay on one page.
- **2026-09-28** — Assumed: `server/README.md`'s end state says `cloudflared` runs only while a link is open, never as a service, because the host contract should promise what the design rules out.
- **2026-09-28** — Distilled: no repeatable fact; the change and session wrote no live facts, and the measured sizes stay in this log.
- **2026-09-28** — Archive checkpoint: tasks complete, specs synced into `install-onboarding` and `dependencies`, released as 26.23.0; two open threads recorded for the first real setup and the first new wongstack-cloud server.
