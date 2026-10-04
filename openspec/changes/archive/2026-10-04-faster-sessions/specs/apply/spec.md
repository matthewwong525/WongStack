# Spec Delta

## MODIFIED Requirements

### Requirement: A fresh helper builds the tasks

Where the host can start one, a fresh helper agent SHALL work the change's implementation and test-authoring tasks, and it SHALL NOT ask the person, run git, save, or upload a preview. It SHALL execute no test before the whole implementation is authored; after that it SHALL run the local checks where the machine has the tools and repair what they find. It SHALL return on a question, a blocker, or completion of the whole implementation; final verification SHALL follow implementation. The parent SHALL handle a question or blocker and start a new helper for the rest when appropriate. A host with no helper SHALL build inline with the same verification timing.

#### Scenario: An ambiguous task

- **WHEN** the helper cannot finish a task without the person's decision
- **THEN** it returns the question, the parent asks the person, and a new helper works the remaining tasks

#### Scenario: No helper available

- **WHEN** the host cannot start a helper agent
- **THEN** `/apply` works the tasks inline with the same outcome and defers tests until implementation is complete

## ADDED Requirements

### Requirement: The parent waits quietly while a helper builds

While a build helper works, the parent SHALL wait for its report with the longest wait the host allows. It SHALL NOT poll the helper at short intervals, read the files the helper is editing, or message it except to pass on the person's answer or a stop. Progress notes to the person SHALL be at most one short line per wait.

#### Scenario: A long build

- **WHEN** a helper builds for forty minutes without a question
- **THEN** the parent's only actions until the helper's report are waits, each followed by at most one short note

#### Scenario: The person speaks mid-build

- **WHEN** the person sends a new instruction while the helper builds
- **THEN** the parent passes it to the helper or stops the helper, and resumes waiting
