## REMOVED Requirements

### Requirement: Each card takes OK or Change

**Reason**: *Change* and a card's *+ Note* opened the same note; one *Note* button replaces both.
**Migration**: See "Each card takes OK or a note".

### Requirement: Each ad gets a tab

**Reason**: A card has no tabs: its ads sit side by side, each labelled, and a click opens one full screen.
**Migration**: See "A card with pictures leads with them" and "An ad card shows the ad as it runs".

## ADDED Requirements

### Requirement: Each card takes OK or a note

Each card SHALL offer *OK* and *Note*, and no other note button in its words. *OK* SHALL mark the card accepted and be undoable; *Note* SHALL open a note on that card, for a change or a question. Selected words and a spot on a picture SHALL still take their own notes. Every OK SHALL go to the chat with the notes, naming its card. An OK alone SHALL NOT start a build, a publish, or any other action.

#### Scenario: Two of three ads accepted

- **WHEN** the person taps OK on cards 1 and 3, writes a note on card 2 with *Note*, and taps *Send notes*
- **THEN** the chat gets `Card #1: OK`, `Card #3: OK` and the note on card 2, and does nothing else

#### Scenario: Only OKs

- **WHEN** the person taps OK on every card and sends nothing else
- **THEN** nothing starts until the person taps a button in the bar

## MODIFIED Requirements

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

### Requirement: A live card runs the chat's own page, sealed

A card SHALL be able to hold a page the chat made, with its own layout, words, pictures, and script. The card SHALL show the page's top beside the card's other pictures; a click SHALL open it full screen, where the person SHALL be able to use it and switch it between a phone width and a computer width. A live card SHALL reach nothing outside itself: no internet, no other card, the page around it, or the app. It SHALL be able to send the person's choices to the page's notes, under its card, and they SHALL go to the chat as notes do.

#### Scenario: A live card sends a choice

- **WHEN** the person opens a live card full screen, picks a colour, and taps *Send notes*
- **THEN** the chat gets the choice under that card's number with the other notes

#### Scenario: A live card tries the internet

- **WHEN** a live card's script tries to load a file from a web address or read the page around it
- **THEN** the request fails, and the page and its notes are unchanged

### Requirement: A card can show a whole designed page

A card SHALL be able to show a whole HTML page the chat made, such as an email, as readers will see it, with each version labelled and side by side when there are two or more. Full screen SHALL show the page at *Phone* and *Computer* width. The page SHALL run no script, SHALL load nothing from the web, and SHALL carry its pictures inside the review page. Its links SHALL look as they will but SHALL NOT open. A tap on a spot in the page full screen SHALL place a note that names the version and the spot. The build SHALL stop, naming the card and file, for a page with a script, a picture it can not carry, or a file outside the review's folder.

#### Scenario: An email with two versions

- **WHEN** a review page holds an email card with versions *A* and *B*
- **THEN** the card shows the top of both versions side by side, a click on *B* opens it full screen, and a tap on a spot in *B* sends a note that names *Version B* and the spot

#### Scenario: A page with a script

- **WHEN** a page in the card holds a `<script>`
- **THEN** the build stops with the card and file, and the last good page stays
