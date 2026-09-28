# asking-the-user Specification

## Purpose

How WongStack asks and writes to a person: one choice format through the best question tool, clarification bounded before planning, a next step ending every reply, all in plain words, with detail when the person asks.

## Requirements

### Requirement: Every ask offers structured choices

Every question a skill puts to the person SHALL offer two or three real options, the recommended one first and labelled `(Recommended)`, each with a short tradeoff, and SHALL keep the person's own answer open and use it as given. The one allowed fourth option is *Review the plan*, in a closing question after a plan changed. Where real options cannot be formed, such as a name only the person knows, the skill SHALL ask a free-text question instead of inventing options.

#### Scenario: A decision is needed

- **WHEN** a skill cannot continue without the person's choice
- **THEN** it asks with two or three options, the recommended one first, each with its tradeoff

#### Scenario: A custom answer

- **WHEN** the person answers in their own words instead of picking an option
- **THEN** the skill uses that answer as given, not the nearest option

### Requirement: Confirmations, offers, and menus are asks

A confirmation, an offer, a selection menu, and a blocked-state fork SHALL use the same choice format; a confirmation SHALL name what happens on each side, and a menu SHALL show the detail needed to choose. A skill SHALL NOT resolve several candidates by a guess.

#### Scenario: Several candidates remain

- **WHEN** a skill cannot tell which change, account, or branch the person means
- **THEN** it lists the candidates with their identifying detail and waits

### Requirement: The format never adds a question

The ask format SHALL decide how a question looks, not whether one is needed. An action the person's invocation already authorized SHALL be taken and reported without a prompt.

#### Scenario: An authorized action

- **WHEN** an action falls inside the run the person invoked, such as `/ship`'s merge
- **THEN** the skill takes it and reports it without asking

### Requirement: The best available question tool carries the ask

A skill SHALL ask through the first callable structured question tool (Codex `request_user_input`, Claude `AskUserQuestion`, or a host equivalent) within its capacity, else as numbered chat, and SHALL wait for the answer; elapsed time and a preselected option SHALL NOT count as one. Only where nobody can answer SHALL it take the recommended options, labelled assumed, and continue.

#### Scenario: Only chat is available

- **WHEN** no structured question tool is usable and the person can answer in chat
- **THEN** the skill writes the numbered questions with options and waits

#### Scenario: Nobody can answer

- **WHEN** the session is unattended
- **THEN** the skill uses the recommended options without waiting and labels them assumed

### Requirement: Codex can ask in Default mode

An installed repo SHALL let Codex ask structured questions in its Default mode through project configuration, without changing the person's global Codex settings.

#### Scenario: A trusted checkout

- **WHEN** Codex starts a Default-mode session in a trusted WongStack checkout
- **THEN** `request_user_input` is callable and the global Codex configuration is unchanged

### Requirement: Every reply that returns control ends with the next step

A reply that hands control back SHALL end with the decision that moves the work on, asked in the choice format through the question tool, with the report and any link written as chat text above it. A handoff the invocation already authorized SHALL continue instead of asking. The one reply that ends with no question is the answer to *Review the plan*.

#### Scenario: A stage finishes

- **WHEN** a skill finishes and a structured question tool is callable
- **THEN** the report is chat text, and the next steps are asked through the tool, recommended first

#### Scenario: The chain continues

- **WHEN** `/ship` moves from one of its stages to the next
- **THEN** it continues without a next-step question

### Requirement: A reply that makes or changes a plan prints its link

A reply that creates a plan, or changes what it says or its checklist, SHALL print *Click here to see the plan:* with the full link to the change's review page, as its own chat line above any closing question, never inside it. Record-keeping alone (status, branch, decision log) SHALL NOT count as a change. When the plan waits for the person, the line right under the link SHALL say *When you're ready, type `/apply` to build it.*; when the build goes on in the same run, or the plan has shipped, that line SHALL NOT appear. The closing question SHALL offer *Review the plan*; picking it SHALL end the next reply with the link line and its next-step line and no question, and SHALL start nothing. The link SHALL NOT add a stop.

#### Scenario: The person picks Review the plan

- **WHEN** a plan finishes and the person picks *Review the plan* in its closing question
- **THEN** the next reply ends with *Click here to see the plan:*, the full-path link, and *When you're ready, type `/apply` to build it.*, with no question box after it, and nothing is built

#### Scenario: Apply plans first

- **WHEN** `/apply` plans a change and goes on to build it
- **THEN** the reply prints the plan's link before the build continues, with no line telling the person to type `/apply`

#### Scenario: A save that only records progress

- **WHEN** `/save` updates only the plan's status and decision log
- **THEN** its report prints no plan link and its question offers no *Review the plan*

### Requirement: Plans, asks, and reports use plain words

For every reader, a plan's Why and What Changes, every ask, and every report SHALL name what the person will see, get, lose, or risk, with no file path, identifier, command, or engineering term unless the person used it first or asked for that detail. A skill SHALL try a fix within its own rules before asking, and SHALL NOT offer a choice that needs judgment the person lacks.

#### Scenario: A migration question

- **WHEN** `/explore` must ask about changing stored data
- **THEN** it asks what should happen to the accounts that exist today, not how to migrate the schema

#### Scenario: The person names the mechanism

- **WHEN** a person asks to move the app's data into a new `accounts` table
- **THEN** the plan may name the `accounts` table, because the person used the term first

### Requirement: Reports give the outcome and one link

A reply that returns control SHALL open with the outcome in plain words and, when the person invoked the verb, give at most one link and leave out branch names, commit ids, gate lines, and fact counts unless the person asks, for that reply or as a standing preference on their person page. The plan's link line SHALL NOT count toward that one link. The agent SHALL NOT infer a wish for detail from one message. A verb running inside another SHALL still print the lines its caller reads.

#### Scenario: Details from now on

- **WHEN** a person says "always show me the branch and commit"
- **THEN** the next wiki save records that preference on their person page, and later reports include those lines after the outcome

#### Scenario: A save inside a publish

- **WHEN** `/save` runs inside `/ship`
- **THEN** it still prints its gate result for `/ship` to read

### Requirement: Explore always runs before a plan

`/plan` SHALL run a bounded `/explore` pass first, however planning was reached, and SHALL record every answer in the Decision log marked asked or assumed, asking nothing of its own. Notes pasted from a plan's review page SHALL update that plan with no explore pass, because the plan already holds its answers.

#### Scenario: Plan through apply

- **WHEN** `/apply` invokes `/plan` for unexplored work
- **THEN** the bounded explore pass runs before any artifact is drafted

#### Scenario: Notes from the review page

- **WHEN** the person pastes notes copied from a plan's review page
- **THEN** `/plan` updates that plan without an explore pass or a question round

### Requirement: Standalone explore asks in small groups

Standalone `/explore` SHALL ask material questions in small groups of related questions that can be answered together, SHALL wait for answers before asking what depends on them, and MAY ask several groups as the thinking develops. It SHALL write no file. When the thinking is done, it SHALL end with a next-step question whose recommended option is to plan it, and SHALL NOT start `/plan` without that answer.

#### Scenario: One answer shapes the next question

- **WHEN** a later question depends on an earlier answer
- **THEN** `/explore` asks it only after that answer arrives

#### Scenario: The thinking is done

- **WHEN** a person who typed `/explore` has answered its last round
- **THEN** it summarizes and asks whether to plan it, keep thinking, or stop, and drafts nothing until they choose

### Requirement: Explore checks memory before asking

Before its first question, `/explore` SHALL search the memory store once for the work, and SHALL NOT ask what a live fact already answers; it SHALL state that fact with its age and author as an assumption the person can correct. An unreachable store SHALL be reported in one line.

#### Scenario: A known preference

- **WHEN** memory holds a live fact that the person wants one pull request for refactors
- **THEN** `/explore` does not ask how to split the work, and names that fact as the reason

### Requirement: Questions before planning continue while a choice is open

At the move into planning, however planning was invoked, `/explore` SHALL ask only the choices a wrong guess would make the plan wrong, not merely different, as structured multiple-choice asks of no more questions than the tool holds per group. When the answers open another such choice, it SHALL ask a follow-up group rather than assume it, and SHALL stop asking once none is open. A choice already settled SHALL NOT be asked again, nested calls included, and a minor gap SHALL become a recorded assumption with its reason.

#### Scenario: Everything is settled

- **WHEN** the conversation already answered every material choice
- **THEN** `/explore` asks nothing and moves to its summary

#### Scenario: An answer opens a new choice

- **WHEN** the first group's answers reveal another choice that would make the plan wrong if guessed
- **THEN** `/explore` asks a follow-up multiple-choice group before the plan is drafted
