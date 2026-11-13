# Tasks

## 1. Chat names

- [x] 1.1 `.agents/plugins/daily/scripts/chats.mjs`: add `STEP_MARKS` (`EXPLORE` 🔍, `PLAN` 📝, `APPLY` 🔨, `SHIP` 🚀, `DONE` ✅) and `stepName(step, task)` → `<mark> <task>`. `withoutStep` and `stepOf` match a leading mark and a space, or the old `<WORD>:` form; `stepOf` returns the step word for both. Update the comments.
- [x] 1.2 `.agents/loop/step-title.mjs`: `titleOf` uses `stepName`; `commandStep` returns a step only for a loop verb (drop `skillStep` and the skill-folder check); update the header comment and `USAGE`.
- [x] 1.3 `.agents/plugins/daily/scripts/chat-list.mjs`: `nameOf` uses `stepName` for its fallback name.
- [x] 1.4 `scripts/tests/step-title.test.mjs` and any chats or chat-list test: expect `📝 X`, `🔨 X`, …; add tests that a typed `/verify` keeps the name, that `withoutStep` strips both the emoji and the old `PLAN: ` and `VERIFY: ` forms, and that an old `PLAN: X` name becomes `🔨 X` at the next step.

## 2. Docs

- [x] 2.1 `wiki/development/the-change-loop.md`: the chat-name paragraph lists the five emojis, says only build loop steps mark a name, and that other skills keep it.
- [x] 2.2 Add a `## Next (minor) — Build loop chat names start with an emoji` entry at the top of `CHANGELOG.md`, with **Updating.** *Nothing to do by hand: open chats move to the emoji at their next step.*

## 3. Checks

- [x] 3.1 Run `node --test scripts/tests/step-title.test.mjs` and the Daily chat tests, `node scripts/check-payload-links.mjs`, and `node .github/scripts/checks.mjs --worktree`.
- [x] 3.2 In this chat, run `slot.mjs stepTitle set APPLY --task "<title>"` and see the Paseo name become `🔨 <title>`; type `/verify` and see it stay.
