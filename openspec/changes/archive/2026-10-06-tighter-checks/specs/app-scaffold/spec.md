# Spec Delta

## MODIFIED Requirements

### Requirement: npm test runs absolute quality gates

The scaffold's `npm test` SHALL fail on any coverage below 100%, a function over the complexity cap, a file over 500 lines, an explicit `any`, a type error, a lint warning, dead code, or duplicated code. The type gate SHALL cover the app's test files as well as its source. The gates SHALL be absolute, not baselined, and the scaffold SHALL pass all of them as shipped, with no extra workflow. The one folder of ready-made parts copied into the app SHALL be exempt from the coverage, dead-code, and duplicated-code gates and from the lint rule on what a component file exports, and from nothing else; no other folder SHALL be exempt.

#### Scenario: A violation

- **WHEN** a commit adds an explicit `any` or an uncovered line to the scaffold
- **THEN** `npm test` exits non-zero and the existing test check goes red

#### Scenario: The shipped scaffold

- **WHEN** `npm test` runs on the scaffold as shipped
- **THEN** every gate passes, and none is skipped or allowed to fail

#### Scenario: A lint warning

- **WHEN** a commit adds code the linter warns about but does not call an error
- **THEN** `npm test` exits non-zero

#### Scenario: A copied part is added

- **WHEN** a commit copies a ready-made part into the parts folder and a screen uses it with an uncovered line of the screen's own
- **THEN** `npm test` exits non-zero for the screen's line, and reports nothing for the copied part's own untested lines

#### Scenario: A type error in a test file

- **WHEN** a commit adds a test for the Worker that passes a value of the wrong type and still passes when run
- **THEN** `npm test` exits non-zero and names that test file
