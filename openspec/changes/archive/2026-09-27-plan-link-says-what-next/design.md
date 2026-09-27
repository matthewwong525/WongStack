# Design

## Context

`build-review.mjs` prints a status line, then the finished link line, which agents copy as printed ([print the plan's link](../../../.agents/skills/explore/references/asking-the-user.md#print-the-plans-link)). The rule for when to print the link lives in that section; `/plan`'s build step describes the builder's output.

## Goals / Non-Goals

**Goals:** one fixed next-step wording, copied rather than retyped; shown only when the plan waits.

**Non-Goals:** a context flag on the builder; any change to `review.html`.

## Decisions

- **The builder prints the line, the rule picks when to copy it.** `build-review.mjs` prints a third line, `When you're ready, type \`/apply\` to build it.`, after the link line, from an exported `NEXT_STEP` constant. The builder can't know whether a build follows, so [the rule](../../../.agents/skills/explore/references/asking-the-user.md#print-the-plans-link) says: copy both lines when the plan waits, only the link line when the build goes on. Alternative: a `--building` flag. Rejected: every caller would have to pass it right, and the agent still decides.
- **`planLink` stays one line.** Tests and callers treat it as the link alone; the next-step line is separate, so the *Apply plans first* case copies line two only.
- **The Review-the-plan reply reuses both lines**, because that reply is exactly when the person looks for what to do next.

## Risks / Trade-offs

- [An agent copies the next-step line while building] → the rule names that case, and the spec's *Apply plans first* scenario says no such line.
- [A downstream script reads the builder's output] → none reads past the status line; the link line keeps its place as line two.
