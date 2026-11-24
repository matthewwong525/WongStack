# A page carries a file you open to download

**Status:** in-progress
**Branch:** amiable-jellyfish
**Open questions:** none

## Why

When an agent makes a file for you, such as a spreadsheet or a PDF, it has no good way to give it to you: it emails it as an attachment, and the file ends up in your email, apart from the work it came from. A page in your inbox can't hold a file, because a page can't download anything.

## What Changes

1. **The agent puts the file on a page in your inbox, and the link it prints downloads it.** You tap the link in the chat, the page opens, and the file downloads at once, each time you open that link. One page carries up to 5 files, each up to 25 MB. The page shows each file's name and size. review.html#/1
   ```mermaid
   sequenceDiagram
     participant A as Agent
     participant I as Inbox
     participant Y as You
     A->>I: Page + q2-sales.xlsx
     A->>Y: The link
     Y->>I: Tap it
     I->>Y: q2-sales.xlsx downloads
   ```

2. **A Download button on the page.** A page with files shows **Download** beside **Share with team**. Opened from the Archive, the page downloads nothing by itself: you tap Download. A teammate who opens the team link gets the file at once, as you do from your link. review.html#/2
   ```page
   Before: pages/before.html
   From the link: pages/after.html
   From the Archive: pages/archive.html
   ```

3. **Agents give you a file this way, not by email.** "Send me the file" puts it on a page in your inbox. Email stays for a file that goes to someone else, or when you ask for an email. review.html#/3
   ```text
   "Send me the report"   → page + link
   "Email it to Dana"     → email (your OK)
   "Email it to me"       → email
   ```

4. **A long thing to review goes on a page, its link on the question.** A chat that asks you about a draft, a table or a report puts it in the question itself, because some apps hide the text above a question. When it is longer than about 40 lines, the chat puts it on a page and puts the page's link in the question. A check sends a question back to the chat once when it leaves the draft out. review.html#/4
   ```mermaid
   flowchart TD
     A["Something to review"] --> B{"Longer than 40 lines?"}
     B -- No --> C["Whole text in the question"]
     B -- Yes --> D["A page in your inbox"]
     D --> E["Question: short summary + the page's link"]
   ```

**Non-goals:** opening a file inside the app (it always downloads); a list of every file you got; files that delete themselves after a time; email changes (this app sends no email).

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

### Modified Capabilities

- `team-shared-pages`: a plain page can carry files; its printed link downloads them on open, the Archive shows a Download button, and a team link downloads them too.
- `asking-the-user`: a question carries what the person must review, in its text or as a linked page; the Claude Code check sends back once a question that leaves out a review block.

## Impact

- `app/worker/apps/inbox/page-files.ts` (new): raw `PUT page-file` (the computer's upload, kept in D1 parts) and `GET page-file` (the owner's download); `api.ts` wiring; `files.ts` exports `safeName`, `typeOf` and the first-bytes check from its `TYPES`; `item-put.ts` takes `files`; `share.ts` serves a shared page's files and lists them; `item.ts` returns the list.
- `schema/migrations/<timestamp>_inbox_page_files.sql`: tables `inbox_page_files` and `inbox_page_file_parts`.
- `app/src/apps/inbox/PlanView.tsx`, `SharedView.tsx`, `api.ts`, and a new `downloads.ts`: the Download button and the download on `download=1` and on a team link.
- `.agents/skills/page/scripts/page.mjs`, `.agents/skills/page/SKILL.md`, `.agents/skills/reply-link/scripts/lib/inbox.mjs`: `--file`.
- `.agents/loop/ask-check.mjs`, `.agents/plugins/daily/scripts/chief.mjs`, `.agents/plugins/loop/skills/explore/references/asking-the-user.md`: the review rule and check.
- `AGENTS.md` (one rule line), `wiki/development/plain-pages.md`, `CHANGELOG.md` `## Next`.
- Tests: `app/worker/apps/inbox/page-files.test.ts`, `share.test.ts`, `files.test.ts`, `app/src/apps/inbox/downloads.test.ts`, `PlanView.test.tsx`, `SharedView.test.tsx`, `scripts/tests/page.test.mjs`, `scripts/tests/ask-check.test.mjs`.
- Payload: every file above but the CHANGELOG ships to installed repos; the migration runs on their next deploy.

## Decision log

- **2026-11-24** — Assumed: the work and its settled behavior come from the request (Matthew, 2026-11-24): the printed link downloads each time it opens; the Archive shows a Download button and downloads nothing by itself; a team link downloads as the printed link does; agents prefer a file page over emailing the person a file, because the request settled each.
- **2026-11-24** — Assumed: the code ports the source app's `page-file-download` as it ships, generalized; the build waits until that change is archived on the source app's main and ports its final code, because the request says so. This plan reads its in-progress state (2026-11-24) and keeps its shape.
- **2026-11-24** — Assumed: the files sit in D1 parts, not R2, because WongStack's only bucket belongs to memory and exists in production alone, so a preview could not take a file, and a new bucket means new setup in every installed repo; the inbox already keeps sent files in D1 parts (`files.ts`). Cost: a file is 25 MB at most (the source app: 95 MB), and the app holds 1 GB of page files at most, since D1 keeps 10 GB a database.
- **2026-11-24** — Assumed: any kind of file is taken; a name ending in a kind `files.ts` knows (PDF, picture, Office file, zip, text) must start with that kind's first bytes, and any other ending is sent as plain bytes, because the request asks to reuse that check, and the source app takes any kind (its example is an `.xlsm`). The file always downloads, so its kind can't run in the app.
- **2026-11-24** — Assumed: the review-on-the-card rule and its check port in the same change, with WongStack's copy naming `/page` for the long item, because WongStack has `/page` now and its `ask-check.mjs` lacks the review check. WongStack's line 58 doesn't link the anchor yet (the request thought it did), so this change adds the link too.
- **2026-11-24** — Assumed: the daily check's ask text drops *Don't repeat the report* too, as the source app's did, because it tells a chat to leave the review off the card.
- **2026-11-24** — Assumed: no email rule lines port, because WongStack has no email skill; the `AGENTS.md` rule line says a file for the person goes on a page.
- **2026-11-24** — Assumed: the build starts from the source app's open pull request (#2510, all tasks done, checks green) and checks its merged code before this change merges, because Matthew asked to continue rather than wait.
- **2026-11-24** — Check: `scripts/fixtures/context-baseline.json` raises `asking-the-user.md`'s word count from 1025 to 1090, so the instruction total holds the new *Put the review on the card* section (65 words after trimming). The `/page` step and the `AGENTS.md` line were trimmed to fit, and four `AGENTS.md` link texts became *how*, so the startup route still shrinks.
- **2026-11-24** — Assumed: the second look's 3 findings are fixed (a renamed file now passes the first-bytes check at the page put too; the same-bytes test proves the skip; the spec says only the default file page lists names and sizes), because the plan already settled each.
