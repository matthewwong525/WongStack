## MODIFIED Requirements

### Requirement: A card shows the result as close to real as it can

A card SHALL show the result the go produces as close to the real thing as can be made: a screen as it will look, the ad as it will run, or the real words. Data the screen can not reach while planning, a sign-in, or another change that is not live yet SHALL NOT be a reason for a sketch: the plan SHALL show the screen with sample data. A card SHALL never show a screen as a sketch alone: a sketch SHALL be only of a part the system draws itself, such as the keyboard, beside the screen as it will look, with one plain line that names the part. The page builder SHALL stop, naming the card and keeping the last good page, when a card holds a screen sketch and no picture, page, or live card.

#### Scenario: No prototype can run

- **WHEN** a plan changes a screen of an app that can not run on this computer
- **THEN** the card shows the screen as a page in the app's own styles, fonts, and words, not a sketch

#### Scenario: The screen's data is not there

- **WHEN** a plan changes the Inbox and there are no chats to list
- **THEN** the card shows the Inbox with sample chats, not a sketch

#### Scenario: A part only the phone draws

- **WHEN** a plan changes a phone screen where the phone's own text menu opens
- **THEN** the card shows the app's own screen as it will look, and a sketch only of the phone's menu, with one line that names it

#### Scenario: A sketch alone

- **WHEN** a plan's card about a screen holds only a screen sketch, even with a line saying why there is no real picture
- **THEN** the builder stops, names the card, says to show the screen as it will look, and keeps the last good page

## REMOVED Requirements

### Requirement: A code plan shows its prototype

**Reason**: Running a copy of the app, online, on this computer, or by its screen test, took too long and was often skipped for a sketch. A page in the app's own look shows the screen as close to real with no app running.

**Migration**: see *A code plan shows its screens as pages*. A repo's own screen-test steps for plans are no longer read; a repo may keep them for its own tests.

## ADDED Requirements

### Requirement: A code plan shows its screens as pages

A plan that adds or changes a screen SHALL show it as HTML pages written while planning, in the app's own colors, fonts, corners, and words, with sample data: one *After* page per new or changed state the plan names, beside a *Before* page of the screen today written the same way. A screen the person needs to try SHALL be a page they can use on the review page. Making these pages SHALL run no copy of the app, SHALL change no database, and SHALL need no go from the person. A plan's notes SHALL update the pages with the plan, and the build SHALL make each screen match its approved page.

#### Scenario: A changed screen

- **WHEN** a plan changes the Inbox's list screen
- **THEN** its card shows *Before* and *After* pages in the app's look at phone width, one per state the plan names, and no copy of the app ran

#### Scenario: A note on a page

- **WHEN** the person sends *make the button bigger* on an *After* page
- **THEN** the chat updates the plan and the page, and the rebuilt review page shows the bigger button
