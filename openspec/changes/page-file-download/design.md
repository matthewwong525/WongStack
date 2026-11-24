# Design

## Context

- A plain page is an inbox item (`inbox_items`, `kind = 'plan'`, `plain = 1`) that `page.mjs` puts with `PUT /apps/inbox/api/item` through the company client (`.agents/skills/reply-link/scripts/lib/inbox.mjs`). The app shows it from `GET frame` in a sealed frame (`sealed.ts`: `Content-Security-Policy: sandbox …; connect-src 'none'`, no `allow-downloads`), and a page holds 1.5 MB at most. Plain pages are never pruned (`store.ts` `GONE` keeps a `plan` with a body). Team links are `inbox_shares` rows (`share.ts`), read by `SharedView.tsx` at `/apps/inbox/?shared=<token>`.
- Files a person sends *to* the computer go through `app/worker/apps/inbox/files.ts`: raw `POST file`, kept in D1 parts of 512 KB (`inbox_file_parts`), checked by name ending and first bytes (`TYPES`), deleted once read. That path is one-way and short-lived, but its parts store and type check fit this change.
- The app's only R2 bucket is `MEMORY_BUCKET`, bound in production only: staging and previews have none (`app/wrangler.jsonc`).
- The source app builds the same feature as its change `page-file-download` (R2 `ATTACHMENTS`, `page-files.ts`, `inbox_page_files`, `downloads.ts`, `page.mjs --file`). This change ports its final code, read from the source app's main once that change is archived there, with three differences: D1 parts for storage, 25 MB a file, and the first-bytes check for a known ending.
- The source app's archived `review-on-the-card` adds the *Put the review on the card* section to `asking-the-user.md` and a review-block check to `.agents/loop/ask-check.mjs` (`reviewBlocks`, `turnReview`, `REVIEW_REASON`). WongStack's `ask-check.mjs` has neither, and its *End every reply* rule does not link the section.

## Goals / Non-Goals

**Goals:** an agent hands the person a file with one command; the printed link downloads it; the page and its team link keep the file as long as the page; it works the same in production, staging, and previews. A long item to review goes on a page, linked in the question.

**Non-Goals:** opening a file in the browser; files on a review page with buttons; any change to the sealed frame; a new bucket or new setup step for installed repos.

## Decisions

1. **The file lives in D1 parts; the download lives in the app's bar.** A new table pair: `inbox_page_files` (`installation_id, email, item_id, name, size, type, sha256, created_at`, key `(installation_id, email, item_id, name)`) and `inbox_page_file_parts` (`installation_id, email, item_id, sha256, n, data, created_at`, key `(installation_id, email, item_id, sha256, n)`), in one timestamp migration under `schema/migrations/`. The bar (outside the frame) shows **Download**, an `<a download>` at `GET page-file?id=<item>&name=<name>`.
   *Alternatives:* `MEMORY_BUCKET` under a prefix: rejected, it exists in production alone, so no preview could take a file, and it belongs to memory, which a project may not install. A new R2 bucket: rejected, every installed repo would need a new bucket made in setup and sync, and a staging twin. `allow-downloads` on the frame with a data URL: rejected, the 1.5 MB cap, and it loosens the seal on every page.
2. **Limits that fit D1.** 25 MB a file (`FILE_LIMITS.file`), 5 files a page, and 1 GB of page-file parts an app (`pages_full`, 507, when an upload would pass it). D1 keeps 10 GB a database on the paid plan that every install has; plain pages never expire, so the app-wide cap keeps the inbox's own rows safe. Names: `safeName` (200 characters, no `/`, `\`, or control character).
3. **Upload first, then the page names its files.** `page.mjs --file <path>` sends each file raw to `PUT page-file?id=<item>&name=<name>&sha256=<hex>` (a raw `Route` beside `POST file`): it streams the body into parts under `(item, sha256)`, hashing as it goes (`crypto.DigestStream`), checks the first bytes when the name's ending is in `TYPES`, and deletes the parts on any refusal (size, room, hash mismatch, bad first bytes). A request with an `Origin` from another site is refused, as only the computer uploads. Then `PUT item` carries `files: [{ name, size, sha256 }]`, only with `plain: true`. `item-put.ts` checks each named upload is whole (its parts' total equals `size`), writes `inbox_page_files` rows in the same batch as the item, and deletes the rows and parts the new list no longer names. Parts no row names after a day are deleted at the next upload (`file-rows.ts` `pruneUploads`); the inbox's clean-up at check-in deletes the rows and parts of an item it removed.
   *Alternative:* one request with page and files. Rejected: a 25 MB JSON body through the bounded JSON reader.
4. **Any kind; a known kind must be what it says.** `files.ts` exports `safeName`, `typeOf` (the `TYPES` type, else `application/octet-stream`) and the first-bytes check. A name ending in a `TYPES` kind must start with its bytes; any other ending is kept as plain bytes.
5. **Always a download.** Both GET routes answer `Content-Disposition: attachment; filename*=UTF-8''<name>`, the row's `Content-Type`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox`, `Cache-Control: private, no-store`, and stream the parts in order. A raw route sets its own `Cache-Control`; `api.ts` needs no change for it.
6. **Auto download only from the link.** `page.mjs` prints `…/apps/inbox/?item=<id>&download=1`. `PlanView` starts each file's download once after load when `download=1` is in the address, then drops `download` from the address (`replace`), so Back, refresh and the Archive never download again. `SharedView` downloads on open; a teammate's file comes from `GET shared-file?token=&name=`, which checks the link is open as `shared-frame` does (410 stopped, 404 missing, 403 service token). `GET item` and `GET shared` return the page's files (`name`, `size`). One helper, `app/src/apps/inbox/downloads.ts`, holds the address logic and the clicks.
7. **Default file page.** `page.mjs` with `--file` and no folder writes the page itself: the title and one row per file (name, size). With a folder, the agent's own page shows, and the bar still offers Download.
8. **The rule for agents.** One line in `AGENTS.md` Rules: a file for the person themselves goes on a page (`/page --file`), never an email attachment; email stays for other people and when the person asks for email. `/page`'s description names sending a file.
9. **Put the review on the card.** Port the source app's section into `.agents/plugins/loop/skills/explore/references/asking-the-user.md` after *End every reply with the next step*, naming [`/page`](../../page/SKILL.md) for the long item; the *End every reply* rule links it. Port `ask-check.mjs`'s review-block check (`reviewBlocks`, `turnReview`, `REVIEW_REASON`, one send-back a turn shared with the link check), the `REASON` and `REMINDER` wording, and `chief.mjs` `askText`'s same wording, with the source app's tests moved into `scripts/tests/ask-check.test.mjs`. No settings change: the `links` hook already runs on every question.

## Port record

The build read the source app's pull request #2510 head, commit `52af4a134` (task 0.1), then ported the one feature change up to `0a7beb46f`: the test that a page put again keeps the bytes a name it still lists shares with a dropped name. It passed with no code change, as parts are keyed by item and sha256 and only a sha256 the page no longer names is deleted. The merge step ports any change made after `0a7beb46f`. The port differs from the source in these ways:

- Storage: D1 parts of 512 KB, 25 MB a file, 1 GB an app (Decisions 1 and 2); the source uses R2 and 95 MB.
- `pages_full` (507) names a full app; `too_large` (413) is reused for a file over 25 MB.
- Unnamed parts are deleted at the next upload, app-wide, not at check-in: plain pages never expire, and an upload is the only time new parts arrive.
- The upload refuses only an `Origin` from another site; a request with no `Origin` (the computer) passes.
- A teammate's download is `GET shared-file?token=&name=`, a query, as the other inbox routes take their values.
- The Download button shows a status line (`Download.tsx`), as the app has no toasts.
- `page.mjs` maps each refusal code to plain words, because the app answers a code with no message.
- `scripts/employee-bootstrap.mjs`'s client keeps a caller's own `signal`, so a 25 MB upload gets 15 minutes, not the default timeout.
- A name with `\` is refused in `page.mjs` too, as `safeName` refuses it.
- The plain page's Download tests are in `Share.test.tsx`, beside the plain page's other bar tests, not in `PlanView.test.tsx`.
- *Put the review on the card* is shorter than the source's section, to fit the instruction budget; the `option.preview` line and the hook's description are left out.
- `ask-check.mjs` and its tests port as the source has them; the test names use made-up people and `example.invalid` addresses.

## Risks / Trade-offs

- [25 MB is smaller than the source app's 95 MB] → the agent gets a plain refusal and can zip or split the file. A later change can move to R2 if bigger files are common.
- [Page files never expire, like plain pages] → the 1 GB cap refuses new uploads, with a message that names it; a later clean-up can prune by age.
- [A 25 MB download is 50 D1 reads] → they stream one by one; well inside a Worker's limits.
- [Several files: the browser asks once to allow many downloads] → the bar's Download still gets each file; most pages carry one.
- [Upload succeeds, page put fails] → the orphan parts go in a day.
- [The source app's change may still change before it ships] → the build ports its final code and records any difference in this file.

## Migration Plan

Additive: two new tables and new routes. An older `page.mjs` keeps working (no `files`). Installed repos get the migration on their next deploy. Roll back by reverting; the tables stay harmless.

## UX

### Use-case brief

The person asked a chat for a file. They tap the link in the chat, on a phone or a computer, and want the file now. Later they find the page in the Archive and want it again, without a surprise download. A teammate gets a team link and wants the same file. Edge cases: a stopped link, a file gone after the page was replaced, several files.

### Flow

Printed link → page opens → files download → address drops `download`. Archive → page opens → tap **Download** → files download. Team link → page opens → files download.

### Hierarchy

One primary action on a file page: **Download** (filled). **Share with team** stays outline, beside it.

### Review

[review.html](review.html), What Changes item 2: *Before*, *From the link*, *From the Archive*.

### Components

Existing: `Top`, `Button` (default variant for Download), `ShareControls`, the `role="status"` line the share controls use for *Downloading <name>…*. Nothing new.
