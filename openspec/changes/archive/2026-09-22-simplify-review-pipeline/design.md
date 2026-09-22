## Context

`/plan` builds `review.html` by a fixed pipeline: a design subagent writes `review-visuals.html`, the main thread anchors bullets and runs `build-review.mjs`, a browser runs `check-review.js`, the main thread inspects every state at two widths, a critic subagent reads the rendered page, and one revision round with the design subagent follows. See proposal.md for why that is too much. The kit, builder, and checker are unchanged by this design; only the process around them and the rules that describe it move.

## Goals / Non-Goals

**Goals:**
- One author pass, one build, one structural check per plan.
- Authoring off the critical path: the subagent runs while design and tasks are drafted.
- A smaller default page: one visual unless screens are added.

**Non-Goals:**
- Any change to the kit, builder, checker, or `/save` refresh.
- A new mechanism to replace the critic. The reviewer's annotations already return through `/continue`.

## Decisions

- **Drop the critic instead of scoping it.** Five recent critic reports here found anchor mechanics the checker already names, and wording or callout polish. A scoped critic for screen changes keeps a 4 to 7 minute serial step for the rare case; a reviewer sees the same page and can annotate. Alternative considered: keep it for screen-bearing changes only.
- **Background subagent, not main-thread authoring.** The main thread keeps its context small and drafts design and tasks while the fragment is written. Main-thread authoring puts 6 to 12 KB of markup on the expensive model and blocks tasks. The subagent returns a bullet-to-anchor map as today, so the anchor step is unchanged.
- **One visual per change by default.** The last nine archived changes drew 30 of 35 bullets. The rule becomes: draw the single visual that carries the change; a screen-adding change draws each screen; a second visual needs a reason the author states in the hand-back. This shortens the fragment and the subagent's run.
- **Keep the browser check, drop the manual walk.** The checker is deterministic and cheap. Walking every state at desktop and phone width is the expensive judgment step and largely repeats what the reviewer does. Without a browser, the report says unverified, as today.
- **Rules follow the skill.** The design rule in `openspec/config.yaml` and the wiki page state the same coverage default, so the CLI's instructions, the author guide, and the wiki do not disagree.

## Risks / Trade-offs

- [A visual that does not explain its bullet reaches the reviewer] → the reviewer annotates it and the note returns through `/continue`; that is the review path the page was built for.
- [Background subagent finishes after tasks are drafted and its anchors change task citations] → tasks cite anchors only after the map returns; the main thread writes task text last.
- [Authors read "one visual" as never drawing screens] → the spec and guide say a screen-adding change draws each screen.

## Migration Plan

Skill text, config rule, spec, and wiki change together in one release. Existing pages and archives are untouched. No rollback step beyond reverting the release.
