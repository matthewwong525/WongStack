## MODIFIED Requirements

### Requirement: An old install catches up in place

Sync SHALL plan the update of an install from before 19.0.0 in place, keeping every local edit, and SHALL NOT route it to a fresh setup. The comparison SHALL report, from the repo's layout, its install record and the secret name its `deploy.yml` reads, each move the install missed: the agent folder, the rules file in either link direction, WongStack pages kept outside `wiki/`, the install's own pages still in the code repo, leftover generated OpenSpec skills, parts the record opted out of, the CI deploy token, and the deploy token's old secret name. The plan SHALL include each reported move and list opted-out parts as left out until the person asks for them.

#### Scenario: A months-old, edited install

- **WHEN** a person runs `/wong-sync` in a 16.x install with a real `.claude/` folder and edited skills
- **THEN** the plan moves the folder, keeps every edited file's local text, and brings the payload up to date

#### Scenario: A part the person turned down

- **WHEN** the install record says the repo declined the starter app
- **THEN** the plan lists the starter app as left out, with that reason, and adds none of its files

#### Scenario: The deploy key has its old name

- **WHEN** the install's `deploy.yml` reads `secrets.CLOUDFLARE_API_TOKEN`
- **THEN** the plan runs the deploy key step during the update's build, before publish, and says live deploys pause until the update is published

## ADDED Requirements

### Requirement: An install's own pages move to the knowledge repo

When an install's wiki holds pages WongStack does not ship, sync's plan SHALL list each one that moves to the install's knowledge repo, by folder with counts, and SHALL move them only after the person's yes to that plan. Every page WongStack ships SHALL stay in the code repo. An own page SHALL move with its text unchanged, including a page that only explains code. A page that the install's own code reads as it runs SHALL stay in the code repo, beside the code that reads it, and the plan SHALL name each such page.

#### Scenario: A company wiki inside the code repo

- **WHEN** a person runs `/wong-sync` in an install whose `docs/` holds WongStack's pages, company pages and pages about its own code
- **THEN** the plan lists the company pages and the code pages as moving, lists WongStack's pages as staying, and nothing moves before the person says yes

#### Scenario: A page the app reads

- **WHEN** the install's app imports a prompt page from its wiki at build time
- **THEN** the plan moves that page next to the code that imports it, in the code repo, and the app builds and reads it as before

### Requirement: Links to moved pages are fixed or named

The move SHALL fix every link and path that names a moved page, in skills, rules, code, live specs and the code repo's remaining pages, and every link from a moved page back into the code repo. A reference the move can't fix safely SHALL become a named hand step on the plan, and the update SHALL NOT publish while a check finds a link to a page that is gone. Past plans, finished changes and memory facts SHALL keep their old paths.

#### Scenario: A path built as code runs

- **WHEN** install code builds a page path from parts at run time
- **THEN** the plan names that file and line as a hand step, and the move does not guess a rewrite

### Requirement: No edit is lost while a move waits

Pages SHALL go to the knowledge repo when the update is built and SHALL be copied again just before the update publishes, carrying each page that changed in the code repo since the first copy. A page changed in both places SHALL stop the publish and be named, and SHALL NOT be overwritten in either place.

#### Scenario: A teammate edits a page during review

- **WHEN** a teammate saves an edit to a page that is moving, after the update was built and before it publishes
- **THEN** the knowledge repo has that edit when the update goes live

### Requirement: A moved page can't come back to the code repo

The code repo SHALL keep a list mapping each moved path to its place in the knowledge repo. The wiki check SHALL fail on a page added or edited at a moved path, naming the page's new place, and an agent SHALL be able to find a moved page from its old path through that list.

#### Scenario: An old chat edits a moved page

- **WHEN** a chat opened before the move saves an edit to `docs/ops/cashflow-forecast.md` after the move published
- **THEN** its check fails and names `ops/cashflow-forecast.md` in the knowledge repo as the page's new place
