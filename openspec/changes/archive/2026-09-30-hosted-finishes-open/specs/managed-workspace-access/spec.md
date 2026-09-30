## ADDED Requirements

### Requirement: An open install reports its login is off

When a managed install finishes open because Zero Trust needs a payment method, its private result SHALL say so with exactly `version`, `mode: "open"`, `recipient`, `source`, `accountId`, `repo`, `ownerEmail`, and `anchorHostname`, written to the same job-derived private file and delivered the same way as a restricted result. It SHALL mint no management credential and SHALL carry no Access identifier, token, or cleanup field. A retry of the same job SHALL reuse it; a later run that provisions protection SHALL replace it with the restricted result.

#### Scenario: No card

- **WHEN** a managed install finishes open
- **THEN** the private result file holds exactly the eight open keys, mode 0600, and Cloudflare holds no new management token for the connection

#### Scenario: The card arrives before a retry

- **WHEN** a retry of the same job finds an open result and Zero Trust now provisions
- **THEN** the file is replaced by the restricted result with its management token
