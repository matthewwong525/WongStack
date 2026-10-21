# Spec Delta

## ADDED Requirements

### Requirement: Code that already passed skips its suite on the default branch

On a push to the default branch, the test check SHALL pass without running the shared checks when the pushed commit's code is identical to the head of the pull request it merged and that head's test check succeeded. The check SHALL say so in one line on the run page, naming the pull request. When the pull request, its head, or its result cannot be read, or the code differs, the shared checks SHALL run as before. The deploy workflow SHALL deploy production either way.

#### Scenario: A merge of exactly the tested code

- **WHEN** a squash merge lands on `main` and its code matches the pull request's head, whose test check passed
- **THEN** the test check passes without running the suite, with a note naming the pull request

#### Scenario: Main moved before the merge

- **WHEN** another change landed on `main` after the branch was tested, so the merged code differs from the pull request's head
- **THEN** the suite runs

#### Scenario: The branch result cannot be read

- **WHEN** the pull request's head check failed, is missing, or the lookup errors
- **THEN** the suite runs

#### Scenario: A direct push to main

- **WHEN** a commit reaches `main` with no pull request behind it
- **THEN** the suite runs
