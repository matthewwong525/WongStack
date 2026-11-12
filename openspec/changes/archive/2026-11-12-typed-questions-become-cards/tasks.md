## 1. Stop check (loop)

- [x] 1.1 `.agents/loop/ask-check.mjs`: `endsWithQuestion`; `stopDecision` blocks on it or `endsWithChoices`; the new `REASON`; usage text.
- [x] 1.2 `scripts/tests/ask-check.test.mjs`: *Close this chat?*, a question mid-paragraph, and a question above a tap-link line are flagged; a report with no question, a finished plan's ending, and a turn that called `AskUserQuestion` pass.

## 2. Daily

- [x] 2.1 `.agents/daily/profile.mjs`: the `askedInText` slot.
- [x] 2.2 `chief.mjs`: `status` marks `typedAsk` and `mark` on stopped chats with no card; `reask`; `reply` takes `kind`; `answer` refuses a close answer.
- [x] 2.3 `daily.mjs`: `reask --agent --mark` in usage, options and needs.
- [x] 2.4 `scripts/tests/daily-chief.test.mjs`: `status` marks `typedAsk` only on a stopped chat with no card whose last turn ends on a question, and drops its `finished`; `reask` sends the Claude and the Codex text and refuses a moved stop; `answer` refuses *Close it (Recommended)* and *Keep it open* and still sends another answer.

## 3. Skill and docs

- [x] 3.1 `.agents/plugins/daily/daily/SKILL.md`: the *What's going on?* bullet; offset the added words.
- [x] 3.2 `references/chief.md`: a close question waits for the person.
- [x] 3.3 `wiki/development/daily.md#close-finished-chats` and `.agents/plugins/loop/skills/explore/references/asking-the-user.md#which-tool-carries-it`: a typed question comes back as a card; Daily never answers a close card.
- [x] 3.4 `CHANGELOG.md`: `## Next (minor) — Every question for you comes on a card`, **Updating.** nothing by hand.

## 4. Checks

- [x] 4.1 `node .github/scripts/checks.mjs --worktree` passes here but for `payload:module-versions`, which fails only because `main` moved ahead; `/ship prepare` reruns every check once `main` is merged in.
- [x] 4.2 `openspec validate typed-questions-become-cards --strict --no-interactive` passes.
