## MODIFIED Requirements

### Requirement: Every ask offers structured choices

Every question a skill puts to the person SHALL offer two or three real options, the recommended one first and labelled `(Recommended)`, each with a short tradeoff, and SHALL keep the person's own answer open and use it as given. The one allowed fourth option is *Review the plan*, in a closing question after a plan changed. Where real options cannot be formed, such as a name only the person knows, the skill SHALL ask a free-text question instead of inventing options.

#### Scenario: A decision is needed

- **WHEN** a skill cannot continue without the person's choice
- **THEN** it asks with two or three options, the recommended one first, each with its tradeoff

#### Scenario: A custom answer

- **WHEN** the person answers in their own words instead of picking an option
- **THEN** the skill uses that answer as given, not the nearest option

### Requirement: Every reply that returns control ends with the next step

A reply that hands control back SHALL end with the decision that moves the work on, asked in the choice format through the question tool, with the report and any link written as chat text above it. A handoff the invocation already authorized SHALL continue instead of asking. The one reply that ends with no question is the answer to *Review the plan*.

#### Scenario: A stage finishes

- **WHEN** a skill finishes and a structured question tool is callable
- **THEN** the report is chat text, and the next steps are asked through the tool, recommended first

#### Scenario: The chain continues

- **WHEN** `/ship` moves from one of its stages to the next
- **THEN** it continues without a next-step question

### Requirement: A reply that makes or changes a plan prints its link

A reply that creates a plan, or changes what it says or its checklist, SHALL print *Click here to see the plan:* with the full link to the change's review page, as its own chat line above any closing question, never inside it. Record-keeping alone (status, branch, decision log) SHALL NOT count as a change. The closing question SHALL offer *Review the plan*; picking it SHALL end the next reply with the link line and no question, and SHALL start nothing. The link SHALL NOT add a stop.

#### Scenario: The person picks Review the plan

- **WHEN** a plan finishes and the person picks *Review the plan* in its closing question
- **THEN** the next reply ends with *Click here to see the plan:* and the full-path link, with no question box after it, and nothing is built

#### Scenario: Apply plans first

- **WHEN** `/apply` plans a change and goes on to build it
- **THEN** the reply prints the plan's link before the build continues

#### Scenario: A save that only records progress

- **WHEN** `/save` updates only the plan's status and decision log
- **THEN** its report prints no plan link and its question offers no *Review the plan*

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
