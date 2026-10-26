## Context

`build-review.mjs` already parses `proposal.md` into sections and blocks (`sections()`, `blocks()`) to render the page, then prints `review: …`, the link line, and the review line, which the agent copies as printed.

## Goals / Non-Goals

**Goals:** one deterministic chat copy from the same parse as the page.

**Non-Goals:** rendering pictures as text; changing the page, kit, or reply links.

## Decisions

- **The builder prints the copy, after the status line and before the link line.** An exported `chatCopy(markdown)` reuses `sections()` and `blocks()`. Alternative: the agent summarises the proposal: rejected, its wording drifts from the page and costs tokens every time.
- **Copy shape.** `Plan: <name>`, a `**Why**` paragraph, `**What changes**` as a numbered list of bullet text, then `**Assumed for you**` with each `Assumed:` decision text (date dropped); the heading is omitted when none. Inline Markdown stays as written, since chats render it.
- **Drawings.** `mermaid`, `svg`, and `screen` fences become `   _(picture on the review page)_` under their bullet; `table` drawings and `text` (or unnamed) fences print indented as written, so they stay inside the numbered item.
- **Printed for every current build; the rule says when to copy it.** The CLI always prints it for `kind: current` plan pages (not scheduled goals, not legacy pages). The *Print the plan's link* section says to copy it only into a reply that ends on the review line. Alternative: a `--chat` flag: rejected, one more flag to forget in each caller; mid-build callers simply skip the lines.
- **Delimit for copying.** The copy sits between the status line and the link line, so "copy everything after `review:`" stays one rule.

## Risks / Trade-offs

- [A long plan makes a long reply] → the person asked for it; the copy carries only Why, changes, and assumptions.
- [Agents copy it mid-build] → the rule and the spec scenario both say link only; review-test checks the CLI output order.
