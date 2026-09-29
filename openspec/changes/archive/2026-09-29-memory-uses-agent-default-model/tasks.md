# Tasks

## 1. Memory runner and checks

- [x] 1.1 In `.agents/skills/memory/scripts/run.mjs`, omit `--model`/`-m` when the matching memory model variable is unset or empty, and pass the flag only for an explicit value; verify `agentCommand()` covers both Claude Code and Codex paths.
- [x] 1.2 In `scripts/tests/memory-capture.test.mjs`, check default and explicit-override arguments for both agents, and update the fake Claude hook expectation; verify the focused test passes and no model call is needed.

## 2. Guidance and release

- [x] 2.1 Update `wiki/development/memory.md` to say capture follows the agent CLI's normal default, may use more allowance than the old small-model run, and can be overridden by the two existing environment variables; verify the page no longer gives a fixed Haiku cost estimate.
- [x] 2.2 Add `## Next (minor) — Memory uses your agent's model` to `CHANGELOG.md` with an Updating note saying no hand step is needed; verify `VERSION` is untouched and `node scripts/check-payload-links.mjs` passes.

## 3. Integration check

- [x] 3.1 Run `openspec validate memory-uses-agent-default-model --strict --no-interactive` and `node scripts/check-openspec-config.mjs`; verify both pass before `/ship` archives the change and sends the finished work through CI.
