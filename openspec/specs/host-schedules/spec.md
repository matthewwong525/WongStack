# host-schedules Specification

## Purpose

Let a person schedule future assistant sessions through an available host, follow an agreed goal across sessions, and see what remains open.

## Requirements

### Requirement: Predictable scheduled work prefers a script

Before selecting an assistant scheduler, `/schedule` SHALL assess whether the requested work can reliably run as deterministic steps and SHALL prefer a script on an available clock when it can. A completion condition or a narrowly scoped model call SHALL not alone make the task require an assistant session. Required script implementation SHALL use the ordinary code change loop and publishing gate. Assistant scheduling SHALL be used for work requiring judgment, or an explicit informed choice by the person.

#### Scenario: A fixed invoice reminder

- **WHEN** the request is to check payment and send the same authorized reminder at a predictable interval until an invoice is paid
- **THEN** a timed script is preferred when it can reliably perform those checks and actions, with no assistant session required on every tick

#### Scenario: Follow-ups require interpretation

- **WHEN** each follow-up must interpret different replies and decide how to respond
- **THEN** the assistant scheduling route is considered and its need for judgment is explained

### Requirement: Scheduling uses a verified available host

For work selected to run as assistant sessions, `/schedule` SHALL use the company app's clock when the owner's computer has the background helper and a chat app that can open a session, and otherwise the person's chosen or available host scheduler, distinguishing the host from the assistant model and verifying the capabilities needed in the future execution environment. It SHALL add no container or cloud runner. Before activation it SHALL show the task, destination, absolute next time and timezone, required uptime, and material capability limits.

#### Scenario: The app's clock is available

- **WHEN** a person signed in to their company app, with the helper running, asks for a weekly task
- **THEN** the schedule uses the app's clock, runs on that computer, and reports that the computer must be on

#### Scenario: Codex runs inside Paseo

- **WHEN** a Codex session in Paseo requests future work, the app's clock is unavailable, and Paseo supplies the suitable scheduler
- **THEN** the schedule uses the verified Paseo destination and reports what must remain running

#### Scenario: Only an open-session loop is available

- **WHEN** the person requests a fresh session after this chat ends but only a session-bound loop is available
- **THEN** no independent future schedule is claimed, and the missing capability is reported

### Requirement: One-time recurring and goal-based tasks have distinct endings

The person SHALL be able to request work once, on a recurring cadence, or until a stated completion condition is verified. One-time work SHALL not repeat annually or become an unbounded recurrence. A recurring schedule without an end condition SHALL remain configured until stopped. A successful one-time task, or a goal whose completion is verified, SHALL end its schedule and keep its history.

#### Scenario: A task next Tuesday

- **WHEN** the person schedules one task for next Tuesday
- **THEN** its absolute due time and one-time behavior are preserved, and success leaves no future run

#### Scenario: A weekly review

- **WHEN** a weekly review succeeds with no terminal goal
- **THEN** its next run remains scheduled and the schedule stays listed

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

### Requirement: Completion is checked before outreach

A goal-based run SHALL check the named authoritative completion source before contacting anyone. Goal checks SHALL default to an agreed periodic cadence and SHALL not require native timing updates. Ending a session with a pending goal SHALL leave that schedule active; confirmed completion SHALL mark the goal finished, prevent further goal actions and stop its owned execution items or native schedule triggers, without disabling a shared clock used by other work. Missing or ambiguous evidence SHALL not be treated as completion. A failed stop SHALL remain visible as cleanup pending while further outreach is suppressed.

#### Scenario: An invoice was paid

- **WHEN** the payment source confirms the scheduled invoice is fully paid before the next follow-up
- **THEN** no follow-up is sent, the schedule is stopped and verified, and its record can close

#### Scenario: The host refuses cancellation

- **WHEN** the goal is complete but cancellation fails
- **THEN** later runs perform no outreach and the report identifies the still-active trigger and pending cleanup

### Requirement: Adaptive wake-ups are capability-bound and scoped

An optional adaptive schedule SHALL let a future session choose and verify its next wake-up within the agreed timing, contact-hour, and expiry limits. It SHALL be activated only when that session can persist continuation, change timing, and stop the schedule. Fixed periodic checks SHALL be described as fixed; replacing an explicitly requested exact adaptive wake-up SHALL need the person's agreement.

#### Scenario: The person promises to pay Friday

- **WHEN** an authorized follow-up learns of a Friday payment promise and the schedule permits a later check
- **THEN** the next wake-up is adjusted within the agreed limits and its actual time is reported

#### Scenario: Management is unavailable in a cloud run

- **WHEN** a host can start future sessions but those sessions cannot adjust or stop their schedule
- **THEN** autonomous adaptation is not claimed or activated on that host

### Requirement: Adaptive clock changes survive session completion

Adaptive readiness SHALL require a changed wake-up to survive session completion and start the requested later session. Immediate in-run read-back alone SHALL NOT establish readiness.

#### Scenario: The host overwrites an in-run clock change

- **WHEN** a clock change reads back correctly during a run but the host overwrites it when that session ends
- **THEN** adaptive readiness remains unverified until a change survives completion and produces the later requested session; immediate read-back alone is insufficient

### Requirement: Follow-ups preserve progress and avoid duplicate actions

Automatic follow-ups SHALL require persistent continuation, identifiable prior actions, and execution ownership that prevents overlapping runs from contacting the same person for the same step. An uncertain outward result SHALL be checked against the service before retrying, and SHALL block retry when it cannot be resolved. Archived, completed, cancelled, or obsolete schedule generations SHALL perform no further goal actions.

#### Scenario: A send response is lost

- **WHEN** a follow-up may have been sent but its result is unknown
- **THEN** the next run checks the service receipt or asks for help instead of sending it again blindly

#### Scenario: Two sessions wake for the same step

- **WHEN** two sessions attempt the same schedule step concurrently
- **THEN** only the session with verified execution ownership may perform the outward step

### Requirement: A call suggestion waits for the user's answer

When a call would help, the schedule SHALL offer it to the user through a reachable question surface and wait for their answer before the dependent action. The question and deferred action SHALL survive a new session, SHALL not be repeatedly offered while pending, and SHALL not interpret silence or elapsed time as consent. Offering a call SHALL not place one.

#### Scenario: A follow-up needs a call

- **WHEN** the assistant decides a call may help and the user has not answered
- **THEN** one pending suggestion is kept, the dependent follow-up waits, and no call is placed

#### Scenario: The next session opens before an answer

- **WHEN** another session starts while that question is still pending
- **THEN** it checks goal completion and preserves the wait without asking the same question again, performing the deferred action, or inferring an answer

### Requirement: Scheduled authority is explicit and does not widen itself

Each schedule SHALL retain the user's agreed recipients, channels, action scope, contact limits, and escalation rules. Explicit authorization SHALL persist within those bounds; actions outside them SHALL wait for the user. A published routine definition or goal plan, external message, or scheduler trigger SHALL not by itself authorize calling, processing a payment, or publishing code.

#### Scenario: Authorized invoice reminders

- **WHEN** the user agrees to email one customer within a stated reminder policy until payment
- **THEN** future runs can send only reminders within that policy and stop when its completion condition is verified

#### Scenario: A customer asks for a refund

- **WHEN** an invoice follow-up receives a request to issue a refund
- **THEN** it seeks the user's authority and does not treat the customer's request as permission to pay

### Requirement: Existing schedules survive the update

Renaming the skill SHALL preserve existing cloud and host schedules, and SHALL provide an explicit path to inspect, pause, migrate, and remove legacy cloud scheduling resources. New installs SHALL not install the old runner. Migration SHALL prevent old and replacement jobs from performing the same follow-up, and teardown SHALL affect only the explicitly selected old resources.

#### Scenario: Updating an install with cloud jobs

- **WHEN** an install with an existing cloud routine updates to the schedule skill
- **THEN** that job continues to exist, legacy management remains available, and no new cloud runner is installed

#### Scenario: Moving one follow-up

- **WHEN** the person explicitly moves a legacy follow-up to a host scheduler
- **THEN** its original is paused before the replacement can act, and unrelated jobs and cloud resources are untouched

### Requirement: An app-clock run starts at most once, on the owner's computer

At a schedule's due time the app SHALL wake the owner's computer the schedule is bound to, and that computer SHALL open the schedule's session from its approved instructions. A run SHALL start at most once. A run that comes due while the computer is away SHALL start once on its return when still within the schedule's allowed lateness, and SHALL otherwise show as missed. A run asked for now while the computer is away SHALL wait and offer *Cancel* until the computer takes it.

#### Scenario: The computer was off

- **WHEN** a daily 8:00 run comes due while the computer is off and it returns at 15:00, past the allowed lateness
- **THEN** no session starts for that run, it shows as missed, and the next day's run happens normally

#### Scenario: Taken but never reported

- **WHEN** the computer takes a run and its result never comes back
- **THEN** the run shows as not started, and it is never handed out again

### Requirement: Moving a schedule to the app's clock never runs it twice

An existing schedule on another host SHALL stay there until the owner asks to move it. Moving SHALL pause the original before the app's copy can run, and SHALL remove the original only after the app's copy is registered and read back.

#### Scenario: Moving the weekly research

- **WHEN** the owner asks to move a Paseo schedule to the app
- **THEN** the Paseo schedule is paused first, the app's copy takes the next due time, and the work runs once

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

A schedule that runs as a chat SHALL open in its own workspace, named after the schedule, never after a git branch. When the schedule's folder is a git project, the workspace SHALL be a fresh copy of the project from its latest fetched default branch, so the chat never works on the main copy. When the folder is not a git project, the chat SHALL open in that folder, in a workspace named after the schedule. When the fetch or the name fails, the run SHALL still start, and the computer's log SHALL say why. Where the computer can not open a workspace, the run SHALL not start, and the app SHALL show the run as not started and why. No run SHALL open two workspaces.

#### Scenario: A computer that can not open a workspace

- **WHEN** a chat schedule comes due on a computer whose chat app can not open a workspace
- **THEN** no chat starts, and the schedule's last run shows as not started, with the reason

#### Scenario: A morning standup run

- **WHEN** the Standup schedule starts a chat run in a git project's folder
- **THEN** the Paseo sidebar shows a workspace called *Standup*, in its own copy of the project from the latest default branch, and the main copy is unchanged

#### Scenario: The name can not be set

- **WHEN** Paseo opens the run's workspace but refuses the rename
- **THEN** the chat still starts, and the computer's log records that the workspace kept Paseo's name

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
- **THEN** one chat *Invoice check* opens with the three invoices, its review page shows in Jo's Inbox, and no other chat opens for that run

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
