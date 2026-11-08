# Tasks

## 1. The rule

- [x] 1.1 `.agents/skills/explore/references/asking-the-user.md` *End every reply with the next step*: each link on its own chat line, and the full link also in the question text when the question asks the person to use it; never in an option, which may name it
- [x] 1.2 Same page, *Print the plan's link* and *Print the preview's link*: a closing question repeats the full link in its text

## 2. The check

- [x] 2.1 `.agents/skills/explore/scripts/ask-check.mjs`: `turnLinks`, `linksDecision`, `LINKS_REASON`, a `links` mode in `USAGE` and the CLI; `REMINDER` names the link rule
- [x] 2.2 `.agents/settings.json`: `PreToolUse` matcher `AskUserQuestion` → `ask-check.mjs links`, timeout 3
- [x] 2.3 Tests in `scripts/tests/ask-check.test.mjs`: a turn link missing from the question denies with the link named; a `Click here to see the plan:` line in a tool result counts; a question holding every link, or a turn with none, passes; a turn that already got `LINKS_REASON` passes; an unreadable transcript passes; the CLI prints the deny JSON

## 3. Release

- [x] 3.1 `CHANGELOG.md`: a `## Next (minor)` entry

## 4. Checks

- [x] 4.1 Run `node --test scripts/tests/ask-check.test.mjs`, `node scripts/measure-context.mjs --check` (cut offsetting words if it fails), and `node .github/scripts/checks.mjs --worktree`
- [x] 4.2 Run the hook in a live Claude Code chat by [test a hook](../../../wiki/maintaining/test-a-hook.md#with-the-question-box): a prompt that prints a link and asks without it is sent back once, then asks with the link in the question (seen 2026-11-08 in a Paseo Claude chat: the first ask, "Should I keep going?", was sent back naming https://example.com/test-page, and the chat asked again with the link in the question)
