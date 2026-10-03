## MODIFIED Requirements

### Requirement: The server installer installs WongStack unattended

The source SHALL ship a server installer that installs its clone's full payload, install record, Cloudflare hosting and repository memory into an empty GitHub repo without a separate memory app login or approval screen. It SHALL record source version/commit and memory target, privately enroll only the initiating machine using verified installation provisioning authority, and put only the scoped deploy token in CI. It SHALL commit the install on main and push it. A retry SHALL finish an interrupted owned install without replacing published code or identity, and SHALL refuse unrelated existing work. Infrastructure success without this machine's proof SHALL remain pending memory setup rather than ready.

#### Scenario: A fresh repo
- **WHEN** a host runs the installer for an empty repo with valid verified provisioning authority
- **THEN** main holds the install, the record names source version/commit and memory Worker, and the last output line is done; memory readiness separately reflects the initiating machine's proof

#### Scenario: A repo with other work
- **WHEN** the repo already has commits the installer did not make
- **THEN** it changes nothing and its last output line is repo

## ADDED Requirements

### Requirement: Setup reports readiness for the initiating machine without secrets

Setup SHALL expose a versioned nonsecret memory result containing installation/repository IDs, app and memory origins, and pending-setup, ready or blocked status for THIS machine. It SHALL include safe reason/instruction fields for missing authority or incompatible protocol, without browser approval URLs or credential values. Ready SHALL require this machine's valid current grant and a successful permitted memory operation; another machine, cloud role or provider success envelope SHALL NOT suffice. Superseded version1 owner/device action semantics SHALL be explicitly unsupported, not silently interpreted as the new contract.

#### Scenario: Resources exist but machine proof is absent
- **WHEN** setup finds an initialized installation or another connected machine without proof for this client
- **THEN** it reports pending-setup and safe trusted-setup guidance, never ready

#### Scenario: A completed machine setup
- **WHEN** the initiating machine proves a live scoped grant and allowed memory operation
- **THEN** setup reports ready for that machine without requiring an app login
