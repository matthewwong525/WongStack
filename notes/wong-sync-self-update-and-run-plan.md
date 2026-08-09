---
slug: wong-sync-self-update-and-run-plan
started: 2026-08-09
updated: 2026-08-09
consolidated:
---

# /wong-sync updates itself first and plans its whole run

Second wong-sync change of the same session, immediately after [[wong-sync-adapt-by-default]] merged as v9.10.0.

## What the user asked for

Two things, stated together: the sync "should essentially just make an openspec plan with all the changes being made", and "it should pull the latest version of wong-sync first before starting."

The first is the same instinct they applied to the previous change — earlier in the session they approved that work with *"as long as we list out all the changes we are about to make and the user reviews them which i think is already the flow."* This is that principle turned on the sync's own output: they want one document enumerating the whole run, not a plan that covers only the adoptions while copies and direct updates scroll past in chat. Worth remembering as a standing preference: **this user wants the full changeset enumerated for review, and treats "it happened but wasn't written down" as the defect.**

## Why self-update had to be about ordering, not mechanism

v9.10.0 already made updating an untouched payload file safe (blob-hash proof). `wong-sync` is itself a payload file, so it was already being updated — just in the general Step 2 loop, which is *after* the instructions for the run were loaded. The consequence is subtle and was the whole motivation: the improvement lands on disk unused and only takes effect next invocation, so a repo that syncs monthly is permanently one release behind in *behavior* even when its files are current. The fix is a labeled pass at the top of Step 2, not a new mechanism.

## Decisions worth keeping

- **"Follow the new instructions" was under-specified until we defined what carries over.** Settled: re-read `SKILL.md` + `references/**`, **re-run Step 0** (a newer version may read a manifest key the old one never consulted — carrying old values forward would run new logic on an incomplete reading), but **keep Step 1's clone** and its derived values, which are facts about the clone and true under either version. No second fetch.
- **The once-per-run limit is a stated hard rule, not a consequence of the proof.** After the write the files match upstream's current blob so a second pass finds nothing — but relying on that means a version-skew bug could spin. Cheap belt-and-braces.
- **A customized `wong-sync` must fail *loudly*.** The proof already prevents the overwrite; the addition is that the run must name the version it is actually running. Silence is the real failure mode — a user who believes they're on current logic has no way to discover otherwise.
- **Rejected: a separate `.claude/wong-sync-last-run.md` run report.** It would recreate the exact "two documents to reconcile" problem the single-plan request exists to solve.
- **Landed edits go in the run plan's proposal, not its tasks** — they're already in the working tree. Defensible only because they're *uncommitted*: review still precedes anything durable, and `/ship` archives the folder as that sync's record.

## Risk we accepted and should watch

Self-update executes newly fetched instructions **in the same run**, so a bad upstream release takes effect immediately rather than after a review cycle. Bounded by everything else the skill guarantees (no git in target, read-only clone, proposes-never-implements, uncommitted writes visible in the `/save` diff), and pinning is possible only by editing your copy — which is a deliberate, if blunt, escape hatch. Flagged to the user at plan review.

## Mechanics learned

- `grep -r` for `adopt-wongstack` found **five** payload sites (SKILL.md ×2, adapt.md ×3) plus the spec — the `.agents/` search rule from `wiki/development/repo-layout.md` earned its keep again.
- In-page markdown anchors: a heading with an em dash (`— first, and once`) generates a double-hyphen anchor and won't match the obvious link. Renamed the heading to use a colon so `#the-self-update-pass-first-and-once` resolves. `check-payload-links.mjs` does **not** appear to validate same-file anchors, so this one had to be caught by hand.

## Open threads

- The `improve-openspec-plans` change has been sitting in `openspec list` with no tasks for the whole session — unrelated to this work, but it's accumulating.
- Untested in a real target repo: the re-read/re-run-Step-0 dance is specified prose, and its first genuine exercise will be the first sync of a repo running 9.11.0.
