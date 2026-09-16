# Simplify WongStack entry skills

**Status:** ready-to-ship
**Open questions:** none

## Why

Setup and sync maintain separate workflows with fixed interviews, classifications, and report formats. They should provide context to the same skills used for all other work.

## What Changes

- **BREAKING:** Make `/wong-sync` fetch the latest source and invoke `/explore` with the update intent. Remove its verdict pipeline and fixed proposal format. (review.html#/sync-flow/handoff)
- **BREAKING:** Make `/wong-setup` invoke the same workflow with installation intent, using source skills when target skills are absent. (review.html#/setup-flow/handoff)
- Remove the obsolete playbooks, keep the payload inventory and install record, and update the entry-point descriptions for release 15.0.0. (review.html#/files/release)

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `wong-sync`: Latest-source context and an exploration handoff replace the custom update procedure.
- `install-onboarding`: Installation enters the normal skills instead of a separate setup procedure.
- `wong-sync-adapt`: The normal exploration skill owns investigation and questions.
- `wong-sync-after-picture`: The normal planning skill owns proposal structure.

## Impact

The two skill entry points, their references, README, AGENTS.md, the Cloudflare source-lookup reference, and release metadata change. Existing install records remain readable. Existing user work and optional component choices remain inputs to the normal plan.

Non-goals: change the core workflow skills, install WongStack into this source repo, change application code, or rewrite the wiki.

## Decision log

- **2026-09-16** — User requested concise setup and sync skills that use the normal workflow, with sync essentially calling `/explore` after obtaining the latest version. No clarification was needed for this scope.
- **2026-09-16** — Fresh setup uses source skills until local skills exist → assumed this fallback (otherwise setup cannot enter the workflow it installs). Keep the existing payload inventory and manifest fields → assumed compatibility with other consumers. Use instructions for source retrieval rather than a new helper script → assumed the small read-only preparation does not justify a new tool.

- **2026-09-16** — The payload link check found existing wiki links to adapt.md. Keep a short pointer at that path and preserve two old setup anchors; the retired process itself is removed.

- **2026-09-16** — Implemented both handoffs and release 15.0.0. The read-only scenario review found and resolved a legacy-record routing loop. Skill validation, payload links, OpenSpec config, and change validation pass; save syncs the four capability records.

- **2026-09-16** — `/ship` confirmed all six tasks complete and all four delta specs synced, then archived this change. `/save` checkpoints the archive for CI before squash merge.
