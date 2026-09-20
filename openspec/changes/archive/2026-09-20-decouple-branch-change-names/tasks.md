## 1. Change evidence and skills

- [x] 1.1 Add and test a shell helper that lists active and archived change folders touched by local files or the branch diff, per review.html#/select/after.
- [x] 1.2 Update `/apply` to select a unique change from that evidence before branch-name fallback, per review.html#/select/after.
- [x] 1.3 Update `/save` to use the selected change, write its actual branch to the proposal, and keep change-named notes and archive handoffs, per review.html#/resume/after.
- [x] 1.4 Update `/continue` to resolve a saved change from its recorded branch or a PR head, with legacy fallback, per review.html#/resume/after.
- [x] 1.5 Update `/ship` to validate and archive the selected change and stop on another active change in the branch diff, per review.html#/select/after.
- [x] 1.6 Update `/verify` to scout the selected active or ship-time archived change without inferring its name from the branch.

## 2. Contracts and documentation

- [x] 2.1 Update `AGENTS.md`, the change loop, notes convention, and OpenSpec config so each describes independent branch and change names.
- [x] 2.2 Add fixture coverage for clean committed changes, untracked changes, and multiple candidates in the existing script test suite.

## 3. Release

- [x] 3.1 Bump `VERSION`, add a newest-first `CHANGELOG.md` entry, and run the payload link and OpenSpec config checks.
