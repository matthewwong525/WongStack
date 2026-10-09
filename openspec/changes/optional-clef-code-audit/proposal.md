# Optional Clef code audit

**Status:** ready-to-ship
**Branch:** clef-verification
**Open questions:** none

## Why

Verification can miss a risky code path when the written checks cover only its happy path. The larger Clef model caught all nine planted code defects in our trial, but also flagged one healthy change. It can suggest where to look; it cannot decide whether a change works.

## What Changes

- Add an optional code audit when someone asks for `/verify --code-audit`. Use the larger Clef model to read saved code, its earlier version, and the selected written expectations.
- Review its flags before choosing a follow-up check. Keep the ordinary observations and their written expectations as the basis for verification.
  ```text
  saved code ─▶ Clef ─▶ inspect flags
                            │
                            ▼
  written checks ─────▶ observe ─▶ report
  ```
- Keep the audit off by default. Missing access, too much code or a service failure is reported separately and does not stop ordinary checks.

Non-goals: image analysis, a second evidence judge, automatic fixes from a model answer, a new publishing gate, or a whole-repository scan.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: an explicitly requested, revision-bound, advisory code audit with bounded requests and private temporary records.

## Impact

The verify skill gains a small Node helper and an optional guide. The walkthrough explains its use and limits. Focused tests exercise code selection, credential removal and failure handling. Existing Cloudflare account credentials are reused; no package dependency, configuration variable or app screen changes. This is a minor payload addition.

## Decision log

- The person requested a trial before planning, clarified that they wanted code analysis, and accepted an optional audit using the larger Clef after the code-only trial.
- Use `@cf/cloudflare/clef`, never Clef-Flash. The larger model caught 9/9 planted defects and accepted 9/9 repaired versions, but accepted only 3/4 healthy controls. Its combined head/direction answers were correct on 20/22 packets; these results failed the trial's strict adoption rule. The person chose the limited advisory role despite that false alarm.
- Ordinary `/verify` and `/ship` do not call the model. A favorable answer cannot skip a check, and a flag needs source inspection and observed evidence before it affects a verdict or repair.
- Finish source and tests before running checks. Final acceptance calls the real service on fresh saved-code fixtures and records all outcomes, including false alarms and misses; it is not proof of deployed product behavior.
- 2026-10-09: Built the larger-only optional audit and passed local checks. The four-case follow-up initially leaked labels in scenario names and filenames; the corrected, neutral rerun caught both seeded defects and falsely flagged one healthy case at probability 0.9142. Full corrected evidence and the excluded original are retained in this change. The person questioned security reliability; no broader security coverage was claimed or added. `/close` saves this completed implementation for review without merging it.
