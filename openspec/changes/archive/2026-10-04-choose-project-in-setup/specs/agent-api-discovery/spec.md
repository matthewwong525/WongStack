## MODIFIED Requirements

### Requirement: Discovery describes the deployed company API

The protected company Worker SHALL publish OpenAPI 3.1 generated from its currently registered described actions and a bounded summary catalogue with per-action details. The outputs SHALL identify a contract revision, omit undeclared and infrastructure routes, preserve stable operation identities, and include only synthetic examples and nonsecret metadata. Every existing operation-level visibility restriction SHALL apply consistently to summary listings, selected details and OpenAPI; enabled Access per-app policy SHALL additionally enforce current employee app permissions on all three outputs. Permission changes SHALL govern the next discovery request even during an existing session; conditional or cached responses SHALL not reveal another caller's or a previously permitted action's contract. Discovery remains descriptive and SHALL grant no execution or memory authority.

#### Scenario: A new action is published

- **WHEN** a reviewed action joins the production registry and deploys
- **THEN** production discovery describes its real method, path, input, output and effect to permitted employees without a second manually maintained API document

#### Scenario: A route is not an employee action

- **WHEN** the Worker also serves the raw memory protocol, verification uploads, administrative operations or undescribed legacy handlers
- **THEN** discovery does not advertise those routes as company actions

#### Scenario: Employee app permission is removed

- **WHEN** an employee requests summaries, selected details or OpenAPI after their app permission is removed
- **THEN** none of those responses or conditional cache paths reveal that app's unauthorized action contract
