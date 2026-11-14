# Spec Delta

## MODIFIED Requirements

### Requirement: Setup supplies the read-only Cloudflare key to the live app only

Setup SHALL create a Cloudflare key limited to reading settings, logs, including the account's Workers logs, and usage, with no permission that changes anything and none that reads databases, stored files, key-value data, queues or memory. It SHALL store the key for the production Worker alone and record its identifier for reuse and rotation. The key SHALL NOT reach staging or previews, and the Access step SHALL remove a copy staging already holds. The key SHALL NOT be the user token, the deploy key or the login-management key, and the user token SHALL still never reach a Worker. A rerun SHALL reuse the key when the production Worker holds it, and SHALL first bring the key's permissions to the current read-only list when they differ, without making a new key. Updating an existing installation SHALL perform the same step. When the available Cloudflare token cannot create or update the key, the step SHALL be reported as missing with the private key link and SHALL NOT block the rest of setup or the update.

#### Scenario: A fresh install

- **WHEN** setup finishes
- **THEN** the production Worker holds the read-only key, staging holds no copy, the user token is in neither Worker, and the employer can give a person Cloudflare: Read from Access without another step

#### Scenario: The token cannot create keys

- **WHEN** the saved Cloudflare token lacks permission to create the key
- **THEN** the step is reported missing with the private key link, and Access shows Cloudflare with one step left

#### Scenario: An existing key lacks the Workers logs permission

- **WHEN** an install updates and the production Worker holds a read-only key made before Workers logs joined its list
- **THEN** the same key gains that read permission, keeps its value and identifier, and gains no write permission
