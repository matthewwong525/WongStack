## MODIFIED Requirements

### Requirement: One helper describes company and memory operations without combining authority

The helper SHALL provide one bounded, filterable catalogue and selected-operation descriptions for live company actions and installed memory read operations. Every description SHALL identify its source, transport, required authentication, input/output schemas, effect and contract revision. Installed-client operations SHALL NOT be presented as deployed HTTP endpoints in OpenAPI. Company operations SHALL NOT override the memory namespace or select arbitrary local commands. Memory discovery and calls SHALL remain usable independently of company login; knowing a schema SHALL NOT establish an authorized connection. A combined list that could not reach the company SHALL also say so in one plain line outside its result, naming the sign-in step.

#### Scenario: A task needs both company information and remembered context

- **WHEN** an agent lists and describes company and memory operations through the helper
- **THEN** it receives the relevant contracts through one interface with distinct sources and authentication requirements, without loading every schema or receiving credentials

#### Scenario: Company login is unavailable

- **WHEN** the agent lacks company login but its installed memory credential is valid
- **THEN** it can still discover and use the described memory reads, the unavailable company connection is reported separately, and a plain line says company actions are missing and how to sign in
