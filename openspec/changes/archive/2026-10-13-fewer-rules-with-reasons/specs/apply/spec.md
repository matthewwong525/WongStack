# Spec Delta

## MODIFIED Requirements

### Requirement: The parent waits quietly while a helper builds

While a build helper works, the parent SHALL wait for its report with the longest wait the host allows, so the build does not fill the conversation. It SHALL NOT poll the helper at short intervals, narrate each wait, read the files the helper is editing, or message it except to pass on the person's answer or a stop.

#### Scenario: A long build

- **WHEN** a helper builds for forty minutes without a question
- **THEN** the parent's only actions until the helper's report are waits

#### Scenario: The person speaks mid-build

- **WHEN** the person sends a new instruction while the helper builds
- **THEN** the parent passes it to the helper or stops the helper, and resumes waiting

### Requirement: Preview pictures precede the publish choice

When a finished `/apply` has a preview and is asking what to do next, it SHALL show the screens that changed as pictures in the chat before the multiple-choice question, each with a short plain caption. Pictures SHALL depict the current preview, stay outside tracked files, and follow existing screenshot privacy safeguards. Pictures SHALL NOT add a save, publishing gate, or confirmation to an already authorized `/ship`.

#### Scenario: Two changed screens can be shown

- **WHEN** a finished `/apply` has a reachable preview with two changed screens
- **THEN** the chat shows both screens with captions before the publish, change more, or save question, and retains the preview link

#### Scenario: Pictures are unavailable

- **WHEN** the preview cannot be captured or the app has no changed screen
- **THEN** `/apply` says why pictures are unavailable, retains any preview link, and still asks what to do next

### Requirement: A fresh helper builds the tasks

Where the host can start one, a fresh helper agent SHALL build the change's tasks, so the build does not carry the planning conversation. The helper SHALL NOT ask the person, run git, save, or upload a preview, and SHALL NOT report while a helper or check it started is still running. It SHALL return on a question, a blocker, or the whole implementation; the parent SHALL handle a question or blocker and start a new helper for the rest when appropriate. A host with no helper SHALL build inline with the same outcome.

#### Scenario: An ambiguous task

- **WHEN** the helper cannot finish a task without the person's decision
- **THEN** it returns the question, the parent asks the person, and a new helper works the remaining tasks

#### Scenario: No helper available

- **WHEN** the host cannot start a helper agent
- **THEN** `/apply` works the tasks inline with the same outcome
