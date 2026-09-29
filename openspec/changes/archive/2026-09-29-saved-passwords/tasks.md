# Tasks

## 1. Scripts

- [x] 1.1 Add `--passwords` to `hand-over.mjs open`: skip `prepareBrowser` and the live feed, serve `passwords-page.html` and `passwords-page.mjs`, mount the `passwords.mjs` routes, and finish only on `/done`, `close`, or the deadline; update the header comment and usage. Verify with tests in `scripts/tests/passwords.test.mjs` that a passwords link refuses to open while a hand-over is open, and the reverse.
- [x] 1.2 Write `passwords.mjs`: the keyed `POST /save` and `POST /done`, the name choice (`slug(host)`, reuse on the same host and username, `-2` for a second account), the limits (500 logins, 256 KB, 1,024 characters a field), and `auth save` through `execFile` with the password on stdin. Verify with tests using a fake `agent-browser` on `PATH`: a wrong key gets 403, the password reaches only stdin and never argv or the log, an over-limit body is refused, a repeat replaces, and a second account gets `-2`.
- [x] 1.3 Record the saved names: `teardown` writes `saved` to `result.json`, and `wait` prints `HANDOVER_SAVED=`. Verify with a test that `wait` prints the names and nothing else from the request.
- [x] 1.4 Write `passwords-page.html` and `passwords-page.mjs`: the start screen, the file reading with an exported `parseExport`, the tick list with search and none ticked, the add-one form with `autocomplete` marks, the saved screen, and the unreadable-file and failed-save states, mirroring the hand-over page. Verify with `parseExport` tests on sample exports from Chrome, Apple Passwords, LastPass, Bitwarden, 1Password, Dashlane, and Firefox, plus quoted commas, a newline inside quotes, a BOM, an `android://` row, and a non-export file.
- [x] 1.5 Add `hand-over.mjs`'s new flag to `scripts/tests/cli-conventions.test.mjs` if its conventions list needs it, and verify the test suite passes in CI with `/save`.

## 2. Docs

- [x] 2.1 Rewrite *Saved browser logins* in `wiki/development/browsing.md`: the agent never asks for a password in the chat; it logs in with a saved login when one matches, by the matching rule, and hands over otherwise. Add a *Save your passwords* section: the ask, the two ways in, where logins are kept and what that protects against, keep bank and email out, change or forget one in the chat, and `hand-over.mjs open --passwords`. Verify with `node scripts/check-payload-links.mjs`.
- [x] 2.2 Add one line to `wiki/stack/api-keys.md` pointing to *Save your passwords*, and update the `AGENTS.md` browsing rule's links if the heading list changes. Verify the links resolve with `node scripts/check-payload-links.mjs`.
- [x] 2.3 Add a `## Next (minor) — Save your passwords for the agent's browser` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: nothing to do by hand; say *save my passwords* to start. Verify it sits at the top of the entries.

## 3. Integration

- [x] 3.1 Run `openspec validate saved-passwords --strict --no-interactive` and `node scripts/measure-context.mjs --check`, and pass CI through `/save`.
- [x] 3.2 Try a real password link on a phone, with the add-one form filled from saved passwords, then a task that logs in with the saved login. Record the result, or a memory `thread` fact if it can't be tried before publishing. Recorded as a memory thread on 2026-09-29; a local phone-size walk with a fake store passed.
