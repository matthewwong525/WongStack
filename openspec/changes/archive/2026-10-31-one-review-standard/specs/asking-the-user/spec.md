## MODIFIED Requirements

### Requirement: A changed plan's reply carries its link

A reply that creates a plan, or changes what it says or its checklist, SHALL show the full link to the plan's review page as its own chat line near the top of the reply, never inside a question, so a chat that folds a long reply does not hide it. When the plan is finished and waits on the person, the reply SHALL end with a line telling the person to review it, building or publishing from the page, and SHALL ask no question. When the page opens without build choices, that line SHALL say how to build or publish from the chat. Any other closing question in a reply that changed a plan SHALL offer to review the plan; choosing it SHALL show the link again and start nothing. Record-keeping alone (status, branch, decision log) SHALL NOT count as a change, and the link SHALL NOT add a stop.

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

### Requirement: A preview link opens the page that changed

A reply that prints a preview link, or any other link the person should open, SHALL print it as its own chat line near the top of the reply, above any closing question and never inside it, so a chat that folds a long reply does not hide it. A preview link SHALL be the full address of the page that shows the change, and the home page only when the change has no page of its own. That question SHALL offer to show the preview again; choosing it SHALL show the link and start, save, or publish nothing.

#### Scenario: A change to one page

- **WHEN** a build changes the settings page and uploads a preview
- **THEN** the preview link opens the settings page on the preview, not its home page, and the closing question offers to show the preview again

#### Scenario: No preview was uploaded

- **WHEN** a build finishes but no preview was uploaded, because the app is untouched or the upload cannot run
- **THEN** its closing question offers no preview

#### Scenario: A long reply with a link

- **WHEN** a long report gives a link to a web page
- **THEN** the link sits right after the opening outcome line, before the details
