# Tasks

## 1. The profile

- [x] 1.1 Point `closeWorkspace` and `newWorkspace` in `.agents/loop/profile.mjs` at `browser/skills/hand-over/` and `daily/skills/schedule/`; verify `node .claude/plugins/loop/scripts/slot.mjs newWorkspace scratch` prints a scratch folder.
- [x] 1.2 Add a test that runs `closeWorkspace` and both `newWorkspace` forms with a stand-in `node` and asserts each script path exists; verify it fails on the old paths and passes on the new ones.
- [x] 1.3 Add a `## Next (patch)` entry to `CHANGELOG.md`; verify `node scripts/check-module-versions.mjs` passes.

## 2. Checks

- [x] 2.1 Run the link, name, size, comment and plan checks and the profile, slot, workspace and tidy tests; verify they pass. The full local pre-check runs again when the release is numbered.
