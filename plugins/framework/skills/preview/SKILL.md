---
name: preview
description: Get a shareable per-commit preview URL for the current branch — pushes, opens/updates a PR, snapshots the session into a handoff issue, waits for all GitHub checks to pass (auto-fixing CI failures), and returns the auto-discovered preview URL. Does NOT build locally and NEVER merges (that's /ship). This is an alias for /save — same end-to-end runbook. Use when you want a preview of in-progress work.
user-invocable: true
---

# /preview

`/preview` is an **alias for `/save`** — they run the exact same end-to-end runbook.

**Invoke the `save` skill** (via the Skill tool, `framework:save`) and follow it verbatim. It:

1. Pushes the current branch (auto-creating a branch off the default branch / detached HEAD and auto-committing a dirty tree if needed) and opens or updates the PR.
2. Snapshots the session into a durable GitHub handoff issue (the current plan, resumable with `/continue`) **while CI runs** — so the issue work costs no extra wall-clock.
3. Waits for every GitHub check to pass, reading and auto-fixing CI failures until green (cap 3 attempts).
4. Reports the PR, the handoff issue, the CI status, and the auto-discovered **preview URL**.

There's no separate preview-only behavior to maintain here — all of it lives in `save`. The only difference is emphasis in the final report: when the user reached this via `/preview`, lead with the preview URL.
