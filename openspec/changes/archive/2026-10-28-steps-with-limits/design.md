# Design

## Context

Each verb's limits live only in its skill's text, and not all are stated. `/explore` says *write nothing* and *read-only checks; no prototypes or local builds* (`.agents/skills/explore/SKILL.md:11,15`), which is why it plans before it tries anything. `wiki/development/the-change-loop.md` names `.scratch/` as the place for scratch files and says `/explore` *writes nothing* in two places.

## Goals / Non-Goals

**Goals:** one place states what each step may change and that only the person moves a chat past plan; explore may run things; the skills state their own limit in a line and link that place.

**Non-Goals:** hooks or any check that blocks an edit; changing apply, ship or the gate.

## Decisions

- **The change loop page owns the rules.** A new section under *The steps* holds the table and the moves between steps. `/explore` and `/plan` each state their own limit in one line and link it, so no rule sits on two pages. Alternative: a line in the `AGENTS.md` block, rejected: it loads in every session and the startup route has a recorded ceiling.
- **Explore's run-things rule.** It may run the repo's tests, scripts and builds and write throwaway code in `.scratch/`; it reports results before any plan, and still takes no outward action. Git-ignored outputs such as build folders don't count as repo changes.
- **Trying is research.** *Just ask* gains one sentence: a request to test or try something is a plain request, done and reported before any plan, so it doesn't fall into the *no verb starts at `/plan`* rule.

## Risks / Trade-offs

- [An agent ignores a written limit] → nothing stops it; the edit shows in the change's diff. If slips show up, hooks that refuse the edit are the next step, planned then.
- [Explore runs something slow or costly] → its existing *proportional, authorized* wording stays, and outward actions still need a confirm.

