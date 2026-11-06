## MODIFIED Requirements

### Requirement: The scaffold checks requests and database changes in the Workers runtime

The scaffold's normal test command SHALL include a suite in the local Workers runtime, using temporary D1 storage initialized from the project's migrations and then its staging seed. It SHALL check signed-request authorization and the committed or rolled-back state of an Access save, and SHALL hold at least one test file for each server app folder that answers requests. The suite SHALL start the runtime once per run, however many test files it holds, and every check run SHALL run all of its files. The suite SHALL reuse the existing app toolchain without introducing another test-runtime dependency. Running the suite SHALL require no Cloudflare credentials, contact no live service, and leave deployed data untouched; an outside request SHALL fail the test. The suite SHALL fail on a broken expectation, failed initialization, missing tests, or a full run over its time budget, naming the slowest files. Its test entry points SHALL remain outside the deployed app. It SHALL close its runtime and remove its temporary build and storage after execution.

#### Scenario: Runtime requests and saves work

- **WHEN** the shipped app's normal test command runs in a freshly installed project with no service credentials
- **THEN** the runtime suite exercises signed requests and Access saves against temporary D1 storage and passes only when responses and database readbacks agree with the expected behavior

#### Scenario: A runtime regression is introduced

- **WHEN** an app change admits a caller that should be refused or leaves a partially committed Access save after a database failure
- **THEN** the runtime suite fails the normal test command and the existing test check blocks publishing

#### Scenario: Tests start from the staging seed

- **WHEN** a runtime test reads a row the staging seed holds, changes it, and resets the database
- **THEN** it reads the seeded value both before the change and after the reset

#### Scenario: A server app has no runtime test

- **WHEN** a change adds a server app folder that answers requests and no runtime test file for it
- **THEN** the normal test command fails and names that app

#### Scenario: The suite grows slow

- **WHEN** a full runtime run takes longer than its time budget
- **THEN** the normal test command fails and names the slowest test files
