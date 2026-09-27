# Writing facts

A fact is the smallest thing a cold reader needs to act as this session would: one or two sentences, at most 400 characters, reason included. It carries only what the raw transcript (when R2 is on) and the change's Decision log do not make easy to find.

## Keep

- **What the user stated**: facts, constraints, preferences, corrections. Type `user` (who they are) or `feedback` (how they want work done).
- **Decisions with their reason**, and options ruled out with theirs: *Rejected a Worker in front of the store, because it adds a service to keep alive.* Type `project`.
- **Specifics**: names, repo-relative paths, numbers, versions, error strings.
- **Pointers** to dashboards, tickets, external docs. Type `reference`.
- **Unanswered questions**. Type `thread`; a superseding fact closes it.

## Drop

- tool-call mechanics and file dumps
- the assistant's reasoning and route to a conclusion
- anything already in the repo or the change's Decision log
- credential values, always. A fact may say that `SERVICE_TOKEN` rotated and where it comes from, never the value.

## Private life goes home

A private-life fact (health, family, money, personal plans) never goes to this repo's store. Send it to the machine's [home](../../../../wiki/development/home.md) store with `--home` on both `gate` and `put-facts`, in its own JSON. If it prints `no home recorded`, drop the fact; never write it here. A work preference is not private: it stays here, or goes on the person's wiki page.

## One fact, one claim

Split a paragraph into facts that can each be superseded alone. Write absolute dates, never *yesterday*. Use the change's slug when the session worked on one, so `/continue` and `/ship` find the fact.

When the write gate shows close live facts, drop a candidate one already says, and supersede one it corrects.
