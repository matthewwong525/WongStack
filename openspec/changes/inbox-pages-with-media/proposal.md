# Inbox pages up to 25 MB, with pictures and videos

**Status:** built, publishing
**Branch:** smooth-wombat
**Open questions:** none

## Why

An inbox page holds 1.5 MB at most today, because the page sits in one database row. So a page can't show full-size pictures or play a video, and a big report doesn't fit. ClaymooApp fixed this for its ad review (its `ad-review-in-inbox` plan), and Matthew asked on 2026-11-25 for the same in WongStack. This brings over only the general part: big pages, and pictures and videos inside any page.

Non-goals: ClaymooApp's ad review, Meta ads, and Graveyard moves; moving today's page files out of the database; a new screen in the inbox.

## What Changes

- **A page can be up to 25 MB.** A new page, a review page or a plain page, goes to a file store, not the database row. A page put before this update still opens as before. A page over 25 MB stops with a message that names the limit.
  ```mermaid
  flowchart LR
    A["New page"] --> B["File store"]
    B --> C["Inbox item"]
    C --> D["Opens"]
  ```
- **A page can show pictures and videos.** A chat can send up to 300 pictures and videos with a page, each up to 95 MB. When the page asks for one by name, the inbox hands it in, and a video plays in place. The page still loads nothing from the web by itself. A name the page did not bring gets nothing, and the page can show that the picture is missing.
  ```mermaid
  sequenceDiagram
    participant P as Page
    participant I as Inbox
    participant S as File store
    P->>I: Show me "ad-3.mp4"
    I->>S: Get it
    S-->>I: The video
    I-->>P: The video, to play
  ```
- **A team link shows them too.** A teammate who opens your shared page sees its pictures and videos, as you do. A stopped link shows none.
  ```mermaid
  flowchart LR
    A["Teammate opens link"] --> B{"Link on?"}
    B -- yes --> C["Page and pictures"]
    B -- no --> D["Not shared"]
  ```
- **A chat's page can use them, and send files with its answer.** A page a chat makes asks for a picture by its name in one line. Its Send can carry files, as a review page's can.
  ```text
  page:   replyMedia("ad-3.mp4")  → the video
          send("Publish 12", [choices.json])
  chat:   gets the words and the file
  ```
- **Each install gets one new file store, made by the update.** It gets a second one for previews. An install with no file storage in Cloudflare still works: its pages go in the database, as page files do, and its pictures and videos are 25 MB each at most.
  ```text
  file store on    → pages 25 MB, media 95 MB each
  file store off   → pages 25 MB, media 25 MB each,
                     all pages share 1 GB
  ```

## What the build needs

- **Every reply-link page opens in the inbox, live first**: Ready. It is live (v62.2.0), and this change builds on it: [PR #619](https://github.com/matthewwong525/WongStack/pull/619)
- **Cloudflare access to make the two file stores**: Ready. Both file stores exist.

## Capabilities

### New Capabilities

### Modified Capabilities
- `inbox`: a page can be up to 25 MB and kept outside its row; a page can carry pictures and videos the inbox hands into its sealed frame.
- `team-shared-pages`: a team link shows its page's pictures and videos while the link is on; a plain page is no longer held to the old 1.5 MB.
- `reply-links`: a reply-link page can carry media and ask for it by name, and send files with `send`.

## Impact

- Worker: `app/worker/apps/inbox/` — new `page-store.ts` (bucket or database parts), `page-files.ts` (`PUT page-body`, media), `item-put.ts` (`bodySha256`, `media`), `share.ts` and `item.ts` (frame streams the stored page; `GET item` drops a page's body), `store.ts` (limits, prune).
- Schema: one migration in `schema/migrations/` adds `inbox_items.page_info`, and `inbox_page_files.role` and `stored`.
- App: `app/src/apps/inbox/PlanView.tsx`, `SharedView.tsx`, `frame.ts`, `api.ts`: every page by `src`; `inbox:media` answered.
- Config: `app/wrangler.jsonc` binds `INBOX_PAGES` in production, staging, and local; `app/worker-configuration.d.ts`; `scripts/cf-secrets.mjs` parity; `.agents/skills/wong-setup/scripts/provision.mjs` and its stack-pack fragment make the buckets.
- Scripts: `.agents/skills/reply-link/scripts/` (`reply-link.mjs`, `lib/inbox.mjs`, `lib/bridge.js`; `PROTOCOL` 17 → 18), `.agents/skills/page/scripts/page.mjs` (body upload, 25 MB).
- Docs: `wiki/development/plain-pages.md`, `wiki/development/reply-links.md` (or its pages doc), `wiki/review-pages.md`; `CHANGELOG.md` minor entry with an **Updating.** step.

## Decision log

- **2026-11-25** — Asked where WongStack keeps inbox pages and their pictures and videos → chose a new file store (an R2 bucket, with a twin for previews), as ClaymooApp does; today's page files stay in the database.
- **2026-11-25** — Assumed: settled in the ClaymooApp chat and carried over as is: every new page's HTML goes to the store, up to 25 MB; older rows still open from their row; media up to 95 MB each, handed into the sealed frame over its port; a team link shows media.
- **2026-11-25** — Assumed: an install with no R2 (the memory bucket is already optional) keeps working on database parts, with media held to the page-file 25 MB and the shared 1 GB, because a WongStack install must not break where Cloudflare R2 is off.
- **2026-11-25** — Assumed: the build waits for PR #619 (reply-links-skip-the-tunnel), because `lib/bridge.js` and the inbox-only reply-link path exist only there.
- **2026-11-25** — Assumed: `PROTOCOL` goes 17 → 18 (after #619's 17), below ClaymooApp's, so a ClaymooApp copy on the same computer still wins.
- **2026-11-25** — Assumed: `page.mjs` moves to the body upload and a 25 MB stop (the 800 KB warning stays), but takes no media flag, because a plain page has no bridge to ask for media; a chat that needs media uses a reply-link page.
- **2026-11-25** — Assumed: the review page's notes key, own-Back flag, and button labels move to a small `page_info` column read at put, because `frame.ts` reads them from the body today and `GET item` stops sending it.
- **2026-11-25** — Assumed: ClaymooApp's ad review, Meta ads, `/ad-publish`, and Graveyard moves stay out, because WongStack has none of them.
- **2026-11-25** — Asked whether to ship #619 first → chose ship #619 first; it is live as v62.2.0, and this change is built on it.
- **2026-11-25** — Assumed: only a page with uploads (an uploaded body or media) gets `page_info`, because the prune of emptied pages (`body = '' AND page_info IS NULL`) must never drop a page whose blobs sit in the store; any other page reads its row as before.
- **2026-11-25** — Assumed: `PROTOCOL` goes to 18 but `PROJECT_PROTOCOL` stays at 16, because the running helper compares `PROTOCOL` alone and the project helper did not change.
- **2026-11-25** — Assumed: `scripts/cf-secrets.mjs` needs no change, because the bucket is a binding, not a secret, and its check shows no drift.
- **2026-11-25** — Assumed: the sample page is a review page, not a plain page, because only a review page gets the port it asks for its pictures over.
- **2026-11-25** — Assumed: the **Updating.** step is done by hand, because the setup script runs once at install and a sync does not run it.
- **2026-11-25** — Assumed: the review page builder keeps its 1.5 MB stop with a new reason (a review is read on a phone too), because the inbox limit is no longer the reason.
- **2026-11-25** — Assumed: a page that loads again (it went to another address) loses its port, because an old port must not keep answering media or taps for a page that left.
- **2026-11-25** — Assumed: the migration file is named by hand (`20261125120000_inbox_page_store.sql`), because the repo has no migration script.
