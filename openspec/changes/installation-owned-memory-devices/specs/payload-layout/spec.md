## ADDED Requirements

### Requirement: Devices ships as a complete built-in capability

The regular WongStack payload SHALL include the Devices mini app, core authentication handlers, migrations, client protocol and setup/recovery guidance as one compatible feature. It SHALL require no hosted WongStack account. Installation and update checks SHALL prove the dependency set is included while source-only apps remain excluded.

#### Scenario: A fresh standalone installation
- **WHEN** a person installs the regular template
- **THEN** its own main app includes Devices and the local memory approval capability with fresh installation identity and no hosted account requirement

#### Scenario: An existing app occupies the Devices address
- **WHEN** an update finds a locally customized route or app at that address
- **THEN** it plans a reviewed adaptation before activation, preserves local behavior and never overwrites it silently
