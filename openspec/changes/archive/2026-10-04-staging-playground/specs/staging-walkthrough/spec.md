# Spec Delta

## ADDED Requirements

### Requirement: A walk starts from the seed and holds a turn

Before its first deployed check, `/verify` SHALL take the repository's single staging turn and rebuild staging from the checked-in seed, so every walk starts from the same known data on its own revision's schema. Only one walk SHALL hold the turn at a time, across machines; the turn SHALL be given back on every exit and SHALL expire on its own when its holder vanishes. A walk that cannot get the turn or cannot rebuild staging within its budget SHALL leave its staging-dependent checks unverified, name why, and still finish checks that need no staging data. A repository with no disposable staging database SHALL walk as before, with no turn and no rebuild.

#### Scenario: Two walks at once

- **WHEN** a second walk starts while another holds the staging turn
- **THEN** it waits, then rebuilds staging and walks only after the first gives the turn back or the turn expires

#### Scenario: No turn in time

- **WHEN** the turn is still held when the walk's wait runs out
- **THEN** the staging-dependent checks are reported unverified with the reason, and CI-only checks still finish

### Requirement: Missing seed data is named

A scenario whose journey needs records the seed does not hold SHALL be created by the walk where the app's own screens allow it. Where they do not, the scenario SHALL be reported unverified, naming the missing sample data, and SHALL NOT count as a pass.

#### Scenario: A report page with nothing to show

- **WHEN** a scenario promises a list of past orders and the seed holds none the walk can create
- **THEN** the report names that scenario as unverified for lack of sample orders

### Requirement: A scheduled job is run by its manual trigger

For a scenario about work that runs on a schedule, `/verify` SHALL start that work through the project's manual trigger on staging and grade its result. Where the project offers no manual trigger, the scenario SHALL be unverified by name. The schedule's own timing SHALL stay partly shown.

#### Scenario: A nightly job

- **WHEN** a change's scenario promises a nightly summary and staging offers a manual trigger for it
- **THEN** the walk runs the job once on staging, grades the summary against the `THEN`, and reports the timetable as not checked

## MODIFIED Requirements

### Requirement: Verification preserves staging and external systems

Inside a staging environment whose every stateful binding is its own twin and whose database is not production's, verification MAY create, change, and delete any data without a prompt, without owning the records, and without cleanup: the next walk rebuilds staging. An outside service SHALL be exercised only when staging holds its own key for it, distinct from production's; a service whose staging key is production's, or whose destination cannot be established, SHALL NOT be triggered, and its checks SHALL remain unverified by name while independent checks continue. Production resources, access controls beyond already authorized repair, and paid resources SHALL still require explicit authorization. If staging's isolation cannot be established, mutating checks SHALL remain unverified.

#### Scenario: A disposable delete journey

- **WHEN** a delete scenario runs on an isolated staging environment
- **THEN** the journey deletes seeded records without a permission prompt and restores nothing afterwards

#### Scenario: Staging points at a real integration

- **WHEN** a staging journey would send a message through a service whose staging key is production's, or whose destination cannot be established
- **THEN** its trigger is not run, the report names the service and what a staging-only key would unlock, and independent checks still run

### Requirement: A failed walk resets staging, then fixes in scope or stops

On `FAILURE`, `/verify` SHALL fix a failure in this change's own scope, save, rebuild staging from the seed under its turn, and walk again, at most twice, and SHALL report any other failure without fixing it; the report SHALL state the scope judgement. When an existing CI harness can cheaply reproduce an in-scope defect, the repair SHALL retain a focused regression check and evidence of that same check failing on the earlier source for the observed defect and passing on the repaired source. Where a lasting check is impractical, the report SHALL retain the available reproduction and explain the limitation without requiring new test infrastructure or weakening the delivery gate. A failure SHALL NOT prevent independent safe checks from completing. Additional consumer checks SHALL NOT expand repair authorization.

#### Scenario: An in-scope failure

- **WHEN** a journey contradicts its `THEN` in this change's own code
- **THEN** `/verify` fixes, saves, rebuilds staging, and walks again, stopping after two failed attempts; a practical existing test path produces a retained regression with failing-before and passing-after evidence, otherwise the reproduction's limitation is reported

#### Scenario: An out-of-scope failure

- **WHEN** a journey fails on behavior this change did not introduce
- **THEN** `/verify` reports the failure and finishes independent safe checks without a fix
