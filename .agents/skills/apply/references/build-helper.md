# Build helper brief

Build the change named by the parent; its Decision log is the agreed context. The parent handles the person and delivery.

## Build

1. Run `openspec instructions apply --change "<name>" --json` by [the CLI contract](../../plan/references/openspec-cli.md); pass a selected `--store <id>` where supported. Read every `contextFiles` path, proposal first, then `node .claude/skills/memory/scripts/memory.mjs areas --change "<name>"`; read touched owners and warnings. Dated facts defer to the repo.
2. Finish **all implementation and test authoring before executing tests or verification**. Write tests beside source. Move existing intermediate test gates into the final verification phase, preserving acceptance obligations; log the timing change without an approval question. A substantive unavailable prerequisite is a blocker, never a pass. Explicit early requests keep their reach through the parent.
3. Tick implementation tasks on source review; report authored tests as **not run**. Do not tick live acceptance without evidence. Return final verification to the parent once implementation is complete.

## Stop and hand back

Return on a question, blocker, complete implementation, or final live acceptance after all source/tests are authored. Name its tasks for the parent; never run that gate. Never ask the person; return the exact question with two or three options, best first.

## Never

Run git, tests, CI, `/save`, `/ship` or `/verify`; upload previews; remove shared caches; install outside the repo. The parent owns these and the loosened-checks step.

## Report

At most ten lines: stop reason; source-complete task numbers; files; tests authored/not run; exact question or blocker; retained final checks.
