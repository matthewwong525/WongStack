## MODIFIED Requirements

### Requirement: The agent declares its contract and commit

The agent SHALL export its contract version as `CONTRACT`, an integer, now 2. Every poll SHALL send `{ contract, commit, paseo }`: that version, the source commit the host recorded for the build, and whether Paseo is up. It SHALL NOT send a features list. A change to any message's shape SHALL raise `CONTRACT`.

#### Scenario: A poll names the contract and commit

- **WHEN** the agent polls on a server built at commit `abc…` (40 hex)
- **THEN** the request body is `{ contract: 2, commit: "abc…", paseo: "up" | "down" }` and nothing else

### Requirement: The contract is written down

`server/README.md` SHALL document the current contract as a host and a fork rely on it: the agent's environment, the poll request and reply, each job type with its payload and result, the job-result delivery, the private access-result delivery with both its restricted and its open shape, the host's setup report, and that the agent never changes itself. It SHALL say what changed from the contract before it. A fork that changes the agent SHALL keep to it or raise `CONTRACT`.

#### Scenario: The README and the agent agree

- **WHEN** the agent handles a job type that `server/README.md`'s contract does not list, or the README lists one the agent does not handle
- **THEN** the source's tests fail and name the job type

#### Scenario: The README names the declared contract

- **WHEN** `CONTRACT` differs from the number of the contract section in `server/README.md`
- **THEN** the source's tests fail

## ADDED Requirements

### Requirement: A contract-2 agent asks for the open finish

A contract-2 agent SHALL ask the installer to finish open when Zero Trust needs a payment method, and SHALL deliver the resulting open access result through the same checked private channel as a restricted one. An agent of an earlier contract SHALL NOT ask, so an older server keeps stopping.

#### Scenario: A cloudflare job on a contract-2 server

- **WHEN** the agent runs the installer for a `cloudflare` job
- **THEN** the installer's stdin job asks for the open finish, and still holds no `AGENT_TOKEN`
