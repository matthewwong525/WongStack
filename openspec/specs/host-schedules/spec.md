# host-schedules Specification

## Purpose

Let a person schedule future assistant sessions through an available host, follow an agreed goal across sessions, and see what remains open without installing another scheduling service.

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

For work selected to run as assistant sessions, `/schedule` SHALL use the person's chosen or available host scheduler, distinguish it from the assistant model, and verify the capabilities needed in the future execution environment. It SHALL add no scheduling service, Durable Object, container, or host installation. Before activation it SHALL show the task, destination, absolute next time and timezone, required uptime, and material capability limits.

#### Scenario: Codex runs inside Paseo

- **WHEN** a Codex session in Paseo requests future work and Paseo supplies the suitable scheduler
- **THEN** the schedule uses the verified Paseo destination and reports what must remain running

#### Scenario: Only an open-session loop is available

- **WHEN** the person requests a fresh session after this chat ends but only a session-bound loop is available
- **THEN** no independent future schedule is claimed, and the missing capability is reported

### Requirement: Ongoing routines have lightweight repo definitions

An ongoing routine with no terminal goal SHALL have a lightweight repository definition of its owner, instructions, execution reference, timing policy, authorized scope, and scheduler binding. It SHALL not require a permanently open OpenSpec change or goal checklist. The definition SHALL stay available after a successful run and after pausing or cancelling, with its lifecycle state identifiable. The routine's setup code change, if one is needed, SHALL finish through ordinary delivery independently of later routine runs.

#### Scenario: A weekly research routine

- **WHEN** the person schedules weekly research with no end condition
- **THEN** its definition is published in the repo without an ongoing OpenSpec goal, and a successful weekly run leaves the routine scheduled

#### Scenario: A cron job is implemented

- **WHEN** code for an ongoing cron job is delivered
- **THEN** its setup plan can archive while the job's live code and configuration remain visible and continue running

### Requirement: Routines and finite goals share a schedule view

`/schedule` SHALL show repo-defined ongoing routines and finite scheduled goals together with their kind, owner, state, host, and available live timing and results. Each schedule SHALL have one authoritative repo instruction record. Selecting a routine SHALL resume or manage that definition; selecting a finite goal SHALL resume or manage its goal plan, without changing the type automatically.

#### Scenario: List all scheduled work

- **WHEN** the repo has a weekly routine and an invoice follow-up goal
- **THEN** both appear in the schedule view, and only the finite goal appears as an open OpenSpec goal

#### Scenario: Add an end condition to a routine

- **WHEN** the person changes an ongoing routine into work with a finish line
- **THEN** the record transition is explicit, its native identity and approved scope remain traceable, and no duplicate job is silently created

### Requirement: One-time recurring and goal-based tasks have distinct endings

The person SHALL be able to request work once, on a recurring cadence, or until a stated completion condition is verified. One-time work SHALL not repeat annually or become an unbounded recurrence. A recurring routine without an end condition SHALL remain configured until stopped, with no permanently unfinished plan; a successful one-time task SHALL close its finite goal.

#### Scenario: A task next Tuesday

- **WHEN** the person schedules one task for next Tuesday
- **THEN** its absolute due time and one-time behavior are preserved, and success leaves no future run

#### Scenario: A weekly review

- **WHEN** a weekly review succeeds with no terminal goal
- **THEN** its next run remains scheduled and its lightweight definition stays available without an unfinished OpenSpec goal

### Requirement: Fresh sessions read the agreed published instructions

Each run SHALL locate its exact published routine definition or finite goal plan and its approved scope, identify its own native job, and read available progress before acting. Missing records, mismatched bindings, revoked access, or an unapproved instruction revision SHALL block dependent actions. Disposable checkout paths SHALL not be the only way to reach instructions or their continuation.

#### Scenario: A fresh checkout

- **WHEN** a native scheduler starts a new session without the prior conversation
- **THEN** the session reads the published instructions for its record type and their continuation and can identify what to do

#### Scenario: The binding belongs to another job

- **WHEN** a run's native job does not match the published schedule binding
- **THEN** it performs no follow-up and reports the mismatch

### Requirement: Completion is checked before outreach

A goal-based run SHALL check the named authoritative completion source before contacting anyone. Confirmed completion SHALL prevent further goal actions and stop its owned execution items or native schedule triggers, without disabling a shared clock used by other work. Missing or ambiguous evidence SHALL not be treated as completion. A failed stop SHALL remain visible as cleanup pending while further outreach is suppressed.

#### Scenario: An invoice was paid

- **WHEN** the payment source confirms the scheduled invoice is fully paid before the next follow-up
- **THEN** no follow-up is sent, the schedule is stopped and verified, and its record can close

#### Scenario: The host refuses cancellation

- **WHEN** the goal is complete but cancellation fails
- **THEN** later runs perform no outreach and the report identifies the still-active trigger and pending cleanup

### Requirement: Adaptive wake-ups are capability-bound and scoped

An adaptive schedule SHALL let a future session choose and verify its next wake-up within the agreed timing, contact-hour, and expiry limits. It SHALL be activated only when that session can persist continuation, change timing, and stop the schedule. A fixed polling alternative SHALL be described as fixed and accepted separately when it changes the requested behavior.

#### Scenario: The person promises to pay Friday

- **WHEN** an authorized follow-up learns of a Friday payment promise and the schedule permits a later check
- **THEN** the next wake-up is adjusted within the agreed limits and its actual time is reported

#### Scenario: Management is unavailable in a cloud run

- **WHEN** a host can start future sessions but those sessions cannot adjust or stop their schedule
- **THEN** autonomous adaptation is not claimed or activated on that host

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
- **THEN** it preserves the wait without asking the same question again or inferring an answer

### Requirement: Scheduled authority is explicit and does not widen itself

Each schedule SHALL retain the user's agreed recipients, channels, action scope, contact limits, and escalation rules. Explicit authorization SHALL persist within those bounds; actions outside them SHALL wait for the user. A published routine definition or goal plan, external message, or scheduler trigger SHALL not by itself authorize calling, processing a payment, or publishing code.

#### Scenario: Authorized invoice reminders

- **WHEN** the user agrees to email one customer within a stated reminder policy until payment
- **THEN** future runs can send only reminders within that policy and stop when its completion condition is verified

#### Scenario: A customer asks for a refund

- **WHEN** an invoice follow-up receives a request to issue a refund
- **THEN** it seeks the user's authority and does not treat the customer's request as permission to pay

### Requirement: Registration and management report verified outcomes

`/schedule` SHALL list and manage owned records and native jobs, including pause, resume, run now, change, cancel, and recent results where the host supports them. Registration SHALL remain pending until the published record and verified native binding both exist. Failed or uncertain mutations SHALL be read back before retries and SHALL not be reported as successful. Live timing SHALL come from the host with an explicit unavailable or stale indication when it cannot be read.

#### Scenario: Creation succeeds but publication fails

- **WHEN** the native job exists but its approved repo record was not published
- **THEN** goal actions remain blocked, the partial state is identified, and retry does not create another indistinguishable job

#### Scenario: The host cannot be reached

- **WHEN** the user lists a repo-visible schedule while its host is unavailable
- **THEN** the record remains visible and live timing is reported as unavailable rather than invented

### Requirement: Existing schedules survive the update

Renaming the skill SHALL preserve existing cloud and host schedules, and SHALL provide an explicit path to inspect, pause, migrate, and remove legacy cloud scheduling resources. New installs SHALL not install the old runner. Migration SHALL prevent old and replacement jobs from performing the same follow-up, and teardown SHALL affect only the explicitly selected old resources.

#### Scenario: Updating an install with cloud jobs

- **WHEN** an install with an existing cloud routine updates to the schedule skill
- **THEN** that job continues to exist, legacy management remains available, and no new cloud runner is installed

#### Scenario: Moving one follow-up

- **WHEN** the person explicitly moves a legacy follow-up to a host scheduler
- **THEN** its original is paused before the replacement can act, and unrelated jobs and cloud resources are untouched
