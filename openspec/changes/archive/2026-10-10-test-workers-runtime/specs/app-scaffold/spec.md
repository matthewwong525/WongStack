## ADDED Requirements

### Requirement: The scaffold checks requests and database changes in the Workers runtime

The scaffold's normal test command SHALL include a focused suite in the local Workers runtime, using temporary D1 storage initialized from the project's migrations. It SHALL check signed-request authorization and the committed or rolled-back state of an Access save. The suite SHALL reuse the existing app toolchain without introducing another test-runtime dependency. Running the suite SHALL require no Cloudflare credentials, contact no live service, and leave deployed data untouched. The suite SHALL fail on a broken expectation, failed initialization, or missing tests, and its test entry points SHALL remain outside the deployed app. It SHALL close its runtime and remove its temporary build and storage after execution.

#### Scenario: Runtime requests and saves work

- **WHEN** the shipped app's normal test command runs in a freshly installed project with no service credentials
- **THEN** the runtime suite exercises signed requests and Access saves against temporary D1 storage and passes only when responses and database readbacks agree with the expected behavior

#### Scenario: A runtime regression is introduced

- **WHEN** an app change admits a caller that should be refused or leaves a partially committed Access save after a database failure
- **THEN** the runtime suite fails the normal test command and the existing test check blocks publishing
