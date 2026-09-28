## MODIFIED Requirements

### Requirement: Every ask offers structured choices

Every question a skill puts to the person SHALL offer two or three real options, the recommended one first and labelled `(Recommended)`, each with a short tradeoff, and SHALL keep the person's own answer open and use it as given. The allowed fourth options are *Review the plan*, in a closing question after a plan changed, and *See the preview*, in a closing question below a preview link. Where real options cannot be formed, such as a name only the person knows, the skill SHALL ask a free-text question instead of inventing options.

#### Scenario: A decision is needed

- **WHEN** a skill cannot continue without the person's choice
- **THEN** it asks with two or three options, the recommended one first, each with its tradeoff

#### Scenario: A custom answer

- **WHEN** the person answers in their own words instead of picking an option
- **THEN** the skill uses that answer as given, not the nearest option

### Requirement: Every reply that returns control ends with the next step

A reply that hands control back SHALL end with the decision that moves the work on, asked in the choice format through the question tool, with the report and any link written as chat text above it. A handoff the invocation already authorized SHALL continue instead of asking. The only replies that end with no question are the answers to *Review the plan* and *See the preview*.

#### Scenario: A stage finishes

- **WHEN** a skill finishes and a structured question tool is callable
- **THEN** the report is chat text, and the next steps are asked through the tool, recommended first

#### Scenario: The chain continues

- **WHEN** `/ship` moves from one of its stages to the next
- **THEN** it continues without a next-step question

### Requirement: A reply that makes or changes a plan prints its link

A reply that creates a plan, or changes what it says or its checklist, SHALL print *Click here to see the plan:* with the full link to the change's review page, as its own chat line above any closing question, never inside it. Record-keeping alone (status, branch, decision log) SHALL NOT count as a change. When the plan waits for the person, the line under the link, after a blank line, SHALL say *When you're ready, type `/apply` to build it.*; when the build goes on in the same run, or the plan has shipped, that line SHALL NOT appear. The closing question SHALL offer *Review the plan*; picking it SHALL end the next reply with the link line and its next-step line and no question, and SHALL start nothing. The link SHALL NOT add a stop.

#### Scenario: The person picks Review the plan

- **WHEN** a plan finishes and the person picks *Review the plan* in its closing question
- **THEN** the next reply ends with *Click here to see the plan:*, the full-path link, a blank line, and *When you're ready, type `/apply` to build it.*, with no question box after it, and nothing is built

#### Scenario: Apply plans first

- **WHEN** `/apply` plans a change and goes on to build it
- **THEN** the reply prints the plan's link before the build continues, with no line telling the person to type `/apply`

#### Scenario: A save that only records progress

- **WHEN** `/save` updates only the plan's status and decision log
- **THEN** its report prints no plan link and its question offers no *Review the plan*

## ADDED Requirements

### Requirement: A reply that prints a preview link offers to show it again

A reply that prints a preview link SHALL print it as *Click here to see the preview:* with the full URL of the page that shows the change, such as a mini app's `/apps/<name>/` page, and the home page only when the change has no page of its own, as its own chat line above any closing question, never inside it. That closing question SHALL offer *See the preview*; picking it SHALL end the next reply with the same link lines and no question, and SHALL start, save, or publish nothing.

#### Scenario: The person picks See the preview

- **WHEN** a build finishes with a preview and the person picks *See the preview* in its closing question
- **THEN** the next reply ends with *Click here to see the preview:* and the full URL, with no question box after it, and nothing is saved or published

#### Scenario: A change to one page

- **WHEN** a build changes the settings page and uploads a preview
- **THEN** the preview link opens the settings page on the preview, not its home page

#### Scenario: No preview was uploaded

- **WHEN** a build finishes but no preview was uploaded, because the app is untouched or the upload cannot run
- **THEN** its closing question offers no *See the preview*
