## ADDED Requirements

### Requirement: Staging never binds the production database

Every step that acts on staging (the branch build, the staging deploy, the preview upload, and the staging reset) SHALL stop before any Cloudflare call when the staging D1 entry names production's database by `database_name` or by `database_id`, and SHALL name the fix.

#### Scenario: A copied entry renamed by hand

- **WHEN** `env.staging` holds a D1 entry with its own `database_name` but production's `database_id`, and a branch is pushed
- **THEN** the build stops before migrating, and no staging step deploys or writes

#### Scenario: Staging has its own database

- **WHEN** the staging entry's name and id both differ from production's
- **THEN** the branch build migrates the staging database as before
