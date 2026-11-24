# Design

## Context

See proposal.md, Why. ClaymooApp shipped this as commit `6ef97f4db` (PR #2480, archived change `2026-11-23-team-shared-pages`). WongStack's Inbox is the same code base in a different place: `app/worker/apps/inbox/` (routes are `inboxAction` contracts with zod input and output), `app/src/apps/inbox/` (one mini app, views chosen by query: `?item=`, `?view=schedules`), migrations in `schema/migrations/`. The port follows ClaymooApp file by file and changes only what WongStack's layout needs.

## Goals / Non-Goals

- Goal: the same behavior and limits as ClaymooApp, so a repo that syncs from WongStack and a ClaymooApp page behave alike.
- Non-goal: a company-wide staff rule. WongStack has per-app access only.

## Decisions

- **A plain page is a review page with a `plain` flag, not a new kind.** A new kind needs a rebuild of `inbox_items`' `CHECK`; a column is additive. `item-put` takes `plain: true` only with `kind: "plan"` and no actions, else `bad_plain`. A plain page's `closes_at` is the time it was put, so it lands in the Archive at once. Every page's `updated_at`, set on each put, says when its newest version came.
- **A link is a row in a new `inbox_shares` table**, keyed by a random 16-byte base64url token, with `installation_id`, `email`, `item_id`, `created_at`, `stopped_at`. A partial unique index on `(installation_id, email, item_id) WHERE stopped_at IS NULL` makes a second share give the same token. Stop sets `stopped_at`; the next share makes a new row.
- **The maker's routes live in the Inbox's own `api.ts`:** `POST share`, `POST share-stop`, `GET frame` (the caller's own page, sealed). Each binds the row to the caller, as every Inbox route does, so another person's id answers `not_found`.
- **A teammate's routes also live in the Inbox app, not a new app:** `GET shared?token=` (title, who shared it, updated time) and `GET shared-frame?token=` (the page, sealed). These two read across people by token alone, so they skip `scope`'s email binding but keep the Inbox's `allowed` check: a person's sign-in, never a machine credential. Alternative: a separate `shared` mini app with its own grant. Rejected: one more app for the owner to grant, and a link that a teammate with the Inbox still can't open. WongStack's per-app access means "may open the Inbox" is the team.
- **Who shared it:** the person's name from the access list when it has one, else the part of the email before `@`.
- **The seal is a header, not only the frame's `sandbox`.** `GET frame` and `GET shared-frame` answer with `Content-Security-Policy: sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`, `nosniff`, `no-store`, `no-referrer`. So the page has no origin and no network, even opened in a tab of its own. Both routes return HTML, so they are declared with an HTML output in the contract (check how `GET file` declares a non-JSON answer and follow it).
- **Links open their own tab.** `page.mjs` adds `<base target="_blank">` and `target="_self"` on each `#` link; the worker's `linksOpenOwnTab` does the same for a plain page that lacks it. A page with its own `<base>` keeps it. The two helpers are twins and are tested together.
- **A page that leaves starts over.** No sandbox flag stops a frame from loading another address into itself, so the frame counts its loads: a load after the first means the page left. It reloads and says *This page tried to leave the page.*; after three tries it stops and says *This page keeps trying to leave. Reload to try again.* (`leave.ts`, shared by the maker's view and the teammate's view.) A review page shown from `srcDoc` keeps its own load handling, because its answer port is tied to its version.
- **A shared review page opens read-only:** the teammate's view sends the page `inbox:hello` with `readOnly: true` and no actions, and listens only for `inbox:back`.
- **The `/page` skill** sits at `.agents/skills/page/` beside `reply-link`, with `scripts/page.mjs`: inline every local style, script, picture and font (the live card's checks: 300 KB a file, first-byte type check, no web address, no `@import`, nothing outside the folder), warn over 800 KB, stop over 1.5 MB, then put the page through `reply-link`'s inbox helper with `plain: true`, and with `--share` call `share`. It reuses the review builder's inlining code, not a copy of it.
- **Context budget:** the new `SKILL.md` adds instruction words; cut an equal amount elsewhere by `measure-context.mjs --json`, never from another change's lines.

## UX

### Use-case brief

Who: the person who runs the business, or a teammate, asking their chat for a chart, a small tool, or a report. The job: see it, then send it to the team. Done: the team opens a link and sees the page. Context: often on a computer, sometimes a phone; Slack or email carries the link. Common case: one page, shared once, updated a few times. Edge: the maker stops the link; a teammate without the Inbox opens it. Mirrors the closest screen: the Inbox's opened review page (`PlanView.tsx`).

### Flow

Ask the chat → open the printed link → tap *Share with team* → *Copy link* → paste in Slack → a teammate opens it.

### Hierarchy

The maker's page: one primary action, *Share with team*; once shared, *Copy link*. The teammate's view: no action, only the page.

### Review

[review.html](review.html): What Changes items 1 (a plain page), 2 (share controls), 3 (the teammate's view and a stopped link), and 5 (the Archive line).

### Components

Existing: `Button` (outline, ghost), `Badge` (secondary), `Skeleton`, `Loading`, the Archive row, the Inbox's `Top` row (made to wrap on a phone). New: `ShareControls` and `SharedNote` (from ClaymooApp's `Share.tsx`), `PageFrame` (a frame that loads a sealed address and counts leaves), `SharedView` (the teammate's view at `?shared=`), and a toast for *Link copied* (check that `sonner` is in the app; else a `role="status"` line).

## Risks / Trade-offs

- [A token in a pasted link reaches whoever reads the chat] → it opens only for a signed-in person who may open the Inbox; *Stop sharing* ends it at once.
- [The link shows the newest version, so a teammate can see a later edit than the one discussed] → intended: an artifact is updated in place, and a copy would go stale and need its own clean-up.
- [A page removed by the Inbox's clean-up leaves a dangling link] → the shared read answers 404, *This link does not exist*.

## Migration Plan

One additive migration: `ALTER TABLE inbox_items ADD COLUMN plain INTEGER NOT NULL DEFAULT 0`, an `updated_at` column filled from `created_at`, `CREATE TABLE inbox_shares`, its partial unique index, and an index on `token`. Nothing to undo by hand: an older Worker ignores the column and table.

After the merge, `/ship` checks on the live app: a `/page --share` page opens in the Inbox, its team link opens in a second signed-in browser, and *Stop sharing* turns that link off.
