# Spec Delta

## MODIFIED Requirements

### Requirement: A reply that makes or changes a plan prints its link

A reply that creates a plan, or changes what it says or its checklist, SHALL print *Click here to see the plan:* with the full link to the change's review page, as its own chat line above any closing question, never inside it. The link SHALL be the page's reply link when one is open, else the page's file. Record-keeping alone (status, branch, decision log) SHALL NOT count as a change. The closing question SHALL offer *Review the plan*; picking it SHALL end the next reply with the link line and, after a blank line, *When you're ready, type `/apply` to build it.*, with no question, and SHALL start nothing. No other reply SHALL print that line: a closing question that offers to build is the one way on. The link SHALL NOT add a stop.

#### Scenario: The person picks Review the plan

- **WHEN** a plan finishes and the person picks *Review the plan* in its closing question
- **THEN** the next reply ends with *Click here to see the plan:*, the full link, a blank line, and *When you're ready, type `/apply` to build it.*, with no question box after it, and nothing is built

#### Scenario: Apply plans first

- **WHEN** `/apply` plans a change and goes on to build it
- **THEN** the reply prints the plan's link before the build continues, with no line telling the person to type `/apply`

#### Scenario: A save that only records progress

- **WHEN** `/save` updates only the plan's status and decision log
- **THEN** its report prints no plan link and its question offers no *Review the plan*

#### Scenario: A standalone plan finishes

- **WHEN** `/plan` finishes and its closing question offers *Build it now*
- **THEN** the reply prints the plan's link above the question and no line telling the person to type `/apply`

#### Scenario: No chat can be woken

- **WHEN** a plan finishes on a host that can not open a reply link
- **THEN** the link line carries the full path of the page's file
