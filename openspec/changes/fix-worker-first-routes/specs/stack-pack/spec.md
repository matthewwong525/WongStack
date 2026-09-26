## MODIFIED Requirements

### Requirement: The main Worker serves the mini apps

The pack's app scaffold SHALL serve every mini app from the main app's Worker. Its build SHALL copy each app's pages into the Worker's static assets under `/apps/<name>/`, and SHALL copy no handler, test, or TypeScript file. Its Worker SHALL run first for every path it serves — `/api/`, `/_memory/`, and `/apps/` — so no Worker route falls to the single-page fallback. It SHALL send `/apps/<name>/api/*` to that app's handler when it has one, and serve the static assets for every other path. The pack SHALL ship this routing as a module the scaffold's Worker imports, so `/wong-sync` keeps it current.

#### Scenario: Source stays private

- **WHEN** a client requests a mini app's `api.mjs` or a test file by path
- **THEN** the Worker does not return the file's contents

#### Scenario: An API path opened in a browser

- **WHEN** a person opens `/apps/hello/api/greeting` in a browser tab
- **THEN** the hello app's handler answers, not the main app's single-page fallback

#### Scenario: A memory write

- **WHEN** a client POSTs to a path under `/_memory/` or `/api/` on the production Worker
- **THEN** the Worker handles it, and the static assets never answer it with the single-page page or 405
