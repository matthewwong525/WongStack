## ADDED Requirements

### Requirement: Every schedule lives in the company app

Each schedule SHALL live in the person's company app: its name, what it does, its instructions, where it runs, its timing, whether it is on, its progress and its runs. An ongoing schedule SHALL need no repo file, no open OpenSpec change and no publish. It SHALL stay listed after a successful run, and after pausing or cancelling, with its state shown. A schedule whose setup needs new code, such as a check script, SHALL get that code through the ordinary change loop, and the schedule itself SHALL still live in the app.

#### Scenario: A weekly research schedule

- **WHEN** the person asks for weekly research with no end
- **THEN** the schedule is saved in the app in seconds, with no repo change and no publish, and a successful run leaves it scheduled

#### Scenario: A schedule that needs a check script

- **WHEN** a new schedule needs a script that checks for work first
- **THEN** the script goes through a change and its publish, and the schedule that runs it is saved in the app

### Requirement: A computer runs only a version approved on it

A computer SHALL start a schedule's run only when that schedule's exact version — its instructions, where it runs, and what it may do — was approved on that computer. The person SHALL approve in a chat on that computer, after the chat shows what the schedule will do. A tap or any other request that reaches the app SHALL NOT approve a version. Each computer SHALL keep its own approvals, outside the app and outside git. A run of an unapproved version SHALL not start, and SHALL show as waiting for the person's OK on that computer.

#### Scenario: Made in a chat on this computer

- **WHEN** Jo asks a chat on her laptop to check the orders every weekday at 9 and says OK to what it shows
- **THEN** the schedule is saved in the app, the laptop notes that version as approved, and Monday's 9:00 run starts there

#### Scenario: Changed in the app by someone else

- **WHEN** a schedule's instructions in the app change, and no chat on Jo's laptop approved the new version
- **THEN** the next run does not start, it shows as waiting for Jo's OK on the laptop, and nothing else runs

### Requirement: Each person has their own schedules

Each schedule SHALL belong to one person of one installation: the person who made it, or the teammate a team schedule was copied to. A person SHALL see, change, pause, run and approve only their own schedules, and SHALL never see another person's, the owner included. A computer SHALL claim and run only the schedules of the person signed in on it. On a computer two people use, each person's approvals SHALL be kept apart, so one person's OK never lets the other person's schedule run.

#### Scenario: Two people, the same name

- **WHEN** Jo and Kim each have a schedule named *weekly-plan*
- **THEN** each sees only their own, and pausing Jo's leaves Kim's on

#### Scenario: A shared computer

- **WHEN** Jo approved *weekly-plan* on a server Kim also signs in to, and Kim's *weekly-plan* comes due there
- **THEN** Kim's run does not start until Kim approves it, and Jo's OK is not used

### Requirement: A person makes or changes a schedule by asking

A person SHALL be able to add, change, pause or stop their own schedules by saying so in any chat. Before it saves, the chat SHALL show what the schedule will do, when, where, and what must stay on, and SHALL ask for an OK. Only the owner SHALL make a schedule for the whole team; it SHALL become one schedule per person, which each person approves on their own computer.

#### Scenario: Adding a weekday routine

- **WHEN** Jo says "check yesterday's orders every weekday morning"
- **THEN** the chat shows the schedule, Jo says OK, and the next weekday morning it runs

#### Scenario: A team schedule

- **WHEN** the owner makes a Monday planning schedule for everyone
- **THEN** each teammate gets their own copy, it runs on a teammate's computer only after that teammate's OK there, and the owner does not see the copies afterwards

### Requirement: A chat schedule opens its own workspace

A schedule that runs as a chat SHALL open in its own workspace. Where the computer can not open one, the run SHALL not start, and the app SHALL show the run as not started and why. No run SHALL open two workspaces.

#### Scenario: A computer that can not open a workspace

- **WHEN** a chat schedule comes due on a computer whose chat app can not open a workspace
- **THEN** no chat starts, and the schedule's last run shows as not started, with the reason

### Requirement: A background schedule runs with no chat

A schedule SHALL be able to run as a background job, with no chat: an optional check with no AI says whether there is work, and the run follows the schedule's instructions within its time limit. It SHALL follow the same clock as every other schedule: a run due while the computer is off starts once on its return, if still in time, and otherwise shows as missed. A background run SHALL never send, pay, publish or delete unless its own instructions allow that one step. One that publishes SHALL work in its own copy of the repo.

#### Scenario: A weekly job with a check

- **WHEN** a background schedule is due every Monday at 9:00 and has a check
- **THEN** at 9:00 on Monday the check runs, and a background run starts only when the check finds work

#### Scenario: A computer that was off

- **WHEN** the computer was off at 9:00 and starts at 11:00, within the schedule's allowed lateness
- **THEN** the 9:00 run starts once at 11:00

### Requirement: One schedule list shows every schedule

`/schedule`, any chat asked *what's scheduled?*, and the Inbox SHALL show the person's schedules from the app, each with what it does, its state, where it runs, its next run and its last result. A schedule that still runs on another host, such as Paseo, SHALL show in the same list, marked as running there. Changing a recurring schedule into one with an end SHALL be an explicit change of that same schedule, never a second schedule.

#### Scenario: List all scheduled work

- **WHEN** the person has a weekly routine, an invoice follow-up that ends when paid, and one schedule still in Paseo
- **THEN** all three appear in one list, each with its state and where it runs

#### Scenario: Add an end to a routine

- **WHEN** the person asks that a weekly routine stop once a stated goal is met
- **THEN** that schedule gains the end, its history stays, and no second schedule is made

### Requirement: Managing a schedule reports what really happened

Listing and managing a schedule — pause, resume, run now, change, cancel and recent results — SHALL report only what the app and the computer confirm. A save that fails or is uncertain SHALL be read back before a retry, and SHALL not be reported as done. A schedule saved in the app but not yet approved on its computer SHALL show as waiting for that OK. When the app can not be reached, the list SHALL say so and invent no timing.

#### Scenario: Saved but not approved

- **WHEN** the app saved a new schedule but the computer could not record its approval
- **THEN** the schedule shows as waiting for the OK on that computer, and a retry approves the same schedule, never a second one

#### Scenario: The app can not be reached

- **WHEN** the person lists schedules while the app can not be reached
- **THEN** the list says the app can not be reached, and shows no invented times

### Requirement: Existing routines move to the app at the update

The update that brings this change SHALL move each install's existing routines into the app: the routines in each person's daily settings file, the team file's routines, the install's own timed jobs, and each repo schedule file. Each SHALL keep its name, instructions, folder, days and time, and SHALL be approved on the computer that ran it, since the person approved it by saving it in the repo. No routine SHALL run twice, and none SHALL run from both places. When two moved schedules look like the same job, the move SHALL ask which to keep. The old lists and files SHALL be removed only after every moved schedule is read back from the app.

#### Scenario: Moving the morning routines

- **WHEN** an install with four morning routines in a settings file takes the update
- **THEN** after it goes live, the four are in the app with the same days and time, the next morning starts each one once, and the settings file no longer lists them

#### Scenario: Two jobs look the same

- **WHEN** a monthly *Reconcile the books* routine and a repo schedule *Monthly books close* both move
- **THEN** the move shows both and asks which to keep, and moves neither twice

## MODIFIED Requirements

### Requirement: One-time recurring and goal-based tasks have distinct endings

The person SHALL be able to request work once, on a recurring cadence, or until a stated completion condition is verified. One-time work SHALL not repeat annually or become an unbounded recurrence. A recurring schedule without an end condition SHALL remain configured until stopped. A successful one-time task, or a goal whose completion is verified, SHALL end its schedule and keep its history.

#### Scenario: A task next Tuesday

- **WHEN** the person schedules one task for next Tuesday
- **THEN** its absolute due time and one-time behavior are preserved, and success leaves no future run

#### Scenario: A weekly review

- **WHEN** a weekly review succeeds with no terminal goal
- **THEN** its next run remains scheduled and the schedule stays listed

### Requirement: Fresh sessions read the agreed published instructions

Each run SHALL read its schedule's exact approved instructions and progress from the app, confirm that version is approved on this computer, identify its own run, and read available progress before acting. A missing schedule, a mismatched run, revoked access, or an unapproved version SHALL block dependent actions. Progress SHALL live in the app, never only in a disposable checkout or on one computer.

#### Scenario: A fresh checkout

- **WHEN** the app's clock starts a new session without the prior conversation
- **THEN** the session reads the schedule's approved instructions and progress and can identify what to do

#### Scenario: The binding belongs to another job

- **WHEN** a run's schedule or version does not match what this computer approved
- **THEN** it performs no follow-up and reports the mismatch

### Requirement: An app-clock run starts at most once, on the owner's computer

At a schedule's due time the app SHALL wake the owner's computer the schedule is bound to, and that computer SHALL open the schedule's session from its approved instructions. A run SHALL start at most once. A run that comes due while the computer is away SHALL start once on its return when still within the schedule's allowed lateness, and SHALL otherwise show as missed. A run asked for now while the computer is away SHALL wait and offer *Cancel* until the computer takes it.

#### Scenario: The computer was off

- **WHEN** a daily 8:00 run comes due while the computer is off and it returns at 15:00, past the allowed lateness
- **THEN** no session starts for that run, it shows as missed, and the next day's run happens normally

#### Scenario: Taken but never reported

- **WHEN** the computer takes a run and its result never comes back
- **THEN** the run shows as not started, and it is never handed out again

## REMOVED Requirements

### Requirement: Ongoing routines have lightweight repo definitions

**Reason**: Schedules live in the company app, not in repo files.
**Migration**: "Every schedule lives in the company app"; the update moves each `schedules/<name>.json` into the app.

### Requirement: Routines and finite goals share a schedule view

**Reason**: A finite goal is now a schedule with an end, so one list holds every schedule and no OpenSpec goal exists.
**Migration**: "One schedule list shows every schedule".

### Requirement: Registration and management report verified outcomes

**Reason**: Registration no longer waits for a published repo record; it waits for the computer's approval.
**Migration**: "Managing a schedule reports what really happened".
