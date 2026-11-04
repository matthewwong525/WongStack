# knowledge-reader Specification

## Purpose
The app shows the company's knowledge pages straight from the knowledge repo at its newest save, so an edit shows the next time someone opens a page, with no publish, and keeps pages marked public open to anyone.

## Requirements

### Requirement: The Knowledge app shows the newest save

The app SHALL ship a Knowledge mini app that lists every page in the knowledge repo, by folder, and shows any page when opened. Each list, page and search SHALL reflect the knowledge repo's newest save at the moment of the request, with no publish or rebuild of the app. A link from one page to another SHALL open the linked page in the app. Diagrams SHALL draw as pictures.

#### Scenario: An edit shows at once

- **WHEN** a person's assistant saves a change to a knowledge page, and a teammate then opens that page in the app
- **THEN** the teammate sees the changed page, and the app was not published again

#### Scenario: A page that is not there

- **WHEN** a person opens the address of a page the knowledge repo does not hold
- **THEN** the app says the page is not there and offers the page list

### Requirement: Search covers every page's words

The Knowledge app SHALL find pages by the words in them, across the newest save, and SHALL show each result's title and the matching line.

#### Scenario: A word in a page's body

- **WHEN** a person searches for a word that appears only in the body of one page
- **THEN** that page is a result, with the line that holds the word

### Requirement: Reading follows the Access page

The Knowledge app SHALL be granted and taken away like any other app on the Access page, and SHALL start unticked for everyone but the owner. A person without it SHALL get no list, page, search result or file, from the screen or through an assistant's action.

#### Scenario: A teammate without the app

- **WHEN** a teammate who lacks the Knowledge app opens a knowledge page's address or calls the page action
- **THEN** the request is refused and no page content is returned

### Requirement: Only pages marked public open without sign-in

A page whose leading frontmatter holds a bare `public: true` SHALL open for anyone at its public address, with no sign-in. Every other request at the public address, for a private page, a missing page or any other file, SHALL get the same not-found answer, so a private page's existence never shows. A page SHALL NOT run code from its own content in a reader's browser, on the public address or in the app.

#### Scenario: A public welcome page

- **WHEN** a visitor with no sign-in opens the public address of a page marked `public: true`
- **THEN** the page shows

#### Scenario: A private page asked for publicly

- **WHEN** a visitor with no sign-in opens the public address of a page without `public: true`
- **THEN** the answer is the same not-found answer a missing page gets

### Requirement: Assistants read knowledge through the app

The page list, a page and search SHALL be company actions, so an assistant reads knowledge with the person's own access and needs no copy of the repo.

#### Scenario: A skill looks a page up

- **WHEN** a person's assistant calls the page action for a page the person can read
- **THEN** it gets the page's newest saved text
