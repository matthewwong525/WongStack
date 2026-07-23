## ADDED Requirements

### Requirement: An optional recommended-stack doc ships in the payload

The `wiki/` wiki SHALL include a recommendation doc describing an opinionated AI-dev stack. The doc SHALL be framed, in its opening, as a recommendation and not a requirement or default, and SHALL be linked from `wiki/README.md` as an optional appendix — never presented as part of the core change-loop process. It SHALL follow the progressive-disclosure rulebook (topic title, strong stand-alone opener, links up/down/sideways).

#### Scenario: The doc is framed as optional

- **WHEN** a reader opens the recommended-stack doc
- **THEN** its opening states it is a recommendation, not a requirement
- **AND** `wiki/README.md` links it as an optional appendix, distinct from the core process pages

#### Scenario: WongStack stays stack-agnostic

- **WHEN** a reader reviews the WongStack skills, installer, and core docs after this change
- **THEN** none of them require or default to React/Vite/Cloudflare/Paseo; only the recommendation doc names them

### Requirement: The doc covers the core stack, Paseo, and slash-skill tips

The recommended-stack doc SHALL cover three topics: the **core stack** (React + Vite SPA on Cloudflare Workers with D1/R2, and why the combo suits AI-driven dev), **Paseo** (the open-source tool for driving Claude Code across parallel git-worktree agents, and how it maps onto the branch-per-change loop), and **slash-skill tips** (practical day-to-day guidance on the WongStack verbs — when to reach for each, how they chain, common gotchas).

#### Scenario: All three topics are present

- **WHEN** a reader reads the recommended-stack doc
- **THEN** it addresses the core stack, Paseo, and slash-skill tips
- **AND** the slash-skill tips reference the actual current loop verbs

#### Scenario: Tips stay consistent with the shipped skills

- **WHEN** the loop's verb set changes (e.g. a `/apply` verb is added)
- **THEN** the slash-skill tips describe the verbs as they actually ship, not a stale set
