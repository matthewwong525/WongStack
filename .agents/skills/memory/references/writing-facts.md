# Writing facts

A fact is the smallest thing a cold reader needs to act the way this session would: one sentence or two, at most 400 characters, with its reason in the same fact. The raw transcript keeps the rest when R2 is on, and the change's Decision log keeps why a change is shaped its way. So a fact carries only what neither of them makes easy to find.

## Keep

- **What the user stated**: facts, constraints, preferences, corrections. Type `user` for who they are and `feedback` for how they want the work done.
- **Decisions with their reason**, and options ruled out with theirs: *Rejected a Worker in front of the store, because it adds a service to keep alive.* Type `project`.
- **Specifics**: names, repo-relative paths, numbers, versions, error strings.
- **Pointers** to dashboards, tickets, and external docs. Type `reference`.
- **Open questions** that nobody answered. Type `thread`. A later fact closes it by superseding it.

## Drop

- tool-call mechanics and file dumps
- the assistant's reasoning, and the path taken to a conclusion
- anything already true in the repo or recorded in the change's Decision log
- credential values, always. A fact may say that `SERVICE_TOKEN` rotated and where it comes from, never the value.

## One fact, one claim

Split a paragraph into facts that can each be superseded alone. A fact that mixes two decisions has to be replaced whole when one of them changes. Write dates as absolute dates, never *yesterday*. Name the slug of the change when the session worked on one, so `/continue` and `/ship` find the fact.

Before you write, the write gate shows the live facts that are close. Drop a candidate that one of them already says. Supersede one that it corrects.
