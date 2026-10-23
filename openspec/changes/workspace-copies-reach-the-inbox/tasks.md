# Tasks

## 1. Company sign-in (scripts)

- [x] 1.1 In `scripts/employee-bootstrap.mjs`, let `installed()` fall back to the origin of `components.memory.worker` when `companyApi.origin` is absent; keep `target()`'s changed-origin guard on `companyApi.origin` only.
- [x] 1.2 Make `login` from a copy that records an app also keep the sign-in in that app's per-app folder, if it doesn't already, so every copy of the project finds it.
- [x] 1.3 Tests in `scripts/tests/employee-bootstrap.test.mjs`: a worktree with only a memory record finds the per-app sign-in; a sign-in for another app is not used; the changed-origin guard is unchanged.
- [x] 1.4 Let a workspace borrow its main copy's own sign-in, same app only, when neither its own nor the app's folder holds one; test it.

## 2. Workspace launcher (schedule skill)

- [x] 2.1 Confirm `paseo run` reads everything after `--` as the prompt, with a call that fails before any agent starts.
- [x] 2.2 In `.claude/skills/schedule/scripts/workspace.mjs`, pass `--json` before the brief and `--` ahead of it, and drop the "must not start with -" refusal; fall back to a title line only if 2.1 fails.
- [x] 2.3 Update the launcher's test: a brief starting `- **Goal**` gives `run` arguments ending `--`, the brief.
- [x] 2.4 Place `--json` just before the closing `--`, so a title of `--` keeps its place; test it.

## 3. Release

- [x] 3.1 Add a `## Next (patch)` entry to `CHANGELOG.md`: daily's inbox works from every workspace, and list-shaped briefs open their workspace.

## 4. Verification

- [x] 4.1 Run `node .github/scripts/checks.mjs --worktree` as a pre-check.
- [ ] 4.2 After `/save`, from a fresh workspace with no login of its own, run `D open --plan-first` with a list-shaped test brief and `D inbox add --kind start`: the agent opens and its card reaches the live inbox. Close the test agent, workspace and card after.
