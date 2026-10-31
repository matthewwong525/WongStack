## ADDED Requirements

### Requirement: Each guide gets a person or an agent from no key to a working, saved key

The site SHALL carry a public guide for each of these tools: Shopify, Shopify theme changes, Klaviyo, Meta ads, Google, Canva, Slack, and Notion. Every guide SHALL have the same shape: what the key lets you do, how long it takes, and what you need first; numbered steps that each name the exact button and show a picture; the permissions to choose, with the least the job needs; the names to save the values under in `.env`; a harmless check that only a working key passes; and how to replace the key if it leaks. Each guide SHALL show the date it was last checked against the tool. A guide SHALL NOT name WongStack or require any one agent or chat app.

#### Scenario: A person follows a guide alone

- **WHEN** a person with no developer knowledge opens the Klaviyo guide and does each step
- **THEN** they end with a key saved in `.env` under the names the guide gives, and the guide's check shows it works

#### Scenario: A guide is read for its parts

- **WHEN** the automatic checks read every guide
- **THEN** each one has its time, its needs, numbered steps with a picture each, the names to save, a check, the leak steps, and a last-checked date, or the checks fail and name the guide and the missing part

### Requirement: An agent can read every guide without a browser

Every guide SHALL open as a complete page that a reader can follow with no script, and SHALL also be served as plain text at its own address with `.md` added. One list at a fixed address SHALL name every guide with its address. Every guide SHALL open with a short part for an AI agent: ask the person before it makes anything, let the person sign in, never show a key in the chat, save the key to `.env`, and run the check.

#### Scenario: A person copies a code box

- **WHEN** a person taps *Copy* on a guide's code box, such as the line to save or the check
- **THEN** only that box's text is copied, and if the browser refuses, the text is selected for them to copy by hand

#### Scenario: An agent fetches a guide

- **WHEN** an agent fetches a guide's address, or the same address with `.md`, with a plain request that runs no script
- **THEN** it gets the full steps, the names to save, and the check, as text

### Requirement: Every guide teaches how to keep a key safe

The site SHALL carry one page on keeping keys safe, and every guide SHALL link it at the step where the key is saved. The page SHALL say that a key acts like a password to the business; that it goes in a `.env` file that git ignores, and never in a chat, an email, a screenshot, a shared document, or a public repository; to give each key the least access it needs; to keep a copy in a password manager; and to replace a key at once if it leaks, deleting the old one at the tool.

#### Scenario: The key leaks

- **WHEN** a reader whose key leaked opens the safety page
- **THEN** it tells them to make a new key, put it in `.env`, and delete the old key at the tool, because only the delete makes the leaked key useless

### Requirement: Guide pictures show no key and no private data

Every guide picture SHALL be a file the site serves itself. No picture SHALL show a key, token, password, or secret value, whole or in part; a screen that shows one SHALL appear only as a drawing. No picture SHALL show a real customer, a personal email, or an account ID that is not sample data. Each picture SHALL have text that says what it shows, so a reader who can not see it can still do the step.

#### Scenario: A step's screen shows the new key

- **WHEN** the step where the tool reveals the new key is written
- **THEN** its picture is a drawing of that screen, with no real or sample key value in it

#### Scenario: A picture is read

- **WHEN** the automatic checks read the guides
- **THEN** every picture the guides name exists in the site's files and has describing text, or the checks fail and name it

## MODIFIED Requirements

### Requirement: The landing page offers no paid hosting

The landing page and every page beside it, the guides and their plain-text copies included, SHALL NOT offer or mention a WongStack paid plan, price, trial, subscription, account or sign-in, or a rented server, and SHALL NOT name a server provider. The only cost a page names SHALL be what another company charges for an account the install uses, said with that company's name; a guide MAY also say that a step needs a tool's own plan, naming that tool and no price. An address the earlier hosted app served SHALL show the landing page, never an error page.

#### Scenario: Every page is read for hosting words

- **WHEN** the text of every page of the site, the guides included, is read
- **THEN** no WongStack plan, price, trial, subscription, sign-in, rented server, or server provider appears, and the only cost named is another company's charge for an account the install uses, or a tool's own plan named in a guide with no price

#### Scenario: A visitor follows an old link

- **WHEN** a visitor opens an address the earlier hosted app used, such as its pricing or sign-in page
- **THEN** the landing page shows
