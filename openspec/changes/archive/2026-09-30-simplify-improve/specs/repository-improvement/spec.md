## ADDED Requirements

### Requirement: Outcome-led improvement

`/improve [focus]` SHALL seek one improvement that makes the project meaningfully more useful, reliable, or easier to maintain, using the project's goals, remembered problems when available, and current work as context. A focus SHALL accept an area or a desired outcome. The agent SHALL choose its investigation and supported improvement without a mandatory survey, rotation, ranking format, or candidate-selection question; unresolved material choices SHALL follow the normal change loop.

#### Scenario: A desired outcome
- **WHEN** the user invokes `/improve make the hand-over easier to use`
- **THEN** the agent investigates and selects one supported improvement toward that outcome through the project's existing workflow

#### Scenario: A known goal with no open material choice
- **WHEN** an invocation supplies enough context for a supported improvement
- **THEN** selection and delivery proceed without a separate candidate approval round

## MODIFIED Requirements

### Requirement: Selection rests on evidence

The selected improvement SHALL rest on concrete evidence of value and an appropriate verification of its intended result. The report SHALL explain what improves and what was checked, disclosing material uncertainty. A pattern match alone SHALL NOT justify a fix. With no supported worthwhile candidate, the run SHALL report no change.

#### Scenario: Nothing worth fixing
- **WHEN** investigation supports no worthwhile improvement
- **THEN** it reports no change and its limits, with no invented cleanup

### Requirement: One change through /ship

A normal invocation SHALL authorize one selected improvement through `/ship`, retaining all normal delivery gates and scope boundaries. `/improve` SHALL NOT own a separate planning, Git, archive, or publishing workflow.

#### Scenario: Unrelated work in the checkout
- **WHEN** the checkout holds unrelated unfinished work
- **THEN** the normal workflow preserves that work and does not publish it as part of the selected improvement

### Requirement: Audit-only changes nothing

`/improve --audit-only [focus]` SHALL report supported findings and recommendations with no edit, fetch, branch, pull request, saved report, or delivery.

#### Scenario: A dirty checkout
- **WHEN** audit-only runs on local unsaved work
- **THEN** it reports the relevant state and limits with findings, and changes nothing

## REMOVED Requirements

### Requirement: Bounded review with disclosed coverage
**Reason:** A fixed recent-history and rotating-area review constrains investigation rather than defining a useful outcome.
**Migration:** Use a focus when scope matters; the agent chooses evidence appropriate to the outcome and reports material limits.

### Requirement: The survey is read-only
**Reason:** The compulsory survey and its executable are removed.
**Migration:** Investigation uses the existing project's tools; findings-only invocations retain their no-change contract.

### Requirement: Unattended only when said so
**Reason:** Invoking the command already authorizes one supported improvement, so a separate selection round and unattended-selection mode are unnecessary.
**Migration:** Use normal exploration for unresolved material choices and normal delivery authorization boundaries; silence remains no answer to a pending question.
