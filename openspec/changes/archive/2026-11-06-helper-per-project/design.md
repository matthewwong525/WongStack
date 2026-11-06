# Design

## Context

One helper per computer before this change. `helper.mjs` installs `wongstack-helper.service`, whose launcher `~/.wong-stack/helper/run.mjs` runs the script named in `~/.wong-stack/helper/current.json` with `serve-inbox --service`. `pointCurrent` (`hand-over/scripts/lib/computer.mjs`) moves `current.json` to whichever project's `reply-link.mjs` has the higher `PROTOCOL`, and every session start runs `helper.mjs start`. That one service serves every folder in `~/.wong-stack/helper/folders.json`.

`checkRun` (`schedule/scripts/lib/app-runs.mjs`) gets the person from `signedInAs(origin)`, which imports the helper script's own `memory/scripts/lib/store.mjs`. A project whose sign-in reads a different place returns `missing` for another project's app, so that project's runs end `blocked not_approved`, with the right version in `approved.json`.

## Decisions

### Project id and files

`projectId(root)` is the primary checkout's folder name, lowercased to `[a-z0-9-]`, plus `-` and the first 8 hex of the sha256 of its real path: `notes-1a2b3c4d`. `helperFiles(env, root)` returns `~/.wong-stack/helpers/<id>/{run.mjs,current.json,runs.json,log.jsonl,out.log,inbox.json,items/}`. With no root it returns the legacy paths, so old callers and the shared service keep working.

Stay shared: `computer.json` (the app binds schedules to one computer id), `~/.wong-stack/helper/approved.json` (`approvalsFile` pins this path; keys already carry origin, email and key), and the page server under `~/.wong-stack/reply-link/`.

### Service

- Linux: one template unit `wongstack-helper@.service`, `ExecStart=<node> <HOME>/.wong-stack/helpers/%i/run.mjs`, enabled as `wongstack-helper@<id>.service`. Root or user mode as before.
- macOS: one `com.wongstack.helper.<id>` LaunchAgent per project.
- The launcher passes `serve-inbox --service --project <primary root>`.
- `helper.mjs install|uninstall|status|start` act on the calling project's helper. `start` compares `PROTOCOL` only among this project's own copies, never across projects.

### What a project helper serves

With `--project <root>`: app lines, schedule rounds and mirror rounds for that root only; inbox items only from its own `items/`; its own `inbox.json`; `takeInbox` signals only a process named in its own record.

With no `--project` (the shared launcher): serve `folders.json` minus every folder that has `~/.wong-stack/helpers/<id>/current.json`, so an old session can not take a project's schedules back.

### Leaving the shared helper

On `install`, each `start`, each round, and within a second of a change to `folders.json` or the shared `items/` (`guardShared`), a project helper:

1. removes its root from `~/.wong-stack/helper/folders.json`;
2. copies the started run ids and its own gaps (`<root>:<key>`) from the shared `runs.json` into its own ledger, so no run repeats and the minimum gap holds;
3. moves open items whose `app.cwd` is in its root from `~/.wong-stack/reply-link/items/` to its own `items/`.

Race note: until the shared helper's next round, it may claim one due run. Install at a quiet minute, not on the hour.

## Risks / Trade-offs

- A project on older code stays on the shared helper, and keeps the cross-project risk, until it updates and installs its own helper.
- Two lines from one computer id to two apps: the app keys the line per app origin, so they do not clash.
- The page server keeps its cross-project version race (`server.json` protocol); out of scope.
