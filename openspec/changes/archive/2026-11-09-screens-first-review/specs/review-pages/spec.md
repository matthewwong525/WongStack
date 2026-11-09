## ADDED Requirements

### Requirement: A card with pictures leads with them

A card that holds pictures or drawings SHALL show them in one view with a tab for each picture or drawing, named by its label. On a screen 900 pixels or wider, the view SHALL sit beside the card's words and take the larger part of the width; on a narrower screen, the view SHALL come before the words. When a card has both a *Before* and an *After* tab, the view SHALL offer a control that shows the two side by side. Full screen, zoom, spot notes, *Try it*, and OK and Change SHALL work from any tab. A finished build's page SHALL show *Approved* and *Built*, or *Live now* and *Preview*, as tabs the same way.

#### Scenario: A screen card on a computer

- **WHEN** a person opens a plan at 1280 pixels wide whose card has *Before*, *After* and *After, Empty* pictures
- **THEN** the card shows the words on the left and the *After* picture large on the right, with three tabs above it, and a tap on *Before* shows that picture in its place

#### Scenario: The same card on a phone

- **WHEN** the person opens the same plan at 390 pixels wide
- **THEN** the card shows the tabs and picture first and the words below them, with no sideways scroll on the page

### Requirement: A card can show a whole designed page

A card SHALL be able to show a whole HTML page the chat made, such as an email, as readers will see it, with a tab per version and an *All* tab that shows the versions side by side when there are two or more. The page SHALL show at *Phone* and *Computer* width, SHALL run no script, SHALL load nothing from the web, and SHALL carry its pictures inside the review page. Its links SHALL look as they will but SHALL NOT open. A tap on a spot in the page SHALL place a note that names the version and the spot. The build SHALL stop, naming the card and file, for a page with a script, a picture it can not carry, or a file outside the review's folder.

#### Scenario: An email with two versions

- **WHEN** a review page holds an email card with versions *A* and *B*
- **THEN** the card shows version *A* as readers will see it, a tap on *B* shows the other, and a tap on a spot in *B* sends a note that names *Version B* and the spot

#### Scenario: A page with a script

- **WHEN** a page in the card holds a `<script>`
- **THEN** the build stops with the card and file, and the last good page stays

### Requirement: Each ad gets a tab

A card with two or more ads SHALL show each ad in its own tab, named by its placement or its label, and an *All* tab that shows them side by side.

#### Scenario: A feed and a story ad

- **WHEN** a card holds a feed ad and a story ad
- **THEN** the card shows *Feed* first, a *Story* tab, and an *All* tab with both ads side by side

### Requirement: A question can ask to pick a picture

A card's questions SHALL be able to ask the person to pick one picture from several in the review's folder, shown as small pictures, and SHALL send the chosen file's name with the notes. On a screen 900 pixels or wider, a card's questions SHALL sit with its words, beside its view.

#### Scenario: Pick the top picture

- **WHEN** the person taps the second of three pictures under *Top picture* and sends notes
- **THEN** the chat gets the card's answer with the second picture's file name

## MODIFIED Requirements

### Requirement: A card shows the result as close to real as it can

A card SHALL show the result the go produces as close to the real thing as can be made: a picture of the real screen, the ad as it will run, or the real words. Data the screen can not reach while planning SHALL NOT be a reason for a sketch: the plan SHALL show the screen with sample data instead. A card SHALL use a sketch for a screen only when no copy of the app can run, online or on this computer, with one plain line that names the step that failed. The page builder SHALL warn, and still build, when a card holds a screen sketch with no real picture and no such line.

#### Scenario: No prototype can run

- **WHEN** a plan changes a screen and its prototype can't be made on this computer
- **THEN** the card shows the sketch with one line saying why there is no real picture

#### Scenario: The screen's data is not there

- **WHEN** a plan changes the Inbox and the prototype has no chats to list
- **THEN** the card shows a real picture of the Inbox with sample chats, not a sketch

### Requirement: A code plan shows its prototype

A plan that adds or changes a screen SHALL show a picture of each new or changed state from a prototype made while planning, using sample data, beside a picture of the screen today when the person can open it, with a link to try the prototype when it is online. When the prototype can not go online, the pictures SHALL come from the prototype run on this computer, with no *Try it* link. The prototype SHALL never be saved in the repository, SHALL change no database, and SHALL need no go from the person. A plan's notes SHALL update the prototype and its pictures with the plan.

#### Scenario: A changed screen

- **WHEN** a plan changes the Inbox's list screen and a preview can be made on this computer
- **THEN** its card shows *Before* and *After* pictures at phone width, one per state the plan names, and a *Try it* link, and the branch holds no prototype code

#### Scenario: A note on the prototype

- **WHEN** the person sends *make the button bigger* on an *After* picture
- **THEN** the chat updates the plan and the prototype, and the rebuilt page shows the new picture

#### Scenario: The prototype can't go online

- **WHEN** a plan changes a screen on a computer with no preview login
- **THEN** its card shows *After* pictures taken from the prototype running on this computer, and no *Try it* link
