## MODIFIED Requirements

### Requirement: Read-only survey with explicit limits
The survey SHALL collect bounded current tracked-file leads without installing tools, contacting services, modifying repository files, or emitting secret values. It SHALL report its supported inputs, exclusions, and failures and SHALL NOT label a repository safe from an empty result. The documented survey command SHALL emit the report when its in-repository script path resolves through a safe alias.

#### Scenario: Unsupported source language or failed read
- **WHEN** files cannot be analyzed by a survey check
- **THEN** the report exposes the coverage gap and the agent investigates it or states it as unverified

#### Scenario: Escaped scope
- **WHEN** a scope or symlink resolves outside the repository
- **THEN** the survey refuses that read and does not scan the external target

#### Scenario: Documented command uses an in-repository alias
- **WHEN** the agent runs the documented survey command through a script-path alias that resolves to the helper
- **THEN** the command emits the JSON report and uses the same exit-code contract as the canonical script path
