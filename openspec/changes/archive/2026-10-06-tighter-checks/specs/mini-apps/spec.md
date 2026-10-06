# Spec Delta

## ADDED Requirements

### Requirement: A mini app's code keeps to its own folder

A mini app's page and server side SHALL import only from the app's own folder, the shared parts and helpers, and installed packages; its server side SHALL also reach the shared action contract. The app's checks SHALL fail when a mini app imports another mini app's files, a main page, or the Worker's core, and SHALL name the file. An app's test files SHALL be exempt, since a test opens the app inside the main app. The supplied apps SHALL pass as shipped.

#### Scenario: One app reaches into another

- **WHEN** a change adds a mini app whose page imports a file from another mini app's folder
- **THEN** the `test` check fails and names the importing file

#### Scenario: An app built from the shared parts

- **WHEN** a mini app imports its own files, the ready-made parts, and the shared helpers
- **THEN** the folder rule reports nothing
