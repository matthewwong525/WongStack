# Design

## Context

[`hand-over.mjs`](../../../.agents/skills/verify/scripts/hand-over.mjs) `open` starts a Cloudflare quick tunnel, restarts `agent-browser dashboard` with the tunnel's origin allowed, prints the dashboard's tokenized URL, and leaves a detached watcher to tear it all down ([*Hand the browser over*](../../../wiki/development/home.md#hand-the-browser-over)).

Reproduced on this host with agent-browser 0.38.1, a local card form, the loopback dashboard, a real `trycloudflare.com` link, and an emulated iPhone 14:

- **Input is not blocked in transit.** Mouse and key events reach the page over the tunnel once the coordinates line up.
- **The size mismatch.** Headless Chrome's page is 1280×577 (a 1280×720 window minus its toolbar); agent-browser applies no viewport override by default. The stream's `status` message and each frame's `metadata.deviceWidth/deviceHeight` still say 1280×720, while the JPEG is 1280×577. The dashboard maps a click with the reported size (`y × 720 / canvasHeight`) over the real 577-high picture, so every click lands ~25% low. `agent-browser set viewport 1280 720` makes page, picture, and reports agree; clicks then focus the field and keys type.
- **No phone keyboard.** The dashboard forwards keys only while its `<canvas>` has focus. A phone opens its keyboard only for an editable element, and the dashboard has none, so a phone can tap but never type.
- **The blank tab.** The stream shows the session's active tab. An `about:blank` tab in front shows a blank page.
- **The stream refuses foreign origins.** A WebSocket to the session's stream port with `Origin: https://…trycloudflare.com` is rejected; no `Origin`, or a loopback one, is accepted.

## Goals / Non-Goals

**Goals:** clicks land where the person aims; the person can type from a phone's keyboard or a computer's; the link opens on the task's page; the link shows only the task's browser; the link's safety promises (random address, secret key, closes itself, agent hands-off) stay as they are.

**Non-Goals:** re-laying out the site for a phone; clipboard paste; changing when the agent hands over or how the finish is detected; fixing agent-browser's dashboard.

## Decisions

- **Pin the viewport at `open`.** `open` runs `agent-browser set viewport 1280 720` before anything else. It is agent-browser's own default size, so a page that was fine before looks the same; it makes every size report true.
- **Tidy tabs at `open`.** `open` reads `agent-browser tab list --json`. A pure helper `tidyTabs(tabs)` returns `{ close, front }`: blank tabs (no URL, `about:blank`, `chrome://newtab/`, `chrome://new-tab-page/`) are closed only when a non-blank tab exists; when the active tab is blank, `front` is the last non-blank tab in the list, else null. `open` runs `tab close <id>` for each, then `tab <front>`. This reads addresses only, as the watcher already does.
- **Our own page replaces the dashboard.** `open` no longer runs `agent-browser dashboard`; the dashboard shows every session and a chat panel, and its click mapping and missing text field are what broke. `accessUrl` and the dashboard calls go.
  - **The watcher serves it.** The detached watcher already lives exactly as long as the link, so it also runs a `node:http` server on a loopback port that `open` picks free and passes in state. Teardown closes the server with everything else; nothing outlives the link.
  - **Order.** `open` pins the viewport, tidies tabs, reads the session's stream port (`agent-browser stream status --json` → `data.port`, after `stream enable` when disabled), picks the port, starts the tunnel to it and waits for `Registered tunnel connection` as today, spawns the watcher, waits until the page answers, then prints `HANDOVER_LINK=<origin>/#key=<hex>`. `--local` skips the tunnel and prints `http://127.0.0.1:<port>/#key=<hex>`.
  - **The key.** 32 random bytes in hex, kept in state and in the link's fragment, which browsers never send. The page moves it out of the address bar with `history.replaceState`, then connects `wss://<host>/stream?key=<hex>`. The server compares it with `timingSafeEqual` and answers anything else with 403. `GET /` and `GET /page.mjs` are static and hold no key, so they need none; every other path is 404.
  - **The feed proxy.** On an upgrade to `/stream` with the right key, the server opens a TCP socket to `127.0.0.1:<stream port>`, writes the upgrade request to `/` with a loopback `Host`, **no `Origin`**, and the browser's `Sec-WebSocket-Key`, `-Version`, and `-Extensions`, then pipes bytes both ways. It never parses or logs a frame, so nothing the person types is read or kept.
- **The page.** `hand-over-page.html` holds markup and styles; `hand-over-page.mjs` holds the script and its pure helpers, which the tests import. No dependencies.
  - **The view.** A `<canvas>` sized to each decoded frame (`createImageBitmap`), scaled to fit the width. A pointer maps to page coordinates by the picture's own size: `toPage(point, rect, frame) = ((x − left) × frame.width / rect.width, (y − top) × frame.height / rect.height)`, rounded. The reported size is ignored, so a future mismatch can't misplace clicks again.
  - **Pointer.** A tap or click sends `mouseMoved`, `mousePressed` (`clickCount: 1`), `mouseReleased` at that spot. A one-finger drag sends `mouseWheel` with the drag's delta, so the person can scroll a long form; the canvas sets `touch-action: pinch-zoom` so two fingers still zoom the picture.
  - **Computer keyboard.** While the canvas has focus, `keydown`/`keyup` become `input_keyboard` events the way the dashboard sends them (`key`, `code`, `text` for a printable key, `windowsVirtualKeyCode`, `modifiers`).
  - **Type here.** An `<input>` with `autocomplete="off"`, `autocapitalize="off"`, `autocorrect="off"`, and `spellcheck="false"`. On each `input` event, a pure helper `typedKeys(before, after)` diffs the old and new value: removed characters become Backspace presses, added characters become key presses with `text`. Diffing, not `keydown`, because Android keyboards send `key: "Unidentified"` and compose words. Buttons send ⌫, Tab, and Enter; Enter also clears the box.
  - **Status line.** One muted line: *Live*, *Reconnecting…*, or *This link has closed.* when the socket ends for good.
- **Security holds.** Same random address and fragment key; the key never reaches a request line except the WebSocket's, inside TLS to Cloudflare, as the dashboard's cookie did. The page shows one session, not every session. The watcher still reads only the address or a count.
- **One ADDED requirement.** `browser-logins` gains *The person can click and type in a handed-over browser*. The existing hand-over requirements keep their wording.

## UX

### Use-case brief

The person the agent is working for, usually on a phone in Paseo, sometimes on a laptop. The job: get past one step only they can do (a password, a card number, a code) and hand back. Done is the step passed; the agent notices on its own or they say *done*. Common case: a phone, one or two fields, under two minutes, a few times a week. Edge cases: a long form that needs scrolling, a laptop with a real keyboard.

### Flow

Open the link → see the live page → tap the field → tap *Type here* → type → Enter or the page's own button → the agent carries on. A laptop user clicks the field and types on the page itself.

### Hierarchy

The live page is the screen; everything else is quiet. The one control is the *Type here* box right under it. ⌫, Tab, and Enter are small secondary buttons; the status line is muted. Mirrors [the review page](../../../wiki/ux-principles.md#the-review-file)'s phone-first, one-column layout.

### Review

[review.html](review.html); the What Changes item *A hand-over page that works on a phone* sketches the page.

## Risks / Trade-offs

- **The stream protocol is agent-browser's.** The page speaks the documented `frame`, `input_mouse`, and `input_keyboard` messages from its README, not the dashboard's internals. A protocol change breaks the page loudly (no picture), not silently.
- **Diffed typing can misfire on autocorrect.** A keyboard that rewrites a word sends a delete-and-retype, which the diff turns into Backspaces and new keys, so the result still matches the box. The box turns autocorrect off to keep that rare.
- **What the person types shows in the box.** It is their own screen, and the box clears on Enter and when the link closes. A password-type box would hide it but invite the phone to save a password for a throwaway address.
- **Pinning the viewport changes a page the agent sized on purpose.** No WongStack flow sets another size today; if one does, `open` would need to keep it.
- **A free port can be taken between pick and listen.** The watcher then fails to listen, `open` sees no answer, and it tears down with an error, as any failed start does today.
- **A real phone is untested here.** The build checks an emulated phone over a real tunnel; a real phone stays an open thread.
