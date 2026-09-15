# Retire the improve and dream skills

**Status:** ready-to-ship
**Open questions:** none

## Why

`/improve` and `/dream` add two large, separate workflows that are rarely used and overlap the normal `/explore` → `/plan` path and explicit wiki work. The unused consolidation lifecycle also leaves every saved note waiting for a later step that does not happen.

## What Changes

- **BREAKING:** Remove the `improve` and `dream` skill directories from WongStack and from the core payload, setup checks, command lists, and examples. (review.html#/retired-skills/removal)
- Keep session notes as permanent context for `/continue`, but remove the `consolidated:` watermark and every promise of automatic note-to-wiki consolidation. Wiki edits become explicit work governed by the existing wiki rules. (review.html#/notes-lifecycle/permanent)
- Update `/wong-sync` so an upgrade proposes removal of provably unmodified retired skill copies, preserves locally changed copies as local skills, and removes both names from the managed skills list. (review.html#/sync-retirement/safe-retire)
- Remove current specifications that exist only for the retired workflows, revise the specifications that refer to them, and remove the empty `improve-openspec-plans` scaffold. (review.html#/current-specs/spec-cleanup)
- Release the command removal as WongStack 14.0.0, keep historical archives and changelog entries unchanged, and run the payload link check. (review.html#/release/major)

**Non-goals:** Do not move either workflow into `/save`, `/ship`, or another skill. Do not delete existing session notes or rewrite historical OpenSpec archives and changelog entries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-knowledge-center`: Present durable notes and explicit wiki work without `/dream` or `/improve`.
- `delivery-gate`: Keep the prose allowlist while removing workflow-specific examples and references.
- `improve-plan-output`: Remove the retired audit-and-plan contract.
- `session-notes`: Make notes permanent cold-resume context with no consolidation state or consumer.
- `toolchain-dependencies`: Remove both retired commands from the core-verb inventory.
- `wiki-root`: Remove compatibility requirements that exist only for `/dream` and `/improve docs`.
- `wong-sync`: Retire both skills safely from future installs and existing managed installations.

## Impact

This changes the payload under `.agents/` (and therefore `.claude/`), the setup and sync runbooks, `AGENTS.md`, `README.md`, `notes/README.md`, the wiki process pages, current OpenSpec specifications, `VERSION`, and `CHANGELOG.md`. Existing target repositories will see a reviewable removal task on their next `/wong-sync`; locally authored skill variants stay untouched.

## Decision log

- **2026-09-15** — Asked whether retirement means hiding the commands or removing their workflows; assumed full removal because the request called them redundant and infrequently used.
- **2026-09-15** — Asked what replaces `/dream`; assumed no replacement. Notes stay for `/continue`, while wiki edits become explicit tasks under the existing wiki rules.
- **2026-09-15** — Asked how upgrades handle installed copies; assumed removal only when the retired copy is provably unmodified. A customized copy stays in place but leaves WongStack's managed skills list.
- **2026-09-15** — Asked whether to clean history; assumed historical archives and changelog entries stay immutable, while current specs and the empty active scaffold are removed or revised.
- **2026-09-15** — Treated the removal of two public commands as a breaking release and selected version 14.0.0.
- **2026-09-15** — Completed all implementation tasks, synchronized the seven capability deltas into the current specifications, and retired the now-empty `improve-plan-output` capability. Payload links and strict OpenSpec validation pass.
