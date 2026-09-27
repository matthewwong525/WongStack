# Design

## Context

`asking-the-user.md` has two sections that matter here. *Which tool carries it* sets the tool order: Codex `request_user_input`, Claude `AskUserQuestion`, another structured tool, then numbered chat. *End every reply with the next step* says to put the closing question "in the same format", and its finished-plan example reads as prose to write out ("one line, *Click here to see the plan:* … then build it now / change the plan first / stop here"). In the purple-falcon session, the agent called `AskUserQuestion` four times for clarification and typed both closing menus as numbered chat.

## Goals / Non-Goals

**Goals:** the closing question follows *Which tool carries it*, with the report and link as text before it. Every reply that makes or changes a plan prints its link, whichever skill made it.

**Non-Goals:** no change to the options, the tool order, or when a reply asks; no edit to the runbooks of `/apply`, `/continue`, `/ship`, or `/wong-sync`; they reach the rule through the block and `/plan`.

## Decisions

- **One line in the shared page, not a line in each skill.** The payload rule says a skill never keeps a second copy of the choice format or the tool order. Every skill with a closing question links *End every reply with the next step*, so one line there reaches all of them. Alternative: add "use the question tool" to `/plan`'s *Finish* and each runbook's end — seven copies that can drift.
- **Reword the finished-plan example.** It says "one line … then build it now", which reads as one block of text. The new wording separates the two: the *Click here to see the plan:* link in chat text, then the question with its three options. Alternative: leave the example and rely on the new line; the example is what agents copy, so it has to match.
- **The link rule lives in the shared ask page, stated in the block.** A plan can come from `/plan`, `/apply`, `/continue`, `/ship`, `/wong-sync`, or review notes. Today only `/plan`'s *Finish* names the *Click here* line, and only for a standalone run. A new *Print the plan's link* section in `asking-the-user.md` owns the wording. The `WONG-STACK` block gets one line that states it and links there, because the block loads in every session, even when no skill is loaded. `/plan`'s *Finish* links the section instead of spelling out the line. Alternative: a line in each of the five skills — five copies, which the payload rule forbids.
- **Print the link even when the chain continues.** A typed `/apply` or `/ship` plans and builds in one run. The link costs one line and lets the person open the plan while the build goes on; it adds no stop.
- **Report before the question, in chat text.** A question tool's card holds a short question and short options. The report and review link stay readable and clickable in the chat, above the card.

## Risks / Trade-offs

- [A host shows the tool's card but drops the chat text written in the same turn] → Paseo showed both in the purple-falcon session, where clarification questions followed text. If a host drops it, the fix belongs in the tool order, not here.
- [An agent still types the list out of habit] → the spec scenario names the case; `/improve`'s stale-guidance survey reads the page against transcripts.
