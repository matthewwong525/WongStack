## MODIFIED Requirements

### Requirement: A chat schedule opens its own workspace

A schedule that runs as a chat SHALL open in its own workspace. The workspace SHALL be named for the schedule, as its chat is; where the name can not be set, the chat SHALL still start and the run's log SHALL say why. Where the computer can not open one, the run SHALL not start, and the app SHALL show the run as not started and why. No run SHALL open two workspaces.

#### Scenario: A computer that can not open a workspace

- **WHEN** a chat schedule comes due on a computer whose chat app can not open a workspace
- **THEN** no chat starts, and the schedule's last run shows as not started, with the reason

#### Scenario: The workspace shows the schedule's name

- **WHEN** the schedule *Plan the week* opens its chat in the main checkout
- **THEN** its workspace shows *Plan the week* in the workspace list, not the branch name *main*

#### Scenario: The name can not be set

- **WHEN** the chat app opens the chat but refuses to rename its workspace
- **THEN** the chat still starts, the run shows as started, and the run's log line names the warning

### Requirement: Fresh sessions read the agreed published instructions

Each run SHALL get its schedule's exact approved instructions and progress from the app, after this computer confirms that version is approved here, identifies the run, and claims the progress. For a chat run the computer SHALL do these checks before the chat opens, and the chat's first message SHALL be the approved instructions word for word, followed by the run's authority, end condition, progress, and the one command that finishes the run. A missing schedule, a mismatched run, revoked access, an unapproved version, or progress another run holds SHALL block the run before any chat opens. Progress SHALL live in the app, never only in a disposable checkout or on one computer.

#### Scenario: A fresh checkout

- **WHEN** the app's clock starts a new session without the prior conversation
- **THEN** the session reads the schedule's approved instructions and progress and can identify what to do

#### Scenario: The binding belongs to another job

- **WHEN** a run's schedule or version does not match what this computer approved
- **THEN** it performs no follow-up and reports the mismatch

#### Scenario: The chat starts with the approved text

- **WHEN** the approved schedule *Plan the week* opens its chat
- **THEN** the chat's first message starts with the schedule's instructions word for word, and its footer names the run and the `finish` command

#### Scenario: A skill as the instructions

- **WHEN** a schedule's approved instructions are `/news`
- **THEN** the chat's first message starts with `/news`, so the chat app runs that skill

#### Scenario: Another run holds the progress

- **WHEN** a chat schedule comes due while an earlier run still holds its progress
- **THEN** no chat opens, and the run shows as not started because the schedule is already running
