# Improve toward an outcome

**Status:** ready-to-ship
**Branch:** improve-skill-elegance
**Open questions:** none

## Why

The improvement command spends too much instruction on where to look and how to choose work. Give the agent a clear outcome and room to find what matters, using the same delivery process as every other change.

## What Changes

- **Ask for a useful result.** Find and ship one improvement that makes the project more useful, reliable, or easier to maintain. A focus can name an area or an outcome; the agent chooses its investigation and explains the evidence.
  ```text
  desired outcome
         │
         ▼
  agent finds worthwhile work
         │
         ▼
      /ship
  ```
- **Use the existing system.** Project goals, remembered problems, and current work inform the choice. Planning, building, checks, and publishing belong to the normal delivery skills; no mandatory candidate menu or separate maintenance record.
- **Keep a findings-only option.** Ask for findings without edits or publishing. Nothing worthwhile remains a valid result, with no change made.
- **Remove the extra machinery.** Drop the compulsory scan, weekly rotation, and specialist playbooks. Update the guides so they describe the simpler command.

**Non-goals:** Changing the delivery gates, scheduling a routine, implementing a second improvement, or changing the app.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `repository-improvement`: outcome-led selection with one supported improvement through normal delivery, retaining findings-only and no-change results.

## Impact

Rewrite `.agents/skills/improve/SKILL.md`; remove its survey, references, and survey-only tests; update CLI test registration, README, the owning wiki pages, payload manifest, and retired-name inventory. Amend the repository-improvement spec and add a minor release entry. No new runtime, package, service, or application change.

## Decision log

- **2026-09-30** — Asked how the skill should guide the agent → chose a specific outcome with freedom to choose the approach, rather than prescribing the investigation.
- **2026-09-30** — Asked the next step → chose `/ship`, authorizing planning, implementation, and publishing through the existing loop.
- **2026-09-30** — Assumed: keep `--audit-only` and no-change outcomes because they remain useful without a fixed investigation procedure.
- **2026-09-30** — Assumed: a focus may name an outcome or an area because the requested direction is outcome-led and existing area invocations should remain useful.
- **2026-09-30** — Assumed: remove unused survey machinery and specialist references because keeping a second investigation workflow would undermine the chosen simplification.
- **2026-09-30** — Assumed: scheduling still uses a clean, current, serialized checkout as the repository's scheduling convention requires; delivery uses the existing skills' preconditions.
- **2026-09-30** — Check: `scripts/tests/improve-survey.test.mjs` is deleted because its only subject is the removed survey; this removes survey coverage, while the remaining payload and workflow checks continue to run.
- **2026-09-30** — Check: `scripts/tests/cli-conventions.test.mjs` drops the removed survey's entry because that executable no longer ships; all remaining CLI entries keep their checks.
- **2026-09-30** — Assumed: the completed change is ready for its archive checkpoint because payload links, OpenSpec configuration, retired names, strict validation, and the context-size check passed; instruction words are 25,027 against the 27,084 baseline. CI will exercise the remaining tool suite. Session feedback could not be captured because this checkout has no registered session. The generic skill validator does not support WongStack's existing `user-invocable` extension; the field is preserved.
