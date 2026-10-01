## MODIFIED Requirements

### Requirement: The code rule says where things go

The code rule SHALL load when an agent edits the main app, mini apps included, and SHALL say where a new page, API route, mini app, shared part, helper, and style go, pointing at the files that already follow it.

#### Scenario: A second page

- **WHEN** the agent adds a page to the main app
- **THEN** it adds a folder under the pages folder and one entry in the route list, following the home page
