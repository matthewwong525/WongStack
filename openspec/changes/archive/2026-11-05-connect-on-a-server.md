<!-- openspec-archive v1 2026-11-05-connect-on-a-server -->
<!-- file proposal.md utf8 17637 -->
# Connect your tools when the assistant runs on a server

**Status:** ready-to-ship
**Branch:** pretty-frog
**Open questions:** none

## Why

When your assistant runs on a server, your Chrome is on another computer, so the assistant can not make your keys there. Today every tool then goes to the key link, and you make each key by hand. The assistant's own browser on the server can make the keys instead. It works at once and reports in the chat; you get a link only when a tool asks you to sign in.

## What Changes

- **On a server, the assistant makes your keys in its own browser, with no question first.** You say *connect my Notion*, and the assistant starts at once. You do no key-link steps, and you get no link unless a tool asks you to sign in, or you ask to watch. It does not ask you to switch on a Chrome setting that can not help from a server. The key link is only the last way, for a tool the browser can not get through. On your own computer, the assistant still offers your Chrome first. When your Chrome does not connect, it goes on in its own browser, with no second question.
  ```text
  You: connect my Notion
  Assistant: Making your Notion key in my
  browser. You're already signed in.
  ✓ Notion   key saved, ends in …91c0
  ```
  ```mermaid
  flowchart TD
    start[connect my Notion] --> where{"where is the assistant?"}
    where -->|a server| make[its browser makes it]
    make -->|signed out| turn[you sign in]
    turn --> make
    where -->|your computer| chrome["use your Chrome?"]
    chrome -->|Chrome connects| mine[your Chrome makes it]
    chrome -->|Chrome does not connect| make
    chrome -->|key link| link[key link]
    make -->|"a passkey, or turned away"| link
    make --> saved[key saved, unseen]
    mine --> saved
    link --> saved
  ```

- **When a link is open, you can take over or stop at any time.** The link shows the assistant's browser live, under one short line that says what to do now. You get it for a sign-in, or when you ask to watch. While the assistant works, your taps do nothing, so you can not knock it off course by mistake. *Take over* pauses it at once and gives you the browser; *Hand back* lets it go on from where you left the page. The assistant sees nothing you do until you hand back. *Stop* ends the connecting: keys already made stay saved, and the rest wait. You can also say *stop* in the chat.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><span class="grow muted">Tap Hand back when you're done.</span></div>
    <div class="skeleton">Notion: My integrations</div>
    <div class="row gap"><button class="btn-ghost">Stop</button><span class="grow"/><button class="btn-primary">Hand back</button></div>
  </div>
  ```

- **When you are signed out of a tool, the assistant sends you a link to sign in.** The line says *Sign in to Notion. I go on once you're in.*, and your taps and typing go to the browser. You sign in with your own password and code, from your phone or laptop. Once you are in, the assistant goes on by itself. You get no question before your turn: your request to connect is enough. The assistant never types, saves, or asks for a password or a code.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><span class="grow muted">Sign in to Notion. I go on once you're in.</span></div>
    <div class="skeleton">Notion: Log in</div>
    <div class="field">Type here, and it types in the browser</div>
    <div class="row gap"><button class="btn-ghost">Stop</button><span class="grow"/></div>
  </div>
  ```

- **You can paste into any live view.** Today a paste works only in the box under the browser; a paste on the browser itself does nothing. After this, a paste anywhere on the view types into the box you tapped in the browser. You can copy a password from your own password manager and paste it in. Nothing you paste is saved. This works in the sign-in link and in every other live view.

- **The same safety rules hold as in your Chrome.** The assistant works only on its own page for connecting. Its own reading of a page hides each key, and it takes no picture while a key shows. When a link is open, you see the key there, as you would in your own browser; the link is private and closes at the end. Each key goes straight to your live app, and the chat shows only its last four characters. It never changes Access.

- **Your sign-ins stay in the assistant's browser.** It is the same browser your errands use, so a tool you signed in to for an errand needs no sign-in, and a sign-in you make while connecting helps later errands too. A tool that asks for a passkey, or that turns your sign-in away, goes to the key link at the end.
  ```text
  Your tools
    ✓ Stripe   works: 3 charges today
    ✓ Notion   works: 12 pages
    … Figma    waiting for your key: it wants
               a passkey, so use the key link
  ```

**Non-goals:** a tunnel from the server to your own Chrome; a second browser kept only for keys; the assistant typing a saved password on a key page; tools that offer only a sign-in that renews, such as Gmail. On a Mac the assistant's browser can not show a live view, so a Mac with no Chrome to connect keeps the key link. While a link is open, another chat's live view waits, since the computer shows one at a time.

## What the build needs

- **The assistant's browser on this server**: Ready, Camoufox 158 is installed and running.
- **The live view's tools on this server**: Ready, none missing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `own-browser-connect`: on a server, or when the person's Chrome does not connect, the assistant makes keys in its own browser by default, with no link unless a sign-in needs one or the person asks to watch; in an open link the person can take over or stop, and signs in there on their turn; the same key rules hold; the key link is the last fallback.
- `browser-logins`: the token-website exception covers the assistant's own browser while connecting; a paste anywhere on a live view types into the browser; a sign-in while connecting, and watching when the person asks, with take over, are exceptions to *no live view for other steps*.

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
- **2026-11-05** — Asked, in the live test, how the run should feel → Matthew: *"I actually don't need to watch you click around i think that's kind of useless i just need you to successfully connect notion the fastest way possible"*. Newer than his earlier choice to watch by default, so it wins: the assistant starts at once with no link; a link opens only for a sign-in, or when the person asks to watch. Take over, Hand back and Stop stay, as he found them working and secure: *"we can enter payment info and the bot wont see it until we handback"*.
- **2026-11-05** — Asked what the top of the view shows, now that the link opens mostly for the person → chose one short line saying what to do now, such as *Sign in to Stripe. I go on once you're in.*, with no *Assistant working* or *Your turn* tag.
- **2026-11-05** — Assumed: `sign-in` opens the link itself when none is open, because the link now opens only for a turn, and one command keeps the skill short.
- **2026-11-05** — Found in the live Notion run, and fixed: `take-key` refused because Notion's connection page shows a long name in a box and a connection id that also read as keys; with several, it now takes the one that starts like a known key (`ntn_`). `take-key` also could not save to the live app because it did not load the primary `.env` Cloudflare login for `wrangler`; it now does. A `connect-browser.test.mjs` case covers both.
- **2026-11-05** — Live result of task 5.2: Notion was already signed in, so no link was needed; a read-only connection was made, `take-key` saved `TOOL_NOTION` (only `…83bj` shown), `tool add notion` with a fixed `Notion-Version` header succeeded, and `POST search` answered 200 with no pages, as Matthew chose to share none yet. Stripe: his sign-in through the link worked (`opened`, then `signed-in`), and Take over and Hand back worked, but his role has no API key access on that account, so he stopped Stripe.
- **2026-11-05** — Assumed: removing the card, code and password forms in favour of the live view is its own change, planned in workspace *The live view is the one place for sensitive input*, because it could ship alone; this change keeps the key link as the last fallback.
- **2026-11-05** — Assumed: the view drops the site's address with the tag, as the plan's sketches show only the one line, and the app's inbox names the link *Connect your tools*, not *Watch the assistant connect your tools*, because the link now opens mostly for a sign-in.
- **2026-11-05** — Archived for ship as 49.1.0: tasks 6.1–6.3 built, a second look found a publishable Stripe key could be taken and a lost `HANDOVER_NEEDS` line, both fixed and reread clean; merged with main's 49.0.0 (CHANGELOG and retired names joined).

<!-- end proposal.md -->
<!-- file design.md utf8 15478 -->
# Design

## Context

See proposal.md for why. 48.4.0 connects tools through [`connect/scripts/chrome.mjs`](../../../.agents/skills/connect/scripts/chrome.mjs), a wrapper over `agent-browser --auto-connect` that keeps a state file of the tab ids it opened, hides keys with [`mask-keys.mjs`](../../../.agents/skills/connect/scripts/mask-keys.mjs), and moves a key with `take-key` (primary `app/.dev.vars`, then `cf-secrets.mjs put-tool` on stdin). Tested 2026-11-05 on the WongOS host (`wongos-16gb`, Linux, no `DISPLAY`): `attach` prints `CHROME=none`, so every tool takes the key link.

The same host already runs the pieces a server path needs:

- **Camoufox**, the everyday browser, driven by [`browse.mjs`](../../../.agents/skills/browser/scripts/browse.mjs) through a local server. Each task gets its own page by `--session`; `client(session)` is exported and is what `hand-over.mjs` uses. Its profile is `~/.wong-stack/camoufox/profile`, not `~/.wong-stack/browser-profile` (agent-browser's Chromium profile, which this change never touches). `browse.mjs status`: installed, running.
- **The live view**, [`hand-over.mjs open --view --session <name> <finish> --note <line>`](../../../wiki/development/live-view.md), which shows one session's page through a Cloudflare tunnel and ends when every finish holds (`--until` glob, `--until-gone` selector, `--until-text`). `checkView()` reports no missing tool here.

`browse.mjs snapshot` already hides password, card and code boxes as `[hidden]`, and `browse.mjs get value` returns `[hidden]` for any box named like a secret, so `take-key` can not use the CLI to read a key.

## Goals / Non-Goals

**Goals:** one connect helper for both browsers, with one copy of the own-page rule, key hiding and `take-key`; no Chrome question where Chrome can not be here; a signed-out tool costs the person one link and their own sign-in.

**Non-Goals:** a bridge to the person's Chrome; a second Camoufox profile; using saved logins on key pages; changing the live view itself.

## Decisions

### 1. One helper, two backends: `connect/scripts/browser.mjs`

`chrome.mjs` is renamed `browser.mjs` (retired in `scripts/retired-names.json`). Its commands stay; each runs on a backend picked at attach and kept in the state file (`{ backend, own }`):

| | `chrome` (today) | `camoufox` (new) |
|---|---|---|
| attach | `agent-browser --auto-connect` | `client(connect-<hash>)`, starts the server if stopped |
| own page | tab ids it opened | the session's one page (the session is its own) |
| read | `snapshot` + `get title` | `client.snapshot()` + title |
| click / fill / select / wait | `agent-browser` by ref | `client` by ref (`fill` = `type`) |
| a key's value | `get value` / `get text` | `client` field read in-process, no `[hidden]` |
| picture | `screenshot` | `client.screenshot()` to the temp folder |
| done | close own tabs, detach | close the session's page; Camoufox and its sign-ins stay |

The backend exposes `snapshot()`, `title()`, `url()`, `act(kind, ref, value)`, `valueAt(ref)`, `picture(path)`, `close()`. Everything above it (`ownTab`, `reading`/`maskKeys`, `fill`'s password-box refusal, `onlyKey`, `takeKey`, `setVar`, `secretName`) is shared and unchanged. `take-key` keeps its output: `TOOL_<ID> saved, ends in …abcd`.

The Camoufox session name is `connect-<sha256(primary root)[0..10]>`, the same rule as today, so it never clashes with an errand's folder-named session. If `browse.mjs` reports `BROWSE_NEEDS=install`, `attach` prints it and the skill asks once by the existing install rule.

A raw value read needs a `client` method that returns a field's value with no secret check. It is added to `browse.mjs`'s `client()` as `valueOf(target)` and is not reachable from the `browse.mjs` CLI, so an errand still prints `[hidden]`.

*Alternative:* a second script `camoufox.mjs` beside `chrome.mjs`. Rejected: two copies of the own-page rule and `take-key` drift apart.

**Checked on this host, 2026-11-05** (task 1.1), in a `connect-check` session on a local page:

- A text box named *Secret key* is not a secret to `browse.mjs`: `snapshot` and `get value` both show the key. Only `maskKeys()` hides it (`textbox "Secret key" [e1]: [key …91c0]`). So every `read` passes the mask, as in Chrome.
- The same key in a password box reads `[hidden]` in `snapshot` and in `get value`, by ref or selector. `valueOf` reads the raw snapshot, so it returns the key in both boxes.

**The sign-in finish, checked** (task 1.2): `hand-over.mjs open --view --session connect-check --until "http://127.0.0.1:8765/key**" --until-gone "input[type=password]" --note "Sign in to Test."` on a local sign-in page, then a code page, then the key page. The code page did not end it; the key page ended it `done`. `browse.mjs type` and `click` on that session acted while the view was open. After `browse.mjs close --session connect-check`, `browse.mjs status` showed the browser running, with other chats' pages still open.

### 2. `where`: know the place before asking

`browser.mjs where` connects to nothing and prints one line:

- `WHERE=chrome` — macOS, Windows, or Linux with `DISPLAY` or `WAYLAND_DISPLAY`: the person's Chrome may be here. The skill asks the 48.4.0 Chrome question.
- `WHERE=server` — Linux with neither, and `checkView()` is not `unsupported`: the skill asks nothing and runs `attach --server`; the person's request to connect is the go-ahead.
- `WHERE=link` — anything else (no screen to show): the key link, as today.

`attach` with no flag tries Chrome; on `CHROME=none` it now also prints `SERVER=possible` when `checkView()` allows a view, and the skill goes on with `attach --server`, with no second question. The key link is the last fallback: `WHERE=link`, a person who picks it at the Chrome question, or a tool the browser can not get through. `attach --server` attaches Camoufox and prints `BROWSER=camoufox`.

*Alternative:* always try Chrome first, as today. Rejected: on a server it asks the person to switch on a Chrome setting on another computer, which can never connect (the 2026-11-05 test).

### 3. The watch link: a live view only when the person is needed

A new `hand-over.mjs open --watch --session connect-<hash> --note <line>` mode opens a live view that the agent drives. It holds the computer's one live view, the same tunnel, secret and 8-hour limit as `--view`, and the same page ([`view-page.html`](../../../.agents/skills/hand-over/scripts/view-page.html)) with a control state kept in the link's state file:

| `control` | The page shows | Taps reach the browser | `browser.mjs` commands |
|---|---|---|---|
| `assistant` (only when the person asked to watch) | the agent's line, *Stop*, *Take over* | no (noVNC `viewOnly`) | run |
| `person` (take over) | *Tap Hand back when you're done.*, *Stop*, *Hand back* | yes | refused: `CONNECT_PAUSED=taken-over` |
| `turn` (sign-in) | *Sign in to <tool>. I go on once you're in.*, the type box, *Stop* | yes | refused: `CONNECT_PAUSED=your-turn` |
| `stopped` | *Stopped. Go back to the chat.* | no | refused: `CONNECT_STOPPED` |

- **Start.** The agent starts at once, with no link. `browser.mjs watch` (Camoufox only) opens the link only when the person asks to watch; it runs `open --watch` and prints `HANDOVER_LINK`, and the agent goes on without waiting for `opened`. `sign-in` opens the link itself when none is open (Decision log, 2026-11-05: Matthew found watching *"kind of useless"*).
- **The line.** Each `browser.mjs` command sets the line before it acts (`hand-over.mjs line <text>`, through the helper's state file): *Opening notion.so…*, *Clicking New integration…*, *Making a key that only reads…*, *Key saved, ends in …91c0*. A clicked part's name comes from the snapshot after `maskKeys()`, so the line never holds a key.
- **Take over / Hand back / Stop.** The page posts to new helper routes (`take`, `give`, `stop`), which set `control`. `take` and `stop` also wake the chat ([`lib/wake.mjs`](../../../.agents/skills/hand-over/scripts/lib/wake.mjs)) so an idle agent hears it. Every `browser.mjs` command reads `control` first, so a take over between two commands stops the next one. On `CONNECT_PAUSED=taken-over` the agent runs `wait` in the background (`handed-back` or `stopped`) and ends its turn; on `handed-back` it reads the page afresh. A chat *stop* runs `browser.mjs done --stopped`.
- **Sign-in turn.** `browser.mjs sign-in --tool <title>` checks the page is its own and shows a sign-in, then starts a turn as `hand-over.mjs turn` does, with `--until` the key page's own path, exact or with any query (`"<origin><path>"` or `"<origin><path>?**"`, never a wider `**`), `--until-gone "input[type=password], input[type=email], input[autocomplete~=username], input[autocomplete~=one-time-code]"`, and `--note "Sign in to <title>. I go on once you're in."`. Both finishes must hold, so an email-first step at the key page's own address, a key page at a site's root (`https://www.notion.so/` does not match `/login`), or a code page after the password does not end the turn. A turn whose finish already holds is refused, as a view's is, since it would end before the person signs in. When they hold, `control` goes back to `assistant` and `wait` returns `signed-in`. The agent's turn-ending message carries the link it printed. A site that lands on its dashboard meets no finish: the person taps *Hand back*, which ends the turn too, and the helper's next `open` of the key page and `read` decide: signed in → make the key; a sign-in, a passkey prompt, or a refusal → the key link at the end.
- **End.** `browser.mjs done` closes the helper's page and the watch; the page says *All done. Go back to the chat.*

The request to connect covers every turn; the skill asks no *Ready?*. A first-time install of Camoufox or the live view's tools still asks once, by their own rules. `HANDOVER_NEEDS=live-view` and the one-view refusal pass through `watch` unchanged; with another chat's view open, the run waits for it, or takes the key link if the person says so.

*Alternative:* a separate `--view` link for each sign-in, and no watching. Rejected: Matthew asked to see it click around and to interrupt it, and one link per run is less to open.
*Alternative:* turn the person's taps into a take over on their own. Rejected: a stray tap while scrolling on a phone would pause the run.

### 4. Paste on the view

noVNC sends keys, not the clipboard, so a paste on the canvas is lost. `view-page.mjs` listens for `paste` on the whole view while the person may type, reads `clipboardData.getData('text/plain')`, and sends it through the same `strokes('', text)` → keysym path the type box uses. A break in the text becomes Enter only in the type box's rules; a pasted password has none. It applies to every live view, with no flag. Nothing is posted to the helper; the keys go straight down the view's socket, as typing does.

*Alternative:* the VNC clipboard (`clientCutText`) and a paste in the remote browser. Rejected: it needs the server's clipboard tool and the person to press paste a second time inside the remote browser.

### 5. Rule text

- `AGENTS.md` *API keys/tokens*: while connecting, the assistant's own browser on a server, watched through one link, or the person's Chrome; human steps on the key link last. Same length budget.
- `wiki/development/browsing.md` and `secrets.md#api-token-website-steps`: the exception names both browsers once and links `connect-your-tools.md`.
- `wiki/development/live-view.md`: *When it opens* gains *watching the assistant connect your tools*, and a short *The watch link* section owns its states, buttons and the `open --watch`, `turn`, `line` commands; *Hands off while it's open* says the watch is the one view the agent drives. One view per site applies to a sign-in turn.
- `wiki/stack/connect-your-tools.md`: the flow drawing, the server default with no question, and a section *Use the assistant's browser* with the `where` → `attach --server` → `watch` → `open` → `sign-in` → `take-key` → `done` steps, and what to do on each `CONNECT_PAUSED` and `CONNECT_STOPPED`. The Chrome section keeps its steps with `browser.mjs`.
- `connect/SKILL.md`: on a server, its own browser with no question; your Chrome only after a yes; both only through `scripts/browser.mjs`; the key link last. `measure-context.mjs --check` holds the total.

## UX

**Brief.** An owner, or someone setting up their company's assistant, says *connect my Notion* in a chat whose assistant runs on a server. The job: a working Notion key in the live app. Done looks like *✓ Notion key saved, ends in …91c0* in the chat, and one look-up. They watch on a phone or a laptop, often the same device as the chat. The common case is one to five tools, mostly signed out on a fresh server; the edge cases are a passkey, a site that refuses the browser, and taking over to fix a step. Assumed: a run is a few minutes, once per tool, rarely repeated. The closest screen is the live view's page, kept open ([`view-page.html`](../../../.agents/skills/hand-over/scripts/view-page.html)); the watch mirrors it.

**Flow.** Chat request → open the link (or say *go*) → watch → maybe your turn to sign in → watch → *All done*. Three taps at most for a signed-out tool: open, sign in, nothing else.

**Hierarchy.** One primary action per state: *Take over* while the assistant works, *Hand back* while you have it, none on your turn (signing in is the action). *Stop* is a quiet button in every working state.

**Parts.** The live view's browser area and its type box, which, with the view itself, takes a paste; one short line at the top saying what to do now, with no tag for who has the browser; two buttons. No new part.

### Review

The plan's [review page](review.html) sketches two states, phone-first, under *When a link is open, you can take over or stop* (you have the browser) and *When you are signed out of a tool* (sign in).

## Risks / Trade-offs

- [A site refuses Camoufox, or asks for a passkey] → one sign-in turn per site, then the key link for that tool; the run goes on.
- [The turn's finish never holds because the site lands elsewhere] → *Hand back* ends the turn; the re-read decides.
- [The watch screen shows a new key] → it is the person's own key, on a private link that closes at the end; the agent's reading and pictures still hide it.
- [A take over arrives while a command is running] → that one command finishes; the next is refused. Each command is one click or one read, so nothing half-done is left but a page the person now holds.
- [The watch holds the computer's one live view for the run] → another chat's view waits, and says which chat holds it; a run is minutes.
- [An errand's page and the connect page share one screen] → the live view already raises its page and resizes it each minute.
- [Matthew called a live browser link a bad experience on 2026-10-05, and watching useless on 2026-11-05] → a link opens only for a sign-in or when the person asks to watch.
- [Sign-ins stay in the everyday browser] → the person chose it; the proposal says so in plain words.
- [`client.valueOf` lets a script read a secret box] → it is not on the CLI; only `browser.mjs` and `take-key` call it, and the value never prints.

## Migration Plan

Additive for installs. The rename is internal to the skill; nothing outside `connect/` calls `chrome.mjs`. CHANGELOG **Updating.**: nothing to do by hand.

<!-- end design.md -->
<!-- file tasks.md utf8 7539 -->
# Tasks

## 1. Prove the Camoufox path on this server

- [x] 1.1 On this host, open a local test page with a key in a box named *Secret key* in a `connect-check` Camoufox session through `client()`, and record in design.md that a snapshot hides it only after `maskKeys()`, and that a raw field read returns the value; verify by the notes in design.md under Decision 1
- [x] 1.2 Open a live view with `hand-over.mjs open --view --session connect-check --until "<page>**" --until-gone "input[type=password]"` on a local sign-in page that returns to the key page, and confirm it ends `done`; confirm `browse.mjs` commands on that session still act and show in the view while it is open, which the watch needs; record the command in design.md, then close the page and verify `browse.mjs status` still shows the everyday browser running with its other pages

## 2. The watch link

- [x] 2.1 Add `open --watch`, `turn`, `line`, and the `wait` results `opened`, `taken-over`, `handed-back`, `signed-in`, `stopped` to `hand-over.mjs`, with `control` in the link's state file, the one-view rule unchanged; verify with `hand-over.test.mjs` cases for each result and for a second view refused while a watch is open
- [x] 2.2 Add the `take`, `give` and `stop` routes to `helper.mjs`, the secret checked as for every route, and the chat woken on `take` and `stop`; verify with tests that each sets `control` and that a request without the secret is refused
- [x] 2.3 Add the watch states to `view-page.mjs` and `view-page.html`: the tag, the line, *Take over*, *Hand back*, *Stop*, `viewOnly` while the assistant works, the type box only when the person holds the browser, and *All done* / *Stopped*; verify with `view-page.test.mjs` cases for each state on a phone and a wide shape, and a picture of each state from a local watch on this server
- [x] 2.4 In `view-page.mjs`, send a paste anywhere on the view as keystrokes into the browser, for every live view; verify with a `view-page.test.mjs` case that a paste on the screen sends the text's keysyms and posts nothing to the helper, and by pasting into a local sign-in page in a live view on this server

## 3. The connect helper

- [x] 3.1 Add `valueOf(target)` to `browse.mjs`'s `client()`, a field read with no secret check that the CLI does not expose; verify with a `browse.test.mjs` case that `get value` still prints `[hidden]` for a box named *Secret key* while `valueOf` returns it
- [x] 3.2 Rename `connect/scripts/chrome.mjs` to `browser.mjs`, move the `agent-browser` calls behind a `chrome` backend, and keep every command's output; rename `scripts/tests/connect-chrome.test.mjs` to `connect-browser.test.mjs`, update `cli-conventions.test.mjs`, retire `chrome.mjs` in `scripts/retired-names.json`, and verify the renamed tests pass unchanged
- [x] 3.3 Add the `camoufox` backend over `client(connect-<hash>)` (attach, read, click, fill, select, wait, picture, done, and a key read through `valueOf`), with the backend kept in the state file; verify with tests on a stand-in browse server (`BROWSE_SERVER_SCRIPT`) that `read` hides a key, `picture` refuses while one shows, `fill` refuses a password box, `take-key` prints only the last four characters, and `done` closes only the helper's page
- [x] 3.4 Add `where` (`WHERE=chrome|server|link`), `attach --server` (`BROWSER=camoufox`, or `BROWSE_NEEDS=install` passed through), and `SERVER=possible` after `CHROME=none`; verify with tests over platform and `DISPLAY`/`WAYLAND_DISPLAY` and a stubbed `checkView()`
- [x] 3.5 Add `watch`, `sign-in --tool <title>` (over `hand-over.mjs turn` with the key page's own path as `--until`, every login box as `--until-gone`, and a turn whose finish already holds refused), `done --stopped`, the line each command sets, and the `control` check before each command (`CONNECT_PAUSED=taken-over|your-turn`, `CONNECT_STOPPED`); verify with tests that commands refuse while the person holds the browser or stopped, that `sign-in` and `watch` refuse on the Chrome backend and on a page the helper did not open, and that no line holds a key

## 4. Skill and wiki

- [x] 4.1 Update `wiki/stack/connect-your-tools.md`: the flow drawing, the server default with no question and the key link last, *Use the assistant's browser* with its steps, and the Chrome section on `browser.mjs`; update `connect/SKILL.md`; verify `node scripts/measure-context.mjs --check` passes
- [x] 4.2 Update `wiki/development/live-view.md` (*watching the assistant connect your tools*, *The watch link*, and a paste anywhere on the view under *What you see*), `wiki/development/browsing.md` and `wiki/development/secrets.md#api-token-website-steps` (the exception names both browsers, once), and the `AGENTS.md` *API keys/tokens* rule; verify `node scripts/check-payload-links.mjs` and `node scripts/check-retired-names.mjs` pass
- [x] 4.3 Add the `## Next (minor) — Connect your tools when the assistant runs on a server` entry to `CHANGELOG.md`, with an **Updating.** note that nothing needs doing by hand; verify it is the top entry

## 5. Check

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate connect-on-a-server --strict --no-interactive`, and verify both pass
- [x] 5.2 `/save`, then on this server with Matthew: he says *connect my Notion* while signed out of Notion in the assistant's browser. Verify no question or key-link step comes first; the run starts when he opens the watch link and he sees it click; *Take over* then *Hand back* pauses and resumes it; he signs in only on his turn in that link; the assistant makes a read-only internal integration secret and `take-key` saves it as `TOOL_NOTION`, showing only its last four characters; `company-api.mjs tool add notion` succeeds on the live app; and one look-up (`POST /v1/search`) answers. If the look-up finds no pages, ask him before connecting a page to the integration, since that changes what Notion shares
  - Done 2026-11-05, as the Decision log records: Notion keyed and looked up with no link needed; Stripe sign-in, Take over and Hand back worked, and his role had no key access.

## 6. No watching by default

- [x] 6.1 In `browser.mjs`, make `sign-in` open the link itself when none is open, printing `HANDOVER_LINK` before `CONNECT_PAUSED=your-turn`; verify with a `connect-browser.test.mjs` case that `sign-in` with no watch open opens one and starts the turn, and that `watch` still opens one on request
- [x] 6.2 In `view-page.mjs` and `view-page.html`, drop the tag for who holds the browser and show one short line: the agent's line while it works, *Tap Hand back when you're done.* when the person holds it, and the turn's note on a sign-in; update the `view-page.test.mjs` cases for each state
- [x] 6.3 Update `connect/SKILL.md`, `wiki/stack/connect-your-tools.md` (*Use the assistant's browser*: start at once, no link unless a sign-in needs one or the person asks to watch; the flow drawing), `wiki/development/live-view.md` (*The watch link*), and the `CHANGELOG.md` entry; verify `node scripts/measure-context.mjs --check` and `node scripts/check-payload-links.mjs` pass
- [x] 6.4 From the live Notion run: `take-key` takes the one key with a known prefix when a name box and an id also read as keys, and loads the primary `.env` Cloudflare login for `wrangler`; verified by a new `connect-browser.test.mjs` case, 20 of 20 passing
- [x] 6.5 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate connect-on-a-server --strict --no-interactive`, and verify both pass; then `/save`

<!-- end tasks.md -->
<!-- file specs/browser-logins/spec.md utf8 5934 -->
## MODIFIED Requirements

### Requirement: People handle API token websites in their own browser

When a task needs a website to get, create, reveal, copy, rotate, edit permissions for, or revoke an API key or token, the agent SHALL ask the person to do that step in their own browser, providing the service's token-management link and short instructions including required permissions when relevant. When a new or replacement value is to come back, that link and those instructions SHALL be on the private key link's page; for a change needing no new value they SHALL be in the chat. It SHALL NOT use its own browser, saved logins, screenshots, page extraction, or a private form for that token step. The one exception SHALL be connecting a tool, where the person said yes to the agent using their own open Chrome, or the agent uses its own browser by the own-browser connect requirements: the agent MAY then make the key in that browser by the own-browser connect requirements, and SHALL type no saved login there. A newly supplied or replacement value SHALL otherwise use the existing private key link; a change needing no new value SHALL wait for the person's confirmation. The agent SHALL resume dependent work only after the required value is saved or the person confirms completion. Ordinary website tasks, use of stored credentials, and existing authorized token management through APIs SHALL continue unchanged.

#### Scenario: A token request with a saved service login

- **WHEN** a task needs a missing API token and the agent has a saved login for the service
- **THEN** it sends the private key link, whose page carries the token-management link and steps, without opening the service in its browser, receives the value there, and then resumes

#### Scenario: A token edit during an ordinary browsing task

- **WHEN** an ordinary browsing task reaches a step requiring a token permission change or revocation
- **THEN** the agent stops browser interaction for that step, gives the person the website link and instructions, waits for confirmation without taking token-page pictures or extracting its content, and resumes ordinary work afterward

#### Scenario: Connecting in the person's own Chrome

- **WHEN** the owner connects Stripe and says yes to the agent using their own Chrome
- **THEN** the agent makes the Stripe key in that Chrome, and no key-page picture or reading holds the key

#### Scenario: Connecting in the agent's own browser on a server

- **WHEN** the agent runs on a server and the owner says *connect my Notion*
- **THEN** the agent makes the Notion key there, the owner signs in through a link if asked, and no key-page picture or reading of the agent's holds the key

### Requirement: A step that needs the person goes to the chat or a private form

When a browsing step needs something only the person can give, the agent SHALL get it without showing or handing over its browser, except for a check that asks whether a person is present, a stuck login, a site step the agent's click can not get through, a private form's press, a password link's sign-in, a sign-in while connecting tools in the agent's own browser, watching it when the person asks, with taking over, and a PayPal approval. An ordinary form answer (an email, a name, an address, a choice, agreeing to terms) SHALL be asked in the chat and entered by the agent, and the agent SHALL NOT agree to terms without the person's yes; an email a login asks for SHALL follow the password link requirements instead. A sensitive value (payment card details, a backup or recovery code, or another lasting secret the page asks for) SHALL go through the private form. A password SHALL follow the password link requirements, a one-time code the login-code requirement, and an API key or token step the own-browser requirement. A check that asks whether a person is present (a tick box or a picture puzzle), and a stuck login, SHALL follow the live view requirement; a sign-in while connecting, and watching it, SHALL follow the own-browser connect requirements. A step only the person's own device can do (a passkey or a device check) SHALL NOT be attempted by the agent: the agent SHALL stop that step and hand it back in the chat as numbered steps for the person's own device: one action each, a direct link to the page for each step that has one, the site's own labels, and the details the agent already has, never an invented address. For every other step, the agent SHALL NOT offer a live view of its browser or remote control of it, including when the person asks to take over.

#### Scenario: A payment page asks for an email, terms, and a card

- **WHEN** a checkout page asks for an email, a terms tick, and card details
- **THEN** the agent asks for the email and the terms in the chat, enters them itself, and sends a private form for the card details only

#### Scenario: A picture puzzle

- **WHEN** a site shows a picture puzzle
- **THEN** the agent solves nothing, asks whether the person is ready, and sends a live view for the person to do the puzzle

#### Scenario: A passkey

- **WHEN** a site asks for a passkey
- **THEN** the agent sends no private link, stops that step, and gives the person numbered steps, each with its link, to finish on their own device

## ADDED Requirements

### Requirement: A paste anywhere on a live view types into the browser

In every live view, a paste the person makes on the browser's picture, or in the box under it, SHALL type the pasted text into the part of the browser that has the focus, as if typed. The view SHALL save nothing pasted, and the agent SHALL NOT see it.

#### Scenario: Pasting a password on a laptop

- **WHEN** the person taps Notion's password box in the sign-in link on a laptop and pastes a password from their own password manager onto the browser's picture
- **THEN** the password appears in Notion's box, and nothing pasted reaches the chat, a file, or a log

<!-- end specs/browser-logins/spec.md -->
<!-- file specs/own-browser-connect/spec.md utf8 5683 -->
## MODIFIED Requirements

### Requirement: The assistant asks before it uses the person's Chrome

The assistant SHALL use the person's own open Chrome only after the person says yes in the chat and Chrome itself allows the connection. It SHALL act and read only in tabs it opened, SHALL leave the person's other tabs unread and untouched, and SHALL close only its own tabs when it is done, never Chrome. When the assistant runs on a server, it SHALL NOT offer the person's Chrome. When no Chrome on the assistant's computer allows the connection, or the assistant runs on a server, it SHALL make the keys in its own browser, with no further question, where it can show the person that browser; the private key link SHALL be the last fallback. When the person picks the key link, it SHALL connect the tools by the private key link.

#### Scenario: The person says yes

- **WHEN** the owner says yes and allows the connection in Chrome, with their mail open in another tab
- **THEN** the assistant opens each tool in a new tab, never reads the mail tab, and closes only its own tabs at the end

#### Scenario: Chrome is on another computer

- **WHEN** the assistant runs on a server and the person's Chrome is on their own computer
- **THEN** the assistant does not ask the person to switch on a Chrome setting, and makes the keys in its own browser without asking which way first

## ADDED Requirements

### Requirement: The assistant makes keys in its own browser by default

On a server, when the person asks to connect a tool, the assistant SHALL make the key in its own browser, with no question first and no key-link steps for the person. There, it SHALL make each key by the same rules as in the person's Chrome: the narrowest key that only reads, unless the person names a key that changes things; keys hidden in every reading; no picture while a key shows; each key sent to the live app unseen, with only its last four characters in the chat; and no change to Access. It SHALL act only on the page it opened for connecting, and SHALL leave the browser's other pages, and every sign-in the browser holds, as they were. It SHALL NOT type a saved login on a key page.

#### Scenario: Already signed in from an errand

- **WHEN** the assistant runs on a server, its browser is signed in to Stripe from an earlier errand, and the owner says *connect my Stripe*
- **THEN** the assistant makes a Stripe key that only reads, the chat shows only its last four characters, and the person types nothing

#### Scenario: Another task's page

- **WHEN** a scheduled errand has a bank page open in the same browser while the owner connects Notion
- **THEN** the assistant never reads or acts on the bank page, and closes only its own page at the end

### Requirement: The person can take over or stop the assistant's browser

When the assistant makes keys in its own browser, it SHALL start at once, report in the chat, and send no link unless a sign-in needs one or the person asks to watch. An open link SHALL show that browser live under one short line that says what the person can do now. While the assistant works, the person's taps and typing SHALL NOT reach the browser. The person SHALL be able to take over at any time from the link, after which the assistant SHALL send its browser no command and read nothing from it until the person hands back, and SHALL then read the page afresh before it goes on. The person SHALL be able to stop at any time, from the link or the chat, after which the assistant SHALL make no more keys, SHALL keep the keys already saved, and SHALL list the rest as waiting. The link SHALL save nothing the person types, and SHALL close when the run ends.

#### Scenario: Already signed in

- **WHEN** the owner says *connect my Notion* and the assistant's browser is already signed in to Notion
- **THEN** the assistant makes the key with no link sent, and the chat shows only the key's last four characters

#### Scenario: Taking over mid-run

- **WHEN** the person taps take over in an open link while the assistant is on Notion's integrations page
- **THEN** the assistant's next step does not run, the person's taps reach the browser, and after hand back the assistant reads the page again and goes on

#### Scenario: Stopping

- **WHEN** the person taps stop after the Stripe key is saved and before the Notion key is made
- **THEN** Stripe stays saved, no Notion key is made, and the chat lists Notion as waiting

### Requirement: The person signs in to a tool on their turn in a link

When a tool's key page in the assistant's own browser asks the person to sign in, the assistant SHALL send a link, or turn the open one to the person, saying which tool to sign in to, and SHALL take their taps and typing. The person's request to connect SHALL cover each such turn in that run, with no question before it. The assistant SHALL NOT type, save, or ask for a password or a sign-in code, and SHALL send its browser no command during the turn. When the person is signed in, the turn SHALL end by itself and the assistant SHALL make the key. A tool whose sign-in the turn does not finish, that asks for a passkey, or that turns the sign-in away SHALL go to the private key link.

#### Scenario: Signed out of Notion

- **WHEN** Notion shows its sign-in page in the assistant's browser
- **THEN** the link says to sign in to Notion, the person signs in there with their own password and code, the turn ends by itself, and the assistant makes the Notion key with no password reaching it

#### Scenario: A passkey

- **WHEN** a tool's sign-in asks for a passkey
- **THEN** the assistant stops trying that tool and lists it for the private key link at the end

<!-- end specs/own-browser-connect/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-11-05

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 126590 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes: each button shows when the link offers it.
  A preview page (data-kind="preview", from apply's preview-review.mjs) names the finished build and offers Publish.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-11-05-connect-on-a-server</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

/* Tailwind's shadow-xs, shadow-sm and shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the
   bottom, so a layer reads as above the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --look-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --look-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .back { display:flex; align-items:center; gap:8px; min-width:0; margin:0 0 8px; }
  .back .muted { margin:0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; }
  .item > .drawing:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 var(--pad); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--foreground); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--border); background:var(--muted); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen .skeleton { animation:none; min-height:1em; } .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .sk-bar { display:block; height:.75em; border-radius:.375em; background:color-mix(in oklab, var(--muted-foreground) 25%, transparent); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  /* Picture files: a wrapping row of labelled figures in em, so the fit and zoom scale them like a drawing; two sit side by side when they fit. */
  .art.photo { width:49.2em; display:flex; flex-wrap:wrap; align-items:flex-start; gap:.8em; white-space:normal; line-height:1.3; }
  .art.photo figure { flex:1 1 18em; min-width:0; margin:0; text-align:center; }
  .art.photo img { display:block; width:100%; height:auto; max-height:40em; object-fit:contain; border:1px solid var(--border); border-radius:.4em; background:var(--background); }
  .art.photo figcaption { margin-top:.3em; color:var(--muted-foreground); font-size:.95em; }
  .shot { position:relative; display:block; } .art .pin.spot { position:absolute; margin:0; transform:translate(-50%, -50%); }
  /* An ad: the card a feed or a story shows, in em like a picture; several sit side by side when they fit. */
  .art.ads { width:auto; max-width:49.2em; margin-right:1px; }
  .ad { flex:1 1 15em; max-width:20em; min-width:0; overflow:hidden; border:1px solid var(--border); border-radius:.6em; background:var(--card); color:var(--card-foreground); text-align:left; }
  .ad .ad-account { margin:0; padding:.5em .7em; } .ad .ad-account span { color:var(--muted-foreground); font-size:.85em; }
  .art.photo .ad img { max-height:none; aspect-ratio:4 / 5; object-fit:cover; border:0; border-radius:0; }
  .ad-words { display:flex; flex-wrap:wrap; align-items:center; gap:.3em .6em; padding:.6em .7em; }
  .ad-words .ad-text { flex:1 1 100%; margin:0; } .ad-words .ad-headline { flex:1 1 0; min-width:0; }
  .ad-button { padding:.3em .8em; border-radius:.4em; background:var(--primary); color:var(--primary-foreground); font-size:.9em; }
  .ad.story { position:relative; } .art.photo .ad.story img { aspect-ratio:9 / 16; }
  .ad.story .ad-account { position:absolute; top:0; left:0; right:0; z-index:1; background:color-mix(in oklab, var(--background) 70%, transparent); }
  .ad.story .ad-words { position:absolute; left:0; right:0; bottom:0; background:color-mix(in oklab, var(--background) 80%, transparent); }
  .try { margin:8px 0 0; padding:0 var(--pad); }
  .item > .verdict { grid-column:1 / -1; display:flex; align-items:center; gap:8px; margin-top:10px; }
  .verdict button { min-width:64px; }
  .note-list .group { margin:12px 0 6px; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  .item > .table { grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; overflow-x:auto; border-top:1px solid var(--border); }
  .item > .table:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:var(--pad); min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted-foreground); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--background); }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--muted); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(var(--cols, 1), minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  body.read-only .bar, body.read-only .add, body.read-only .verdict, body.read-only .hint, body.read-only .vhint .note-it, body.read-only #chip, body.read-only .drop, body.read-only .files button { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  /* Live cards, forms, files, and the needs list: the look's parts, with inputs at 16px so a phone never zooms. */
  .item > .live, .item > .form { grid-column:1 / -1; margin-top:10px; min-width:0; }
  .live-tools { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 6px; }
  .live-tools [aria-pressed="true"] { background:var(--secondary); color:var(--secondary-foreground); }
  .live-box { overflow:hidden; border:1px solid var(--border); border-radius:var(--radius); background:var(--muted); }
  .live iframe { display:block; border:0; transform-origin:0 0; background:var(--background); }
  .live.full { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; margin:0; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; background:var(--background); }
  .live.full .live-box { flex:1; min-height:0; overflow:auto; }
  .live.full iframe { margin:0 auto; }
  .live-said { margin:6px 0 0; }
  .form { display:grid; gap:14px; }
  .need .form { margin-top:10px; }
  .q { min-width:0; margin:0; padding:0; border:0; }
  .q-label { display:block; margin:0 0 4px !important; font-weight:500; }
  .q :is(input:not([type=checkbox], [type=radio], [type=file]), textarea) { display:block; width:100%; padding:8px 10px; font:inherit; font-size:16px; }
  .opt { display:flex; align-items:center; gap:8px; min-height:40px; }
  .opt input { width:20px; height:20px; margin:0; }
  .drop { position:relative; display:flex; align-items:center; justify-content:center; min-height:64px; padding:12px; border:1px dashed var(--input); border-radius:var(--radius); text-align:center; cursor:pointer; }
  .drop.over, .drop:focus-within { border-color:var(--ring); background:var(--accent); }
  .drop input { position:absolute; width:1px; height:1px; opacity:0; }
  .files { list-style:none; margin:6px 0 0; padding:0; }
  .files li { display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:14px; }
  .files .why { color:var(--destructive); }
  .needs { list-style:none; margin:0; padding:0; }
  .need { scroll-margin-top:8px; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-11-05-connect-on-a-server" data-own-back>
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-11-05-connect-on-a-server</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#needs">Needs</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint"><span class="lead">Tap + Note to comment.</span> <span class="copies">Saving a note copies all your notes.</span> <span class="tail">Open a drawing and tap it to see it full screen.</span></p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">When your assistant runs on a server, your Chrome is on another computer, so the assistant can not make your keys there. Today every tool then goes to the key link, and you make each key by hand. The assistant's own browser on the server can make the keys instead. It works at once and reports in the chat; you get a link only when a tool asks you to sign in.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>On a server, the assistant makes your keys in its own browser, with no question first.</b> You say <i>connect my Notion</i>, and the assistant starts at once. You do no key-link steps, and you get no link unless a tool asks you to sign in, or you ask to watch. It does not ask you to switch on a Chrome setting that can not help from a server. The key link is only the last way, for a tool the browser can not get through. On your own computer, the assistant still offers your Chrome first. When your Chrome does not connect, it goes on in its own browser, with no second question.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">You: connect my Notion</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">Assistant: Making your Notion key in my</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">browser. You're already signed in.</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">✓ Notion   key saved, ends in …91c0</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-1-picture-1" tabindex="0" style="width:47.231em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 614 715" width="614" height="715" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_start_where_0"><path d="M244.18,56L244.18,97"/><path class="pele-marker" d="M244.18,104L240.82,96L247.54,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_where_make_0"><path d="M215.2,229.6C215.2,275.15 132.48,275.15 132.48,320.71L132.48,434.71"/><path class="pele-marker" d="M132.48,441.71L129.12,433.71L135.84,433.71Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_make_turn_0"><path d="M103.8,489.71L103.8,498.68C103.8,504.44 54.27,504.44 54.27,510.21L54.27,555.71"/><path class="pele-marker" d="M54.27,562.71L50.91,554.71L57.63,554.71Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_turn_make_0"><path d="M70.27,562.71L70.27,549.71C70.27,539.34 132.48,539.34 132.48,528.96L132.48,496.71"/><path class="pele-marker" d="M132.48,489.71L135.84,497.71L129.12,497.71Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_where_chrome_0"><path d="M273.16,229.6C273.16,248.9 355.89,248.9 355.89,268.21L355.89,313.71"/><path class="pele-marker" d="M355.89,320.71L352.53,312.71L359.25,312.71Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_chrome_mine_0"><path d="M387.69,368.71C387.69,378.96 509.47,378.96 509.47,389.21L509.47,434.71"/><path class="pele-marker" d="M509.47,441.71L506.11,433.71L512.83,433.71Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_chrome_make_0"><path d="M324.09,368.71C324.09,378.96 226.63,378.96 226.63,389.21L226.63,414.21C226.63,421.9 177.16,421.9 177.16,429.59L177.16,434.71"/><path class="pele-marker" d="M177.16,441.71L173.8,433.71L180.52,433.71Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_chrome_link_0"><path d="M355.89,368.71L355.89,555.71"/><path class="pele-marker" d="M355.89,562.71L352.53,554.71L359.25,554.71Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_make_link_0"><path d="M177.16,489.71L177.16,498.68C177.16,504.44 260.18,504.44 260.18,510.21L260.18,535.21C260.18,542.9 325.4,542.9 325.4,550.59L325.4,555.71"/><path class="pele-marker" d="M325.4,562.71L322.04,554.71L328.76,554.71Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_make_saved_0"><path d="M148.48,489.71L148.48,610.71C148.48,628.21 292.7,628.21 292.7,645.71L292.7,651.71"/><path class="pele-marker" d="M292.7,658.71L289.34,650.71L296.06,650.71Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_mine_saved_0"><path d="M509.47,489.71L509.47,610.71C509.47,628.21 358.1,628.21 358.1,645.71L358.1,651.71"/><path class="pele-marker" d="M358.1,658.71L354.74,650.71L361.46,650.71Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_link_saved_0"><path d="M325.4,610.71L325.4,651.71"/><path class="pele-marker" d="M325.4,658.71L322.04,650.71L328.76,650.71Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_where_make_0"><rect x="103.2" y="334.21" width="58.57" height="21" rx="3" fill="var(--_bg)"/><text x="132.48" y="349.61" text-anchor="middle">a server</text></g><g class="pele-edge-label" data-id="L_make_turn_0"><rect x="17.97" y="512.21" width="72.6" height="21" rx="3" fill="var(--_bg)"/><text x="54.27" y="527.61" text-anchor="middle">signed out</text></g><g class="pele-edge-label" data-id="L_where_chrome_0"><rect x="307.15" y="270.21" width="97.47" height="21" rx="3" fill="var(--_bg)"/><text x="355.89" y="285.61" text-anchor="middle">your computer</text></g><g class="pele-edge-label" data-id="L_chrome_mine_0"><rect x="450.61" y="391.21" width="117.7" height="21" rx="3" fill="var(--_bg)"/><text x="509.47" y="406.61" text-anchor="middle">Chrome connects</text></g><g class="pele-edge-label" data-id="L_chrome_make_0"><rect x="142.48" y="391.21" width="168.3" height="21" rx="3" fill="var(--_bg)"/><text x="226.63" y="406.61" text-anchor="middle">Chrome does not connect</text></g><g class="pele-edge-label" data-id="L_chrome_link_0"><rect x="328.55" y="455.21" width="54.68" height="21" rx="3" fill="var(--_bg)"/><text x="355.89" y="470.61" text-anchor="middle">key link</text></g><g class="pele-edge-label" data-id="L_make_link_0"><rect x="174.48" y="512.21" width="171.41" height="21" rx="3" fill="var(--_bg)"/><text x="260.18" y="527.61" text-anchor="middle">a passkey, or turned away</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="start" transform="translate(244.18,32)"><rect x="-84.25" y="-24" width="168.5" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">connect my Notion</text></g><g class="pele-node pele-shape-diam" data-id="where" transform="translate(244.18,175.86)"><polygon points="0,-71.85 114.97,0 0,71.85 -114.97,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">where is the assistant?</text></g><g class="pele-node pele-shape-rect" data-id="make" transform="translate(140.48,465.71)"><rect x="-88.68" y="-24" width="177.36" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">its browser makes it</text></g><g class="pele-node pele-shape-rect" data-id="turn" transform="translate(64.24,586.71)"><rect x="-56.24" y="-24" width="112.48" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">you sign in</text></g><g class="pele-node pele-shape-rect" data-id="chrome" transform="translate(355.89,344.71)"><rect x="-83.8" y="-24" width="167.6" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">use your Chrome?</text></g><g class="pele-node pele-shape-rect" data-id="mine" transform="translate(509.47,465.71)"><rect x="-96.24" y="-24" width="192.48" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">your Chrome makes it</text></g><g class="pele-node pele-shape-rect" data-id="link" transform="translate(325.4,586.71)"><rect x="-44.67" y="-24" width="89.34" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">key link</text></g><g class="pele-node pele-shape-rect" data-id="saved" transform="translate(325.4,682.71)"><rect x="-84.7" y="-24" width="169.41" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">key saved, unseen</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>When a link is open, you can take over or stop at any time.</b> The link shows the assistant's browser live, under one short line that says what to do now. You get it for a sign-in, or when you ask to watch. While the assistant works, your taps do nothing, so you can not knock it off course by mistake. <i>Take over</i> pauses it at once and gives you the browser; <i>Hand back</i> lets it go on from where you left the page. The assistant sees nothing you do until you hand back. <i>Stop</i> ends the connecting: keys already made stay saved, and the rest wait. You can also say <i>stop</i> in the chat.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic screen" data-note="item-2-picture-1" tabindex="0" style="width:27.692em"><div class="sk" inert><div class="card col gap phone">
  <div class="row gap"><span class="grow muted">Tap Hand back when you're done.</span></div>
  <div class="skeleton">Notion: My integrations</div>
  <div class="row gap"><button class="btn-ghost">Stop</button><span class="grow"></span><button class="btn-primary">Hand back</button></div>
</div></div></div></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>When you are signed out of a tool, the assistant sends you a link to sign in.</b> The line says <i>Sign in to Notion. I go on once you're in.</i>, and your taps and typing go to the browser. You sign in with your own password and code, from your phone or laptop. Once you are in, the assistant goes on by itself. You get no question before your turn: your request to connect is enough. The assistant never types, saves, or asks for a password or a code.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic screen" data-note="item-3-picture-1" tabindex="0" style="width:27.692em"><div class="sk" inert><div class="card col gap phone">
  <div class="row gap"><span class="grow muted">Sign in to Notion. I go on once you're in.</span></div>
  <div class="skeleton">Notion: Log in</div>
  <div class="field">Type here, and it types in the browser</div>
  <div class="row gap"><button class="btn-ghost">Stop</button><span class="grow"></span></div>
</div></div></div></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>You can paste into any live view.</b> Today a paste works only in the box under the browser; a paste on the browser itself does nothing. After this, a paste anywhere on the view types into the box you tapped in the browser. You can copy a password from your own password manager and paste it in. Nothing you paste is saved. This works in the sign-in link and in every other live view.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The same safety rules hold as in your Chrome.</b> The assistant works only on its own page for connecting. Its own reading of a page hides each key, and it takes no picture while a key shows. When a link is open, you see the key there, as you would in your own browser; the link is private and closes at the end. Each key goes straight to your live app, and the chat shows only its last four characters. It never changes Access.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Your sign-ins stay in the assistant's browser.</b> It is the same browser your errands use, so a tool you signed in to for an errand needs no sign-in, and a sign-in you make while connecting helps later errands too. A tool that asks for a passkey, or that turns your sign-in away, goes to the key link at the end.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-1" tabindex="0">Your tools</span>
<span class="ln" data-note="item-6-line-2" tabindex="0">  ✓ Stripe   works: 3 charges today</span>
<span class="ln" data-note="item-6-line-3" tabindex="0">  ✓ Notion   works: 12 pages</span>
<span class="ln" data-note="item-6-line-4" tabindex="0">  … Figma    waiting for your key: it wants</span>
<span class="ln" data-note="item-6-line-5" tabindex="0">             a passkey, so use the key link</span></pre></div></details></li>
</ol>
<p class="aside"><b>Non-goals:</b> a tunnel from the server to your own Chrome; a second browser kept only for keys; the assistant typing a saved password on a key page; tools that offer only a sign-in that renews, such as Gmail. On a Mac the assistant's browser can not show a live view, so a Mac with no Chrome to connect keeps the key link. While a link is open, another chat's live view waits, since the computer shows one at a time.</p>

</section>
<section id="needs" aria-labelledby="needs-h"><h2 id="needs-h">What the build needs</h2>
<ol class="needs">
<li class="need card" id="need-1" data-need="ready"><p><span class="tag">Ready</span> <b>The assistant's browser on this server</b>: Camoufox 158 is installed and running.</p></li>
<li class="need card" id="need-2" data-need="ready"><p><span class="tag">Ready</span> <b>The live view's tools on this server</b>: none missing.</p></li>
</ol>
</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked which Camoufox makes the keys on a server → chose the everyday one errands use, on its own page, because a tool already signed in needs no sign-in and the live view works with it as it is.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked whether to use Camoufox on the server or a bridge to the person's own Chrome → Matthew chose Camoufox as the main way, with its local proxy as it is, and no bridge: <i>&quot;I think we just try camoufox and basically assume the proxy and go and do it, probably better in the long run.&quot;</i> A bridge needs a program on each person's computer, does not work from a phone, and lets the server drive every tab in that Chrome.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the assistant is on a server when it runs on Linux with no screen of its own (no <code>DISPLAY</code> or <code>WAYLAND_DISPLAY</code>), because the WongOS host has neither and a desktop Linux, a Mac, or Windows has Chrome beside it.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: on the person's own computer, the assistant's browser is used only after Chrome does not connect, because the person's Chrome is already signed in and needs no sign-in link.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked, through the first chat, what <i>connect my Notion</i> should do on a server → chose the assistant's own browser by default, with no question first and no key-link steps; Matthew signs in himself through the live view only when the site asks, and the key link is the last fallback.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the request to connect covers every sign-in link in that run, with no <i>Ready?</i> before each, because the person is in the chat and a sign-in page does not go stale like a robot puzzle.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: on the person's own computer, a Chrome that does not connect also goes on in the assistant's browser with no second question, and a person who picks the key link at the Chrome question gets it, by the same last-fallback rule.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: installing the browser or the live view's tools, the first time, still asks once, because each install needs the person's yes for its disk and admin rights.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the assistant uses no saved login on a key page, even when one matches, because Matthew wants the person to sign in themselves and the assistant to type no password.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: one helper with two backends replaces <code>chrome.mjs</code>, renamed <code>browser.mjs</code>, because the own-page rule, key hiding and <code>take-key</code> must stay one copy for both browsers.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: <code>take-key</code> reads a key's value through <code>browse.mjs</code>'s <code>client()</code> in its own process, because <code>browse.mjs get value</code> prints <code>[hidden]</code> for a box named like a secret.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-05</p>Check: <code>scripts/tests/connect-chrome.test.mjs</code> is renamed <code>connect-browser.test.mjs</code> with every test kept, because the helper it tests is renamed <code>browser.mjs</code>.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: <code>done</code> closes only the helper's page and keeps the sign-ins, because the person chose the everyday browser so later errands stay signed in.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: a sign-in turn that ends <code>closed</code> or <code>timeout</code>, a passkey, or a site that turns the sign-in away sends that tool to the one key link at the end, by the live view's one-view-per-site rule.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked, through the first chat, whether the person should see the assistant click around and be able to interrupt → Matthew chose yes, as part of the default and not only for sign-in: <i>&quot;maybe they should see it click around? And be able to interrupt.&quot;</i> This is newer than his 2026-10-05 note that a live browser link is a bad experience, and wins for connecting; the watch link differs because the assistant does the work and the person only watches, signs in, or chooses to take over.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the run starts when the person opens the watch link, or at once when they say <i>go</i>, because the point is to see it work, and a person who does not want to watch should not wait.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the person's taps do nothing while the assistant works, and <i>Take over</i> gives them the browser, because two hands on one page would knock both off course.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the sign-in turn happens in the same watch link, not a second link, so a run has one link from start to end.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the watch screen shows a new key as the page shows it, and only the assistant's own reading hides it, because the key is the person's and the link is private, as when they make a key in their own browser.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: <i>Stop</i> keeps keys already made and leaves the other tools waiting, because removing a saved key can not be undone from the watch screen and the person can remove one later.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked whether to add a paste fix to this plan, after pasting a password failed in the live view → chose to add it, for every live view, not only the watch link.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked, while thinking aloud, whether to copy the person's Chrome cookies into Camoufox and use one browser for everything → not planned, on the recommendation that getting the cookies off another computer needs a program there, Google ties its sign-in to the device, sites sign out or lock a session that jumps browsers, and Camoufox, a Firefox, can not pass as Chrome; one sign-in per tool in the watch link lasts instead.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the watch link's <code>take</code>, <code>give</code> and <code>stop</code> routes live with the live view's routes in <code>view.mjs</code>, served by the link's own page server, because <code>helper.mjs</code> is the live-line service and not the link's server.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: who holds the browser is kept in three files with one writer each (<code>control.json</code> by the link's watcher, <code>turn.json</code> and <code>line.json</code> by the agent's commands), not in the link's state file, so neither side overwrites the other's change.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: <code>wait</code> prints each watch change once and returns, and two changes between two runs print only the newest, because the agent acts on who holds the browser now.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: in Camoufox, <code>read</code> finds a key page by its address and headings, with no page title, because <code>client()</code> reads no title and the key pages tested name keys in their address or headings.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: <code>attach --server</code> checks only that Camoufox is installed, and the browser starts at the first <code>open</code>, so an attach leaves no idle page for the browser to close.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: Ctrl+V or Cmd+V on the view's screen is kept from the viewer, and the keys it held are let go in the browser before the paste types, because noVNC sends the chord to the remote browser, whose clipboard is empty.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: a sign-in turn ends only when the address is the key page's own path (with any query, never a wider <code>**</code>) and no email, password or one-time-code box shows, and a turn whose finish already holds is refused, because the second look found that an email-first page or a site-root address ended the turn before the person signed in; <i>Hand back</i> still ends a turn the finish misses.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-05</p>Saved for the live test: every task but 5.2 is built and checked locally; a second look found four problems (an early sign-in finish, a stale state on attach, a paste in the type box, a lost <i>with their yes</i>), all fixed and reread clean. Task 5.2, Matthew's <i>connect my Notion</i> through the watch link, comes next.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked, in the live test, how the run should feel → Matthew: <i>&quot;I actually don't need to watch you click around i think that's kind of useless i just need you to successfully connect notion the fastest way possible&quot;</i>. Newer than his earlier choice to watch by default, so it wins: the assistant starts at once with no link; a link opens only for a sign-in, or when the person asks to watch. Take over, Hand back and Stop stay, as he found them working and secure: <i>&quot;we can enter payment info and the bot wont see it until we handback&quot;</i>.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked what the top of the view shows, now that the link opens mostly for the person → chose one short line saying what to do now, such as <i>Sign in to Stripe. I go on once you're in.</i>, with no <i>Assistant working</i> or <i>Your turn</i> tag.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: <code>sign-in</code> opens the link itself when none is open, because the link now opens only for a turn, and one command keeps the skill short.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-05</p>Found in the live Notion run, and fixed: <code>take-key</code> refused because Notion's connection page shows a long name in a box and a connection id that also read as keys; with several, it now takes the one that starts like a known key (<code>ntn_</code>). <code>take-key</code> also could not save to the live app because it did not load the primary <code>.env</code> Cloudflare login for <code>wrangler</code>; it now does. A <code>connect-browser.test.mjs</code> case covers both.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-05</p>Live result of task 5.2: Notion was already signed in, so no link was needed; a read-only connection was made, <code>take-key</code> saved <code>TOOL_NOTION</code> (only <code>…83bj</code> shown), <code>tool add notion</code> with a fixed <code>Notion-Version</code> header succeeded, and <code>POST search</code> answered 200 with no pages, as Matthew chose to share none yet. Stripe: his sign-in through the link worked (<code>opened</code>, then <code>signed-in</code>), and Take over and Hand back worked, but his role has no API key access on that account, so he stopped Stripe.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: removing the card, code and password forms in favour of the live view is its own change, planned in workspace <i>The live view is the one place for sensitive input</i>, because it could ship alone; this change keeps the key link as the last fallback.</li>
<li class="decision card" id="decision-37" data-note="decision-37" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the view drops the site's address with the tag, as the plan's sketches show only the one line, and the app's inbox names the link <i>Connect your tools</i>, not <i>Watch the assistant connect your tools</i>, because the link now opens mostly for a sign-in.</li>
<li class="decision card" id="decision-38" data-note="decision-38" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-05</p>Archived for ship as 49.1.0: tasks 6.1–6.3 built, a second look found a publishable Stripe key could be taken and a lost <code>HANDOVER_NEEDS</code> line, both fixed and reread clean; merged with main's 49.0.0 (CHANGELOG and retired names joined).</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom<span class="note-it"> · tap a line or picture to note it</span></p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" data-actions="[{&quot;name&quot;:&quot;build&quot;,&quot;label&quot;:&quot;Build it&quot;,&quot;done&quot;:&quot;Asked the chat to build.&quot;},{&quot;name&quot;:&quot;publish&quot;,&quot;label&quot;:&quot;Build and publish&quot;,&quot;done&quot;:&quot;Asked the chat to build and publish.&quot;,&quot;confirm&quot;:{&quot;say&quot;:&quot;Goes live, can't be undone.&quot;,&quot;yes&quot;:&quot;Yes, publish&quot;,&quot;ask&quot;:&quot;Build and publish? This goes live and can't be undone.&quot;}}]" hidden>
    <div id="ready-confirm" role="group" hidden><p></p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span></span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  // A preview page shows a finished build: its words name the preview. A review page of other work names its cards.
  const PREVIEW = document.body.getAttribute('data-kind') === 'preview', NAME = PREVIEW ? CHANGE.replace(/-preview$/, '') : CHANGE;
  const REVIEW = document.body.getAttribute('data-kind') === 'review', NOUN = REVIEW ? 'Card' : 'Change', PAGE = REVIEW ? 'page' : 'plan';
  if (PREVIEW) {
    document.title = 'Preview · ' + NAME;
    document.querySelector('.eyebrow').textContent = NAME;
    document.querySelector('h1').textContent = 'Built: look, then publish?';
    document.querySelector('.hint .lead').textContent = 'Tap a picture to see it full screen, then tap it to note it.';
    document.querySelector('.hint .tail').textContent = '';
  }
  if (REVIEW) document.querySelector('.hint .lead').textContent = 'Tap OK or Change on each card, or select words to note them.';
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {}, ok: {}, answers: {}, said: {}, files: {} };
  // A note on words keeps its quote; a note on a picture spot keeps the picture, the spot in percent, and its name.
  const EXTRA = { quote: 'string', k: 'number', x: 'number', y: 'number', on: 'string' };
  const ok = function (r, id) {
    return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id)
      && Object.keys(EXTRA).every(function (f) { return r[f] === undefined || typeof r[f] === EXTRA[f]; });
  };
  function extraOf(rec) {
    const x = {};
    Object.keys(EXTRA).forEach(function (f) { if (rec && rec[f] !== undefined) x[f] = rec[f]; });
    return x;
  }
  const QID = /^(?:item|need)-\d+-(?:q|live)-\d+$/;
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  function load(text) {
    try {
      const saved = JSON.parse(text || 'null');
      if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
      if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
      if (saved && saved.ok && typeof saved.ok === 'object') {
        data.ok = {};
        Object.keys(saved.ok).forEach(function (id) { if (/^item-\d+$/.test(id) && (saved.ok[id] === true || saved.ok[id] === 'sent')) data.ok[id] = saved.ok[id]; });
      }
      const kept = function (name, fits) {
        if (!saved || !saved[name] || typeof saved[name] !== 'object') return;
        data[name] = {};
        Object.keys(saved[name]).forEach(function (id) { if (QID.test(id) && fits(saved[name][id])) data[name][id] = saved[name][id]; });
      };
      const words = function (v) { return typeof v === 'string' && v.length <= 2000; };
      kept('answers', function (v) { return words(v) || typeof v === 'boolean' || (Array.isArray(v) && v.every(words)); });
      kept('said', function (v) { return typeof v === 'string'; });
      kept('files', function (v) {
        return Array.isArray(v) && v.every(function (f) { return f && /^[0-9a-f]{32}$/.test(f.id) && typeof f.name === 'string' && typeof f.size === 'number' && typeof f.sent === 'boolean'; });
      });
    } catch (e) { /* unreadable notes start empty */ }
  }
  load(store ? store.getItem(KEY) : null);
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?(?:-(words|spot)-\d+)?$/.exec(id) || [];
    if (m[5]) return Object.assign(where(id.replace(/-(words|spot)-\d+$/, '')), m[5] === 'words' ? { kind: 'words' } : {});
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: NOUN + ' #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot.
    // A screen's words sit in many small boxes: join every piece of text with a space.
    // Picture files read as their labels, joined with a dot.
    const row = el.tagName === 'TR', photo = el.classList.contains('photo'), cells = row ? c.querySelectorAll('td') : photo ? c.querySelectorAll('img')
      : el.classList.contains('screen') ? texts(c) : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = Array.prototype.map.call(cells, function (n) { return (photo ? n.alt : n.textContent).replace(/\s+/g, ' ').trim(); }).join(row || photo ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  // A note on words or a spot sits on its base target: words are found again by their quote, a spot by the base's label.
  function find(id, rec) {
    const m = /^(.*)-(words|spot)-\d+$/.exec(id), el = document.querySelector('[data-note="' + (m ? m[1] : id) + '"]');
    if (!el) return null;
    if (m && m[2] === 'words') return textOf(el).indexOf(rec.quote) >= 0 ? el : null;
    if (m && !el.querySelectorAll('.shot')[rec.k]) return null;
    return labelOf(el) === rec.label ? el : null;
  }
  function textOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .add'), function (n) { n.parentNode.removeChild(n); });
    return c.textContent.replace(/\s+/g, ' ');
  }
  // A new note on words or a spot takes the next free number on its target.
  function nextId(base, kind) {
    const pre = base + '-' + kind + '-';
    let k = 1;
    data.notes.map(function (n) { return n.id; }).concat(Object.keys(data.drafts)).forEach(function (id) {
      if (id.indexOf(pre) === 0) k = Math.max(k, +id.slice(pre.length) + 1);
    });
    return pre + k;
  }
  // The notes list groups notes by Why, each card, and Decisions.
  function groupOf(id) {
    const m = /^(why|item|decision)-(\d+)/.exec(id) || [];
    return m[1] === 'why' ? [0, 'Why'] : m[1] === 'item' ? [+m[2], NOUN + ' ' + m[2]] : [1e6, 'Decisions'];
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }))
      .map(function (id, i) { return [groupOf(id)[0], i, id]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; })
      .map(function (x) { return x[2]; });
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    let group = null;
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec);
      if (groupOf(id)[1] !== group) {
        group = groupOf(id)[1];
        const head = document.createElement('li');
        head.className = 'group'; head.textContent = group;
        $('note-list').appendChild(head);
      }
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        if (rec.x !== undefined) {
          pin.className += ' spot'; pin.style.left = rec.x + '%'; pin.style.top = rec.y + '%';
          el.querySelectorAll('.shot')[rec.k].appendChild(pin);
        } else slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      const id = el.getAttribute('data-note');
      if (el.closest('.art') || el.querySelector('.pin[data-open="' + id + '"]')) return;
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    all('.verdict', function (v) {
      const id = v.querySelector('[data-ok]').getAttribute('data-ok'), state = data.ok[id], n = id.slice(5);
      v.querySelector('.tag').hidden = !state;
      v.querySelector('.tag').textContent = state === 'sent' ? 'OK · Sent' : 'OK';
      v.querySelector('[data-ok]').textContent = state ? 'Undo' : 'OK';
      v.querySelector('[data-ok]').setAttribute('aria-label', (state ? 'Undo OK on ' : 'OK ') + NOUN.toLowerCase() + ' ' + n);
      v.querySelector('[data-open]').hidden = !!state;
    });
    const answers = replies();
    Object.keys(data.answers).forEach(function (id) {
      const q = document.querySelector('[data-q="' + id + '"], [data-live="' + id + '"]');
      if (!q || q.getAttribute('data-kind') === 'tick') return;
      if (!$('note-list').querySelector('.group.answers')) $('note-list').insertAdjacentHTML('beforeend', '<li class="group answers">Answers</li>');
      const line = q.hasAttribute('data-live') ? asker(id) + ' answer' : asker(id) + ', "' + q.getAttribute('data-label') + '"', v = data.answers[id];
      const sent = !answers.some(function (a) { return a.id === id; });
      $('note-list').insertAdjacentHTML('beforeend', '<li class="entry"><span class="where">' + esc(line) + (sent ? '<span class="tag">Sent</span>' : '') + '</span>'
        + esc(Array.isArray(v) ? v.join(', ') : v) + '</li>');
    });
    if (ids.length || $('note-list').querySelector('.answers')) { const none = $('note-list').querySelector('li.muted'); if (none) none.remove(); }
    fill(); drawFiles();
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, chipExtra = null, tap = null;
  // True once the inbox opens this page closed, or a tap on it reaches the chat: it takes no note.
  let readOnly = false;
  const pointers = {};
  // `extra` makes the chip start a new note on selected words or a picture spot.
  function showChip(el, x, y, keyboard, extra) {
    if (readOnly) return;
    const id = el.getAttribute('data-note');
    chipFor = el; chipExtra = extra || null;
    chip.textContent = extra && extra.quote ? 'Note' : !extra && (noteOf(id) || data.drafts[id]) ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; chipExtra = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false, spotAt(el, t.target, e)); else hideChip();
  });
  // A tap on a picture file in full screen notes that spot of it, kept in percent so it holds at any size.
  function spotAt(el, target, e) {
    if (!el.closest('#viewer') || !el.classList.contains('photo') || target.tagName !== 'IMG') return null;
    const r = target.getBoundingClientRect(), pct = function (v, size) { return Math.max(0, Math.min(100, Math.round(v / Math.max(1, size) * 100))); };
    return { k: Array.prototype.indexOf.call(el.querySelectorAll('img'), target), x: pct(e.clientX - r.left, r.width), y: pct(e.clientY - r.top, r.height), on: target.alt };
  }
  // Selected words in one note target offer a note on just those words.
  let picking = 0;
  document.addEventListener('selectionchange', function () {
    clearTimeout(picking);
    picking = setTimeout(function () {
      const s = window.getSelection ? window.getSelection() : null;
      if (!s || s.isCollapsed || !s.rangeCount || open) return;
      const range = s.getRangeAt(0), at = range.commonAncestorContainer, host = (at.nodeType === 1 ? at : at.parentNode).closest('[data-note]');
      const quote = s.toString().replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!host || !quote || host.closest('.art, #editor, #viewer') || textOf(host).indexOf(quote) < 0) return;
      const r = range.getBoundingClientRect();
      showChip(host, r.left + r.width / 2, r.bottom, false, { quote: quote });
    }, 150);
  });
  chip.addEventListener('click', function () {
    if (!chipFor) return;
    const id = chipFor.getAttribute('data-note'), extra = chipExtra;
    openEditor(extra ? nextId(id, extra.quote ? 'words' : 'spot') : id, chipFor, extra);
  });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id);
    const el = rec ? find(id, rec) : t.closest('[data-note]') || document.querySelector('[data-note="' + id + '"]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) {
        const el = chipFor, words = chipExtra && chipExtra.quote;
        hideChip();
        if (words && window.getSelection) window.getSelection().removeAllRanges();
        el.focus();
      }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el, extra) {
    if (readOnly) return;
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const quote = extra && extra.quote, clip = quote && quote.length > 60 ? quote.slice(0, 59) + '…' : quote;
    const label = draft ? draft.label : note ? note.label : quote ? 'words "' + clip + '"' : labelOf(el);
    open = { id: id, label: label, el: el, extra: extra || extraOf(draft || note) };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = Object.assign({ label: open.label, text: text }, open.extra);
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push(Object.assign({ id: id, label: open.label, text: text }, open.extra));
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length, k = oks().length, a = replies().length;
      copyNotes(function () { toast('Saved and copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump(hash) {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(typeof hash === 'string' ? hash : location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return Object.assign({ id: n.id, label: n.label, text: n.text }, extraOf(n)); }); }
  // An OK not yet in the chat, as its card's id, in card order.
  function oks() {
    return Object.keys(data.ok).filter(function (id) { return data.ok[id] === true; }).sort(function (a, b) { return a.slice(5) - b.slice(5); });
  }
  function acknowledge(notes, okd, ans) {
    ans.forEach(function (a) {
      if (a.said) data.said[a.id] = a.said;
      (data.files[a.id] || []).forEach(function (f) { if (a.files.indexOf(f.id) >= 0) f.sent = true; });
    });
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    okd.forEach(function (id) { if (data.ok[id] === true) data.ok[id] = 'sent'; });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id), spot = n.x === undefined ? '' : ', spot at ' + n.x + '% across and ' + n.y + '% down on "' + n.on + '"';
      return '- ' + w.spot + spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  // What goes to the chat: each OK on its own line, then the notes.
  function lines(notes, okd, ans) {
    return okd.map(function (id) { return NOUN + ' #' + id.slice(5) + ': OK'; }).concat(ans.map(function (a) { return a.line; }), bullets(notes)).join('\n');
  }
  function notesText() {
    const header = REVIEW ? document.body.getAttribute('data-header')
      : PREVIEW ? 'Notes on the preview of ' + NAME + ' from its review page. Don\'t publish yet.'
      : 'Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.';
    return header + '\n' + lines(unsent(), oks(), replies());
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  function plural2(n, k, a) {
    const parts = n || !(k || a) ? [plural(n)] : [];
    if (k) parts.push(k + (k === 1 ? ' OK' : ' OKs'));
    if (a) parts.push(a + (a === 1 ? ' answer' : ' answers'));
    return parts.join(' and ');
  }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length || oks().length || replies().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    if (hosted) return hostedAsk(path, body);
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), okd = oks(), ans = replies(), n = notes.length, k = okd.length, a = ans.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural2(n, k, a) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const body = { text: lines(notes, okd, ans) };
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('send', live, body);
      const changed = 'The ' + PAGE + ' changed. Reload to read it first.';
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (r.status === 409) { const why = ((await r.json()) || {}).gone ? GONE : changed; says(why); toast(why); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes, okd, ans);
      says('Sent ' + plural2(n, k, a) + ' to the chat.');
      toast('Sent ' + plural2(n, k, a) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length, k = oks().length, a = replies().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── OK and Change on each card: an OK is kept with the notes until undone, and goes to the chat with them ──
  all('.items > .item', function (item) {
    const v = document.createElement('div');
    v.className = 'verdict';
    v.innerHTML = '<span class="tag" hidden>OK</span><button type="button" class="btn-ghost" data-ok="' + item.id + '">OK</button>'
      + '<button type="button" class="btn-ghost" data-open="' + item.id + '" aria-label="Change ' + NOUN.toLowerCase() + ' ' + item.id.slice(5) + '">Change</button>';
    item.appendChild(v);
  });
  document.addEventListener('click', function (e) {
    const b = e.target.closest ? e.target.closest('[data-ok]') : null;
    if (!b) return;
    const id = b.getAttribute('data-ok');
    if (data.ok[id]) delete data.ok[id]; else data.ok[id] = true;
    persist();
  });
  // A picture file's spot pins sit over the picture itself.
  all('.art.photo img', function (img) {
    const shot = document.createElement('span');
    shot.className = 'shot';
    img.parentNode.insertBefore(shot, img);
    shot.appendChild(img);
  });

  // ── the page's own buttons, from the builder; one that can't be undone asks once more above the footer ──
  let version = null, confirming = null;
  const ACTIONS = JSON.parse($('ready').getAttribute('data-actions') || '[]');
  const actionOf = function (name) { return ACTIONS.filter(function (a) { return a.name === name; })[0] || null; };
  const choice = function (name) { return $('ready').querySelector('[data-ready="' + name + '"]'); };
  ACTIONS.forEach(function (a) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('data-ready', a.name); b.setAttribute('data-label', a.label);
    if (a.confirm) { b.textContent = a.label; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'ready-confirm'); }
    else b.innerHTML = '<span class="spinner" hidden aria-hidden="true"></span><span></span>';
    $('ready').insertBefore(b, $('ready-confirm'));
  });
  function fillConfirm(a) {
    confirming = a;
    $('ready-confirm').querySelector('p').textContent = a.confirm.say;
    $('ready-confirm').setAttribute('aria-label', a.confirm.ask);
    choice('yes').setAttribute('data-label', a.confirm.yes);
  }
  if (ACTIONS.filter(function (a) { return a.confirm; }).length) fillConfirm(ACTIONS.filter(function (a) { return a.confirm; })[0]);
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (focus && wasOpen && !$('ready').hidden && confirming) choice(confirming.name).focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    const gate = drawNeeds();
    all('#ready > [data-ready]', function (b) {
      if (!b.querySelector('.spinner')) b.textContent = gate || b.getAttribute('data-label');
    });
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready'), spinner = b.querySelector('.spinner');
      const active = !!spinner && pending === (step === 'yes' ? confirming && confirming.name : step);
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(active));
      if (spinner) {
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : (b.parentNode === $('ready') && gate) || b.getAttribute('data-label');
      }
    });
    const shown = $('ready').hidden ? 0 : $('ready').querySelectorAll('#ready > button:not([hidden])').length;
    el.style.setProperty('--cols', String(Math.min(3, 1 + shown)));
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  // Each button shows when the link offers it; the choices stay hidden when it offers none.
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || typeof answer.version !== 'string') return;
    const shown = ACTIONS.filter(function (a) {
      choice(a.name).hidden = names.indexOf(a.name) < 0;
      return names.indexOf(a.name) >= 0;
    });
    if (!shown.length) return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot(), okd = oks(), ans = replies();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length || okd.length || ans.length) body.text = lines(notes, okd, ans);
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? actionOf(name).done
        : r.status === 409 && a.changed === true ? 'The ' + PAGE + ' changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : r.status === 409 && a.gone === true ? GONE : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes, okd, ans);
      // A gone file keeps the buttons, as a 429 does: the person picks it again and taps once more.
      if (line !== GONE) hideActions();
      says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready'), a = actionOf(step), gaps = needsOpen();
    // While the build needs the person, a go button leads to the first thing it needs instead.
    if (a && gaps.length) {
      all('.hit', function (n) { n.classList.remove('hit'); });
      gaps[0].classList.add('hit'); gaps[0].scrollIntoView({ block: 'center' });
      return;
    }
    if (step === 'yes') act(confirming.name);
    else if (step === 'cancel' || a.confirm) {
      says('');
      if (a) fillConfirm(a);
      $('ready-confirm').hidden = step === 'cancel';
      all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', String(b === button)); });
      bar();
      choice(step === 'cancel' ? confirming.name : 'cancel').focus({ preventScroll: true });
    } else act(step);
  });

  // ── answers: a form's inputs and a live card's answer, kept with the notes and sent with them under their card ──
  // `said` holds each answer as the chat last got it, so a changed answer goes again and an unchanged one never does.
  const asker = function (id) { const m = /^(item|need)-(\d+)/.exec(id); return (m[1] === 'item' ? NOUN : 'Need') + ' #' + m[2]; };
  function inputValue(q) {
    const kind = q.getAttribute('data-kind'), boxes = q.querySelectorAll('input:checked');
    if (kind === 'tick') return !!boxes.length;
    if (kind === 'choice') return boxes.length ? boxes[0].value : undefined;
    if (kind === 'choices') return boxes.length ? Array.prototype.map.call(boxes, function (b) { return b.value; }) : undefined;
    const v = q.querySelector('input, textarea').value.slice(0, 2000);
    return v.trim() ? v : undefined;
  }
  function fill() {
    all('.form [data-q]', function (q) {
      const v = data.answers[q.getAttribute('data-q')], kind = q.getAttribute('data-kind');
      if (kind === 'file') return;
      Array.prototype.forEach.call(q.querySelectorAll('input, textarea'), function (el) {
        if (el.type === 'radio' || el.type === 'checkbox') el.checked = kind === 'tick' ? v === true : kind === 'choice' ? v === el.value : Array.isArray(v) && v.indexOf(el.value) >= 0;
        else if (el.value !== (v || '')) el.value = v || '';
      });
    });
  }
  function answered(q) {
    const id = q.getAttribute('data-q'), v = data.answers[id];
    if (q.getAttribute('data-kind') === 'file') return !!(data.files[id] && data.files[id].length);
    return q.getAttribute('data-kind') === 'tick' ? v === true : v !== undefined;
  }
  // Each answer the chat has not got yet, in page order: its id, its line, and the files it names.
  function replies() {
    const out = [];
    all('.form [data-q], .live[data-live]', function (q) {
      const id = q.getAttribute('data-q') || q.getAttribute('data-live'), v = data.answers[id];
      if (q.getAttribute('data-kind') === 'file') {
        const fresh = (data.files[id] || []).filter(function (f) { return !f.sent; });
        if (fresh.length) out.push({ id: id, files: fresh.map(function (f) { return f.id; }),
          line: '- ' + asker(id) + ', "' + q.getAttribute('data-label') + '": ' + fresh.map(function (f) { return f.name; }).join(', ') });
        return;
      }
      if (v === undefined || data.said[id] === JSON.stringify(v)) return;
      const text = v === true ? 'Yes' : v === false ? 'No' : Array.isArray(v) ? v.join(', ') : v.replace(/\s*\n\s*/g, ' ');
      out.push({ id: id, said: JSON.stringify(v), files: [],
        line: '- ' + asker(id) + (q.hasAttribute('data-live') ? ' answer: ' : ', "' + q.getAttribute('data-label') + '": ') + text });
    });
    return out;
  }
  const fileIds = function (ans) { return ans.reduce(function (ids, a) { return ids.concat(a.files); }, []); };
  function typed(e) {
    const q = e.target.closest ? e.target.closest('.form [data-q]') : null;
    if (!q || q.getAttribute('data-kind') === 'file') return;
    const v = inputValue(q), id = q.getAttribute('data-q');
    if (v === undefined) delete data.answers[id]; else data.answers[id] = v;
    persist();
  }
  document.addEventListener('input', typed);
  document.addEventListener('change', typed);

  // ── files: checked here first, then sent at once through the link or the inbox; a send later names them by id ──
  const MB = 1024 * 1024, uploads = {}, waiting = {};
  let refs = 0;
  function upload(file, question) {
    if (hosted) {
      return file.arrayBuffer().then(function (buf) {
        return new Promise(function (resolve) {
          const ref = 'f' + (refs += 1);
          waiting[ref] = resolve;
          port.postMessage({ type: 'inbox:file', ref: ref, name: file.name, question: question, data: buf }, [buf]);
        });
      });
    }
    return fetch('file', { method: 'POST', cache: 'no-store', body: file,
      headers: { 'x-reply-key': live, 'x-file-name': encodeURIComponent(file.name), 'x-file-question': encodeURIComponent(question) } })
      .then(function (r) { return r.json().then(function (a) { return r.ok && a && /^[0-9a-f]{32}$/.test(a.id) ? { id: a.id } : { error: (a && a.error) || 'it was not sent; try again' }; }); })
      .catch(function () { return { error: 'it was not sent; try again' }; });
  }
  // The app deletes a file a day after it came, or with a tap that failed or was cancelled: one this page holds unsent
  // and the app no longer does goes back to its question, to be picked again.
  const GONE = 'A file is no longer held. Pick it again, then send.';
  function keepHeld(held) {
    let gone = 0;
    Object.keys(data.files).forEach(function (id) {
      data.files[id] = data.files[id].filter(function (f) {
        if (f.sent || held.indexOf(f.id) >= 0) return true;
        gone += 1;
        (uploads[id] = uploads[id] || []).push({ name: f.name, size: f.size, state: 'refused', why: 'the app no longer holds it; pick it again' });
        return false;
      });
    });
    if (gone) persist();
  }
  function bytesHeld() {
    return Object.keys(data.files).concat(Object.keys(uploads)).reduce(function (sum, id) {
      return sum + (data.files[id] || []).concat(uploads[id] || []).reduce(function (s, f) { return s + (f.state === 'refused' ? 0 : f.size); }, 0);
    }, 0);
  }
  function refusal(q, file) {
    const id = q.getAttribute('data-q'), ext = (/\.([a-z0-9]+)$/i.exec(file.name) || [])[1];
    const kept = (data.files[id] || []).length + (uploads[id] || []).filter(function (f) { return f.state === 'sending'; }).length;
    if (!live) return 'open this page from the chat\'s link to send files';
    if (!ext || q.getAttribute('data-types').split(',').indexOf(ext.toLowerCase()) < 0) return 'this question does not take this type of file';
    if (file.size > 25 * MB) return 'too big: 25 MB at most';
    if (kept >= +q.getAttribute('data-count')) return 'this question takes ' + q.getAttribute('data-count') + ' at most';
    if (bytesHeld() + file.size > 100 * MB) return 'the files for this page pass 100 MB';
    return '';
  }
  function send(q, entry) {
    const id = q.getAttribute('data-q');
    entry.state = 'sending'; entry.why = ''; render();
    upload(entry.file, asker(id) + ', "' + q.getAttribute('data-label') + '"').then(function (a) {
      if (a.id) {
        uploads[id] = uploads[id].filter(function (f) { return f !== entry; });
        (data.files[id] = data.files[id] || []).push({ id: a.id, name: entry.file.name, size: entry.file.size, sent: false });
        persist();
      } else { entry.state = 'refused'; entry.why = String(a.error); entry.retry = true; render(); }
    });
  }
  function pick(q, list) {
    const id = q.getAttribute('data-q');
    Array.prototype.forEach.call(list, function (file) {
      const why = refusal(q, file), entry = { file: file, name: file.name, size: file.size, state: why ? 'refused' : 'sending', why: why };
      (uploads[id] = uploads[id] || []).push(entry);
      if (!why) send(q, entry);
    });
    render();
  }
  const sizeText = function (n) { return n < MB ? Math.max(1, Math.ceil(n / 1024)) + ' KB' : (n / MB).toFixed(1) + ' MB'; };
  function drawFiles() {
    all('.form [data-kind="file"]', function (q) {
      const id = q.getAttribute('data-q'), list = q.querySelector('.files');
      list.innerHTML = (data.files[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + ' <span class="tag">Sent</span><button type="button" class="btn-ghost" data-file="' + i + '">Remove</button></li>';
      }).concat((uploads[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + (f.state === 'sending' ? ' <span class="muted">Sending…</span>'
          : ' <span class="why">Refused: ' + esc(f.why) + '</span>' + (f.retry ? '<button type="button" class="btn-ghost" data-retry="' + i + '">Retry</button>' : '')
            + '<button type="button" class="btn-ghost" data-drop="' + i + '">Remove</button>') + '</li>';
      })).join('');
    });
  }
  all('.form [data-kind="file"]', function (q) {
    const drop = q.querySelector('.drop'), input = drop.querySelector('input');
    input.addEventListener('change', function () { pick(q, input.files); input.value = ''; });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); pick(q, e.dataTransfer.files); });
    q.querySelector('.files').addEventListener('click', function (e) {
      const b = e.target.closest('button'), id = q.getAttribute('data-q');
      if (!b) return;
      if (b.hasAttribute('data-file')) { data.files[id].splice(+b.getAttribute('data-file'), 1); persist(); return; }
      const entry = uploads[id][+(b.getAttribute('data-retry') || b.getAttribute('data-drop'))];
      if (b.hasAttribute('data-retry')) send(q, entry);
      else { uploads[id] = uploads[id].filter(function (f) { return f !== entry; }); render(); }
    });
  });

  // ── what the build needs: an item that needs you counts until each of its questions has an answer ──
  function needsOpen() {
    return Array.prototype.filter.call(document.querySelectorAll('.need[data-need="needs"]'), function (n) {
      const qs = n.querySelectorAll('[data-q]');
      return !qs.length || Array.prototype.some.call(qs, function (q) { return !answered(q); });
    });
  }
  function drawNeeds() {
    const gaps = needsOpen();
    all('.need[data-need="needs"]', function (n) {
      const done = gaps.indexOf(n) < 0, tag = n.querySelector('.tag-outline, .tag');
      tag.className = done ? 'tag' : 'tag-outline';
      tag.textContent = done ? 'Answered' : 'Needs you';
    });
    return gaps.length ? gaps.length + (gaps.length === 1 ? ' thing needs you' : ' things need you') : '';
  }

  // ── live cards: the chat's own page in a sealed frame, talking to this page only through the port it is handed ──
  // A frame loads once; a second load means its page went somewhere else, so it starts again from its own copy.
  const cards = [];
  function mount(c) {
    if (c.port) c.port.close();
    c.port = null;
    const f = document.createElement('iframe');
    let loads = 0;
    f.setAttribute('sandbox', 'allow-scripts'); f.title = c.title; f.setAttribute('srcdoc', c.doc);
    f.addEventListener('load', function () {
      loads += 1;
      if (loads === 1) {
        const ch = new MessageChannel();
        c.port = ch.port1;
        ch.port1.onmessage = function (e) { heardCard(c, e.data); };
        f.contentWindow.postMessage({ type: 'review:hello' }, '*', [ch.port2]);
        return;
      }
      c.resets += 1;
      c.said.hidden = false;
      c.said.textContent = 'This card tried to leave the page.' + (c.resets > 2 ? ' Reload the page to try it again.' : '');
      if (c.resets > 2) { f.remove(); c.port.close(); c.port = null; } else mount(c);
    });
    c.stage.replaceChildren(f);
    c.frame = f;
    fitCard(c);
  }
  function heardCard(c, m) {
    if (!m || m.type !== 'review:answer' || typeof m.text !== 'string') return;
    const text = m.text.slice(0, 2000);
    if (text.trim()) data.answers[c.id] = text; else delete data.answers[c.id];
    persist();
  }
  // Phone and Computer draw the page at that width, scaled to the card; full screen shows it at true size.
  function fitCard(c) {
    if (!c.frame) return;
    const full = c.box.classList.contains('full'), k = full ? 1 : Math.min(1, c.stage.clientWidth / c.width);
    c.frame.style.width = c.width + 'px';
    c.frame.style.height = full ? '100%' : c.height + 'px';
    c.frame.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    c.stage.style.height = full ? '' : Math.ceil(c.height * k) + 'px';
  }
  function full(c, on) {
    c.box.classList.toggle('full', on);
    document.body.classList.toggle('viewing', on);
    c.tools.querySelector('[data-full]').textContent = on ? 'Close' : 'Full screen';
    fitCard(c);
    if (!on) bar();
  }
  all('.live[data-live]', function (box) {
    const old = box.querySelector('iframe'), tools = document.createElement('div'), said = document.createElement('p');
    tools.className = 'live-tools';
    tools.innerHTML = '<button type="button" class="btn-ghost" data-width="390" aria-pressed="true">Phone</button>'
      + '<button type="button" class="btn-ghost" data-width="1280" aria-pressed="false">Computer</button><button type="button" class="btn-ghost" data-full>Full screen</button>';
    said.className = 'muted live-said'; said.setAttribute('role', 'status'); said.hidden = true;
    const c = { box: box, id: box.getAttribute('data-live'), height: +box.getAttribute('data-height') || 640, width: 390, doc: old.getAttribute('srcdoc'),
      title: old.title, stage: box.querySelector('.live-box'), tools: tools, said: said, port: null, frame: null, resets: 0 };
    box.insertBefore(tools, c.stage); box.appendChild(said);
    tools.addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-full')) { full(c, !box.classList.contains('full')); return; }
      c.width = +b.getAttribute('data-width');
      all('[data-live="' + c.id + '"] [data-width]', function (w) { w.setAttribute('aria-pressed', String(w === b)); });
      fitCard(c);
    });
    cards.push(c);
    mount(c);
    // A stage first laid out at no width, as in an Inbox frame still opening, fits again once it gets its width.
    if (window.ResizeObserver) new ResizeObserver(function () { if (c.stage.clientWidth !== c.seen) { c.seen = c.stage.clientWidth; fitCard(c); } }).observe(c.stage);
  });
  window.addEventListener('load', function () { cards.forEach(fitCard); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cards.forEach(function (c) { if (c.box.classList.contains('full')) full(c, false); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    cards.forEach(fitCard);
    if (open) place();
    bar();
  });
  // ── hosted: in the live app's inbox, a sealed frame that reaches the inbox only through the port its first greeting carries ──
  let hosted = null, port = null;
  const CODES = { sent: 200, changed: 409, done: 409, gone: 409, soon: 429, closed: 410, expired: 410 };
  function post(message) { port.postMessage(message); }
  // The inbox answers a tap only once the chat has it, or once it is refused, cancelled or failed.
  function hostedAsk(path, body) {
    return new Promise(function (resolve) {
      hosted.reply = function (state) {
        const status = Object.prototype.hasOwnProperty.call(CODES, state) ? CODES[state] : 502;
        const answer = status === 200 ? { sent: true } : state === 'changed' || state === 'done' || state === 'gone' ? { [state]: true } : { sent: false };
        resolve({ ok: status === 200, status: status, json: function () { return Promise.resolve(answer); } });
      };
      const tap = { type: 'inbox:tap', action: path === 'send' ? 'send' : body.action, text: body.text || '' };
      if (body.files) tap.files = body.files;
      post(tap);
    });
  }
  // The inbox's switch owns the look: this frame can't remember a choice, so its own switch goes. Unknown looks change nothing.
  function look(theme) { if (theme === 'light' || theme === 'dark') document.documentElement.classList.toggle('dark', theme === 'dark'); }
  function heard(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'inbox:theme') look(m.theme);
    else if (m.type === 'inbox:notes' && (typeof m.value === 'string' || m.value === null)) {
      load(m.value);
      if (hosted.held) keepHeld(hosted.held);
      hosted.held = null; render();
    } else if (hosted.reply && m.type === 'inbox:result') {
      if (Array.isArray(m.files)) keepHeld(m.files);
      const reply = hosted.reply; hosted.reply = null; reply(m.state);
      // A tap that reached the chat closes the page in the inbox, so it reads as answered now, as its Archive shows it.
      if (m.state === 'sent') closePage();
    } else if (m.type === 'inbox:file-result' && waiting[m.ref]) {
      const done = waiting[m.ref];
      delete waiting[m.ref];
      done(typeof m.id === 'string' && /^[0-9a-f]{32}$/.test(m.id) ? { id: m.id } : { error: typeof m.error === 'string' ? m.error : 'it was not sent; try again' });
    }
  }
  // Back and the workspace sit first in the page, so they scroll away with its words; the inbox's own bar stays put.
  function backRow(workspace) {
    const row = document.createElement('div'), back = document.createElement('button');
    row.className = 'back'; back.type = 'button'; back.className = 'btn-ghost'; back.textContent = 'Back';
    back.addEventListener('click', function () { post({ type: 'inbox:back' }); });
    row.appendChild(back);
    if (typeof workspace === 'string' && workspace) {
      const where = document.createElement('span');
      where.className = 'muted'; where.textContent = workspace; row.appendChild(where);
    }
    document.querySelector('main > header').prepend(row);
  }
  // A closed or answered page in the inbox is read-only: no button, no note, no answer or file.
  function closePage() {
    readOnly = true; document.body.classList.add('read-only');
    all('.form input, .form textarea', function (el) { el.disabled = true; });
    render();
  }
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (hosted || window.parent === window || e.source !== window.parent || !e.ports || !e.ports[0] || !m || m.type !== 'inbox:hello'
      || typeof m.version !== 'string' || !Array.isArray(m.actions)) return;
    // The files the app still holds for this page, checked once its notes arrive.
    hosted = { reply: null, held: Array.isArray(m.files) ? m.files : null };
    port = e.ports[0];
    port.onmessage = function (ev) { heard(ev.data); };
    document.querySelectorAll('.theme-toggle').forEach(function (button) { button.remove(); });
    look(m.theme);
    // Notes live with the inbox page: this frame has no storage of its own.
    store = { setItem: function (key, value) { post({ type: 'inbox:notes-set', key: key, value: value }); } };
    post({ type: 'inbox:notes-get', key: KEY });
    backRow(m.workspace);
    if (m.readOnly === true) { closePage(); return; }
    setLive('inbox'); offer(m); render();
  });
  // In a frame, a link opens its own tab and a # link scrolls in place: the frame never leaves this page.
  // A srcdoc page resolves #why against the inbox's address, so following it would load the inbox here.
  document.addEventListener('click', function (e) {
    const a = window.parent !== window && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.charAt(0) !== '#') { a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
    e.preventDefault();
    if (href.charAt(1) === '/') { jump(href); return; }
    let el = null;
    try { el = document.getElementById(decodeURIComponent(href.slice(1))); } catch (err) { /* a bad escape names nothing */ }
    if (el) el.scrollIntoView({ block: 'start' });
  }, true);
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
