# connect-tools Specification

## Purpose

Help a person connect the work tools they use to their assistant, step by step, right after install and whenever they name one tool later, with every business key kept in the company app.

## Requirements

### Requirement: A person connects their tools by asking in plain words

A person SHALL be able to start connecting all their tools by asking in plain words, such as *connect my tools*, and one tool by naming it, such as *connect my Figma*. The helper SHALL ask which tools they use when none is named, and SHALL end with a short list of each tool as working, waiting, or not connected yet.

#### Scenario: All tools

- **WHEN** an owner types *connect my tools* and names Stripe, Figma and Gmail
- **THEN** the helper ends with one line for each of the three tools

#### Scenario: One tool later

- **WHEN** a person types *connect my Figma*
- **THEN** the helper handles Figma only, and does not ask about other tools

### Requirement: A connected tool shows that it works

For a tool the person's assistant can use through the company app, the helper SHALL show it working with one look-up that changes nothing, when it knows such a look-up.

#### Scenario: A saved key

- **WHEN** the person names a tool whose key is saved and they hold a level for it
- **THEN** the helper shows one result from a look-up and changes nothing at the service

### Requirement: The owner adds new tools with one key link and one yes

On a computer that can store keys in the company app, the helper SHALL connect every named tool with a public API that the app does not know yet through one private key link and one change for all of them, and SHALL ask *publish it?* once, with no plan to review first. Keys SHALL reach the app only after that yes, and SHALL never be asked for in the chat.

#### Scenario: Two new tools

- **WHEN** the owner names Figma and Notion, which the app does not know, and gives both keys on the link
- **THEN** one change adds both, the owner is asked *publish it?* once, and after the yes both tools show a look-up working

#### Scenario: The owner says no

- **WHEN** the owner answers no to *publish it?*
- **THEN** nothing goes live, the keys reach no app, and the list says the tools wait for publish

### Requirement: The helper works out how to add a tool the app does not know

For a tool the company app does not know, the helper SHALL find from the tool's own developer pages how the app can reach it with a fixed key, directly or through the tool's own MCP server, and SHALL write what it found on that tool's notes page. A tool that offers only a renewing sign-in SHALL be shown as not connected yet, with the reason.

#### Scenario: A tool with a personal token

- **WHEN** the owner names Figma, which offers a personal access token
- **THEN** the key link's steps say how to make that token, and Figma's notes page says how the app reaches it

#### Scenario: A tool with only a sign-in

- **WHEN** the owner names a tool that only offers a sign-in that renews, with no fixed key
- **THEN** the list shows it as not connected yet and says it needs a sign-in the app can not keep yet

### Requirement: A teammate gets a message for the owner

On a computer that can not store keys in the company app, a tool that waits for the owner SHALL get one short message the person can send, saying what the owner must do. The helper SHALL NOT change Access, ask for a key in the chat, or keep a business key on that computer.

#### Scenario: A tool the app does not know

- **WHEN** a teammate names Figma, which the app does not know
- **THEN** they get a message asking the owner to connect Figma for them, and nothing is saved on their computer

### Requirement: The owner is reminded to give access

When the owner connects a tool for a named teammate, the helper SHALL end by telling the owner to give that teammate a level for it in Access, and SHALL NOT change Access itself.

#### Scenario: Connect for a teammate

- **WHEN** the owner types *connect Figma for Ana* and Figma is connected
- **THEN** the last words tell the owner to give Ana a level on Figma in Access, and Ana's access is unchanged

### Requirement: A website with no API is not connected yet

For a tool the company app can not reach by a key, such as the person's own mail, the helper SHALL say it is not connected yet. It SHALL NOT open its browser or send a password link while connecting.

#### Scenario: The person's own mail

- **WHEN** the person names their own Gmail
- **THEN** the list shows it as not connected yet, and no browser page or password link opens
