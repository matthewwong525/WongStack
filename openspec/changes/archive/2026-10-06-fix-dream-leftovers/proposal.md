# Fix what the first memory dream found

**Status:** ready-to-ship

**Branch:** fix-dream-leftovers

**Open questions:** none

## Why

The first real memory dream listed two specs that no longer match the product, and it could not start a second time on the same day without a hand fix. Both are small and were left open when the two skills were renamed.

## What Changes

- **Two specs say what is true again.** One said a scheduled improvement run publishes a fix; the code skill now only plans. One required a README section that was cut on purpose.
- **A second dream on the same day works.** It no longer stops because the day's first dream already used its branch name.

**Non-goals.** No change to what either skill does.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multi-part-workspaces`: the unattended scenario no longer names a scheduled improvement run that ships.
- `open-source-release`: the README requirement drops the list of top-level entries.
- `wiki-dream`: a dream can run more than once in a day.

## Impact

`.agents/skills/dream-memory/SKILL.md` (step 11), `scripts/retired-names.json` (one allow removed), `CHANGELOG.md` (patch).

## Decision log

- **2026-10-06** — Asked what to do after the publish → chose: fix the leftovers first, as one small follow-up change.
- **2026-10-06** — Assumed: the README requirement drops only the top-level-entries clause, because the README still lists setup's tools and Cloudflare, and Matthew approved the shorter README in 31.4.1.
