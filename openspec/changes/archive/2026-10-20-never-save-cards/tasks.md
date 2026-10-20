# Tasks

## 1. Scripts

- [x] 1.1 `form.mjs`: drop `UNKEPT`, `keepable`, `describeForm`'s `keep`, and the `save` body flag; `formRoutes` calls `onSend(values)`.
- [x] 1.2 `form-page.html` and `form-page.mjs`: remove the *Save for next time* row and every `#keep` use; the send posts `{ values }`.
- [x] 1.3 `hand-over.mjs`: remove `fill`, `--use`, `checkFill`, the fill lock (`filling`, `fillUnderWay` and their calls in `wait` and `close`), `keep`, the `kept`/`hint` outcome, and `HANDOVER_SAVED_HINT`; update `USAGE`.
- [x] 1.4 `details.mjs`: `readDetails` drops `private` sets and rewrites the file when it dropped any; remove `keepForm`, `valuesFor`, `choiceFor`, `normalise`, `agrees`, `wordsOf`, and the card branch of `hintOf`; refuse `cc-*`, passwords, and `one-time-code` in `chatFields` without `form.mjs`'s `keepable`; `list` prints every set's values; update `USAGE` and the file comment.

## 2. Tests

- [x] 2.1 `details.test.mjs`: drop the keep, choice, and fill tests; add one that a file holding a card set and a home set reads back as the home set alone, with the card gone from disk.
- [x] 2.2 `hand-over.test.mjs`: drop the Save-for-next-time and `fill` tests and `SAVED_CARD`; assert `fill` and `--use` are usage errors; assert a sent form writes no `details.json`.
- [x] 2.3 `form.test.mjs` and `form-page.test.mjs`: drop the keep and save tests; assert the form shows no checkbox and its send carries only `values`.

## 3. Docs and specs

- [x] 3.1 `wiki/development/private-form.md`: remove the tick, the saved-card steps, and `fill`; *Saved details* covers chat answers only, typed by the agent after a yes; say a card goes through the form every time.
- [x] 3.2 `wiki/development/browsing.md`, `wiki/development/README.md`, and its seed copy `wiki-development-README.md`: drop "can save a card".
- [x] 3.3 `.agents/skills/hand-over/SKILL.md`: drop `fill`.
- [x] 3.4 Edit `openspec/specs/saved-details/spec.md`'s Purpose to everyday answers from the chat.
- [x] 3.5 `scripts/retired-names.json`: add `hand-over.mjs fill`, `--use`, `HANDOVER_SAVED_HINT`, and `Save for next time`, allowed where history keeps them.
- [x] 3.6 `CHANGELOG.md`: a `## Next (minor) — Cards are never saved` entry; **Updating.** runs `node .claude/skills/hand-over/scripts/details.mjs list` once, which deletes any saved card.

## 4. Verify

- [x] 4.1 Run `node .github/scripts/checks.mjs --worktree` and fix what it finds.
- [x] 4.2 Walk a pretend card page over a real private link: no tick shows, the card pays, and `details.json` is unchanged.
