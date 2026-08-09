# staging-walkthrough — delta for ship-walks-and-ci-tests

## MODIFIED Requirements

### Requirement: The walkthrough is a user-invoked verb

The staging walkthrough SHALL be reached by invoking `/walk`, or by `/ship`, which invokes `/walk` once as a non-gating evidence step between its delegated `/save` checkpoint and its merge. No other skill SHALL run it: `/save`, `/apply`, and `/continue` SHALL NOT walk, prompt to walk, or warn that a walk did not happen.

`/walk` SHALL be invocable at any point in a change's life and any number of times, rather than only at merge time. Nothing in the skill SHALL limit how often it runs or treat a repeated invocation as an error. `/ship`'s invocation SHALL be an ordinary walk — same scout, same verdicts, same PR evidence — not a variant.

`/walk` SHALL be part of the opt-in stack pack, gated the same way `/wong-cloudflare` is: a repo whose `.claude/.wong-stack.json` does not have `components.stackPack: true` SHALL never receive the skill.

#### Scenario: Shipping walks as evidence

- **WHEN** `/ship` runs in a repo that adopted the walkthrough
- **THEN** `/walk` runs once after the delegated `/save` and before the merge, and its evidence lands on the PR
- **AND** a `NONE`, `UNKNOWN`, or `TIMEOUT` verdict changes nothing about the merge

#### Scenario: Shipping in an unadopted repo does not nudge

- **WHEN** `/ship` runs in a repo that has not adopted the walkthrough
- **THEN** the walk step reports `NONE` in one line and the ship proceeds
- **AND** no warning or adoption nudge is emitted

#### Scenario: Walking repeatedly is normal

- **WHEN** `/walk` is invoked three times across one change
- **THEN** each invocation performs a full walk and reports its own verdict
- **AND** no invocation is refused or flagged for repetition

#### Scenario: Mid-change walking

- **WHEN** `/walk` is invoked on a branch whose `tasks.md` still has unchecked tasks
- **THEN** the walk runs against whatever is deployed for the current commit
- **AND** the incomplete state of the change is not treated as an error
