# Design

## Context

The rule is prose that every WongStack repo's agent reads: the `WONG-STACK` block in `AGENTS.md` (symlinked as `CLAUDE.md`) and the pages it links. Two existing pieces carry it. [The next-step ask](../../../.agents/skills/explore/references/asking-the-user.md#end-every-reply-with-the-next-step) already ends every reply that returns control, so the offer needs no new question. The [memory store](../../../wiki/development/memory.md) already holds typed facts, so a repeat and a decline can both be found by one search.

## Goals / Non-Goals

**Goals:**
- One owner for the rule, with the block and the ask page linking it.
- No new script, hook, or setting: the agent applies a short rule.

**Non-Goals:**
- Detecting recurrence automatically, for example from the background capture run.
- Any change to `/routine` or the mini-app scaffold.

## Decisions

- **Owner: a `### Offer a routine or an app` section in [the change loop](../../../wiki/development/the-change-loop.md), after *Just ask*.** That page already routes plain requests, non-code verb work, and mini apps, so the offer's inputs and outputs are all there. Alternative: the ask page. It owns the *form* of an ask, not when one happens, so it gets one linking bullet only.
- **Signal check: one memory search, only when a finished task could come back.** `memory.mjs search <task terms>` finds a past request (the repeat signal) and a decline (the stop). Alternative: search after every task. That slows every reply for a rare offer.
- **Decline record: a `feedback` fact through the write gate** (`gate`, then `put-facts`), such as *"Declined a weekly routine for the support-email summary; do not offer again."* Feedback facts load in the digest and match the same search. Alternative: leave it to the background capture run. It runs later and may miss or reword the fact, so a second offer could slip through.
- **Routine or app: judgment decides.** Needs judgment on each run → routine. Fixed steps → mini app, by [most process improvements shouldn't use AI](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai). A fixed task on a schedule with no judgment still gets the mini-app offer, not a routine.
- **Paseo check: `command -v paseo`.** Only the routine offer needs it; `/routine` stops anyway without it.

## Risks / Trade-offs

- [An agent reads a weak hint as a signal and offers too often] → the rule names the only two signals and says *never on a hunch*; the one-offer-then-remember rule caps the cost.
- [A decline fact is worded so a later search misses it] → the fact names the task in the same terms the person used, and the search runs on those terms.
- [Memory store unreachable] → the search then finds no repeat, so the only signal left is the person's own words; a decline waits in the local spool, as every write does.

## Migration Plan

A minor release. `/wong-sync` brings the block rule and the page edits; installed repos need no other step.
