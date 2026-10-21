# Design

## Context

`asking-the-user.md` says "Write the report and any link as chat text first; the tool carries only the question" and, under *Print the plan's link*, "Keep it out of the question itself". Agents still put a PR or key link in an option's description, or wrote the plan's link only in reasoning (memory #313: thinner-specs wrote it only in hidden reasoning).

## Goals / Non-Goals

**Goals:** one rule, on the page that owns how an ask looks, covering every link and naming both failure places: the card and reasoning.

**Non-Goals:** new links, link counts, or changes to *Review the plan* / *See the preview*.

## Decisions

- **Strengthen the sentence in "End every reply with the next step"**, not add a section: it already owns where the report and links go. Text: *Write the report and every link as chat text first, each link on its own line: never in the tool's question or options, which may not make it clickable, and never only in your reasoning, which the person can't see. An option may name a link above it, never repeat it.*
- **Drop "Keep it out of the question itself: a tool's card may not make a link clickable."** from *Print the plan's link*: the general rule now owns it, and a second copy goes stale. The plan section keeps a link back.
- **Spec:** extend the existing requirement rather than add one; add one scenario.

## Risks / Trade-offs

- Word budget: the net addition is about 25 words; `measure-context.mjs --check` decides, and the dropped sentence offsets most of it.
