## MODIFIED Requirements

### Requirement: The gate doctrine has one owner

`wiki/development/the-change-loop.md` SHALL state the gate and the ladder (CI when present, then merge, a skipped rung never a failure); other surfaces SHALL link to it, except one summary line in `AGENTS.md`. No surface SHALL call CI required, present the walkthrough as a condition of the merge, or describe a save route that depends on which paths changed.

#### Scenario: A surface restates the gate differently

- **WHEN** a payload surface describes the gate in terms the owner does not, or names a path-specific save route
- **THEN** that is a defect, fixed by a link or the owner's terms
