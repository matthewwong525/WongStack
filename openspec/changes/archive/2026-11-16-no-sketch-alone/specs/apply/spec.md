## REMOVED Requirements

### Requirement: A fresh helper builds the tasks

**Reason**: Its scenario *A plan with a prototype* names a prototype copy that plans no longer make.

**Migration**: see *A fresh helper builds the tasks from the plan*, which carries the same rules and builds each screen to match the plan's approved page.

## ADDED Requirements

### Requirement: A fresh helper builds the tasks from the plan

Where the host can start one, a fresh helper agent SHALL build the change's tasks, so the build does not carry the planning conversation. When the plan shows a screen as a page, the helper SHALL build the screen to match it. The helper SHALL NOT ask the person, run git, save, or upload a preview, and SHALL NOT report while a helper or check it started is still running. It SHALL return on a question, a blocker, or the whole implementation; the parent SHALL handle a question or blocker and start a new helper for the rest when appropriate. A host with no helper SHALL build inline with the same outcome.

#### Scenario: An ambiguous task

- **WHEN** the helper cannot finish a task without the person's decision
- **THEN** it returns the question, the parent asks the person, and a new helper works the remaining tasks

#### Scenario: No helper available

- **WHEN** the host cannot start a helper agent
- **THEN** `/apply` works the tasks inline with the same outcome

#### Scenario: A plan with a screen page

- **WHEN** the plan shows a changed screen as an approved *After* page
- **THEN** the built screen matches that page unless a task says otherwise
