# Tasks

## 1. Script: size and tabs

- [x] 1.1 In `.agents/skills/verify/scripts/hand-over.mjs`, add and export the pure `tidyTabs(tabs)` per the design; make `open` run `set viewport 1280 720`, then `tab list --json`, `tab close <id>` for each blank tab, and `tab <front>` when set. Verify in `scripts/tests/hand-over.test.mjs`: `tidyTabs` cases (blank active beside a real tab, only blank tabs, several real tabs, no blank tabs), and the fake `agent-browser`'s call log shows `set viewport 1280 720` and the tab calls before the tunnel starts

## 2. Script: our own page

- [x] 2.1 Replace the dashboard in `hand-over.mjs`: `open` reads the stream port (`stream status --json`, `stream enable` when disabled), picks a free loopback port, makes the key, starts the tunnel to that port, spawns the watcher, waits until the page answers, and prints `HANDOVER_LINK=<origin>/#key=<hex>` (`http://127.0.0.1:<port>/#key=<hex>` with `--local`); remove `accessUrl` and every `dashboard` call. Update the header comment. Verify in the tests: the link's shape for both modes, the tunnel gets the picked port, and no `dashboard` call remains in the log
- [x] 2.2 Make the watcher serve `GET /` (`hand-over-page.html`), `GET /page.mjs`, and the `/stream` upgrade proxy per the design (key check with `timingSafeEqual`, 403 on a wrong or missing key, 404 elsewhere, forwarded upgrade with no `Origin`), and close the server in teardown. Verify in the tests with a fake stream server on a loopback port: the page loads with no key, a wrong key gets 403, the right key's bytes reach the fake stream and back, the forwarded request has no `Origin`, and the port stops answering after `close`
- [x] 2.3 Add `.agents/skills/verify/scripts/hand-over-page.html` and `hand-over-page.mjs` per the design's page and UX sections: live view, tap and click, drag to scroll, computer keyboard, *Type here* box with ⌫, Tab, Enter, and the status line; export the pure `toPage` and `typedKeys`. Verify in the tests: `toPage` on a letterboxed and a scaled canvas, and `typedKeys` for typing, backspace, an autocorrect rewrite, and a pasted run of digits
- [x] 2.4 Keep the watcher's reads to `get url` and `get count`: extend the existing test so the watcher's calls after `open` are only those, and `result.json` still holds no address or key

## 3. Wiki

- [x] 3.1 In `wiki/development/home.md` *Hand the browser over*, say what the link opens (the live page and a *Type here* box for the phone keyboard) and that the agent brings the task's page to the front; in *Is the link safe?*, drop "the page also shows the agent's other browser sessions" and say the page shows only the task's browser. Verify with `node scripts/check-payload-links.mjs`

## 4. Release

- [x] 4.1 Add a `## Next (minor) — Type into the agent's browser during a hand-over` entry to `CHANGELOG.md`, with an **Updating.** note: nothing to do by hand. Verify it sits above the latest numbered entry
- [x] 4.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check`; all pass

## 5. Live check

- [x] 5.1 On this server, hand over a local card form through a real quick tunnel with the page left at agent-browser's default size and a blank tab in front: open the link in a second agent-browser session emulating an iPhone, confirm the card page shows, tap the card box, type a number through *Type here*, and confirm the agent's field holds it (read after `close`); repeat from a desktop-sized session typing on the view itself; confirm the link is dead after `close`
