## MODIFIED Requirements

### Requirement: The scaffold ships a test runner and a starting suite

The app scaffold SHALL declare a test runner in its own `package.json` with a `test` script, so a repo that takes the scaffold can run `npm test` immediately and the payload's test workflow discovers it without any repo-root file.

The scaffold SHALL ship a starting suite over the code it hands the adopter, rather than an empty example. Coverage SHALL be chosen by what a silent failure costs: the **Access identity module** first, because it ships inert, is the file an adopter is most likely to reimplement by hand, and the incorrect reimplementation fails silently for machine callers while appearing to work in a browser.

That suite SHALL cover at minimum the module's rejection paths that require no network and no cryptography — an unset configuration resolving to *deny* rather than *allow*, a missing or malformed assertion, and an unacceptable signing algorithm — plus the service-token identity, which carries no email and is the case the incorrect implementation breaks.

The suite's accepted-token cases SHALL verify a real signature: the test SHALL generate a signing key, serve its public half as the team's certificate set, and sign each accepted assertion with it. The platform's key import and signature verification SHALL NOT be replaced by stand-ins, so a wrong algorithm, a malformed key, or a signature-decoding fault fails the suite.

The scaffold's suite SHALL test only the scaffold's own code. It SHALL NOT carry tests of WongStack's toolkit files, and the scaffold SHALL declare no browser-automation dependency, so a repo that takes the scaffold downloads no browser to run its tests.

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

#### Scenario: An accepted token is really verified

- **WHEN** the identity module is changed to import the key with the wrong algorithm
- **THEN** the suite's accepted-token cases fail

#### Scenario: A token signed by another key is refused

- **WHEN** an assertion is signed by a key that is not in the served certificate set
- **THEN** the suite asserts the module resolves to no identity

#### Scenario: The runner does not reach the bundle

- **WHEN** the scaffolded app is built for deployment
- **THEN** the test runner is absent from the built output

#### Scenario: The scaffold carries no browser

- **WHEN** a repo takes the app scaffold and runs `npm ci` and `npm test`
- **THEN** no browser-automation package is installed and no browser is downloaded
- **AND** no test in the scaffold exercises a WongStack skill file

### Requirement: The scaffold's test script is a quality-gate chain

The scaffold's `npm test` SHALL run, in one chain behind the single script `test.yml` already calls, deterministic quality gates alongside the unit suite — no new workflow, no local build prerequisite, and no gate that requires a model call:

- **Coverage**: the unit suite SHALL enforce 100% coverage over the scaffold's source via coverage thresholds, failing the run when any threshold is missed.
- **Lint limits**: cyclomatic complexity SHALL be capped below 22 per function, files SHALL be capped at 500 lines, and an explicit `any` SHALL be an error. `unknown` SHALL remain legal. A cognitive-complexity cap below 22 SHALL be enforced only if the scaffold's existing linter provides the rule; a second linter SHALL NOT be added for it.
- **Dead code**: unused files, exports, and dependencies SHALL fail the run.
- **Duplication**: duplicated code blocks SHALL fail the run.
- **Mutation**: the run SHALL fail while any tested mutant of the scaffold's source survives the unit suite. A **static mutant** — one whose code runs only when a module loads, so that testing it means rerunning every test — SHALL be reported as ignored and SHALL NOT be tested; every other mutant SHALL be tested. The run SHALL keep each mutant's result in a git-ignored file and reuse a result only when the mutant's code and the test that killed it did not change; it SHALL test every other mutant again. A run with no result file SHALL test every non-static mutant, and a forced run SHALL ignore the file.

The gates SHALL be absolute, not baselined: the scaffold as shipped SHALL pass every gate, so a repo that takes the scaffold starts compliant and CI holds it there.

#### Scenario: A violation fails CI through the existing contract

- **WHEN** a commit introduces an explicit `any`, an uncovered line, an unused export, or a surviving non-static mutant in the scaffold's source
- **THEN** `npm test` exits non-zero
- **AND** the existing `test.yml` check goes red with no workflow change

#### Scenario: The shipped scaffold passes

- **WHEN** `npm test` runs on the scaffold exactly as the payload ships it
- **THEN** every gate passes
- **AND** no gate is skipped, baselined, or marked allowed-to-fail

#### Scenario: The contract stays one script

- **WHEN** CI runs in a repo that took the scaffold
- **THEN** `npm test` remains the entire interface between the repo and `test.yml`
- **AND** no additional workflow or CI configuration is required for the gates to run

#### Scenario: A second run reuses results that are still valid

- **WHEN** `npm test` runs again after a change to one source file, with the result file from the last run present
- **THEN** mutants outside the changed code, whose killing test did not change, reuse their results
- **AND** every non-static mutant in the changed code is tested again, and one survivor still fails the run

#### Scenario: A run with no result file tests every mutant

- **WHEN** `npm test` runs with no result file, or Stryker runs with `--force`
- **THEN** every non-static mutant is tested

#### Scenario: Static mutants are not tested

- **WHEN** a mutant changes a module-level constant that runs only when the module loads
- **THEN** the run reports it as ignored
- **AND** it neither fails the run nor reruns the whole suite
