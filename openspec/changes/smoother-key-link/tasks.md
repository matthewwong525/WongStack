# Tasks

## 1. Link scripts (`hand-over.mjs`, `keys.mjs`)

- [x] 1.1 Add `--guide <file>` to `open --keys`: validate it in `keys.mjs` by design D1, exit 2 with `KEYS_GUIDE=` on a bad one, carry it in the state, and return `title`, `url`, `open`, `steps`, `checkHost` from `GET /keys`; `scripts/tests/keys.test.mjs` covers each accepted and refused shape, and `hand-over.test.mjs` the flag and exit code.
- [x] 1.2 Give the key link one 30-minute limit by design D2: default `--minutes` 30 for `--keys` only, `closesAt` in `GET /keys`, and the `opened` marker on first open; tests prove the key link's deadline, the marker, and that the hand-over and password links still default to 10.
- [x] 1.3 Let an unopened key link give way to a new `open` by design D3, and keep refusing a second link over an opened key link, a hand-over, or a password link; `hand-over.test.mjs` covers all four cases and the first link's `HANDOVER_RESULT=closed`.
- [x] 1.4 Run the on-save test by design D4 with an injected `fetch`: `works`, `refused`, `untested`, `force`, no redirect followed, body unread, nothing logged; `keys.test.mjs` covers each verdict, each `auth` shape, and that a refused key is not written and not ready.
- [x] 1.5 Accept multi-line values by design D5: JSON compacted, other text `\n`-escaped in double quotes, unsafe characters refused; `keys.test.mjs` proves each written line reads back with the same content through dotenv's rules, and that single-line keys are written as before.
- [x] 1.6 Update the header comments of `hand-over.mjs` and `keys.mjs` and the usage text to match; `node .claude/skills/hand-over/scripts/hand-over.mjs --help` shows `--guide`.

## 2. Key page (`keys-page.html`, `keys-page.mjs`)

- [x] 2.1 Lay out each key by the proposal's sketch: plain title, outline *Open …* link in a new tab, numbered steps, box, then today's fallback of code name and hint when no guide is given; `keys-page.test.mjs` covers both and that guide text is set as text, never markup.
- [x] 2.2 Add *Paste*, the `paste`-event capture for multi-line text, and *pick a file* read on the device with the name-and-line-count state and the 16 KB refusal; tests cover a granted and a refused clipboard, a multi-line paste, and a too-big file.
- [x] 2.3 Show the time left in whole minutes; tests cover the countdown text and the closed state at the limit.
- [x] 2.4 Show the test results: *Testing…*, *Works*, the refused message with *Save anyway*, and *Saved, not tested*, naming the test host; tests cover each and that a refused row stays editable and the page stays open.

## 3. Docs and release

- [x] 3.1 Rewrite [receive a key through a private link](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link) and adjust [the token-website steps](../../../wiki/development/secrets.md#api-token-website-steps) by design D7, keeping both heading texts; update `wiki/stack/api-keys.md` for the person and the one-link line in `wiki/development/passwords.md`; `grep -rn "Ready, send the link" wiki .agents AGENTS.md` shows the ask only where the hand-over and password links keep it.
- [x] 3.2 Add the `## Next (minor) — Smoother key link` entry to `CHANGELOG.md` with an **Updating.** note that installed repos need no action; `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check` pass.

## 4. Integration

- [ ] 4.1 Run `/save` and confirm CI passes on the pull request.
- [ ] 4.2 Run `/verify`: from a scratch Git checkout that declares a dummy key, open the real tunnel link with a guide and walk it at 390×844 through *Works* (a test address that accepts anything), a refusal, *Save anyway*, a picked JSON file, the time left, and an unopened link giving way; post the pictures, confirm the scratch file's line reads back through `dotenv`, and close memory thread #508.
