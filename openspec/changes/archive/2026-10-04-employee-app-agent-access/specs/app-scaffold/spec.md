# Main API contracts

## MODIFIED Requirements

### Requirement: The starter app is set up to grow

The starter app SHALL route its pages through a route list, with the home page as its only page and a not-found page for every other address. Each page SHALL live in its own folder with its parts, styles, and tests; a part used by one page SHALL live in that page's folder. The Worker SHALL route `/api/` requests through a route list of handlers, one per file, starting with `GET /api/health`. An unknown API route SHALL answer 404. The scaffold SHALL ship no empty folders. Main API actions deliberately exposed to agents SHALL receive the verified caller identity and explicit contracts shared by runtime validation and generated API discovery, with the health action supplied as the example. Existing signed-identity enforcement and installed handler checks SHALL remain effective.

#### Scenario: An unknown address

- **WHEN** a person opens `/nothing-here` on the app
- **THEN** they see a "page not found" message with a link home, not the home page

#### Scenario: The health route

- **WHEN** a caller sends `GET /api/health`
- **THEN** the Worker answers 200 with `{ "ok": true }`, and `GET /api/nothing` answers 404

#### Scenario: A main API action becomes discoverable

- **WHEN** a main API action is deliberately described and published
- **THEN** it is available through generated discovery and app and agent calls execute it with the same verified caller identity
