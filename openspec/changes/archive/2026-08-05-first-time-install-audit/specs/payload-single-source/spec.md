## ADDED Requirements

### Requirement: The manifest's file list has a machine-readable form

The payload manifest SHALL carry a machine-readable list of the paths it covers,
beside the prose that explains them, and `check-payload-links.mjs` SHALL read that
list rather than restating it.

Today the list is prose spread across three sections plus a fourth of exclusions,
and two independent restatements exist: the checker's own `SKILLS` / `DOCS` /
`PACK_FILES` constants, and whatever the installing agent assembles by hand at
install time — roughly sixty paths derived from paragraphs, per install. That is
the drift this capability exists to prevent, in the one file that defines what
drift even means.

The prose stays: it carries the reasoning, the gating rules, and the exclusions,
none of which a list can hold.

#### Scenario: A file is added to the payload

- **WHEN** a new payload file is introduced
- **THEN** it is added to the machine-readable list once, and both the checker and the installing agent pick it up without a second edit

#### Scenario: Agent performs an install

- **WHEN** an agent follows the sync's copy step
- **THEN** it reads the file list rather than deriving paths from prose

## MODIFIED Requirements

### Requirement: No payload file ships a link it cannot resolve in a target

A file in the payload SHALL NOT contain a link to a path outside the payload. A payload file is copied verbatim into repos that have none of this repo's own content, so a link resolvable only here is broken everywhere it lands.

`wiki/wiki-style.md` is the live instance: the rulebook every target is told to follow ships with links to `../marketing/find-inspiration.md` and `weekly-cadence.md`, which exist only in WongStack. Where a payload page needs an example from this repo's wiki, it SHALL generalize the example or drop it, rather than link to it.

Because this is mechanically checkable, it SHALL be checked rather than reviewed: **releasing a payload change SHALL include resolving every internal link in a fresh install.** A payload whose links do not resolve in a target is defective regardless of whether it resolves here — this repo is not a valid test of it, since this repo has content no target does.

The check MAY treat a path as present-in-any-target only where the install
**actually produces it**. An exemption asserting that a file exists is a claim about
`wong-setup`'s behaviour, and SHALL be traceable to the step that writes it.

The audit found the exemption list carrying `wiki/development/README.md` under the
comment *"the wiki hubs `/wong-setup` seeds"*, when setup seeds only the wiki root —
so the check reported no dead links against an install that had eight. An exemption
that is not true converts this check from a guarantee into a restatement of an
assumption, which is worse than not having it, because it is trusted.

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

#### Scenario: An exemption claims a file the install does not create

- **WHEN** the check exempts a path on the grounds that any real target has it
- **THEN** a step in `wong-setup` demonstrably writes that path
- **AND** where no step does, the exemption is removed and the resulting dead link is fixed rather than exempted
