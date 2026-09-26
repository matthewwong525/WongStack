## MODIFIED Requirements

### Requirement: The app scaffold ships in the core payload

The payload SHALL include WongStack's own `app/` — a React-on-Workers-with-D1 application — as part of the core payload. Setup starts from an empty folder, so every install SHALL receive the scaffold. No install-record flag SHALL gate it.

#### Scenario: A new install receives the scaffold

- **WHEN** setup installs WongStack into an empty folder
- **THEN** the target receives `app/`, and the provisioning step creates its wrangler config

#### Scenario: A legacy repo without the flag receives no scaffold

- **WHEN** an install record carries `components.appScaffold: false` from an earlier release
- **THEN** the flag is ignored, and the repo is not supported until it is set up again
