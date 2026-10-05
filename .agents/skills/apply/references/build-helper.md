# Build helper brief

Build the change named by the parent; its Decision log is the agreed context. The parent handles the person and delivery.

## Build

1. Run `openspec instructions apply --change "<name>" --json` by [the CLI contract](../../plan/references/openspec-cli.md); pass a selected `--store <id>` where supported. Read every `contextFiles` path, proposal first, then `node .claude/skills/memory/scripts/memory.mjs areas --change "<name>"`; read touched owners and warnings. Dated facts defer to the repo.
2. Finish **all implementation and test authoring before executing tests or verification**. Write tests beside source. Move existing intermediate test gates into the final verification phase, preserving acceptance obligations; log the timing change without an approval question. A substantive unavailable prerequisite is a blocker, never a pass. Explicit early requests keep their reach through the parent.
3. Then run the local checks once: `node "$(git rev-parse --show-toplevel)/.github/scripts/checks.mjs" --worktree`. Repair what the change broke and rerun only that, by its last line, three rounds at most. Exit 7, or no such command, means nothing ran here: say so and go on. It is a pre-check, never the gate's result.
4. Tick implementation tasks on source review. Do not tick live acceptance without evidence. Return final verification to the parent once implementation is complete.

## Stop and hand back

Return on a question, blocker, complete implementation, or final live acceptance after all source/tests are authored. Name its tasks for the parent; never run that gate. Never ask the person; return the exact question with two or three options, best first.

## Never

Run git, CI, `/save`, `/ship` or `/verify`; run a test before step 3; upload previews; remove shared caches; install outside the repo. The parent owns these and the loosened-checks step.

## Report

At most ten lines: stop reason; source-complete task numbers; files; `local checks: pass | fail (<parts>) | not run (<reason>)`; exact question or blocker; retained final checks.
