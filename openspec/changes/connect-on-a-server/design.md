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

### 3. The watch link: one live view for the whole run

A new `hand-over.mjs open --watch --session connect-<hash> --note <line>` mode opens a live view that the agent drives. It holds the computer's one live view, the same tunnel, secret and 8-hour limit as `--view`, and the same page ([`view-page.html`](../../../.agents/skills/hand-over/scripts/view-page.html)) with a control state kept in the link's state file:

| `control` | The page shows | Taps reach the browser | `browser.mjs` commands |
|---|---|---|---|
| `assistant` | the agent's line, *Stop*, *Take over* | no (noVNC `viewOnly`) | run |
| `person` (take over) | *You have the browser*, *Stop*, *Hand back* | yes | refused: `CONNECT_PAUSED=taken-over` |
| `turn` (sign-in) | *Your turn: sign in to <tool>*, the type box, *Stop* | yes | refused: `CONNECT_PAUSED=your-turn` |
| `stopped` | *Stopped. Go back to the chat.* | no | refused: `CONNECT_STOPPED` |

- **Start.** `browser.mjs watch` (Camoufox only) opens the key-making page's session and runs `open --watch`; it prints `HANDOVER_LINK`. The agent runs `hand-over.mjs wait` in the background and ends its turn on the link. `wait` returns `opened` on the page's first load; a chat reply *go* starts the run too, and the agent then leaves the watch open and goes on.
- **The line.** Each `browser.mjs` command sets the line before it acts (`hand-over.mjs line <text>`, through the helper's state file): *Opening notion.so…*, *Clicking New integration…*, *Making a key that only reads…*, *Key saved, ends in …91c0*. A clicked part's name comes from the snapshot after `maskKeys()`, so the line never holds a key.
- **Take over / Hand back / Stop.** The page posts to new helper routes (`take`, `give`, `stop`), which set `control`. `take` and `stop` also wake the chat ([`lib/wake.mjs`](../../../.agents/skills/hand-over/scripts/lib/wake.mjs)) so an idle agent hears it. Every `browser.mjs` command reads `control` first, so a take over between two commands stops the next one. On `CONNECT_PAUSED=taken-over` the agent runs `wait` in the background (`handed-back` or `stopped`) and ends its turn; on `handed-back` it reads the page afresh. A chat *stop* runs `browser.mjs done --stopped`.
- **Sign-in turn.** `browser.mjs sign-in --tool <title>` checks the page is its own and shows a sign-in, then starts a turn as `hand-over.mjs turn` does, with `--until` the key page's own path, exact or with any query (`"<origin><path>"` or `"<origin><path>?**"`, never a wider `**`), `--until-gone "input[type=password], input[type=email], input[autocomplete~=username], input[autocomplete~=one-time-code]"`, and `--note "Sign in to <title>. I go on once you're in."`. Both finishes must hold, so an email-first step at the key page's own address, a key page at a site's root (`https://www.notion.so/` does not match `/login`), or a code page after the password does not end the turn. A turn whose finish already holds is refused, as a view's is, since it would end before the person signs in. When they hold, `control` goes back to `assistant` and `wait` returns `signed-in`. When the person did not open the watch link (they said *go*), the agent's turn-ending message repeats the link. A site that lands on its dashboard meets no finish: the person taps *Hand back*, which ends the turn too, and the helper's next `open` of the key page and `read` decide: signed in → make the key; a sign-in, a passkey prompt, or a refusal → the key link at the end.
- **End.** `browser.mjs done` closes the helper's page and the watch; the page says *All done. Go back to the chat.*

The request to connect covers the watch and every turn; the skill asks no *Ready?*. A first-time install of Camoufox or the live view's tools still asks once, by their own rules. `HANDOVER_NEEDS=live-view` and the one-view refusal pass through `watch` unchanged; with another chat's view open, the run waits for it, or takes the key link if the person says so.

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

**Parts.** The live view's browser area and its type box, which, with the view itself, takes a paste; one status line (a tag for who has the browser, the site's address, the agent's line); two buttons. No new part.

### Review

The plan's [review page](review.html) sketches the three states, phone-first, under *You watch the assistant click through each tool* (assistant working; you have the browser) and *When you are signed out of a tool* (your turn).

## Risks / Trade-offs

- [A site refuses Camoufox, or asks for a passkey] → one sign-in turn per site, then the key link for that tool; the run goes on.
- [The turn's finish never holds because the site lands elsewhere] → *Hand back* ends the turn; the re-read decides.
- [The watch screen shows a new key] → it is the person's own key, on a private link that closes at the end; the agent's reading and pictures still hide it.
- [A take over arrives while a command is running] → that one command finishes; the next is refused. Each command is one click or one read, so nothing half-done is left but a page the person now holds.
- [The watch holds the computer's one live view for the run] → another chat's view waits, and says which chat holds it; a run is minutes.
- [An errand's page and the connect page share one screen] → the live view already raises its page and resizes it each minute.
- [Matthew called a live browser link a bad experience on 2026-10-05] → the watch asks nothing of the person but a sign-in; it is one link, and the chat works without opening it.
- [Sign-ins stay in the everyday browser] → the person chose it; the proposal says so in plain words.
- [`client.valueOf` lets a script read a secret box] → it is not on the CLI; only `browser.mjs` and `take-key` call it, and the value never prints.

## Migration Plan

Additive for installs. The rename is internal to the skill; nothing outside `connect/` calls `chrome.mjs`. CHANGELOG **Updating.**: nothing to do by hand.
