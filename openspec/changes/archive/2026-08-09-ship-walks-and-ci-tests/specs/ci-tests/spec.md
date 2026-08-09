# ci-tests

## ADDED Requirements

### Requirement: The pack's CI runs the test suite in a parallel job

The stack pack's `deploy.yml` SHALL contain a `test` job that runs beside the `deploy` job in the same workflow, so one commit produces one workflow run (preserving the existing double-fire collapse) and the deploy's latency is unchanged. The `test` job SHALL run the app's `test` script (vitest in pack-scaffolded apps; any runner behind `npm test` satisfies the job). When `package.json` declares no `test` script, the job SHALL print why and exit green — a real check, never a permanently red one, matching the workflow's existing behavior for unprovisioned repos.

The `deploy` job SHALL NOT depend on the `test` job: a staging deploy of red code is harmless (staging is a fixture and the walk observes it), and red code cannot reach production because merges require green CI.

#### Scenario: Tests run in parallel with the deploy

- **WHEN** a commit is pushed to a pack repo whose app declares a `test` script
- **THEN** the `test` job runs the suite while the `deploy` job builds and deploys
- **AND** the deploy finishes no later than it would without the test job

#### Scenario: No test script is honest green

- **WHEN** a commit is pushed to a pack repo whose app has no `test` script
- **THEN** the `test` job states that no suite exists and exits green
- **AND** the check is not reported as a failure

#### Scenario: A red suite holds the save, not the deploy

- **WHEN** the `test` job fails on a feature-branch push
- **THEN** the staging deploy still completes
- **AND** `/save`'s existing CI wait reports the failure and enters its auto-fix path, and `/ship` cannot merge until the check is green

### Requirement: Test coverage grows in the loop, not at the checkpoint

`/plan` SHALL include a standing task in `tasks.md` — add or extend test coverage for the changed behavior — whenever the proposed change touches behavior (code a test can exercise), and SHALL omit it for prose-only changes. `/apply` SHALL implement that task while implementing the change. `/save` SHALL NOT author tests: it remains a pure checkpoint, and its only relationship to the suite is the existing CI wait and auto-fix.

#### Scenario: A behavioral change plans its tests

- **WHEN** `/plan` drafts a change whose diff will touch app behavior
- **THEN** `tasks.md` contains a task to add or extend test coverage for that behavior

#### Scenario: A prose change plans no tests

- **WHEN** `/plan` drafts a change that only touches wiki, notes, or skill prose
- **THEN** no test task is added

#### Scenario: Save never writes tests

- **WHEN** `/save` checkpoints a session whose change lacks tests
- **THEN** it commits, pushes, and gates as usual without authoring test files
- **AND** any red `test` check is handled by the existing auto-fix path, not by writing new coverage at checkpoint time
