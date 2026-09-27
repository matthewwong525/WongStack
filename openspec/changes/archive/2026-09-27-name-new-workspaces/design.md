# Design

## Context

`.agents/skills/routine/scripts/workspace.mjs open` runs one `paseo run -d --new-workspace worktree … --title <part> <brief> --json`. In Paseo 0.9.2, `--title` names the agent only. `run.js` creates the workspace with `client.createWorkspace({ source })` and a to-do to pass the prompt for workspace titling, so the workspace's name falls back to the worktree slug (`green-cow`). The script already parses the workspace id from Paseo's stderr line `Created workspace <id> - <name> (<branch>)`.

`paseo workspace rename <workspace-id> <title> --json` sets the user-visible title and prints `{ "workspaceId", "title" }`; it refuses an empty title and excess positional arguments.

## Goals / Non-Goals

**Goals:** every workspace `workspace.mjs` opens, branch-off or checkout, shows `--title` in Paseo's list.

**Non-Goals:** naming the worktree folder or branch (`--worktree-slug`, `--new-branch`), and schedule-run workspaces, which Paseo's scheduler creates without this script.

## Decisions

- **Rename after the run.** When `parseCreated` finds a workspace id, call `runPaseo(bin, ['workspace', 'rename', id, title], { env: childEnv(env) })`. The title is one argv element, so a multi-word title is never split. Report `workspaceName` as the applied title from the rename's JSON. Rejected: `paseo workspace create --title` then `paseo run --workspace <id>`, because a failed run would leave an empty workspace behind, and it adds a second creation path to parse.
- **A failed rename is a warning.** The workspace and agent already exist, so the script still exits 0 and returns every field, with `workspaceName` left as Paseo's and a `warning` naming the refusal. A missing workspace line already warns; its warning now also says the name could not be set. A daemon that stops answering between the two calls is the same warning, not exit 4, because something was opened.
- **Warnings join.** A fetch warning and a rename warning can both occur; the script joins them into one `warning` string, so callers keep reading one field.
- **The dry run shows both commands.** `--dry-run` adds a `rename` entry beside `command`, with `<workspaceId>` as a placeholder, so a reader sees the whole plan.
- **The reference stays short.** `new-workspace.md`'s Report already says to add the script's `warning`; one clause says the workspace carries the part's title, so the report line's `"<title>"` is what the person sees in the list.

## Risks / Trade-offs

- [A later Paseo titles workspaces itself] → the rename sets the same title; harmless.
- [The rename lands a moment after the workspace appears] → the list shows the slug briefly, then the title.
