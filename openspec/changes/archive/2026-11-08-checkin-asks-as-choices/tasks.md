# Tasks

## 1. The check-in sends back a typed question

- [x] 1.1 `daily/scripts/stop-check.mjs`: judge buckets `[...BUCKETS, 'ask']` in `judgeLine` (an `ask` reply may be empty); a fixed send-back text per agent's question tool; the streak's `asked` flag, reset with a new `since`; a second `ask` in one stretch journals and lets the chat stop
- [x] 1.2 `daily/references/briefs/stop-judge.md`: name the `ask` bucket and its empty `reply`
- [x] 1.3 `daily/references/chief.md` *Sort each stop* 2: a pick is also a small, safe decision or an obvious question with one plain best answer, recommended or not; *Needs you*: from the stop step, a typed question for the person is `ask`; a plan, a sign-in, key or payment step, and an open question tool stay `person`
- [x] 1.4 Tests in `scripts/tests/daily-stop-check.test.mjs`: `judgeLine` takes `ask` with an empty reply; `ask` blocks with the Claude Code text and with the Codex text; a second `ask` before the person writes lets the chat stop with one journal line; a person's message resets `asked`; `ask` counts toward the streak

## 2. Docs and release

- [x] 2.1 `wiki/development/daily.md` *Check-ins*: *Obvious pick* names a small decision or an obvious question with no recommendation; a typed question for you comes back once as tap answers, recommended first, unless the check-in can pick it
- [x] 2.2 `CHANGELOG.md`: a `## Next (minor)` entry

## 3. Checks

- [x] 3.1 Run `node --test scripts/tests/daily-stop-check.test.mjs`, `node scripts/measure-context.mjs --check` (cut offsetting words if it fails), and `node .github/scripts/checks.mjs --worktree`
- [x] 3.2 After `/save`, run one check-in by hand on a chat that stopped on a typed question with the person's last message over 15 minutes old, and see it ask with the question tool, recommended first (seen 2026-11-08 on this computer: the real judge sorted a typed question `ask`, the second stop waited, and a Paseo Claude chat given the send-back asked with AskUserQuestion, "Remove, fix links (Recommended)" first)
