## MODIFIED Requirements

### Requirement: The agent declares its contract and commit

The agent SHALL export its contract version as `CONTRACT`, an integer, now 5. Every poll SHALL send `{ contract, commit, paseo }`: that version, the source commit the host recorded for the build, and whether Paseo is up. It SHALL NOT send a features list. A change to any message's shape SHALL raise `CONTRACT`. Contract 5 SHALL identify the new hosted bootstrap contract described by `cloudflare-hosted-projects`. Contract 4 SHALL continue to identify the preservation/project-preparation contract and SHALL NOT imply implementation of Artifacts capabilities. A host SHALL dispatch the hosted job only to a peer whose negotiated contract supports it; existing GitHub and preservation jobs SHALL retain their compatibility.

#### Scenario: A poll names the contract and commit

- **WHEN** the agent polls on a server built at commit `abc…` (40 hex)
- **THEN** the request body is `{ contract: 5, commit: "abc…", paseo: "up" | "down" }` and nothing else

#### Scenario: An older agent connects

- **WHEN** a server reports contract 4
- **THEN** the host retains its supported GitHub/preservation jobs and sends no hosted bootstrap job
