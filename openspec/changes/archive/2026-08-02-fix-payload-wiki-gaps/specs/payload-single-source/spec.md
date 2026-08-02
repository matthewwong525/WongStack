## ADDED Requirements

### Requirement: A cited owner is a shipped owner

Where a payload file directs the reader to another file for a fact — the pattern the one-owner rule requires — the file it points at SHALL itself be payload. Citing an owner the target repo does not receive converts the one-owner rule from a way of keeping facts consistent into a way of removing them: the fact is stated nowhere the reader can reach.

This SHALL be checked in the direction the target experiences. `wiki/development/the-change-loop.md` is cited fourteen times across nine skills, `ux-principles.md`, `staging-walkthrough.md`, and the `WONG-STACK` block — which names it as the one place that owns the merge gate and the prose allowlist — while being absent from the manifest, so no target repo has ever had it. `agent-knowledge-center.md` and `development/required-tools.md` are absent on the same terms.

The consequence is not merely a broken link. `CLAUDE.md` instructs an agent to find and read the owning doc rather than guess; where that doc does not exist, the instruction produces the guess it was written to prevent.

#### Scenario: A skill's cited page is present after install

- **WHEN** a payload skill directs the reader to a wiki page
- **THEN** a repo that installed the payload has that page
- **AND** the reader can follow the link

#### Scenario: Adding a citation adds a manifest entry

- **WHEN** a payload file gains a reference to a page that owns a fact
- **THEN** that page is in the payload manifest, or the reference is not added

### Requirement: No payload file ships a link it cannot resolve in a target

A file in the payload SHALL NOT contain a link to a path outside the payload. A payload file is copied verbatim into repos that have none of this repo's own content, so a link resolvable only here is broken everywhere it lands.

`wiki/wiki-style.md` is the live instance: the rulebook every target is told to follow ships with links to `../marketing/find-inspiration.md` and `weekly-cadence.md`, which exist only in WongStack. Where a payload page needs an example from this repo's wiki, it SHALL generalize the example or drop it, rather than link to it.

Because this is mechanically checkable, it SHALL be checked rather than reviewed: **releasing a payload change SHALL include resolving every internal link in a fresh install.** A payload whose links do not resolve in a target is defective regardless of whether it resolves here — this repo is not a valid test of it, since this repo has content no target does.

#### Scenario: Payload links resolve in a fresh install

- **WHEN** the payload is installed into a repo with no prior content
- **THEN** every internal link in every copied file resolves to a file that exists
- **AND** a link that does not resolve is a release defect

#### Scenario: The source repo is not accepted as the test

- **WHEN** a payload file's links are verified
- **THEN** they are verified against a fresh install, not against this repo
- **AND** a link resolving only here counts as broken

#### Scenario: A payload page needs a local example

- **WHEN** a payload page would illustrate a rule with a page only this repo has
- **THEN** the example is generalized or omitted
- **AND** no link to a non-payload path is shipped
