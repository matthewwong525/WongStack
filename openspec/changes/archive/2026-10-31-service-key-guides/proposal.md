# Proposal

**Status:** ready-to-ship
**Branch:** service-api-connection-guides
**Open questions:** none

## Why

Connecting a business tool to an AI agent starts with a key from that tool, and each tool hides it in a different place. Shopify, Meta, and Google are the hardest: a non-technical owner gets lost in developer screens and gives up. You want one public page per tool on wongstack.com. A person can follow it alone, or tell their agent *follow this page*, and finish with a working key that is kept safe.

## What Changes

- **wongstack.com gets a Guides section with 8 guides.** A *Guides* link in the top bar opens a list, one row per tool. The guides speak to anyone, with or without WongStack.
  ```picture
  Before: pictures/site-today.webp
  ```
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><b>WongStack</b><span class="grow"></span><span>GitHub</span><span>Install</span><b>Guides</b></div>
    <span class="sep"></span>
    <h3>Connect your tools</h3>
    <span class="muted">Get a key from each tool, so you or your AI agent can use it. Each guide takes 5 to 15 minutes.</span>
    <div class="card row gap"><b>Shopify</b><span class="grow muted">Orders, products, customers</span><span class="tag-outline">10 min</span></div>
    <div class="card row gap"><b>Shopify theme</b><span class="grow muted">Change your store's look</span><span class="tag-outline">10 min</span></div>
    <div class="card row gap"><b>Klaviyo</b><span class="grow muted">Emails and lists</span><span class="tag-outline">5 min</span></div>
    <div class="card row gap"><b>Meta ads</b><span class="grow muted">Facebook and Instagram ads</span><span class="tag-outline">15 min</span></div>
    <div class="card row gap"><b>Google</b><span class="grow muted">Gmail, Drive, Sheets, Calendar</span><span class="tag-outline">15 min</span></div>
    <div class="card row gap"><b>Canva</b><span class="grow muted">Designs and brand files</span><span class="tag-outline">10 min</span></div>
    <div class="card row gap"><b>Slack</b><span class="grow muted">Messages and channels</span><span class="tag-outline">5 min</span></div>
    <div class="card row gap"><b>Notion</b><span class="grow muted">Notes and docs</span><span class="tag-outline">5 min</span></div>
    <span class="tag">Keep your keys safe</span>
  </div>
  ```
- **Each guide has the same shape, with a real picture at every step.** It starts with what the key lets you do, how long it takes, and what you need first, such as an admin role. Each numbered step names the exact button and shows a picture of the screen, with the button marked. The guide asks only for the permissions the job needs, and suggests read-only first. It ends with the key names to save, a check that proves the key works, and what to do if the key leaks.
  ```screen
  <div class="card col gap phone">
    <span class="muted">Guides › Shopify</span>
    <h3>Connect Shopify</h3>
    <div class="row gap"><span class="tag-outline">10 min</span><span class="tag-outline">You need: store owner or staff with app rights</span></div>
    <div class="card col gap"><b>If you are an AI agent</b><span class="muted">Ask before you make anything. The person signs in. Never show the key in the chat. Save it to .env.</span></div>
    <b>3. Tap Create app</b>
    <div class="skeleton"></div>
    <span class="muted">Picture: the Apps screen, with Create app marked</span>
    <b>Save it</b>
    <span class="muted">SHOPIFY_STORE=your-store.myshopify.com</span>
    <span class="muted">SHOPIFY_ADMIN_TOKEN=…</span>
    <button class="btn-ghost">Copy the check</button>
  </div>
  ```
- **An agent can read every guide as plain text.** Each guide is a real page that a reader can follow with no script, plus a plain-text copy at the same address with `.md` on the end. One list file names every guide, so an agent told *go to wongstack.com/guides* finds the right one. An agent with browser control, such as Claude Code or Codex with a browser, can do the steps with the person watching.
  ```mermaid
  flowchart TD
    ask["connect Shopify"] --> read["agent reads guide"]
    read --> steps["person signs in"] --> env["key in .env"] --> check["check works"]
  ```
- **Each code box has a Copy button.** One tap copies the line to save or the check command, with nothing extra. If the browser refuses, the text is selected for you to copy by hand.
- **One page teaches how to keep keys safe, and every guide links it.** It says a key is like a password to your business. It goes in a file named `.env` that git ignores, never in a chat, an email, a screenshot, or a shared doc. Give each key the least it needs, keep a copy in a password manager, and replace it at once if it leaks.
- **The 8 guides:**
  | Guide | What you make |
  |-|-|
  | Shopify | An app for your own store, with its access token |
  | Shopify theme | A Theme Access password, so Shopify CLI can change your theme |
  | Klaviyo | A private API key |
  | Meta ads | A Meta app and a system user token for your ad account |
  | Google | A service account (Google Workspace) or a sign-in app (any Gmail) |
  | Canva | A Canva integration, with its sign-in step |
  | Slack | A Slack app made from a ready setup text, with its bot token |
  | Notion | An internal integration, shared with your pages |
- **I take the pictures with your saved logins, and stop before any key shows.** The screen that shows the key gets a drawn picture. Store names, emails, and IDs are blurred or come from a test account. Where a sign-in does not work from my browser, you get a shot list: the page to open, what to show, and where to stop. The guides go live without those pictures; each one appears when you send it.

Non-goals: no guides beyond these 8; no mention of WongStack inside a guide; no account or sign-in on the site; no change to how a WongStack install asks for a key.

## Capabilities

### New Capabilities

### Modified Capabilities
- `landing-site`: adds the guides: one shared shape per guide, a plain-text copy for agents, the keep-keys-safe page, and real pictures that show no key or private data. The site grows past two pages; old addresses still show the landing page, and every rule about hosting words, prices, and outside files now covers the guides too.

## Impact

- `site/`: new `guides/` Markdown sources and pictures, a build step that writes static guide pages, their `.md` copies and `llms.txt` into `dist/`, a *Guides* link in `SiteHeader.tsx`, and tests. No new runtime code: the site stays plain files.
- `wiki/maintaining/landing-page.md` and a new meta-only `wiki/maintaining/service-guides.md`: how to add or recheck a guide and the picture rules.
- Meta-only: nothing ships to an install, so no release entry.

## Decision log

- **2026-10-31** — Asked how the pictures are made → chose: the agent takes them with Matthew's saved logins and stops before any key shows; the key screen is drawn.
- **2026-10-31** — Asked where a guide puts the key → chose: the guides are for anyone, with or without WongStack, for a person alone or an agent with browser control; they never mention WongStack, and the key goes in `.env`.
- **2026-10-31** — Asked which services go first → chose the 8 named: Shopify, Shopify theme, Canva, Klaviyo, Meta ads, Google, Slack, Notion; later Matthew dropped the list of next services.
- **2026-10-31** — Assumed: guides are static HTML plus a `.md` copy and an `llms.txt`, because the site is a one-page React app and an agent that fetches a page gets an empty shell.
- **2026-10-31** — Assumed: Google is one guide with two paths, service account for Google Workspace and a sign-in app for a personal Gmail, because a service account can read Gmail only through a Workspace admin.
- **2026-10-31** — Assumed: Shopify theme changes use Shopify CLI with a Theme Access password, because that is Shopify's own way to change a theme without full admin access.
- **2026-10-31** — Assumed: taking setup-screen pictures needs no change to the key-page rule in `wiki/development/secrets.md`, because the agent never creates, shows, or copies a key; the meta-only guide page records the stop point.
- **2026-10-31** — Assumed: each guide shows a *Last checked* date and the wiki says how to recheck it, because these consoles change often and a stale step strands a reader.
- **2026-10-31** — Asked how to get the 17 pictures the saved logins could not reach (Shopify, Klaviyo, Meta, Canva) → chose: Matthew signs in through the live browser view, then the agent takes them.
- **2026-10-31** — Asked whether to keep the Notion pictures taken with Carol's saved login, her private pages cropped out → chose: keep them.
- **2026-10-31** — Asked how to finish the pictures after the Shopify and Klaviyo sign-ins failed from the VM → chose: publish the guides first, and Matthew takes the missing screenshots from a shot list with links, then the agent adds them.
- **2026-10-31** — Assumed: the guide rules join the existing `landing-site` spec, not a new `service-key-guides` spec, because the guides are pages of that site, and a new spec needs a shipped `areas.json` entry and a release for a meta-only change.
- **2026-10-31** — Asked for a copy button on each code box → added: one small site-served script adds *Copy* to each box; the page still reads in full without it, so an agent loses nothing.
- **2026-10-31** — Asked whether to publish with 16 screenshots still on the shot list → chose publish now; the screenshots and the real-key check of each guide (task 2.4) follow after publish.
- **2026-10-31** — Archived and saved for publish by /ship; the 16 shot-list screenshots and the real-key checks stay open after publish.
- **2026-10-31** — Merged main (the Attachments page) into the branch: the header now links Attachments, GitHub, Install and Guides, which fit on one line at phone width, and the spec and wiki keep both sides.
