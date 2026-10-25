## ADDED Requirements

### Requirement: Setup creates the line Workers before the first save

Setup SHALL create the live and staging line Workers, with their databases bound and no web address, before the app's config points at them, so the first save's deploy, which runs the default branch's scripts, finds them. An install that already holds the line in its app SHALL get the same on its update, and rerunning setup SHALL change nothing that is already right.

#### Scenario: A new install

- **WHEN** setup provisions a new app
- **THEN** both line Workers exist before the first save, and the first save prints a preview link

#### Scenario: An install updating from an app that holds the line

- **WHEN** the update's setup step runs on an install whose app holds the line
- **THEN** both line Workers are created from this computer before the update's first save
