# Design

## Context

See [proposal.md](proposal.md). The private-link parser defaults passwords and forms to 10 minutes and keys to 30; reply links already default to eight hours.

## Decisions

Use one 480-minute default in the existing private-link parser, keeping `--minutes` compatible. Preserve watchdog deadlines and early completion, closure, and replacement. Update CLI comments/help and the owning browsing, passwords, and secrets pages. Extend existing private-link tests to observe persisted deadlines for each mode and explicit overrides without waiting eight hours.

## Risks / Trade-offs

A still-open link remains usable longer; completion, cancellation, and existing replacement rules continue to close it early. Existing links retain their saved deadlines; newly opened links get the new default.

## Migration Plan

Ship as a minor payload release with no manual update steps. Review page: [review.html](review.html).
