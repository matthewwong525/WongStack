<!-- openspec-archive v1 2026-10-08-live-view-for-robot-checks -->
<!-- file proposal.md utf8 18730 -->
# Tap through a robot check in a live view

**Status:** ready-to-ship
**Branch:** test-browser-auth
**Open questions:** none

## Why

On 2026-10-08 Messenger took the saved password, then asked *I'm not a robot*. Nothing let you tick that box in the assistant's browser, and ticking it on your own phone doesn't sign the assistant in. So a saved password alone can't get the assistant into a site that adds a check. A trial the same day got through: a private link showed the assistant's browser, you did the puzzle, and Messenger signed in. It took two fixes on the way, and this plan keeps both.

## What Changes

- **A robot check gets a live view you tap through.** When a site asks whether a person is there, with a tick box or a picture puzzle, the assistant asks if you're ready. Then it sends a private link that shows its browser on that page. You tick the box or do the puzzle. The link closes itself once the site lets you through, and the assistant carries on. The assistant never ticks or solves a check itself.
  ```text
  site shows a check
        │
        ▼
     "Ready?" ─▶ live view ─▶ you tap through
                                   │
              ┌────────────────────┤
              ▼                    ▼
        site moves on        still refused
              │                    │
              ▼                    ▼
        carries on           steps for you
  ```
- **The live view, on a phone.** The assistant's browser fills the page, with one box under it and no buttons. Tap a box in the browser, then type in ours: each letter goes straight into the browser as you type it. It ends on a plain line and tells you to go back to the chat.
  ```text
  ┌──────────────────────────────┐
  │ facebook.com/...             │
  │                              │
  │  Your name [Matt|]           │
  │  [ ] I'm not a robot         │
  │                              │
  ├──────────────────────────────┤
  │ [Matt|                     ] │
  └──────────────────────────────┘
    before you type:
  ┌──────────────────────────────┐
  │ [Tap a box above, then type] │
  └──────────────────────────────┘
    while it connects:
  ┌──────────────────────────────┐
  │ Opening the browser...       │
  └──────────────────────────────┘
    once the site lets you through:
  ┌──────────────────────────────┐
  │ Done. Go back to the chat.   │
  └──────────────────────────────┘
    closed, or out of time:
  ┌──────────────────────────────┐
  │ This link has closed.        │
  │ Ask in the chat for a new    │
  │ one.                         │
  └──────────────────────────────┘
  ```
- **The whole page fits your screen.** In the trial you saw only the top-left corner, because the browser's window was twice the size of the screen being shown. The view now fits the page to what you hold, narrow on a phone and wide on a laptop, and puts it back when the link closes.
- **The page no longer closes under you.** The assistant's browser closes any page left alone for 5 minutes, and your taps don't count as use. In the trial that blanked the view and restarted the puzzle. Now a page stays open for as long as a link is using it.
- **Card forms get the same fix.** A card form you take more than 5 minutes over can fail today for the same reason, with nothing sent. It stays open now too.
- **You can type and paste from a phone.** There is no send button. What you type, delete, or paste in the box happens in the browser at once, letter by letter, and so do Enter and Tab. A box in the browser that already holds text is no trouble: you add to it, or keep deleting. When your phone's keyboard opens, the box sits on top of it and the browser stays in sight above.
- **It stays open for eight hours, and it can drive a browser signed in as you.** Anyone who gets the link while it's open can use the accounts that browser is signed in to. It closes when the site lets you through, when you say *done* in the chat, or after eight hours. The page has no close button: you close the tab. Only one private link is open at a time, and the view needs the link's own secret.
- **Only for robot checks.** A password, a code, a card, and an ordinary answer keep the routes they have. *Let me take over* still opens nothing anywhere else. A passkey or an approval on your phone stays on your own device: neither can travel through a view of another computer's browser.
- **A site that still refuses after your try ends with steps for you**, as today. Each site gets one live view per task, so a site that won't be satisfied isn't tried again and again.
- **After a sign-in, the assistant looks for a check.** *Accepted* only means the password page was passed. The assistant reads the next page and offers the live view when it's a check, before saying it's signed in.
- **Three small tools, installed once with your yes.** One goes in your home folder. Two need admin rights on the computer, which the browser itself did not.
- **On a Mac, nothing changes yet.** There the assistant's browser has no screen to show, so a check still ends with steps for you.

Non-goals: no service that solves checks, no second browser, no hired network address, no live view for anything but a check, no Mac support, and no change to how long the other private links stay open.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: a check that asks whether a person is present goes to a live view the person taps through, with steps only when the site still refuses or the machine can't show one; the ban on any live view narrows to everything but such a check; a page stays open while a private link is using it.
- `dependencies`: the live view's tools join what a machine may need, installed on first use with consent, two of them with admin rights.

## Impact

- `.agents/skills/hand-over/scripts/hand-over.mjs`: a fourth mode, `open --view (--until <glob> | --until-gone <selector>) [--session <name>] [--note <line>] [--minutes N]`, default 480 minutes; `HANDOVER_NEEDS=live-view` (exit 3) and `HANDOVER_VIEW=unsupported`; a keep-alive for any link that works on a page (`--form` and `--view`).
- New `.agents/skills/hand-over/scripts/view.mjs` (screen source, fit, front, restore), `lib/ws-bridge.mjs` (the keyed screen connection), `view-page.html` and `view-page.mjs`; new `scripts/tests/view.test.mjs`, `ws-bridge.test.mjs`, `view-page.test.mjs`; additions to `scripts/tests/hand-over.test.mjs` and its fake camofox server.
- `.agents/skills/browser/scripts/browse.mjs`: its client gains the resize, evaluate, and keep-alive calls the watcher needs; no new command.
- `.agents/skills/hand-over/SKILL.md`: one line for the fourth mode, inside the word budget.
- New `wiki/development/live-view.md`; edits to `browsing.md` (at its 3,000-word cap, so each addition replaces text with a link), `login-codes.md`, `required-tools.md`, and the `development/README.md` hub.
- `.agents/skills/update-dependencies/scripts/update.mjs`: knows the pinned viewer version.
- New on a machine, not in the repo: noVNC 1.6.0's `core/` and `vendor/` files from its source release in `~/.wong-stack/live-view/`, checked against a recorded fingerprint; system packages `x11vnc` and `xdotool`. Linux only, where camofox runs on a virtual screen.
- The unpublished plan `links-active-eight-hours` (workspace `musing-cat`) edits `hand-over.mjs`, its test, and `browsing.md`; whichever publishes second merges by hand. This plan leaves the other links' time limits to it.
- `CHANGELOG.md` *Next (minor)* entry.

## Decision log

- **2026-10-08** — Asked to test whether the assistant can sign in to a site with a saved password → tried Messenger: the password link saved the login, the sign-in was accepted, and a robot check stopped it.
- **2026-10-08** — Asked to be handed the check, *i'll click into it* → told nothing shows the browser since 34.0.0; he recalled the screen viewer from the 2026-10-07 trial.
- **2026-10-08** — Asked how to get the live view back → chose a quick trial now over a plan first. The trial signed Messenger in after two fixes: fitting the window, and keeping the page open.
- **2026-10-08** — Asked to package the trial into a plan with every correction → this plan.
- **2026-10-08** — Asked where to plan it, given the unpublished eight-hour links plan edits the same code → chose keep going here.
- **2026-10-08** — Asked which stops get the live view → chose any robot check, at a site's front door or after a sign-in.
- **2026-10-08** — Asked how long a live view stays open → chose eight hours, over the recommended 30 minutes and over 10 minutes.
- **2026-10-08** — Asked whether to fix the 5-minute fault for card forms here → chose fix it here.
- **2026-10-08** — Assumed: passkeys and phone approvals stay out, because a passkey lives on the person's own device and can't be used through a view of another computer; the 2026-10-07 note that named them for the live view was wrong on this.
- **2026-10-08** — Assumed: the assistant asks *Ready?* before sending the link, as it does for a password link and a private form, because the link can drive a signed-in browser and a puzzle on the page can go stale.
- **2026-10-08** — Assumed: the view is served by the private link's own page behind its own secret, not by the trial's separate helper with an 8-character password, because this link can use the person's accounts; it also needs one tool fewer.
- **2026-10-08** — Assumed: the page is fitted with the browser's own resize call, not the window tool the trial used, because a check on 2026-10-08 showed that call resizes the window too (2560x1385 to 1280x697); the window tool only brings the page to the front.
- **2026-10-08** — Assumed: the view fits a phone first, because the chat that asks *Ready?* is most often read on one.
- **2026-10-08** — Assumed: the screen viewer comes from npm at one pinned version into the home folder, and the other two tools from the system's packages, because a pinned viewer is the one tested and the other two have no home-folder install.
- **2026-10-08** — Assumed: one live view per site per task, then steps for the person, because repeats at a site that keeps refusing can lock the account.
- **2026-10-08** — Assumed: a Mac is left for later, because the browser runs there with no screen to show.
- **2026-10-08** — Assumed: the other private links keep their time limits here, because the eight-hour links plan owns them.
- **2026-10-08** — Assumed: the live view gets its own guide page, because the browsing guide is one word under its 3,000-word cap.
- **2026-10-08** — Assumed: a minor release, because it adds behavior and breaks nothing an install relies on.
- **2026-10-08** — Building: the three proofs in the first task group were run in the chat before the build, because they need this machine's real browser and a download outside the repo, which the build helper may not do.
- **2026-10-08** — Building: the screen is reachable over a private socket with no browser restart, as planned. Found on the way: the screen tool still opened a network port with no password unless told twice not to. The plan now closes it and refuses to open a link if any port is open.
- **2026-10-08** — Building: the screen viewer does not come from npm after all, because that package can't load in a browser. It comes from the viewer's own 1.6.0 release, into the home folder, and is checked against a recorded fingerprint before use. These are the same files the trial used.
- **2026-10-08** — Building: the link reads the page's size and starts the screen before it opens its address, and keeps both in its own record. So the page is put back and the screen stopped even when the link's helper has died.
- **2026-10-08** — Building: the recorded fingerprint was checked against the copy of the viewer already on this computer. It matches when the files are sorted by path as plain bytes, so the install sorts them that way.
- **2026-10-08** — Building: where the assistant can't use admin rights without a password, the install adds nothing at all, the viewer included, and prints the one command for the person.
- **2026-10-08** — Building: text sent from the type box travels through the screen's clipboard, which carries only Western European letters; any other character arrives as `?`. Left as it is: the trial worked the same way.
- **2026-10-08** — Building: the line *the browser runs with no window* came out of the browsing guide, because a live view now shows that window.
- **2026-10-08** — Building: after a link that closed or ran out, the guide has the assistant offer a new link only when the person never got to the check. A try the site refused counts as that site's one view.
- **2026-10-08** — Building: the tests were run once, with the local checks at the end, not after each group of tasks.
- **2026-10-08** — Building: two faults found by trying the built link on the real browser, both fixed, neither visible to the automated tests because they use stand-ins. The link's page could say *closed* on an open link, because it started before the screen viewer had finished loading; it now waits for it. And an extra guard flag on the screen tool made it drop every connection; it is removed, and the check that no network port is open stays.
- **2026-10-08** — Asked whether to install the screen viewer and test on the real browser → chose install and test.
- **2026-10-08** — Building: two more faults found by trying a phone-sized view from a separate browser, both fixed. On the phone fit the page's window was not kept in front, because the browser's window can't go narrower than about 500 and the match wanted exactly 480. And the keyboard could stay with another page on the same screen, so typing could land in the wrong page; the page's window now gets the keyboard whenever it is brought to the front.
- **2026-10-08** — Building: checked on the real browser: a view left untouched for 13 minutes kept its page; a card form left for 7 minutes still filled a pretend checkout; the screen refuses a missing or wrong secret; no network port serves the screen; closing puts the page's size back and removes the screen tool's folder; a second task's page does not stay in front; typed text, *Send*, and *Delete* reach the page from a phone-sized browser after a tap in the box.
- **2026-10-08** — Building: while testing typing, the assistant's own blind click ticked the test tick box on its pretend page (Google's public test widget, not a real site's check). The page was reloaded; the person's own run starts unticked.
- **2026-10-08** — Assumed: the install's *no* path is left to its automated test and the guide, because the person said yes when asked and a second ask only to hear a no would waste his time.
- **2026-10-08** — Asked why the page puts a frame around the browser, *it was better when i was testing it out and logging in* → told it was for typing and closing. Asked how the page should look → answered: *we need a better UI for this sort of thing maybe like tuck away and a button to type that opens up a textbox*, and *when it's in type mode it's clearly communicated to us that it's typing and what's happening and will paste it in*. The browser now fills the page; typing and closing sit behind two buttons.
- **2026-10-08** — Building: the typing panel sits above the browser and moves it down, because drawn over the browser it covered the box being typed into. A send with a character the screen can't carry is refused and names it, because it would arrive as a question mark.
- **2026-10-08** — Building: a viewer that fails to load is tried again twice, then the page says to reload, because a page left on *Opening the browser...* gave no way forward. Seen with a test browser on a server whose temp space was full.
- **2026-10-08** — Asked to try the tucked-away layout → answered: no *Pretend Shop wants to know...* line in the bar, and *have like the send button and the input box on the left already*, *kind of like messaging someone*. The bar is now a box, *Send*, and *More*, always there; the line about what the site wants is the page's title only; the typing mode and its button are gone.
- **2026-10-08** — Asked to try the messaging-style bar → answered: remove *More*, *no need for close without finishing we'll just close the browser*, no line saying a key was pressed, and *as they type it'll update the screen as well*, *no need for send button*. The page is now the browser and one box that types straight into it; nothing else.
- **2026-10-08** — Building: each change to the box is sent as key presses, a Backspace per character that went and then each that came, because that carries a phone's autocorrect and a paste as they look. Tried on the real screen: capitals, punctuation, an accented letter, a Chinese character, and a delete all arrived. The earlier paste-through-the-clipboard route and its plain-characters limit are gone.
- **2026-10-08** — Assumed: the page does not read what a box in the browser already holds to fill ours, though he said it would be cool, because the link's promise is that its helper reads nothing on the page, a password box would be read too, and a check's own boxes sit in a frame that can't be read. Typing live already adds to or deletes what is there.
- **2026-10-08** — Asked for a phone run and a laptop run before publishing → he did one run on the final layout, which passed end to end, and typed `/ship`. The second device and a real picture puzzle on this build were not run; the plan's last check is recorded as what was seen.
- **2026-10-08** — Archive checkpoint: built, tried on the real browser and by the person once on the final layout, main merged in with three files resolved by hand (the eight-hour default now covers every link), numbered 38.3.0.

<!-- end proposal.md -->
<!-- file design.md utf8 15304 -->
# Design

## Context

See proposal.md for why. What shapes the how:

- camofox (1.18.1) runs the browser on a virtual screen, `Xvfb`, on Linux only (`server.js` starts one when `os.platform() === 'linux'`). On a Mac the browser has no screen.
- Each page is its own X window, class name `Navigator`, at `+0+0`, with no window manager. A new page lands on top of the others.
- The screen was 1280x720 on 2026-10-08 while the window was 2560x1385: the window is sized for the look camofox presents to sites, not for the screen.
- camofox closes a tab that had no *counted* call for `TAB_INACTIVITY_MS` (default 300000), checked every 60 seconds. `snapshot`, `evaluate`, `links`, `viewport`, `click`, `type`, and `navigate` count; `screenshot` does not. A session expires after `SESSION_TIMEOUT_MS` (default 600000) without a call that sets `lastAccess`. Nothing a person does through a screen viewer is a call.
- `browse.mjs`'s client reopens a lost tab at its last address, in a new full-size window. A reopened check starts over.
- `hand-over.mjs` already owns private links: one key, one Cloudflare quick tunnel, one detached watcher, one deadline, `result.json`, `wait`, `close`, and the wake message. A private form already names its finish with `--until` and `--until-gone`.
- camofox ships a VNC plugin (`ENABLE_VNC`). It needs a browser restart, changes the screen to 1920x1080, wants `/usr/share/novnc` and `websockify`, and serves the viewer with no secret of ours.

What the 2026-10-08 trial did by hand, outside the repo: `x11vnc` attached to the running screen, `websockify` serving the system's noVNC on loopback, a quick tunnel, an 8-character VNC password in the link's fragment, `xdotool windowsize` for the fit, and a `browse.mjs snapshot` every minute to keep the page.

## Goals / Non-Goals

**Goals:**

- A live view is a fourth private-link mode with every property the other three have.
- No browser restart to open one, and none to close it.
- The page a link works on outlives camofox's idle limits, for a form as for a view.
- The view never lets the agent learn or do anything on the page: it only carries the person's input.

**Non-Goals:**

- camofox's own VNC plugin, `websockify`, or the system's noVNC package.
- Raising camofox's idle limits for every page: a forgotten task's page should still be closed.
- A view of anything but the one page the task has open.
- A Mac, another Linux display server, or a browser started with a real desktop window.

## Decisions

### A fourth mode of `hand-over.mjs`, not a new script

`open --view (--until <glob> | --until-gone <selector>) [--session <name>] [--note <line>] [--minutes N]`. It reuses the key, tunnel, lock, watcher, deadline, `wait`, `close`, and wake path, and the form's finish test (`finished`, `seen`, `reachesFinish`). `--minutes` defaults to 480 for a view. `--note` is the one line the page shows, such as *Messenger wants to know you're a person*; it rides in the state file, never a value from the page.

`open` refuses, before any tunnel, when the session has no page or the page already meets the finish, as a form does. It prints `HANDOVER_VIEW=unsupported` (exit 1) off Linux or when camofox has no virtual screen, and `HANDOVER_NEEDS=live-view` with a line naming each missing tool (exit 3) when one is absent.

Results: `done` when the finish is met, `closed` on the page's button or `close`, `timeout`, `error`. Only `done` announces readiness. Every end restores the page's size, stops the screen source, removes its socket folder, and kills the tunnel.

*Alternative: enable camofox's VNC plugin.* Rejected: a restart drops the page with the check on it, and the plugin's viewer sits outside the link's key.

### The screen comes from `x11vnc` on a private Unix socket

The watcher finds the screen from the running browser: `DISPLAY` in the browser process's environment, the process being the child of the server whose pid `~/.wong-stack/camofox/server.json` holds. camofox's own helper (`plugins/vnc/vnc-watcher-lib.sh`, `display_for_xvfb_pid`) is the fallback method: map the `Xvfb` child's sockets through `/proc/net/unix`.

It starts `x11vnc -display <d> -unixsock <dir>/screen.sock -rfbport 0 -rfbportv6 0 -nopw -forever -shared -noxdamage -quiet`, where `<dir>` is a fresh mode-0700 folder under `~/.wong-stack/hand-over/`. No TCP port opens, so nothing on the computer but the person's own user can reach the screen, and the file permission is the guard.

Proved on 2026-10-08 with x11vnc 0.9.17 on the running camofox, no restart: the socket answered `RFB 003.008`. `-rfbport 0` alone still left a listener on `[::]:5900`, open to the network with no password; `-no6` and `-noipv6` did not close it, and `-rfbportv6 0` did. So `open`, which starts it before any tunnel, also checks after the start that `x11vnc` holds no TCP listener, and stops it and fails if it does. `-localhost` stays out: tried on the real link the same day, it made x11vnc drop every client on the Unix socket after its first line, so the viewer connected and dropped in a loop; without it the full handshake completes and no port opens. The browser process to read `DISPLAY` from is `camoufox-bin`; the server's other children carry an inherited value.

If `x11vnc` exits while the link is open, the watcher starts it again on the browser's current screen; the page reconnects.

### The watcher bridges the screen itself, behind the link's key

`lib/ws-bridge.mjs` answers the page's WebSocket at `/screen` on the watcher's own server and pipes it to the Unix socket: the handshake, masked client frames of any length, fragments, ping, pong, and close, in Node built-ins. A browser WebSocket can send no custom header, so the key travels as the WebSocket subprotocol, compared with `keyMatches`; a missing or wrong key gets 401 and no upgrade. A query string was rejected because it would reach Cloudflare's request line.

The page's other routes take the key in `x-hand-over-key`, as every mode does: `GET /view` (the note, the deadline, the fit), `POST /fit`, and `POST /done`. The viewer's own modules are served unkeyed from `GET /novnc/...`, limited to the pinned viewer's `core/` and `vendor/` folders: they are public code and a static `import` can carry no header.

*Alternative: `websockify`, as trialled.* Rejected: it is a second server on its own port with no key of ours, guarded only by VNC's 8-character password, and one more tool to install.

### The viewer is noVNC 1.6.0's source release, pinned by its files

`hand-over.mjs install-view` downloads `https://github.com/novnc/noVNC/archive/refs/tags/v1.6.0.tar.gz`, unpacks only `core/`, `vendor/`, and `LICENSE.txt` into `~/.wong-stack/live-view/novnc-1.6.0/`, and checks them against a recorded fingerprint before use: the SHA-256 of the `sha256sum`-format lines for every file under `core/` and `vendor/`, sorted by path as bytes (`25e27eaae3c616d207ea020ef40d3ba066f4dbaf47ef506fd0457975a137d17a`, 56 files, about 700 KB). A mismatch installs nothing. The fingerprint is over the files, not the archive, so a re-packed archive with the same files still passes. The version and fingerprint sit in one constant in `view.mjs`; `update.mjs` surveys the version as it does camofox's.

Proved on 2026-10-08: served as plain files, `core/rfb.js` imports in the browser with no build step and has `clipboardPasteFrom`, `sendKey`, and `disconnect`. These are the same files the trial used from the system package.

*Alternative: `@novnc/novnc` from npm.* Rejected on the same proof: the 1.6.0 package holds only a CommonJS `lib/`, and its `lib/util/browser.js` has a top-level `await`, which fails to load. *Alternative: the system package.* Rejected: its version differs by distribution and it pulls in `websockify`.

`x11vnc` and `xdotool` have no home-folder install. `install-view` runs `apt-get install -y --no-install-recommends x11vnc xdotool`, through `sudo -n` when not root. With no `apt-get`, or a `sudo` that wants a password, it prints `HANDOVER_INSTALL=manual` and the one command for the person to run, and installs nothing.

### Fit with camofox's own resize; `xdotool` only raises

`POST /tabs/:tabId/viewport` resizes the window, not only the page: checked on 2026-10-08, a 2560x1385 window became 1280x697 for a 1280x640 viewport. So the fit needs no window tool and names the right page by its tab.

- **Sizes.** The screen's size comes from `xdotool getdisplaygeometry`. The window's bar height is the window's height less the viewport's after the first resize (57 on 2026-10-08), which makes the page as tall as the screen to read it. The wide fit is the screen's width by its height less the bar. The phone fit is 480 wide by the same height, and the page shows only that strip of the screen.
- **Which fit.** The page reports `phone` or `wide` from its own width through `POST /fit`, on connect and on rotate. Until it does, the fit is wide.
- **Restore.** Before any tunnel, `open` reads the page's size with one `evaluate` of `[innerWidth, innerHeight]` and keeps it in the state file. Every end sets it back, also the end of a link whose watcher died.
- **Front.** The page's window is the `Navigator` window (`xdotool search --classname Navigator`; `--class` finds nothing) whose size equals the fit. The watcher raises it with `xdotool windowraise` on every poll, so another task's new page covers it for one poll at most.

*Alternative: `xdotool windowsize`, as trialled.* It works, but it guesses the window, and a reopened page needs it again.

### One keep-alive for any link that works on a page

While a `--form` or `--view` link is open, the watcher makes one counted call a minute on the page:

- **A view** sends its fit again. It counts, changes nothing when the size is unchanged, and refits a page that was reopened.
- **A form** sends `evaluate` of a constant. It counts, reads nothing, and leaves the refs alone. The trial's `snapshot` is not used: a snapshot renumbers refs, and the form types by ref.

The form's promise changes from *sends the browser nothing until the person's one send* to *nothing that types, presses, navigates, or reads*. No value is on the page before the send, and none is read after it.

Proved on 2026-10-08 on a real camofox, three pages side by side for 13 minutes: the page sent a constant `evaluate` each minute and the page sent its own size each minute both stayed (same tab, 200), the page sent nothing was closed (404), the session lasted, the first page's refs were the same before and after, and the second page's size was unchanged.

*Alternative: start camofox with longer limits.* Rejected: it needs a restart, and a page a task forgot would then live as long.

### The agent's steps live in the wiki

`wiki/development/live-view.md` owns when and how: read the page again once in case the check clears; ask *Ready, send it / Not now*; `open --view` with the finish; send the link; `wait` in the background; hands off and no pictures until it prints; then a fresh snapshot and a picture. One live view per site per task; when a view ends with the check still there, or the site shows a second one, the site [ends with steps](../../../wiki/development/browsing.md#when-a-site-refuses-the-browser). `browsing.md` is at 2,999 of 3,000 words, so its edits swap sentences for links to the new page.

`login-codes.md` gains the check beside the code step: after `login`, `accepted` means the address left the login page, so the agent reads the next page for a check before a code.

## UX

### Use-case brief

The owner, or a teammate whose assistant is running an errand, gets a chat message on their phone: a site wants to know a person is there. The job: tick the box and do the puzzle in the assistant's browser, in under a minute, then get back to what they were doing. Done is the site moving on and the page saying so. Context: a phone, one hand, often interrupted; sometimes a laptop. Common case: one tick, one picture round. Edge cases: a second round, a text box to fill, a link opened hours later, a link that already closed. Frequency, assumed: a few times a month per person, mostly on a first sign-in to a new site.

The closest existing screen is the private form's page (`form-page.html`): the same title line, note, single column, end states, and close button.

### Flow

Open the link → the browser fills the page, already on the check → tap → the page says *Done. Go back to the chat.* No sign-in, no connect button, no settings. To type: tap a box in the browser, then type in the one box under it; each key lands as it is pressed. Leaving is closing the tab. A dead link shows one line and nothing to tap.

### Hierarchy

- **Live:** the browser's picture is the page. One box under it, no buttons, no status lines: what the site wants is the page's title.
- **Connecting, done, closed:** one line each, nothing else on the page.

### Review

[review.html](review.html). The item *The live view, on a phone* sketches the live state, the empty box, and the connecting, done, and closed states.

### Components

Reused from the private form's page: the end-state line and the keyed fetch helper. New: the viewer's canvas holder, which crops to the phone strip and scales to the room above the box, and the box. Each change to the box becomes key presses through the viewer's `sendKey`: a Backspace per character that went, then each that came. The viewer's own clipboard panel failed for the person on 2026-10-07 and is not used; nothing goes through the clipboard.

## Risks / Trade-offs

- [The link can use every account the browser is signed in to, for up to eight hours] → the person's choice, said in the proposal and the guide; the key guards every route and the screen; one link at a time; it closes on the finish; *done* in the chat closes it.
- [The person can go anywhere in the view, the address bar included] → it is their browser. The agent takes a fresh snapshot after every view and trusts nothing from before it.
- [Another task's new page shows on top for up to one poll] → the raise on every poll; the guide says tasks share the screen.
- [A site may refuse a real person in this browser too] → one view per site per task, then steps.
- [A resized window is a new signal to a site] → the size goes back at every end.
- [The keep-alive is read from camofox's code] → task 1.3 runs it for 13 minutes on a real camofox before the build relies on it.
- [GitHub stops serving the release archive, or the files change] → the install fails closed with the fingerprint named, and the agent gives the person steps instead.
- [The fit on a real phone, and typing from one, are untried] → the verification group needs the person, on a phone and a laptop.
- [The eight-hour links plan edits the same files] → this plan adds a mode and leaves the other modes' defaults alone; the second to publish merges by hand.

## Migration Plan

Nothing to migrate. An install that never meets a check installs nothing. Rollback is the previous release: the mode is additive, and the tools it installed are removed by deleting `~/.wong-stack/live-view/` and the two packages.

## Open Questions

- Whether a phone held sideways should get the wide fit or a taller one. The page reports its shape either way; the sizes are two constants.

<!-- end design.md -->
<!-- file tasks.md utf8 9430 -->
# Tasks

## 1. Prove the three unrun pieces on a real camofox

- [x] 1.1 Attach `x11vnc` to the running camofox screen over a Unix socket (`-unixsock`, `-rfbport 0`, `-nopw`) with no browser restart, finding the screen by the design's method; verify a raw RFB handshake reads back from the socket and no TCP port opened (`ss -ltn`). On failure, record the loopback-port fallback in the design's screen decision.
- [x] 1.2 Install `@novnc/novnc@1.6.0` into a scratch folder and load `core/rfb.js` as a browser module from a plain static server; verify it imports with no build step and note the folders it needs. On failure, record the layout that works in the design's viewer decision. (Failed for npm; the source release works and is recorded.)
- [x] 1.3 On one open page, send the form's keep-alive (a constant `evaluate`) once a minute for 13 minutes with nothing else; verify the tab and session are still there, and that a snapshot before and after gives the same refs. Repeat with the view's keep-alive (the same viewport again). Record both in the design's keep-alive decision.

## 2. The browser client (`.agents/skills/browser/scripts/browse.mjs`)

- [x] 2.1 Add to the exported client the calls the watcher needs: set the page's size, read it, and the constant keep-alive, each without starting a browser or retrying, as the form's client calls do; add them to the fake camofox server; verify `browse.test.mjs` covers each call, a lost tab, and that no command-line surface changed.

## 3. The screen connection (`.agents/skills/hand-over/scripts/lib/ws-bridge.mjs`)

- [x] 3.1 Write the bridge: the upgrade handshake, the key as subprotocol checked with `keyMatches`, masked client frames at all three length sizes, fragments, ping, pong, close, and unmasked binary frames back, piped to a socket path; verify `ws-bridge.test.mjs` covers each against a fake socket server, plus a missing key, a wrong key, and a wrong path, none of which upgrades.

## 4. The view (`.agents/skills/hand-over/scripts/view.mjs`)

- [x] 4.1 Write the checks `open --view` runs first: Linux, camofox running with a virtual screen, `x11vnc`, `xdotool`, and the pinned viewer present; verify `view.test.mjs` covers `unsupported`, each missing tool named, and all present, with fake binaries named by test-only environment variables.
- [x] 4.2 Write `install-view`: download the pinned source release, unpack only `core/`, `vendor/`, and the licence into `~/.wong-stack/live-view/`, refuse files that miss the recorded fingerprint, then the two system packages through `apt-get`, with `sudo -n` when not root, and `HANDOVER_INSTALL=manual` plus the one command when neither works; verify by test with a local archive, a fake `apt-get`, and a fake `sudo`: a good archive installs, a changed file installs nothing, and nothing is installed on the manual path.
- [x] 4.3 Write the screen source: find the screen, start `x11vnc` on a socket in a fresh mode-0700 folder, restart it if it exits, and stop it and remove the folder at the end; pass `-rfbport 0 -rfbportv6 0` and never `-localhost`, and stop it and fail when it holds any TCP listener; verify by test with a fake `x11vnc` that the folder's mode is 0700, both port flags are passed, a source with a listener fails the open, and a killed source comes back.
- [x] 4.4 Write fit, front, and restore: read the page's size once, fit wide or phone from the screen's size and the measured bar, raise the window whose size equals the fit, and set the first size back at the end; verify by test against the fake server and a fake `xdotool` that restore runs on `done`, `closed`, `timeout`, and a signal, and that `--classname` is the search used.

## 5. The link (`.agents/skills/hand-over/scripts/hand-over.mjs`)

- [x] 5.1 Add `open --view` with `--until`, `--until-gone`, `--session`, `--note`, and `--minutes` (default 480), its usage errors, and its refusals (no page, finish already met, another link open); serve `view-page.html` and `.mjs`, the keyed `GET /view`, `POST /fit`, and `POST /done`, the unkeyed viewer modules limited to the pinned viewer's two folders, and the bridge at `/screen`; verify `hand-over.test.mjs` covers each route with and without the key, a path that climbs out of the viewer's folders, and 410 once the link is ending.
- [x] 5.2 Add the view's watch loop: poll the finish as a form does, raise the window each poll, end as `done`, `closed`, `timeout`, or `error`, tear down the source and the tunnel at every end, and wake the chat only on `done` with mode `view`; verify by test that the loop sends the browser no click, type, press, navigate, snapshot, or screenshot, and that `wait` and the wake message carry no address, key, or page content.
- [x] 5.3 Add the keep-alive for `--form` and `--view`: one call a minute while the link is open, the form's stopping at the send; verify by test with a short interval that each mode sends its own call and nothing else, that a form's send still works after several, and update the header comment's *sends the browser nothing* line to the new promise.
- [x] 5.4 Update `SKILL.md` with one line for the fourth mode, cutting words elsewhere in the file to pay for it; verify `node scripts/measure-context.mjs --check` passes.

## 6. The page (`.agents/skills/hand-over/scripts/view-page.html`, `view-page.mjs`)

- [x] 6.1 Build the page from the private form's shell: the note, the viewer's canvas scaled to the width and cropped to the phone strip, the connecting, done, and closed states, and *Close without finishing*; report `phone` or `wide` on connect and on rotate; verify `view-page.test.mjs` covers each state, the fit report, and that the key leaves the page only in the header and the subprotocol.
- [x] 6.2 Add the type row: a text box and *Send* that put the text on the browser's clipboard and press Ctrl+V, and *Delete*, *Tab*, *Enter*; verify by test against a fake viewer object that each sends the expected calls and that the viewer's own clipboard panel is never loaded.

## 7. Guides and release

- [x] 7.1 Write `wiki/development/live-view.md` by the design's wiki decision, with the *Ready?* ask, the command lines, the hands-off rule, the results, one view per site per task, what the link can do and for how long, and the Mac note; link it from `wiki/development/README.md`; verify the wiki checks pass.
- [x] 7.2 Edit `wiki/development/browsing.md`: the saved-logins step and *When a step needs you* send a check to the live view; *Let me take over* opens nothing except at a check; *When a site refuses the browser* gives one view first; *How private links work* names four links; the form's hands-off line states the keep-alive. Swap sentences for links so the page stays under 3,000 words; verify the wiki checks pass.
- [x] 7.3 Edit `wiki/development/login-codes.md` to spot a check after `login` and say what `accepted` means, and `wiki/development/required-tools.md` with *Installing the live view's tools*: what each is for, which need admin rights, where they go, and how to remove them; verify the wiki checks and `node scripts/check-payload-links.mjs` pass.
- [x] 7.4 Teach `.agents/skills/update-dependencies/scripts/update.mjs` the viewer's pin and extend its test; verify the script suite passes.
- [x] 7.5 Add the `## Next (minor) — Tap through a robot check in a live view` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: nothing to do by hand, the first check asks before installing three small tools, two with admin rights, and the link can use your signed-in accounts while it is open; verify `node .github/scripts/checks.mjs --worktree` passes.

## 8. Verification

- [x] 8.1 On this machine with a real camofox, run the whole route with the person: *Ready?*, the link, the person typing into a text box and passing the check through the live view, the link closing itself, the chat woken, and the page read afterwards. (Seen 2026-10-08 on the final layout: the person typed *hello world* live, ticked the box, and continued; the link ended `done`, the chat was woken, and the page's size came back. One run, on one device of his choosing. A real picture puzzle was done by him through the trial's view on Messenger the same day, not on this build; the wide and phone fits of this build were checked by screen capture.)
- [x] 8.2 Leave a live view open and untouched for 13 minutes, then confirm it shows the same page and the check has not restarted; leave a private form open for 7 minutes on a pretend checkout page, then send it and confirm the details reach the fields.
- [x] 8.3 Confirm the guards on the real link: the screen route refuses a connection with no key and with a wrong one, no TCP port serves the screen, a closed link no longer answers (seen: 530 from Cloudflare once the tunnel is gone), and after the end the page's size is back, `x11vnc` is gone, and its folder is removed.
- [x] 8.4 With a second task opening a page while a view is open, confirm the view returns to its own page within one poll and the second task's page is unharmed.
- [x] 8.5 On a machine without the tools, confirm `HANDOVER_NEEDS=live-view` names each one, the install asks first, and a no leaves nothing installed and ends with steps for the person. (Seen on this machine: with the tools hidden it names all three and installs nothing; the person was asked and said yes. The *no* path was not acted out; the manual-path test and the guide cover it.)

<!-- end tasks.md -->
<!-- file specs/browser-logins/spec.md utf8 6498 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: A step that needs the person goes to the chat or a private form

When a browsing step needs something only the person can give, the agent SHALL get it without showing or handing over its browser, except for a check that asks whether a person is present. An ordinary form answer (an email, a name, an address, a choice, agreeing to terms) SHALL be asked in the chat and entered by the agent, and the agent SHALL NOT agree to terms without the person's yes. A sensitive value (payment card details, a backup or recovery code, or another lasting secret the page asks for) SHALL go through the private form. A password SHALL follow the password link requirements, a one-time code the login-code requirement, and an API key or token step the own-browser requirement. A check that asks whether a person is present (a tick box or a picture puzzle) SHALL follow the live view requirement. A step only the person's own device can do (a passkey or a device check) SHALL NOT be attempted by the agent: the agent SHALL stop that step and hand it back in the chat as numbered steps for the person's own device: one action each, a direct link to the page for each step that has one, the site's own labels, and the details the agent already has, never an invented address. For every step but such a check, the agent SHALL NOT offer a live view of its browser or remote control of it, including when the person asks to take over.

#### Scenario: A payment page asks for an email, terms, and a card

- **WHEN** a checkout page asks for an email, a terms tick, and card details
- **THEN** the agent asks for the email and the terms in the chat, enters them itself, and sends a private form for the card details only

#### Scenario: A picture puzzle

- **WHEN** a site shows a picture puzzle
- **THEN** the agent solves nothing, asks whether the person is ready, and sends a live view for the person to do the puzzle

#### Scenario: A passkey

- **WHEN** a site asks for a passkey
- **THEN** the agent sends no private link, stops that step, and gives the person numbered steps, each with its link, to finish on their own device

### Requirement: A site that refuses the browser ends with steps for the person

When a site refuses the personal browser, or shows a check that the person's own try in a live view does not clear, the agent SHALL say so in one line, SHALL stop browsing that site, and SHALL give the person its link and numbered steps to finish on their own device. A check that asks whether a person is present SHALL first get one live view, on a machine that can show one. The agent SHALL NOT try a second browser, SHALL NOT route its traffic through a hired or borrowed network address, SHALL NOT use a check-solving service, and SHALL NOT solve a check that asks whether a person is present.

#### Scenario: A store behind a check

- **WHEN** a DoorDash store stays on a "Verify you are human" page after the person's try in a live view
- **THEN** the agent sends no second link and gives the store's link and the steps for the person's phone

#### Scenario: The person asks the agent to solve the puzzle

- **WHEN** the person asks the agent to solve a picture puzzle for them
- **THEN** the agent declines and offers a live view for the person to do it themselves

## ADDED Requirements

### Requirement: The person passes a robot check in a live view

When a site shows a check that asks whether a person is present, the agent SHALL ask the person whether they are ready and, on a yes, SHALL send a private link that shows its browser on that page and takes the person's taps and typing. The agent SHALL NOT tick, solve, or otherwise answer the check. While the link is open the agent SHALL act on its browser in no way the person would see and SHALL take no picture. When the site lets the person through, the link SHALL close and the requesting chat SHALL be notified as for any completed private input. Each site SHALL get one live view per task. On a machine that cannot show its browser, the agent SHALL give the person steps for their own device instead.

#### Scenario: A check after a sign-in

- **WHEN** a site accepts a saved password and then shows an "I'm not a robot" check
- **THEN** the agent asks whether the person is ready, sends a live view, and once the person passes the check the link closes, the chat is notified, and the agent carries on signed in

#### Scenario: A machine with no screen to show

- **WHEN** a site shows such a check and the personal browser runs where it has no screen to show
- **THEN** the agent sends no link and gives the person steps for their own device

### Requirement: A live view shows the whole page and closes itself

A live view SHALL show the page fitted to the person's screen, on a phone as on a laptop, with the check and its buttons in view, and SHALL put the page back as it was when it closes. It SHALL let the person type and paste into the page from a phone. It SHALL open at a new address through Cloudflare's tunnel with a secret only the link carries, SHALL show and accept nothing without that secret, and SHALL stop working when the site lets the person through, when the person closes it, or at its time limit, eight hours unless a shorter one is asked, even if the agent's session has ended. A closed link SHALL never work again.

#### Scenario: A puzzle on a phone

- **WHEN** the person opens a live view on a phone
- **THEN** the whole puzzle shows, its button included, and no part of it is cut off

#### Scenario: Nobody finishes

- **WHEN** eight hours pass on a live view without the site letting the person through
- **THEN** the link stops working, the page is put back as it was, and the agent tells the person it timed out and offers a new one

### Requirement: A page stays open while a private link is using it

While a private form or a live view is open, the page it works on SHALL stay open for as long as the link does, however long the person leaves it untouched. Keeping it open SHALL type nothing, press nothing, and go to no other address, and SHALL read nothing the person typed.

#### Scenario: A slow card

- **WHEN** the person sends a private form seven minutes after it opened
- **THEN** the details reach the site's fields on the page the form was made for

#### Scenario: A puzzle left for an hour

- **WHEN** the person comes back to a live view after an hour
- **THEN** it shows the same page, not a blank screen or a page opened afresh

<!-- end specs/browser-logins/spec.md -->
<!-- file specs/dependencies/spec.md utf8 1010 -->
# Spec Delta

## ADDED Requirements

### Requirement: A live view adds its tools on first use

A live view SHALL be the one step that needs a screen viewer and the tools that show and place the personal browser's window. The agent SHALL install them the first time a live view needs them, after asking once and saying which need admin rights on the computer. The screen viewer SHALL be the one version WongStack has tried, in the person's home folder. They SHALL add nothing to the repository. On a machine that cannot have them, the agent SHALL install nothing and SHALL give the person steps instead.

#### Scenario: A first live view

- **WHEN** a task first needs a live view on a machine without its tools
- **THEN** the agent says what the install needs, admin rights included, asks, installs them, and opens the view

#### Scenario: The person says no

- **WHEN** the person declines the install
- **THEN** nothing is installed and the agent gives the person steps to pass the check on their own device

<!-- end specs/dependencies/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-08

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 63841 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its Ready section
  asks the chat to build, or to build and publish, by an action's name alone.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-08-live-view-for-robot-checks</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:var(--bar, 76px); background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready, #ready .row { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
  #ready-says, #ready-confirm span { margin:0; font-size:14px; }
  #ready-says { font-weight:600; }
  @media (max-width:700px) {
    #ready, #ready .row, #ready-says, #ready-confirm span { flex:1 1 100%; }
    #ready button { flex:1; }
  }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-08-live-view-for-robot-checks">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-08-live-view-for-robot-checks</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">On 2026-10-08 Messenger took the saved password, then asked <i>I'm not a robot</i>. Nothing let you tick that box in the assistant's browser, and ticking it on your own phone doesn't sign the assistant in. So a saved password alone can't get the assistant into a site that adds a check. A trial the same day got through: a private link showed the assistant's browser, you did the puzzle, and Messenger signed in. It took two fixes on the way, and this plan keeps both.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A robot check gets a live view you tap through.</b> When a site asks whether a person is there, with a tick box or a picture puzzle, the assistant asks if you're ready. Then it sends a private link that shows its browser on that page. You tick the box or do the puzzle. The link closes itself once the site lets you through, and the assistant carries on. The assistant never ticks or solves a check itself.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">site shows a check</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">      │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">   &quot;Ready?&quot; ─▶ live view ─▶ you tap through</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">                                 │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">            ┌────────────────────┤</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">            ▼                    ▼</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">      site moves on        still refused</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">            │                    │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">            ▼                    ▼</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">      carries on           steps for you</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The live view, on a phone.</b> The assistant's browser fills the page, with one box under it and no buttons. Tap a box in the browser, then type in ours: each letter goes straight into the browser as you type it. It ends on a plain line and tells you to go back to the chat.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">│ facebook.com/...             │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│                              │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│  Your name [Matt|]           │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│  [ ] I'm not a robot         │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">│                              │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">├──────────────────────────────┤</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">│ [Matt|                     ] │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">└──────────────────────────────┘</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">  before you type:</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">│ [Tap a box above, then type] │</span>
<span class="ln" data-note="item-2-line-13" tabindex="0">└──────────────────────────────┘</span>
<span class="ln" data-note="item-2-line-14" tabindex="0">  while it connects:</span>
<span class="ln" data-note="item-2-line-15" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-16" tabindex="0">│ Opening the browser...       │</span>
<span class="ln" data-note="item-2-line-17" tabindex="0">└──────────────────────────────┘</span>
<span class="ln" data-note="item-2-line-18" tabindex="0">  once the site lets you through:</span>
<span class="ln" data-note="item-2-line-19" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-20" tabindex="0">│ Done. Go back to the chat.   │</span>
<span class="ln" data-note="item-2-line-21" tabindex="0">└──────────────────────────────┘</span>
<span class="ln" data-note="item-2-line-22" tabindex="0">  closed, or out of time:</span>
<span class="ln" data-note="item-2-line-23" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-24" tabindex="0">│ This link has closed.        │</span>
<span class="ln" data-note="item-2-line-25" tabindex="0">│ Ask in the chat for a new    │</span>
<span class="ln" data-note="item-2-line-26" tabindex="0">│ one.                         │</span>
<span class="ln" data-note="item-2-line-27" tabindex="0">└──────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The whole page fits your screen.</b> In the trial you saw only the top-left corner, because the browser's window was twice the size of the screen being shown. The view now fits the page to what you hold, narrow on a phone and wide on a laptop, and puts it back when the link closes.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The page no longer closes under you.</b> The assistant's browser closes any page left alone for 5 minutes, and your taps don't count as use. In the trial that blanked the view and restarted the puzzle. Now a page stays open for as long as a link is using it.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Card forms get the same fix.</b> A card form you take more than 5 minutes over can fail today for the same reason, with nothing sent. It stays open now too.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>You can type and paste from a phone.</b> There is no send button. What you type, delete, or paste in the box happens in the browser at once, letter by letter, and so do Enter and Tab. A box in the browser that already holds text is no trouble: you add to it, or keep deleting. When your phone's keyboard opens, the box sits on top of it and the browser stays in sight above.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>It stays open for eight hours, and it can drive a browser signed in as you.</b> Anyone who gets the link while it's open can use the accounts that browser is signed in to. It closes when the site lets you through, when you say <i>done</i> in the chat, or after eight hours. The page has no close button: you close the tab. Only one private link is open at a time, and the view needs the link's own secret.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Only for robot checks.</b> A password, a code, a card, and an ordinary answer keep the routes they have. <i>Let me take over</i> still opens nothing anywhere else. A passkey or an approval on your phone stays on your own device: neither can travel through a view of another computer's browser.</div></div></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>A site that still refuses after your try ends with steps for you</b>, as today. Each site gets one live view per task, so a site that won't be satisfied isn't tried again and again.</div></div></li>
<li class="item card" id="item-10"><span class="num">10</span><div class="body"><div class="text" data-note="item-10" tabindex="0"><b>After a sign-in, the assistant looks for a check.</b> <i>Accepted</i> only means the password page was passed. The assistant reads the next page and offers the live view when it's a check, before saying it's signed in.</div></div></li>
<li class="item card" id="item-11"><span class="num">11</span><div class="body"><div class="text" data-note="item-11" tabindex="0"><b>Three small tools, installed once with your yes.</b> One goes in your home folder. Two need admin rights on the computer, which the browser itself did not.</div></div></li>
<li class="item card" id="item-12"><span class="num">12</span><div class="body"><div class="text" data-note="item-12" tabindex="0"><b>On a Mac, nothing changes yet.</b> There the assistant's browser has no screen to show, so a check still ends with steps for you.</div></div></li>
</ol>
<p class="aside">Non-goals: no service that solves checks, no second browser, no hired network address, no live view for anything but a check, no Mac support, and no change to how long the other private links stay open.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked to test whether the assistant can sign in to a site with a saved password → tried Messenger: the password link saved the login, the sign-in was accepted, and a robot check stopped it.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked to be handed the check, <i>i'll click into it</i> → told nothing shows the browser since 34.0.0; he recalled the screen viewer from the 2026-10-07 trial.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked how to get the live view back → chose a quick trial now over a plan first. The trial signed Messenger in after two fixes: fitting the window, and keeping the page open.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked to package the trial into a plan with every correction → this plan.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked where to plan it, given the unpublished eight-hour links plan edits the same code → chose keep going here.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked which stops get the live view → chose any robot check, at a site's front door or after a sign-in.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked how long a live view stays open → chose eight hours, over the recommended 30 minutes and over 10 minutes.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked whether to fix the 5-minute fault for card forms here → chose fix it here.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: passkeys and phone approvals stay out, because a passkey lives on the person's own device and can't be used through a view of another computer; the 2026-10-07 note that named them for the live view was wrong on this.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the assistant asks <i>Ready?</i> before sending the link, as it does for a password link and a private form, because the link can drive a signed-in browser and a puzzle on the page can go stale.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the view is served by the private link's own page behind its own secret, not by the trial's separate helper with an 8-character password, because this link can use the person's accounts; it also needs one tool fewer.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the page is fitted with the browser's own resize call, not the window tool the trial used, because a check on 2026-10-08 showed that call resizes the window too (2560x1385 to 1280x697); the window tool only brings the page to the front.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the view fits a phone first, because the chat that asks <i>Ready?</i> is most often read on one.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the screen viewer comes from npm at one pinned version into the home folder, and the other two tools from the system's packages, because a pinned viewer is the one tested and the other two have no home-folder install.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: one live view per site per task, then steps for the person, because repeats at a site that keeps refusing can lock the account.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: a Mac is left for later, because the browser runs there with no screen to show.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the other private links keep their time limits here, because the eight-hour links plan owns them.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the live view gets its own guide page, because the browsing guide is one word under its 3,000-word cap.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: a minor release, because it adds behavior and breaks nothing an install relies on.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: the three proofs in the first task group were run in the chat before the build, because they need this machine's real browser and a download outside the repo, which the build helper may not do.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: the screen is reachable over a private socket with no browser restart, as planned. Found on the way: the screen tool still opened a network port with no password unless told twice not to. The plan now closes it and refuses to open a link if any port is open.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: the screen viewer does not come from npm after all, because that package can't load in a browser. It comes from the viewer's own 1.6.0 release, into the home folder, and is checked against a recorded fingerprint before use. These are the same files the trial used.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: the link reads the page's size and starts the screen before it opens its address, and keeps both in its own record. So the page is put back and the screen stopped even when the link's helper has died.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: the recorded fingerprint was checked against the copy of the viewer already on this computer. It matches when the files are sorted by path as plain bytes, so the install sorts them that way.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: where the assistant can't use admin rights without a password, the install adds nothing at all, the viewer included, and prints the one command for the person.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: text sent from the type box travels through the screen's clipboard, which carries only Western European letters; any other character arrives as <code>?</code>. Left as it is: the trial worked the same way.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: the line <i>the browser runs with no window</i> came out of the browsing guide, because a live view now shows that window.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: after a link that closed or ran out, the guide has the assistant offer a new link only when the person never got to the check. A try the site refused counts as that site's one view.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: the tests were run once, with the local checks at the end, not after each group of tasks.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: two faults found by trying the built link on the real browser, both fixed, neither visible to the automated tests because they use stand-ins. The link's page could say <i>closed</i> on an open link, because it started before the screen viewer had finished loading; it now waits for it. And an extra guard flag on the screen tool made it drop every connection; it is removed, and the check that no network port is open stays.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked whether to install the screen viewer and test on the real browser → chose install and test.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: two more faults found by trying a phone-sized view from a separate browser, both fixed. On the phone fit the page's window was not kept in front, because the browser's window can't go narrower than about 500 and the match wanted exactly 480. And the keyboard could stay with another page on the same screen, so typing could land in the wrong page; the page's window now gets the keyboard whenever it is brought to the front.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: checked on the real browser: a view left untouched for 13 minutes kept its page; a card form left for 7 minutes still filled a pretend checkout; the screen refuses a missing or wrong secret; no network port serves the screen; closing puts the page's size back and removes the screen tool's folder; a second task's page does not stay in front; typed text, <i>Send</i>, and <i>Delete</i> reach the page from a phone-sized browser after a tap in the box.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: while testing typing, the assistant's own blind click ticked the test tick box on its pretend page (Google's public test widget, not a real site's check). The page was reloaded; the person's own run starts unticked.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the install's <i>no</i> path is left to its automated test and the guide, because the person said yes when asked and a second ask only to hear a no would waste his time.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked why the page puts a frame around the browser, <i>it was better when i was testing it out and logging in</i> → told it was for typing and closing. Asked how the page should look → answered: <i>we need a better UI for this sort of thing maybe like tuck away and a button to type that opens up a textbox</i>, and <i>when it's in type mode it's clearly communicated to us that it's typing and what's happening and will paste it in</i>. The browser now fills the page; typing and closing sit behind two buttons.</li>
<li class="decision card" id="decision-37" data-note="decision-37" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: the typing panel sits above the browser and moves it down, because drawn over the browser it covered the box being typed into. A send with a character the screen can't carry is refused and names it, because it would arrive as a question mark.</li>
<li class="decision card" id="decision-38" data-note="decision-38" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: a viewer that fails to load is tried again twice, then the page says to reload, because a page left on <i>Opening the browser...</i> gave no way forward. Seen with a test browser on a server whose temp space was full.</li>
<li class="decision card" id="decision-39" data-note="decision-39" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked to try the tucked-away layout → answered: no <i>Pretend Shop wants to know...</i> line in the bar, and <i>have like the send button and the input box on the left already</i>, <i>kind of like messaging someone</i>. The bar is now a box, <i>Send</i>, and <i>More</i>, always there; the line about what the site wants is the page's title only; the typing mode and its button are gone.</li>
<li class="decision card" id="decision-40" data-note="decision-40" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked to try the messaging-style bar → answered: remove <i>More</i>, <i>no need for close without finishing we'll just close the browser</i>, no line saying a key was pressed, and <i>as they type it'll update the screen as well</i>, <i>no need for send button</i>. The page is now the browser and one box that types straight into it; nothing else.</li>
<li class="decision card" id="decision-41" data-note="decision-41" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Building: each change to the box is sent as key presses, a Backspace per character that went and then each that came, because that carries a phone's autocorrect and a paste as they look. Tried on the real screen: capitals, punctuation, an accented letter, a Chinese character, and a delete all arrived. The earlier paste-through-the-clipboard route and its plain-characters limit are gone.</li>
<li class="decision card" id="decision-42" data-note="decision-42" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the page does not read what a box in the browser already holds to fill ours, though he said it would be cool, because the link's promise is that its helper reads nothing on the page, a password box would be read too, and a check's own boxes sit in a frame that can't be read. Typing live already adds to or deletes what is there.</li>
<li class="decision card" id="decision-43" data-note="decision-43" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked for a phone run and a laptop run before publishing → he did one run on the final layout, which passed end to end, and typed <code>/ship</code>. The second device and a real picture puzzle on this build were not run; the plan's last check is recorded as what was seen.</li>
<li class="decision card" id="decision-44" data-note="decision-44" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Archive checkpoint: built, tried on the real browser and by the person once on the final layout, main merged in with three files resolved by hand (the eight-hour default now covers every link), numbered 38.3.0.</li>
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
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button>
  <div id="ready" hidden>
    <div class="row" id="ready-choose"><button type="button" data-ready="build">Build it</button><button type="button" data-ready="publish">Build and publish</button></div>
    <div class="row" id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><span>Goes live, can't be undone.</span><button type="button" data-ready="yes">Yes, publish</button><button type="button" data-ready="cancel">Cancel</button></div>
    <p id="ready-says" role="status" hidden></p>
  </div>
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
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
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
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
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
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
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
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
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
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, sending = false;
  function setLive(key) {
    live = key;
    if (!key) $('ready').hidden = true;
    $('copy').textContent = key ? 'Send notes' : 'Copy notes';
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
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
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  function sendNotes() {
    const notes = unsent(), n = notes.length;
    if (sending || nothing('sent')) return;
    sending = true;
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      sending = false; setLive(null);
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    ask('send', live, { text: bullets(notes).join('\n') }).then(function (r) {
      if (r.status === 429) { sending = false; toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      r.json().then(function (answer) {
        if (!answer || answer.sent !== true) { closed(); return; }
        sending = false;
        notes.forEach(function (note) { note.sent = true; });
        persist();
        toast('Sent ' + plural(n) + ' to the chat.');
      }, closed);
    }, closed);
  }
  $('copy').addEventListener('click', function () {
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── ready: on a reply link that offers both, the bar's second row asks the chat to build, or to build and publish ──
  // The page sends an action's name and the version of the plan it read; the link's opener fixed each message.
  let version = null, acting = false;
  function says(text) { $('ready-says').textContent = text; $('ready-says').hidden = !text; bar(); }
  function readyStep(step) {
    $('ready-choose').hidden = step !== 'choose';
    $('ready-confirm').hidden = step !== 'confirm';
    bar();
  }
  // One primary button in the bar: the notes button while a note is unsent or no build button shows, else the build one.
  // The page's bottom padding follows the bar's height, so a taller bar never covers the end of the page.
  function bar() {
    const el = $('copy').parentNode, ready = $('ready');
    const build = !ready.hidden && !unsent().length && !($('ready-choose').hidden && $('ready-confirm').hidden);
    $('copy').classList.toggle('primary', !build);
    all('[data-ready="build"], [data-ready="yes"]', function (b) { b.classList.toggle('primary', build); });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  // Unsent notes would change the plan the chat is about to build: say so. True when it spoke.
  function notesFirst() {
    if (!unsent().length) return false;
    says('Send or delete your notes first.');
    return true;
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  function act(name) {
    if (acting || !live || notesFirst()) return;
    acting = true; says('');
    const closed = function () { acting = false; $('ready').hidden = true; bar(); toast('This link has closed. Choose in the chat.'); };
    ask('act', live, { action: name, version: version }).then(function (r) {
      if (r.status === 429) { acting = false; says('Wait a few seconds, then tap again.'); return; }
      r.json().then(function (answer) {
        const a = answer || {};
        const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
          : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
          : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
        if (!line) { closed(); return; }
        acting = false; readyStep('done'); says(line);
      }, closed);
    }, closed);
  }
  $('ready').addEventListener('click', function (e) {
    const step = e.target.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || (step === 'publish' && !notesFirst())) {
      says(''); readyStep(step === 'cancel' ? 'choose' : 'confirm');
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) ask('alive', key).then(function (r) {
    if (!r.ok) return;
    setLive(key);
    r.json().then(offer, function () { /* no actions: notes only */ });
  }, function () { /* not live: the page copies */ });
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
