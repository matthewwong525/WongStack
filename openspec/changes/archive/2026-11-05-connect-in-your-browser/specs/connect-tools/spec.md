# Spec Delta

## MODIFIED Requirements

### Requirement: A person connects their tools by asking in plain words

A person SHALL be able to start connecting all their tools by asking in plain words, such as *connect my tools*, and one tool by naming it, such as *connect my Figma*. When none is named, the helper SHALL suggest the tools it already knows the person uses, from what setup and memory learned about them, and SHALL let them confirm or change the list; with nothing known, it SHALL ask which tools they use. It SHALL end with a short list of each tool as working, waiting, or not connected yet.

#### Scenario: All tools

- **WHEN** an owner types *connect my tools* and names Stripe, Figma and Gmail
- **THEN** the helper ends with one line for each of the three tools

#### Scenario: One tool later

- **WHEN** a person types *connect my Figma*
- **THEN** the helper handles Figma only, and does not ask about other tools

#### Scenario: Tools already known

- **WHEN** setup learned from past chats that the owner uses Stripe and Notion
- **THEN** the helper suggests Stripe and Notion and asks to confirm or change the list, before it asks anything else

### Requirement: The helper works out how to add a tool the app does not know

For a tool the company app does not know, the helper SHALL find from the tool's own developer pages how the app can reach it with a fixed key, directly or through the tool's own MCP server, SHALL add that to the app, and SHALL write what it found on that tool's notes page. A tool that offers only a renewing sign-in SHALL be shown as not connected yet, with the reason.

#### Scenario: A tool with a personal token

- **WHEN** the owner names Figma, which offers a personal access token
- **THEN** the helper makes that token in the owner's Chrome, or the key link's steps say how to make it, and Figma's notes page says how the app reaches it

#### Scenario: A tool with only a sign-in

- **WHEN** the owner names a tool that only offers a sign-in that renews, with no fixed key
- **THEN** the list shows it as not connected yet and says it needs a sign-in the app can not keep yet

### Requirement: A website with no API is not connected yet

For a tool the company app can not reach by a key, such as the person's own mail, the helper SHALL say it is not connected yet. It SHALL NOT sign in to that site, open its own browser, or send a password link while connecting.

#### Scenario: The person's own mail

- **WHEN** the person names their own Gmail
- **THEN** the list shows it as not connected yet, and no browser page or password link opens

## REMOVED Requirements

### Requirement: The owner adds new tools with one key link and one yes

**Reason**: A new tool no longer needs a change, its checks and a publish; it is added to the app at once.
**Migration**: See *The owner's new tools work with no publish*. A change already saved by an earlier run stays saved and can still be published.

## ADDED Requirements

### Requirement: The owner's new tools work with no publish

On a computer that can store keys in the company app, the helper SHALL add every named tool the app does not know, and its key, to the live app with no code change, no checks, and no *publish it?*, and SHALL then show each one working with one look-up. Keys SHALL never be asked for in the chat.

#### Scenario: Two new tools

- **WHEN** the owner names Figma and Notion, which the app does not know, and their keys are made
- **THEN** both tools show a look-up working on the live app in the same chat, and no change waits for publish

#### Scenario: A key that does not come

- **WHEN** the Notion key is not made, because the owner stopped
- **THEN** the list says Notion waits for its key, Figma still works, and *connect my Notion* later picks it up
