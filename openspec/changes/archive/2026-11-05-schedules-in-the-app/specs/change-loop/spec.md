## MODIFIED Requirements

### Requirement: Each step limits what it may change

Every chat SHALL be in one step, starting in plan. Explore SHALL change no repo file. Plan SHALL change only plans and wiki pages, and MAY save a schedule to the company app after the person's OK; a code change SHALL wait for the person's go. Apply, ship, and any other step the person types SHALL be free to change any repo file. Every step MAY read, research, run the repo's tests and scripts, and write throwaway files outside the tracked repo.

#### Scenario: Exploring finds a fix

- **WHEN** the person types `/explore` and the agent finds a one-line fix
- **THEN** it reports the fix and offers a plan, and changes no repo file

#### Scenario: A note in a new chat

- **WHEN** a new chat is asked to remember that invoices go out on the 1st
- **THEN** the agent writes it to the wiki in plan, with no build step

#### Scenario: A reminder in a new chat

- **WHEN** a new chat is asked to remind the person every Monday to send invoices
- **THEN** the agent shows the schedule, saves it to the app after the person's OK, and makes no repo change and no build step

## REMOVED Requirements

### Requirement: Publishing a schedule record preserves the code gate

**Reason**: Schedules live in the company app; no schedule record or finite goal is published through git.
**Migration**: "Every schedule lives in the company app" in `host-schedules`; code a schedule needs still uses the ordinary change loop.
