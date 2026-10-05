# Spec Delta

## ADDED Requirements

### Requirement: Setup supplies the read-only Cloudflare key

Setup SHALL create a Cloudflare key limited to reading settings, logs and usage, with no permission that changes anything and none that reads databases, stored files, key-value data, queues or memory, and SHALL store it for the production and staging Workers and record its identifier for reuse and rotation. The key SHALL NOT be the user token, the deploy key or the login-management key, and the user token SHALL still never reach a Worker. A rerun SHALL reuse the key. Updating an existing installation SHALL perform the same step. When the available Cloudflare token cannot create the key, the step SHALL be reported as missing with the private key link and SHALL NOT block the rest of setup or the update.

#### Scenario: A fresh install

- **WHEN** setup finishes
- **THEN** both Workers hold the read-only key, the user token is in neither, and the employer can give a person Cloudflare: Read from Access without another step

#### Scenario: The token cannot create keys

- **WHEN** the saved Cloudflare token lacks permission to create the key
- **THEN** the step is reported missing with the private key link, and Access shows Cloudflare with one step left
