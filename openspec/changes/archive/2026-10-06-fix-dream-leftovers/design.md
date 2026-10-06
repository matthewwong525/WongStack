# Design

## Context

The first real `/dream-memory` run (37.0.1) listed two spec statements the product no longer matches, and its publish step failed at `git switch -c dream-<date> origin/main` because the day's first dream had already made that branch. See proposal.md for why.

## Goals / Non-Goals

**Goals:** correct the two statements through deltas; let a second dream in a day name its own branch.

**Non-Goals:** changing what either skill does; changing `dream.mjs`.

## Decisions

1. **The branch takes a counter.** Step 11 names `dream-<date>`, then `-2`, `-3` when taken. *Alternative:* a time in the name; rejected as longer for a case that is rare.
2. **The multi-part scenario stops naming a skill.** It describes any scheduled run that finds two parts, so it stays true whichever skill runs.
3. **The README requirement drops one clause.** The top-level-entries list was cut on purpose in 31.4.1; the tools and Cloudflare clauses still hold.

## Risks / Trade-offs

- [The retired-names allow for the multi-part spec is removed] → the check now fails if the old command name returns there.
