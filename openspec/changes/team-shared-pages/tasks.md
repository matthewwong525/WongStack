# Tasks

## 1. Data and server

- [x] 1.1 Add the migration in `schema/migrations/` (`plain` column, `inbox_shares` table and indexes); verify a migration test beside `link-migration.test.ts` applies it on the last schema and keeps old rows.
- [x] 1.2 `item-put` takes `plain` (only with `kind: "plan"` and no actions, else `bad_plain`); a plain page's `closes_at` is the time it was put. `item` and `reviews` return `plain` and `shared`; add the new error codes to `store.ts`. Verify with tests in `api.test.ts`.
- [x] 1.3 Add `share.ts` (`share`, `share-stop`, `frame`, the sealed headers, `linksOpenOwnTab`) and the teammate routes `shared` and `shared-frame`; register them in `api.ts`. Verify tests: a second share gives the same token; another person's share or stop is refused; a stopped link answers 410 and stays stopped after a new share; a gone page answers 404; a machine credential is refused; the frame carries the sandbox CSP.

## 2. Inbox screens

- [x] 2.1 Add `leave.ts`, `PageFrame`, `ShareControls` and `SharedNote`; a plain page opens from `frame` with the share controls; a review page shows them too. Match `pages/page-new.html` and `pages/page-shared.html`. Verify `PlanView.test.tsx` and a `leave.test.ts`.
- [x] 2.2 Add the teammate's view at `?shared=<token>`: title, *Shared by*, updated date, the sealed page read-only; *This page is no longer shared* and *This link does not exist*; Retry on an error. Match `pages/shared-view.html` and `pages/shared-stopped.html`. Verify with a view test.
- [x] 2.3 The Archive line says *Page* and *Shared*, as `pages/archive-after.html`. Verify `Archive.test.tsx`.

## 3. The `/page` skill

- [x] 3.1 Add `.agents/skills/page/SKILL.md` and `scripts/page.mjs` (inline files with the review builder's checks, size warn and stop, `--id`, `--share`, `<base target="_blank">`); `reply-link`'s inbox helper passes `plain`. Verify `page.test.ts`: a web address is refused and named; a page over 1.5 MB stops; `linksOpenOwnTab` and its twin in `page.mjs` give the same result on the same pages.
- [x] 3.2 Register the skill wherever skills are listed (payload manifest, `payload-files.json`, `.claude/skills` link), and cut instruction words to stay under the context budget. Verify `node scripts/measure-context.mjs --check`.

## 4. Docs and release

- [x] 4.1 Write `wiki/development/plain-pages.md` (a plain page, share with team, why and edge cases), link it from `wiki/development/README.md`, `wiki/review-pages.md`, and `wiki/development/reply-links.md`. Verify `node scripts/check-payload-links.mjs`.
- [x] 4.2 Add the `team-shared-pages` area to `.agents/memory/areas.json`, and a `## Next (minor) — Make a page and share it with the team` entry to `CHANGELOG.md`. Verify `memory-areas.test.mjs`.
- [x] 4.3 Give every Inbox page one updated time: the migration adds `updated_at` (old rows take `created_at`), each `item-put` sets it, and `shared` returns it for both kinds; a plain page's `closes_at` stays its put time. Verify in `share.test.ts`: a review page put again after a `later()` step moves its shared date; `shares-migration.test.ts` passes.
- [x] 4.4 Verify in `share.test.ts` that a signed-in person who may not open the Inbox is refused on `shared` and `shared-frame`.
- [x] 4.5 Name the cuts to `wiki/voice.md` and `wiki/development/reply-links.md` in the Decision log's budget line. Verify `node scripts/measure-context.mjs --check`.

## 5. Checks

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and the app's tests; all pass.
- [ ] 5.2 `/save`, then open the preview: put a `/page --share` page, open its link in a second signed-in session, then stop it and see the old link refuse.
