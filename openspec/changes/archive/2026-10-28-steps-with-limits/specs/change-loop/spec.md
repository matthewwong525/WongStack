## ADDED Requirements

### Requirement: Each step limits what it may change

Every chat SHALL be in one step, starting in plan. Explore SHALL change no repo file. Plan SHALL change only plans, wiki pages, and schedules (`schedules/`); a code change SHALL wait for the person's go. Apply, ship, and any other step the person types SHALL be free to change any repo file. Every step MAY read, research, run the repo's tests and scripts, and write throwaway files outside the tracked repo.

#### Scenario: Exploring finds a fix

- **WHEN** the person types `/explore` and the agent finds a one-line fix
- **THEN** it reports the fix and offers a plan, and changes no repo file

#### Scenario: A note in a new chat

- **WHEN** a new chat is asked to remember that invoices go out on the 1st
- **THEN** the agent writes it to the wiki in plan, with no build step

#### Scenario: A reminder in a new chat

- **WHEN** a new chat is asked to remind the person every Monday to send invoices
- **THEN** the agent saves the schedule in plan, with no build step

### Requirement: Only the person moves a chat past plan

A chat SHALL move past plan only when the person types a step, taps a build button on a plan's page, or picks a build or publish choice the agent offered. A step started inside another SHALL NOT narrow the outer one's limits.

#### Scenario: A plan is written

- **WHEN** a chat in plan has written a plan and the person has given no go
- **THEN** the agent ends on the plan's link and builds nothing

#### Scenario: Ship runs its chain

- **WHEN** the person types `/ship add a sign-up page`
- **THEN** planning and building inside it change files freely, through to the merge

### Requirement: Trying things is research

Asked to test or try something, the agent SHALL run it and report the results before offering any plan, in explore or with no step named. A try that needs new code SHALL keep that code out of the tracked repo.

#### Scenario: Go test it

- **WHEN** the person asks the agent to find out whether a script is slow
- **THEN** the agent runs it, reports the timing, and only then offers a plan
