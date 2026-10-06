# Spec Delta

## ADDED Requirements

### Requirement: A check that stopped checking turns the test check red

When a change touches a check's settings or the version of a tool behind one, the test check SHALL give each of the app's quality gates a known-bad sample, read through the app's own settings, and SHALL fail when a gate lets its sample pass, naming that gate. A change that touches neither SHALL skip this proof and say so, and a change with no base to compare SHALL run it.

#### Scenario: A settings file the tool no longer reads

- **WHEN** a change edits the duplicated-code gate's settings so the tool ignores them, and the app's own code still passes
- **THEN** the test check fails and names the duplicated-code gate as passing a bad sample

#### Scenario: A change to a screen

- **WHEN** a change edits one screen and no check's settings or tool version
- **THEN** the proof does not run, and the check's summary says it was skipped
