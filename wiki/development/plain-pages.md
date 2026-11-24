# Plain pages and team links

A plain page is an HTML page that an agent makes for you, such as a chart, a small tool, or a report, and that asks for no answer. It goes to your inbox, and you can send the team a link to it. A link works for each page in your inbox, a [review page](../review-pages.md) too. Part of [development](README.md).

## A plain page

Ask for "an HTML page", "an artifact", or "a page I can share". The [`/page`](../../.agents/skills/page/SKILL.md) skill writes the page, checks it, and puts it in your inbox. It prints the page's link, and the team link when you ask for one.

- **Plain page or review page?** A page that needs your OK, a choice, or your notes is a [review page](../review-pages.md). A page that you only look at, or send to the team, is a plain page.
- **No bar.** A plain page has no OK, Note, or Send. It goes directly to *Artifacts*, marked *Page*, and stays there.
- **Its own script runs, sealed.** A chart that you can tap works. The page can't load from the web, call the app, or read your sign-in.
- **A link opens a new tab.** [`page.mjs`](../../.agents/skills/page/scripts/page.mjs) adds `<base target="_blank">` to the page, and the app adds it to an older plain page when it shows it. A page with its own `<base>` keeps it. A link to a part of the same page (`#…`) stays in the page.
- **The page can't leave its frame.** A page whose script loads a different address, such as `location.href = …` or a meta refresh, starts again and says *This page tried to leave the page.* After three tries, the frame closes and says *This page keeps trying to leave. Reload to try again.*
- **The data is in the page.** The page shows the data that the agent put in it, never live data. For new numbers, ask the agent to make it again.
- **The check refuses a web address.** `page.mjs` puts each style, script, picture, and font from the page's folder inside the page. A file named by a web address stops it, and the message names the address. A link (`<a href>`) to a different site is fine.
- **Size.** A file is 300 KB at most. A page over 800 KB gets a warning; a page over 1.5 MB stops.
- **Change it in place.** The agent runs `page.mjs` again with the page's `--id`. The page and its team link show the new version.
- **Not signed in?** `page.mjs` stops and says to run `node scripts/company-api.mjs login` ([company actions](../stack/company-api.md)).

## Share with team

1. Open the page from your inbox's *Open* or *Artifacts* list.
2. Tap **Share with team**. The page shows *Shared with the team*, **Copy link**, and **Stop sharing**, with the link below them.
3. Tap **Copy link**, then paste the link where your team reads it.

- **Who can open it** → each person who can open the Inbox, signed in as a person. A service token or a machine key gets nothing.
- **What they see** → the page's title, *Shared by* and your email's name, the date of the last change, and the page. A review page opens read-only: no buttons, no notes. Nothing that a teammate does gets to your chat.
- **Turn it off** → tap **Stop sharing**. The link says *This page is no longer shared* at once, and it never opens again. Share again for a new link.
- **Only you** can share or stop your page. The app refuses a request from a different person.
- ***Artifacts* says *Shared*** on each page with a link that is on.

## Why and edge cases

- **The link shows the newest version, not a copy.** The agent changes a page in place, and a teammate must not keep an old page. A copy also needs its own clean-up.
- **The frame, not a rule, stops a page that leaves.** No sandbox flag or CSP rule stops a frame from loading a different address into itself, so the app counts the frame's loads: a load after the first means the page left. A review page shown in the inbox keeps its own load handling, because its answer channel is tied to its version.
- **The seal holds in its own tab too.** The page comes from its own address with a `Content-Security-Policy: sandbox` header, so it runs with no origin and `connect-src 'none'`. The frame's address, opened alone, gives it no more access.
- **The teammate's view is in the Inbox app.** WongStack gives access app by app, so "can open the Inbox" is the team. A separate app needs one more grant, and then a teammate with the Inbox still can't open the link.
- **The name is your email's name.** The access list keeps emails, not names, so *Shared by* shows the part before the `@`.
- **A plain page is a review page with a `plain` flag, not a new kind.** A new kind needs a rebuild of the inbox's table; a column only adds. A link is a row in `inbox_shares`, found by a random token.
- **No team list of shared pages yet.** The ask was a link to send.
- Code: [`share.ts`](../../app/worker/apps/inbox/share.ts) (share, stop, both frames, and the teammate's read), [`sealed.ts`](../../app/worker/apps/inbox/sealed.ts) (the sealed answer), [`SharedView.tsx`](../../app/src/apps/inbox/SharedView.tsx) at `/apps/inbox/?shared=<token>`.
