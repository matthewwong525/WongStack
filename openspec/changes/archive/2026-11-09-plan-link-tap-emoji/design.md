## Context

`build-review.mjs`'s `planLink(page, what)` prints `Click here to see <what>: [review.html](<link>)`, wrapping a path with a space or parenthesis in `<…>`. `preview-review.mjs` writes the same line by hand for the preview. `ask-check.mjs` finds these printed lines with `CLICK = /^Click here to see [^:\n]{1,60}:[ \t]*(\S.*)$/gm` and takes the link from the rest of the line.

## Goals / Non-Goals

**Goals:** one Markdown link per line, text `👉 Tap here to see <what>`; the link-check still finds it.

**Non-Goals:** a change to where the line goes in a reply, or to the review line under it.

## Decisions

- **One helper writes every line.** `preview-review.mjs` imports `planLink` and passes `'the preview'`, so the three lines can't drift.
- **The check matches the new line.** `CLICK` matches a line that starts with `[👉 Tap here to see ` and hands the rest, from `]`, to `clickTarget`, which already reads a `](<…>)` or `](…)` target.

## Risks / Trade-offs

- An agent that copies the line by memory, not from the builder, may still type the old words → the reference says to copy the builder's line whole, as today.
