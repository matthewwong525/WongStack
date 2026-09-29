## MODIFIED Requirements

### Requirement: The server script builds an agent workspace

The source SHALL ship `server/setup.sh`, which, run as root with no prompt on a fresh Ubuntu 24.04 server, SHALL create the `WORKSPACE_USER` (default `wong`), install the Node.js major that CI's `.nvmrc` names, git, `gh`, OpenSpec, Paseo, the coding agents, agent-browser, and Cloudflare's tunnel tool `cloudflared`, and run Paseo as a service for that user. It SHALL NOT run `cloudflared` as a service. It SHALL be safe to run again and SHALL end by checking each promised tool, exiting non-zero and naming what is missing.

#### Scenario: A fresh server

- **WHEN** a person runs `sudo bash server/setup.sh` on a fresh server
- **THEN** it exits 0 with every promised tool installed and Paseo running

#### Scenario: A tool is missing

- **WHEN** a promised tool is absent at the end
- **THEN** the script exits non-zero and names it

#### Scenario: The check and the contract agree

- **WHEN** the script's final check and the end state in `server/README.md` name different tools
- **THEN** the source's tests fail and name the difference

#### Scenario: The server's Node and CI's Node differ

- **WHEN** `server/setup.sh` installs a Node.js major other than the one `.nvmrc` names
- **THEN** the source's tests fail and name both versions
