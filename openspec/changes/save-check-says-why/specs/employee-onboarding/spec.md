## ADDED Requirements

### Requirement: A save that fails where the project is kept says why
When where the project is kept turns a save down, can't be reached, or answers in a way the app can't read, the app SHALL refuse the save with a line Git prints that names the place and either its answer's status number or that it could not be reached or read. The line SHALL NOT carry the place's own words, a key or a sign-in. The app SHALL write one log line per such failure naming who saved, the branch, the failed step, the status and the error's kind, and SHALL NOT log a key, a sign-in or the place's answer.

#### Scenario: GitHub turns the key down
- **WHEN** a person saves a change and GitHub answers 403
- **THEN** Git prints that GitHub answered 403, and the app's log holds one `code_save_failed` line with the status and no key

#### Scenario: GitHub can't be reached
- **WHEN** the call to GitHub fails before any answer
- **THEN** Git prints that GitHub could not be reached
