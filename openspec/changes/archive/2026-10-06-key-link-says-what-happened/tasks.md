# Tasks

## 1. The private-link script

- [x] 1.1 In `.agents/skills/hand-over/scripts/hand-over.mjs`, carry `opened` into a key link's result and print `HANDOVER_OPENED=yes|no` from `wait`, the give-way report included (design decision 1); verify by reading `report()` and `watch()`'s outcome
- [x] 1.2 Have `givesWay` write `replaced.json` with the old link's completion identity and the new opener's folder name before it signals, and have `report()` print `HANDOVER_REPLACED_BY=<name>` when the identity matches (decisions 2 and 3); verify the record is not removed by `clearLink()`
- [x] 1.3 Update the script's header comment and `USAGE` for the two new lines; verify `hand-over.mjs --help` names both
- [x] 1.4 In `scripts/tests/hand-over.test.mjs`, extend the give-way test to expect `HANDOVER_OPENED=no` and `HANDOVER_REPLACED_BY=<the fixture checkout's folder>`, and that the second link's own `wait` prints no `HANDOVER_REPLACED_BY`; add cases for a key link that times out unopened (`no`, no replaced line), one opened then closed (`yes`), and a form and a password link (no `HANDOVER_OPENED` line); verify each case is written

## 2. The wiki and the release note

- [x] 2.1 In `wiki/development/secrets.md`, show the new lines in step 3's example and make step 4 and the *One link is open at a time* paragraph say what the agent tells the person for never opened, opened and left, and another chat's link, in under 60 added words; verify the page still reads in order
- [x] 2.2 Add one plain sentence to `wiki/stack/api-keys.md`'s private-link section: the assistant can tell an unopened link from one another chat replaced, and asks before sending another; verify no command or file name is in it
- [x] 2.3 Add a `## Next (minor) — The key link says what happened` entry at the top of `CHANGELOG.md`'s entries, in plain words, with `**Updating.** Nothing needs doing by hand.`; verify `VERSION` is untouched

## 3. Verification

- [x] 3.1 Run `node --test scripts/tests/hand-over.test.mjs` and `node --test scripts/tests/keys.test.mjs`; verify both pass
- [x] 3.2 Run `node .github/scripts/checks.mjs --worktree`; verify it passes, the payload link check, `measure-context.mjs --check`, and the wiki checks included
