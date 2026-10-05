## MODIFIED Requirements

### Requirement: Outcome-led improvement

`/improve [focus]` SHALL seek one improvement that makes the project meaningfully more useful, reliable, or easier to maintain, using the project's goals, remembered problems when available, and current work as context. A focus SHALL accept an area or a desired outcome. The agent SHALL choose its investigation and supported improvement without a mandatory survey, rotation, ranking format, or candidate-selection question; unresolved material choices SHALL follow the normal change loop.

#### Scenario: A desired outcome
- **WHEN** the user invokes `/improve make the key link easier to use`
- **THEN** the agent investigates and selects one supported improvement toward that outcome through the project's existing workflow

#### Scenario: A known goal with no open material choice
- **WHEN** an invocation supplies enough context for a supported improvement
- **THEN** selection and delivery proceed without a separate candidate approval round
