## MODIFIED Requirements

### Requirement: A reply that makes or changes a plan prints its link

A reply that creates a plan, or changes what it says or its checklist, SHALL print *Click here to see the plan:* with the full link to the change's review page, as its own chat line above any closing question, never inside it. Record-keeping alone (status, branch, decision log) SHALL NOT count as a change. The closing question SHALL offer *Review the plan*; picking it SHALL end the next reply with the link line and, after a blank line, *When you're ready, type `/apply` to build it.*, with no question, and SHALL start nothing. No other reply SHALL print that line: a closing question that offers to build is the one way on. The link SHALL NOT add a stop.

#### Scenario: The person picks Review the plan

- **WHEN** a plan finishes and the person picks *Review the plan* in its closing question
- **THEN** the next reply ends with *Click here to see the plan:*, the full-path link, a blank line, and *When you're ready, type `/apply` to build it.*, with no question box after it, and nothing is built

#### Scenario: Apply plans first

- **WHEN** `/apply` plans a change and goes on to build it
- **THEN** the reply prints the plan's link before the build continues, with no line telling the person to type `/apply`

#### Scenario: A save that only records progress

- **WHEN** `/save` updates only the plan's status and decision log
- **THEN** its report prints no plan link and its question offers no *Review the plan*

#### Scenario: A standalone plan finishes

- **WHEN** `/plan` finishes and its closing question offers *Build it now*
- **THEN** the reply prints the plan's link above the question and no line telling the person to type `/apply`

### Requirement: Plans, asks, and reports use plain words

For every reader, a plan's Why and What Changes, every ask, and every report SHALL name what the person will see, get, lose, or risk, with no file path, identifier, command, or engineering term unless the person used it first or asked for that detail. Messages SHALL be short, in the voice `wiki/voice.md` owns: the point first, a few lines, and more only when asked. Git, OpenSpec, or CI SHALL be named only when the person asks or must act; code, commands, identifiers, and quotations SHALL stay exact. A skill SHALL try a fix within its own rules before asking, and SHALL NOT offer a choice that needs judgment the person lacks.

#### Scenario: A migration question

- **WHEN** `/explore` must ask about changing stored data
- **THEN** it asks what should happen to the accounts that exist today, not how to migrate the schema

#### Scenario: The person names the mechanism

- **WHEN** a person asks to move the app's data into a new `accounts` table
- **THEN** the plan may name the `accounts` table, because the person used the term first
