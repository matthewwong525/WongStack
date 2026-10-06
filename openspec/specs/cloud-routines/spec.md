# cloud-routines Specification

## Purpose

Let a person put any prompt or verb on a recurring schedule that runs in their own Cloudflare account, with their computer off, on any model key or none, and with no chat app needed.

## Requirements

### Requirement: Create a routine from a plain request

`/routine` SHALL turn a cadence in the person's words into a five-field cron schedule for any prompt, show the name, cron, timezone, prompt, and model before creating it, and report the next run time. It SHALL work the same in any app that runs the assistant.

#### Scenario: A weekday routine

- **WHEN** a person on Cloudflare's paid plan runs `/routine every weekday at 9am: /improve` on a computer without Paseo
- **THEN** one routine exists with cron `0 9 * * 1-5` and prompt `/improve`, and the reply gives its next run

### Requirement: Fixed steps become a script, not a routine

When the work asked for is the same steps on every run, `/routine` SHALL say so and build it as a script in the person's app through the usual plan, preview, and publish, with no assistant on a clock. A script's step MAY call an AI model; that alone SHALL NOT make the work a routine. Work that decides its own steps SHALL get a routine. The person SHALL be able to ask for a routine anyway.

#### Scenario: A nightly export

- **WHEN** the person runs `/routine every night at 2am: copy yesterday's orders into the archive table`
- **THEN** no routine is created, the reply says this is fixed steps and will be a script in the app, and a plan for that script follows

#### Scenario: Finding news articles

- **WHEN** the person runs `/routine every morning at 8: find new articles about our competitors and note the three that matter`
- **THEN** a routine is offered, not a script

### Requirement: The first routine installs the cloud pieces

Setup SHALL install nothing for routines. The first `/routine` that creates one SHALL say what it adds to the person's Cloudflare account, ask, then add it there and nowhere else. On an account without Cloudflare's paid plan it SHALL add nothing, create no routine, and say the plan is needed and what it costs.

#### Scenario: The first routine on a paid account

- **WHEN** a person on Cloudflare's paid plan creates their first routine
- **THEN** the routine pieces are added to their own account, the reply names them, and the routine is created

#### Scenario: A free account

- **WHEN** a person on Cloudflare's free plan runs `/routine every Monday at 9am: /improve`
- **THEN** nothing is added to the account, no routine exists, and the reply says routines need the paid plan and its cost

### Requirement: A run happens in a short-lived cloud computer

Each run SHALL start a new assistant in a short-lived computer in the person's Cloudflare account, on a fresh copy of the project's latest default branch, with full permissions inside it and the prompt exactly as written after a fixed notice that nobody can answer. A run SHALL NOT need the person's computer to be on and SHALL NOT touch any checkout on it. Nothing from a run SHALL remain afterwards except what it saved to the project, its memory, and its result.

#### Scenario: The computer is off

- **WHEN** a routine fires while the person's computer is switched off
- **THEN** the run starts, works on a fresh copy of the project, and its result is there when the person next lists routines

### Requirement: The person picks the model, through Cloudflare by default

The first routine SHALL ask which model to use, offering a short list with one recommended, and SHALL reach that model through Cloudflare's AI service in the person's own account, with no model key. A pick SHALL be tested with one request before it is used; a refused pick SHALL NOT replace a working one, and the reply SHALL say why. The person SHALL be able to change the model later.

#### Scenario: The first routine

- **WHEN** a person who has given no model key creates their first routine and picks a model from the list
- **THEN** the run finishes on that model through Cloudflare, and nothing asked for a key

#### Scenario: A model that needs credit

- **WHEN** the person picks a model their Cloudflare account has no credit for
- **THEN** routines keep the model they had, and the reply says the pick needs credit in Cloudflare or the person's own key

### Requirement: Any pasted model key is recognised and tested

The agent SHALL take a model key only through the private key link, never in chat. It SHALL work out which service the key belongs to, test it with one request, and only then put it in use, saying which service and model routines now use. When it cannot tell the service, it SHALL ask which. A key the service refuses SHALL NOT be stored in Cloudflare or replace a working one. No command, list, log, or reply SHALL show a key.

#### Scenario: A Z.ai subscription key

- **WHEN** the person pastes a Z.ai Coding Plan key into the key link
- **THEN** the reply says routines now use Z.ai and names the model, and the next run uses it

#### Scenario: A refused key

- **WHEN** the person pastes a key its service refuses
- **THEN** routines keep the model they had, and the reply says the key was refused

### Requirement: A run gets only what it needs

A run SHALL receive access to this one project, a memory key, the model key, and the keys its routine names, and nothing else. It SHALL NOT receive the person's Cloudflare user token or the publishing key. The memory key SHALL be one made for runs, which reads and writes the project's shared notes and never a person's private facts or chat transcripts; it SHALL NOT be the person's own memory key.

#### Scenario: A run prints its environment

- **WHEN** a run's prompt makes the assistant print every environment variable
- **THEN** the output holds no Cloudflare user token and no publishing key, and the saved log shows no secret value

#### Scenario: A run reads memory

- **WHEN** a run searches memory on an install whose owner has private facts
- **THEN** it finds the shared notes and none of the owner's private facts, and a note it leaves shows in the owner's next chat

### Requirement: A run never waits for an answer

A run SHALL take the recommended option wherever it would ask, mark it as assumed, and record anything left for the person as a memory thread. A run SHALL end within 30 minutes. A routine SHALL NOT run twice at once: a tick that arrives while its last run is still going SHALL be skipped and recorded as skipped.

#### Scenario: A run needs a decision

- **WHEN** a scheduled `/improve` reaches a choice it would normally ask about
- **THEN** it takes the recommended option, labels it assumed, and the person's next chat shows the open thread

#### Scenario: Still running at the next tick

- **WHEN** an every-15-minutes routine's run is still going when the next tick arrives
- **THEN** no second run starts, and the list shows one skipped tick

### Requirement: Manage this install's routines

`/routine` with no argument SHALL list this install's routines with cadence, status, next run, and last result with how long it took to start and to run, and SHALL pause, resume, run now, change, delete, or show the log of one by name or id. Only a caller holding this install's routines key SHALL be answered; any other caller SHALL learn nothing.

#### Scenario: An ambiguous name

- **WHEN** a name matches more than one routine
- **THEN** nothing changes and the reply lists the matching ids

#### Scenario: A caller without the key

- **WHEN** a request reaches the routine pieces without this install's routines key
- **THEN** it gets the same answer as an address that does not exist

### Requirement: When the cloud cannot be reached, nothing changes

When the routine pieces are not installed, do not answer, or answer in a shape `/routine` no longer understands, or the install has no Cloudflare account, `/routine` SHALL change nothing, say which, and say how to put it right.

#### Scenario: The cloud does not answer

- **WHEN** `/routine` runs while the routine pieces do not answer
- **THEN** nothing is created or changed, and the reply says they did not answer and to try again

### Requirement: Teardown removes the routine pieces

Teardown SHALL remove what the first routine added to the account, with its stored keys, and nothing else in the account.

#### Scenario: A shared account

- **WHEN** teardown runs in an account that holds other projects
- **THEN** only this install's routine pieces are removed, and anything Cloudflare will not remove is named as left behind

### Requirement: Paseo schedules are left alone

An update SHALL NOT delete, move, or change a schedule the person made in Paseo. The update's plan SHALL tell the person that those schedules keep running in Paseo and how to make each again as a routine.

#### Scenario: Updating an install with Paseo schedules

- **WHEN** an install with two Paseo schedules takes this update
- **THEN** both still run in Paseo, and the update's plan carries a to-do to make them again with `/routine` and delete the old ones in Paseo

### Requirement: A renamed skill's old name still runs

A routine whose prompt starts with a skill's earlier name SHALL run the skill under its current name, with the rest of the prompt unchanged, and the run's record SHALL name the skill that ran. `/improve` SHALL run `/improve-code` and `/dream` SHALL run `/dream-memory`.

#### Scenario: A routine made before the rename

- **WHEN** a routine created with the prompt `/improve --audit-only` runs after the install updates
- **THEN** the run follows `/improve-code` with `--audit-only`, and no one had to change the routine
