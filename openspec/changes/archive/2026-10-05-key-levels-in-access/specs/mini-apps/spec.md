# Spec Delta

## MODIFIED Requirements

### Requirement: A mini app reaches everything but memory

A mini app's server side SHALL receive the main app's business bindings, the saved business-service keys its app lists and no others, and the verified identity of the caller: a person's email or a service token's name. It SHALL receive no memory-store bindings or Access login-management credential. Identity-checked finite core operations SHALL provide required administration without exposing those secrets. The Worker SHALL keep other runtime routes to bindings, such as importing them, turned off. The docs SHALL say mini apps share the Worker with core authorization and memory, so binding exclusions stop mistakes rather than malicious deployed code. A preview SHALL use staging data and keys, never production management credentials or provider mutations.

#### Scenario: Production binds memory

- **WHEN** a mini app's handler runs on the production Worker, which binds the memory store
- **THEN** it gets the app database, the business-service keys its app lists and the signed-in person, but no memory bindings or raw connection-management credentials

#### Scenario: A handler imports the Worker's bindings

- **WHEN** a handler imports the environment from the Workers runtime
- **THEN** the runtime refuses, and no memory or connection-management binding reaches it

#### Scenario: The owner manages access on a preview

- **WHEN** the verified employer uses Access on a preview
- **THEN** people and app choices are saved in staging data with no login-provider call and no production credential

#### Scenario: The owner manages access

- **WHEN** the verified employer uses the Access mini app's approved core operations
- **THEN** the operation can reconcile the assigned membership without returning a provider key to the mini-app handler or user
