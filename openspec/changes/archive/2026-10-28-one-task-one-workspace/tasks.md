# Tasks

## 1. Rule

- [x] 1.1 Add the *One task, one workspace* section to `wiki/development/the-change-loop.md`, link it from the plain-request paragraph, and move the test-file paragraph to `wiki/development/loosened-checks.md`. Verify `wc -w` stays under 3,000.
- [x] 1.2 Add the rule line to `AGENTS.md`'s `WONG-STACK` block.

## 2. Skills

- [x] 2.1 `asking-the-user.md`: finished work in a Paseo worktree runs `/close` after the report, after any routine or app offer; never on a plan review, a build, a blocker, a failed check, a declined publish or a question.
- [x] 2.2 `ship/SKILL.md` and `new-workspace.md#next-work`: in a Paseo worktree, open each left part, then `/close`, with no question; elsewhere ask as before.
- [x] 2.3 `new-workspace.md`: add *New task in this chat*.
- [x] 2.4 `close/SKILL.md`: a finished task runs it with no question; the wiki `/ship` it invokes does not run `/close` again.
- [x] 2.5 Add `## Next (minor) — One task, one workspace` to `CHANGELOG.md`.

## 3. Verification

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree`; it passes (links, word cap, context).
