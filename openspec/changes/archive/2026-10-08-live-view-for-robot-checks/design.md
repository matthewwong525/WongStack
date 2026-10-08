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
