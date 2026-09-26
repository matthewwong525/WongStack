## Purpose

A script in the WongStack source that turns a fresh Ubuntu 24.04 server into a workspace for agents, and the contract that lets any host run it from WongStack or a fork.

## ADDED Requirements

### Requirement: The script builds a workspace from a fresh server

The source SHALL contain `server/setup.sh`. Run as root on a fresh Ubuntu 24.04 server, with no prompt, it SHALL create the workspace user named by `WORKSPACE_USER` (default `wong`) when that user does not exist. It SHALL install Node.js 24, `git`, `curl`, `gh`, OpenSpec, Paseo, Claude Code, Codex, OpenCode, and agent-browser with its Chrome, and SHALL run Paseo as a service for the workspace user.

#### Scenario: A fresh server becomes a workspace
- **WHEN** a person runs `sudo bash server/setup.sh` on a fresh Ubuntu 24.04 server
- **THEN** the script exits 0
- **AND** `node`, `git`, `gh`, `openspec`, `paseo`, `claude`, `codex`, `opencode`, and `agent-browser` are on the workspace user's path
- **AND** the `paseo` service runs as the workspace user

#### Scenario: A host names its own user
- **WHEN** a host runs the script with `WORKSPACE_USER=dev`
- **THEN** the tools, the browser, and the Paseo service belong to the user `dev`

### Requirement: The script is safe to run again

A second run on a server the script already built SHALL exit 0 and SHALL leave the workspace user's files and Paseo's data in place.

#### Scenario: A second run
- **WHEN** the script runs again on a built server
- **THEN** it exits 0
- **AND** the workspace user's home keeps its files

### Requirement: The script checks its own result

The script SHALL end by checking that each promised tool is on the workspace user's path and that the Paseo service is active. When a check fails, it SHALL exit non-zero and print the name of what is missing. Any failed command earlier SHALL also stop the script with a non-zero exit.

#### Scenario: A tool is missing at the end
- **WHEN** a fork removes the Paseo install but keeps the check
- **THEN** the script exits non-zero
- **AND** its last output names `paseo`

### Requirement: The script stays inside the host contract

The script SHALL NOT open an inbound port, read or write a host's secret, or write under `/etc/wongstack` or `/opt/wongstack`, which belong to a host. `server/README.md` SHALL state the command, the one input, the end state, these limits, and the size budget, so that a host can run WongStack's script or a fork's without reading it.

#### Scenario: A host reads the contract
- **WHEN** a host author reads `server/README.md`
- **THEN** it names the command, `WORKSPACE_USER`, every tool the script promises, the Paseo service, the paths the script never touches, and the size budget

### Requirement: The script fits a first-boot budget

`server/setup.sh` SHALL be at most 12 KiB, so a host can embed it in first-boot data with a 32 KiB limit. A test SHALL fail when the script is over the budget, has a shell syntax error, or no longer checks a tool the contract promises.

#### Scenario: The script grows too large
- **WHEN** a change makes `server/setup.sh` larger than 12 KiB
- **THEN** the source's tests fail and name the size and the budget

### Requirement: The script is source-only

`server/` SHALL NOT be in the payload inventory. An installed repo SHALL NOT receive it through setup or `/wong-sync`.

#### Scenario: A sync after this release
- **WHEN** an installed repo runs `/wong-sync` to this release
- **THEN** the update plan does not add `server/`
