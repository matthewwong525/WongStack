# Tasks

## 1. Store and config

- [x] 1.1 Start from `main` with PR #619 (`reply-links-skip-the-tunnel`) merged; stop and report if it is not.
- [x] 1.2 Add the migration `schema/migrations/20261125120000_inbox_page_store.sql`, named by hand (design Migration Plan step 1). Verify the inbox test fixture applies it.
- [x] 1.3 Make the buckets `wongstack-inbox` and `wongstack-inbox-staging` with the `.env` Cloudflare key; bind `INBOX_PAGES` in `app/wrangler.jsonc` (production, `env.staging`, `env.local`) and as optional in `app/worker-configuration.d.ts`; a binding is no secret, so `scripts/cf-secrets.mjs` needs no change. Verify with `node scripts/cf-secrets.mjs` parity and its tests.
- [x] 1.4 Add the inbox buckets to `.agents/skills/wong-setup/scripts/provision.mjs` (`namesFor`, `nameList`, `wranglerConfig`, the bucket-binding insert) and the stack-pack wrangler fragment, kept or dropped with R2 as the memory bucket is (design D5). Verify with `scripts/tests/provision.test.mjs` cases: R2 on → both buckets and the binding; R2 off → neither.

## 2. Worker

- [x] 2.1 Add `app/worker/apps/inbox/page-store.ts` (bucket or database parts; `storeUpload` moves in from `page-files.ts`) and `page-info.ts` (the three parsers moved from `app/src/apps/inbox/frame.ts`), by design D1–D2.
- [x] 2.2 Add `PUT page-body`; let `PUT page-file` take `media=1` on any `plan` item; make `PUT item` take `bodySha256` (fills `page_info`, `body = ''`) and `media` (up to 300, pictures and videos, 95 MB with the bucket, 25 MB without), keeping `body` up to 1.6 MB; give every page-file query a `role`; make the prune and the closed-item drop delete bucket blobs too; a page with uploads keeps `page_info`, so the emptied-page prune leaves it (design D2–D3).
- [x] 2.3 Stream the stored page from `GET frame` and `GET shared-frame` (row `body` for an older one); add `GET page-media` and `GET shared-media`; make `GET item` return `page` in place of `body`.
- [x] 2.4 Tests in `app/worker/apps/inbox/` (`page-files.test.ts`, `share.test.ts`, `api.test.ts`), each run with and without a bound bucket: a 6 MB page puts and its frame streams it whole with the sealed CSP; a 26 MB page is refused with the limit in the message; a `body` page and a row from before the migration still open; `page_info` matches the page; media puts, a PDF in `media` is refused, a 96 MB media is refused, a 30 MB media is refused without the bucket; `page-media` gives the owner's blob and 404 for an unknown name; `shared-media` gives 404 on a stopped link; downloads list no media and no body; a page put again drops its old body and media.

## 3. App

- [x] 3.1 In `PlanView.tsx`, show every page by `src` and read `item.page` in place of the body parsers; add `inbox:media` to `frame.ts` and answer it with `inbox:media-result`. In `SharedView.tsx`, hand the frame a port on load that answers only `inbox:media`; update `api.ts` types.
- [x] 3.2 Tests (`PlanView.test.tsx`, `SharedView.test.tsx`, `frame.test.ts`): a review page loaded by `src` still gets `inbox:hello`, saves notes under its key, and taps; a fake frame's `inbox:media` gets a Blob for a known name and `missing` for an unknown one; a shared page answers media and drops a tap.

## 4. Scripts

- [x] 4.1 Add `putPage` to `.agents/skills/reply-link/scripts/lib/inbox.mjs`; use it in `reply-link.mjs` and `.agents/skills/page/scripts/page.mjs`; add `open --media <json>`; raise `PROTOCOL` to 18 (`PROJECT_PROTOCOL` stays at 16); raise `page.mjs`'s stop to 25 MB (design D4).
- [x] 4.2 In `lib/bridge.js`, add `window.replyMedia(name)` and files with `send`.
- [x] 4.3 Tests (`reply-link-inbox.test.ts` or #619's bridge tests, `page.test.mjs`): a page opens with two media files and an uploaded body, and no `body` in the put; signed out uploads nothing; a media file of the wrong kind stops before upload; the bridge resolves `replyMedia` from a fake port and sends a file with its tap; `page.mjs` takes a 2 MB page and stops a 26 MB one.

## 5. Docs and release

- [x] 5.1 Update `wiki/development/plain-pages.md`, the reply-link pages doc, and `wiki/review-pages.md` (design D6).
- [x] 5.2 Add the `## Next (minor) — Inbox pages up to 25 MB, with pictures and videos` entry to `CHANGELOG.md` with its **Updating.** step (design D5).
- [x] 5.3 Add made-up rows to `schema/seed.sql`: one review page with a stored body and two media rows (a plain page gets no port to ask for media), so the preview check has a page with pictures.

## 6. Final checks

- [x] 6.1 Run `node .github/scripts/checks.mjs --worktree` and the changed suites, and fix failures.
- [ ] 6.2 On the preview, open the seeded page and a demo reply-link page with media from the inbox and from its team link; pictures show and the video plays — verified via /save.
