# change-loop Specification

## Purpose

How a request becomes work in every WongStack repo: plain requests are done directly, a code or process change runs the verbs with two stops for the person, and an invoked verb also serves work that changes no repo file.

## Requirements

### Requirement: Plain requests are done directly

The agent SHALL do a plain request (research, an errand, a reminder, a question) directly, with no verb and no question round, asking only when it cannot act without an answer. A plain request that edited a repo file, such as a wiki note, SHALL end by asking whether to publish it, so no edit is left unsaved.

#### Scenario: An errand

- **WHEN** the person asks for a shop's opening hours
- **THEN** the agent answers, with no `/explore` round and no OpenSpec change

#### Scenario: A note to remember

- **WHEN** the person says "remember that invoices go out on the 1st" and the agent writes it to the wiki
- **THEN** the reply ends by asking whether to publish it, recommended first, and a yes runs `/ship`

### Requirement: A change asked with no verb stops twice

A code or process change asked for with no verb SHALL stop at the plan's review link to ask whether to build it now, and after `/apply`'s preview to ask whether to publish, running the next verb on yes. The question at the plan SHALL also offer to build and publish in one go, which runs `/ship` with no stop before the merge. A verb the person types SHALL keep its own reach.

#### Scenario: Yes to both stops

- **WHEN** the person asks to change how the app stores data, then says yes at both stops
- **THEN** the agent runs `/plan`, `/apply`, and `/ship` without the person naming a verb

#### Scenario: Build and publish at the plan

- **WHEN** the person picks *Build and publish* in the question under a finished plan
- **THEN** the agent runs `/ship`, which builds, checks, and merges with no stop at the preview

#### Scenario: The person types /ship

- **WHEN** the person invokes `/ship add a sign-up page`
- **THEN** the chain runs to the merge with no stop at the plan or before the merge

### Requirement: A new page or tool is a mini app

A request for a new standalone page or small tool SHALL run the change loop like any code change and SHALL be built as a mini app, as `mini-apps` defines.

#### Scenario: A running tracker

- **WHEN** the person asks for a new page that tracks their runs
- **THEN** the agent stops at the plan's review, and the plan builds the page as a mini app

### Requirement: No repo has a mode

No install field, flag, or file SHALL change how a repo handles requests or writes its wiki; a home repo and a work repo SHALL follow the same rules.

#### Scenario: The same request in two repos

- **WHEN** the same errand is asked in home and in a work repo
- **THEN** both handle it the same way

### Requirement: A task that will come back gets one offer

When a task done by hand will clearly come back (the person says it recurs, or memory shows they asked before), the next-step question SHALL include one option for a routine or a mini app, named by its outcome. The agent SHALL NOT offer on a guess, after a code change it built, in an unattended run, for a routine without `paseo`, or after a decline for that task.

#### Scenario: The person says it recurs

- **WHEN** the person asks for a support email summary and says they need it every Monday
- **THEN** the next-step question includes doing it every Monday, beside stopping

#### Scenario: The person declines

- **WHEN** the person turns down the offer
- **THEN** the decline is recorded in memory and a later request for the same task gets no offer

### Requirement: An invoked verb serves work that changes no repo file

When the person invokes `/explore`, `/plan`, `/apply`, `/save`, or `/continue` for work that changes no repo file, the verb SHALL run in its non-code form and SHALL NOT create an OpenSpec change, branch, commit, or review page. The work, not a setting, SHALL decide the form.

#### Scenario: Plan an errand

- **WHEN** the person invokes `/plan` to compare suppliers and email the chosen one
- **THEN** the agent writes a numbered to-do in the conversation that marks the sending step as outward

### Requirement: Each outward action is confirmed

For work that changes no repo file, `/apply` SHALL show exactly what each outward step will do (a message, a post, a changed record, a payment, a deletion) and ask first, one confirmation per action unless the person asked for a batch. Reading, searching, and drafting SHALL need no prompt.

#### Scenario: Send an email

- **WHEN** `/apply` reaches a step that sends an email
- **THEN** it shows the recipient and full text and asks before it sends
- **AND** a declined step is skipped and reported

### Requirement: Non-code progress is kept as a thread

For work that changes no repo file, `/save` SHALL record what is done, what is next, and any blocker as a memory thread with no git change, and `/continue` SHALL offer open threads beside active changes and resume the chosen one. `/ship` SHALL act only on repo changes.

#### Scenario: Stop halfway and resume

- **WHEN** the person runs `/save` after two of four steps, then `/continue` in a new session
- **THEN** no git change is made, and the agent recaps the thread and continues from the third step

#### Scenario: Ship an errand

- **WHEN** the person invokes `/ship` after an errand
- **THEN** `/ship` says the work finishes in `/apply` and makes no git change

### Requirement: Planning prefers code for repeated processes

When the work is a process that will run again, planning SHALL weigh deterministic code against a recurring AI-run step, by the principle the knowledge center states.

#### Scenario: A repeated report

- **WHEN** a plan covers a task that will run every week
- **THEN** the plan considers a script before a recurring AI step
