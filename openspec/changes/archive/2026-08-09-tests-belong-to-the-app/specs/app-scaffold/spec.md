## ADDED Requirements

### Requirement: The scaffold ships a test runner and a starting suite

The app scaffold SHALL declare a test runner in its own `package.json` with a `test` script, so a repo that takes the scaffold can run `npm test` immediately and the payload's test workflow discovers it without any repo-root file.

The scaffold SHALL ship a starting suite over the code it hands the adopter, rather than an empty example. Coverage SHALL be chosen by what a silent failure costs: the **Access identity module** first, because it ships inert, is the file an adopter is most likely to reimplement by hand, and the incorrect reimplementation fails silently for machine callers while appearing to work in a browser.

That suite SHALL cover at minimum the module's rejection paths that require no network and no cryptography — an unset configuration resolving to *deny* rather than *allow*, a missing or malformed assertion, and an unacceptable signing algorithm — plus the service-token identity, which carries no email and is the case the incorrect implementation breaks.

The runner SHALL be a development dependency only, changing no runtime output and adding nothing to the deployed bundle.

#### Scenario: A scaffolded repo can test immediately

- **WHEN** a repo takes the app scaffold and installs its dependencies
- **THEN** `npm test` runs the shipped suite from the app directory
- **AND** the test workflow finds and runs it with no repo-root manifest present

#### Scenario: Unconfigured identity denies rather than allows

- **WHEN** the Access identity module runs with no team domain or audience configured
- **THEN** the shipped suite asserts it resolves to no identity
- **AND** the test fails if that path is ever changed to allow the request

#### Scenario: The service-token identity is covered

- **WHEN** a verified assertion carries a service-token subject and no email claim
- **THEN** the shipped suite asserts a service identity is returned rather than a rejection
- **AND** the case is present because the header-trust reimplementation rejects it

#### Scenario: The runner does not reach the bundle

- **WHEN** the scaffolded app is built for deployment
- **THEN** the test runner is absent from the built output
