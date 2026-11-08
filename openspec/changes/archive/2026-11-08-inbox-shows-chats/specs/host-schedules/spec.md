## MODIFIED Requirements

### Requirement: A background schedule runs with no chat

A schedule SHALL be able to run as a background job, with no chat: an optional check with no AI says whether there is work, and the run follows the schedule's instructions within its time limit. It SHALL follow the same clock as every other schedule: a run due while the computer is off starts once on its return, if still in time, and otherwise shows as missed. A background run SHALL never send, pay, publish or delete unless its own instructions allow that one step. One that publishes SHALL work in its own copy of the repo. A run that finds something for the person to see SHALL open one chat, named for the schedule, whose first message is what it found; a run that finds nothing for the person SHALL open none.

#### Scenario: A weekly job with a check

- **WHEN** a background schedule is due every Monday at 9:00 and has a check
- **THEN** at 9:00 on Monday the check runs, and a background run starts only when the check finds work

#### Scenario: A computer that was off

- **WHEN** the computer was off at 9:00 and starts at 11:00, within the schedule's allowed lateness
- **THEN** the 9:00 run starts once at 11:00

#### Scenario: A run with something for the person

- **WHEN** the weekly invoice check finds three late invoices
- **THEN** one chat *Invoice check* opens with the three invoices, it shows in Jo's Inbox, and no other chat opens for that run
