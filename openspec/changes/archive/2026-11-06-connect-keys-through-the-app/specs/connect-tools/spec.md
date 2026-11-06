## MODIFIED Requirements

### Requirement: The helper works out how to add a tool the app does not know

For a tool the company app does not know, the helper SHALL find from the tool's own developer pages how the app can reach it with a fixed key, with an ID and a secret the app trades for a short token, or through the tool's own MCP server, SHALL add that to the app, and SHALL write what it found on that tool's notes page. A tool that offers only a sign-in the person renews SHALL be shown as not connected yet, with the reason.

#### Scenario: A tool with a personal token

- **WHEN** the owner names Figma, which offers a personal access token
- **THEN** the helper makes that token in the assistant's browser, and Figma's notes page says how the app reaches it

#### Scenario: A tool with an ID and a secret

- **WHEN** the owner names Shopify, whose Dev Dashboard app gives an ID and a secret
- **THEN** the helper adds Shopify so the app trades them for a token itself, and a look-up works after the next publish

#### Scenario: A tool with only a sign-in

- **WHEN** the owner names a tool that only offers a sign-in that renews, with no fixed key
- **THEN** the list shows it as not connected yet and says it needs a sign-in the app can not keep yet

### Requirement: The owner's new tools work with no publish

The helper SHALL add every named tool the app does not know to the live app with no code change and no checks, and SHALL send each key sealed through the app, from any computer the owner or an Admin is signed in on. A new key SHALL go live at the next publish; when no other change waits, the helper SHALL offer to publish only the waiting keys, and SHALL then show each tool working with one look-up. Keys SHALL never be asked for in the chat.

#### Scenario: Two new tools

- **WHEN** the owner names Figma and Notion, which the app does not know, and their keys are made
- **THEN** both tools are added at once, the owner is offered a publish of the two keys, and after it both show a look-up working

#### Scenario: A key that does not come

- **WHEN** the Notion key is not made, because the owner stopped
- **THEN** the list says Notion waits for its key, Figma still works, and *connect my Notion* later picks it up
