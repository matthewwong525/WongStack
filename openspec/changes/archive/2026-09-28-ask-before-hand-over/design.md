# Design

## Context

A hand-over link dies after 10 minutes ([`hand-over.mjs`](../../../.agents/skills/verify/scripts/hand-over.mjs), [home: Hand the browser over](../../../wiki/development/home.md#hand-the-browser-over)). Nothing says when the agent may open one, so an agent can open it while the person is away, or use it to get a yes the chat could ask. A chat question has no timeout.

## Goals / Non-Goals

**Goals:**
- A yes or no for an outward browser action is always a chat question.
- A hand-over link opens only when the person has just shown they're there.

**Non-Goals:**
- No change to `hand-over.mjs`, the link's lifetime, its safety, or the hand-over page.
- No change to `/apply`'s to-do path, which already confirms each outward step in the chat.

## Decisions

- **Prose in `wiki/development/home.md`, not code.** The fix is when the agent opens the link. A longer or lazy link was weighed: a longer one leaves the browser open to anyone holding it for longer, and a lazy one still dies unseen. A chat question needs neither.
- **One *Ask first* bullet under *Hand the browser over*,** after *When*: ask *ready?* in the chat, open the link on the reply; skip the ask when the person's latest message asked to take over. *When* gains one line: a yes or no stays in the chat, never a hand-over.
- **The picture rule links to the ask.** *Show what the browser is doing* already shows a picture right before a sending, booking, paying, or deleting action; that bullet now says the picture goes with the chat question, so the person sees what they're saying yes to. Publishing joins that list.
- **CLAUDE.md is unchanged.** Its browse rule already links the hand-over section, and it sits near its word limit.

## Risks / Trade-offs

- A login now takes one more message: *ready?* then the link. The cost is one reply; the saving is a dead link and a stuck task.
- An agent may still skip the ask. The spec and home.md now state it, which is all a prose rule can do.
