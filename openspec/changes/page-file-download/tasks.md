# Tasks

## 0. Port source

- [x] 0.1 Read the source app's final code for `page-file-download` from its archived change on `origin/main` in `/root/.paseo/worktrees/1jg7klsi/smart-dolphin` (read only), or, while its pull request is open with all tasks done, from that pull request's head; read `packages/handlers/inbox/page-files.ts`, `files.ts`, `item-put.ts`, `item.ts`, `api.ts`, `store.ts`, `shared-pages.ts`, `packages/spa/pages/inbox/downloads.ts`, `PlanView.tsx`, `SharedPage.tsx`, `.agents/skills/page/scripts/page.mjs`, their tests, and `docs/development/plain-pages.md`. Record in design.md each way it differs from this plan.

## 1. Store and serve a page's files

- [x] 1.1 Add the timestamp migration `schema/migrations/<timestamp>_inbox_page_files.sql` with both tables in design Decision 1; verify the inbox tests' database applies it.
- [x] 1.2 `files.ts`: export `safeName`, `typeOf` and the first-bytes check from `TYPES`, with no change to `POST file`. Verify in `files.test.ts`.
- [x] 1.3 Add `app/worker/apps/inbox/page-files.ts`: raw `PUT page-file` (parts, 25 MB, 1 GB an app, sha256, first bytes for a known ending, the caller's own plain page, no other site's `Origin`) and `GET page-file` (the caller's own file, headers per design Decision 5); wire both in `api.ts`, and keep a route's own `Cache-Control`. Verify with `page-files.test.ts`: upload + download, another person refused, too large refused, app full refused, bad name refused, wrong hash refused, a `.pdf` that isn't one refused, an `.xlsm` taken as plain bytes, headers.
- [x] 1.4 `item-put.ts` takes `files` (at most 5, only with `plain`): checks each upload is whole, writes rows with the item in one batch, deletes rows and parts the list drops; `file-rows.ts` clean-up deletes unnamed parts after a day and the files of a removed item; `GET item` returns the page's files. Verify in `page-files.test.ts`: a replaced page drops its old file; a file named but never uploaded refuses the put.
- [x] 1.5 `share.ts`: `GET shared-file?token=&name=` for an open link only (410 stopped, 404 missing, 403 service token), and the page's files in `GET shared`. Verify in `share.test.ts`.

## 2. The app's Download button and auto download

- [x] 2.1 `app/src/apps/inbox/downloads.ts` + `api.ts`: the files' download links, and whether the address asks for a download and the address without it. Verify in `downloads.test.ts`.
- [x] 2.2 `PlanView.tsx`: a plain page with files shows **Download** beside Share with team, as `pages/after.html`; with `download=1`, download each file once after load, then drop `download` (replace); from the Archive, no download. Verify in `PlanView.test.tsx`.
- [x] 2.3 `SharedView.tsx`: show Download and download the files on open for an open link; a stopped link downloads nothing. Verify in `SharedView.test.tsx`.

## 3. The page command

- [x] 3.1 `page.mjs` + `reply-link/scripts/lib/inbox.mjs`: `--file <path>` (repeatable, at most 5, folder optional); with no folder, write the default file page (title + name/size rows); upload each file raw, then put the page with `files`; print `…/apps/inbox/?item=<id>&download=1`. Verify in `scripts/tests/page.test.mjs`: default page HTML, limits, upload before put, printed link.

## 4. Put the review on the card

- [x] 4.1 `.agents/loop/ask-check.mjs`: port the source app's review-block check and its `REASON`/`REMINDER` wording; `.agents/plugins/daily/scripts/chief.mjs` `askText` drops *Don't repeat the report* the same way. Verify with the source app's cases in `scripts/tests/ask-check.test.mjs` and the daily check's tests.
- [x] 4.2 `asking-the-user.md`: add *Put the review on the card* after *End every reply with the next step*, naming `/page`, and link it from that rule.

## 5. Docs and the rule for agents

- [x] 5.1 `wiki/development/plain-pages.md` (*A page with files*: how it downloads, limits, team link, why D1), `.agents/skills/page/SKILL.md` (the `--file` step, triggers "send me the file", "share this file"), one line in `AGENTS.md` Rules, and a `CHANGELOG.md` `## Next` entry. No source-app names, addresses, or paths.

## 6. Checks

- [x] 6.1 Run `node scripts/payload-checks.mjs`, `(cd app && npm test)`, the c8 `scripts/tests` run, and `node scripts/measure-context.mjs --check` (trim, or log a ceiling raise in design.md); confirm the diff names the source app nowhere.
- [ ] 6.2 On the preview, via `/save`: put a page with a file through `page.mjs`, open its link (downloads), open it from the Archive (no download until Download), open its team link (downloads). Before the merge, confirm the source app's change is archived on its `origin/main` and port any change made after the pull request head that was read.
