# Tasks

## 1. Close plan pages through the app

- [x] 1.1 In `lib/inbox.mjs`, add `waitingReviews(client, q)` on `GET reviews?q=`; in `reply-link.mjs`, export `closePlanPages(cwd, name)` (end local records titled `Review · <name>`, then `item-close` each waiting review with that exact title) and a `close-plan <name>` command printing `PLAN_PAGE=closed=<n>` or `PLAN_PAGE=skipped (<reason>)`; extend `scripts/tests/reply-link-inbox.test.mjs` with a stand-in app: exact title closed, a near title kept, no app → skipped.
- [x] 1.2 In `reply-link.mjs`, make `clientsFor` fall back to a `readApps` folder whose client targets the record's `app.origin`, and make `endItem` keep the record while `closeItem` fails and the deadline is ahead; extend the inbox test: a record whose folder is deleted closes in its app through another folder; with no folder for that app, the record stays until its deadline.

## 2. Ship and the page builder

- [x] 2.1 In `ship.mjs finish`, after `merged=yes`, find the shipped change's name from the branch's archive folder and call `closePlanPages`, printing `PLAN_PAGE=`; a throw prints a reason, never a failed ship. Add the one report line to `.agents/skills/ship/SKILL.md` Step 5 within the context budget; extend `scripts/tests/ship-commands.test.mjs`.
- [x] 2.2 In `build-review.mjs`, `--link` on a change root under `openspec/changes/archive/` prints the file and opens no link; add a test.

## 3. Docs and release

- [x] 3.1 In `wiki/development/reply-links.md`, say a plan also closes when its change ships, and a closed chat's page still closes; add a `## Next (patch) — A shipped plan leaves Needs you` CHANGELOG entry with no hand step.

## 4. Checks

- [x] 4.1 Run `node --test scripts/tests/reply-link-inbox.test.mjs scripts/tests/reply-link.test.mjs scripts/tests/ship-commands.test.mjs` and the build-review test, `node scripts/measure-context.mjs --check`, `node scripts/check-payload-links.mjs`, and `node .github/scripts/checks.mjs --worktree`; all pass.
- [ ] 4.2 `/save`, then CI passes.
