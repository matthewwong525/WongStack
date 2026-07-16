# ship-quality-gate Specification

## Purpose
TBD - created by archiving change evolve-change-loop. Update Purpose after archive.
## Requirements
### Requirement: Ship runs a parallel quality gate

`/ship` SHALL, after the branch is final, launch three background subagents in parallel that see the complete branch diff and cannot see the session: a **doc-finder** (judges whether a reusable process changed and finds the doc to update), a **test-runner** (runs the suite, writes the tests the change should have had, reports real regressions as blockers), and an **integration-reviewer** (reads the diff for breaking downstream callers as blockers, and duplication/reuse as advisory). The merge gate SHALL be: the CI gate (when present) is green, the test-runner reports no open blockers, and the integration-reviewer's breaking findings are resolved or user-approved.

#### Scenario: Ship spawns the three gate agents

- **WHEN** `/ship` reaches its quality-gate step with a final branch
- **THEN** it launches doc-finder, test-runner, and integration-reviewer as parallel background subagents, each briefed on the diff

#### Scenario: A real regression blocks the merge

- **WHEN** the test-runner reports a regression or a new test that found a bug
- **THEN** `/ship` stops before merging and surfaces the failing test and offending code rather than weakening the test

### Requirement: The gate agents are stack-agnostic

The three gate-agent briefs (`ship/agents/*.md`) SHALL be free of stack-specific machinery (no Cloudflare, D1, Workers Builds, wrangler, or preview-URL assumptions). They SHALL discover the project's test command and downstream callers from the repo rather than assuming a fixed toolchain, so the gate runs on any stack.

#### Scenario: Test-runner discovers the test command

- **WHEN** the test-runner runs in a repo with no assumed toolchain
- **THEN** it determines how to run tests from the repo's own config and reports results without relying on a specific platform

### Requirement: Advisory findings are reported, not gated

`/ship` SHALL treat the integration-reviewer's duplication/reuse/divergence findings as advisory — reported in the ship summary but never blocking the merge and never auto-fixed at ship time.

#### Scenario: Advisory findings do not block

- **WHEN** the integration-reviewer returns only advisory duplication findings and no breaking ones
- **THEN** `/ship` records them in the report and proceeds to merge

