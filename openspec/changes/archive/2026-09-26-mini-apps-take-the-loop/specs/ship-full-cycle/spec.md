## MODIFIED Requirements

### Requirement: A one-go ship checkpoints once

When `/ship` pulls in `/apply`, `/apply` SHALL return to `/ship` on completion without invoking `/save`. `/ship` SHALL then archive the change in the working tree and invoke ordinary `/save` exactly once, which creates the feature branch when the work is still on the default branch. A one-go run SHALL therefore have one checkpoint and one CI run before its walk. The ship-time `/verify` SHALL still run once before the merge, and its `FAILURE` pause SHALL still ask the user. The pulled-in stage SHALL otherwise change nothing in the `apply-plan-handoff` and `delivery-gate` contracts. The change loop page SHALL state the one rule every verb follows: when its precondition is missing, invoke the verb before it to produce it.

#### Scenario: One checkpoint in a one-go run

- **WHEN** `/ship <intent>` runs the full chain to merge
- **THEN** only the `/save` after the archive runs, and CI runs once
- **AND** `/ship` merges only on that checkpoint's `SUCCESS` or `NONE`

#### Scenario: A red walk still pauses

- **WHEN** the ship-time `/verify` returns `FAILURE` inside a one-go run
- **THEN** `/ship` stops and asks the user whether to fix or merge anyway

#### Scenario: Standalone apply still saves

- **WHEN** the person invokes `/apply` directly and every task completes
- **THEN** `/apply` uploads a preview from the agent host and does not invoke `/save`, as `apply-completion-handoff` defines

#### Scenario: A reader looks up the chain rule

- **WHEN** a reader opens the change loop page
- **THEN** it states that each verb invokes the verb before it when its precondition is missing
- **AND** it shows the nesting `/ship` → `/apply` → `/plan` → `/explore`

## REMOVED Requirements

### Requirement: A mini-app pull request ships without a change record

**Reason**: A mini app has an OpenSpec change like any change, so `/ship` archives and merges it through its normal steps.
**Migration**: Run `/ship` on the mini app's branch. A branch with no change record stops as before; `/save` can author one.
