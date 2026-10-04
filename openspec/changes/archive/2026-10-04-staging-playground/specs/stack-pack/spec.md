# Spec Delta

## ADDED Requirements

### Requirement: The secret check names the keys staging shares with production

The pack SHALL report, by name only, which runtime secrets staging would hold with production's value and which it holds with its own. Values SHALL never be printed. Staging SHALL keep falling back to production's values when no staging-only values exist, and the report SHALL then name every key as shared. `/verify` SHALL read this report to decide which outside services it may exercise.

#### Scenario: No staging-only values

- **WHEN** a repo has given staging no values of its own
- **THEN** the report names every runtime secret as shared with production

#### Scenario: A test key for one service

- **WHEN** staging has its own value for the payment key and production's value for the email key
- **THEN** the report names the payment key as staging's own and the email key as shared

### Requirement: The production deploy records its address

The pack's CI SHALL record each default-branch deploy on the deployed commit with its outcome and the live app's address, taken from the deploy's own output and never built from a naming pattern. A failed record SHALL NOT fail the deploy.

#### Scenario: A release on the default branch

- **WHEN** a merge to the default branch deploys
- **THEN** the merged commit carries a production deployment with its success or failure and the live address

## MODIFIED Requirements

### Requirement: Staging is seeded, never a production copy

The staging reset SHALL rebuild staging from the migrations and the checked-in `schema/seed.sql`, which ships as an empty template. A change that adds or alters a feature SHALL add or update, in the same change, the made-up seed rows its scenarios need, realistic in shape and holding no real person's details. The reset SHALL never read or copy production data, and SHALL drop nothing when the staging database has production's name.

#### Scenario: A reset

- **WHEN** the staging reset runs
- **THEN** staging holds the migrated schema and the seed rows, and no production read happened

#### Scenario: Staging points at production

- **WHEN** the staging `database_name` equals production's
- **THEN** the reset stops with an error and drops nothing
