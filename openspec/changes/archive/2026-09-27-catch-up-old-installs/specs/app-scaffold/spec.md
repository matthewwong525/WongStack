## MODIFIED Requirements

### Requirement: Every install gets the scaffold

The core payload SHALL carry WongStack's `app/` to every new install, and no install-record flag SHALL gate it for a new install. After provisioning and the first deploy, the app's address SHALL serve the starter page. A sync SHALL treat an earlier release's opt-out flag as the person's choice: the plan names the starter app as left out until the person asks for it.

#### Scenario: A new install

- **WHEN** setup installs WongStack into an empty folder
- **THEN** the target receives `app/`, and provisioning creates its wrangler config

#### Scenario: A legacy opt-out flag

- **WHEN** an install record carries `components.appScaffold: false` from an earlier release
- **THEN** the sync plan lists the starter app as left out, with that reason, and the repo still updates in place
