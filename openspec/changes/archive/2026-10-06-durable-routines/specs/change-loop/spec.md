# Spec Delta

## MODIFIED Requirements

### Requirement: A task that will come back gets one offer

When a task done by hand will clearly come back (the person says it recurs, or memory shows they asked before), the next-step question SHALL include one option for a routine or a mini app, named by its outcome. The agent SHALL NOT offer on a guess, after a code change it built, in an unattended run, or after a decline for that task.

#### Scenario: The person says it recurs

- **WHEN** the person asks for a support email summary and says they need it every Monday
- **THEN** the next-step question includes doing it every Monday, beside stopping

#### Scenario: The person declines

- **WHEN** the person turns down the offer
- **THEN** the decline is recorded in memory and a later request for the same task gets no offer
