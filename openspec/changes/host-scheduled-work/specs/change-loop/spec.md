## ADDED Requirements

### Requirement: Publishing a schedule record preserves the code gate

An explicitly confirmed schedule registration or lifecycle checkpoint SHALL be publishable through a record-only delivery route with the repo's normal checks or review gate. The route SHALL carry only the selected lightweight routine definition or finite scheduled-work goal and its review material where applicable, SHALL keep an unfinished finite goal open, and SHALL reject unrelated source changes or unfinished code plans. Publishing an ongoing routine definition SHALL not require a permanently open OpenSpec change. Registration SHALL not authorize publishing code in a future run.

#### Scenario: A confirmed schedule registration

- **WHEN** the user confirms the concrete schedule plan and its host destination
- **THEN** the selected record can be saved and merged after its gate while the goal remains unfinished

#### Scenario: Source changes ride with a record

- **WHEN** a record-only publish also contains application changes or an incomplete code plan
- **THEN** that route stops and the ordinary code change loop is required

## MODIFIED Requirements

### Requirement: A task that will come back gets one offer

When a task done by hand will clearly come back (the person says it recurs, or memory shows they asked before), the next-step question SHALL include one option for a schedule or a mini app, named by its outcome. The agent SHALL NOT offer on a guess, after a code change it built, in an unattended run, or after a decline for that task.

#### Scenario: The person says it recurs

- **WHEN** the person asks for a support email summary and says they need it every Monday
- **THEN** the next-step question includes doing it every Monday, beside stopping

#### Scenario: The person declines

- **WHEN** the person turns down the offer
- **THEN** the decline is recorded in memory and a later request for the same task gets no offer
