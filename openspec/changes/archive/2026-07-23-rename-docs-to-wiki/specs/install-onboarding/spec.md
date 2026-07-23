## MODIFIED Requirements

### Requirement: Research before the conversation

`wong-setup` SHALL run its deep-research step (the target-repo survey: what the app is, how it ships, CLAUDE.md, the wiki at its resolved root — `wiki/`, falling back to `docs/` — skills, OpenSpec, legacy traces, GitHub readiness) *before* any discovery conversation, and SHALL use the findings to make its questions specific to the repo rather than generic.

#### Scenario: Informed discovery

- **WHEN** the skill runs in a repo with no CI and a stale wiki folder
- **THEN** the discovery questions reference those findings (e.g. asking how they verify a change today) instead of asking from a blank script
