# Design

## Context

WongOS (`/root/WongOS`, `origin/main`) is an install that edits its own copies of WongStack pages. A diff of each named file against this repo found:

| Lesson | WongOS | Here |
|---|---|---|
| Google passkey and address check | `wiki/development/login-codes.md`, two bullets under *Approve on your phone* | missing |
| Renamed migration on staging | `wiki/stack/d1-recovery.md`, one paragraph | missing |
| Messenger live view | `wiki/development/live-view.md`, step on `--url` | missing |
| Sample-data rule | `kept-checks.md`, `staging-walkthrough.md`, `.agents/rules/code.md` | already the same |
| Board cleanup | `wiki/development/daily.md`, raw `DELETE`/`PATCH /api/tasks/<id>` with a `cf-access-token` | no such route; `inbox.task-change` and `inbox.task-delete` exist but `agentAvailable: false` |
| Vitest cache | `wiki/stack/testing.md`, one paragraph | not sent: `fsModuleCache` is off in both repos, so Vitest keeps no compiled files between runs |
| Deploy record on the PR head | `.github/workflows/deploy.yml`, `SHA: pull_request.head.sha \|\| github.sha` | the `deploy` job runs only on `push`, so the line never applies |

## Goals / Non-Goals

**Goals:** port each lesson in WongStack's own terms; strip WongOS names (`wong-db-staging`, PR 265, dates of WongOS incidents).

**Non-Goals:** the other four sync parts; WongOS's *What WongOS runs* testing section; `daily.mjs` or skill text changes.

## Decisions

- **Board cleanup through actions.** Set `agentAvailable: true` and `confirmWith: "inbox.daily-tasks"` on `inbox.task-change` and `inbox.task-delete`, each with one example, so `company-api.mjs list --q task` finds them. `boardAction`'s owner check stays the guard. Alternative: document WongStack's raw route with an Access token, as WongOS does; rejected, because the catalogue rule says skills call described actions and a raw call skips input checks in discovery.
- **Confirm before delete.** The daily page says the agent lists the deletes and asks one time. Rename and move need no ask: the person can undo them on the board.
- **No daily skill line.** The daily page owns the board ([`daily.md`](../../../wiki/development/daily.md#the-week-board)), the skill already links it, and the skill text budget is tight. An agent finds the actions by `company-api.mjs list --q task`.
- **Placeholders, not names.** The renamed-migration fix uses `<staging-db-name>` from `app/wrangler.jsonc` and `--env staging`, as the page's other commands use `<db-name>`.

## Risks / Trade-offs

- [A background run could delete a task] → the check-ins' rule already says it never deletes alone, and each brief allows only its own steps.
- [WongOS still carries a dead `SHA:` line] → the sync report says it can drop it at its next sync.
