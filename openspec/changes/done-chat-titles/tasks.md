# Tasks

## 1. Mark finished chats' names

- [ ] 1.1 Add `.agents/skills/daily/scripts/done-titles.mjs` with `markDone()` by design decisions 3–8: mark, unmark only its own mark, strip an earlier status word, the 10-minute recheck, and a quiet `not-read` on failure.
- [ ] 1.2 Add `scripts/tests/daily-done-titles.test.mjs` with a fake `call` and `finishedOf`: finished row gets `DONE: `; `WAITING: X` becomes `DONE: X`; already marked is left alone; working again goes back to the plain name; a title the person changed is left alone and its record dropped; an unfinished stopped row is not rechecked within 10 minutes unless its tip or status changed; a failed rename leaves no record.
- [ ] 1.3 In `.agents/skills/daily/scripts/chief.mjs` `passes`, call `markDone` after `notice` in service mode only, with `project` passed from `serveDaily`'s `watching`; extend `scripts/tests/daily-chief.test.mjs` with one service pass that renames and one non-service pass that does not.

## 2. Docs and release

- [ ] 2.1 In `wiki/development/daily.md` *Close finished chats*, add that a finished chat's name starts with `DONE: ` until it works again, and that this needs Paseo.
- [ ] 2.2 Add a `## Next (minor) — <title>` entry to `CHANGELOG.md` with no hand step.

## 3. Verify

- [ ] 3.1 Run `node --test scripts/tests/daily-done-titles.test.mjs scripts/tests/daily-chief.test.mjs scripts/tests/daily-finished.test.mjs`, `node scripts/check-payload-links.mjs` and `node .github/scripts/checks.mjs --worktree`; all pass.
- [ ] 3.2 Run `D serve --dry-run` in this checkout and confirm it prints no rename and changes no title.
