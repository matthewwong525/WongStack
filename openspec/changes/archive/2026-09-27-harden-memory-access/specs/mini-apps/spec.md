## MODIFIED Requirements

### Requirement: A mini app reaches only the app database

A handler SHALL receive the repo's app database and no other binding, and the Worker SHALL turn off every other runtime route to its bindings, such as importing them or reading them from the process environment. The docs SHALL say a handler shares the Worker with the memory store, so the limit stops mistakes, not code written to get around it. A preview SHALL use staging data, never production.

#### Scenario: Production binds memory

- **WHEN** a handler runs on the production Worker, which binds the memory store
- **THEN** the handler gets the app database and no memory binding

#### Scenario: A handler imports the Worker's bindings

- **WHEN** a handler imports the environment from the Workers runtime
- **THEN** the runtime refuses, and no memory binding reaches it
