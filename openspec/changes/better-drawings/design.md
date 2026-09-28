# Design

## Context

`/plan` draws each What Changes visual as a fenced `text` block, about 40 columns wide ([`plan/SKILL.md`](../../../.agents/skills/plan/SKILL.md#draw-in-the-proposal-then-build-the-page), [`wiki/ux-principles.md#the-review-file`](../../../wiki/ux-principles.md#the-review-file), and the proposal rule in [`openspec/config.yaml`](../../config.yaml)). `build-review.mjs` warns only past 60 columns. Nothing tells the agent *how* to draw, so drawings default to a vertical chain of steps.

OpenSpec 1.13.2 has no drawing library. Its explore template (`dist/core/templates/workflows/explore.js` in the global install) holds a *Visualize* section, a plain-ASCII rule, and four examples: a collaboration spectrum (side by side with labels under), an auth flow (titled frame, fan-out, fan-in), and a Postgres-vs-SQLite comparison table. Those are the patterns to copy.

lighten-the-loop (22.0.0) removed `review-author.md` and `review-examples.html` for weight, so the new guide must stay small.

## Goals / Non-Goals

**Goals:**
- One short guide both `/plan` and `/explore` draw from.
- Room for side-by-side drawings without giving up phone-first.
- A deterministic check for the one drawing mistake we have shipped: a miscounted box edge.
- Screen sketches that show each named state and the before-and-after.

**Non-Goals:**
- Any change to `review-kit.html`: the page already fits a drawing to the screen and zooms it full screen.
- Plain-ASCII drawings, rendered images, or HTML visuals.
- Rebuilding archived review pages.

## Decisions

### The guide: `plan/references/drawings.md`

One page, under about 80 lines, owned by the plan skill because it ships in that folder and both skills can reach it. It holds:

1. **Characters.** `┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼`, arrows `▶ ◀ ▲ ▼`, and `═` for a title rule; no emoji or wide characters, which take two columns and break alignment.
2. **Width.** Aim for 40; up to 56 for side by side, a table, or before-and-after; the builder warns past 60.
3. **Five patterns**, each one example of 10 lines or fewer: titled frame, side by side, split and join, labels under boxes, comparison table. Adapted from OpenSpec's examples, redrawn in our characters and widths.
4. **Screens.** Low fidelity; before-and-after for a changed screen; one small sketch per named state for a new one. It links [`ux-principles.md#the-review-file`](../../../wiki/ux-principles.md#the-review-file) for *what* a sketch holds rather than restating it.
5. **Count before you close a box**: every line of a box is the same length.

`plan/SKILL.md` keeps its example and replaces "about 40 columns wide for a phone" with the width rule and a link to the guide. `explore/SKILL.md` gets one sentence under *Questions during standalone exploration*: draw in chat by the guide when a picture clarifies the flow, the options, or their costs. The guide itself owns the how; neither skill copies it.

The payload manifest's **plan** line names the guide. `ux-principles.md` changes *Context of use* and *The review file* to the new width, and adds the before-and-after line; the proposal rule in `openspec/config.yaml` points to the guide and the width.

### The box-edge check

In `drawing()` beside the width check, over the fence's lines as code-point arrays:

- For each `┐` at column `c` on line `i`, walk down lines `i+1…`.
- A line whose column `c` holds `│`, `┤`, or `┼` continues the box; `┘` closes it with no warning.
- Otherwise, if that line has `│` or `┘` within two columns of `c`, warn once for the box: `proposal.md line N: item K, drawing line L has a box edge at column X, but its corner is at column C`. Then stop.
- Otherwise, stop silently: the `┐` was not a box's corner, for example the end of a `┌──┴──┐` split with arrows below.

Only the right edge is checked, because text drifts right when a line is miscounted and the left edge is typed first. Nested and side-by-side boxes pass because each corner is walked on its own. `+` and `|` are skipped: they show up in ordinary text.

Alternatives: a full box parser (too much code for one mistake); checking that every line in a fence has the same length (drawings mix boxes and free text, so it would warn constantly).

### Width warning text

`WIDE` stays 60. The message changes from `keep drawings under 60, aim for 40` to `keep drawings under 60: aim for 40, up to 56 side by side`. The two tests that match the old text change with it.

## Risks / Trade-offs

- **A heuristic can miss or misfire** → it is a warning, never a failure, and the page still builds. Tests pin the nested, side-by-side, split, and crooked cases.
- **Wider drawings are harder to read on a phone** → 56 is the exception, the full-screen view zooms, and the guide says to prefer one column.
- **This plan's own crooked-box example will warn once the check ships.** The warning is expected and shows the check working.
