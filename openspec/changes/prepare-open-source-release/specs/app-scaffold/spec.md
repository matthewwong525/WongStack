## ADDED Requirements

### Requirement: The app scaffold ships in the core payload

The payload SHALL include WongStack's own `app/` — a React-on-Workers-with-D1 application — as part of the core payload for new installs. Setup starts from an empty folder, so every new install SHALL receive the scaffold, and its install record SHALL set `components.appScaffold: true` beside `components.stackPack: true`.

For a repo installed before 18.0.0, `/wong-sync` SHALL continue to honor `components.appScaffold`: a repo whose record has `components.stackPack: true` and lacks `appScaffold: true` SHALL receive none of the scaffold's files, and `appScaffold: true` without `stackPack: true` remains an invalid state.

#### Scenario: A new install receives the scaffold

- **WHEN** setup installs WongStack into an empty folder
- **THEN** the target receives `app/`, and the provisioning step creates its wrangler config

#### Scenario: A legacy repo without the flag receives no scaffold

- **WHEN** `/wong-sync` runs in a legacy repo with `components.appScaffold` absent or false
- **THEN** no file under `app/` is written to it
- **AND** the repo's own application layout is untouched

## REMOVED Requirements

### Requirement: An opt-in app scaffold ships in the payload

**Reason**: Setup starts from an empty folder, so every new install takes the scaffold.
**Migration**: See "The app scaffold ships in the core payload", which keeps the flag for legacy repos.
