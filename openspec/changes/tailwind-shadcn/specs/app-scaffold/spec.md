# Spec Delta

## MODIFIED Requirements

### Requirement: npm test runs absolute quality gates

The scaffold's `npm test` SHALL fail on any coverage below 100%, a function over the complexity cap, a file over 500 lines, an explicit `any`, a lint warning, dead code, or duplicated code. The gates SHALL be absolute, not baselined, and the scaffold SHALL pass all of them as shipped, with no extra workflow. The one folder of ready-made parts copied into the app SHALL be exempt from the coverage, dead-code, and duplicated-code gates and from the lint rule on what a component file exports, and from nothing else; no other folder SHALL be exempt.

#### Scenario: A violation

- **WHEN** a commit adds an explicit `any` or an uncovered line to the scaffold
- **THEN** `npm test` exits non-zero and the existing test check goes red

#### Scenario: The shipped scaffold

- **WHEN** `npm test` runs on the scaffold as shipped
- **THEN** every gate passes, and none is skipped or allowed to fail

#### Scenario: A lint warning

- **WHEN** a commit adds code the linter warns about but does not call an error
- **THEN** `npm test` exits non-zero

#### Scenario: A copied part is added

- **WHEN** a commit copies a ready-made part into the parts folder and a screen uses it with an uncovered line of the screen's own
- **THEN** `npm test` exits non-zero for the screen's line, and reports nothing for the copied part's own untested lines

### Requirement: The starter app is set up to grow

The starter app SHALL route its pages through a route list, with the home page as its only page and a not-found page for every other address. Each page SHALL live in its own folder with its parts and tests; a part used by one page SHALL live in that page's folder. The Worker SHALL route `/api/` requests through a route list of handlers, one per file, starting with `GET /api/health`. An unknown API route SHALL answer 404. The scaffold SHALL ship no empty folders. Main API actions deliberately exposed to agents SHALL receive the verified caller identity and explicit contracts shared by runtime validation and generated API discovery, with the health action supplied as the example. Existing signed-identity enforcement and installed handler checks SHALL remain effective.

#### Scenario: An unknown address

- **WHEN** a person opens `/nothing-here` on the app
- **THEN** they see a "page not found" message with a link home, not the home page

#### Scenario: The health route

- **WHEN** a caller sends `GET /api/health`
- **THEN** the Worker answers 200 with `{ "ok": true }`, and `GET /api/nothing` answers 404

#### Scenario: A main API action becomes discoverable

- **WHEN** a main API action is deliberately described and published
- **THEN** it is available through generated discovery and app and agent calls execute it with the same verified caller identity
