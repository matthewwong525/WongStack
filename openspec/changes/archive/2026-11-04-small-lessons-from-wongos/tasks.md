# Tasks

## 1. App: board actions for agents

- [x] 1.1 In `app/worker/apps/inbox/tasks/week-routes.ts`, make `inbox.task-change` and `inbox.task-delete` agent-available with `confirmWith: "inbox.daily-tasks"` and one example each; verify `npm test` in `app/` passes the action contract checks.
- [x] 1.2 In `week-routes.test.ts`, add a test that both actions are listed for the owner's agent, and that a non-owner's delete is refused and the task stays; verify it passes.

## 2. Docs

- [x] 2.1 `wiki/development/login-codes.md`: add the Google passkey and address-start bullets under *Approve on your phone*, with no WongOS names; verify by reading the page.
- [x] 2.2 `wiki/stack/d1-recovery.md`: add the renamed-migration paragraph with `<staging-db-name>` and no PR reference; verify by reading the page.
- [x] 2.3 `wiki/development/live-view.md`: add Messenger's signed-in address and why `--until-gone` closes too early there; verify by reading the page.
- [x] 2.4 `wiki/development/daily.md`: add the *Clean up my board* bullet under *The week board*: read with `inbox.daily-tasks`, change or delete with `inbox.task-change` / `inbox.task-delete`, list the deletes and ask one time; verify by reading the page.
- [x] 2.5 ~~`wiki/stack/testing.md`: add the Vitest cache paragraph~~ dropped: Vitest keeps no compiled files here (see the Decision log).
- [x] 2.6 `CHANGELOG.md`: add a `## Next (minor) — Small lessons from WongOS that help every install` entry; verify `node scripts/check-payload-links.mjs` passes.

## 3. Verification

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree`; verify it exits 0.

## 4. Fix from the preview check

- [x] 4.1 `app/worker/api/contract.ts`: a query-encoded action (such as `DELETE /apps/inbox/api/task?id=…`) refuses only a non-empty body, because the deployed Worker gives a `DELETE` an empty, non-null body and every such delete answered 400 `This action takes no request body.` on the preview; add a test in `app/worker/api/contract.test.ts` with an empty-stream body that passes and a non-empty one still refused; verify `npm test` in `app/`.
