# Windows setup handles the assistant's folder links

**Status:** ready-to-ship
**Branch:** wong-setup-windows-symlinks
**Open questions:** none

## Why

On Windows, the assistant can miss its setup instructions when folder links are disabled. Setup should ready those links itself, with only Windows' own approval prompt when administrator access is needed.

## What Changes

- Setup readies Windows folder links before downloading the source. The assistant runs the commands, turns on the needed Windows setting when links fail, and tests both folder and file links. The person only approves Windows' permission prompt when it appears.
  ```text
  Paste setup message
           │
           ▼
  Assistant readies Windows
           │
           ▼
  Setting needed? ──▶ Windows approval
           │               │
           └───────┬───────┘
                   ▼
           Test links, then install
  ```
- The starting message includes the setup guide's address, so it works before Claude can find the setup command. The getting-started guide names the Windows approval when needed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `install-onboarding`: Windows links are readied as part of setup, and the copied starting message includes its guide.

## Impact

Setup's tools reference, README, required-tools and getting-started guides, and the changelog. No app change. Branch: `wong-setup-windows-symlinks`.

Non-goals: repair existing source clones, change other operating systems, or bypass Windows administrator approval or workplace policy.

## Decision log

- **2026-10-02** — Asked whether setup should handle Windows symlinks → chose to do it as part of setup, assuming a nontechnical person.
- **2026-10-02** — Asked why the assistant cannot turn the setting on itself → chose automatic enablement first, with Windows approval where required and manual guidance only as a fallback.
- **2026-10-02** — Assumed: continue this focused change here, because the person said to just do it; the other workspace, One setup works everywhere, has broader overlapping setup work.
- **2026-10-02** — Assumed: update the existing agent instructions rather than add an installer, because personal setup already runs through an assistant and only needs a reliable prerequisite check.
- **2026-10-02** — Archive checkpoint: completed Windows setup instructions and starting message, reconciled the installation spec, and numbered release 29.9.0. Checks passed; native Windows approval remains untested on this Linux host.
