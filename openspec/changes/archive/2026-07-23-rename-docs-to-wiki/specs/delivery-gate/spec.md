## MODIFIED Requirements

### Requirement: CI is optional, not required

The WongStack doctrine SHALL treat GitHub Actions (and CI generally) as an optional accelerator that is honored when present and never required. Doctrine text across the payload — `CLAUDE.md`, `README.md`, `wiki/development/the-change-loop.md`, and the `save`, `ship`, and `wong-setup` skills — MUST NOT assert CI as the sole or required gate. The system's durable pillars SHALL be described as: pull requests, version control, OpenSpec, and everything-lives-in-the-repo.

#### Scenario: Payload prose describes CI as optional

- **WHEN** a reader reviews the delivery doctrine in `CLAUDE.md`, `README.md`, or the `save`/`ship` skills
- **THEN** the text states CI is honored when present but not required, and names PR review as the gate when CI is absent
- **AND** no remaining sentence asserts "CI is the only gate" or "GitHub Actions is the build gate"
