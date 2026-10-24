## 1. Name every opened workspace in plain words

- [x] 1.1 Add `workspaceTitle()` to `.agents/skills/schedule/scripts/workspace.mjs`: convert a slug title to words, refuse a placeholder with exit 2, and use the result for `paseo run --title`, the rename, and the dry run.
- [x] 1.2 Add cases to `scripts/tests/workspace.test.mjs`: a slug becomes words on both `run` and `rename`, `main` and `hello-world` exit 2 with no Paseo call, and an ordinary title passes unchanged; update the `add-auth` pickup case.

## 2. Instructions

- [x] 2.1 In `.agents/skills/plan/references/new-workspace.md`, say what a good title is, that every workspace opens through `workspace.mjs` (a raw `paseo run --new-workspace` keeps the branch as its name), and title the pickup by the plan's `#` heading.
- [x] 2.2 Add the one-line reason to `wiki/development/the-change-loop.md`'s *Several parts, several workspaces*.
- [x] 2.3 Add a `## Next (patch)` entry to `CHANGELOG.md`.

## 3. Verify

- [x] 3.1 Run `node --test scripts/tests/workspace.test.mjs` and `node .github/scripts/checks.mjs --worktree`, including `measure-context.mjs --check`; offset any added skill words.
