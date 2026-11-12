## MODIFIED Requirements

### Requirement: The helper works out how to add a tool the app does not know

For a tool the company app does not know, the helper SHALL find from the tool's own developer pages how the app can reach it with a fixed key, or with an ID and a secret the app trades for a short token, SHALL add that to the app, and SHALL write what it found on that tool's notes page. A tool that offers only a sign-in the person renews, or only an MCP server, SHALL be shown as not connected yet, with the reason.

#### Scenario: A tool with a personal token

- **WHEN** the owner names Figma, which offers a personal access token
- **THEN** the helper makes that token in the assistant's browser, and Figma's notes page says how the app reaches it

#### Scenario: A tool with an ID and a secret

- **WHEN** the owner names Shopify, whose Dev Dashboard app gives an ID and a secret
- **THEN** the helper adds Shopify so the app trades them for a token itself, and a look-up works after the next publish

#### Scenario: A tool with only a sign-in

- **WHEN** the owner names a tool that only offers a sign-in that renews, with no fixed key
- **THEN** the list shows it as not connected yet and says it needs a sign-in the app can not keep yet

#### Scenario: A tool with only an MCP server

- **WHEN** the owner names a tool whose only way in is its MCP server
- **THEN** the list shows it as not connected yet and says the app does not use MCP servers
