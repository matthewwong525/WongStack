## MODIFIED Requirements

### Requirement: npm test runs absolute quality gates

The scaffold's `npm test` SHALL fail on any coverage below 100%, a function over the complexity cap, a file over 500 lines, an explicit `any`, a lint warning, dead code, or duplicated code. The gates SHALL be absolute, not baselined, and the scaffold SHALL pass all of them as shipped, with no extra workflow.

#### Scenario: A violation

- **WHEN** a commit adds an explicit `any` or an uncovered line to the scaffold
- **THEN** `npm test` exits non-zero and the existing test check goes red

#### Scenario: The shipped scaffold

- **WHEN** `npm test` runs on the scaffold as shipped
- **THEN** every gate passes, and none is skipped or allowed to fail

#### Scenario: A lint warning

- **WHEN** a commit adds code the linter warns about but does not call an error
- **THEN** `npm test` exits non-zero
