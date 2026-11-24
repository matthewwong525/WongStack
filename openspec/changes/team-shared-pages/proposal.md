# Make a page and share it with the team

**Status:** in-progress
**Branch:** add-claude-artifacts
**Open questions:** none

## Why

Today a chat can put only a review page in your Inbox: a page that asks for your OK. A chart, a small tool, or a report that asks nothing has no home, and no teammate can open any page in your Inbox. ClaymooApp added this on 2026-11-23 ("plain pages", a kind of artifact), and it works well there, so every WongStack install gets it too.

## What Changes

- **Ask for "a page" and it goes to your Inbox.** Say "make me an HTML page", "an artifact", or "a page I can share". The chat writes it, checks it, and puts it in your Inbox. It prints the page's link. A plain page has no OK, Note, or Send. It runs its own script, so a chart you can tap works, but it can't load anything from the web, call the app, or read your sign-in. Ask again to update it in place.
  ```page
  Before: pages/page-before.html
  After: pages/page-new.html
  ```
- **Share any page with the team in one tap.** On a page in your Inbox, tap *Share with team*. The page shows *Shared with the team*, *Copy link*, *Stop sharing*, and the link. Sharing again gives the same link. Only you can share or stop your page. This works for a review page too.
  ```page
  Not shared: pages/page-new.html
  Shared: pages/page-shared.html
  ```
- **A teammate opens the link and sees the newest version.** Anyone signed in who can open the Inbox sees the title, who shared it, when it was updated, and the page. A review page opens read-only: no tap or note from a teammate ever reaches your chat. A machine key gets nothing.
  ```page
  Opened: pages/shared-view.html
  Stopped: pages/shared-stopped.html
  ```
- **Stop sharing ends the link for good.** The old link says *This page is no longer shared* at once and never opens again. Share again for a new link.
- **The Archive marks pages.** A plain page goes straight to the Archive, marked *Page*, and stays there. A page with a link that is on says *Shared*.
  ```page
  Before: pages/archive-before.html
  After: pages/archive-after.html
  ```

Non-goals: no team list of shared pages, no live data in a page, no link for people outside the company.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

- `team-shared-pages`: a chat puts a plain HTML page in its person's Inbox; the maker shares any Inbox page with signed-in teammates by a link, and stops it.

### Modified Capabilities

None. The Inbox spec keeps its requirements; plain pages and links add to them.

## Impact

- `app/worker/apps/inbox/`: `plain` and `updated_at` columns on items, a new `inbox_shares` table, routes `POST share`, `POST share-stop`, `GET frame`, `GET shared`, `GET shared-frame`.
- `schema/migrations/`: one additive migration.
- `app/src/apps/inbox/`: share controls, a sealed frame that loads from its own address, the shared view at `/apps/inbox/?shared=<token>`, Archive line.
- `.agents/skills/page/`: a new `/page` skill and its `page.mjs` script; `reply-link`'s inbox helper takes `plain`.
- `wiki/`: a new `wiki/development/plain-pages.md`, linked from the development hub, review pages, and reply links.
- `CHANGELOG.md`: a `minor` entry. `.agents/memory/areas.json`: the new spec's area. Context budget: the new skill's words need an offsetting cut.

## Decision log

- **2026-11-23** — Assumed: port both parts, plain pages and team links, because the person asked for "Claude artifacts" as added in ClaymooApp, and that change ships both.
- **2026-11-23** — Assumed: a teammate opens a link inside the Inbox app, at `/apps/inbox/?shared=<token>`, so whoever may open the Inbox may open a link, because WongStack grants access per app and has no company-wide staff rule as ClaymooApp has.
- **2026-11-23** — Assumed: the skill is named `/page`, as in ClaymooApp, so a synced repo keeps one name.
- **2026-11-23** — Assumed: keep ClaymooApp's limits and sealing (300 KB a file, 800 KB warn, 1.5 MB stop; `Content-Security-Policy: sandbox`; three leaves, then the frame stops), because they shipped and were tested there.
- **2026-11-23** — Assumed: *Shared by* always shows the email's part before the `@`, because WongStack's access list keeps emails and no names.
- **2026-11-23** — Assumed: `GET frame` and `GET shared-frame` are bare route handlers, as `GET file` is, because an action contract always answers JSON; the inbox's per-app access check still runs for them.
- **2026-11-23** — Assumed: the Archive line follows `pages/archive-after.html` (*Page · Shared, 23 Nov, 09:00 · stock*), not ClaymooApp's order.
- **2026-11-23** — Assumed: the app has no toast, so *Link copied* and a failed share show as a status line beside the share buttons.
- **2026-11-23** — Assumed: `linksOpenOwnTab` lives in `app/worker/apps/inbox/sealed.ts`, a file with no imports, so the script test compares it with its twin in `page.mjs` directly.
- **2026-11-23** — Assumed: the seed adds one shared plain page for Fay, *Gift card sales, November*, at the end of her Archive.
- **2026-11-24** — Assumed: the loop module goes to 3.4.1, a patch: `build-review.mjs` only exports two of its helpers for `/page`.
- **2026-11-24** — Assumed: the instruction-budget cut comes from setup and update references (`cloudflare.md`, `tools.md`, `catch-up.md`, `payload-manifest.md`), from `wiki/voice.md` (the ASD-STE100 clause and "Never rewrite a quote to comply", which `AGENTS.md` still states), and from `wiki/development/reply-links.md` ("so no request goes twice"), each a clause another line or page already says.
- **2026-11-24** — Assumed: every Inbox page keeps one updated time, set on each put, because a review page's shared link showed its first date and the person asked that review and plain pages use the same setup.
- **2026-11-24** — Assumed: plain and review pages share one setup (one Inbox item kind, the review builder's file checks, one sealed frame, one updated time), because the person said a review is also a page and both should use the same infrastructure.
