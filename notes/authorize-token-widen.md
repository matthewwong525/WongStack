---
slug: authorize-token-widen
started: 2026-08-06
updated: 2026-08-06
consolidated:
---

# The payload has to say what an agent is allowed to do, not just what it should do

## What the user reported

*"It seems like we always need to tell the AI that it has permission to update the cloudflare token scope — should we put somewhere in the WongStack that it can do that?"* — a cross-run observation, not a single failed run. Every provisioning run stalled at the same point and needed the same sentence from the user before continuing.

The interesting part is that nothing was broken. The widen protocol was fully documented, the token design was working, the mechanics were right. The agent was applying the ordinary caution rule correctly: `PUT` a new permission set onto a credential for an account it doesn't own is outward-facing and hard to reverse, so it asked. The payload was silent on the one fact that would have changed the answer — that the user had already granted it by handing the token over.

**The generalizable lesson:** documentation that tells an agent *how* and *why* is not the same as documentation that tells it *it may*. A payload instructing an agent to do something an agent's default judgment would flag needs to say so explicitly, or the instruction quietly costs a prompt every run. Worth checking wherever WongStack tells an agent to touch a credential, an external account, or anything it would otherwise confirm.

Related, and the reason the fix took the shape it did: an agent generalizes from the *nearest* rule it can see. `/wong-cloudflare`'s Boundaries block says "ask before creating or deleting anything billable" — sitting right next to the widen with no counterpart, that reads as "ask before anything account-touching." Stating an exception next to the rule it's an exception to is what stops the over-generalization; stating it three sections away wouldn't.

## What the user decided

Two placement calls, both narrowing scope:

- **Stack-pack surfaces only, plus a one-line comment in the `.env.example` fragment.** Explicitly *not* the `CLAUDE.md` `WONG-STACK` block — it would have put the standing permission in front of agents in repos that declined the pack, and that block stays stack-agnostic. Cost accepted: an agent hitting a Cloudflare `403` outside `/wong-cloudflare` won't have the authorization in context automatically; it reaches it through the failure map or the credentials page.
- **No `.claude/settings.json` permission-allowlist entry.** Asked directly whether the friction included a Bash prompt on the `curl` `PUT`; the answer was no — the agent asking in prose was the whole problem. A settings entry would have been a fix for an unobserved problem.

## Open threads

- Whether the same silence exists elsewhere — the `gh secret set` calls, the teardown path, the Access branch — wasn't audited. Only the widen was reported.
- The fix is prose, so its effectiveness is only observable on the next real provisioning run against a fresh account. Nothing in this repo can verify it.
