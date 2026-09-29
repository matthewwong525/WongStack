# Tasks

## 1. Scripts

- [x] 1.1 Write `keys.mjs`: resolve each name against `.env.example` and `app/.dev.vars.example` (undeclared or ambiguous → exit 2 with `KEYS_UNDECLARED=` / `KEYS_AMBIGUOUS=`), prove each destination is ignored in the primary worktree and a linked one, read each hint and set-now boolean, and mount the keyed `POST /save` and `POST /done`. `/save` trims, validates (non-empty, ≤ 4,096 characters, no newline, 16 KB body), writes the primary file and a seeded branch copy by temp-and-rename with mode `0600`, quotes values outside the bare set, and replies names only. Verify with tests in `scripts/tests/keys.test.mjs` on a temp repo with a linked worktree: a wrong key gets 403; a new key lands in both files; a rotation replaces the line in place and keeps the rest; an unseeded copy is left alone; a value with `#` or a space reads back unchanged; a refused value is named in `failed`; no value reaches argv, stdout, stderr, `state.json`, or `result.json`.
- [x] 1.2 Add `--keys NAME[,NAME]` to `hand-over.mjs open`: no browser page or live feed, serve `keys-page.html` and `keys-page.mjs`, mount the `keys.mjs` routes, and finish on `/done`, on the save that leaves no asked-for key unsaved, on `close`, or the deadline; `--keys` with `--passwords`, `--until`, or `--until-gone` is a usage error. Update the header comment and usage. Verify with tests that a key link refuses to open while another link is open, that an undeclared name opens no tunnel, and that `wait` prints `HANDOVER_SAVED=` and `HANDOVER_APP_KEYS=` names and nothing else.
- [x] 1.3 Write `keys-page.html` and `keys-page.mjs` by the design's UX: one password field per key with its hint and *replaces the one saved now*, a show toggle, *Save* and *Done*, saved ticks, the failed-row and closed-link states, mirroring `passwords-page.html`. Verify with a local `--local` walk at phone width, screenshot attached to the PR by `/save`.

## 2. Docs and agent rules

- [x] 2.1 Add a *Receive a key through a private link* section to `wiki/development/secrets.md`: when the agent offers it, the ready question, declaring a name first, the `open --keys` / `wait` commands and their output, running `npm run secrets:push` on `HANDOVER_APP_KEYS`, and the pasted-key fallback with its *safer next time* line. Update its intro's plain-version pointer.
- [x] 2.2 Rewrite `wiki/stack/api-keys.md` around the link: get the key, open the link the assistant sends, paste it, tap *Save*; pasting into the chat is the fallback; the leak steps say to give the new key through the link. Update the one line in `wiki/stack/getting-started.md` and the `wiki/stack/README.md` entry.
- [x] 2.3 Update the `WONG-STACK` block's credentials line in `AGENTS.md` (and `CLAUDE.md` if it is a copy) and the matching template the installer ships: a missing key → declare it, then send the key link, linking the new section.
- [x] 2.4 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check`, and fix what they report.
- [x] 2.5 Add a `## Next (minor) — Give API keys through a private link` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: nothing to do by hand; the assistant now sends a private link when it needs a key.

## 3. Integration

- [x] 3.1 Run `openspec validate private-key-link --strict --no-interactive`, and pass CI through `/save`. Validated locally; CI is the ship's own checkpoint, which must pass before the merge.
- [x] 3.2 Try a real key link on a phone through the tunnel for a declared test key, then remove the test key. Record the result, or a memory `thread` fact if it can't be tried before publishing. Not tried on a phone before publishing; recorded as a memory thread. A local phone-width walk passed.
