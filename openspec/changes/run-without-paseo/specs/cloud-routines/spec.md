# Spec Delta

## Purpose

Let a person put any prompt or verb on a recurring schedule that runs in their own Cloudflare account, with their computer off, as the person who made it, and with no chat app needed.

## ADDED Requirements

### Requirement: Create a routine from a plain request

`/routine` SHALL turn a cadence in the person's words into a five-field cron schedule for any prompt, show the name, cron, timezone, prompt, and whose sign-in it runs with before creating it, and report the next run time. It SHALL work the same in any app that runs the assistant.

#### Scenario: A weekday routine

- **WHEN** the person runs `/routine every weekday at 9am: /improve` on a computer without Paseo
- **THEN** one routine exists with cron `0 9 * * 1-5` and prompt `/improve`, and the reply gives its next run

### Requirement: The first routine sets up the cloud pieces

Setup SHALL install nothing for routines. The first `/routine` that creates one SHALL say what it adds to the person's Cloudflare account, then add it there and nowhere else. On an account without Cloudflare's paid plan it SHALL add nothing, create no routine, and say the plan is needed and what it costs.

#### Scenario: The first routine on a paid account

- **WHEN** a person on Cloudflare's paid plan creates their first routine
- **THEN** the routine pieces are added to their own account, the reply names them, and the routine is created

#### Scenario: A free account

- **WHEN** a person on Cloudflare's free plan runs `/routine every Monday at 9am: /improve`
- **THEN** nothing is added to the account, no routine exists, and the reply says routines need the paid plan and its cost

### Requirement: A run acts as the person who made the routine

A routine SHALL run with its maker's own assistant sign-in and under their name. The agent SHALL ask for that sign-in through the private key link, never in chat, and SHALL keep it only in the person's own computer's ignored files and their own Cloudflare account. No command, list, log, or reply SHALL show it. A routine whose maker has no working sign-in SHALL NOT start a run, and its last result SHALL say to sign in again.

#### Scenario: The first routine asks for a sign-in

- **WHEN** a person with no stored sign-in creates a routine
- **THEN** the reply carries a private key link for the sign-in, and the routine is created once it is saved

#### Scenario: The sign-in stops working

- **WHEN** a routine fires after its maker's sign-in was revoked
- **THEN** no assistant runs, and the routine's last result says the sign-in must be renewed

### Requirement: A run happens in a short-lived cloud computer

Each run SHALL start a new assistant in a short-lived computer in the person's Cloudflare account, on a fresh copy of the project's latest default branch, with full permissions inside it and the prompt exactly as written after a fixed notice that nobody can answer. A run SHALL NOT need the person's computer to be on and SHALL NOT touch any checkout on it. Nothing from a run SHALL remain afterwards except what it saved to the project, its memory, and its result.

#### Scenario: The computer is off

- **WHEN** a routine fires while the person's computer is switched off
- **THEN** the run starts, works on a fresh copy of the project, and its result is there when the person next lists routines

### Requirement: A run gets only what it needs

A run SHALL receive the maker's assistant sign-in, access to this one project, the memory key, and the keys its routine names, and nothing else. It SHALL NOT receive the person's Cloudflare user token or the publishing key.

#### Scenario: A run prints its environment

- **WHEN** a run's prompt makes the assistant print every environment variable
- **THEN** the output holds no Cloudflare user token and no publishing key, and the saved log shows no secret value

### Requirement: A run never waits for an answer

A run SHALL take the recommended option wherever it would ask, mark it as assumed, and record anything left for the person as a memory thread. A run SHALL end within 30 minutes. A routine SHALL NOT run twice at once: a tick that arrives while its last run is still going SHALL be skipped and recorded as skipped.

#### Scenario: A run needs a decision

- **WHEN** a scheduled `/improve` reaches a choice it would normally ask about
- **THEN** it takes the recommended option, labels it assumed, and the person's next chat shows the open thread

#### Scenario: Still running at the next tick

- **WHEN** an every-15-minutes routine's run is still going when the next tick arrives
- **THEN** no second run starts, and the list shows one skipped tick

### Requirement: Manage this install's routines

`/routine` with no argument SHALL list this install's routines with cadence, status, next run, and last result, and SHALL pause, resume, run now, change, delete, or show the log of one by name or id. Only a caller holding this install's routines key SHALL be answered; any other caller SHALL learn nothing.

#### Scenario: An ambiguous name

- **WHEN** a name matches more than one routine
- **THEN** nothing changes and the reply lists the matching ids

#### Scenario: A caller without the key

- **WHEN** a request reaches the routine pieces without this install's routines key
- **THEN** it gets the same answer as an address that does not exist

### Requirement: When the cloud cannot be reached, nothing changes

When the routine pieces are not installed, do not answer, or answer in a shape `/routine` no longer understands, `/routine` SHALL change nothing, say which, and say how to put it right.

#### Scenario: The cloud does not answer

- **WHEN** `/routine` runs while the routine pieces do not answer
- **THEN** nothing is created or changed, and the reply says they did not answer and to try again

### Requirement: Teardown removes the routine pieces

Teardown SHALL remove what the first routine added to the account, with its stored sign-ins, and nothing else in the account.

#### Scenario: A shared account

- **WHEN** teardown runs in an account that holds other projects
- **THEN** only this install's routine pieces are removed, and anything Cloudflare will not remove is named as left behind

### Requirement: Paseo schedules are left alone

An update SHALL NOT delete, move, or change a schedule the person made in Paseo. The update's plan SHALL tell the person that those schedules keep running in Paseo and how to make each again as a routine.

#### Scenario: Updating an install with Paseo schedules

- **WHEN** an install with two Paseo schedules takes this update
- **THEN** both still run in Paseo, and the update's plan carries a to-do to make them again with `/routine` and delete the old ones in Paseo
