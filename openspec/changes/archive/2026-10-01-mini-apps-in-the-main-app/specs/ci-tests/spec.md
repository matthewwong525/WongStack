## MODIFIED Requirements

### Requirement: A change that leaves the main app untouched skips its suite

When everything a branch changes against the default branch is under `wiki/` or `openspec/`, or ends in `.md`, the check SHALL pass without running the main app's suite. A change to a mini app SHALL run the suite, like any main-app change. The comparison SHALL cover the whole branch, and when it cannot be made, the suite SHALL run.

#### Scenario: A docs-only branch

- **WHEN** a branch changes only wiki pages and a `README.md`
- **THEN** the check passes with a note that the change is docs-only

#### Scenario: A docs commit on top of code

- **WHEN** a branch's last commit changes only a `.md` file but an earlier commit changed code
- **THEN** the suite runs
