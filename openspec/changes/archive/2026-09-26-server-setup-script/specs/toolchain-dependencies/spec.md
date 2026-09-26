## ADDED Requirements

### Requirement: Only the server script installs Paseo

WongStack SHALL NOT install Paseo on a person's own machine. The one place WongStack installs Paseo SHALL be the source-only server setup script, which builds a server that a person gives to agents. The required-tools page SHALL say both, and link the script's contract.

#### Scenario: A reader checks where Paseo comes from
- **WHEN** a reader opens the required-tools page
- **THEN** it says that setup and the verbs never install Paseo on their machine
- **AND** it names `server/setup.sh` as the one place that installs Paseo, for a server
