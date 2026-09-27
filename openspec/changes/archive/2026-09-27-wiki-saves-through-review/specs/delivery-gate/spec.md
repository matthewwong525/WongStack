## REMOVED Requirements

### Requirement: Wiki-only saves go straight to the default branch

**Reason**: A wiki edit now takes the same route as every other file edit; no save reaches the default branch without a pull request.
**Migration**: See "Every file edit takes the same route" and "Ship merges work that needed no change".

## MODIFIED Requirements

### Requirement: The gate doctrine has one owner

`wiki/development/the-change-loop.md` SHALL state the gate and the ladder (CI when present, then merge, a skipped rung never a failure); other surfaces SHALL link to it, except one summary line in `CLAUDE.md`. No surface SHALL call CI required, present the walkthrough as a condition of the merge, or describe a save route that depends on which paths changed.

#### Scenario: A surface restates the gate differently

- **WHEN** a payload surface describes the gate in terms the owner does not, or names a path-specific save route
- **THEN** that is a defect, fixed by a link or the owner's terms

## ADDED Requirements

### Requirement: Every file edit takes the same route

Every save that changes a repository file SHALL take a feature branch, a pull request, and the gate, whatever paths or file types it changes. `/save` SHALL author an OpenSpec change only for code or a plan for code; a save with no change SHALL get a pull request body that describes the edit in plain words. A save whose only output is facts SHALL make no commit.

#### Scenario: A wiki-only save

- **WHEN** `/save` runs and the only changed file is a wiki page
- **THEN** it opens a pull request with a plain body and waits on the gate, with no OpenSpec change
- **AND** nothing is pushed to the default branch

#### Scenario: A facts-only save

- **WHEN** the session only produced facts
- **THEN** they go to the memory store with no commit, branch, or pull request

### Requirement: Ship merges work that needed no change

When no change record selects for the branch, `/ship` SHALL apply `/save`'s test for authoring one: code or a plan for code SHALL stop with no identifiable change record; anything else SHALL skip the archive and merge on the gate like any change.

#### Scenario: Shipping a wiki-only pull request

- **WHEN** `/ship` runs on a branch whose only changes are wiki pages and that holds no change
- **THEN** it archives nothing and merges once the gate passes

#### Scenario: Code with no change record

- **WHEN** `/ship` runs on a branch that changes app code and holds no change
- **THEN** it stops and reports that the branch has no identifiable change record
