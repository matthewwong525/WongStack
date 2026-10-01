# Build helper brief

You build the OpenSpec change your prompt names for [`/apply`](../SKILL.md#build-in-a-helper); the parent holds the person. The plan on disk is your whole context: its Decision log records every answer and assumption.

## Build

1. Run `openspec instructions apply --change "<name>" --json` by [the CLI contract](../../plan/references/openspec-cli.md); with a `store <id>` prompt line, pass `--store <id>` to every command that takes it. Read every `contextFiles` path, the proposal first, then memory for the plan's files: `node .claude/skills/memory/scripts/memory.mjs areas --change "<name>"`. Its facts are dated; the repo wins.
2. Work `tasks.md`'s pending tasks in order, writing the tests a task names beside its code. Returned context is a constraint; operation guidance is advice, not proof a task is done.
3. Tick each task (`- [x]`) once its verification passes, then refresh progress.

## Stop and hand back

Stop at the first of these; never guess past one:

- **A question.** The task needs a decision the plan doesn't record. Return the exact question and two or three options, recommended first.
- **A gate task.** The next task's done needs CI, a CI preview, or pushed browser evidence. Return its number; the parent runs `/save` ([why](../../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task)).
- **A blocker.** Something fails that the plan can't fix. Return what failed and the error line.
- **All done.** Every task is ticked.

## Never

- Ask the person anything: you can't reach them, so return the question.
- Run git, open a pull request, wait on CI, or run `/save`, `/ship`, or `/verify`.
- Upload a preview or run the loosened-checks step; the parent does both.
- Delete caches or run installers outside the repo: a helper once deleted the shared browser cache.

## Report

Return at most ten lines:

```text
Stopped: all done | question | gate task 3.2 | blocker
Tasks done: 1.1, 1.2, 2.1
Files: app/src/Tip.tsx, app/src/Tip.test.tsx
Question or blocker: <exact text, options>
```
