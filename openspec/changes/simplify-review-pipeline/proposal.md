# Simplify the review page pipeline

**Status:** ready-to-ship
**Branch:** explore/session-slowness
**Open questions:** none

## Why

Every `/plan` runs a design subagent, then a critic subagent, then a revision round, all in series on the main thread. Across the last six plans in this repo that pipeline cost 8 to 15 minutes each, and the critic's findings were anchor mechanics the deterministic checker already reports plus cosmetic wording. Reviewers already annotate the page and paste the notes back, so the critic duplicates a review that happens anyway.

## What Changes

- Remove the critic subagent and its revision round from `/plan`. The builder, the structural check, and the reviewer's own annotations are the review of the page. (review.html#/pipeline/after/critic)
- Start the one design subagent in the background right after the proposal draft. The main thread writes the design and tasks while it runs, then places the returned anchors and builds the page.
- Draw one visual per change by default: the flow, screen, diff, or tree that carries the change. A change that adds or restructures screens draws each screen. Every other bullet stays text.
- Make a plan update proportional: re-run the visual author only when the drawn bullet or its visual changes. A text-only edit to the proposal, design, or tasks only rebuilds the page, as `/save` already does.
- Replace the manual desktop-and-phone walk of every state with one run of the structural checker in a browser. Without a browser, report the rendered check as unverified.
- Update the owning spec deltas, the design rule in `openspec/config.yaml`, the author guide, the UX principles wiki page, `VERSION`, and `CHANGELOG.md`.

**Non-goals:** Change the review kit, the builder, the checker, the annotate flow, or `/save`'s proposal refresh; make the page optional; rewrite historical archives; change how `/apply`, `/continue`, or `/ship` read the page.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `ux-wireframes`: the critic scenarios are removed, the page is produced by one author pass plus a structural check, and the default coverage is one visual per change.
- `context-economy`: the routine author contract no longer requires a rendered critique and a revision round; the structural check remains.

## Impact

`.claude/skills/plan/SKILL.md` and `references/review-author.md`, the design rule in `openspec/config.yaml`, `wiki/ux-principles.md`, delta specs for `ux-wireframes` and `context-economy`, `VERSION`, and `CHANGELOG.md`. No script, kit, or manifest changes. Existing review pages keep working; `/save` refreshes them as before.

## Decision log

- **2026-09-22** — Asked which session-length lever to plan first → chose the `/plan` review pipeline, since it is fully in scope and the most consistent cost.
- **2026-09-22** — Asked what happens to the critic subagent and revision round → chose to drop both. The deterministic checker and the reviewer's annotations remain.
- **2026-09-22** — Asked who writes the visuals and when → chose one design subagent launched in the background so task drafting overlaps it, over main-thread authoring and over the serial subagent.
- **2026-09-22** — Asked how much gets drawn → chose one visual per change by default, with each screen drawn when a change adds screens, over author judgment as today and over screens only.
- **2026-09-22** — Assumed the manual state-by-state inspection at two widths goes with the critic, since the checker covers the mechanical part and the reviewer sees the rendered page. The check still runs once in a browser when one is available.
- **2026-09-22** — Assumed the page stays required for every change: ten local sessions pasted review notes back through `/continue`, so the page itself earns its cost.
- **2026-09-22** — Assumed a minor version bump, since a required `/plan` step is removed and the author contract changes, but no file is added or removed from the payload.
- **2026-09-22** — This plan follows the proposed shape as its own first run: one background author, one build, one structural check, no critic.
- **2026-09-22** — Assumed one anchored bullet per default visual: the kit and checker let one bullet own a visual, so the page anchors the visual from the bullet it explains and the checker rejected a second anchor on this change.
- **2026-09-22** — The user asked whether updating a plan re-runs the subagent cycle. Today it does: `/plan` re-entered through `/apply` or a re-invocation runs the whole build section again, and only `/save`'s refresh is deterministic. Chose to make plan updates re-run the author only when the drawn bullet or its visual changes.
- **2026-09-22** — Implemented the shorter planning pipeline and release 16.5.0. Removed remaining critic obligations from the four affected wireframe requirements so the synced capability spec agrees with the new authoring contract. Config, link, context, and strict OpenSpec checks pass; CI runs at the checkpoint.
