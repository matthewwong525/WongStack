# request-routing Specification

## Purpose

Let every WongStack repo act as an assistant: do plain requests directly, let a verb the person invokes serve any work, and run the full change loop for changing the repo's code or process, a new standalone page or tool included, with the same rules in every repo.

## Requirements

### Requirement: Plain requests are done directly

In every repo, the agent SHALL do a plain request (research, an errand, a reminder, a question) directly, with no verb and no question round. It SHALL ask only when it can not act without an answer. It SHALL start the change loop on its own only when a request changes the repo's code or process. A request for a new standalone page or small tool SHALL start the change loop too, and SHALL build it as a mini app, as `mini-apps` defines. When the person invokes a verb, the verb SHALL serve the work whatever its kind, as `work-verbs` defines. The rule SHALL live in the `WONG-STACK` block.

A code or process change the person asks for with no verb SHALL stop for the person twice. First, the agent SHALL run `/plan`, which ends with the review link and asks whether to build it now. On yes, it SHALL run `/apply`, which builds the change and returns a preview from the agent host. It SHALL then ask whether to publish the change. On yes, it SHALL run `/ship`. A verb the person invokes SHALL keep its own authorization: `/ship` still runs the whole chain, and `/apply` still plans and builds without a stop. The person SHALL NOT need to name a verb to move the work to its next stage.

#### Scenario: An errand

- **WHEN** the person asks for the opening hours of a shop
- **THEN** the agent finds them and answers, with no `/explore` round and no OpenSpec change

#### Scenario: A code change

- **WHEN** the person asks to change how the repo's app stores data
- **THEN** the agent runs the change loop, starting at `/explore`
- **AND** it stops at the plan's review page and asks whether to build it now

#### Scenario: The person says yes to both stops

- **WHEN** the person answers "build it now" and then "publish it" with no verb
- **THEN** the agent runs `/apply`, reports the host preview, and on the second yes runs `/ship`, which saves, waits for CI, and merges

#### Scenario: The person types /ship

- **WHEN** the person invokes `/ship add a sign-up page`
- **THEN** the chain runs to the merge with no stop at the plan or before the merge

#### Scenario: A mini app

- **WHEN** the person asks for a new page that tracks their runs
- **THEN** the agent runs the change loop, starting at `/explore`, and stops at the plan's review page and asks whether to build it now
- **AND** the plan builds the page under `mini-apps/apps/`

#### Scenario: A verb for non-code work

- **WHEN** the person invokes `/plan` for their week
- **THEN** the agent writes a to-do in the conversation and creates no OpenSpec change

### Requirement: No repo has a mode

No install record field, flag, or file SHALL change how a repo handles requests or writes its wiki. A home repo and a work repo SHALL follow the same rules. Home SHALL differ only in that the machine records it as the person's own repo.

#### Scenario: The same request in home and at work

- **WHEN** the same errand is asked in home and in a work repo
- **THEN** both handle it the same way

### Requirement: A task that will come back ends with a routine or mini-app offer

When the agent finishes a task it did by hand — a plain request, or non-code work under a verb — and there is a clear sign the task will come back, the reply's next-step question SHALL include one offer to make the next time easier. A clear sign SHALL be either the person saying the task recurs, or a memory fact showing the person asked for the same task before. The agent SHALL NOT offer on its own guess alone. To find a repeat or a past decline, the agent SHALL search memory once, on the task's key terms, only when a finished task could come back.

The offer SHALL be a routine when the task recurs on a schedule and needs judgment on each run, and a mini app when the person repeats fixed steps that code can do. It SHALL name the outcome the person gets, not the tool, and it SHALL sit inside the existing next-step question as one option beside stopping; it SHALL NOT add a question of its own. The agent SHALL NOT make the offer after a code change it built, in an unattended run, or for a routine when `paseo` is not installed.

When the person declines, the agent SHALL record the decline in memory, naming the task, and SHALL NOT offer again for that task. When the person accepts, a routine SHALL go through `/routine`'s own confirmation, and a mini app SHALL start the change loop and stop at the plan's review. The rule SHALL live in the `WONG-STACK` block.

#### Scenario: The person says it recurs

- **WHEN** the person asks for a summary of last week's support emails and says they need it every Monday
- **THEN** the agent does the task, and its next-step question includes an option to do it every Monday at a stated time, beside stopping

#### Scenario: Memory shows a repeated fixed task

- **WHEN** the person asks to split a restaurant bill, and a memory search finds they asked for the same calculation before
- **THEN** the next-step question includes an option to build a page that splits the bill for them

#### Scenario: A one-off task

- **WHEN** the person asks for a shop's opening hours, with no sign it recurs and no memory match
- **THEN** the reply makes no offer

#### Scenario: The person declines

- **WHEN** the person turns down an offer for a task
- **THEN** the agent records the decline in memory
- **AND** a later request for the same task gets no offer

#### Scenario: Nobody can answer

- **WHEN** a scheduled run finishes a task that recurs
- **THEN** it makes no offer

#### Scenario: Paseo is missing

- **WHEN** a task that needs judgment recurs weekly on a host without `paseo`
- **THEN** the agent does not offer a routine

#### Scenario: The person accepts a routine

- **WHEN** the person picks the routine offer
- **THEN** the agent runs `/routine`, which shows the schedule and asks to create it before anything is scheduled
