## ADDED Requirements

### Requirement: CI runs on branch pushes, never on tag pushes

The core test workflow, the payload workflow, and the pack's deploy workflow SHALL run on pushes to branches and on pull requests, and SHALL NOT run on a tag push. A tag names a commit a branch push already tested and deployed; running again on the tag would deploy that commit to staging under the tag's name.

#### Scenario: A release tag is pushed

- **WHEN** a `v25.8.1` tag is pushed for a commit on `main`
- **THEN** no test, payload, or deploy workflow run starts for the tag, and staging keeps the branch it was serving

#### Scenario: A branch is pushed

- **WHEN** a commit is pushed to any branch
- **THEN** the test, payload, and deploy workflows run as before
