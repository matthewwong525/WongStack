# Tasks

## 1. Thinking floor

- [x] 1.1 Add `floorThinking`, `modelDefault`, and `flooredThinking` to `workspace.mjs`; the launcher floors the caller's level and reports `thinking`.
- [x] 1.2 `openSession` and `openDaily` pass the floored `--thinking`.
- [x] 1.3 Tests: the floor rule, the model-default read, a low, high, and unset caller, a schedule run, and the Daily chat.

## 2. Workspace names in the Daily

- [x] 2.1 `workspaceOf`, `readChats`, the chief's `admit` and `hand` use the workspace name from `paseo workspace ls`; `cwd` keeps the folder, and a folder name still finds the chat.
- [x] 2.2 Tests: named and unnamed workspaces, and a reply by folder name.

## 3. Docs and release

- [x] 3.1 The launcher-only rule in `new-workspace.md` and `required-tools.md`.
- [x] 3.2 A `Next (minor)` changelog entry.
