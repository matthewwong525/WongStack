## ADDED Requirements

### Requirement: Machine memory ships as a complete regular WongStack capability

The template SHALL ship the compatible core authorization, migrations/manifests, CLI/hooks, setup contract and recovery guidance needed for unattended machine memory. It SHALL NOT require a hosted WongStack account, GitHub identity or a Devices approval frontend. New and updated installs SHALL preflight compatible schema/protocol and preserve customized business apps; incomplete source preparation SHALL NOT be advertised as a ready runtime. Secret values and private machine state SHALL never enter the payload.

#### Scenario: Fresh or updated standalone installation
- **WHEN** an installation receives the completed payload
- **THEN** trusted machine setup and automatic private/shared memory work independently of Git hosting, with ordinary mini apps still denied memory bindings

#### Scenario: Incompatible or incomplete update
- **WHEN** an update lacks a required runtime component or encounters an unsupported completed schema
- **THEN** memory remains safely pending or blocked without resetting IDs, reopening legacy authority or overwriting local app customizations
