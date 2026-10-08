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
