# Tasks

## 1. The step-title script

- [x] 1.1 In `.agents/skills/explore/scripts/step-title.mjs`, make a given `--task` replace any words except `taskFrom: 'person'` (design decision 1) and update the `nextState` comment.
- [x] 1.2 Add `seen` to the state and the hand-rename check in `setStep` (design decision 3): record the host's name at the first `set` and each written title, including the hook's writes; a Paseo title not in `seen` becomes the task with `taskFrom: 'person'`. Start `seen` for a state that has none (design decision 5).
- [x] 1.3 Cut task words to 60 characters at a word in one helper used by `clauseOf` and given words, dropping a trailing comma, colon, dash, or `and` (design decision 4); update the usage text.
- [x] 1.4 Update `scripts/tests/step-title.test.mjs`: a non-copied Paseo name (`why is it only hidden on mac?`) gives way to `set PLAN --task "Add an add-on, then open its sign-in"`; `set PLAN --task X` then `set PLAN --task Y` gives `PLAN: Y`; `set DONE` with no `--task` keeps the words; a Paseo title changed after a write to `Invoice fixes` gives `APPLY: Invoice fixes` and a later `--task` keeps it; a Paseo title that still shows an earlier written title is not a rename; words of 80 characters are cut at a word to 60 or fewer; an old state with `taskFrom: 'name'` and no `seen` takes a given `--task`. Change the tests that expected a `name` or `task` to stay. Extend "each loop skill still sets its own step" to check that the EXPLORE, PLAN, APPLY, and SHIP lines pass `--task`. Run `node --test scripts/tests/step-title.test.mjs`; all pass.

## 2. The skills

- [x] 2.1 Pass `--task` on each step-starting `set` (design decision 2): `.agents/skills/explore/SKILL.md` (EXPLORE, the idea), `.agents/skills/plan/SKILL.md` (first PLAN, the work; finish unchanged), `.agents/skills/apply/SKILL.md` (APPLY, the plan's title or the to-do's goal), `.agents/skills/ship/SKILL.md` (SHIP, the plan's title). Leave `set DONE` without words.
- [x] 2.2 Run `node scripts/measure-context.mjs --check`; if it fails, cut the same number of words from these skills' own lines.

## 3. Docs and release

- [x] 3.1 In `wiki/development/the-change-loop.md`, change the "A chat's name starts with the step at work" line: each step names the work at that time, a plan's title once there is a plan; any name Paseo made gives way; a name you give in Paseo stays. Run `node scripts/check-payload-links.mjs`; it passes.
- [x] 3.2 Add a `## Next (minor) — Each chat is named for its current work` entry to `CHANGELOG.md` with no hand step.

## 4. Verify

- [x] 4.1 Run `node .github/scripts/checks.mjs --worktree`; all pass.
- [x] 4.2 In this Paseo chat, run `step-title.mjs set APPLY --task "Name each chat for its current work"`, rename the chat by hand with `paseo agent update <id> --name "Chat names"`, run `set SHIP --task "Other words"`, and confirm with `paseo agent inspect` that the name is `SHIP: Chat names`.
