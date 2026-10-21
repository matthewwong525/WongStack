# Tasks

## 1. Browser script

- [x] 1.1 In `.agents/skills/browser/scripts/browse.mjs`, add an exported `hideSecrets(snapshot, secretValues)` that prints `[hidden]` for a filled `textbox`/`searchbox`/`spinbutton` line whose name matches the secret-name pattern or whose value is in `secretValues`, leaving empty boxes, dropdown picks and other lines unchanged; verify with new `valueIn`-style unit tests in `scripts/tests/browse.test.mjs` (password, card number, expiry, one-time code, a matched value under a plain name, an email untouched, a month dropdown untouched).
- [x] 1.2 Make `page.snapshot()` read the secret values with one `evaluate` (type=password, the cc-*/one-time-code autocomplete kinds, `[data-wong-hidden]`, top document and same-origin frames) and return `hideSecrets` output; keep `settle` on the raw read. Verify with a browse test where the pretend camofox snapshot holds `- textbox "Password" [e3]: hunter2` and `snapshot` and `get value e3` print `[hidden]`.
- [x] 1.3 Make `get value <selector>` return `[hidden]` for a filled secret box, using the same tests in its `evaluate`; update the existing card-number assertion (`get value e12` now reads `[hidden]`) and the recorded evaluate expressions; verify with `node --test scripts/tests/browse.test.mjs`.
- [x] 1.4 In `login()`, after typing the password, mark the focused box with `data-wong-hidden`; verify with a browse test that the recorded calls include that mark and that a later snapshot whose box turned `type=text` still prints `[hidden]` via the pretend page's secret values.
- [x] 1.5 Confirm `.agents/skills/hand-over/scripts/form.mjs` still puts back a dropdown pick: `node --test scripts/tests/form.test.mjs scripts/tests/hand-over.test.mjs` passes.

## 2. Docs and release

- [x] 2.1 In `wiki/development/browsing.md`, extend the never-reads-a-password paragraph with one sentence: a page reading shows a filled password, card or code box as `[hidden]`; verify the page reads in plain words and `node scripts/check-payload-links.mjs` passes.
- [x] 2.2 Add a `## Next (patch) — The browser hides typed passwords and cards` entry to `CHANGELOG.md` with no hand step; verify it sits above the newest numbered entry.

## 3. Final checks

- [x] 3.1 On the real browser, open the practice login page `https://the-internet.herokuapp.com/login`, type a made-up password, and confirm `snapshot`, `get value <ref>` and `get value '#password'` print `[hidden]` while the username box shows its text.
- [x] 3.2 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate hide-typed-secrets --strict --no-interactive`; both pass.

## 4. Review fixes

- [x] 4.1 Hide a secret box's own value when it prints on a child `- text:` line (a box whose placeholder differs from its label), and make `get value <ref>` read that child value for a non-secret box; verify with `hideSecrets` and `valueIn` tests using `- textbox "Password" [e3]:` / `  - /placeholder: …` / `  - text: fake-trial-123`.
- [x] 4.2 Match a box line whose start Playwright wraps in single quotes (a name holding `: `, ` #`, `{`, `}` or a backtick), e.g. `- 'textbox "Password: case-sensitive"' [e3]: fake-trial-123`; verify with a `hideSecrets` test.
- [x] 4.3 Make `get value <selector>`'s secret test read the box's name from `aria-labelledby` too; verify with a jsdom test of `<span id=l>Card number</span><input id=cc aria-labelledby=l>` returning `[hidden]`.
- [x] 4.4 Join a long page's snapshot pieces exactly: drop camofox's piece marker and its repeated last part before joining, so a line cut between pieces is whole before hiding; verify with a pretend-camofox test whose cut lands inside a password box line and prints `[hidden]` and no part of the value, and update the existing long-page test.
