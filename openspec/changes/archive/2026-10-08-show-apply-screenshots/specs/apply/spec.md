## ADDED Requirements

### Requirement: Preview pictures precede the publish choice

When a finished `/apply` has a preview and is asking what to do next, it SHALL show two useful screenshots of the changed screens in the chat before the multiple-choice question, each with a short plain caption. When only one meaningful view exists, it SHALL show one. Screenshots SHALL depict the current preview, stay outside tracked files, and follow existing screenshot privacy safeguards. Pictures SHALL NOT add a save, publishing gate, or confirmation to an already authorized `/ship`.

#### Scenario: Two changed screens can be shown

- **WHEN** a finished `/apply` has a reachable preview with two changed screens
- **THEN** the chat shows both screens with captions before the publish, change more, or save question, and retains the preview link

#### Scenario: Pictures are unavailable

- **WHEN** the preview cannot be captured or the app has no changed screen
- **THEN** `/apply` says why pictures are unavailable, retains any preview link, and still asks what to do next without showing unrelated pictures
