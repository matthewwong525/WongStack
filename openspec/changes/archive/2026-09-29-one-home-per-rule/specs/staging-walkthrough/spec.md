## MODIFIED Requirements

### Requirement: Verify is a verb that gates nothing

The walk SHALL run only when a person invokes `/verify`, or once inside `/ship` as evidence before the merge; `/save`, `/apply`, and `/continue` SHALL NOT walk. `/verify` SHALL run at any point in a change and any number of times, and its own run SHALL block, delay, or condition nothing. What a failed walk does inside `/ship` SHALL be `delivery-gate`'s rule, not this one.

#### Scenario: A failing walk

- **WHEN** a walk that a person invoked returns `FAILURE`
- **THEN** the failure is reported and posted, and `/verify` stops no push, merge, or other skill

#### Scenario: Mid-change and repeated

- **WHEN** `/verify` runs three times on a branch with unchecked tasks
- **THEN** each run walks what is deployed for the current commit and reports its own verdict
