# Tasks

## 1. Private-link defaults

- [x] 1.1 Set all private-link defaults to 480 minutes and align CLI help/comments; review preserves explicit overrides and early closure.
- [x] 1.2 Extend existing private-link tests to cover eight-hour deadlines for password, form, and key modes plus explicit overrides; author before running checks.

## 2. Documentation and release

- [x] 2.1 Update browsing, passwords, and secrets pages for the shared eight-hour default; review removes obsolete live timing claims without editing historical fixtures or archives.
- [x] 2.2 Add a minor Next changelog entry with no manual update steps; confirm VERSION unchanged.

## 3. Final verification

- [x] 3.1 After all implementation is authored, run affected private-link tests and required worktree checks, including payload links and OpenSpec config; record observed results.

Observed verification: worktree pre-check passed after repairing the remaining key deadline assertion and tightening wiki wording. Private-link tests passed in the full script suite; payload links, OpenSpec config, specs, and context budget passed. The unchanged app suite passed all 415 tests on rerun. No checks were loosened.
