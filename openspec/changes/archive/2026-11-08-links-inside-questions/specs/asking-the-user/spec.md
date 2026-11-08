## MODIFIED Requirements

### Requirement: Every reply that returns control ends with the next step

A reply that hands control back SHALL end with the decision that moves the work on, asked in the choice format through the question tool, with the report and every link written as chat text above it. When the question asks the person to open, read, or act on a link, the question tool's question SHALL also hold that full link, so a host that hides text above the card still shows it. A link SHALL NOT appear inside the question tool's options, and SHALL NOT appear only in the agent's reasoning; an option may name a link shown above it. A handoff the invocation already authorized SHALL continue instead of asking. The only replies that end with no question are a finished plan's, which ends with its link and a line telling the person to review it, and the answers to *Review the plan* and *See the preview*.

#### Scenario: A stage finishes

- **WHEN** a skill finishes and a structured question tool is callable
- **THEN** the report is chat text, and the next steps are asked through the tool, recommended first

#### Scenario: The chain continues

- **WHEN** `/ship` moves from one of its stages to the next
- **THEN** it continues without a next-step question

#### Scenario: A link the person needs

- **WHEN** a reply gives the person a link, such as a pull request, a key link, or a live view, and ends with a question card that asks them to use it
- **THEN** the full link is a line of chat text above the card and is also in the card's question, and no option holds the address

### Requirement: A changed plan's reply carries its link

A reply that creates a plan, or changes what it says or its checklist, SHALL show the full link to the plan's review page as its own chat line near the top of the reply, so a chat that folds a long reply does not hide it. A closing question in that reply SHALL also hold the full link in its question text. When the plan is finished and waits on the person, the reply SHALL end with a line telling the person to review it, building or publishing from the page, and SHALL ask no question. When the page opens without build choices, that line SHALL say how to build or publish from the chat. Any other closing question in a reply that changed a plan SHALL offer to review the plan; choosing it SHALL show the link again and start nothing. Record-keeping alone (status, branch, decision log) SHALL NOT count as a change, and the link SHALL NOT add a stop.

A reply that ends on the review line, a finished plan's or the answer to *Review the plan*, SHALL print a readable copy of the plan below the link: its Why, its What Changes as numbered points, and its assumed decisions, with each picture the chat cannot show replaced by a line pointing to the page. The copy SHALL come from the same proposal as the page, so the two never differ. Other replies that show the plan's link SHALL NOT print the copy.

#### Scenario: A plan finishes

- **WHEN** `/plan` finishes and the plan waits on the person
- **THEN** the reply shows the plan's link first, then the plan's copy, then ends with a line to review it and build from its page, and no question card

#### Scenario: A plan built on the way

- **WHEN** `/apply` plans a change and goes on to build it
- **THEN** the reply shows the plan's link without the copy and the build continues without a stop

#### Scenario: A save that only records progress

- **WHEN** `/save` updates only the plan's status and decision log
- **THEN** its report prints no plan link and its question offers no review of the plan

#### Scenario: A changed plan ends on a question

- **WHEN** a reply changes a plan and ends with a question that offers *Review the plan*
- **THEN** the plan's full link is on its own chat line and also in the question's text

### Requirement: A preview link opens the page that changed

A reply that prints a preview link, or any other link the person should open, SHALL print it as its own chat line near the top of the reply, above any closing question, so a chat that folds a long reply does not hide it, and a closing question that asks about that page SHALL also hold the full link in its question text. A preview link SHALL be the full address of the page that shows the change, and the home page only when the change has no page of its own. That question SHALL offer to show the preview again; choosing it SHALL show the link and start, save, or publish nothing.

#### Scenario: A change to one page

- **WHEN** a build changes the settings page and uploads a preview
- **THEN** the preview link opens the settings page on the preview, not its home page, and the closing question shows that link and offers to show the preview again

#### Scenario: No preview was uploaded

- **WHEN** a build finishes but no preview was uploaded, because the app is untouched or the upload cannot run
- **THEN** its closing question offers no preview

#### Scenario: A long reply with a link

- **WHEN** a long report gives a link to a web page
- **THEN** the link sits right after the opening outcome line, before the details

## ADDED Requirements

### Requirement: A question missing its link is sent back once

In Claude Code, before a structured question goes out, an installed repo SHALL compare it with the current turn: each link written in the turn's chat text, and each *Click here to see …* link a tool printed in the turn, SHALL appear in the question's text. When one is missing, the question SHALL be sent back once, naming the missing links. A second try in the same turn SHALL go out as it is, and an unreadable turn SHALL let the question go out.

#### Scenario: The plan's link is left out

- **WHEN** the page builder printed the plan's link in the turn and the agent asks a question without it
- **THEN** the question is sent back once, naming the link, and the agent asks again with the link in the question

#### Scenario: The question already has the link

- **WHEN** the question's text holds every link of the turn, or the turn has no link
- **THEN** the question goes out untouched
