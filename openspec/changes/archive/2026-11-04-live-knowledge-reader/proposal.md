# A live reader in the app for company knowledge

**Status:** ready-to-ship
**Branch:** fluffy-wombat
**Open questions:** none

## Why

Company knowledge is moving to its own repo, where a save goes live at once. The app needs to show those pages the moment someone opens them, so an edit shows with no publish. ClaymooApp's reader shows pages only from its last publish; it swaps to this reader at its next update.

## What Changes

- **A Knowledge app on Home.** Open it to see every knowledge page in a list, by folder, and open one to read it. The page shows what the knowledge repo holds right now: a save from any chat shows on the next open, with no publish. Links between pages open the linked page in the app. Diagrams draw as pictures. A page that is missing says so and links back to the list.
  ```picture
  After, the list: pictures/knowledge-list.png
  After, a page: pictures/knowledge-page.png
  After, a page that is not there: pictures/knowledge-missing.png
  Try it: https://live-knowledge-reader-wongstack-staging.matthewwong525.workers.dev/apps/knowledge/
  ```

- **Search finds a page by its words.** Type in the box on the list. Each result shows the page's title and the line that matched. Search covers the newest save.
  ```picture
  After, a search: pictures/knowledge-search.png
  Try it: https://live-knowledge-reader-wongstack-staging.matthewwong525.workers.dev/apps/knowledge/
  ```

- **Who can read it is set on the Access page, like any app.** The owner can read it from the start. A teammate can read it once the owner ticks Knowledge for them or gives it in a role. A teammate without it sees no card and can't open a page.

- **Pages marked public stay public.** A page whose top lines say `public: true` opens for anyone at its public address, with no sign-in. Any other page there answers *not found*, the same as a missing page, so a private page's name never leaks. A public page shows its diagrams as text and leaves out pictures.
  ```mermaid
  flowchart TD
    open["/public/welcome"] --> marked{"public: true?"}
    marked -->|yes| page[the page]
    marked -->|no| nf[not found]
  ```

- **Assistants can read pages through the app too.** The list, a page and search become company actions, so a skill can read knowledge with the person's own access, without a copy of the repo.

Non-goals: editing pages in the app (a chat saves them), the knowledge repo itself and its link check (the "Company knowledge in its own repo" part), moving old installs' pages (the "Move old installs' knowledge" part), and showing the pages WongStack ships, which stay in the code repo.

## Capabilities

### New Capabilities
- `knowledge-reader`: the Knowledge mini app, its list, page, search and file reads from the knowledge repo at its newest save, and the public address for `public: true` pages.

### Modified Capabilities
- `app-scaffold`: the verified-identity requirement gains one exception: a knowledge page marked `public: true`, at `/public/*`, needs no sign-in, and nothing else there does.

## Impact

- New `app/src/apps/knowledge/` (page, `app.json`, tests) and `app/worker/apps/knowledge/` (routes `GET pages`, `GET page`, `GET search`, `GET file`, the repo reader, the Markdown renderer, tests).
- `app/worker/index.ts`: `/public/*` answered before the sign-in check, by the knowledge app's public handler.
- `.agents/skills/wong-setup/scripts/private-access.mjs` and `scripts/check-private-access.mjs`: a third public route, `/public/*`, on both apps; their tests.
- Dependencies: `marked` (Worker side, server render) and `mermaid` (browser side, loaded only on a page with a diagram) in `app/package.json`.
- Reads the knowledge repo through a read-only reader the app's core makes from the Artifacts binding and the repo name the knowledge repo part records (new `app/worker/employee-access/knowledge-reader.ts`); the app's routes never get the binding. This part builds only after that part ships.
- Wiki: `wiki/stack/mini-apps.md` names the Knowledge app; `wiki/stack/cloudflare-access.md`'s bypass table gains the row; a new `wiki/stack/knowledge-reader.md` owns how it reads and what is public.
- `CHANGELOG.md` `## Next (minor)`: installs get the app at their next sync; the owner ticks it for teammates, and the Access step runs once more to open the public address. ClaymooApp's own docs reader is removed in its own repo at that sync.

## Decision log

- **2026-11-03** — Asked who can open knowledge pages in the app → chose everyone given the Knowledge app on the Access page.
- **2026-11-03** — Asked whether the reader also shows the pages WongStack ships → chose the knowledge repo only.
- **2026-11-03** — Asked who has the Knowledge app when an install first gets it → chose the owner, who ticks people or roles, like any new app.
- **2026-11-03** — Asked whether the reader draws diagrams and searches page text like ClaymooApp's → chose both.
- **2026-11-03** — Assumed: the reader is a mini app at `/apps/knowledge/`, because the Access page already gives and takes away apps per person, and its routes become company actions with no extra work.
- **2026-11-03** — Assumed: each open reads the newest save through Cloudflare's own file-read call, with the rendered result kept per save, because that shows an edit at once and costs one look-up when nothing changed.
- **2026-11-03** — Assumed: public pages live at `<app address>/public/<page>`, rendered as a plain page by the server, because the app's own screens sit behind the sign-in and ClaymooApp can point its public address there.
- **2026-11-03** — Assumed: a public page shows diagrams as text and no pictures, because a plain server page runs no drawing code, and a picture can't say on its own whether it is public. ClaymooApp's only public page has neither.
- **2026-11-03** — Assumed: the reader shows raw HTML in a page as text, because a page anyone with Project code can save must not run code in a reader's browser.
- **2026-11-03** — Assumed: real pages are checked on the live app after publish, not on the preview, because the knowledge part's plan binds the knowledge repo to the live app alone.
- **2026-11-03** — Assumed: no *Before* picture, because the Knowledge app is a new screen; the prototype shows sample pages in the browser, not a real knowledge repo.
- **2026-11-03** — Assumed: the repo's name, its binding and where pages sit in it come from the knowledge repo part, and the first task matches them to what shipped, because that part is still being planned.
- **2026-11-04** — Assumed: the reader takes the repo from the shipped `knowledgeSource()`, because a second copy of the preview rule could drift and open knowledge on a preview.
- **2026-11-04** — Assumed: a link from a knowledge page out of the repo, such as to `wiki/`, shows as plain text, because the reader shows the knowledge repo only.
- **2026-11-04** — Assumed: the list and the search index are kept in the Worker's own memory per save, not in the Cache API, because Cloudflare's docs say the Cache API does not work behind Access; a page is read and rendered on each open, so memory stays small.
- **2026-11-04** — Assumed: `GET file` is a plain route, not a company action, because an action answers JSON and a picture is not; it still needs the Knowledge app.
- **2026-11-04** — Assumed: a page's address drops `.md`, a folder's `README.md` opens at the folder, and a link that starts with `/` resolves from the repo's root, because those are the addresses the prototype and ClaymooApp's public page use.
- **2026-11-04** — Asked how the Knowledge app reads pages, since the app's repo connection can also change code → chose a read-only reader the app hands Knowledge's routes, for the knowledge repo alone: list, read a folder, read a file.
- **2026-11-04** — Assumed: 6.1 is done with two local failures left to CI: `memory-areas.test.mjs` needs the spec the archive writes, and `Welcome.test.tsx` runs about 5.0 s against its 5 s limit with or without this change, at a load average near 19 on this computer. No limit was raised.
- **2026-11-04** — Asked whether to run the Access step on this repo's app now → chose run it now. It ran with no error: `/public/x` reaches the Worker on the live app and previews (401 from the code before this change), and `/` still goes to the sign-in.
- **2026-11-04** — Assumed: the real-pages check (list, page, an edit showing at once, search, a diagram, a public page and a private one) moves from the task list to right after the publish, in the ship report, because it needs this code live and the archive needs every task ticked first.
- **2026-11-04** — Assumed: this save leaves the spec out of the `knowledge-reader` area's docs in `areas.json`, and the archive step adds it back, because the area test checks that each named doc exists and the spec exists only after the archive. Built and reviewed; saved for the preview check in 6.2.
- **2026-11-04** — Assumed: the Access step's `/public/*` route waits until after publish, so the step was run again from `main` to take it off both Access apps. CI checks every upload with `main`'s Access check, which refused the route, so every preview and every publish from `main` failed while it was on. After publish, the Access step runs once more, and the live app shows `/public/*` with no sign-in.
- **2026-11-04** — Assumed: 6.2 checks `/public/*` through the check sign-in, and leaves out "a teammate without the app is refused", because a preview's only sign-in holds every app; the route tests cover the refusal, and the no-sign-in check runs on the live app after publish.
- **2026-11-04** — Asked how to handle `daily-journal.test.mjs`, red on `main` since the date passed 3 November (it wrote a line on a fixed date and read it by the real clock) → chose to fix it in this change: that test now uses one real moment for the line, the hook and `D journal --new`.
- **2026-11-04** — Archived for publish. `main` came in with 45.9.0 and its own fix for the journal test; that fix was kept. The spec is back in the `knowledge-reader` area's docs.
