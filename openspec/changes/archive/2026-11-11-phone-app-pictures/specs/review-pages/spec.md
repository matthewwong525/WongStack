## MODIFIED Requirements

### Requirement: A card shows the result as close to real as it can

A card SHALL show the result the go produces as close to the real thing as can be made: a picture of the real screen, the ad as it will run, or the real words. Data the screen can not reach while planning SHALL NOT be a reason for a sketch: the plan SHALL show the screen with sample data instead. An app the preview can not serve, such as a phone or desktop app, SHALL NOT be a reason for a sketch either: the plan SHALL draw it with the app's own screen test. A card SHALL use a sketch for a screen, or for a part of one, only when neither a running copy of the app nor a screen test can draw it, with one plain line that names the step or the part. The page builder SHALL warn, and still build, when a card holds a screen sketch with no real picture and no such line.

#### Scenario: No prototype can run

- **WHEN** a plan changes a screen and neither its prototype nor a screen test can draw it on this computer
- **THEN** the card shows the sketch with one line saying why there is no real picture

#### Scenario: The screen's data is not there

- **WHEN** a plan changes the Inbox and the prototype has no chats to list
- **THEN** the card shows a real picture of the Inbox with sample chats, not a sketch

#### Scenario: A part only the phone draws

- **WHEN** a plan changes a phone screen where the phone's own text menu opens
- **THEN** the card shows real pictures of the app's own screen, and a sketch only of the phone's menu, with one line that names it

### Requirement: A code plan shows its prototype

A plan that adds or changes a screen SHALL show a picture of each new or changed state from a prototype made while planning, using sample data, beside a picture of the screen today when the person can open it, with a link to try the prototype when it is online. When the prototype can not go online, the pictures SHALL come from the prototype run on this computer, with no *Try it* link. When the preview can not serve the app at all, such as a phone or desktop app, both pictures SHALL come from the app's own screen test: *Before* from the copy as it is, *After* from the copy with the plan's edits. A repo SHALL keep its screen-test steps on its own page for that app, and the first plan that needs them SHALL write that page. The prototype SHALL never be saved in the repository, SHALL change no database, and SHALL need no go from the person. A plan's notes SHALL update the prototype and its pictures with the plan.

#### Scenario: A changed screen

- **WHEN** a plan changes the Inbox's list screen and a preview can be made on this computer
- **THEN** its card shows *Before* and *After* pictures at phone width, one per state the plan names, and a *Try it* link, and the branch holds no prototype code

#### Scenario: A note on the prototype

- **WHEN** the person sends *make the button bigger* on an *After* picture
- **THEN** the chat updates the plan and the prototype, and the rebuilt page shows the new picture

#### Scenario: The prototype can't go online

- **WHEN** a plan changes a screen on a computer with no preview login
- **THEN** its card shows *After* pictures taken from the prototype running on this computer, and no *Try it* link

#### Scenario: A phone app's screen

- **WHEN** a plan changes a screen of a repo's phone app, which the preview can not serve
- **THEN** its card shows *Before* and *After* pictures drawn by the app's screen test with sample data, no sketch, and no *Try it* link
