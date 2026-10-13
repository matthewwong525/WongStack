# Spec Delta

## MODIFIED Requirements

### Requirement: A trim shows where every rule went

A change that shortens or simplifies instructions SHALL list each rule of the old text with the place that now holds it, or, for a rule it drops, the reason it is safe to drop, so a reviewer can see none was lost by accident. Such a change SHALL NOT drop a rule that guards an action that cannot be undone, and SHALL show the person every dropped rule in plain words before publishing.

#### Scenario: A rule merged into another page

- **WHEN** a rule is removed from one skill because another page states it
- **THEN** the list names the page that now states it, and the skill links there

#### Scenario: A rule dropped on purpose

- **WHEN** a simplifying change removes a rule that no page keeps
- **THEN** the list names the rule and why it is safe to drop, and the person reads it in plain words before the publish question
