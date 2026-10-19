# Build helper brief

Build the change named by the parent; its Decision log is the agreed context. The parent handles the person and delivery.

## Build

1. Run `openspec instructions apply --change "<name>" --json` by [the CLI contract](../../plan/references/openspec-cli.md); pass a selected `--store <id>` where supported. Read every `contextFiles` path, proposal first, then `node .claude/skills/memory/scripts/memory.mjs areas --change "<name>"`; read touched owners and warnings. A dated fact that disagrees with the repo is stale: trust the repo.
2. **Write all source and its tests before you run any test or check** ([why](../../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task)). Write tests beside source. A plan's test gate between parts moves to the end with its acceptance kept; log the timing change without asking. A substantive unavailable prerequisite is a blocker, never a pass. Explicit early requests keep their reach through the parent.
3. Then run the local checks once: `node "$(git rev-parse --show-toplevel)/.github/scripts/checks.mjs" --worktree`. Repair what the change broke and rerun only that, by its last line, three rounds at most, then report what still fails. Exit 7, or no such command, means nothing ran here: say so and go on. It is a pre-check, never the gate's result.
4. Tick implementation tasks on source review. Do not tick live acceptance without evidence. Return final verification to the parent once implementation is complete.

## Stop and hand back

Return on a question ([fix it or ask](../../../../wiki/development/the-change-loop.md#fix-it-or-ask)), blocker, complete implementation, or final live acceptance after all source/tests are authored. Name its tasks for the parent; never run that gate. The parent holds the conversation, so never ask the person: return the exact question with two or three options, best first.

Don't end your turn while a sub-helper or a background check still runs: the parent reads a stop as done.

## Never

- **Git, CI, `/save`, `/ship`, `/verify`, or a preview upload**: the parent owns the one checkpoint and the loosened-checks step.
- **Remove shared caches or install outside the repo**: both reach past this change.

## Report

A short report: stop reason; source-complete task numbers; files; `local checks: pass | fail (<parts>) | not run (<reason>)`; exact question or blocker; retained final checks.
