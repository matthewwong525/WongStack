# Tasks

## 1. The ask check script

- [x] 1.1 Write `.agents/skills/explore/scripts/ask-check.mjs` with `stop` and `reminder` modes, `--help`, and fail-open handling, by design.md *The stop check* and *The reminder line*; `node .agents/skills/explore/scripts/ask-check.mjs --help` prints its usage.
- [x] 1.2 Write `scripts/tests/ask-check.test.mjs` with trimmed fixtures: typed lists after `What next?`, after `Next step:`, a plain `Which do you want?` list, a turn that called `AskUserQuestion`, a `What changed?` report, a plain bullet report, `stop_hook_active`, `WONG_MEMORY_RUN=1`, an unreadable transcript, and the reminder line; the test passes.
- [x] 1.3 Backtest the script on this machine's Claude transcripts since 2026-10-01 and record the flagged count and any false alarm in the Decision log; expect 25 flagged, all slips.

## 2. Hooks

- [x] 2.1 Add a `Stop` hook running `ask-check.mjs stop` and a `SessionStart` entry matching `compact` running `ask-check.mjs reminder` to `.agents/settings.json`, using `$CLAUDE_PROJECT_DIR` like the memory hooks; leave `.agents/hooks.json` unchanged. `scripts/tests/agent-layout.test.mjs` and the payload checks pass.
- [x] 2.2 Name the ask hooks beside the memory hooks in `.agents/skills/wong-sync/references/payload-manifest.md`, and confirm `/wong-sync`'s hook merge carries a new event (`Stop`) into a target's settings; `node scripts/check-payload-links.mjs` passes.

## 3. Skill wording

- [x] 3.1 In `.agents/skills/explore/references/asking-the-user.md`, draw the anatomy example as a question card, open *End every reply with the next step* with "Call the question tool", and add the stop-check clause under *Which tool carries it*.
- [x] 3.2 Change the closing lines in `apply/SKILL.md` step 5, `save/SKILL.md`, `ship/SKILL.md` *Close*, and `verify/SKILL.md` step 5 to "Ask … with the question tool", and split `verify/references/walkthrough.md` § f's handoff: text options in the comment, the tool in chat.
- [x] 3.3 Cut the same number of bytes from those files; `node scripts/measure-context.mjs --check` passes with no `ISSUE:` line.

## 4. Release

- [x] 4.1 Add a `## Next (minor) — Ask next steps with the question box` entry to `CHANGELOG.md`, with an **Updating.** note in plain words saying the sync adds two small Claude Code hooks.
- [x] 4.2 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate ask-with-the-question-box --strict --no-interactive`; both pass.
- [x] 4.3 `/save`, then in a live Claude Code session in this checkout end a reply with a typed `What next?` list and confirm the agent is sent back once and asks with `AskUserQuestion`.
