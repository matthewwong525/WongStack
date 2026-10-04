# Design

## Context

See proposal.md for why. `.agents/skills/plan/references/drawings.md` is 1,874 bytes and counts as skill instruction text; `node scripts/measure-context.mjs --check` fails unless instruction bytes stay below the baseline, which leaves 14 bytes of growth. Box-drawing characters cost three bytes each.

## Goals / Non-Goals

**Goals:** the guide teaches a failure row, a back-and-forth, states, and a marked before-and-after flow, and says to pick by the question.

**Non-Goals:** a builder check, a renderer, or any change to `review-kit.html` or `build-review.mjs`.

## Decisions

- **Swap, don't add.** Drop *Titled frame* and *Split and join*; add *Steps*, *Back and forth*, and *States*; fold the before-and-after flow into the existing *Screen* pattern as one *Before and after* pattern marking new parts with `+`. Alternative: cut text in another skill to pay for additions; rejected, since trimming unrelated instructions risks their behavior.
- **One opening line names the choice**: pick the pattern by what the bullet explains, not a top-to-bottom chain. The patterns' own labels carry when each applies, so no separate router table.
- **Keep the examples small.** Each new example is four lines or fewer and uses spaces and short arrows to save bytes. The proposal's drawings are the starting drafts.
- **Spec by promise.** One added `ux-wireframes` requirement; the existing screen-sketch requirement is untouched.

## Risks / Trade-offs

- [A guide alone may not change what gets drawn, as after better-drawings] → the opening line names the wrong turn outright; the next real plan's page is the check, kept as an open thread, not a task.
- [The guide overruns the byte budget] → trim the guide's own wording until the check passes; never another skill's text.
