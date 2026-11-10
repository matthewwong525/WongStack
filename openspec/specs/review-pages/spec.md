# review-pages Specification

## Purpose
Every review page, for a plan or any other work, follows one frame and shows each item as close to the real result as possible, so a person's go gives a known result.

## Requirements

### Requirement: Every review page follows one frame

Every review page, for a plan, a built preview, or work that is not code, SHALL show in this order: the ask in one line, the why, the things to review as numbered cards, what the build needs only when there is a list, the decisions only when there are some, and one bottom bar. The bar SHALL hold *Send notes* and only the buttons the page's link offers. A card's content SHALL change with the job; the frame, the notes, and OK and Change SHALL work the same on every page.

#### Scenario: An ads page and a plan page

- **WHEN** a person opens a review page of three ads and then a plan's review page
- **THEN** both show the ask, why, numbered cards with OK and Change, and the bottom bar in the same places, and the ads page shows no Decisions section when it has none

#### Scenario: A page with no decisions

- **WHEN** a page's source has no decisions
- **THEN** the page shows no Decisions section and no link to one

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

### Requirement: A website plan is built from its approved prototype

A plan that adds or changes a website this app does not run SHALL show it as a live card made while planning, at a phone and a computer width. Notes on the plan SHALL change that prototype. The build SHALL start from the prototype the person approved, and the check after it SHALL show the approved prototype beside the built page.

#### Scenario: A shop page

- **WHEN** a plan changes a shop's home page and the person taps *Build it*
- **THEN** the build uses the approved prototype's files, and the preview shows *Approved* beside *Built*

### Requirement: A person can send files from a review page

A file question SHALL take files by drop or by pick, within the page's limits on size, count, and type. Each sent file SHALL reach the computer of the chat that made the page, in a folder outside tracked files, and the chat SHALL get each file's question, name, and place. A file over the limits, or not what its name says, SHALL be refused on the page or on the computer, with the reason.

#### Scenario: A logo is sent

- **WHEN** the person drops `logo.png` on the *Logo* question and taps *Send notes*
- **THEN** the file is saved on the chat's computer, and the chat's message names the question and the saved file

#### Scenario: A file is too big

- **WHEN** the person picks a 40 MB file
- **THEN** the page says the file is too big and sends nothing for it

### Requirement: A plan says what its build needs

A plan's page SHALL list each key, login, file, or answer its build needs, each marked *Ready* or *Needs you*, or say that it needs nothing. An answer SHALL be asked in the chat before the page is built, so it is *Ready* on the page. A *Needs you* item SHALL hold a place to send its file, or a way to give it, such as a private key link. The page's build buttons SHALL stay off until each item is ready or given on the page, and SHALL say how many items still need the person.

#### Scenario: One answer missing

- **WHEN** a plan's logo is *Needs you* and the person has not given it
- **THEN** *Build it* reads *1 thing needs you* and starts nothing, and a tap on it shows the item

#### Scenario: A key is saved

- **WHEN** the person saves a needed key on its private link
- **THEN** the chat builds the page again with the key *Ready*, and the build buttons turn on once nothing else needs the person

### Requirement: A card with pictures leads with them

A card that holds pictures, drawings, ads, pages, or a live card SHALL show all of them at once, side by side and each labelled, with no tabs. On a screen 900 pixels or wider, they SHALL sit beside the card's words, as tall as the words but no shorter than about 420 pixels and no taller than the window, and each SHALL shrink whole to fit, never cut. On a narrower screen, they SHALL show small, in a row under the card's words. A whole page or a live card taller than its space SHALL show its top part with a sign that there is more. A click or tap on any of them SHALL open it full screen, with no separate *Full screen* button. Full screen SHALL show one at a time, with every label in a row to switch, *Close* alone at the top, and a swipe and the arrow keys to go to the next. *Phone* and *Computer*, only for a page or a live card, and *Try it* SHALL sit in a bar at the bottom, away from *Close*. A finished build's page SHALL show *Approved* and *Built*, or *Live now* and *Preview*, the same way.

#### Scenario: A screen card on a computer

- **WHEN** a person opens a plan at 1280 pixels wide whose card has *Before*, *After* and *After, Empty* pictures
- **THEN** the card shows the words on the left and the three pictures side by side on the right, each labelled, with no tabs; a click on *Before* opens it full screen, with the three labels in a row above it

#### Scenario: The same card on a phone

- **WHEN** the person opens the same plan at 390 pixels wide
- **THEN** the card shows its words, three small pictures named *Before*, *After* and *After, Empty*, then *OK* and *Note*, with no sideways scroll; a tap on *After* opens it full screen, and a swipe shows the next

#### Scenario: A tall phone picture beside short words

- **WHEN** a person opens a plan at 1280 by 800 pixels whose card has two lines of words and a phone picture 1600 pixels tall
- **THEN** the picture's space is about 420 pixels tall, the whole picture shows shrunk inside it, and a click shows the whole picture full screen, where + zooms it

#### Scenario: Long words on a computer

- **WHEN** a card's words are taller than the window at 1280 by 800 pixels
- **THEN** all the words show, and the pictures are as tall as the window, not the words

#### Scenario: A clickable sample as After

- **WHEN** a card holds a *Before* picture and a live card named *After*
- **THEN** the card shows the picture and the top of the sample side by side; a click on *After* opens the sample full screen, where it takes taps, and *Phone* and *Computer* sit at the bottom, away from *Close*

### Requirement: A card can show a whole designed page

A card SHALL be able to show a whole HTML page the chat made, such as an email, as readers will see it, with each version labelled and side by side when there are two or more. Full screen SHALL show the page at *Phone* and *Computer* width. The page SHALL run no script, SHALL load nothing from the web, and SHALL carry its pictures inside the review page. Its links SHALL look as they will but SHALL NOT open. A tap on a spot in the page full screen SHALL place a note that names the version and the spot. The build SHALL stop, naming the card and file, for a page with a script, a picture it can not carry, or a file outside the review's folder.

#### Scenario: An email with two versions

- **WHEN** a review page holds an email card with versions *A* and *B*
- **THEN** the card shows the top of both versions side by side, a click on *B* opens it full screen, and a tap on a spot in *B* sends a note that names *Version B* and the spot

#### Scenario: A page with a script

- **WHEN** a page in the card holds a `<script>`
- **THEN** the build stops with the card and file, and the last good page stays

### Requirement: Each card takes OK or a note

Each card SHALL offer *OK* and *Note*, and no other note button in its words. *OK* SHALL mark the card accepted and be undoable; *Note* SHALL open a note on that card, for a change or a question. Selected words and a spot on a picture SHALL still take their own notes. Every OK SHALL go to the chat with the notes, naming its card. An OK alone SHALL NOT start a build, a publish, or any other action.

#### Scenario: Two of three ads accepted

- **WHEN** the person taps OK on cards 1 and 3, writes a note on card 2 with *Note*, and taps *Send notes*
- **THEN** the chat gets `Card #1: OK`, `Card #3: OK` and the note on card 2, and does nothing else

#### Scenario: Only OKs

- **WHEN** the person taps OK on every card and sends nothing else
- **THEN** nothing starts until the person taps a button in the bar

### Requirement: A review page asks no questions

A review page SHALL be only for the final look: the person reads it, marks cards *OK*, adds notes if they want, and uses the bar's buttons. It SHALL hold no choice, typed answer, date, tick, or pick of a picture, on a plan, a built preview, or other work alike. A page source with a question in a card SHALL NOT be built, and the message SHALL say to ask it in the chat. Files and key links that a build needs SHALL stay, in *What the build needs*.

#### Scenario: A question in a card

- **WHEN** a page's source puts *Button words: Shop now or See the sale* in a card
- **THEN** the page is not built, and the message names the card and says to ask it in the chat

#### Scenario: A logo the build needs

- **WHEN** a plan's build needs the person's logo
- **THEN** the page shows *Your logo* in *What the build needs*, with a place to drop the file

### Requirement: A live card runs the chat's own page, sealed, to try

A card SHALL be able to hold a page the chat made, with its own layout, words, pictures, and script. The card SHALL show the page's top beside the card's other pictures; a click SHALL open it full screen, where the person SHALL be able to use it and switch it between a phone width and a computer width. A live card SHALL reach nothing outside itself: no internet, no other card, the page around it, or the app. It SHALL send nothing to the page's notes; the person notes it with the card's *Note*.

#### Scenario: A sample to try

- **WHEN** the person opens a live card full screen, taps *Add to cart*, and taps *Send notes*
- **THEN** the sample shows its own answer to the tap, and the chat gets only the notes the person wrote

#### Scenario: A live card tries the internet

- **WHEN** a live card's script tries to load a file from a web address or read the page around it
- **THEN** the request fails, and the page and its notes are unchanged
