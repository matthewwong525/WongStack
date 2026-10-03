# Preserve an existing workspace server

**Status:** in-progress

**Branch:** preserve-existing-workspace

**Open questions:** none; host enables this only after a reviewed compatible release.

## Why

Existing server setup overwrites shared tools and the Paseo service, while the server agent assumes a new dedicated account. Hosts need a safe way to prepare an existing server and a private project without replacing files, services, configuration or login identities.

## What Changes

- **Keep the existing server setup.** Add an explicit preservation mode that checks compatibility, reuses suitable tools and the chosen workspace account, installs only missing tools, and refuses conflicts before overwriting anything.
  ```text
  existing server ──▶ check ──▶ fill missing tools
                        │
                        ▼
                 keep files + services
  ```
- **Prepare an existing private project safely.** Clone or reuse the matching repo, keep its local work and configuration, install declared dependencies as the workspace user, and report what still needs configuration before calling it ready.
- **Publish the host contract.** The agent supports an explicitly configured workspace account and a bounded project-readiness report, with no self-update, privileged project scripts, private command output or AI credential reads.

**Non-goals:** cloud dashboard or enrollment implementation, automatically changing an occupied service, app publication, moving repos away from GitHub, arbitrary distro support, or altering the fresh-server setup defaults.

## Capabilities

### New Capabilities

- `preserved-server-setup`: canonical tool preservation and private existing-project preparation.

### Modified Capabilities

- `server-agent`: contract 4, configured workspace user/home, preservation-aware GitHub and project readiness jobs.

## Impact

`server/setup.sh`, canonical preservation/project helpers and `server/agent/`; source-only manifest `server/preservation.json`; `server/README.md`; corresponding payload script tests and a release note. No server tooling is added to installed payload repos.

## Decision log

- **2026-10-03** — Asked to ship the cloud plan's canonical installer prerequisite → the user authorized the complete private-repo and preservation change with `/ship`.
- **2026-10-03** — Assumed: implement this prerequisite in a separate source worktree, because the hosted repo cannot duplicate or release canonical agent/tool code.
- **2026-10-03** — Assumed: reserve contract 4 for preservation/project preparation, because the still-open Artifacts change reserves contract 3. Hosts must negotiate specific capabilities rather than infer that 4 implements Artifacts.
- **2026-10-03** — Assumed: support Ubuntu 24.04 x86-64/Arm first and keep source-only tooling out of the install payload, matching the accepted host plan.

- **2026-10-03** — Host integration requires mutation-free `--preserve --preflight`; an absent nonroot account is permitted only with a safe unoccupied home and compatible service/port. Existing accounts retain their identity.
- **2026-10-03** — Readiness uses an explicit repository or locally reviewed `.wongstack/project.json` version-1 profile of required setting names. Example keys remain optional; unknown configuration stays pending.
- **2026-10-03** — Check: `server/project-github.mjs` excludes only the process stdin/stdout entry adapter from coverage; the exported operation and fixed agent wrapper are exercised directly.
- **2026-10-03** — Check: `server/prepare-project.mjs` excludes only the process stdin/stdout entry adapter from coverage; the exported operation and fixed agent wrapper are exercised directly.

- **2026-10-03** — Integration uses project generation 0 for fresh/rebuilt servers and positive generations for attachment; project reports accept nonnegative generation and still require an exact authenticated job-bound receipt. A different stored GitHub identity refuses before clone rather than replacing or temporarily borrowing it.

- **2026-10-03** — Checkpoint: preservation and project operations passed 109 focused tests, Bash syntax and source payload checks. Remote release checks remain pending; attachment stays disabled until a gated source revision is available. Session fact capture was unavailable because this checkout has no registered session.
