# Tasks

## 1. The script

- [x] 1.1 In `.agents/skills/routine/scripts/workspace.mjs`, after a successful `paseo run` that yields a workspace id, run `paseo workspace rename <workspaceId> <title> --json` with `childEnv(env)`, and report the applied title as `workspaceName`. On any rename failure, keep exit 0 and every field, leave `workspaceName` as Paseo's, and add a `warning` that the workspace kept Paseo's name. With no workspace line, extend the existing warning to say the name was not set. Join a fetch warning and a rename warning into one string. `--dry-run` also returns the rename command with a `<workspaceId>` placeholder. Update the header comment. Verify with the tests in 1.2.
- [x] 1.2 In `scripts/tests/workspace.test.mjs`, teach the fake `paseo` to answer `workspace rename` (logged, printing `{ workspaceId, title }`, or failing on `FAKE_RENAME_FAIL`). Assert: branch-off and checkout both rename the created workspace to `--title`, as one argv element, without the parent-agent variables, and report the new `workspaceName`; a refused rename still exits 0 with a warning; a missing workspace line makes no rename call; the dry run lists the rename and runs nothing. Verify with `node --test scripts/tests/workspace.test.mjs`.

## 2. Docs and release

- [x] 2.1 In `.agents/skills/plan/references/new-workspace.md`, say in the Open or Report section that the workspace carries the part's title in Paseo's list. Verify the page states it once.
- [x] 2.2 Bump `VERSION` to 26.2.0 (or the next minor after whatever `main` holds) and add a newest-first `CHANGELOG.md` entry in plain words. Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`; verify all pass.
- [x] 2.3 Save with `/save`, and verify CI passes on the pushed branch.
