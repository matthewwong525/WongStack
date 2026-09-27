# Design

## Context

See proposal.md, Why. The rule lives in one place: `.agents/skills/explore/references/asking-the-user.md`, sections "End every reply with the next step" and "Print the plan's link". Every other skill links there. PR #156 (26.0.0, not yet merged) adds three things this change reworks:

- a sentence in "Print the plan's link" that ends the question's own text with *(Plan: `<path>`)*;
- `/save` §5: print the plan's link when the save changed a plan, "and it goes in the closing question too";
- `/ship` Step 6: the lead line prints the plan's link to the archived `review.html`.

`build-review.mjs` prints `review: <kind>, <updated|unchanged>`, then the absolute path to `review.html`. Only `scripts/tests/review.test.mjs` reads that second line.

## Goals / Non-Goals

**Goals:** the plan's link reaches the person even when the agent skips the line above the box, or when the host hides that line.

**Non-Goals:** checking automatically that the line was printed (a hook would be Claude Code–only and would read a half-written transcript), and opening the page in a Paseo tab.

## Decisions

- **The choice carries the link, not the box.** *Review the plan* is an option like any other, so the agent always writes it when it builds the box. Picking it returns control, and the reply that follows is plain text ending in the link. That text is the reply's last thing, and Paseo shows a reply that ends in plain text. Rejected: the path in the question text (#156). It shows, but it can't be tapped.
- **Where the choice appears.** "End every reply with the next step" lists the finished-plan choices as *Build it now (Recommended) / Review the plan / Stop here*. "Print the plan's link" adds the general rule: any closing question in a reply that made or changed a plan offers *Review the plan*. This covers `/save`'s and `/ship`'s boxes through their existing link to the rule. The anatomy's "two or three options" gains one exception, a fourth option for *Review the plan*.
- **Picking it starts nothing.** The reply prints the link line and stops. The person's next message decides: "build it", notes, or stop. This mirrors the rule that pasted notes stop at the plan.
- **The builder prints the line.** The second stdout line becomes `Click here to see the plan: [review.html](<absolute path>)`. A path with a space or parenthesis is wrapped as `<…>` inside the Markdown link, so it still parses. The rule says to copy that line as printed. Rejected: a separate `--link` flag. There's one caller, and a flag it can forget helps no one.
- **Remove #156's path-in-question sentence and the "goes in the closing question too" clause.** They are replaced by the choice. `/ship` Step 6 keeps its link to the archived page.
- **Numbered-chat hosts** already end in plain text, so the line above the numbered question is enough. The numbered list still offers *Review the plan*, which stays harmless.

## Risks / Trade-offs

- [Agents still skip the line above the box] → the choice is the fallback, and it costs one tap.
- [Four options on the publish box feel crowded] → the option appears only when that reply changed a plan.
- [#156 changes before it merges] → task 1.1 rebases onto whatever merged and rereads those lines before editing.

## Migration Plan

Ships as 26.1.0. Installed repos get it through `/wong-sync`. There is no data to move.
