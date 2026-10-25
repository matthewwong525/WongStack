## REMOVED Requirements

### Requirement: Setup creates the line Workers before the first save

**Reason**: Previews have no line, so no save needs a line Worker before it; the first publish makes the live line before the app.
**Migration**: None for a new install. An install with a test line follows the update's step to delete it after publishing.

## ADDED Requirements

### Requirement: Setup prepares the live line for its first publish

Setup SHALL write the live line's settings, with the live database bound and no web address, and point the live app at it, so the first publish makes the line Worker before the app. Setup SHALL make no test line, and SHALL deploy nothing over a Worker of the line's name that this install has no record of making. An install whose settings hold a test line SHALL have it removed from them on its update, and rerunning setup SHALL change nothing that is already right.

#### Scenario: A new install

- **WHEN** setup provisions a new app
- **THEN** its settings name one line Worker, for the live app, the first save prints a preview link, and the first publish makes the line before the app

#### Scenario: An install with a test line updates

- **WHEN** the update's setup step runs on an install whose settings hold a test line
- **THEN** the test line is gone from its line and app settings, the rest of each file is unchanged, and a rerun changes nothing
