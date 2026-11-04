# Proposal

**Status:** ready-to-ship
**Branch:** dynamic-review-pages-uploads
**Open questions:** none

## Why

You want to read a plan once, tap Build, and get exactly what you saw, with no more questions from the chat. Today a review page can show only a fixed set of cards, and it sends back only words. The chat can't show a real website or its own controls for the job, can't ask you for a file, and finds a missing key or answer only once the build has started.

## What Changes

- **A live card runs the real thing inside the page.** The chat builds the page itself, such as a shop page, a landing page, or a small tool, and it runs in the card. You scroll it, tap it, and switch between *Phone* and *Computer* width, or open it full screen. It is the real page, not a picture of it. A live card can have the chat's own controls for the job, such as *pick a colour* or *put these in order*. What you pick goes to the chat with your notes. This is a sketch: the review page can't draw a live card until it is built.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><b>2. New home page</b><span class="grow"></span><span class="tag">Phone</span><span class="tag-outline">Computer</span></div>
    <div class="card col gap"><b>Corner Shop</b><div class="skeleton"></div><span>Spring plants, 20% off</span><button class="btn-primary">Shop now</button></div>
    <div class="row gap"><button class="btn-ghost">Full screen</button><span class="grow"></span><button class="btn-ghost">OK</button><button class="btn-ghost">Change</button></div>
  </div>
  ```
- **A website is planned as a live prototype, and built from it.** For a site this app doesn't run, such as a shop's pages, the chat makes the prototype from real files while it plans. Your notes change the prototype. Your go builds from those same files, and the check after the build shows *Approved* beside *Built*. Screens in the app keep the prototype they get today.
  ```mermaid
  flowchart TD
    plan["/plan"] --> proto["live prototype<br>in the card"]
    proto --> page["you try it"]
    page -->|notes| proto
    page -->|Build it| build["build from<br>the same files"]
    build --> check["Approved | Built"]
  ```
- **A page can ask you questions.** The chat puts a short form on the page: words, a choice, a date, a tick, or a file. Your answers go with your notes, or with *Build it*, so the chat doesn't have to ask in the chat. This is a sketch: the page can't draw a form until it is built.
  ```screen
  <div class="card col gap phone">
    <b>3. A few details</b>
    <label class="col gap">Shop name<input placeholder="Corner Shop"></label>
    <label class="col gap">Sale ends<select><option>Sunday</option><option>Next Sunday</option></select></label>
    <label class="row gap"><input type="checkbox"> Free shipping over $50</label>
    <div class="card col gap"><span class="muted">Logo: drop a file or tap to pick one</span></div>
  </div>
  ```
- **You can send files from the page.** Drop a file on a file question, or tap it to pick one on a phone. The file goes to the computer the chat runs on. From your Inbox it passes through your company app, which keeps it until the computer takes it. No one can open it after 24 hours, and the app deletes it the next time the Inbox is used. The database's restore history can keep deleted data for up to 30 days. Each file can be 25 MB at most, and one send 100 MB. A page never asks for a password, key, or card: those keep their own private link.
  ```mermaid
  sequenceDiagram
    participant You
    participant App as Company app
    participant PC as Computer
    You->>App: logo.png, with Send
    App->>PC: file and answers
    PC->>App: got it
    Note over App: file deleted
  ```
- **Every plan says what the build needs from you.** A *What the build needs* list sits above the bar. Each key, login, file, or answer the build needs says *Ready* or *Needs you*. A *Needs you* item holds its question, or a link to the private key page. *Build it* stays off until every item is ready, so a build never stops halfway to ask. A plan that needs nothing says so. This is a sketch: the page can't draw the list until it is built.
  ```screen
  <div class="card col gap phone">
    <b>What the build needs</b>
    <div class="row gap"><span class="tag">Ready</span><span>Shopify key</span></div>
    <div class="row gap"><span class="tag-outline">Needs you</span><span>Your logo</span></div>
    <div class="row gap"><span class="tag-outline">Needs you</span><span>Meta ads key</span><span class="grow"></span><button class="btn-ghost">Get the key</button></div>
    <div class="row gap"><button class="btn-ghost grow">Send notes</button><button class="btn-primary grow">2 things need you</button></div>
  </div>
  ```
- **One wiki page says how.** The review pages page gets live cards, forms, files, and the needs list, so any chat can make them.
  ```text
  wiki/
    review-pages.md   live cards, forms,
                      files, needs list
  ```

Non-goals: a live card gets nothing from the internet while you view it: the chat copies its fonts and pictures in when it builds the page. No email card yet: email is tested in WongOS first. No secret through a form. No file over 25 MB. Screens in the app keep today's prototype.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `review-pages`: the frame adds *What the build needs*; new requirements for live cards, website prototypes, form cards, and files sent from a page.
- `ux-wireframes`: a page may be 1.5 MB, with a warning over 800 KB.
- `apply`: the check after a website build shows the approved live card at phone and computer width.
- `inbox`: a sealed page may send files with its taps, no one can open them after 24 hours, and a review page's form is allowed beside the no-secret rule.
- `reply-links`: a page may send files with its text or action, to the same chat only.

## Impact

- `.agents/skills/plan/scripts/build-review.mjs`: `live` and `form` fences, the `## What the build needs` section, a larger page limit for live cards.
- `.agents/skills/plan/references/review-kit.html`: the live card's sealed frame, width switch and full screen; form inputs saved like notes; file pick and send; needs list and the Build gate.
- `.agents/skills/hand-over/scripts/reply-link.mjs` and `lib/inbox.mjs`: a file route on the tunnel server; files fetched with Inbox taps and saved under `.scratch/`.
- `app/worker/apps/inbox/`: file routes and a 24-hour clean-up; `app/src/apps/inbox/PlanView.tsx`: passes files from the frame to the app; a new D1 migration for file parts; a larger item limit.
- `.agents/skills/plan/SKILL.md`, `references/drawings.md`, `.agents/skills/apply/` (build from an approved live card), `wiki/review-pages.md`, `wiki/development/reply-links.md`.
- Tests: `review`, `review-browser`, `review-pictures`, `preview-review`, the reply-link tests, and the inbox worker and app tests.
- A minor release with a `CHANGELOG.md` entry; the new migration runs with the app's normal deploy.

## Decision log

- **2026-11-03** — Asked whether to plan this as one change or two → chose one change.
- **2026-11-03** — Asked whether every plan gets a *What the build needs* list that keeps Build off until all is ready → chose yes.
- **2026-11-03** — Asked whether files sent from the Inbox may pass through the company app → chose yes, kept until the computer takes them and deleted within 24 hours.
- **2026-11-03** — Assumed: website prototypes and the chat's own controls are one card kind, the live card, because both are chat-made pages that run in a sealed frame and send answers the same way.
- **2026-11-03** — Assumed: a live card runs with no internet, and the builder copies its files in, because a page that loads from the web can leak what you type and can look different later than when you approved it.
- **2026-11-03** — Assumed: files are kept in the app's existing database, in parts, not in a new file store, because every install has the database and staging has no file store, so uploads work everywhere with no setup step.
- **2026-11-03** — Assumed: 10 MB a file, 5 files a question, 25 MB a send, and pictures, PDFs, text and spreadsheets, office files, and zip files only, because that covers logos, briefs, and price lists while keeping the database small.
- **2026-11-03** — Asked, after reading the plan, for larger files → chose 25 MB a file and 100 MB a send, replacing 10 MB and 25 MB.
- **2026-11-03** — Assumed: the app holds at most 300 MB of waiting files for one install, and refuses a new file past that until the computer takes some, because a free Cloudflare database stops at 500 MB.
- **2026-11-03** — Assumed: a page is allowed up to 1.5 MB, not 500 KB, because a live website with a few pictures needs it, and the database takes up to 2 MB a row.
- **2026-11-03** — Assumed: Build and publish follows the same gate as Build it, because both start the build.
- **2026-11-03** — Assumed: a form question named like a password, key, token, or card number stops the build of the page, because a page's answers go into the chat.
- **2026-11-03** — Assumed: the needs list sits after the cards and before Decisions, next to the bar, because it decides whether Build is on.
- **2026-11-03** — Assumed: screens in the app keep `prototype.mjs`, because it already shows the real app on a preview.
- **2026-11-03** — Assumed: the build's test gates between parts moved to the end, as the build brief says, because all source and tests are written before any check runs.
- **2026-11-03** — Assumed: the app's file routes are `POST file?item=&name=&question=` and `GET file?id=`, not path parameters, because the inbox's route list matches a method and a fixed name.
- **2026-11-03** — Assumed: the app keeps a file in 512 KB parts, not 1 MB, because a part goes in one database row with room to spare.
- **2026-11-03** — Assumed: the shared contract lets an action take 4 MB, not 1 MB, and the inbox's item save takes 3 MB, because a 1.5 MB page rides inside a JSON body.
- **2026-11-03** — Assumed: `frame.ts` takes a file's bytes only when their type tag says `ArrayBuffer`, because a page in another frame can't pass an `instanceof` check.
- **2026-11-03** — Assumed: the app's 300 MB of waiting files counts every person in the installation, because the database limit is for the whole database.
- **2026-11-03** — Assumed: `REPLY_LINK_FILE_BYTES` and `REPLY_LINK_FILES_BYTES` set smaller file limits for the tests, because the tests can't send 25 MB files quickly.
- **2026-11-03** — Assumed: a file over the limit is read to its end, then refused, because a server that stops reading leaves the browser with no answer.
- **2026-11-03** — Assumed: an Inbox item with no page file saves its files in `.scratch/inbox-uploads/`, because the folder is named for the page's folder.
- **2026-11-03** — Assumed: the app deletes a tap's files when the chat can't be woken, as on a cancel, because no later tap uses them.
- **2026-11-03** — Assumed: the 100 MB a page counts sent and unsent files, because both sit on the computer.
- **2026-11-03** — Assumed: *Full screen* on a live card is a fixed layer above the page, not the drawing viewer, because the viewer shows a picture and a live card is a running page.
- **2026-11-03** — Assumed: answer lines name the card as *Change #n* on a plan and *Card #n* on other pages, as OK lines do, because each page names its cards one way.
- **2026-11-03** — Assumed: a needs error names the section's heading line, and a live error the fence's line, because the fault is in the whole section or the whole card.
- **2026-11-03** — Assumed: a live card's height is 200 to 4000 pixels, 640 when not given, because a shorter card hides the page and a taller one is longer than a phone page.
- **2026-11-03** — Assumed: a live card that tries to leave is started again three times at most, then stops until a reload, because a page that leaves at once would start again with no end.
- **2026-11-03** — Assumed: the page-size limit moves to 1.5 MB, with a warning over 800 KB, in the drawing and preview requirements too, because they named 500 KB.
- **2026-11-03** — Check: the browser tests press buttons in a scaled live card by sending the click event, not by a pointer click, because the test browser aims a pointer wrongly inside a scaled frame; what the press does is still checked.
- **2026-11-04** — Assumed: every inbox call deletes files over 24 hours old, not only a check-in, and the bytes go for every person in the installation, because a computer that never comes back would keep them; a timed sweep with no call at all is left out, because a mini app has no timed job.
- **2026-11-04** — Assumed: the plan's item lists the files the app still holds, and a tap that names a deleted one is refused as `files_gone`, because the page must ask for that file again, not close the link.
- **2026-11-04** — Assumed: each file part the computer reads holds that check-in's taps two more minutes, and the computer reports each tap as soon as it knows, because 100 MB is some 200 reads.
- **2026-11-04** — Asked whether day-old files need a timed clean-up or truthful wording → chose truthful wording: unreadable after 24 hours, deleted at the next Inbox use, kept up to 30 days in the database's restore history.
- **2026-11-04** — Checkpoint: built and reviewed in two rounds (stale file ids, 24-hour clean-up, long downloads, cut-off uploads, Build it hidden after a lost file, all fixed); local checks pass; tasks 7.2 and 7.3 wait for the preview.
- **2026-11-04** — Fixed, from the live check: a live card opened in the Inbox could stay at no size, because it measured its card before the card had a width; it now fits again whenever its card changes width.
- **2026-11-04** — Fixed, from the live check: `PROTOCOL` goes to 11, not 10, because ClaymooApp's copy on this computer already runs the shared helper at 10, and that copy can't read files: an Inbox tap would lose its file.
- **2026-11-04** — Fixed, from the live check: a *Ready* need read as one run of words, because the builder dropped the comma after the state; the name now keeps a colon before its detail.
- **2026-11-04** — Fixed, from the live check: after *Approve* in the Inbox, the page kept *Send notes*, *Remove* on a sent file, and a bare *Sent* line. The line and the bar came from main, the *Remove* from this change. A tap that reaches the chat now turns the page read-only under its answer, as the Archive shows it, because the computer closes the page right after.
- **2026-11-04** — Checkpoint: the preview walk passed 7.3 and found four faults in 7.2 (live card empty at first open, protocol not raised, Ready need lost its separator, answered page still open); all four fixed with tests; 7.2 runs again on this save.
- **2026-11-04** — Checkpoint: 7.2 passed on the preview at 9c69a13 (live card sized on 5 of 5 first opens, file delivered and gone from the app, answered page read-only) and 7.3 passed (needs list held Approve; an unsent file was deleted when its link closed).
- **2026-11-04** — Archive checkpoint: archived for release 45.9.0 after main (45.8.0) came in; the only local failure was the known `Welcome.test.tsx` timeout in the untouched Access app, which passes alone; the last local round could not run because another chat held the checks, so CI decides.
- **2026-11-04** — Check: `.agents/verification/journeys/landing-site/a-visitor-on-a-mac-reads-the-install-section.json` is re-recorded for the scenario 45.8.0 reworded: the old check expected *Free: your project is kept in a free GitHub account…*, and the page now says every way needs Cloudflare's paid plan. It now expects both ways' lines with *Cloudflare's paid plan, about $5 a month*, and drops the story-scene step, which expected nothing.
- **2026-11-04** — Archive checkpoint: the preview check at 567f423 passed (SUCCESS; 3 scenarios partly shown, the rest without a deployed route unverified), and this save keeps the re-recorded install-section check above.
- **2026-11-04** — Archive checkpoint: renumbered to release 45.10.0, because main took 45.9.0 (#496) while this change waited; main also brought the fix for the `daily-journal` test that failed the last save on a fixed date.
