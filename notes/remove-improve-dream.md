---
slug: remove-improve-dream
started: 2026-09-15
updated: 2026-09-15
---

# Remove improve and dream

## Open thread

The user expects a bare `/ship` after `/explore` to continue the intent that was just explored instead
of stopping because the branch has no commits. This retirement change uses the confirmed explored
intent, but it does not change `/ship`'s clean-branch preflight. That workflow issue remains separate.
