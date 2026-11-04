## ADDED Requirements

### Requirement: A docs-only push reuses the branch's last pass

On a push to a branch other than the default branch, the test check SHALL skip the main app's suite when an earlier commit of the same branch passed the `test` check, after its suite ran or after this same reuse, and every path changed since that commit is docs (under `wiki/` or `openspec/`, or ending in `.md`). The docs, loosened-check and skill checks SHALL still run on the whole change, and the run summary SHALL name the reused commit. In every other case, including no earlier pass, a code path changed since, or a comparison or API error, the suite SHALL run.

#### Scenario: A change files its plan away

- **WHEN** the suite passed on a branch's code commit, and the next push only moves the change's plan into the archive
- **THEN** the `test` check passes without the suite, still runs the docs and loosened checks, and its summary names the commit that passed

#### Scenario: Code changed after the last pass

- **WHEN** any path outside the docs paths changed since the last commit that passed, or no earlier pass can be found or read
- **THEN** the suite runs
