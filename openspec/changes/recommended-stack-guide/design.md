## Context

Docs-only change. WongStack is stack-agnostic and its wiki (`docs/`) is a progressive-disclosure tree with one section so far (`development/`). This adds an *optional, opinionated* recommendation page — the one place WongStack is allowed to have a stack opinion — without touching skills, installer behavior, or code.

## Goals / Non-Goals

**Goals:**
- One clear, opinionated recommendation covering core stack + Paseo + slash-skill tips.
- Framed unambiguously as optional; linked as an appendix, not a core process page.
- Reads like the rest of the wiki (progressive disclosure, the house voice).

**Non-Goals:**
- No code, skills, hooks, or installer changes.
- Not making any stack a default or requirement anywhere else in the payload.

## Decisions

**1. One page, not a section — unless it strains.** Start with a single `docs/recommended-stack.md` with three headings (core stack / Paseo / slash-skill tips). If any topic outgrows a heading, promote to a `docs/recommended-stack/` folder with a README hub — but don't manufacture depth up front (per `docs/README.md`'s own guidance). *Alternative — three pages from the start:* rejected as premature depth.

**2. Link as an appendix in `docs/README.md`, visually separate from the core list.** The core "Where to find things" list is process; this is a recommendation. A distinct one-liner ("Optional: the stack I actually use — [recommended stack](recommended-stack.md)") keeps the agnostic core uncluttered.

**3. Reference the loop verbs by their shipped names.** The slash-skill tips must match whatever loop actually ships. If `evolve-change-loop` lands first, that's the six-verb loop incl. `/apply`; if not, five verbs. The apply-time author reconciles against the then-current skills (a task calls this out).

## Risks / Trade-offs

- **Opinion vs. agnostic identity** → the doc could read as WongStack endorsing a stack. *Mitigation:* the "recommendation, not requirement" framing in the opener + appendix placement (enforced by the spec).
- **Staleness** → tool/stack advice ages. *Mitigation:* keep it principle-led ("merge = deploy, isolated worktree per agent") over version-pinned specifics; a task notes this.

## Open Questions

- Single page vs. folder — resolved by Decision 1 (start single, promote only if a topic strains). No blockers.
