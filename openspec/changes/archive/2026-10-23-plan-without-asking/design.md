# Design

## Context

See proposal.md for why. Today [`asking-the-user.md`](../../../.agents/skills/explore/references/asking-the-user.md#end-every-reply-with-the-next-step) ends a finished plan with a four-option card, and `AGENTS.md` lists `/explore → /plan` for a request with no verb, so an agent can run `/explore` standalone and stop at *Plan it?*. [`build-review.mjs`](../../../.agents/skills/plan/scripts/build-review.mjs) prints one next-step line (`When you're ready, type /apply to build it.`) that only the *Review the plan* reply copies. The daily chief's [*Pick* bucket](../../../.agents/skills/daily/references/chief.md#sort-each-stop) answers the *Build it now* card.

## Goals / Non-Goals

**Goals:** a no-verb request lands at a finished plan with no extra stop; a finished plan ends on its link plus a review line; the chief never builds a plan.

**Non-Goals:** no change to the page, its buttons, the reply link, or the inbox; no new hook that enforces the ending.

## Decisions

- **The builder prints the review line, two ways.** With a live link (the page has *Build it* and *Build and publish*): `Review the plan, then tap Build it or Build and publish on its page.` From the file (no buttons): `Review the plan. When you're ready, say "build it" or "build and publish".` The builder knows which one it printed, so the rule just copies the line. The alternative, one line for both, would tell a file reader to tap buttons that aren't there. Scheduled goals keep their `/schedule` line.
- **A finished plan's reply copies that line and asks nothing.** The same line closes the *Review the plan* answer, replacing the old `/apply` line. A reply that changed a plan but must still ask (a blocker, an open choice) keeps its card and the *Review the plan* fourth option, for hosts that hide text above a card.
- **No-verb requests start at `/plan`.** `AGENTS.md`'s verb rule and the change loop's *Just ask* say the agent starts at `/plan`, whose bounded `/explore` asks what it must. `/explore`'s *Standalone* means typed by the person.
- **A chat follow-up on a waiting plan is a plan update.** `/plan`'s Review notes section widens to cover a chat message about the waiting plan: a bounded explore pass for only what it opens, then edit, rebuild, print. Page notes keep skipping explore.
- **The chief treats a plan stop as the person's.** `chief.md` adds the rule beside *Never sort a planning stop*: a stop at a plan's link goes to no bucket; the plan's own inbox item (made by the reply link) already sits under *Needs you*; without an inbox, the chief prints `Needs you: <title> — plan to review` and the link. It adds no second inbox item.

## Risks / Trade-offs

- [A host hides text above where a card would be] → no card follows a finished plan now, so the link is the last thing shown.
- [An agent still adds the old card from habit] → the rule changes in every skill that names it; the old option names vanish from live text.
- [Skill text grows past the recorded budget] → offset with cuts in the same files; `measure-context.mjs --check` decides.
