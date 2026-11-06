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
