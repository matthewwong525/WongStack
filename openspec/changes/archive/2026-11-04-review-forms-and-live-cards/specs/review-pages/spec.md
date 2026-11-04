# Spec Delta

## MODIFIED Requirements

### Requirement: Every review page follows one frame

Every review page, for a plan, a built preview, or work that is not code, SHALL show in this order: the ask in one line, the why, the things to review as numbered cards, what the build needs only when there is a list, the decisions only when there are some, and one bottom bar. The bar SHALL hold *Send notes* and only the buttons the page's link offers. A card's content SHALL change with the job; the frame, the notes, and OK and Change SHALL work the same on every page.

#### Scenario: An ads page and a plan page

- **WHEN** a person opens a review page of three ads and then a plan's review page
- **THEN** both show the ask, why, numbered cards with OK and Change, and the bottom bar in the same places, and the ads page shows no Decisions section when it has none

#### Scenario: A page with no decisions

- **WHEN** a page's source has no decisions
- **THEN** the page shows no Decisions section and no link to one

## ADDED Requirements

### Requirement: A live card runs the chat's own page, sealed

A card SHALL be able to hold a page the chat made, with its own layout, words, pictures, and script, running inside the card. The person SHALL be able to use it, switch it between a phone width and a computer width, and open it full screen. A live card SHALL reach nothing outside itself: no internet, no other card, the page around it, or the app. It SHALL be able to send the person's choices to the page's notes, under its card, and they SHALL go to the chat as notes do.

#### Scenario: A live card sends a choice

- **WHEN** the person picks a colour in a live card and taps *Send notes*
- **THEN** the chat gets the choice under that card's number with the other notes

#### Scenario: A live card tries the internet

- **WHEN** a live card's script tries to load a file from a web address or read the page around it
- **THEN** the request fails, and the page and its notes are unchanged

### Requirement: A website plan is built from its approved prototype

A plan that adds or changes a website this app does not run SHALL show it as a live card made while planning, at a phone and a computer width. Notes on the plan SHALL change that prototype. The build SHALL start from the prototype the person approved, and the check after it SHALL show the approved prototype beside the built page.

#### Scenario: A shop page

- **WHEN** a plan changes a shop's home page and the person taps *Build it*
- **THEN** the build uses the approved prototype's files, and the preview shows *Approved* beside *Built*

### Requirement: A review page can ask questions

A review page SHALL be able to ask the person questions in a card or a needs item, as words, a choice, a date, a tick, or a file. Answers SHALL be kept like notes, and SHALL go to the chat with the notes or with any button in the bar, each named by its question. A page SHALL NOT be built with a question that asks for a password, a key, a token, or a card number.

#### Scenario: Answers go with Build it

- **WHEN** the person answers *Shop name* and taps *Build it*
- **THEN** the chat gets the answer, named by its question, with the build request

#### Scenario: A question asks for a key

- **WHEN** a page's source has a question named *API key*
- **THEN** the page is not built, and the message names the question and points to the private key link

### Requirement: A person can send files from a review page

A file question SHALL take files by drop or by pick, within the page's limits on size, count, and type. Each sent file SHALL reach the computer of the chat that made the page, in a folder outside tracked files, and the chat SHALL get each file's question, name, and place. A file over the limits, or not what its name says, SHALL be refused on the page or on the computer, with the reason.

#### Scenario: A logo is sent

- **WHEN** the person drops `logo.png` on the *Logo* question and taps *Send notes*
- **THEN** the file is saved on the chat's computer, and the chat's message names the question and the saved file

#### Scenario: A file is too big

- **WHEN** the person picks a 40 MB file
- **THEN** the page says the file is too big and sends nothing for it

### Requirement: A plan says what its build needs

A plan's page SHALL list each key, login, file, or answer its build needs, each marked *Ready* or *Needs you*, or say that it needs nothing. A *Needs you* item SHALL hold its question, or a way to give it, such as a private key link. The page's build buttons SHALL stay off until each item is ready or answered on the page, and SHALL say how many items still need the person.

#### Scenario: One answer missing

- **WHEN** a plan's logo is *Needs you* and the person has not given it
- **THEN** *Build it* reads *1 thing needs you* and starts nothing, and a tap on it shows the item

#### Scenario: A key is saved

- **WHEN** the person saves a needed key on its private link
- **THEN** the chat builds the page again with the key *Ready*, and the build buttons turn on once nothing else needs the person
