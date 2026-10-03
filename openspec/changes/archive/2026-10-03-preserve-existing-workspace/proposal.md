# Preserve an existing workspace server

**Status:** ready-to-ship

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

- **2026-10-03** — Preserved project readiness includes the same fixed Claude/Codex sign-in workspaces and terminals as fresh setup. Retry looks up workspace/terminal metadata, keeps existing terminals untouched, and records newly created terminals before delivering their fixed sign-in command; no terminal contents or AI credentials are read.
- **2026-10-03** — Updater fixtures now name every pin explicitly, including preservation setup, so the fresh and preserved OpenSpec checks continue updating together without positional fixture assumptions.

- **2026-10-03** — Project preparation checks an owned, regular, tracked `.nvmrc` when present and requires its supported Node major (22 or 24) to match the effective workspace runtime before npm ci. Dirty declarations refuse; runtime declarations participate in the retry fingerprint. A mismatch requests input without replacing global Node.

- **2026-10-03** — Required gate passed at `b371bac`: remote test, deploy and payload checks all succeeded, including full script coverage and release checks. Archive checkpoint records the finished source prerequisite before numbering its release.

- **2026-10-03** — Archive checkpoint: release 29.11.0 is numbered from main 29.10.0. The exact archived revision must pass the required gate before merge; the source has no hosted browser preview and its integrated terminal walk belongs to the cloud change.

- **2026-10-03** — Pre-merge safety correction: the root agent uses `/usr/local/lib/wongstack-agent-runtime/bin/node`, validated/installed independently of writable workspace tools. Root commands use only the system PATH. Official fallback staging is guarded and tar does not restore build-user ownership. Preservation preflight remains mutation-free and supports missing workspace/system Node.
- **2026-10-03** — Preserved hosts set `WORKSPACE_MODE=preserve`; authenticated poll 401 now exits normally without shared Paseo changes, and `Restart=on-failure` leaves a revoked agent stopped. Other failures and fresh mode retain polling retries.
- **2026-10-03** — Check: `server/agent/agent.mjs` extends its existing process-entry-only coverage exclusion from 9 to 11 lines to include fixed root PATH and normal process exit; exported main/poll behavior is tested directly. No coverage threshold changed.
- **2026-10-03** — Runtime/revocation correction passed 57 focused fixtures including download fallback and archive ownership refusal. The former gated source revision remains recorded above, but task 3.2 is pending again until the corrected exact source revision passes the full remote gate.
