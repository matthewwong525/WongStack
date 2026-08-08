# Simplified English requirement

**Status:** ready-to-ship
**Open questions:** none

## Why

WongStack has a concise voice guide, but it does not require a controlled form of English. A best-effort ASD-STE100 rule will make agent-facing and user-facing prose easier to read and translate.

## What Changes

- Add a generic `AGENTS.md` rule that requires best-effort ASD-STE100 Simplified Technical English.
- Exempt code, commands, identifiers, quotations, and prescribed text that must remain exact.
- Release the payload change with a minor version bump and a changelog entry.

## Capabilities

### New Capabilities

- `simplified-technical-english`: Defines the payload-wide writing requirement and its exact-text exceptions.

### Modified Capabilities

None.

## Impact

The generic `WONG-STACK` block in `AGENTS.md`, `VERSION`, and `CHANGELOG.md` change. Downstream repositories receive the rule when they adopt or update the block through WongStack.

## Non-goals

This change does not bundle the ASD-STE100 specification, add an automated conformance checker, or claim formally verified compliance.

## Decision log

- **2026-08-08** — Added the shared ASD-STE100 instruction as a best-effort rule because the user confirmed that formal verification is not required. Exact-text exceptions protect code, commands, identifiers, quotations, and prescribed text. Released the payload behavior as version 9.7.0.
- **2026-08-08** — Archived the completed change for the `/ship` checkpoint. The `simplified-technical-english` capability was already synced to the main specifications, and all tasks were complete.
