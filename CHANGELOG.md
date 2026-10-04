# Changelog

`/wong-sync` reads the entries newer than your installed version
(`.claude/.wong-stack.json`) as context for planning the update. Newest first.

## Next (minor) — See memory facts with their evidence

- Ask for a fresh brief of eight current facts by default, or up to twenty on request, within 6,144 bytes. It keeps the most relevant whole entries before grouping, with compact dates and source pointers. Facts keep their original words, and source access keeps its existing permissions.
- Structured search returns the same selected facts as ordinary search. A source-repo evaluation reports keyword matches and harder wording misses separately; it makes no claim that retrieval accuracy improved.

**Updating.** No action needed. The memory commands arrive with the usual update; no data, configuration, or startup change is required.

## 29.17.0 — Restore independent task chats

- Before planning, the assistant still sees this repo's other workspaces, their plans, and open pull requests. When work overlaps, it asks whether to keep going here, work there instead, or narrow the request.
- Remove the instructions for task chats to message each other, agree on responsibilities, update titles, and recover peer conversations. Each chat returns to focusing on its own task.

**Updating.** No action needed. The usual update removes the retired coordination guide and restores the previous instructions. Existing plans, release history, and publishing checks stay in place.

## 29.16.0 — Finish safe preview checks before asking for help

- Preview checks complete every independent safe check before bringing you in. One help list names the remaining checks, the login, permission, or manual action needed, and what each should show.
- Writes and deletes use disposable staging data with known cleanup and test integrations. Shared data and real-world actions keep their permission boundaries; an unsafe check stays unverified while the others run.
- Safe simulations cover as much of blocked checks as possible and explain what remains unproven. You can skip selected remaining checks or all of them; skipped checks stay unverified and are not requested again unless you reopen them.
- After you help, the assistant resumes the remaining checks and repeats completed checks only when their conditions changed.

**Updating.** No action needed. The updated skill and guide arrive with the usual update; no data or configuration migration is required.

## 29.15.0 — Use cf for Cloudflare management

- The assistant uses Cloudflare's cf tool for authorized account inspection and one-off resource work. A dedicated guide explains how to find commands and use the existing account credentials.
- Setup and app publishing keep their existing workflows. The tool stays optional and adds no project dependency or customer sign-in requirement.

**Updating.** No action needed for existing apps, and no migration is required. The assistant installs the optional Cloudflare management tool on its computer when a task needs it, following the existing installation convention.

## 29.14.0 — Smoother key link

Giving your assistant a key now takes one page and about a minute.

- **Everything is on the link's page.** It shows a plain name for the key, a button that opens the service's key page, and a few short steps, above the box. The assistant writes them for that service when it sends the link; nothing per service is stored. With no steps, the page looks as before.
- **The link comes straight away and stays open for 30 minutes**, up from 10, with no *Ready?* question. The page shows the time left. A link you haven't opened closes early when another private link is needed on the same computer; the assistant then offers a new one.
- **The key is tested when you save.** When the assistant knows a harmless request that proves a key works, the page tries it once and says *Works*. A key the service refuses is not saved unless you tap *Save anyway*. With no test, or no answer, the key is saved and the page says it was not tested. The page names the address it tests against.
- **Paste with one tap, and long keys work.** *Paste* fills the box from your clipboard. A key over several lines, or a small key file such as Google's, is accepted: paste it, or pick the file, which your device reads itself.

The password link and the live browser link keep their *Ready?* question and their 10 minutes. A key still never passes through the chat, a log, or a published file.

**Updating.** No action needed. The link's scripts and guides arrive with the usual update.

## 29.13.1 — A check that needs the published change is a thread

- The preview check page says what to do with a check only the published change can pass: record it as an open thread and run it right after publishing, not as a task that can never be ticked.

**Updating.** No action needed.

## 29.13.0 — Keep the pictures from a preview check

- A preview check keeps its pictures. They go into the private storage that holds the chat transcripts, and the report on the pull request links each one. Only people who can log in to your app can open a link.
- Ask in chat for a past check's pictures, and the assistant shows them again.
- When pictures aren't kept, the report says so and why: the Cloudflare account has no storage, the site has no login yet, or the live site doesn't serve them yet. It no longer names a file that is already deleted, and the verdict is unaffected.

**Updating.** The update adds two lines to the app's entry file, `app/worker/index.ts`: one loads the picture route, and one sends `/_walk/` addresses to it after the login check. Pictures are kept from the first check after your next publish; until then the report says the live site doesn't serve them yet. A public picture folder (`WALK_MEDIA_BUCKET` and `WALK_MEDIA_BASE_URL`) keeps working and still shows its pictures inside the report.

## 29.12.0 — The preview check says how much it showed

- When part of a promise can't be shown on the preview, such as an email being sent, the check marks that promise *partly shown* and names the part, in place of a plain pass. The overall result is still a pass when nothing was contradicted.
- Passwords, keys, and tokens are removed from a check's evidence and its report before anything is posted.
- The page that explains how the check works states what was measured: fresh agents walked 20 past checks again and disagreed with none, and the check passed none of 30 planted mistakes.

**Updating.** No action needed. Reports on your pull requests gain a "partly shown" mark and, when something was removed, a line saying so.

## 29.11.0 — Keep an existing server and private project

- Hosts can check and prepare an existing Ubuntu workspace without replacing compatible tools, services, files or GitHub identities.
- The source agent supports a chosen workspace account and reports private-project dependencies, configuration and Paseo separately, with safe retries. Its root runtime stays separate from writable user tools, and revoked preserved agents stop without changing shared Paseo.

**Updating.** Installed projects need no action. Server hosts must support contract 4 and check the preservation manifest before enabling existing-server attachment. Contract 4 does not include the separate Artifacts capabilities. Existing agents keep their pinned source; choose this release when rebuilding or explicitly enrolling a compatible server. Review the project's required setting names before marking its code workspace ready; do not copy production secrets.

## 29.10.0 — Task chats coordinate directly

- Chats find overlapping work by current titles and confirmed task context, then exchange brief messages with its owner. Each keeps its own task and publishing approval; agreements stay in existing plans.
- Each chat keeps its title aligned with meaningful task changes. Busy owners keep working, and dependent work waits until safe contact is available.

**Updating.** No action needed. Direct messages need the optional Paseo app; without it, the assistant still finds other saved and unsaved work and asks when an overlap cannot be resolved.

## 29.9.0 — Windows setup handles folder links

- Setup readies Windows folder links automatically, turning on the needed setting when links fail. Approve Windows' permission window if it appears; the assistant runs the commands and checks the links before installing.
- The README's copied message includes the setup guide's address, so the assistant can start before it finds the setup command.

**Updating.** No action needed. This changes fresh setup; existing projects keep their settings.

## 29.8.0 — Make WongStack your own

- A guide explains how to customize a fork's defaults, install it with one request, and keep projects updated from it.
- Easy setup uses the requested repository's guide, tool requirements, and payload, and records that source for later updates. With no custom source, it uses the original WongStack.

**Updating.** No action needed. Existing projects keep their recorded source. The guide arrives with the usual update.

## 29.7.0 — Log in with fewer taps

When your assistant meets a login or a code, you type less, and you get the live browser link only for steps only you can do on the page.

- **No saved password? You get the password page, with the website filled in.** You fill only your username and password, or pick them from your password manager, and tap *Save and continue*. The assistant logs in with it and carries on. You can still drop an export file there too.
- **A saved password that stopped working gets the same page**, with the website and your username filled in. You type only the new password, and it replaces the old one.
- **A code sent by email, the assistant fetches itself.** When its browser is already signed in to that email, it opens only the newest message from that site, takes the code, and says so in one line. It shows no picture of your inbox, and never logs in to your email just for a code.
- **A code sent to your phone or app is asked in the chat.** The assistant names the site and where the code went, you type it in the chat, and it carries on. No link.
- **"Approve on your phone" needs no link.** The assistant asks you to tap *Yes* in the site's app and waits.
- **A wrong or expired code is asked again**, after asking the site for a new one.
- **The live browser link stays for what only you can do on the page:** picture puzzles, passkeys, *Sign in with Google* or *Apple*, and backup codes. Passwords still never go in the chat.

The rules live on a new wiki page, [login codes](wiki/development/login-codes.md).

## 29.6.1 — Search memory with the words a note would use

The memory page now says that search matches word forms, not meanings: a question in other words can miss a note, so the assistant searches with the words the note itself would use.

## 29.6.0 — Memory finds what you mean and keeps itself tidy

Your assistant's memory now finds a note when you ask in other words, keeps its open questions tied to whoever should check them, and tidies itself on every save.

- **Search matches different forms of a word.** *Previews*, *checked*, and *checking* find notes that say *preview* and *check*. Filler words like *how* and *should* no longer pull in unrelated notes. A fixed set of real questions now runs in the automatic checks, so a later change can't quietly break search.
- **Every open question says who checks it, and stale ones close.** A new open question must name the step (*plan*, *verify*, *sync*) or the part of the code whose next visit should check it, or it isn't saved. Older ones get that label where their own words name one. One left unchecked for 30 days closes as *never checked*, and stays searchable.
- **Labels stay clean.** Look-alike labels merge under one name, so a search on *memory* also finds notes labelled *memory-worker*. The person who set up memory can now correct a label's description, and each code-area label's description follows the shipped list.
- **The simple tidying runs on every save, as plain code.** Labelling notes by folder, merging look-alike labels, and closing stale questions happen each time memory saves, with no AI and no waiting. The occasional AI tidy-up keeps only the work that needs judgment.
- **Notes about a folder show up on their own.** The first time the assistant changes a file in a folder during a chat, that folder's open questions and newest notes appear before the edit, once per folder. It works in Claude Code and in Codex; Codex asks once to trust the new step.

**Updating.** After this update is live, the person who set up memory runs `node .claude/skills/memory/scripts/memory.mjs migrate` once, to rebuild the search index so it matches word forms. Search works as before until then.

## 29.5.0 — Wiki pages stay short, titled, and their section links work

Every publish now checks each wiki page the way code is checked, and the three longest pages are split into shorter ones.

- **A page over 3,000 words fails the check.** The message names the page and its length, and says to split it by its sections into pages beside it. A long page is slow to read and costly for the assistant to load.
- **A link to a section must land on a heading.** A link like `browsing.md#hand-the-browser-over` fails when that heading is renamed or moved, naming the page and line that link it.
- **Every page opens with its title and a sentence.** A page with no `#` title, two titles, or a list straight after the title fails, because a reader who lands from search needs the first line to say what the page is.
- **Three long pages are split.** The deploy pipeline, browsing, and session memory pages each keep their address and their opening sections. Their longest later sections move to new pages beside them: [staging bindings and secrets](wiki/stack/staging-bindings.md), [CI on GitHub Actions](wiki/stack/github-actions.md), [when a site blocks the agent's browser](wiki/development/blocked-sites.md), [save your passwords](wiki/development/passwords.md), and [the memory key](wiki/development/memory-key.md). Each moved section leaves its heading behind with a sentence and a link, so links to it still work.
- **The wiki rules name the limit**, so the assistant splits a page before the check has to catch it.
- **A code-only change skips the wiki check.** It runs when a change touches any Markdown file or removes or moves a file, and the run page says when it skipped.

**Updating.** Your next publish runs the new checks on your own wiki pages too. Ask the assistant to split any of your pages over 3,000 words by its sections, and to fix any section link the check names. Five sections moved to new pages: *Twin every stateful binding* and *One declared list of secrets, two Workers* (now in `wiki/stack/staging-bindings.md`), *CI is GitHub Actions* (now `wiki/stack/github-actions.md`), *When a site blocks the agent's browser* (now `wiki/development/blocked-sites.md`), *Save your passwords* (now `wiki/development/passwords.md`), and *The memory key* (now `wiki/development/memory-key.md`). A link from your pages to one of those headings still works; a link to a smaller heading inside one, such as `memory.md#joining-through-github`, needs its page changed to the new one.

## 29.4.0 — One web of code, facts, wiki pages, specs, and past plans

When your assistant is about to change part of your code or a wiki page, one lookup now brings up everything tied to it, and every publish checks that no wiki page is lost.

- **One lookup shows everything linked.** Ask about a file, a wiki page, or a topic such as *mini-apps*, and you get its topic, the wiki pages and records that own it, the past plans that changed it, the pages that link to it, and the saved notes about it. Planning and building already run it before the first edit, so they get all of it.
- **Past plans come back when you touch the same code.** The five newest plans that named the file come first, then the ones about the same topic, so the assistant sees why the code has its shape before it changes it.
- **Each topic names the pages that explain it.** The topic list now names the wiki pages for each topic. Add your own pages beside your own topics, and the next update keeps them.
- **Every publish checks your wiki.** It fails when a page links to a page that's gone, when no other page links to a page, or when a section's main page skips one of its pages, and names each one. The assistant fixes it in the same change.

**Updating.** Your next publish checks your wiki's links for the first time. If it finds a lost page or a broken link, ask the assistant to fix the pages it names, then publish again.

## 29.3.0 — Link memory facts to the code they're about

A lesson your assistant saved about part of your code now comes back when a change touches that code, not only when a search happens to find it.

- **Each fact names the part of the code it's about.** A short list matches folders to areas, such as your app's server code to *worker* and the wiki to *wiki*. A saved fact about code gets its area, the way it already gets a topic.
- **Building a change loads the facts for the code it touches.** Before the first edit, the build reads which folders the plan names and loads the saved facts for those areas, so a warning about the server routes shows up before the routes change. Planning does the same for the files it expects to touch.
- **Older facts get their area too.** The background tidy-up re-saves each one about a mapped folder with its area, keeping its words, its date, who wrote it, and its link to the chat it came from. On a teammate's computer it changes only that teammate's own facts.
- **Your own folders can join the list.** Add a folder to `.claude/skills/memory/references/areas.json` with a name and a short definition, and the next update keeps it.

**Updating.** Nothing to do by hand: the next build loads areas, and the next tidy-up tags older facts.

## 29.2.0 — Setup from any folder, and a first message that gets to know you

Setup no longer needs an empty folder, and your starter site's first message now teaches the assistant who you are.

- **Paste the setup prompt anywhere.** In a folder that already has files, setup leaves it alone and installs into a new `wongstack` folder in your home folder, or `wongstack-2` when that one is taken. It tells you where it went and to open that folder in Paseo next time.
- **"Make it yours" gets to know you.** The box's message now asks the assistant to ask first, then skim your Claude Code and Codex chats from the last 30 days on this computer, ask two or three short rounds of questions, and save short notes about you before it makes the page yours. On a computer with no past chats, it goes straight to the questions.
- **Your past chats are read safely.** The assistant reads them through a small built-in tool that keeps only what you typed, hides passwords and keys, and keeps the reading short. The notes it saves never hold passwords, keys, or copies of your chats.

**Updating.** The new message reaches your home page only while the *Make it yours* box is still on it; once you've removed the box, it stays removed. Nothing to do by hand.

## 29.1.1 — Say why the assistant picks its own memory search

The memory guide now says why the assistant searches memory with its own words once it knows the task, instead of loading memory from your first message: what loads stays for the whole chat, and a search on your raw words pulls in unrelated notes.

**Updating.** Nothing to do by hand.

## 29.1.0 — Load what matters at session start

The briefing your assistant reads at the start of each chat now holds what applies to any task, and the assistant looks up the rest once it knows what you want.

- **Open questions on other work leave the briefing.** One line counts how many wait on each step, such as plan 3 or save 5. Open questions on the work you're on still come first.
- **Your own wiki page loads next**, up to a set size, with a line pointing to the rest. Then your newest preferences and decisions get the room the old notes took.
- **The assistant searches memory once it knows the task**, in its own words, before it acts on more than a quick question.
- **Open questions come back when their step starts.** Each one is tagged with the step that should check it, so `/plan` loads its few notes, not all of them. The background tidy adds the tag to older ones.

**Updating.** Nothing to do by hand: your next chat uses the new briefing.

## 29.0.1 — Say what you lose without Paseo

The required-tools page now lists everything that needs Paseo: chatting from your phone, closing a workspace, a browser hand-over waking the chat, and tidying idle workspaces. Nothing changes in how WongStack works.

## 29.0.0 — Mini apps live in the main app

A mini app used to be built a different way from the rest of your app, and could reach only the database. Now it's part of the main app: one way to build any page or tool.

- **Same addresses, same home page.** Each app keeps its own folders, its address at `/apps/<name>/`, and its card on the home page.
- **It can do more.** An app's server side can use your saved keys for outside services, such as a payment provider, and knows who's signed in. Your memory stays out of reach, as before.
- **The same checks as the rest of your app.** Every line of an app's code has tests. A change to one app runs all your app's checks, so it takes a few minutes, not seconds.
- **The home page never waits for its list.** The list is part of the page, so it no longer shows *Loading your apps…*. An app with no title or description fails the checks and names its folder.

**Updating.** The update moves each of your mini apps into the main app, at the same address and keeping its data, and shows each one in the preview before anything is published. You don't do anything by hand; the plan names every app it moves.

## 28.8.0 — Hosted setup finishes without a card

A wongstack.com server now finishes setting up your app even when your Cloudflare account has no card, the same way setup on your own computer already does.

- **Your site goes live with the login off.** When Cloudflare wants a card before it turns on the email login, the server install carries on instead of stopping, and your dashboard shows the login is off. Your memory stays private behind its own key.
- **Add the card later, then turn the login on.** Choose *Turn on the login* on your dashboard: the server turns it on and leaves the change for your assistant to publish. It never overwrites your work.
- **Older servers work as before.** A server built before this version still stops until the login is on.

**Updating.** Nothing to do by hand: installed repos never receive the server folder, and a site that already has the login keeps it.

## 28.7.0 — Setup finishes without a card

Cloudflare turns on the private email login only once your account has a card on file. Setup used to stop there and had to run again. Now it finishes in one pass.

- **Your site goes live without the card.** When Cloudflare wants a card first, the site goes live without the email login: anyone with the link can see it. Your memory stays private behind its own key.
- **The card is an optional last step.** The closing message lists three links to open in your own browser (add a card, turn on storage, pick the free login plan) and says what you miss without them. Tell the assistant when it's done: it turns the login on and publishes the change.
- **The final checks run themselves.** Setup checks your site with its own machine key instead of asking you to sign in by email code on every site. Opening your link and seeing your app is the human check.

**Updating.** Nothing to do by hand. A site that already has the private login keeps it, and the server installer still stops until the login is on.

## 28.6.0 — Get past sites that block the assistant's browser

Some sites show a *Verify you are human* check to the assistant's browser, or turn it away, and tapping the check yourself doesn't help. Now the assistant says so in one line and carries on in Cloudflare's own cloud browser, which many of those sites let in, such as Uber Eats and SkipTheDishes.

- **You stay logged in.** It copies just that site's login across before the switch and back after. Your other logins never move.
- **Hand-overs still work.** If Cloudflare's browser needs you, say for a login code, you get the same private link.
- **One setting flips the default.** Say *use the cloud browser first* if most of your sites block the assistant's own.
- **Nothing is disguised.** A site that turns both browsers away, like DoorDash, gets its link and the steps to do on your phone.

Cloudflare's browser runs on your Cloudflare account: the Workers Paid plan includes 10 browser hours a month, then $0.09 an hour, and the free plan 10 minutes a day.

**Updating.** Nothing to do by hand. The first time a site needs Cloudflare's browser, your Cloudflare key gives itself the one permission it needs, *Browser Run Write*, and the assistant tells you it did. New installs get it during setup.

## 28.5.0 — The server's helper lives in WongStack

The helper each wongstack.com server runs, which pairs devices, connects GitHub, installs WongStack, and copies a server, moves into WongStack's `server/agent/`, beside the setup script. A server built from WongStack or your fork runs the helper from that same copy, so a fork decides what its servers run. A running server keeps its helper until it is rebuilt.

- **A written agreement, version 1.** [`server/README.md`](server/README.md#the-agent) spells out every message between the helper and wongstack.com. Each check-in names that version and the commit the server was built from, so wongstack.com can check a fork before building from it.
- **No size limit on the setup script.** wongstack.com now downloads it, so a fork's setup script can grow freely.

**Updating.** Nothing to do by hand: installed repos never receive the server folder.

## 28.4.0 — Keep open questions from crowding the briefing

- **Room for decisions and preferences.** The briefing each session starts with still shows every open question on the work you are on first. Other open questions show only when under 30 days old, at most 8 of them, and a line says how many more there are and how to search them. Older questions stay saved and searchable.
- **A done check closes its question.** When a session saves what it learned, the save check also lists open questions that sound like what the session did, even ones filed under other work, and the writer closes each one it answered with a note of what was found.
- **The daily tidy-up closes answered questions** when a later note shows the answer.

**Updating.** Nothing to do by hand.

## 28.3.0 — Give the private links their own home

The tools behind the three private links (handing the browser to you, receiving a key, saving passwords) move out of `/verify`'s folder into their own hidden skill, `hand-over`. It stays out of your list of commands; the browsing and keys guides point the agent to it. The links look and work as before, and each session reads no more words at startup.

**Updating.** Let any open private link finish or expire before you update: it runs from the old folder, which the update removes. The update moves the files for you.

## 28.2.0 — You handle token websites

When a task needs a service's website to get or change an API key or token, the assistant gives you the service link and short steps for your own browser. It waits for new or replacement values through the private key link, or your confirmation for a change with no new value. Saved website logins, ordinary browsing, and existing authorized token management through APIs continue as usual.

**Updating.** Nothing to do by hand. Existing credentials and private key links need no migration.

## 28.1.0 — Check the preview toward a goal

- **One goal, not a script.** `/verify` states what a check must prove and what it may do on its own, and chooses how to check each promise. You still get pictures and answers from the live preview, a verdict, and one comment on the pull request, with the same limits: it fixes a failure in this change at most twice and never merges.
- **Plain checks.** Ask it to screenshot a page, test an address, or click through the app. It checks the address you name, else the live preview, shows what it saw in the chat, and posts nothing unless you ask.
- **Each point said once.** The walkthrough page keeps why a check works this way, and the how-to page keeps how to run one.

**Updating.** Nothing to do by hand.

## 28.0.0 — Business pages and previews require login

New standalone and managed installs protect pages, assets, APIs, mini apps, and old/new previews automatically with email login. Human sessions default to 30 days; machine and memory credentials keep their separate lifetimes. Deployment checks refuse publication without native Worker protection. Managed team changes retain owner/machine access and revoke the workspace's human sessions on removal, with failed provider work visibly pending.

Standalone installs also receive the Node version file their test and publishing workflows require.

The protected login address works for a first preview before business pages are published.

**Updating.** Review existing public pages, webhooks, protocols, and overlapping protection before the first updated push. Keep local business code and data; merge the signed login check instead of replacing handlers. Confirm the owner's reachable email and real team, attach protection to both existing Workers without a gap, and give the publishing key read permission to check it. Keep old versions protected. Managed workspaces also need their new encrypted management connection; report reconnection or failed membership/revocation work as pending until confirmed. Verify real email login, independent machine access, and memory before reporting the workspace private.

## 27.10.0 — Room to use the browser

Browser hand-over links separate the live website from its fields: switch between Page and Fill fields on a phone, or see both beside each other on a computer. Phone previews let you swipe up, down, left, or right through a readable login screen, then keep scrolling the website at its edges. Tap a supported text field on the page to open the phone keyboard; typing is shared with Fill fields. Wider forms expand the browser within its limits. Back and Forward arrows, a Reload icon, and a Return to start icon stay at the bottom so you can recover from an accidental click. Each has an accessible name and tooltip. Return to start opens the exact page where the private link began, even after visiting another website; when there is no browser history, Back and Forward explain that and preserve your typing and preview position. While the phone keyboard is open, the header, view tabs and navigation hide to give the selected field more room; they return when it closes, keeping your typing and the website's size.

**Updating.** Let existing private links finish or expire before opening another with the updated scripts. Saved logins need no migration.

## 27.9.0 — Improve toward an outcome

- **Ask for a useful result.** `/improve` finds and ships one supported improvement that makes the project more useful, reliable, or easier to maintain. Focus on an area or a desired outcome; the agent chooses its investigation using project goals, remembered problems, and current work.
- **Use the normal delivery process.** Invoking `/improve` authorizes one improvement through `/ship`, with its existing checks. The fixed scan, weekly rotation, and separate maintenance records are removed. Findings-only and no-change results remain available.

**Updating.** Nothing to do by hand. Existing area prompts and scheduled runs remain usable; no schedule migration is needed.

## 27.8.0 — A welcoming starter workspace

- **Make the workspace yours.** The starter home page has a permanent heading and one request to name it and remove the welcome guide, with explanations and a preview before publishing.
- **A familiar shared look.** Neutral light and dark colors, the colored WongStack mark, clear keyboard focus, and inviting app cards give the starter and Hello example one identity. Its name and logo are defaults you can change by asking in chat.
- **A finished little example.** Tap Hello's logo or WongStack name to return home. Its name field sits above its main action, with the greeting beneath it. It is labeled as an example, and an empty app list explains how to ask for a tool.

**Updating.** Adapt the welcome, shared look, and Hello example through the reviewed update plan, keeping your own heading and branding or explicitly agreeing how to adapt them. Keep a finished welcome guide removed.

## 27.7.0 — Forms return to the workspace

Password and token pages save and continue in one tap, keeping partial successes for correction. Completed private input wakes its requesting workspace with a result-only message and shows whether the chat was notified. Website hand-over pages mirror native form buttons below their fields, preserving the site's labels, validation, and code steps.

**Updating.** Let existing private links finish or expire before opening another with the updated scripts. Saved credentials need no migration.

## 27.6.1 — Refresh the app and test tools

- **The test tools update together.** The starter app uses matching Vitest and coverage versions, plus newer Cloudflare development tools, linting, and duplicate-code checks. Its HTTP client includes the available security fixes.
- **The repository's test linter is current.** WongStack's own script checks use the newer linter too.

**Updating.** Nothing to do by hand. Existing apps adapt their dependency files through the reviewed update plan.

## 27.6.0 — Memory uses your agent's model

- **Background memory follows your agent.** Claude Code and Codex use their normal model for unattended memory capture. You can still choose a separate memory model with `WONG_MEMORY_MODEL` or `WONG_MEMORY_CODEX_MODEL`.
- **Allow for a larger run.** Capture may use more of your model allowance when your normal model is larger than the old small model.

**Updating.** Nothing to do by hand.

## 27.5.1 — How to quote a pasted key

- **A pasted key reads back as pasted.** [The secrets page](wiki/development/secrets.md#receive-a-key-through-a-private-link) now says how the assistant quotes a pasted key in the private file, the same way the key link does, so a key with unusual characters still works.

**Updating.** Nothing to do by hand.

## 27.5.0 — Give API keys through a private link

- **A private link for keys.** When a task needs a key the assistant doesn't have, it asks first, then sends a private link. You paste the key there and tap *Save*, so it never sits in the chat's history. You can also ask for it: *send me the key link*. The link is new each time and closes once every key is saved, when you tap *Done*, or after 10 minutes.
- **One box per key.** The page names each key and says where to get it, and says when a new key replaces one saved now. A tick shows by each saved key.
- **The chat names keys, never shows them.** The key goes to the same private file as before, and to your live site and its test copy when the site uses it.
- **Pasting still works.** A key pasted into the chat is still saved, and the assistant says the link is safer next time.
- **The guides say so.** [API keys](wiki/stack/api-keys.md) now leads with the link; the developer page has [how the assistant sends it](wiki/development/secrets.md#receive-a-key-through-a-private-link).

**Updating.** Nothing to do by hand. From now on, the assistant sends you a private link when it needs a key.

## 27.4.0 — The password link is one screen

- **No choice to make first.** The password link opens straight onto one page: a box for your export file, the list of logins, and a small form to add one by hand, with *Save* and *Done* at the bottom. *Back* and *Add another* are gone.
- **Drop the file or tap to pick it.** On a laptop, drag your export onto the page. On a phone, tap the box and pick the file. A second file adds to the same list, skipping logins already there.
- **Typed logins join the same list, ticked.** Fill the form and tap *Add*. A form you filled but didn't add is saved too, so one login is still one tap.
- **One Save for everything ticked.** Saved logins show *Saved*. One that fails stays ticked, so tapping *Save* again retries it. Tapping *Done* with ticked logins not yet saved asks you to tap again.

**Updating.** Nothing to do by hand.

## 27.3.1 — The wiki names the shared script helpers

- **Where the shared pieces live, written down.** The deploy page's script table now says the wrangler-config helpers also decide which branch is live and hold the staging guards, and that the CLI helper is shared with the skills.

**Updating.** Nothing to do by hand.

## 27.3.0 — Tidy the shared helpers, checks, and test fakes

- **One copy of each shared piece.** Code about fifteen scripts repeated now lives in one place: the memory skill's `scripts/lib/cli.mjs`, and the routine skill's `scripts/lib/paseo.mjs`. Nothing you see changes; a later fix lands once.
- **One set of safety checks before a test upload.** The checks that stop a test copy of your app from overwriting the live one now run from one shared place, so the two upload paths can't disagree. A failed upload now keeps its full error in the log.
- **One answer to "which branch is live".** Every upload script now picks your live branch the same way: the one you set, else the default branch your code host names, else `main`.
- **Less repetition in the automatic checks.** The step that works out what a change touched is written once, in `.github/actions/change-scope/`, and shared by the three check runs.
- **Warnings in your app's code now fail its checks**, as they already do for WongStack's own code.
- **Unused code removed:** the usage-cost report nothing ran, and parts of three scripts that nothing called.

**Updating.** Your app's checks now fail on a lint warning, not only on an error. If the first check run after this update goes red, fix each warning it names.

## 27.2.2 — The deploy page names the test database's id rule

- **Why a test database needs its own id, written down.** The deploy page's table of test-copy resources now says the test database needs its own id as well as its own name, and that every test step stops when either matches the live database's. [Twin every stateful binding](wiki/stack/d1-pipeline.md#twin-every-stateful-binding) owns it.

**Updating.** Nothing to do by hand.

## 27.2.1 — Four bug fixes from a repo audit

- **A test branch can never touch the live app's data.** If the test copy of the app points at the live database, every test step now stops before it touches it: each branch push, each test deploy, each preview, and each staging reset. Before, only the preview and the reset checked, and only by the database's name, so a copied entry renamed by hand got past all of them. It now matches by name or by id.
- **A mini app's test files stay private.** One rule, in `mini-apps/is-test-file.mjs`, now decides which files are tests. CI runs them, the build leaves them off the site, the app refuses to serve them, and the check for switched-off tests reads them. Before, a file named like `foo_test.mjs` ran as a test and was also published under `/apps/`.
- **`/verify`'s staging reset runs.** After a failed check, it resets staging with a command that works wherever the app's folder is.
- **Setup keeps your keys in the right place.** When setup can't find the main copy of the repo, it now stops and says why, instead of saving the keys in a copy that may be deleted.

**Updating.** Nothing to do by hand. If a branch build now stops and says your test copy uses the live database, give the test copy its own database in the app's settings file, `wrangler.jsonc`, as the message says.

## 27.2.0 — Save your passwords for the agent's browser

- **The agent logs in for you.** When a site logs you out and you saved a login for it, the agent fills it in and carries on, with no link to open. If the login fails, or the site asks for a code sent to you, it hands you the browser as before. With two saved accounts for one site, it asks you which to use.
- **A private link to save logins.** Say *save my passwords* or *add my Netflix login*, and the agent sends a private link like the hand-over link. It closes when you tap *Done*, or after 10 minutes.
- **Upload an export, then tick what the agent may use.** Export your passwords as a CSV file from Chrome, Apple Passwords, LastPass, Bitwarden, 1Password, Dashlane, or Firefox, and pick it on the page. Your phone or laptop reads the file itself and lists every site, none ticked. Only the logins you tick leave your device.
- **Or add one login.** A small form takes the website, username, and password, filled from your password manager or typed.
- **The agent never sees a password.** It learns only which sites you saved, and it still never asks for a password in the chat. Say *forget my Netflix login* to remove one, or *which logins do you have?* to list them.
- **Where they're kept.** On the computer the agent runs on, in the browser tool's own locked store, never in your repo. The key to that store sits on the same computer, so it stops a copied file from exposing your logins, but not someone with full access to that computer. Keep bank and email out unless you trust the agent with them. [Save your passwords](wiki/development/browsing.md#save-your-passwords) owns the details.

**Updating.** Nothing to do by hand. Say *save my passwords* to start.

## 27.1.2 — Each rule has one home

- **Each rule is written once.** Where a page repeated a rule, it now links the one page that owns it, so the copies stop disagreeing: what an install gets, which commands save and publish, what to ask after a plan or a publish, and the choices when a request splits into parts.
- **After a plan, one way on.** *When you're ready, type `/apply` to build it.* now shows only after you pick *Review the plan*, where no question follows. Elsewhere the closing question already offers *Build it now*.
- **The Cloudflare setup is no longer called optional.** Every install takes it, so pages that said "if you took the stack" now just say what it does.
- **The record of what shipped matches the tools.** Pasted review notes that only ask a question get an answer, not a plan edit. `/verify` blocks nothing on its own run; inside `/ship`, a failed walk puts the choice in front of you. Plain words and link checks each have one owner.
- **Small mismatches fixed.** A new server gets Node 22, like everything else. The README's command list gains `/verify`, and the knowledge-center page gains `/improve` and `/routine`. `curl` joins the required tools, and the payload manifest says setup also copies the blank `.env.example`.

**Updating.** Nothing to do by hand.

## 27.1.1 — The wiki keeps WongStack upkeep apart, and database fixes on their own page

- **Database fixes have their own page.** The three guides for when your live database breaks (undo a bad update, never change it by hand, repair its record of updates) moved off the deploy page onto [Fix a broken production database](wiki/stack/d1-recovery.md), unchanged. The deploy page links it.
- **Each how-to lives in one place.** Sending an improvement to WongStack now points to [WongStack's contributing guide](.github/CONTRIBUTING.md) for the steps and keeps only what matters from an install. The release steps, and what *patch*, *minor*, and *major* mean, live in one rule the other pages link.
- **Pages say what they are.** The wiki's front page, the Cloudflare token page, and the login-wall page now open with what they cover. The wiki rulebook's *Adding a page* is a short numbered list.

**Updating.** If one of your own pages links the recovery sections at the bottom of the deploy page (`d1-pipeline.md`), point it at the new database fixes page, `wiki/stack/d1-recovery.md`, instead.

## 27.1.0 — A handed-over page fits your phone

- **Readable on a phone.** When the agent hands you its browser and you open the link on a phone, the site now shows its own phone layout at full size: text you can read and buttons you can tap, not a tiny desktop page squeezed into your screen.
- **It goes by the window's width.** A window narrower than 800 points gets the phone size, so a laptop window dragged narrow gets it too; a wider one keeps the desktop size. Turning the phone sideways re-fits the page, and opening the keyboard doesn't, so the page never jumps while you type.
- **The agent gets its desktop page back.** However the link closes, the page returns to its desktop size before the agent carries on. [Hand the browser over](wiki/development/browsing.md#hand-the-browser-over) owns the details.

**Updating.** Nothing to do by hand.

## 27.0.0 — Memory stays in its own repo

- **Each repo's memory is its own.** Nothing is sent to another repo, and nothing loads from one when a chat starts. Home becomes an ordinary repo you happen to use alone: setup no longer asks whether a repo is your home, and nothing records one on your computer.
- **One table says who sees what.** Inside a repo there are two levels: the team, or only you. Facts about you, a reader's facts, and your chats are only yours; the admin sees everything. [Who sees what](wiki/development/memory.md#who-sees-what) owns the table, and every other page links to it.
- **"Only you" is now a real lock.** Before, your computer hid a teammate's personal facts, and one flag showed them. Now the memory store itself holds them back, however a teammate asks. Only the admin's `--everyone` shows everyone's; in a repo only you use, you are the admin.
- **`#private` is gone.** Typing it no longer keeps a chat from being saved. Chats already marked private stay unsaved.
- **The cost.** Your likes no longer follow you from one repo to another: each repo learns them on its own. Something personal you say in a work chat stays in that work repo, where the admin can read it. For anything no one else should see, use a repo only you use.
- **The browser pages moved.** Saved logins, pictures of the browser, and handing it over now live on [Browsing](wiki/development/browsing.md), unchanged.

**Updating.** `#private` no longer keeps a chat out of memory, so leave anything no one else should see out of a shared repo's chats. Your likes and habits stop following you from your home repo into this one; each repo learns them again. You can delete `~/.wong-stack/machine.json`, the file that named your home: nothing reads it now. Your home repo's facts stay in home, where its own chats still see them. A teammate whose branch predates this update gets a refusal when they search memory, until they update that branch from main.

## 26.31.0 — A "See the preview" choice after a build

- **See what was built, even when the link is hidden.** Some apps hide the text written just above a question, so the preview link never showed after a build. The last question now offers *See the preview* next to *Publish it*, *Change it more*, and *Save it*. Picking it shows the link on its own, with no question after it, and builds, saves, or publishes nothing; your next message decides.
- **The link opens the page you changed.** A preview link now goes straight to the page that shows the change, such as a mini app's page or the settings page, not the home page. It shows on its own line as *Click here to see the preview:*, like the plan's link. Any reply that shows a preview link and then asks offers *See the preview*. [Print the preview's link](.agents/skills/explore/references/asking-the-user.md#print-the-previews-link) owns the rule.
- **A gap under the plan's link.** A blank line now separates the plan's link from *When you're ready, type `/apply` to build it.*, so the chat no longer runs them together.

**Updating.** Nothing to do by hand.

## 26.30.0 — Fill a handed-over form from a list of its fields

- **Every field in one list, dropdowns included.** When the agent hands you its browser, the page now lists the site's fields under the live view, each with its label: a box for each text field, a dropdown with the site's own choices, and a tick box. What you type or pick lands in that field as you go, so an expiry month or year dropdown works from a phone at last. You then tap the site's own *Pay* or *Sign in* button in the live view.
- **Your password manager fills it in one tap.** Each box says what it holds (card number, expiry, security code, email, password, one-time code), worked out from the site's own marks or the field's name and label. So 1Password or your phone's autofill can fill the whole list at once.
- **Private as before.** The list shows only labels and choices, never what's in a field. What you type goes to the site and nowhere else; the agent still sees only the page's address, or whether the box it waits on is gone.
- **A multiple choice before the link.** Before a hand-over, the agent now asks with two choices, *Ready, send the link* or *Not now*, instead of a plain question you have to type an answer to.
- **The old way still works.** A field the list can't reach, such as one inside a payment provider's embedded box, still works by tapping it in the live view and typing under *Other typing*. [Hand the browser over](wiki/development/home.md#hand-the-browser-over) owns the details.

**Updating.** Nothing to do by hand.

## 26.29.0 — Ask in chat before handing the browser over

- **A yes or no is a chat question.** Before the agent publishes, sends, books, pays for, or deletes something in its browser, it asks you in the chat, with a picture of the page, and waits for your yes. It never hands you the browser just to get that answer.
- **The link comes after you answer.** When a step needs you on the page (a login, a code, a card), the agent first asks in the chat whether you're ready, and sends the link only once you reply. A link dies after 10 minutes, so one sent while you're away was dead by the time you saw it. If you just said *let me take over*, the link comes straight away. [Hand the browser over](wiki/development/home.md#hand-the-browser-over) owns the rule.

**Updating.** Nothing to do by hand.

## 26.28.0 — Close a workspace from any finished task

- **A new `/close` wraps up a chat in one go.** It asks nothing. It saves what the chat learned, saves any unfinished work to GitHub, and otherwise updates the wiki. Then it closes the workspace; the chat stays readable in Paseo's archived list. [`/close`](.agents/skills/close/SKILL.md) owns the steps.
- **Nothing planned is forgotten.** Before it closes, `/close` writes a wrap-up to memory: what the chat set out to do, what got done, and one open to-do for each piece left. The next session start shows them, and `/continue` picks them up.
- **The whole conversation is kept.** `/close` uploads the chat's transcript, secrets blanked out, to the memory store's private storage right away, through the new `memory.mjs keep-transcript`. A chat marked `#private` is never uploaded, and a store without that storage skips it and says so.
- **Unfinished work is never lost.** It is saved to its own branch with an open pull request, off the live site, for `/continue` to pick up on any computer. Only *close and throw it away* deletes it: that closes the pull request and deletes the branch, through the new `tidy.mjs close --discard`. Your project's main folder is never closed or thrown away.
- **Only `/close` updates the wiki.** `/ship` now just puts code live. After a publish, `/close` writes the lasting facts into the wiki and publishes them as a small second update that changes only the wiki.
- **Every finished task offers to close.** In a Paseo workspace, the last question after a publish, a research answer, an errand, or a declined publish offers *Close this workspace*, which runs `/close`. A plan waiting for review or a build in progress gets no close offer.
- **Instructions got shorter to make room.** A few skill pages say the same rules in fewer words, so the new skill adds no reading to each session.

**Updating.** Nothing to do by hand. After this update, pick *Close this workspace* or type `/close` when a chat is done; it now also updates the wiki, which publishing no longer does.

## 26.27.0 — Plans ask until they're clear, and publish in one pick

- **Follow-up questions before a plan.** When your answers open a new choice, the assistant asks another short set of multiple-choice questions instead of guessing. It still asks only what would make the plan wrong, never asks the same thing twice, and stops once nothing is open. [The exit round](.agents/skills/explore/SKILL.md#the-exit-round) owns the rule.
- **Build and publish in one pick.** The question under a finished plan adds *Build and publish*, second after *Build it now*. It builds, checks, and makes the change live with no stop at the preview.
- **Updates go straight to a plan.** An update from WongStack goes directly into planning, with no *Plan it?* stop first, even when an older install's own update steps say to think it through first.
- **The upkeep check asks follow-ups too.** `/improve` may ask another set of questions before it picks a fix, when your answers leave a real choice open.

**Updating.** Nothing to do by hand.

## 26.26.0 — Review notes can be questions

- **Copied notes just say they are notes.** On a plan's review page, Copy notes now starts *Notes on the plan \<name\> from the review page. Don't build yet.*, not *Update the plan … with these notes*. Each note says for itself whether it asks or changes something. The bullets are unchanged.
- **A question gets an answer, not an edit.** The assistant answers a question note in chat and leaves the plan, its decision log, and its page alone. It changes the plan only for a note that asks for a change. When an answer shows the plan should change, it offers that edit in its closing question.
- **The page stops assuming a change.** The note box says *A question or a change*. After a copy, the page says *Paste them into chat.*

**Updating.** Nothing to do by hand. Review pages built before this release still copy *Update the plan …*, and the assistant handles those notes the same way. Each page picks up the new words the next time its plan changes.

## 26.25.0 — Type into the agent's browser during a hand-over

- **You can type from your phone.** A hand-over link now opens a page of our own: the live page, and a *Type here* box under it. Tap a field on the page, then tap the box, and your phone's keyboard types into that field. ⌫, Tab, and Enter sit under the box. On a laptop you can also click and type on the page itself. [Hand the browser over](wiki/development/home.md#hand-the-browser-over) owns the how.
- **Clicks land where you tap.** The picture was drawn at one size while clicks were worked out at another, so every click landed about a quarter lower and missed the box. The agent now sets the page's size before it sends the link, and the page works out each click from the picture itself.
- **The link opens on the right page.** The agent closes blank tabs and brings the task's page to the front first, so the link never opens on an empty page.
- **The link shows only the task.** agent-browser's control panel, which also showed the agent's other browser sessions and a chat box, is gone from the hand-over. The link is as safe as before: a new random address and secret key each time, closed when you're past the step, when you say *done*, or after 10 minutes.

**Updating.** Nothing to do by hand.

## 26.24.0 — Better drawings in plans and explore

- **Plans draw more than a column of steps.** A short [drawing guide](.agents/skills/plan/references/drawings.md) gives five patterns to copy: a titled frame, a branch that splits and joins, options side by side with labels under, a comparison table, and a screen before and after.
- **Wider when a drawing needs it.** Drawings still aim for 40 columns, the width of a phone, and may reach 56 for options side by side, a table, or a before-and-after. The plan's page still warns past 60.
- **Crooked boxes get caught.** When a box's right edge doesn't line up with its top corner, building the plan's page names the drawing and line. It still builds the page.
- **Screen sketches show the change.** A plan that changes a screen draws it before and after; one that adds a screen draws each state its steps name, such as empty or error.
- **Explore draws while you think.** `/explore` draws in the chat by the same guide when a picture makes the flow, the options, or their costs clearer. It still writes no files.

**Updating.** Nothing to do by hand.

## 26.23.0 — Setup installs the agent's browser and tunnel tool up front

- **Setup asks once for everything.** Its one install question now also covers the agent's browser and Cloudflare's free tunnel tool, `cloudflared`, which sends you a private link to that browser. Say yes, and nothing stops later to ask. [Get the computer ready](.agents/skills/wong-setup/references/tools.md#the-helpers-the-browser-and-the-link-tool) owns the how.
- **A failed browser or tunnel install doesn't stop setup.** Setup names the one that didn't install and carries on; the agent offers it again the first time it needs it.
- **A new agent server has both ready.** [`server/setup.sh`](server/README.md) now installs `cloudflared` from Cloudflare's package repository, with no question, and its final check lists it. It runs only while a link is open, never as a service. wongstack-cloud builds each new server from this script, so it needs no change.
- **The server check and its promise can't drift apart.** A test fails when the script's final check and *The end state* in `server/README.md` name different tools.

**Updating.** Nothing to do by hand. An existing computer or server asks once, the first time it needs the browser or the tunnel tool.

## 26.22.0 — Watch the agent browse, in the chat

- **You see pictures as it goes.** While the agent browses for you, it drops a picture of the page into the chat at each key moment: a new page, right before it sends, books, pays for, or deletes something, and the result. One plain line above each says what it shows, so you can catch a wrong page or field before it's done. [Show what the browser is doing](wiki/development/home.md#show-what-the-browser-is-doing) owns the how.
- **The chat doesn't flood.** No picture after every click or keystroke, and none when the page hasn't changed: the agent takes each one with `agent-browser screenshot --if-changed`.
- **App checks show theirs too.** When `/verify` checks your app before it goes live, it shows each step's picture in the chat as it grades that check, not only on GitHub afterwards. What it posts to GitHub doesn't change.
- **Nothing while you have the browser.** During a hand-over, for a login or a captcha, the agent takes no pictures until you hand it back.
- **Pictures stay out of your project.** They sit in agent-browser's temp folder, never in a repo file. The rule *Browse as the person* now names showing key moments.
- **Closing a hand-over right after opening it no longer reports an error.** `hand-over.mjs close` could stop the background watcher before it was ready, so the link closed but the result read `error`. It now records `closed`.

**Updating.** Nothing to do by hand. Pictures show in the chat in [Paseo](https://paseo.sh); a plain terminal shows a placeholder instead.

## 26.21.0 — Take over the agent's browser from your phone

- **You get a private link and take over from anywhere.** When the agent's browser needs you, for a login, a captcha, a code, or a choice it shouldn't make, the agent sends you a link. It opens the agent's browser on your phone or laptop, and you do the step there. A password goes only into the real site, never through the chat. [Hand the browser over](wiki/development/home.md#hand-the-browser-over) owns the how.
- **Ask for it any time.** Say *let me take over*, and the agent stops using the browser and sends the link. Say *done* when you're finished.
- **The agent knows when you're done.** It names the page you reach once past the step, such as your inbox, or the captcha box gone, and carries on when that happens. A second code page doesn't count.
- **The link dies fast.** Each link has a new random address and a secret key. It closes once you're past the step, when you say *done*, or after 10 minutes, even if the chat stops, and never works again. While it's open, the agent reads only the page's address or whether the box is still there.
- **At the computer, nothing leaves it.** Say you're at the computer the agent runs on, and you get a local link with no tunnel.
- **New script:** [`hand-over.mjs`](.agents/skills/verify/scripts/hand-over.mjs) in `/verify`'s scripts folder opens the link, watches for the finish, and closes everything. It uses only Node's built-in modules. The rule *Browse as the person* now names the hand-over.

**Updating.** Nothing to do by hand. The first time you take over from another device, the agent asks to install Cloudflare's free tunnel tool, `cloudflared`, which carries the private link. It adds nothing to your project.

## 26.20.0 — Pushes skip mutation testing

- **A push gets checked in a minute or two again.** `npm test` no longer ends in `stryker run`, so the Test check stops running mutation testing. In a busy repo it made each push wait 7 to 25 minutes.
- **One pull request can't turn others red.** Stryker reused saved results its own diff could not see were stale, so a weak test passed on its branch, turned the main branch red after merging, then failed pull requests that never touched that code. With no saved results, that can't happen.
- **No more nightly full run.** The Test workflow loses its daily `schedule` run, its 60-minute limit (every run gets 30), and the steps that saved and restored Stryker's results. `/ship` no longer mentions a red nightly run; it still stops on any red check on the main branch.
- **Every other check stays.** Lint, 100% test coverage, dead-code and copied-code checks, and the check that a loosened test needs a written reason all still run on every push. The loosened-checks script still knows Stryker's skip comments and config, so a repo that adds it back is still checked.
- **The scaffold drops Stryker.** `app/stryker.conf.json`, both `@stryker-mutator` packages, the `.stryker-tmp` ignore line, and the two `// Stryker disable` comments in `app/worker/access.ts` are gone.
- **Vitest 5 is no longer held back by Stryker.** The next dependency update can take it.

**Updating.** Nothing to do by hand. `/wong-sync` removes the config, the packages, and the workflow steps; Stryker's saved results in GitHub expire on their own after 7 unused days. The sync changes check files, so its plan needs a `Check:` bullet for each one CI names: `.github/workflows/test.yml`, `app/package.json`, and `app/stryker.conf.json`. Any `// Stryker disable` comments of your own now do nothing; delete them when you next touch the file.

## 26.19.0 — Saving a note copies all your notes

- **Save copies every saved note, ready to paste.** On a plan's review page, each time you save a note, the page puts all your saved notes on the clipboard, in the same message Copy notes makes. It then says *Saved and copied 3 notes. Paste them into chat to update the plan.* Drafts still stay out.
- **The page says so before you save.** The hint at the top and a line under the Save button both read *Saving a note copies all your notes.* Copy notes stays, for copying again after you delete a note.
- **A failed copy keeps the note.** The page says *Saved. Tap Copy notes to copy them.*

**Updating.** Nothing to do by hand. A plan's review page picks this up the next time it's rebuilt.

## 26.18.1 — The browser tool reads its own current guide

- **The agent loads the browser tool's guide before it drives the browser.** Before `/verify` writes a preview check's browser steps, and before a task uses your saved logins, the agent runs `agent-browser skills get core`. That guide comes with the installed tool, so it always matches its version and the steps never go stale. [The walkthrough](.agents/skills/verify/references/walkthrough.md) and [Saved browser logins](wiki/development/home.md#saved-browser-logins) each say so once.
- **The browser skill file matches agent-browser 0.38.1.** It gains the one line the latest release added, a guide for Vercel's protected previews. It stays hidden, so it never shows in your menu.

**Updating.** Nothing to do by hand.

## 26.18.0 — Installing WongStack is easy

- **The Cloudflare key is one link.** [The credentials page](wiki/stack/cloudflare-credentials.md#create-the-token) now leads with a link that opens Cloudflare's token form already filled in: the two permissions, all accounts, and the name `WongStack`. You check the two rows, press Create, and copy the key. The four-menu route stays below it, in case the link ever fails. Setup asks for the key with the link first.
- **Paseo is where you chat.** The README's first step gets you Claude Code or Codex and the free [Paseo](https://paseo.sh) app, and no longer points to the Claude desktop app. Setup checks for Paseo: when it's missing, setup says what it's for and where to get it, then carries on. It never installs it. When Paseo is there, setup's closing report says how to connect your phone: *Settings → your host → Pair Device*.
- **One short line to paste.** The README's prompt is now `Install WongStack in this folder from github.com/matthewwong525/WongStack`. A line under it gives the agent the setup steps' address.
- **The steps live in one place.** The README keeps the three steps. [Getting started](wiki/stack/getting-started.md) stops repeating them and keeps what they don't cover: what it costs, what you do by hand, what to do when something goes wrong, and how to remove it all. Its *Teardown* heading is unchanged, so links to it keep working.
- **Source repo only: a test holds the link to the table.** `scripts/tests/provision.test.mjs` decodes the link on the credentials page and fails unless it asks for exactly the two keys in [the permission table](.agents/skills/wong-setup/references/permission-groups.md#what-the-user-grants), which gains a *Key* column.

**Updating.** Nothing to do by hand. `/wong-sync` brings the new wiki pages and setup text.

## 26.17.0 — Planning checks for other work first

- **Planning looks around first.** When `/explore` or `/plan` starts on work that changes the repo, it lists this repo's other work: the other workspaces on this computer, the plans in them (saved or not), and open pull requests, which show teammates' work too. The new [`other-work.mjs`](.agents/skills/explore/scripts/other-work.mjs) gathers the list; the agent judges what overlaps. [Check for other work](.agents/skills/explore/SKILL.md#check-for-other-work) owns the step.
- **You hear about an overlap only when there is one.** It names the other work and why it overlaps, then asks: keep going here, work there instead, or narrow this one. When nothing overlaps, it says nothing.
- **It stays in its lane.** It reads only this repo, never your other projects. It skips pull requests from bots, such as dependency updates, and workspaces with nothing left to publish. Without GitHub, it checks this computer and says so in one line; without Paseo, it works from git alone. It runs once per piece of work, so a plan right after an exploration doesn't repeat it.

**Updating.** Nothing to do by hand.

## 26.16.1 — The cloud can run WongStack's server installer

- **A new token gets a minute to start working.** Right after the installer widens a Cloudflare token, Cloudflare can refuse it for a few seconds with `401` as well as `403`. [The provisioning script](.agents/skills/wong-setup/scripts/provision.mjs) now waits out either answer, so `/wong-setup` and `server/install-wongstack.mjs` both stop failing on a token that was about to work.
- **A failed install names the Cloudflare step.** When Cloudflare refuses a call, the installer prints that call, its status, and Cloudflare's error codes on the line before the reason word, such as `Cloudflare PUT /user/tokens/abc: HTTP 403 9109`. It never holds a token or a query.
- **A host can drop its own copy of the installer.** The installer exports `CLOUDFLARE_CALL`, the pattern that line matches, beside `run`, `jobFolder`, and `repoFolder`. [`server/README.md`](server/README.md#what-a-host-may-import) lists the names a host may import.

**Updating.** Nothing reaches an installed repo: `server/` and `/wong-setup` stay in the source. A host that runs its own copy of the installer can switch: pin the WongStack commit that ships this, and import from `server/install-wongstack.mjs` in that clone instead.

## 26.16.0 — Updates catch up old, heavily edited installs

- **Old installs update in place.** A repo from before 19.0.0 no longer needs a fresh setup. Its update plan also makes the moves it missed: the shared agent folder, the rules file both agents read, wiki pages kept in another folder, leftover OpenSpec skills, and the CI deploy token. Every local edit stays. [Catching up an older install](.agents/skills/wong-sync/references/catch-up.md) owns the steps; the preflight's new `catchUp` field lists which apply, from the repo's layout and install record alone.
- **The oldest installs can be checked.** A repo from before WongStack kept a file list got an error. It now compares against an empty list: every WongStack file it has counts as possibly edited, so nothing is overwritten.
- **Hand steps from every skipped release reach the plan.** The preflight's new `updating` field carries each newer release's by-hand note, such as running the memory upgrade after publishing, and the plan turns each one that applies into a task.
- **A merge never drops new text silently.** The new `wong-sync/scripts/merge-check.mjs` runs after the plan merges new WongStack text into files you edited. It lists any upstream section missing from the result, and the plan takes it or says why not before the install record advances.
- **Update plans read plainly.** A sync plan's summary says what you get, what changes in how you work, what of yours stays, what is left out and why, and what you do yourself. The review page builder warns when a plan's Why and What Changes name more than 12 files or commands.

**Updating.** Nothing to do by hand. `/wong-sync` always runs the source's preflight, so the next sync of any install already uses the new fields and the catch-up page.

## 26.15.0 — Paseo starts with your settings

- **Every install's new workspaces open ready to work.** `paseo.json` joins the payload. Its worktree setup copies your secrets files into each new Paseo workspace, as only this repo did before. A repo with its own `paseo.json` gets WongStack's entries merged in, keeping its own steps; [the payload manifest](.agents/skills/wong-sync/references/payload-manifest.md#the-paseo-project-file) owns the rule.
- **Paseo names things the way WongStack does.** `paseo.json` tells Paseo's generator how to write workspace titles (a few plain words), branch names (short topic names), commit messages, and pull requests (the form `/save` and `/ship` use, with no version and with the Claude sign-off).
- **Setup adds your agent presets to Paseo.** The new [`presets.mjs`](.agents/skills/routine/scripts/presets.mjs) `add` gives this computer's Paseo four presets from `paseo-presets.json`: *Explore / Plan* and *Apply / Ship*, for Claude and for Codex. It adds only the missing ones, by id or name, never changes one you have, skips an agent that is not installed, and reloads Paseo. With no Paseo or no Paseo config, it changes nothing and says so. `/wong-setup` runs it after the payload lands, and so does `server/install-wongstack.mjs`, where a failure never changes the last line.
- **The wiki says what WongStack sets in Paseo and what it leaves alone.** [Required tools](wiki/development/required-tools.md) now covers the project file, the presets, and the settings that stay yours: the starting branch, the new-worktree choice, closing after a merge, and the agent browser.

**Updating.** `/wong-sync` brings `paseo.json` and the preset script. Then run `node .claude/skills/routine/scripts/presets.mjs add` once on each computer that uses Paseo.

## 26.14.0 — Shorter instructions, the same rules

- **Every chat starts lighter.** What an agent reads before your first message — the `WONG-STACK` block and the rest of `AGENTS.md`, [the wiki style](wiki/wiki-style.md) and [voice](wiki/voice.md) pages, and every skill description — drops from 3,601 to 2,199 words (−39%). The style and voice pages still load in every chat. Rules every reply needs stay in the `WONG-STACK` block, which Codex reads too, and the voice page no longer repeats them.
- **Each step reads less.** [The change loop](wiki/development/the-change-loop.md) drops from 3,447 to 2,537 words (−26%); its step list now says what each stage is for and links the skill that owns the procedure. Every skill's `SKILL.md` and `references/*.md` together drop from 27,385 to 24,844 words (−9%). Repeats are merged into the page that owns them, and the rest links there.
- **No rule is dropped.** Only wording changes. Every command, flag, path, code block, and linked heading stays, so links from your own pages keep working. `stack-pack-fragments.md` lists six `wrangler.jsonc` rules, not seven: two overlapping staging rules became one.
- **Source repo only: the saving is measured, and it stays.** `scripts/measure-context.mjs --write-baseline` records a change's own starting point, and `--check` now fails when the start-up load passes `startupCeiling` (2,200 words) in `scripts/fixtures/context-baseline.json`. The count covers every WongStack-authored skill, not just seven.
- **Source repo only: the link check reads heading anchors in shipped pages.** `scripts/check-payload-links.mjs` fails when a shipped page links a `#anchor` its target page has no heading for, so a renamed heading fails here, not in your install.

**Updating.** `/wong-sync` brings every skill file, `AGENTS.md`'s block, and the three wiki pages. A file you adapted locally shows as a conflict; keep your adaptation and take the new wording around it.

## 26.13.0 — The starter app is built to grow

- **Pages go through a router.** The starter app uses [React Router](https://reactrouter.com/) with one route list, `app/src/router.tsx`. The home page is its only page, and `Layout.tsx` is the frame around every page. A new page is a folder in `app/src/pages/` and one line in the list.
- **An unknown address says so.** Any address the list does not name shows *Page not found* with a *Go home* link, not the home page.
- **Each page keeps its parts beside it.** `app/src/pages/home/` holds `Home.tsx`, the tutorial, and the app list, each with its CSS and tests. `apps.ts` moves to `app/src/lib/`. `App.tsx`, `App.css`, and `index.css` are gone.
- **One shared look, in one file.** `app/public/style.css`, served at `/style.css`, holds the device's font, light or dark to match the device, and a narrow column. The home page and every mini app link it. It is the only file that styles whole elements; a part's own styles use class names named for it, so one page's styles never land on another. The look is unchanged.
- **The API goes through a route list too.** `app/worker/api/router.ts` holds the routes, one handler file each, starting with `GET /api/health`, which answers `{ "ok": true }`. An unknown API route answers 404. The Vite template's `{ "name": "Cloudflare" }` placeholder is gone.
- **The example mini app grows the same way.** `hello/api.mjs` dispatches through a route list, its page script moves to `app.js`, and its page links `/style.css`. A new test checks both.
- **The code rule says where things go.** `.agents/rules/code.md` gains *Where things go* and now loads for `mini-apps/` too. [Mini apps](wiki/stack/mini-apps.md) and [UX principles](wiki/ux-principles.md) link it.

**Updating.** `/wong-sync` plans the move. A repo whose starter app is still the one WongStack gave it takes the whole move together: the new files, `react-router` in `app/package.json`, the deleted flat files, and the removed API placeholder. A repo that rebuilt its app keeps its own layout; the plan offers only the code rule and the shared stylesheet. Existing mini apps keep working unchanged, and can adopt `/style.css` and an `app.js` page script when next touched.

## 26.12.1 — The README leads with how Matt uses AI

- **The README opens with whose way this is.** Its first screen says WongStack is Matt's opinionated way of using AI, for Matt's business, Claymoo, and for everything else. The example asks come mostly from that business: timing packed orders, profit by sales channel, a brief page for designers, a 9am list of unshipped orders, and a fact the whole team remembers, plus one for planning the week. "What you get" now speaks of tools that fit your business and one memory for the whole team. The setup steps and "For developers" are unchanged.
- **A company name can appear in public files.** The private-name check in `scripts/tests/private-names.test.mjs` now blocks `ClaymooApp`, `WongOS`, and `wongstack-cloud`, not the bare word "Claymoo", so the README can name the company while private repositories stay out.
- **Source repo only.** `AGENTS.md`'s "What this is" line now describes an assistant a business owner and their team run their business on. The `WONG-STACK` block is unchanged.

**Updating.** Nothing changes in installed repos.

## 26.12.0 — The plan's link says what to do next

- **A waiting plan tells you how to build it.** When a plan stops for your review, the line right under its link says *When you're ready, type `/apply` to build it.* It shows after a plan made on its own, a bare `/wong-sync`, notes pasted from the plan's page, and the reply to *Review the plan*.
- **It stays out when the build goes on.** When `/apply`, `/continue`, or `/ship` builds the plan in the same run, or the plan has shipped, the link shows alone.
- **One wording everywhere.** `build-review.mjs` prints the line third, after the link line, from its exported `NEXT_STEP`; [print the plan's link](.agents/skills/explore/references/asking-the-user.md#print-the-plans-link) says when to copy it, and the `WONG-STACK` block states it.

## 26.11.0 — Memory keys come only through GitHub

- **Notes show who wrote them in full.** Each fact in the start-up digest, `search`, `show`, and `live` names its writer's whole email, so `ana@example.com` and `ana@example.org` never look like one person.
- **Admin is a GitHub account, not an email.** The store links the admin's GitHub account, and a join gives an admin key only to that account. Another account with the admin's verified email joins as a member. Joining now asks GitHub three things: the repository, the verified emails, and the account's id.
- **No key is made by hand, and every key ends.** `member add` is gone; it answers that teammates join through GitHub. The admin's own key comes from `member admin`, which links the GitHub account `gh` is signed in as and writes a 30-day key to `.env` that renews itself, never printed. Setup runs it. `member remove` also unlinks the admin, and `member list` shows each key's GitHub account and the linked admin.
- **At most 10 keys per person.** A join from an 11th machine works at once, and the key of the machine that joined longest ago stops; that machine rejoins on its own at its next start.
- **Saved chats cap at 50 MB.** A bigger session's facts are still captured, but its full transcript is not kept, and `source` says why. The memory route refuses a bigger upload from any key.

**Updating.** After the update merges and production deploys, run `node .claude/skills/memory/scripts/memory.mjs migrate` once, with `gh` signed in: it links your GitHub account as admin and stops every key that had no end date. Without `gh`, it says to run `member admin`. Every machine rejoins through GitHub at its next session start, so fresh memory skips one session while the cached digest still shows. A teammate who got a key by hand needs access to the repo on GitHub, then joins on their own.

## 26.10.1 — Memory reports what it really saved

- **The background memory report counts what was stored.** While a background run works, the memory script tallies what each `put-facts` and `strip` stored, in `run-tally.json` in the clone's memory state folder. `finish-run` records that tally, not the model's own `--counts`. When the model's counts differ, the run's record says `model reported other counts: <keys>`, and the next digest adds *(the run's own report differed)*. A hand-run `finish-run`, or a run an older `run.mjs` started, records `--counts` as before.
- **Publishing finds a chat's notes after a branch rename.** `memory.mjs search` takes `--change <slug>`: facts from every session that wrote a fact on that change. With `--branch` too, it returns facts from either set. `/ship`'s distill step runs `search --branch "$BRANCH" --change "$CHANGE_NAME"` on a feature branch and `search --change "$CHANGE_NAME"` on `main`, so a chat whose branch was renamed loses none.
- **Source repo only: the link check covers source-only skills.** `scripts/check-payload-links.mjs` resolves every link in a skill no manifest category lists (today `wong-setup` and `update-dependencies`) against this repo, and checks a `#anchor` against the target page's headings as GitHub slugs them. A missing path or renamed heading fails with `file:line -> target`.
- **Source repo only: the add-a-skill guide covers WongStack-only skills.** Such a skill does step 1 only: no manifest entry, no setup surface, and no changelog entry of its own.

**Updating.** Nothing to do by hand. `/wong-sync` brings the memory scripts and the `memory` and `ship` skills.

## 26.10.0 — Codex reads the WongStack rules in every install

- **One rules file serves both agents.** Codex reads only `AGENTS.md`, and chat setup wrote the rules to `CLAUDE.md`, so Codex in those repos never saw them. `/wong-setup` now writes the rules to a real `AGENTS.md` and makes `CLAUDE.md` a link to it (`ln -s AGENTS.md CLAUDE.md`, with `MSYS=winsymlinks:nativestrict` on Windows). One copy, so the two can not drift. It is the layout this repo and server installs already use.
- **Updates read the rules through the link.** The update check still finds changes to the `WONG-STACK` block and still leaves your own text alone when `CLAUDE.md` is a link.
- **Shipped pages link `AGENTS.md`.** The link check no longer lets a shipped page link `CLAUDE.md`; GitHub's web view can not follow the link.

**Updating.** The next `/wong-sync` plans the move: a repo with only a real `CLAUDE.md` renames it to `AGENTS.md` and links `CLAUDE.md` to it, with every line kept. A repo that already has its own `AGENTS.md` gets a reviewed task that merges both into `AGENTS.md`, then links. A repo whose `CLAUDE.md` already links to `AGENTS.md` needs nothing. [The agent folder](.agents/skills/wong-sync/references/payload-manifest.md#the-agent-folder) owns the steps.

## 26.9.0 — Pushes stay fast when mutation testing would start over

- **Updates keep earlier mutation results.** The Test workflow's saved Stryker file no longer has a key that hashes `package-lock.json` and the Stryker and Vitest configs. The key is now `stryker-<os>-` plus the run, so a dependency update, a WongStack update, or a test-settings change reuses what mutation testing already knows. A push re-tests only what it changed, in minutes, not 15 to 20. Old saved files match the new key, so the first push after the update starts warm.
- **A full check runs every night, and nobody waits on it.** `test.yml` gains a `schedule` trigger (`17 6 * * *`) on the default branch. That run skips the restore, so Stryker tests every mutant from scratch, then saves the fresh file for later pushes. Running daily also keeps GitHub from evicting the cache after 7 quiet days.
- **A red nightly check stops publishing.** When the nightly run finds a weak test, its check on the main branch turns red, and `/ship` stops and says so in plain words until a test is fixed. The next push that reuses its file fails the same way.
- **Every mutant is tested again.** `app/stryker.conf.json` drops `ignoreStatic`. It saved no time in one repo's full runs and left those mutants untested. The first push after the update tests only the formerly skipped mutants.
- **A push that starts cold finishes.** The Test job's limit rises from 15 to 30 minutes on a push, so a new repo's first run, or one after a lost cache, is not cut off. The nightly run gets 60.

**Updating.** `/wong-sync` brings `.github/workflows/test.yml` and `app/stryker.conf.json`; each needs a `Check:` bullet in the sync plan's Decision log. A repo that raised its own `timeout-minutes` takes the new expression. To skip the nightly run, for example to save Actions minutes in a private repo (about 20 a day), remove the `schedule` lines from `test.yml`; pushes still work, only the daily full check stops. GitHub pauses a schedule after 60 days without activity in a public repo; turn the workflow back on from the Actions tab.

## 26.8.0 — Server installs come from WongStack

- **The server installer lives here now.** `server/install-wongstack.mjs` sits beside `server/setup.sh`. A host clones WongStack, or your fork, at a pinned commit into `~/.cache/wong-stack/WongStack`, then runs the installer from there as the workspace user, with `{token, accountId, repo}` on stdin. It installs that clone's payload, `VERSION`, and commit into the person's empty repo, commits on `main`, and pushes. Fork WongStack, and your servers install your fork.
- **A server install gets today's memory.** The app's production Worker serves the memory store, the admin memory key for the person's git email goes to `.env`, and a bucket keeps full transcripts when R2 is on. No memory Cloudflare token is minted. The repo's `.env.example` is the source's own, and `app/wrangler.jsonc` comes from the stack pack's fragment.
- **Setup and servers share one provisioning script.** `.agents/skills/wong-setup/scripts/provision.mjs` runs `widen`, `accounts`, `names`, and `provision`; each prints one JSON report and never a token. `/wong-setup`'s runbook calls it in Steps 2–4 and still asks which account, asks once before anything billable, and offers a suffix for a taken name. The installer takes the first free suffix itself. The widen now always grants `Workers R2 Storage Write`, and a rerun that finds R2 on adds the bucket, its binding, and the deploy token's R2 row.
- **[`server/README.md`](server/README.md) holds the installer's host contract:** how to run it, the job, what it needs, the one-word last line (`done`, `token`, `repo`, `cloudflare`, or `push`), and what it never does.
- **Source repo only.** New tests install this checkout into a practice repo against a pretend Cloudflare, so a payload file the installer misses fails before release. Another holds the script's permission groups to `permission-groups.md`. Lint and coverage now reach `server/`.

**Updating.** Installed repos get nothing new: `server/` and `wong-setup` never reach them. A host with its own installer moves to `server/install-wongstack.mjs`, run from its pinned WongStack commit.

## 26.7.0 — WongStack cleans up after itself

- **After you publish, you can close the workspace.** The closing question after a publish from a Paseo workspace offers *Close this workspace*, recommended when no more work is waiting. The chat finishes its reply, then the chat and workspace close, anything left running from them stops, and a branch that merged is deleted. The chat stays readable in Paseo's archived list. Unsaved work blocks the close, and the agent names the files.
- **Each session tidies up in the background.** Session start never waits for it, and it runs at most every 6 hours. It closes this repo's workspaces idle 3+ days whose work is all saved, stops servers whose workspace is gone, and deletes WongStack's own temp folders (named `wong-…`) and main-checkout scratch files older than a day. It never touches another project's files, and never closes a chat with unsaved work.
- **You hear what it did, once.** The next session opens with one line, such as *closed 2 workspaces; left "Weekly plan" open: it has unsaved work.* Nothing is said when nothing happened.
- **Scratch files live in the workspace.** Agents put throwaway files in a git-ignored `.scratch/` folder at the checkout root, not the temp folder, which on some machines is memory. `node .claude/skills/routine/scripts/tidy.mjs scratch` makes it; the brief for a new workspace goes there.
- **Source repo only.** Test temp folders now start with `wong-test-`, so the tidy-up can claim what a crashed run leaves behind.

**Updating.** `/wong-sync` brings `tidy.mjs`, the session-start hook, and the skill and wiki edits, and re-offers the `.gitignore` fragment, now with `.scratch/`. The first session after the update tidies up once, so a machine full of old chats may see several closed at once. Set `WONG_TIDY=0` in the environment to turn the background tidy-up off.

## 26.6.0 — Memory keys stay home, and read-only teammates keep their notes to themselves

- **Your memory key goes only to the address on your main checkout.** Memory read the memory Worker's address from the branch you had open, so a branch that changed one line got your key, or your GitHub token on a first join, at session start. Now the address comes from the main checkout, the one that holds `.env`. A branch that names another address is ignored, and the session start says so.
- **Mini apps lose the side door to memory.** A handler got only `DB`, but it could still `import { env } from "cloudflare:workers"` and reach `MEMORY_DB`. The app's `wrangler.jsonc` and the stack-pack fragment now set `disallow_importable_env`, and `app/worker-configuration.d.ts` is regenerated. The wiki no longer promises a wall the runtime can not keep: a handler shares the Worker with memory, so review its code before it publishes.
- **Transcripts lose token-shaped text before upload.** Besides `.env` values, anything shaped like a GitHub, `sk-`, AWS, JWT, Bearer, or memory key is replaced with `[redacted:token]`, in the stored transcript and in what capture reads. A fact holding a memory key is rejected too.
- **Only you, or the admin, replace your notes.** A teammate's supersede now marks only facts under their own email. One aimed at someone else's fact leaves it live, and `put-facts` names who wrote it. A teammate's tidy merges only their own facts.
- **Read-only collaborators join as readers.** On a private repo, someone with read access but not push gets a reader key. The route stores every fact a reader writes as unshared, and teammates' digests, searches, and write gates skip it; `search --everyone` still shows it. A public repo still needs push access. `member list` and `join` show `reader`. New migration `0004_readers.sql` adds `memory_keys.reader` and `facts.shared`.

**Updating.** Add `"disallow_importable_env"` to `compatibility_flags` in your own `app/wrangler.jsonc`, which is never synced; `/wong-sync` plans it. After the update, the admin runs `node .claude/skills/memory/scripts/memory.mjs migrate` once; until then, read-only people can not join, and nothing else changes. A read-only teammate's current key keeps sharing until its next renewal makes it a reader key.

## 26.5.0 — Clean up what recent releases left stale

- **Pages tell the truth again.** The stack pages drop Tailwind, which left in v18, and say the agent hands you a preview link as soon as a build finishes. *Getting started* says setup needs an empty folder, and describes the starter page as it is: your apps under a *Learn the development loop* box. The contributing page stops saying an update wipes the cached copy; it never does.
- **Links that pointed at nothing now point somewhere.** The pipeline page lists `scripts/cf-preview.sh` and `scripts/mini-dashboard.mjs`. The `/verify` walkthrough uses a real `wrangler d1 execute` command, not a made-up one. The secrets rule links `/save`'s named secrets. The tools page stops citing a "Step 0", and the UX page drops its "Part 1 —" headings.
- **Agents write to the wiki when they learn something.** The OpenSpec rule now follows the wiki's own repeatable-knowledge rule, not only "when wiki work is in scope".
- **"Review page" means one thing: the plan's page.** In chat, the pull request is now *the change on GitHub*.
- **The wiki-folder setting is gone.** `/wong-sync` no longer reads `components.docsPath` from `.claude/.wong-stack.json`; WongStack's pages always sync to `wiki/`. Two skills renamed to one local name still fail with `path-collision`.
- **The switched-off-check guard watches every workflow file,** not only `test.yml`. Editing `deploy.yml` or any other workflow now needs a `Check:` line in the change's Decision log.
- **Source repo only.** Lint and coverage now include the memory service, the check scripts, and the mini-app router. A memory test that failed at random now waits properly. `/update-dependencies` covers the test tools, and a test fails when the four places that name the OpenSpec version disagree.

**Updating.** `/wong-sync` brings the page, skill, and guard edits. From now on, a branch that changes any workflow file, `deploy.yml` included, needs a `Check:` bullet naming it. A record's `components.docsPath` is ignored: move any relocated pages back under `wiki/` before you sync.

## 26.4.0 — Smoother publishing, with no dead ends

- **Publishing from `main` saves once.** `/ship` on a default branch with uncommitted work goes straight to the archive; Step 3's one save cuts the branch. Before, it saved and ran CI, then did both again.
- **`/ship` writes a missing plan for code.** Where no change selects and the work is code, it authors one by `/save`'s new-plan fallback and carries on, instead of stopping.
- **Every edit asks *publish it?*.** A plain request that edited a repo file, such as a wiki note, and a change that leaves the app untouched both end with that question. The `WONG-STACK` block's plain-request rule says so.
- **A typed `/explore` ends with a question.** When the thinking is done, it asks *Plan it* (recommended), *Keep thinking*, or *Stop*. Bounded mode still returns to `/plan`. Notes pasted from a review page skip exploring.
- **`/continue` never builds on the wrong branch.** When it can't check out the change here, it recaps and asks what next, with nothing built.
- **One plan link, only when the plan changed.** `/save` prints it when it changed the plan's sections or `tasks.md`, not for Status, Branch, Open questions, or Decision-log lines. The plan's link no longer counts against a report's one link.
- **New work in a busy workspace gets its own choice:** open it in a new workspace (recommended), or publish the work here first.
- **Smaller fixes.** The build helper carries a `store <id>` line and passes `--store`. `/ship`'s distillation skips its branch search on `main`. `asking-the-user.md` allows the *Review the plan* reply with no question, and says `/apply` saves only for a task that needs the gate.

**Updating.** `/wong-sync` brings the skill, wiki, and `WONG-STACK` block edits. Nothing to do by hand.

## 26.3.0 — New workspaces are named after their part

- **A new workspace shows its part's name.** When a request splits into parts, each workspace the agent opens now takes the same short name its agent got, so Paseo's list reads *Release collisions*, not *nifty-leopard*. A workspace opened to pick up saved work takes the change's name. The folder and branch keep Paseo's names.
- **A refused name still opens the workspace.** If Paseo won't take the name, the workspace and its agent still run, and the agent tells you it kept Paseo's name.
- **`workspace.mjs` renames the workspace after `paseo run`,** with `paseo workspace rename`, because `paseo run --title` names only the agent. `workspaceName` now reports the new name. A failed rename adds a `warning` and still exits 0, and a fetch warning and a rename warning join into one. `--dry-run` also lists the rename command.

**Updating.** `/wong-sync` brings the script and the `new-workspace.md` edit. Workspaces you already opened keep their old names; rename one with `paseo workspace rename <workspace-id> <title>`.

## 26.2.0 — Releases are numbered when they publish

- **A change no longer picks its own version.** Write its notes under `## Next (patch|minor|major) — <Title>` at the top of `CHANGELOG.md`, and leave `VERSION` alone. `/ship` numbers it from `main`'s version right before it merges, so two changes in flight never take the same number.
- **`/ship` runs `number-release.mjs` before its checkpoint.** The new script in the `ship` skill writes `VERSION` and the `## X.Y.Z — <Title>` heading, keeps the entry on top, and restores one blank line before every heading. A repo with no `CHANGELOG.md` gets `release=none` and sees no change.
- **A stale number stops the merge.** When another release lands while yours waits on its checks, `merge.sh` prints `stale_version=<version>` and merges nothing; `/ship` numbers it again, saves, and merges.
- **The merge title names the version that shipped.** `merge.sh` passes `--subject` built from the pull request's title, ` (v<VERSION>)` for a release, and ` (#<number>)`.
- **Release labels no longer fail on a race.** `tag-releases.mjs` counts an HTTP 422 *already exists* as done, and fails when a `## Next` heading reaches `main` unnumbered.
- **The release steps live in one place.** The meta-only payload rule owns them, and now loads for every shipped path; a new test keeps its paths in step with `payload-files.json`. `wiki/contributing.md` drops the hand-tagging step.

**Updating.** `/wong-sync` brings the `ship` skill's new script and steps, and the `wiki/contributing.md` and `wiki/stack/cloudflare-credentials.md` edits. Nothing to do by hand: a repo with no `CHANGELOG.md` ships exactly as before.

## 26.1.0 — A "Review the plan" choice that prints the plan's link

- **The plan's closing question offers *Review the plan*.** After a plan, the choices are *Build it now* (recommended), *Review the plan*, and *Stop here*. To change the plan, you still type or paste notes.
- **Picking it prints the link and waits.** The next reply ends with *Click here to see the plan:* and the link, as plain text with no question after it. Nothing is built until you say so.
- **Every closing question after a plan change offers it,** such as after a save or a preview, as a fourth choice when needed. Only this choice may make a fourth.
- **No path inside the question.** 26.0.0 ended the question's text with the plan's path; it showed, but you could not tap it. The link line still goes above the question too.
- **The page builder prints the finished link line.** `build-review.mjs`'s second line is now `Click here to see the plan: [review.html](<path>)`, ready to copy, with the path wrapped in `<…>` when it holds a space or parenthesis.

**Updating.** `/wong-sync` brings the skill, script, and `WONG-STACK` block edits. Nothing to do by hand.

## 26.0.0 — Wiki saves go through review, like code

- **One way to save.** A save that changes only the wiki no longer goes straight to `main`. Every save that changes a file gets a branch and a pull request, then goes live when you run `/ship`. A plan (an OpenSpec change) is still needed for code only; any other edit gets a pull request whose body says what changed.
- **`/ship` publishes work that needed no plan.** When no change is selected, it applies `/save`'s test: code, or a plan for code, still stops; anything else skips the archive and merges on the gate.
- **Facts-only saves are unchanged.** They go to the memory store with no commit. `save/references/prose-save.md` is now `save/references/facts-save.md` and holds only that route.
- **The change loop loses *The prose allowlist*.** *The gate* now says every file edit takes it. The `WONG-STACK` block drops its prose line, and `wiki/README.md` and `wiki/wiki-style.md` follow.
- **`app-untouched.sh` prints a fifth line, `docs_only`,** true only when every changed path is under `wiki/` or `openspec/`. The source repo's Payload checks use it to skip lint, shell checks, and the script suite (the private-names test still runs).
- **The plan's link shows after a save and a publish.** `/save` prints it whenever the save changed a plan, apart from its one link, and `/ship` prints the archived plan's. The closing question's own text also ends with the plan's path, because some hosts hide chat text above a question card.

**Updating.** Major: installed repos lose the direct-to-`main` wiki route their agents used. `/wong-sync` removes the block's prose line and brings the skill, script, and page edits. If your default branch's ruleset lets the owner bypass it for wiki saves, you can drop that bypass.

## 25.17.0 — Shorter skill instructions

- **The same rules in fewer words.** Every skill's `SKILL.md` and `references/*.md` is rewritten in [our voice](wiki/voice.md): 13,476 → 10,202 words across the `SKILL.md` files (−24%) and 18,286 → 15,693 across references (−14%). A rule another page owns is now a link to it, reasons the wiki gives are cut, and one example stands where there were several. No rule, command, flag, path, heading, or code block changed. The vendored `agent-browser` skill is untouched.
- **`stack-pack-fragments.md` lists seven `wrangler.jsonc` rules, not eight.** The eighth repeated the first (`migrations_dir`); its one extra point now sits in the first.

**Updating.** `/wong-sync` brings every skill file. A skill you adapted locally shows as a conflict; keep your adaptation and take the new wording around it.

## 25.16.0 — Thinner specs: keep the promises, cut the how

- **A spec states a promise, not a procedure.** `.claude/rules/openspec.md` gains the spec bar. A requirement stays when a person or an installed repo relies on it: what they see or get, what must never happen, and what an update delivers or keeps. The steps, script and file names, and exact wording stay in the skill. Each requirement gets one or two scenarios. The rule loads whenever anyone edits `openspec/`, so new specs stay short in every installed repo.
- **WongStack's own specs follow it** (meta-only). `openspec/specs/` drops from 49 capabilities and about 84,000 words to 26 and about 26,500. Overlapping specs merge — the three about updates become `wong-sync`, the three about memory become `memory`, and so on. `/verify` walks fewer, sharper scenarios. The old wording stays in the archive.

**Updating.** `/wong-sync` brings the rule. Nothing to do by hand, and your own specs are not rewritten.

## 25.15.0 — Each part of a request gets its own workspace

- **Several parts, one question.** When a request holds parts that could each be published alone, the assistant lists them and asks once: do the first here and open a new [Paseo](https://paseo.sh) workspace for each other part *(Recommended)*, do them here one at a time, or keep one change. The question rides in `/explore`'s exit round. [Several parts, several workspaces](wiki/development/the-change-loop.md#several-parts-several-workspaces) owns the rule; `.agents/skills/plan/references/new-workspace.md` is the runbook.
- **Each new workspace plans its part and waits for you.** Its agent starts with `/plan` and a brief: the part in your words, the answers already settled, the other parts and where they are, and any part it builds on. A part that builds on another opens at once and is told the other part is being built or about to publish.
- **The next work is one choice away.** `/ship`'s closing question offers the next part you asked for in a new workspace. `/continue` offers a new workspace instead of switching branches when this one still holds unpublished work.
- **`workspace.mjs` opens the workspace.** The new script in `.agents/skills/routine/scripts/` fetches the default branch and starts the workspace from it. The new agent gets the calling chat's model, thinking, and permission mode, and no parent, so it lives on after the chat. It shares a new `lib/paseo.mjs` with `routine.mjs`, and uses the same exit codes.
- **Without Paseo, or with nobody to answer, nothing changes.** The parts are done one at a time, and an unattended run never opens a workspace.

**Updating.** `/wong-sync` brings the script, the runbook, and the skill and page edits. New workspaces need [Paseo](https://paseo.sh); without it, nothing else to do.

## 25.14.0 — Plain words for everyone

- **Plain words for everyone; details when asked.** Plans, questions, and reports no longer depend on a `**Technical level:**` line on the person's page. Everyone gets plain words — the outcome and one link in a report — and anyone can ask for more, for one reply or from now on, kept as a preference on their page. A verb running inside another still prints what its caller reads. *Write at the reader's level* in `explore/references/asking-the-user.md` is now [*Write in plain words*](.agents/skills/explore/references/asking-the-user.md#write-in-plain-words); `/plan`, `/apply`, `/save`, `/continue`, `/ship`, setup, and the People rules link it with no technical branch.

**Updating.** `/wong-sync` brings the skill and page edits. A `**Technical level:**` line on a person page is now ignored; delete it, or replace it with a stated preference such as *show me branch and commit details*.

## 25.13.0 — Plain reports, and continue drawn as the way back in

- **Reports give the outcome and one link.** For a non-technical reader who ran the verb, `/save`, `/continue`, and `/ship` leave out branch names, commit ids, the `SAVE_GATE_RESULT` line, `merge.sh`'s lines, and fact counts unless asked. A verb running inside another still prints what its caller reads. The rule lives in *Write at the reader's level* in `explore/references/asking-the-user.md`.
- **`/continue` recaps read as progress** — *3 of 9 steps left, 2 comments from reviewers* — for a non-technical reader.
- **The loop is `/explore → /plan → /apply → /save → /ship`,** with `/continue` as the way back in, in the `WONG-STACK` block, the README, and the change-loop page.
- **The source wiki's word list** gains review page, preview link, mini app, routine, save, and publish.

**Updating.** `/wong-sync` brings the block line and the skill and page edits. Nothing else to do.

## 25.12.0 — Builds run in a fresh helper

- **`/apply` builds in a fresh helper agent.** Once the plan is ready, `/apply` hands the change's name to a new helper that reads the plan files and works the tasks. The conversation gets back a short report instead of every file the build opened, so it does not grow through the build. The helper's brief is `.agents/skills/apply/references/build-helper.md`: what to read, when to stop, what it must never do, and the report's shape. [Build in a helper](.agents/skills/apply/SKILL.md#build-in-a-helper) owns the loop.
- **Questions and saves still come from your conversation.** A helper can't ask you anything. On an unclear task, a blocker, or a task that needs a save, it stops and hands back. The conversation asks, reports, or runs `/save`, then starts a new helper for the tasks left. The preview, the loosened-checks list, and *publish it?* stay in the conversation, and so do small tweaks after the preview.
- **No helper, no change.** An AI tool that can't start a helper agent, or an `/apply` already inside one, builds inline as before.
- **The usage report shows context by skill.** `scripts/measure-usage.mjs` (meta-only) now prints each skill's main-thread context at its first turn and at its peak. Before this release, `/apply` started at 119k tokens and peaked at 149k (median over 128 sessions).

**Updating.** `/wong-sync` brings the new `/apply` section, the helper's brief, and the change-loop line. Nothing else to do.

## 25.11.0 — Every plan prints its link, and "What next?" is tap-to-answer

- **Every plan prints its link.** Whenever a reply makes or changes a plan, it prints *Click here to see the plan:* and a link to the change's `review.html`, on its own line above the closing question. This holds whichever verb made the plan — `/plan`, `/apply` planning first, `/continue`, `/ship`, `/wong-sync`, or review notes — and even when the build goes on. A new [*Print the plan's link*](.agents/skills/explore/references/asking-the-user.md#print-the-plans-link) section owns the rule, the `WONG-STACK` block states it, and `/plan`'s *Finish* links it instead of keeping its own wording.
- **"What next?" uses the question tool.** [*End every reply with the next step*](.agents/skills/explore/references/asking-the-user.md#end-every-reply-with-the-next-step) now says the closing question goes through the same tool as every other ask (`AskUserQuestion`, `request_user_input`, or an equivalent), with the report and link written as chat text first. Before, agents asked clarification questions with the tool but typed the closing menu as a numbered list. Sessions with no question tool still get the numbered list.

**Updating.** `/wong-sync` brings the block line and the two skill edits. Nothing to migrate.

## 25.10.1 — Fixes from a repo check

- **Teammates can't change or hide each other's memory.** The memory route now refuses three writes it let through. A fact tag or supersede without the member's own new fact before it in the same batch is refused, so a replacement is always visible and credited. So is a session upsert onto a row another author holds, or one written before keys. The read check now looks at the whole SQL text, so a quoted name like `[']` can't hide a `DELETE`. A malformed `%` in an object path is a 400, not a crash. The statements are unchanged, so member checkouts need no update.
- **`.env` values are read correctly.** `parseEnv` drops the quotes from a quoted value followed by spaces or a `# comment`. Before, it kept them, so a memory key failed and the transcript redactor looked for the wrong text. `writeEnvKey` replaces every `CLOUDFLARE_MEMORY_TOKEN=` line, so a stale duplicate can't win.
- **The check wait needs a settled pass.** `wait-for-checks.sh` reports `SUCCESS` only when two polls agree. A list of only skipped checks keeps it waiting until the grace period ends, so the instant pull-request copies no longer pass a save before the tests are registered. `FAILURE` stays immediate.
- **`merge.sh` fails closed.** A failed `gh pr list` keeps the branch instead of deleting it and closing stacked PRs. A delete that loses the race to GitHub's own delete at merge reports `deleted-at-merge`, not an error.
- **Smaller fixes.**
  - `search --state` filters before `--limit`.
  - Preview discovery's PR-comment method takes the newest comment naming the head commit.
  - The test, payload, and deploy workflows run on branch pushes only, so a release tag no longer redeploys staging. The mini-app tests run after a red suite.
  - A preview alias starts with a letter and fits beside the staging Worker's name.
  - `npm run deploy` in `app/` runs `scripts/cf-deploy.sh`, which deploys nothing outside CI.
  - `/verify`'s request probes time out after 30 seconds (`VERIFY_REQUEST_TIMEOUT`), and `HEAD` uses `curl -I`.
  - `server/setup.sh` pins OpenSpec 1.13.2.
  - The background run's instructions allow `finish-run --counts`.
  - The `/improve` survey skips `CHANGELOG.md`.
  - The memory scripts `run.mjs` and `session-start.mjs` answer `--help`.

**Updating.** `/wong-sync` brings the fixes. The memory route's fix takes effect on the next production deploy from `main`.

## 25.10.0 — Setup gets your computer ready first

- **Setup installs the tools it needs, after asking.** Before it writes anything, setup checks for `git`, `gh`, Node.js, and OpenSpec, and asks once to install the missing ones. It uses Homebrew (when already there), `winget`, or `apt` only when no password is needed; otherwise it installs into `~/.local`. A no, or a failed install, stops setup with nothing written. The new `wong-setup/references/tools.md` owns the steps.
- **One GitHub sign-in, with every scope.** Setup shows a code and a link, and one approval grants `workflow` and `user:email`. Nobody types `gh auth login`, and the first push no longer fails for a missing scope.
- **Git name and email come from GitHub** when they are unset, so memory's admin key no longer stops on a new computer.
- **Windows folder links are tested.** Setup walks the person through Developer Mode when links are refused, and makes its links so a refusal fails out loud instead of becoming a copy.
- **Memory is reported honestly.** The closing report says memory is on only when it answered; otherwise it starts once the site first goes live.
- **The pages match.** `README.md`, `wiki/stack/getting-started.md`, `wiki/stack/cloudflare-credentials.md`, and `wiki/development/required-tools.md` say setup may install free tools, name the GitHub account, and describe the token as two permission rows.

**Updating.** Nothing to do in an installed repo: `/wong-sync` brings the page edits, and the setup changes reach new installs.

## 25.9.0 — Newest building blocks, except Vitest 5

- **The app's building blocks are current.** React and React DOM 19.3, Vite 8.3.1, the React plugin 6.1.1, jsdom 30.1.1, knip 6.38.0, oxlint 1.85.0, and jscpd 5.3.2, in `app/package.json` and its lockfile. `@types/node` stays on 22 to match `.nvmrc`. Nothing in the app changes.
- **Vitest stays on 4.** Stryker's Vitest runner does not work with Vitest 5 yet ([stryker-js #6210](https://github.com/stryker-mutator/stryker-js/issues/6210)): each mutant runs no tests, so the mutation score falls to near zero and the Test check fails. Move `vitest` and `@vitest/coverage-v8` together once Stryker ships the fix.
- **The workflows run on the newest GitHub setup steps.** `actions/checkout` v7.0.1 and `actions/setup-node` v7.0.0, pinned by SHA, in `test.yml` and `deploy.yml` (and the meta-only `payload.yml` and `release.yml`). No setting changes: every step already sets `cache: npm`.
- **One change instead of eight.** This replaces eight separate Dependabot pull requests.

**Updating.** `/wong-sync` brings the new versions and pins. If Dependabot offers Vitest 5 in your repo, leave it until Stryker fixes #6210. The sync changes `test.yml`, so its change needs a `Check:` bullet for it; CI names the file.

## 25.8.0 — Offers to make a task easier next time

- **A task that will come back ends with one offer.** When the agent finishes a task it did by hand and there is a clear sign it recurs, its closing next-step question adds one option: run it on a schedule through `/routine`, or build a mini app for it. A clear sign is the person saying it recurs, or a memory fact showing they asked before; never a guess. Judgment on each run means a routine; fixed steps mean a mini app. [Offer a routine or an app](wiki/development/the-change-loop.md#offer-a-routine-or-an-app) owns the rule, the `WONG-STACK` block states it, and [the ask convention](.agents/skills/explore/references/asking-the-user.md#end-every-reply-with-the-next-step) links it.
- **A no is final.** The agent records a decline as a `feedback` memory fact and never offers again for that task. No offer comes after a code change, in an unattended run, or for a routine where `paseo` is not installed.

**Updating.** `/wong-sync` brings the block rule and the two page edits. Nothing else to do.

## 25.7.0 — Labelled releases, and a plain guide to API keys

- **Every version gets a GitHub Release.** `.github/workflows/release.yml` runs `scripts/tag-releases.mjs` on each push to `main`. It gives every `CHANGELOG.md` version with no Release a `v<version>` tag and a Release whose notes are its entry. The tag goes on the first commit that set `VERSION` to that version, not the one a commit title names. Its first run fills in 19.0.1 through 25.6.0. Both files are meta-only.
- **A plain guide to API keys.** [API keys](wiki/stack/api-keys.md) tells a non-developer how to get a key, paste it into the chat with what it's for, and replace one that leaked. It explains how keys differ from website logins. [Getting started](wiki/stack/getting-started.md), the [stack hub](wiki/stack/README.md), and [the secrets convention](wiki/development/secrets.md) link it.
- **One lookup finds the primary worktree.** `.agents/skills/memory/scripts/lib/primary-root.mjs` replaces five separate lookups in `store.mjs`, `worktree-secrets.mjs`, `routine.mjs`, `cf-secrets.mjs`, and `verify-staging.sh`, and the copies in setup's runbook and `named-secrets.md`. Git must confirm the answer. In a bare repository's worktree it fails instead of guessing: saving a secret stops there, while reading one falls back to the current checkout as before. `routine.mjs` no longer reads `git worktree list`.
- **A steadier test.** `wait-for-checks.test.mjs` gives its grace-period test 3 seconds instead of 1. The script's whole-second deadline could leave it less than a second on a busy machine.

**Updating.** `/wong-sync` brings the new page and the shared lookup. `routine.mjs`, `worktree-secrets.mjs`, `verify-staging.sh`, and `cf-secrets.mjs` now load it from `.claude/skills/memory/`. If you renamed the memory skill, those scripts fail on load until the path matches.

## 25.6.0 — Checks the AI loosens are caught

- **A loosened check fails the Test check unless a reason is written.** `.github/scripts/loosened-checks.mjs` compares the branch with the base `app-untouched.sh` finds. It flags a file when the change adds a skip comment (Stryker, coverage, lint, or TypeScript), adds a skipped, focused, or to-do test, deletes a test file, or changes a check's settings: a test, coverage, mutation, lint, type, duplicate-code, or unused-code config, a `package.json` `test` script or a script it runs, `test.yml`, or a script under `.github/scripts/`. A flagged file passes when a proposal the branch adds or edits names it in a Decision-log bullet that starts with `Check:`. [A loosened check needs a reason](wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason) owns the rule.
- **The Test workflow runs it on every push**, after the suite and on docs-only branches too, so one run reports a red suite and a missing reason together. The job summary lists each flagged file as explained or not, and the failure says exactly which bullet to add.
- **`app-untouched.sh` prints a fourth line, `base`**: the commit the change is compared with, or empty when there is none.
- **You see each loosened check before publishing.** `/apply` runs the check on the working tree, fixes what it flags without asking, and lists every `Check:` bullet in plain words above *publish it?*. `/ship`'s report carries the same list, and the review page tags those decisions `check`.
- **The code rule says it once.** `.claude/rules/code.md` links the new gate section.

**Updating.** `/wong-sync` brings the script, the workflow step, and the skill edits. The sync itself changes `test.yml` and `.github/scripts/`, so its change needs `Check:` bullets for them; CI's failure names each file, and the agent adds them. After that, only a branch that loosens a check needs one.

## 25.5.0 — Memory access comes from GitHub

- **A teammate joins memory on their own.** `memory.mjs join` sends the person's `gh` token to the production Worker's new `/_memory/join` route. The route asks GitHub about the repository CI deployed it from, never one the request names. A private repo lets in anyone who can read it, a public one anyone who can push, and the key's email is one GitHub has verified. The session-start hook runs `join` in the background when there is no key, and memory loads from the next session: [joining through GitHub](wiki/development/memory.md#joining-through-github). No key goes in the repo.
- **One key per machine, expiring.** A joined key lasts 30 days, and the hook renews it when 7 or fewer are left. A second laptop no longer replaces the first. `member list` shows each machine and expiry; `member remove` revokes every key of an email; `member add` replaces only the key it made. The admin's key from setup, and every key made before this release, never expire.
- **A member key adds facts under its own name.** The route runs only the memory script's own writes for a member, with the key's email as the author, plus plain reads. A member can no longer change, delete, or hide a fact, or drop the store's guards. The script writes facts under the key's email.
- **Team mode comes from the store.** The route says on every answer whether more than one email holds a key, and the script remembers it, so the owner's digest filters personal facts once a teammate joins.
- **Production knows its repository.** `cf-deploy.sh` passes `--var GITHUB_REPOSITORY:<owner/repo>` on the production deploy, from `GITHUB_REPOSITORY` or the `origin` remote.
- **Teammates need one more `gh` scope.** `user:email`, to read verified emails: [required tools](wiki/development/required-tools.md#gh-needs-the-useremail-scope-for-memory).

**Updating.** `/wong-sync` brings the route, the script, the deploy change, and migration `0003_key_machines.sql`. After the update merges and production deploys, the admin runs `node .claude/skills/memory/scripts/memory.mjs migrate` once. Until then, old keys keep working and `join` is refused.

## 25.4.1 — Installs skip npm's audit

- **No install waits on npm's audit.** `test.yml`'s and `deploy.yml`'s `Install` step and `scripts/cf-preview.sh`'s first-run install now run `npm ci --no-audit --no-fund`. npm is retiring the audit endpoint `npm ci` calls, and on one CI run it held the install for 5 minutes instead of the usual 8 seconds. Nothing read the audit summary or the funding notice.

WongStack's own checks now fail on any `npm ci` in a workflow or `scripts/` file that drops either flag.

**Updating.** `/wong-sync` brings the new lines. If you changed your own `Install` step, add `--no-audit --no-fund` to it. Installs you run by hand keep npm's defaults.

## 25.4.0 — Review notes update the plan and stop

- **Copy notes is a plain request.** `review.html` copies `Update the plan <name> with these notes from the review page. Don't build yet.`, then one bullet per note: `- Change #2 ("<quote>"): <note>`, with `Why, paragraph <n>`, `Change #<n>, drawing line <k>`, or `Decision #<n>` for the other spots. It no longer starts with `/continue`. The toast says *Paste them into chat to update the plan.* Saved notes and their labels are unchanged.
- **Pasted notes stop at the plan.** [`/plan`'s review-notes step](.agents/skills/plan/SKILL.md#review-notes) recognizes the new header with no verb, skips the explore round, goes by the quote when a number moved, rebuilds the page, and ends with the review link and *build it now?* It never builds from the notes. The skill's description names pasted notes, so it loads without `/plan`. `/continue` drops its review-block bullet.
- **The old marker is retired.** `Review notes from review.html` joins `scripts/retired-names.json`.

**Updating.** An active change's page picks up the new copy on its next build. A page built before 25.4.0 still copies `/continue`; rebuild it (`/plan` rebuilds on any edit) before copying notes from it.

## 25.3.0 — Tests that guard AI-written code

- **The app carries no browser.** The review page's browser test moves from `app/review/` to WongStack's own checks (`scripts/tests/review-browser.test.mjs`), on `playwright-core` and the CI runner's Google Chrome. The scaffold drops `playwright`, `review/*.test.mjs` leaves its `test` script and `knip.jsonc`, and `test.yml` no longer installs Chromium, about 19 seconds per run.
- **Mutation testing skips static mutants.** `app/stryker.conf.json` sets `ignoreStatic`. A static mutant changes code that runs once when a module loads, so testing it reruns every test; in one repo they were 17% of the mutants and 81% of the time. The 100% break threshold stays for every other mutant.
- **The login check is tested with a real signature.** `app/worker/access.test.ts` signs tokens with a key generated in the test instead of mocking `crypto.subtle`, and a token signed by another key is refused. `access.ts` drops its base64 padding code, which `atob` never needed, and marks two mutants that change nothing observable with a `Stryker disable` comment and its reason.
- **The walkthrough cleanup deletes only its own temp folders.** `verify-staging.sh cleanup` resolves the path and accepts only a `wong-verify-*` or `wong-walk-*` directory directly inside the system temp directory.
- **Memory reports real supersedes.** `memory.mjs put-facts` counts a supersede only when the store marked the old fact; one that names a missing or already-superseded fact counts as added.
- **Scripts pass shellcheck.** `scripts/lib-wrangler-config.sh` declares that its callers read the variables it sets; two small lint fixes in the memory and routine scripts. No behavior changes.

WongStack's own checks, which no repo receives, now test each guard script's refusal path, lint the scripts, run shellcheck, and hold script coverage to a floor that only rises.

**Updating.** `/wong-sync` removes `app/review/` and `playwright` from `app/package.json` and the browser step from `test.yml`, and adds `ignoreStatic`. The first CI run after it tests every mutant once, because the Stryker config changed. If you added your own browser tests to the app, keep `playwright` and add your own install step.

## 25.2.1 — Each rule written once, and old names caught

- **Each rule has one owner.** Skills, references, and wiki pages that restated a rule now link its owner: the git boundary, the gate, the ask format, credential exclusion, the widen, the Access service token, the walk mechanics, and the mini-app flow. `save/references/archived-save.md` folds into `save/SKILL.md` ([the archived handoff](.agents/skills/save/SKILL.md#the-archived-handoff)), and `save/references/spec-sync.md` into [the CLI contract](.agents/skills/plan/references/openspec-cli.md#reconcile-deltas). Pasted review notes move from `/continue` to [`/plan`](.agents/skills/plan/SKILL.md#review-notes). No step, command, or behavior changes.
- **The wiki says each thing once.** [The staging walkthrough](wiki/development/staging-walkthrough.md) keeps only its reasons. [Cloudflare Access](wiki/stack/cloudflare-access.md) owns the service token, and [the D1 pipeline](wiki/stack/d1-pipeline.md) owns `.dev.vars` and secret parity. The memory page's "The memory token" heading is now [The memory key](wiki/development/memory.md#the-memory-key).
- **Specs match what ships.** `memory-worker` folds into `memory-store`, and `session-notes` into `memory-capture` and `delivery-gate`, word for word; archive retires both. Stale names are fixed: `openspec-archive-change`, `/opsx:apply`, the `walk` skill, and the memory token.
- **A retired-names check.** `scripts/check-retired-names.mjs` fails CI when a live file names something in `scripts/retired-names.json`, and says what replaced it. It is meta-repo only. [The payload rule](.agents/rules/payload.md) adds the old name to the list whenever a change removes or renames something.
- **Deploy scripts share their helpers.** `scripts/lib-wrangler-config.sh` gains `wong_preview_alias`, `wong_preview_url`, and `wong_ci_branch`, used by `cf-deploy.sh`, `cf-preview.sh`, and `cf-build.sh`. Exit codes and messages are unchanged.
- **Entries before 19.0.0 are in git history.** This file drops from about 31,600 words to 4,200.

**Updating.** `/wong-sync` brings the edited skills, references, wiki pages, and scripts. A link in your own pages to `memory.md#the-memory-token`, `save/references/archived-save.md`, or `save/references/spec-sync.md` needs the new target above.

## 25.2.0 — The review page works on a phone

- **One tap to comment.** Every Why paragraph, item, and decision on `review.html` shows a **+ Note** button that opens the note box. A saved note's pin takes its place. A mouse click on the text still offers "Add note"; a touch tap on text does nothing, so a stray tap while scrolling opens nothing.
- **Drawings fold and use the full width.** `build-review.mjs` writes each drawing as a `<details class="drawing">` after the item's text column, so it starts folded and spans the whole card when opened. The fold row counts the notes on the drawing's lines. The page fits a drawing by font size and has no zoom buttons; a drag scrolls the page.
- **A full-screen view zooms and moves the drawing.** A tap on a drawing, or **Full screen**, opens it bigger. −, Fit, +, a pinch, and a Ctrl or Cmd wheel zoom it; the browser's own scrolling moves it, so a host app such as Paseo should no longer take the drag for a sidebar swipe. Tap a line to note it. Escape or Close returns to the page.
- **The phone note box stays on screen.** It is placed from the top of the visible screen and capped at its height, so a keyboard never pushes its top out of view. Its location line is one line, and "Discard draft" is now "Discard".

Note ids, labels, storage, and the copy format do not change, so saved notes stay attached. An active change picks up the new kit on its next page build; archived pages are not rebuilt.

## 25.1.0 — Learn the development loop by chatting

- **A new tutorial.** The starter landing page opens with *Learn the development loop*: one plain message and a **Copy** button. The message asks the agent to remove the tutorial and explain each step, so the first change teaches the plan, the preview, and publishing in the chat. When the browser blocks copying, the button says to copy the message by hand. The tutorial's test moves to `app/src/Tutorial.test.tsx`, so removing the tutorial takes its test with it.
- **One home page.** The build no longer writes the `/apps/` list page; `mini-apps/router.mjs` redirects `/apps/` to `/`, and the home page is the list. The example app's back link reads *Home* and points at `/`. When the list does not load, the home page says to reload instead of linking to `/apps/`.
- **The home page looks like the mini apps.** `app/src/index.css` and `App.css` drop the Vite template's purple theme for the mini apps' plain style: `system-ui`, `color-scheme: light dark`, system colors, and 1px outlines.
- **Setup points to it.** The closing report of [setup's provisioning runbook](.agents/skills/wong-setup/references/cloudflare.md#step-5--the-closing-report) ends on the site's address and the message to copy.

**Updating.** `/wong-sync` replaces the old tutorial message only when your landing page still shows it. If you removed it, it stays removed. If your own landing page does not list the mini apps, the plan adds the list, because `/apps/` now opens your home page. Your own mini apps keep their *All mini apps* link; it still works, and lands on the home page.

## 25.0.0 — One route for every change, with a preview right after building

**Breaking.** A mini app no longer has its own route, and `/apply` no longer saves when it finishes.

- **`/apply` ends with a preview from this machine.** When every task is done, it asks `.github/scripts/app-untouched.sh --worktree` whether the app changed. If it did, it runs `scripts/cf-preview.sh --alias <change-name>` and reports the link. Then it asks *publish it?*, *change it more*, or *save it*. It never invokes `/save` on completion. A change that leaves the app untouched gets no upload: the agent does the task and reports. Inside `/ship`, `/apply` still returns with no upload, and task-driven saves still run mid-list.
- **Only `/save` and `/ship` push.** `/save` opens the pull request when you want a checkpoint. `/ship` saves once, waits for CI, walks the preview, and merges, as before.
- **A mini app takes the same loop.** "Make me a …" gets a plan with a review link and *build it now?*, then the host preview at `/apps/<name>/`, then *publish it?*. It goes live only through `/ship`, and CI still runs only the changed app's tests.
- **`app-untouched.sh` gains `--worktree`.** It answers for the uncommitted work, untracked files included, against the merge base with `origin/<default>`. The CI mode does not change.
- **Removed:** `save/references/mini-app-save.md`, `save/scripts/mini-app-push.sh`, the `mini-app` mode of `save/scripts/render-pr-body.mjs`, `/apply`'s mini-app path, and `/ship`'s mini-app merge. The `WONG-STACK` block's mini-app rule no longer mentions a direct save.

**Updating.** Finish or save a half-built mini app before you sync: a save after the update opens a pull request instead of pushing to `main`. `/wong-sync` deletes the removed files. Apps you already saved stay live and unchanged.

## 24.0.2 — OpenSpec 1.13.2

- **OpenSpec 1.13.2 replaces 1.8.0.** The install command in `save/references/preconditions.md`, the CI install, and the docs name 1.13.2. The commands WongStack uses (`init --tools none`, `context`, `list`, `status`, `instructions`, `validate`, `archive`) keep their JSON shape; `instructions apply` adds `taskTrackingConfigured`.
- **CI validates every spec strictly.** The `payload` check runs `openspec validate --specs --strict`, which since 1.11.0 fails a Purpose still left as the archive's `TBD` placeholder. `delivery-gate` and `secrets-convention` get a real Purpose.

**Updating.** Run `npm install -g @fission-ai/openspec@1.13.2`. In your own repo, `openspec validate --specs --strict` names any spec whose Purpose still says `TBD`; write what it is for.

## 24.0.1 — The Worker runs first for all its routes

- **Memory and the API work again in production.** 24.0.0 set `run_worker_first` to `["/apps/*"]`. With a list, every path not in it gets the single-page fallback, so `POST /_memory/*` and `POST /api/*` answered 405. The `wrangler.jsonc` fragment and the app config now list `["/api/*", "/_memory/*", "/apps/*"]`, and a script test holds that list. An install on 24.0.0: add the two missing entries to `run_worker_first` in `app/wrangler.jsonc`; `/wong-sync` plans it.

## 24.0.0 — Your app serves the mini apps

**Breaking.** There is no separate mini-app Worker any more. Your app's Worker serves every mini app at `/apps/<name>/`, and the old `<repo>-mini` address stops working.

- **One Worker per repo.** `app/worker/index.ts` sends `/apps/*` to the new `mini-apps/router.mjs`, the same way it sends `/_memory/*` to memory. `mini-apps/routes.mjs` finds each app's `api.mjs` with a Vite glob, so a new app needs no edit. A handler gets only `DB`, never the memory bindings. The `wrangler.jsonc` fragment gains `assets.binding: "ASSETS"` and `run_worker_first: ["/apps/*"]`, so an app's API wins over the single-page fallback.
- **The build copies the apps in.** After `build:app`, `cf-build.sh` runs `mini-dashboard.mjs --into <assets>`. It copies each app's pages, never `api.mjs`, tests, or TypeScript, to `/apps/<name>/`, and writes the list page `/apps/` and its data `/apps/apps.json`. The assets folder comes from the new `assets-dir` read in `lib-wrangler-config`.
- **A preview builds the whole app.** `scripts/cf-preview.sh --alias mini-<name>` replaces `cf-mini.sh preview`. It installs `app/` when it has no `node_modules`, migrates staging, builds for staging, and uploads a preview version of the staging Worker. It is slower than before, and previews no longer expire.
- **A mini-app save deploys your app.** The direct save to `main` does not change. CI still runs only the changed app's tests, but it now builds and deploys the main Worker. `app-untouched.sh` counts only `mini-apps/apps/*` as untouched, so a change to the router runs the main suite. The mini-app deploy block and its `staging-mini` preview are gone from `deploy.yml`.
- **A new landing page.** The starter app's Vite template page becomes a tutorial message and a list of your mini apps. The tutorial's one task is to remove itself: say `remove the tutorial message`, and the agent walks you through the plan, the preview, and publishing.
- **Removed:** `mini-apps/wrangler.jsonc` and its fragment, `mini-apps/worker.ts`, `mini-apps/tsconfig.json`, `mini-apps/.gitignore`, `mini-apps/apps/.assetsignore`, `scripts/cf-mini.sh`, and the seven-day preview expiry.

**Updating.** `/wong-sync` plans the move through [setup's provisioning runbook](.agents/skills/wong-setup/references/cloudflare.md#4c-the-two-app-databases-and-the-config):
1. The sync change adds the `/apps/` route to `app/worker/index.ts` and the two `assets` keys to `app/wrangler.jsonc`, and deletes the mini Worker's files. Your landing page stays as it is; `/apps/` lists the apps.
2. After it merges and production deploys, open `/apps/` and each saved app.
3. Only then, delete the `<repo>-mini` and `<repo>-mini-staging` Workers.

## 23.2.0 — The assistant comes first, in short plain messages

- **Short, plain messages replace STE100.** The `WONG-STACK` block no longer asks for ASD-STE100 Simplified Technical English. One rule, *keep messages short and plain*, replaces it and "Answer in a few lines": the point first, a few lines, everyday words. The agent names git, OpenSpec, or CI only when the person asks or must act. Code, commands, identifiers, and quotations stay exact. [`wiki/voice.md`](wiki/voice.md) owns the rule and gains an everyday-words line. `asking-the-user.md` points to it.
- **Plain requests come first.** "Do a plain request directly" is now the first rule in the block, before the change loop.
- **The README and wiki welcome a newcomer.** The README opens with what the assistant does, example requests, three setup steps, and where to chat, with no developer terms. The commands, comparison, requirements, and layout sit under "For developers". [`wiki/README.md`](wiki/README.md) opens with the assistant and links [getting started](wiki/stack/getting-started.md), which now shows asking for anything before the change loop.

**Updating.** `/wong-sync` brings the new rule, `voice.md`, and the reference line. Nothing else to do. Your own wiki pages keep their prose until you next edit them.

## 23.1.0 — Plans a non-technical person can read

- **Plans are written for the person who asked.** A person page in `wiki/people/` can hold one line, `**Technical level:** technical` or `non-technical`. With no line, the agent assumes non-technical. A plan's Why and What Changes then say what the person will see, get, or be able to do, and file names, code, and commands move into the design, specs, and tasks. [The ask convention](.agents/skills/explore/references/asking-the-user.md#write-at-the-readers-level) owns the rule, and `openspec/config.yaml` gives it to every draft. A technical reader's plan does not change.
- **Questions and reports name outcomes.** Every ask, blocker report, and next-step question uses the reader's level. A skill tries the fixes its rules allow before it asks, and `/ship`'s failed-walk question becomes *fix it first, or publish anyway?* for a non-technical reader. `/apply` and `/ship` start their reports with the outcome.
- **You just ask.** A code change asked for with no command stops twice: at the plan (*build it now?*) and after the preview (*publish it?*). `/ship` and `/apply` keep their reach when you type them. [The change loop](wiki/development/the-change-loop.md#just-ask) owns the rule, and the `WONG-STACK` block states it.
- **Every plan ends with a link to its review page.** `build-review.mjs` prints the page's absolute path after its status line, and a standalone `/plan` ends with *Click here to see the plan:* and that link, just above the next-step question.

**Updating.** `/wong-sync` takes the new text and script. Nothing to migrate: with no level line, plans become plain. An engineer says once that they are technical, and the agent records it on their page.

## 23.0.1 — A mini-app save retries once when main moved

- **A moved `main` gets one rebase, not a pull request.** A mini-app save now pushes through the new `save/scripts/mini-app-push.sh`. It runs the app's tests and pushes. When the push is rejected only because `main` moved, it rebases once, runs the tests again, and pushes again. It never forces a push. It falls back to a pull request when the rebase conflicts, the tests fail on the new `main`, the second push is rejected, or the push is refused for another reason, such as branch rules. It prints `pushed`, `rebased`, and `reason`, and a real-git test covers each path. Before this, any rejected push fell back to a pull request, as the first saved mini app did when another release landed during its save.

## 23.0.0 — Memory lives in your app's production Worker

**Breaking.** There is no separate memory Worker any more. Your app's production Worker serves session memory, and CI deploys it with the app.

- **One Worker per repo.** `app/worker/index.ts` sends `/_memory/*` to the memory skill's route module, on the production Worker's `MEMORY_DB` and `MEMORY_BUCKET` bindings. The staging Worker and previews bind neither and answer 404. The route keeps the same requests, keys, roles, and transcript rules as 21.0.0. The shared `wong-memory` Worker and its `wong-memory-keys` database are gone.
- **`memory.mjs worker deploy` is removed.** A merge to `main` deploys a memory change. `member add`, `member remove`, and `member list` stay, with `CLOUDFLARE_API_TOKEN`.
- **Keys live in the memory database.** Migration `0002` adds a `memory_keys` table. The route refuses every statement that names it, so no key can read or change keys.
- **The token picks the route.** A memory key (`wongm_...`) goes to `components.memory.worker`, now `https://<worker>.<subdomain>.workers.dev/_memory`. Any other token goes to the Cloudflare API, as before. Before production first deploys the route, a key's facts wait in the spool.
- **The pipeline knows the memory bindings.** `secrets:check` does not ask staging to twin a `MEMORY_*` binding, and `cf-build.sh` never reads `MEMORY_DB` as the app's database. The [`wrangler.jsonc` fragment](.agents/skills/wong-sync/references/stack-pack-fragments.md#wranglerjsonc--the-worker-entry-bindings-and-envstaging) gains both bindings at the top level only.
- **Access.** Keep `workers.dev` on for the production Worker, or bypass `/_memory/*`: [the Access page](wiki/stack/cloudflare-access.md#4-bypass-the-public-surface).

**Updating.** `/wong-sync` plans the move through [setup's provisioning runbook](.agents/skills/wong-setup/references/cloudflare.md#4b-the-memory-store):
1. The sync change adds the route to `app/worker/index.ts`, the memory bindings to `app/wrangler.jsonc`, and `worker` to the install record. It runs `memory.mjs migrate`, and gives `<repo>-deploy` R2 access when the store has a bucket.
2. After it merges and production deploys, run `memory.mjs member add <your git email> --admin --env`, then `memory.mjs digest`.
3. Only then, delete the old `<repo>-memory` Cloudflare token.

Until step 2, the store keeps working with the old token. Teammates who held that token need a member key from the admin.

## 22.0.1 — Only the mini-app scaffold ships, not every mini app

- **The scaffold lists what ships.** `payload-files.json` named the whole `mini-apps/` folder, so an app made in the WongStack source repo would have reached every repo that installs or syncs WongStack. It now lists the mini Worker (`worker.ts`, its editor config, and its ignore files) and the example app `mini-apps/apps/hello/`, and nothing else. `mini-apps/wrangler.jsonc` stays out, as before. A sync test with the real manifest checks that a second app folder is never selected. A repo on 22.0.0 already has these files, so its next `/wong-sync` changes nothing.

## 22.0.0 — A lighter loop, mini apps, and verbs for any work

**Breaking.** `/plan`'s review page, `/ship`'s checkpoints, and `/apply`'s completion inside `/ship` change their contracts.

- **The review page is one scrolling document with text drawings.** `/plan` draws each visual as a fenced `text` block inside its What Changes bullet, top to bottom and about 40 columns wide, with no design subagent and no browser check. The page shows Why, the items with their drawings, and the Decision log labeled *asked*, *assumed*, or *log*. A drawing opens fitted to the screen; pinch or press + to zoom, and drag to pan. Tap an item to add a note: there is no annotate mode, and a drag still scrolls. Removed: `plan/references/review-author.md`, `plan/references/review-examples.html`, `plan/scripts/check-review.js`, and the per-change `review-visuals.html`. An active change planned in the old format keeps its page with a proposal-only refresh; archived pages are not rebuilt. Each Decision-log bullet now holds one decision and starts with *Asked* or *Assumed*.
- **A one-go `/ship` runs CI once.** When `/ship` pulls in `/apply`, `/apply` returns without `/save`; `/ship` archives, saves once, walks the preview with `/verify`, and merges. The new `ship/scripts/merge.sh` does the merge, the retarget, the branch delete, and the checkout sync. A standalone `/apply` still saves when it completes.
- **Mini apps.** "Make me a …" builds `mini-apps/apps/<name>/` on a small Worker beside the main app, with no build step, a plain-JavaScript handler, and its own `node --test` tests, so a preview never builds `app/`. `scripts/cf-mini.sh preview` uploads a preview from the agent host in seconds, on staging data, and the preview expires after seven days. `/save` then takes a second direct route beside the prose route: it runs the app's tests on the host and pushes straight to `main`, where CI runs them again and deploys only the production mini Worker. A diff outside the app's folder, such as a migration, or a rejected push falls back to a pull request, which `/ship` merges with no change record and no walk. `scripts/mini-dashboard.mjs` lists every saved app. New: the `mini-apps/` scaffold, [mini apps](wiki/stack/mini-apps.md), `save/references/mini-app-save.md`, and a `mini-app` mode in the PR body renderer. Setup creates `mini-apps/wrangler.jsonc` from a new fragment; an existing repo adds it through `/wong-sync`. The pack's config resolver now skips `mini-apps/`.
- **A verb you invoke serves any work.** Work that changes no repo file gets a to-do from `/plan`, a confirm before each outward action in `/apply`, a memory thread from `/save`, and a resume from `/continue`. `/ship` stays for repo changes. A plain request still needs no verb.
- **CI skips the main app when a branch leaves it untouched.** The new core `.github/scripts/app-untouched.sh` compares the whole branch with the default branch. On a docs-only branch (`wiki/`, `openspec/`, or `.md` files) or a mini-apps-only branch, `test.yml` and `deploy.yml` skip the main app's steps inside the job, so a required check still reports. A mini-app branch runs only the changed apps' tests.

## 21.0.0 — Team memory: every memory call goes through one memory Worker per account

**Breaking.** Every install changes how it reaches its memory store. No person holds a Cloudflare token for memory any more, because D1 permissions reach every database in the account, the app's production database included.

- **One memory Worker per Cloudflare account.** `wong-memory` serves every repo's memory store in the account, home included. It is separate from every app Worker, and it can reach only the memory databases and buckets. `memory.mjs worker deploy` deploys it, attaches this repo, keeps every other repo's attachment, drops attachments to deleted stores, and records the URL as `components.memory.worker`.
- **Memory keys, not tokens.** `CLOUDFLARE_MEMORY_TOKEN` now holds a memory key (`wongm_...`). Each key opens one repo's store, as admin or member. The `wong-memory-keys` database holds only key hashes, and no key can reach it. `member add <email> [--admin] [--env]`, `member remove`, and `member list` manage keys with `CLOUDFLARE_API_TOKEN`. `migrate` also runs with that token.
- **Transcripts are private to their author.** New uploads go to `sessions/<author email>/<agent>/<session-id>.jsonl`. A member reads only their own; the admin reads all, including older transcripts.
- **Personal facts in a team.** Once a repo has a member (`components.memory.team`), the digest and search show only your own `user` and `feedback` facts, matched on every email on your people page. `project` and `thread` facts come from everyone. `search --everyone` shows all. A solo repo does not change.

**Moving an existing install.** `/wong-sync` plans it through [setup's provisioning runbook](.agents/skills/wong-setup/references/cloudflare.md#4b-the-memory-store):
1. Run `memory.mjs worker deploy`.
2. Run `memory.mjs member add <your git email> --admin --env`.
3. Check `memory.mjs digest`.
4. Only then, delete the old `<repo>-memory` Cloudflare token.

Until you move, the store keeps working with the old token. Teammates who held that token need a member key from the admin.

## 20.2.0 — A server setup script you can fork

- **`server/setup.sh` turns a fresh Ubuntu 24.04 server into a workspace for agents.** Run it as root: it makes the workspace user (`WORKSPACE_USER`, default `wong`), installs Node.js 24, `git`, `gh`, OpenSpec, Paseo, Claude Code, Codex, OpenCode, and agent-browser with its Chrome, and runs Paseo as a service for that user. It checks its own result last and prints `missing: <name>` on a gap. It is safe to run again.
- **[`server/README.md`](server/README.md) is the contract a host relies on:** the command, the input, the end state, the paths it never touches, and a 12 KiB size budget, so a host can embed the script in first-boot data. A new test holds the script to the budget, checks its syntax, and checks that the final check covers every promised tool.
- **Your fork is your template.** Edit the script in your fork to change what every server gets; a host that runs a pinned commit of your fork builds your servers, and you own the template.
- **Source-only.** `server/` is not payload, so `/wong-sync` adds nothing to installed repos. [Required tools](wiki/development/required-tools.md) now names the script as the one place WongStack installs Paseo.

## 20.1.1 — Override the vulnerable qs in the app scaffold

- **`qs` resolves to 6.16.0.** `app/package.json` gets `"overrides": { "qs": "^6.16.0" }`. Stryker 10.0.0 pins `typed-rest-client ~2.3.0`, which pins the vulnerable `qs` 6.15.1, so no normal update could fix it. Only Stryker's dashboard reporter uses `qs`; the app's runtime does not change. Remove the override when Stryker moves to `typed-rest-client` 3.

## 20.1.0 — Mutation testing re-tests only what changed

- **Stryker is incremental.** The scaffold's `app/stryker.conf.json` sets `"incremental": true`. Stryker keeps each mutant's result in `app/reports/stryker-incremental.json` (git-ignored) and reuses it when the mutant's code and the test that killed it did not change; it tests every other mutant. The 100% break threshold and the one `npm test` command stay. `npx stryker run --force` tests every mutant.
- **The Test workflow keeps the result file between runs.** [`test.yml`](.github/workflows/test.yml) restores the file before "Test" and saves it after, also after a red run. A branch starts from its own newest file, else the default branch's. The key hashes the suite's lockfile, Stryker config, and Vitest config, so a dependency or config change tests every mutant. A suite with no Stryker config runs no cache step.
- **Why:** a full mutation run grows with the app. In one downstream repo it took 14 of the Test check's 15 minutes, on every push. The first run after this update has no file and tests every mutant; later pushes re-test only what changed. If you edited your own `stryker.conf.json`, `/wong-sync` adapts the one-line change.

## 20.0.0 — An assistant in every repo: direct requests, a wiki that grows from use, and home

**Breaking.** Every install changes how it handles requests and what it writes to the wiki. There is no mode: every repo follows the same rules.

- **Plain requests are done directly.** The `WONG-STACK` block now says: do research, errands, reminders, and questions with no verb and no question round; build or change code through the verbs. `/explore` still runs before every plan.
- **The wiki holds repeatable knowledge and grows from use.** Its scope widens from "general, reusable processes" to process, people, the company, and the project. The test: will this help with a future task that is not this one? The agent writes such knowledge when it learns it, including "read this and remember it" and answers worth keeping, citing sources by URL. The block's "Don't edit `wiki/` mid-task" rule is replaced. [Wiki style](wiki/wiki-style.md#repeatable-knowledge) owns the rules: `wiki/people/<name>.md` pages matched by git email and created on first use, four writing rules, and no seeded sections.
- **`/ship` is the catch-up.** Its distill step reads every live fact from the sessions on the change's branch (`search --branch`), not only the change's slug, and places repeatable facts by progressive disclosure, people pages included.
- **Home.** A person can record one repo per machine as their home in `~/.wong-stack/machine.json`; `/wong-setup` asks. Every other repo then loads the person's `people/` page and live `user` and `feedback` facts from home at session start, in a capped **From home** part of the digest. Facts about private life go to home's store through the new `memory.mjs --home` option (on `search`, `show`, `gate`, `put-facts`), wait in home's spool when home is offline, and are dropped when no home is recorded. No new database or token. [Home](wiki/development/home.md) owns the details.
- **Saved browser logins.** The first login points agent-browser at one persistent profile in `~/.agent-browser/config.json`; the person logs in once, and later tasks reuse the session. Personal browsing runs one task at a time. `/verify` now runs each browser journey in its own temporary profile, so a walk never carries personal logins.
- **Short chat replies.** The block tells the agent to answer in a few lines and give more detail when asked.
- **Tests:** the memory harness keys its fake databases by id; new tests cover `--home`, the home spool, the From-home part, and the `/verify` profile. The garbled 19.0.2 entry below is repaired.

## 19.1.0 — one file per secrets role, and branch copies in worktrees

- Two live secrets files, one role and one place each. The root `.env` holds what you and the scripts use to reach Cloudflare, and never reaches a Worker. `app/.dev.vars` holds the secrets the Worker reads at runtime. [Which file holds what](wiki/stack/d1-pipeline.md#env-and-devvars-are-not-interchangeable).
- `.dev.vars.example` moves from the repo root to `app/.dev.vars.example`, beside `app/wrangler.jsonc`. `secrets:push` and `secrets:check` always read that folder, so the root copy was never read. **If your repo has a root `.dev.vars`, move it to `app/.dev.vars`** (beside your wrangler config) by hand, and move the example with it.
- A linked worktree works on its own branch copy of each live file. The new [`worktree-secrets.mjs`](.agents/skills/ship/scripts/worktree-secrets.mjs) `seed` copies the primary's files into a new worktree and records a baseline of key-name hashes in the worktree's Git directory. Wire it into your worktree tool's setup; this repo's `paseo.json` does. [The secrets convention](wiki/development/secrets.md#worktrees-and-branch-copies) owns the lifecycle.
- A branch writes an add or a rotation to both copies now, and keeps a deletion or a branch-only value in its own copy. [`/ship`](.agents/skills/ship/SKILL.md) runs `worktree-secrets.mjs promote` after the merge. It applies only what the branch changed, skips and names a key both sides changed, and prints key names, never values. Like the post-merge sync, it cannot fail a merged ship.
- The [secrets rule](.agents/rules/secrets.md) now loads for `.dev.vars*` too. It says which file holds what and how each kind of edit reaches the primary. `/save`'s named-secret step writes an add or a rotation to the seeded branch copy as well as the primary.
- `secrets:push` in a linked worktree that has no `app/.dev.vars` reads the primary checkout's copy, and says so. A local copy still wins, and the `.env` refusal is unchanged.
- [The agent knowledge center](wiki/agent-knowledge-center.md#what-each-surface-owns) lists path-scoped rules as a surface, and says to prefer a rule to a hook for an edit-time convention.

## 19.0.2 — Background capture works in don't-ask mode

- **Memory:** background capture no longer fails under `dontAsk`. Claude Code denied the 19.0.0 heredoc when a fact held characters such as `<`, `>`, `|`, or `$`. Each run now makes one temp folder outside the repo, grants writes to it alone (`Edit(...)` and `--add-dir`), and passes `--file <path>` to `memory.mjs`. The folder is deleted when the run ends. Codex gets the same folder as a writable root. Interactive sessions keep the stdin heredoc.
- **`/ship`** no longer prints a delete error when GitHub already deleted the branch at merge. It checks `git ls-remote --heads` first, and the report says "deleted at merge".
- This source repo's Dependabot ignores `@types/node` major versions, which follow `.nvmrc`. Not shipped to installs.

## 19.0.1 — Records from the old notes migration stay readable

- The memory-store spec states that records from an earlier notes migration stay readable: `migration:<slug>` sessions, facts with source `migration`, and `migration/<slug>.md` objects in R2. `memory.mjs source <fact-id>` prints the note text behind a migrated fact. A new test guards this, and a second test checks that no command imports `notes/`.
- The write-gate requirement no longer names the migration as a writer. No shipped behavior changes.

## 19.0.0 — A fresh start: safer edge cases, no legacy paths, an open-source surface

**Breaking.** Installs from before 19.0.0 are not supported. `/wong-sync` no longer migrates `notes/`, the `.claude/` folder layout, the CI secret, the generated `openspec-*` layer, the `.wong-framework.json` record, or the `components.stackPack`, `appScaffold`, and `ui` flags. Set such a repo up again in an empty folder with [`/wong-setup`](.agents/skills/wong-setup/SKILL.md).

- **Safer failure paths:**
  - `/ship` merges with `--match-head-commit` and deletes the branch only after the PR state is `MERGED`. It retargets stacked PRs to the real default branch.
  - The CI gate waits for the pushed commit's checks. `NONE` means that the repo has no workflow files. A failed `gh` call is `UNKNOWN`, and `UNKNOWN` never merges.
  - `/save`, `/continue`, and `/ship` check [shared preconditions](.agents/skills/save/references/preconditions.md) first. A dirty default branch goes to `/save`.
  - Setup creates the GitHub repository and `origin`.
- **Pack scripts read the wrangler config with one JSONC parser** in `scripts/lib-wrangler-config.mjs`. The production guard in `cf-deploy.sh` can no longer be passed by a `database_name` key or by a comment. A Worker with no D1 builds and deploys. The staging reset refuses the production database. TOML config is refused with a clear message. New pack file: `scripts/lib-cli.mjs`.
- **Memory:**
  - The session-start hook exits within its 5 s timeout when the store cannot be reached.
  - Background capture passes JSON on stdin, so it no longer fails in don't-ask mode.
  - `migrate` applies each migration once. The digest is capped at 40 lines and 6 KB, with open threads first, and it loads only on startup and resume.
- **Less to read:**
  - Each rule has one owner. The change-selection order has named rungs in [the evidence contract](.agents/skills/save/references/checkpoint-evidence.md#selection-rungs).
  - `/ship` and `/verify` are about half their size, and skill instructions are about 3,200 words shorter.
  - The vendored `agent-browser` skill no longer triggers on its own.
- **Open-source surface:**
  - Markdown links name the real `.agents/` paths, so they open on github.com, and the link checker fails on a link through a symlink.
  - The README states the problem first, and it has a layout table and correct requirements.
  - New files: `CODE_OF_CONDUCT.md`, `.github/CONTRIBUTING.md`, issue and PR templates, `CODEOWNERS`, `.gitattributes`, `.editorconfig`, and `.nvmrc` (Node 22).
  - Workflow actions are pinned by SHA and have job timeouts. Production deploys run in a `production` environment.
  - This source repo also gets Dependabot, which is not shipped to installs.
- Each release is now tagged `v<VERSION>` and published as a GitHub Release, starting with this one.

## Before 19.0.0

Entries for 18.1.0 and earlier are in git history: `git show 47385c9:CHANGELOG.md`. Installs from before 19.0.0 now update in place through [catching up an older install](.agents/skills/wong-sync/references/catch-up.md), which carries the moves those entries asked for.
