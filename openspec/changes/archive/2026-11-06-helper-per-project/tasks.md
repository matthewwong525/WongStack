# Tasks

## 1. Helper code and tests

- [x] 1.1 `lib/computer.mjs`: add `projectId(root)` and `helperFiles(env, root)` per project; keep the no-root legacy paths; add `leaveShared` and `guardShared` by design.md.
- [x] 1.2 `schedule/scripts/lib/approvals.mjs`: pin `approvalsFile` to `~/.wong-stack/helper/approved.json`.
- [x] 1.3 `helper.mjs`: template unit `wongstack-helper@.service` and a LaunchAgent per project; the launcher passes `--project`; `install|uninstall|status|start` act on the calling project; `start` compares `PROTOCOL` only within the project and calls `leaveShared`.
- [x] 1.4 `reply-link.mjs`: `serve-inbox --service --project <root>` serves that root only; no `--project` serves `folders.json` minus projects with their own helper; `openInboxItem` writes to the project's `items/`; `PROTOCOL` 14.
- [x] 1.5 Tests in `scripts/tests/{helper,reply-link-inbox,live-line,schedule-app}.test.mjs`.

## 2. Docs and release

- [x] 2.1 `wiki/stack/live-line.md`: one helper per project, its unit name and files, the old shared helper.
- [x] 2.2 `CHANGELOG.md` `## Next (minor)` entry with its *Updating* note.

## 3. Checks

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree` and fix what fails.
