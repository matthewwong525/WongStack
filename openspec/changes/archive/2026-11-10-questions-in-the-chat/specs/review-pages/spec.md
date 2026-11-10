## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: A plan says what its build needs

A plan's page SHALL list each key, login, file, or answer its build needs, each marked *Ready* or *Needs you*, or say that it needs nothing. An answer SHALL be asked in the chat before the page is built, so it is *Ready* on the page. A *Needs you* item SHALL hold a place to send its file, or a way to give it, such as a private key link. The page's build buttons SHALL stay off until each item is ready or given on the page, and SHALL say how many items still need the person.

#### Scenario: One answer missing

- **WHEN** a plan's logo is *Needs you* and the person has not given it
- **THEN** *Build it* reads *1 thing needs you* and starts nothing, and a tap on it shows the item

#### Scenario: A key is saved

- **WHEN** the person saves a needed key on its private link
- **THEN** the chat builds the page again with the key *Ready*, and the build buttons turn on once nothing else needs the person

## REMOVED Requirements

### Requirement: A review page can ask questions

**Reason**: Questions go to the person as question cards in the chat; the review page is only for the final look. *A review page asks no questions* and `asking-the-user`'s *Choices are asked in the chat* hold the promise.

**Migration**: Ask each question in the chat before building the page. A file stays a `file:` question in *What the build needs*. Pages already made keep their questions.

### Requirement: A question can ask to pick a picture

**Reason**: A pick between pictures is a choice, so it goes to the chat as a question card, with the pictures' link in the question.

**Migration**: Show the pictures in a card to look at, and ask the pick in the chat.

### Requirement: A live card runs the chat's own page, sealed

**Reason**: Its scenario *A live card sends a choice* puts a choice on the page. *A live card runs the chat's own page, sealed, to try* keeps the rest of the promise.

**Migration**: Ask the choice in the chat. A sample that called `review.answer` still runs, and the call does nothing.
