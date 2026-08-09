---
slug: wong-sync-adapt-by-default
started: 2026-08-09
updated: 2026-08-09
consolidated:
---

# /wong-sync adapts by default

## What the user stated

- The user could not trust `/wong-sync` to adapt everything: every run needed an explicit "adapt as much as possible" instruction to behave well. Their standing preference: **non-breaking adaptations should be adopted by default** — including small deltas ("even small stuff like adding the date"), which the sync silently dropped.
- They approved all three proposed levers without reservation, on the condition the existing review flow stays intact (sync proposes → user reviews → `/apply`), and explicitly authorized going straight from `/plan` into `/apply` in the same session.

## The diagnosis (why the sync under-adopted)

The conservatism was coded in three spec rules in `references/adapt.md`, not vague model behavior:

1. `divergent` required no evidence of intent — any local difference counted as "legitimate," and the doc *rewarded* reaching for it ("the verdict that makes this step worth running").
2. The concreteness bar demoted a graft the skill couldn't describe to `not-applicable` — filing an **effort failure as a fit failure**, and burying it where nobody reviews.
3. `present` claimed "current" but nothing verified currency, so small upstream refinements hid under it. Step 1 computed exactly the right signal (the changelog entries since `BASE`) and the spec explicitly discarded it ("context for the report, not a decision").

The reframe that settled everything: the skill's caution rhetoric is calibrated for **overwriting files**, but Step 3 verdicts only write a proposal the user reviews. The failure costs are asymmetric — a false `adopt` costs seconds of review; a false `divergent`/`present` is invisible indefinitely (each rerun re-derives the same conservative call). So `adopt` should be the cheap default verdict: **justify not adopting.**

## Durable design points (beyond the change's Decision log)

- **Provability rule for update-if-untouched:** a file is provably unmodified iff its `git hash-object` blob equals some historical blob of that path in the clone's default-branch history (`rev-list` + `rev-parse <commit>:<path>`). The proof's failure mode is always the status quo (falls back to the adapt path), never a wrong overwrite. This is what makes "never overwrite anything with local authorship" *checkable* rather than aspirational.
- The changelog accounting is a **completeness check on the cartographer's map, not a replacement** — the map catches capabilities predating the last sync; the changelog only catches deltas.
- Repo mechanics tripwire (already in `wiki/development/repo-layout.md`, confirmed load-bearing this session): edits must target `.agents/**` and `AGENTS.md` — `.claude`/`CLAUDE.md` are symlinks the Edit tool won't write through, and `grep -r` doesn't follow them, so payload-wide phrase sweeps must search `.agents/`.
- Mid-session the environment auto-renamed the worktree branch (`humane-hedgehog` → `wong-sync-defaults`); `/save` renamed it to `wong-sync-adapt-by-default` to restore the branch=change tie before the first push.

## Open threads

- The five payload prose surfaces carrying the never-overwrite claim were updated (`SKILL.md` opener/hard rules/description, `adapt.md`, `AGENTS.md` ×2, `README.md`, `wiki/stack/d1-pipeline.md`); openspec/specs Purpose paragraphs still carry the old absolute wording and update at archive/sync time, not by hand.
- Worth watching after release: whether the adopt-biased sync produces proposals noisy enough that users want a "bulk-skip" gesture beyond per-capability `declined`.
