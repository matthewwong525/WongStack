# app-scaffold Delta

## ADDED Requirements

### Requirement: The scaffold's test script is a quality-gate chain

The scaffold's `npm test` SHALL run, in one chain behind the single script `test.yml` already calls, deterministic quality gates alongside the unit suite — no new workflow, no local build prerequisite, and no gate that requires a model call:

- **Coverage**: the unit suite SHALL enforce 100% coverage over the scaffold's source via coverage thresholds, failing the run when any threshold is missed.
- **Lint limits**: cyclomatic complexity SHALL be capped below 22 per function, files SHALL be capped at 500 lines, and an explicit `any` SHALL be an error. `unknown` SHALL remain legal. A cognitive-complexity cap below 22 SHALL be enforced only if the scaffold's existing linter provides the rule; a second linter SHALL NOT be added for it.
- **Dead code**: unused files, exports, and dependencies SHALL fail the run.
- **Duplication**: duplicated code blocks SHALL fail the run.
- **Mutation**: the run SHALL fail while any mutant of the scaffold's source survives the unit suite.

The gates SHALL be absolute, not baselined: the scaffold as shipped SHALL pass every gate, so a repo that takes the scaffold starts compliant and CI holds it there.

#### Scenario: A violation fails CI through the existing contract

- **WHEN** a commit introduces an explicit `any`, an uncovered line, an unused export, or a surviving mutant in the scaffold's source
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
