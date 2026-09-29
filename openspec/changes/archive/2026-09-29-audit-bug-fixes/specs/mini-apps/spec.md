## ADDED Requirements

### Requirement: One rule names a mini app's test files

One shared rule SHALL decide which files are tests: every name Node's test runner picks up by default, plus `.spec.` and `test_` names. CI SHALL run those files as a mini app's tests, the build SHALL leave them out of the published pages, the Worker SHALL refuse to serve them, and the loosened-check guard SHALL read them for switched-off tests.

#### Scenario: An underscore test file

- **WHEN** a mini app holds `foo_test.mjs`
- **THEN** CI runs it as a test, and `/apps/<name>/foo_test.mjs` is neither copied into the build nor served

#### Scenario: A skipped test in a mini app

- **WHEN** a branch adds `test.skip` to a mini app's `foo_test.mjs` with no recorded reason
- **THEN** the test check fails and names the file
