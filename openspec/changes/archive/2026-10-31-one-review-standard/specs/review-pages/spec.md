## ADDED Requirements

### Requirement: Every review page follows one frame

Every review page, for a plan, a built preview, or work that is not code, SHALL show in this order: the ask in one line, the why, the things to review as numbered cards, the decisions only when there are some, and one bottom bar. The bar SHALL hold *Send notes* and only the buttons the page's link offers. A card's content SHALL change with the job; the frame, the notes, and OK and Change SHALL work the same on every page.

#### Scenario: An ads page and a plan page

- **WHEN** a person opens a review page of three ads and then a plan's review page
- **THEN** both show the ask, why, numbered cards with OK and Change, and the bottom bar in the same places, and the ads page shows no Decisions section when it has none

#### Scenario: A page with no decisions

- **WHEN** a page's source has no decisions
- **THEN** the page shows no Decisions section and no link to one

### Requirement: A card shows the result as close to real as it can

A card SHALL show the result the go produces as close to the real thing as can be made: a picture of the real screen, the ad as it will run, or the real words. A card SHALL use a sketch for a screen only when no real picture can be made, with one plain line saying why.

#### Scenario: No prototype can run

- **WHEN** a plan changes a screen and its prototype can't be made on this computer
- **THEN** the card shows the sketch with one line saying why there is no real picture

### Requirement: A code plan shows its prototype

A plan that adds or changes a screen SHALL show a picture of each new or changed state from a prototype made while planning, using sample data, beside a picture of the screen today when the person can open it, with a link to try the prototype. The prototype SHALL never be saved in the repository, SHALL change no database, and SHALL need no go from the person. A plan's notes SHALL update the prototype and its pictures with the plan.

#### Scenario: A changed screen

- **WHEN** a plan changes the Inbox's list screen and a preview can be made on this computer
- **THEN** its card shows *Before* and *After* pictures at phone width, one per state the plan names, and a *Try it* link, and the branch holds no prototype code

#### Scenario: A note on the prototype

- **WHEN** the person sends *make the button bigger* on an *After* picture
- **THEN** the chat updates the plan and the prototype, and the rebuilt page shows the new picture

### Requirement: Each card takes OK or Change

Each card SHALL offer *OK* and *Change*. *OK* SHALL mark the card accepted and be undoable; *Change* SHALL open a note on that card. Every OK SHALL go to the chat with the notes, naming its card. An OK alone SHALL NOT start a build, a publish, or any other action.

#### Scenario: Two of three ads accepted

- **WHEN** the person taps OK on cards 1 and 3, writes a Change note on card 2, and taps *Send notes*
- **THEN** the chat gets `Card #1: OK`, `Card #3: OK` and the note on card 2, and does nothing else

#### Scenario: Only OKs

- **WHEN** the person taps OK on every card and sends nothing else
- **THEN** nothing starts until the person taps a button in the bar

### Requirement: Work that is not a plan gets a review page

An agent SHALL be able to make a review page for work that changes no repo file, with its own ask, cards, and up to six buttons, each with its own label and its own message to the chat. The page SHALL open in the person's Inbox like a plan, and through a reply link otherwise. A button the agent marks as one that can't be undone SHALL ask once more on the page. The page SHALL stay outside tracked files.

#### Scenario: Approve ads from the Inbox

- **WHEN** an agent makes a page of three ads with an *Approve* button and the person taps it
- **THEN** the chat gets the approve message with any unsent notes and OKs, and the page leaves the Inbox

#### Scenario: A button that can't be undone

- **WHEN** the person taps a button the agent marked as one that can't be undone, such as *Launch*
- **THEN** the page asks once more before it sends anything

### Requirement: An ad card shows the ad as it runs

An ad card SHALL show each ad in its placement's frame, a feed post or a story, with the account name, the picture, the words, the headline, and the button text, sized to the placement. Several ads SHALL sit side by side where they fit, else one above the other. An ad's picture SHALL follow the page's picture rules: a file in the page's folder, inside the size limits, with no web address.

#### Scenario: A feed ad and a story ad

- **WHEN** a page holds one feed ad and one story ad on a phone
- **THEN** each shows in its own frame shape with its words and button, one above the other

#### Scenario: A picture from the web

- **WHEN** an ad names a picture by web address
- **THEN** the page is not built, and the message names the card and line
