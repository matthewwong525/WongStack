# wong-sync-after-picture Specification

## Purpose

The destination narrative a `/wong-sync` run produces instead of a changeset list: what this repo becomes, what it gains, what it loses, and how sharp the picture actually is.

## Requirements

### Requirement: The proposal is an after-picture, in four regions

The `proposal.md` of a sync change SHALL be written as a destination narrative with four regions, in this order:

1. **After** — how this repo works once the change lands, described in the repo's own terms rather than upstream's.
2. **Gain** — what the repo will be able to do, each item naming what it replaces here.
3. **Lose** — what adopting costs, in three classes: **superseded local mechanisms**, **new obligations**, and **lost optionality**.
4. **Resolution** — which parts of the picture are sharp and which are not yet shaped.

The version span synced, the files involved, and a pointer to `.claude/wong-sync-verdicts.md` SHALL still appear, subordinate to these regions rather than as the document's structure.

#### Scenario: A reader learns what their repo becomes

- **WHEN** a sync change is written
- **THEN** its proposal opens with how this repo works after the change, in this repo's terms
- **AND** a reader can answer "what will my repo be" without assembling it from a file list

#### Scenario: The regions are not optional

- **WHEN** a sync change is written
- **THEN** all four regions are present, and a region with no content says so explicitly rather than being omitted

### Requirement: Gain is grouped by capability, never enumerated by file

The **Gain** region SHALL group by what the repo will be able to **do**, with files subordinate to the group they serve. It SHALL NOT be written as a flat list of files or of skill names.

This keeps one format readable at both scales: an incremental sync of two files and a first sync of the whole payload produce the same shape, differing in length rather than in kind.

#### Scenario: A first sync stays readable

- **WHEN** a sync involves the whole payload
- **THEN** the Gain region is grouped by capability, with file detail subordinate
- **AND** it is not a flat inventory of every file

#### Scenario: A one-file sync uses the same shape

- **WHEN** a sync involves a single updated file
- **THEN** the proposal has the same four regions, shorter, rather than a different format

### Requirement: The Lose region states what adopting costs

The **Lose** region SHALL state what the repo gives up, drawn from the grafts rather than from the file copy. It SHALL cover, where each applies:

- **superseded local mechanisms** — a local file, convention, or tool that the graft replaces as the way things are done here;
- **new obligations** — process the repo must now follow that it did not before;
- **lost optionality** — a choice the repo can no longer make its own way without diverging.

An empty Lose region SHALL be justified rather than left blank: the never-overwrite guarantee covers the *file copy* only, so "nothing is overwritten" SHALL NOT be offered as evidence that a sync costs nothing.

#### Scenario: A graft that replaces a local mechanism

- **WHEN** an adopted capability supersedes a convention the repo already had
- **THEN** the Lose region names that local mechanism and says it stops being the way things are done here

#### Scenario: A graft that adds process

- **WHEN** an adopted capability requires work to pass through a branch, a pull request, or a CI gate that the repo did not use
- **THEN** the Lose region records that obligation

#### Scenario: Nothing is lost

- **WHEN** a sync genuinely supersedes nothing and adds no obligation
- **THEN** the Lose region says so and gives the reason, rather than being omitted or left empty

### Requirement: The picture states its own resolution

The **Resolution** region SHALL distinguish the parts of the After picture that are concrete from those that are not yet shaped. A capability verdicted `adopt` whose graft cannot be described in this repo's terms SHALL appear here, named, as work to be shaped with the repo's own `/plan` — and SHALL NOT be written into the After region as though it were settled.

A narrative reads as more certain than a task list and it is the artifact being approved, so overstatement is the failure this region exists to prevent.

#### Scenario: An unshaped graft is disclosed

- **WHEN** an adopted capability's graft cannot yet be described concretely
- **THEN** it is named in the Resolution region as needing `/plan`
- **AND** the After region does not describe its outcome as settled

#### Scenario: A fully concrete run says so

- **WHEN** every adopted capability has a concrete graft
- **THEN** the Resolution region states that the picture is sharp throughout

### Requirement: Present verdicts name their local evidence

A capability verdicted `present` SHALL have a reason line naming **where this repo expresses it** — a path, a convention, or a tool. A capability the skill believes is present but cannot attribute to anything in this repo SHALL be verdicted `adopt`.

This mirrors the bar already carried by `divergent`, and backs up the after-picture: a region claiming the repo already does something must be able to point at where.

#### Scenario: A present verdict points at the repo

- **WHEN** a capability is verdicted `present`
- **THEN** its reason line names the local path, convention, or tool that expresses it

#### Scenario: An unattributable present becomes adopt

- **WHEN** the skill judges a capability present but cannot name where this repo expresses it
- **THEN** the verdict is `adopt`
