# Mini-app API contracts

## MODIFIED Requirements

### Requirement: The example mini app is set up to grow

The example mini app SHALL keep its page, its parts, and its server side in separate files, and its server side SHALL dispatch through a route list. An unknown API route SHALL answer 404. The example's greeting action SHALL carry an explicit input/output contract used for company API discovery and validation, with the app and an authenticated agent calling the same handler. Existing greeting behavior SHALL be preserved. An installed app's unconverted route SHALL remain usable and SHALL not be automatically advertised until deliberately described.

#### Scenario: A copied app gains a route

- **WHEN** the agent adds an API route to a mini app copied from the example
- **THEN** it adds one entry to the route list and a handler, without touching the page

#### Scenario: The example is called by an agent

- **WHEN** an authenticated agent discovers and calls the greeting action
- **THEN** it uses the same endpoint and receives the greeting the example app would receive for that name

#### Scenario: A customized installed app updates

- **WHEN** an installed app's existing route has not yet received a discovery contract
- **THEN** it retains its original path, behavior and authorization and is absent from agent discovery
