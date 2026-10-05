# Spec Delta

## MODIFIED Requirements

### Requirement: Setup supplies the read-only Cloudflare key

Setup SHALL create a Cloudflare key limited to reading settings, logs and usage, with no permission that changes anything and none that reads databases, stored files, key-value data, queues or memory, SHALL store it for the production Worker, and SHALL record its identifier for reuse and rotation. Setup SHALL also store it for the staging Worker when Cloudflare accepts it; a staging Worker that refuses the key SHALL be reported as waiting and SHALL NOT fail setup, the update, or the staging and production parity check. The key SHALL NOT be the user token, the deploy key or the login-management key, and the user token SHALL still never reach a Worker. A rerun SHALL reuse the key when the production Worker holds it. Updating an existing installation SHALL perform the same step. When the available Cloudflare token cannot create the key, the step SHALL be reported as missing with the private key link and SHALL NOT block the rest of setup or the update.

#### Scenario: A fresh install

- **WHEN** setup finishes
- **THEN** the production Worker holds the read-only key, the user token is in neither Worker, and the employer can give a person Cloudflare: Read from Access without another step

#### Scenario: The token cannot create keys

- **WHEN** the saved Cloudflare token lacks permission to create the key
- **THEN** the step is reported missing with the private key link, and Access shows Cloudflare with one step left

#### Scenario: The staging Worker refuses the key

- **WHEN** Cloudflare refuses to store the key on the staging Worker because a newer preview version is uploaded than the one deployed
- **THEN** the step completes with the key in the production Worker, reports staging as waiting, writes its record, and the parity check passes
