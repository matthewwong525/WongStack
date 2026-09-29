# Tasks

## 1. Dependency manifests and locks

- [x] 1.1 Run the dependency updater and verify both package stages complete with refreshed lockfiles and matching Vitest/coverage 5.0.2 peers.
- [x] 1.2 Review Vitest 5 migration notes against the existing config and tests; record applicable behavior and preserved checks in the design.
- [x] 1.3 Record current OpenSpec/browser tools and the deferred host-tool step; verify the script's contract stage reports skipped because OpenSpec did not move.

## 2. Release and handoff

- [x] 2.1 Add the pending patch release entry without changing VERSION; verify payload links and OpenSpec config.
- [x] 2.2 Create the change artifacts and review page; verify strict change validation and complete planning status.

## 3. Integration checks

- [x] 3.1 Use `/save` to commit and push the update, then verify app Test (including the existing 100% coverage floor), Deploy, and Payload checks pass; fix any migration failures in the same change.
