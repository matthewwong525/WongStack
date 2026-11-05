# Connect your tools when the assistant runs on a server

**Status:** in-progress
**Branch:** pretty-frog
**Open questions:** none

## Why

When your assistant runs on a server, your Chrome is on another computer, so the assistant can not make your keys there. Today every tool then goes to the key link, and you make each key by hand. The assistant's own browser on the server can make the keys instead, while you watch it work, sign in yourself when a tool asks, and stop it at any time.

## What Changes

- **On a server, the assistant makes your keys in its own browser, with no question first.** You say *connect my Notion*, and the assistant sends one link to watch. It starts when you open the link, or at once if you say *go*. You do no key-link steps. It does not ask you to switch on a Chrome setting that can not help from a server. The key link is only the last way, for a tool the browser can not get through. On your own computer, the assistant still offers your Chrome first. When your Chrome does not connect, it goes on in its own browser, with no second question.
  ```text
  You: connect my Notion
  Assistant: Watch me make your Notion key:
  https://…trycloudflare.com/…
  I start when you open it, or say go.
  ...
  ✓ Notion   key saved, ends in …91c0
  ```
  ```mermaid
  flowchart TD
    start[connect my Notion] --> where{"where is the assistant?"}
    where -->|a server| watch[one link to watch]
    watch --> make[its own browser makes the key]
    where -->|your computer| chrome["use your Chrome?"]
    chrome -->|Chrome connects| mine[your Chrome makes the key]
    chrome -->|Chrome does not connect| watch
    chrome -->|key link| link[key link]
    make -->|"a passkey, or turned away"| link
    make --> saved[key saved, unseen in the chat]
    mine --> saved
    link --> saved
  ```

- **You watch the assistant click through each tool, and you can take over or stop at any time.** The link shows the assistant's browser live, with one line that says what it is doing. While it works, your taps do nothing, so you can not knock it off course by mistake. *Take over* pauses it at once and gives you the browser; *Hand back* lets it go on from where you left the page. *Stop* ends the connecting: keys already made stay saved, and the rest wait. You can also say *stop* in the chat. This is not the link you got before for a stuck step, where you did the work yourself: here the assistant does the work, one link covers the whole run, and you only act to sign in, or when you choose to.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><span class="tag">Assistant working</span><span class="grow muted">notion.so</span></div>
    <div class="skeleton">Notion: My integrations</div>
    <div class="muted">Making a Notion key that only reads…</div>
    <div class="row gap"><button class="btn-ghost">Stop</button><span class="grow"/><button class="btn-primary">Take over</button></div>
  </div>
  ```
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><span class="tag-outline">You have the browser</span><span class="grow muted">notion.so</span></div>
    <div class="skeleton">Notion: My integrations</div>
    <div class="muted">The assistant waits. Tap the browser to use it.</div>
    <div class="row gap"><button class="btn-ghost">Stop</button><span class="grow"/><button class="btn-primary">Hand back</button></div>
  </div>
  ```

- **When you are signed out of a tool, the same link turns to you.** The line says *Your turn: sign in to Notion*, and your taps and typing go to the browser. You sign in with your own password and code, from your phone or laptop. Once you are in, the assistant goes on by itself. You get no question before your turn: your request to connect is enough. The assistant never types, saves, or asks for a password or a code.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><span class="tag-outline">Your turn</span><span class="grow muted">notion.so/login</span></div>
    <div class="skeleton">Notion: Log in</div>
    <div class="field">Type here, and it types in the browser</div>
    <div class="muted">Sign in to Notion. I go on once you're in.</div>
    <div class="row gap"><button class="btn-ghost">Stop</button><span class="grow"/></div>
  </div>
  ```

- **You can paste into any live view.** Today a paste works only in the box under the browser; a paste on the browser itself does nothing. After this, a paste anywhere on the view types into the box you tapped in the browser. You can copy a password from your own password manager and paste it in. Nothing you paste is saved. This works in the watch link and in every other live view.

- **The same safety rules hold as in your Chrome.** The assistant works only on its own page for connecting. Its own reading of a page hides each key, and it takes no picture while a key shows. You see the key on the watch screen, as you would in your own browser; the link is private and closes at the end. Each key goes straight to your live app, and the chat shows only its last four characters. It never changes Access.

- **Your sign-ins stay in the assistant's browser.** It is the same browser your errands use, so a tool you signed in to for an errand needs no sign-in, and a sign-in you make while connecting helps later errands too. A tool that asks for a passkey, or that turns your sign-in away, goes to the key link at the end.
  ```text
  Your tools
    ✓ Stripe   works: 3 charges today
    ✓ Notion   works: 12 pages
    … Figma    waiting for your key: it wants
               a passkey, so use the key link
  ```

**Non-goals:** a tunnel from the server to your own Chrome; a second browser kept only for keys; the assistant typing a saved password on a key page; tools that offer only a sign-in that renews, such as Gmail. On a Mac the assistant's browser can not show a live view, so a Mac with no Chrome to connect keeps the key link. While a run is watched, another chat's live view waits, since the computer shows one at a time.

## What the build needs

- **The assistant's browser on this server**: Ready, Camoufox 158 is installed and running.
- **The live view's tools on this server**: Ready, none missing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `own-browser-connect`: on a server, or when the person's Chrome does not connect, the assistant makes keys in its own browser by default, while the person watches through one link and can take over or stop; the person signs in there on their turn; the same key rules hold; the key link is the last fallback.
- `browser-logins`: the token-website exception covers the assistant's own browser while connecting; a paste anywhere on a live view types into the browser; watching the assistant connect, with take over, and a sign-in while connecting are exceptions to *no live view for other steps*.

## Impact

- `.agents/skills/connect/scripts/chrome.mjs` becomes `.agents/skills/connect/scripts/browser.mjs`, with a Chrome backend (`agent-browser --auto-connect`, as today) and a Camoufox backend (`browse.mjs`'s `client()`, its own session), a `where` command, a `sign-in` command, and a check before each command that the person has not taken over or stopped. `scripts/retired-names.json` retires `chrome.mjs`.
- `.agents/skills/hand-over/scripts/view-page.mjs` (a paste on the view types into the browser, for every live view).
- `.agents/skills/hand-over/scripts/hand-over.mjs` (a new `open --watch` mode, `turn`, `line`, and `wait` results `opened`, `taken-over`, `handed-back`, `stopped`), `helper.mjs` (the take over, hand back and stop routes), `view-page.mjs` and `view-page.html` (the watch states), with tests in `hand-over.test.mjs` and `view-page.test.mjs`.
- `scripts/tests/connect-chrome.test.mjs` becomes `connect-browser.test.mjs`.
- `.agents/skills/connect/SKILL.md`, `wiki/stack/connect-your-tools.md`, `wiki/development/live-view.md`, `wiki/development/browsing.md`, `wiki/development/secrets.md#api-token-website-steps`, `AGENTS.md` (*API keys/tokens* rule).
- `CHANGELOG.md` (minor).
- No app, Worker, or D1 change.

## Decision log

- **2026-11-05** — Asked which Camoufox makes the keys on a server → chose the everyday one errands use, on its own page, because a tool already signed in needs no sign-in and the live view works with it as it is.
- **2026-11-05** — Asked whether to use Camoufox on the server or a bridge to the person's own Chrome → Matthew chose Camoufox as the main way, with its local proxy as it is, and no bridge: *"I think we just try camoufox and basically assume the proxy and go and do it, probably better in the long run."* A bridge needs a program on each person's computer, does not work from a phone, and lets the server drive every tab in that Chrome.
- **2026-11-05** — Assumed: the assistant is on a server when it runs on Linux with no screen of its own (no `DISPLAY` or `WAYLAND_DISPLAY`), because the WongOS host has neither and a desktop Linux, a Mac, or Windows has Chrome beside it.
- **2026-11-05** — Assumed: on the person's own computer, the assistant's browser is used only after Chrome does not connect, because the person's Chrome is already signed in and needs no sign-in link.
- **2026-11-05** — Asked, through the first chat, what *connect my Notion* should do on a server → chose the assistant's own browser by default, with no question first and no key-link steps; Matthew signs in himself through the live view only when the site asks, and the key link is the last fallback.
- **2026-11-05** — Assumed: the request to connect covers every sign-in link in that run, with no *Ready?* before each, because the person is in the chat and a sign-in page does not go stale like a robot puzzle.
- **2026-11-05** — Assumed: on the person's own computer, a Chrome that does not connect also goes on in the assistant's browser with no second question, and a person who picks the key link at the Chrome question gets it, by the same last-fallback rule.
- **2026-11-05** — Assumed: installing the browser or the live view's tools, the first time, still asks once, because each install needs the person's yes for its disk and admin rights.
- **2026-11-05** — Assumed: the assistant uses no saved login on a key page, even when one matches, because Matthew wants the person to sign in themselves and the assistant to type no password.
- **2026-11-05** — Assumed: one helper with two backends replaces `chrome.mjs`, renamed `browser.mjs`, because the own-page rule, key hiding and `take-key` must stay one copy for both browsers.
- **2026-11-05** — Assumed: `take-key` reads a key's value through `browse.mjs`'s `client()` in its own process, because `browse.mjs get value` prints `[hidden]` for a box named like a secret.
- **2026-11-05** — Check: `scripts/tests/connect-chrome.test.mjs` is renamed `connect-browser.test.mjs` with every test kept, because the helper it tests is renamed `browser.mjs`.
- **2026-11-05** — Assumed: `done` closes only the helper's page and keeps the sign-ins, because the person chose the everyday browser so later errands stay signed in.
- **2026-11-05** — Assumed: a sign-in turn that ends `closed` or `timeout`, a passkey, or a site that turns the sign-in away sends that tool to the one key link at the end, by the live view's one-view-per-site rule.
- **2026-11-05** — Asked, through the first chat, whether the person should see the assistant click around and be able to interrupt → Matthew chose yes, as part of the default and not only for sign-in: *"maybe they should see it click around? And be able to interrupt."* This is newer than his 2026-10-05 note that a live browser link is a bad experience, and wins for connecting; the watch link differs because the assistant does the work and the person only watches, signs in, or chooses to take over.
- **2026-11-05** — Assumed: the run starts when the person opens the watch link, or at once when they say *go*, because the point is to see it work, and a person who does not want to watch should not wait.
- **2026-11-05** — Assumed: the person's taps do nothing while the assistant works, and *Take over* gives them the browser, because two hands on one page would knock both off course.
- **2026-11-05** — Assumed: the sign-in turn happens in the same watch link, not a second link, so a run has one link from start to end.
- **2026-11-05** — Assumed: the watch screen shows a new key as the page shows it, and only the assistant's own reading hides it, because the key is the person's and the link is private, as when they make a key in their own browser.
- **2026-11-05** — Assumed: *Stop* keeps keys already made and leaves the other tools waiting, because removing a saved key can not be undone from the watch screen and the person can remove one later.
- **2026-11-05** — Asked whether to add a paste fix to this plan, after pasting a password failed in the live view → chose to add it, for every live view, not only the watch link.
- **2026-11-05** — Asked, while thinking aloud, whether to copy the person's Chrome cookies into Camoufox and use one browser for everything → not planned, on the recommendation that getting the cookies off another computer needs a program there, Google ties its sign-in to the device, sites sign out or lock a session that jumps browsers, and Camoufox, a Firefox, can not pass as Chrome; one sign-in per tool in the watch link lasts instead.
- **2026-11-05** — Assumed: the watch link's `take`, `give` and `stop` routes live with the live view's routes in `view.mjs`, served by the link's own page server, because `helper.mjs` is the live-line service and not the link's server.
- **2026-11-05** — Assumed: who holds the browser is kept in three files with one writer each (`control.json` by the link's watcher, `turn.json` and `line.json` by the agent's commands), not in the link's state file, so neither side overwrites the other's change.
- **2026-11-05** — Assumed: `wait` prints each watch change once and returns, and two changes between two runs print only the newest, because the agent acts on who holds the browser now.
- **2026-11-05** — Assumed: in Camoufox, `read` finds a key page by its address and headings, with no page title, because `client()` reads no title and the key pages tested name keys in their address or headings.
- **2026-11-05** — Assumed: `attach --server` checks only that Camoufox is installed, and the browser starts at the first `open`, so an attach leaves no idle page for the browser to close.
- **2026-11-05** — Assumed: Ctrl+V or Cmd+V on the view's screen is kept from the viewer, and the keys it held are let go in the browser before the paste types, because noVNC sends the chord to the remote browser, whose clipboard is empty.
- **2026-11-05** — Assumed: a sign-in turn ends only when the address is the key page's own path (with any query, never a wider `**`) and no email, password or one-time-code box shows, and a turn whose finish already holds is refused, because the second look found that an email-first page or a site-root address ended the turn before the person signed in; *Hand back* still ends a turn the finish misses.
- **2026-11-05** — Saved for the live test: every task but 5.2 is built and checked locally; a second look found four problems (an early sign-in finish, a stale state on attach, a paste in the type box, a lost *with their yes*), all fixed and reread clean. Task 5.2, Matthew's *connect my Notion* through the watch link, comes next.
