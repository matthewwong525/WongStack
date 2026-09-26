## Context

See [proposal.md](proposal.md) for why. WongStack 19.0.0 removed the notes import. Stores that ran it before still hold its records, and this repo's store is one of them. The schema and `SOURCES` still accept the `migration` values.

## Goals / Non-Goals

**Goals:**
- Put the compatibility promise in a requirement and a test, so a later change cannot break `source` for migrated notes without CI failing.

**Non-Goals:**
- No schema migration. A migration that drops `migration` from the CHECK constraints would reject rows that already use it.

## Decisions

- **Seed the store directly in the test.** The import command is gone, so the test writes the session row, the fact, and the R2 object straight into the fake Cloudflare store. Alternative: keep a test-only import path. Rejected: it would ship code that exists only for a test.
- **`source` needs no change.** It reads `raw_key` from the session row and prints the object. When the object is not a transcript, it prints the raw text, which is how a `migration/<slug>.md` note prints today.
- **Version 19.0.1.** The change adds a test and fixes spec wording. No shipped behavior changes.

## Risks / Trade-offs

- [The test seeds rows by hand, so it can drift from what the old import wrote] → The seeded rows match the 18.1.0 import: session id `migration:<slug>`, agent `migration`, status `captured`, `raw_key` `migration/<slug>.md`, fact source `migration`.

## Migration Plan

Nothing runs in a target. Rollback is a revert of the release commit.
