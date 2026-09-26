## MODIFIED Requirements

### Requirement: Access uses a dedicated memory token

The store SHALL be read and written through the account's memory Worker with a memory key named `CLOUDFLARE_MEMORY_TOKEN`, stored in the git-ignored `.env` under the secrets convention, as `memory-worker` requires. The key SHALL open only this repo's store. It SHALL NOT be set as a CI secret, and it SHALL NOT be the widened provisioning token. No person SHALL hold a Cloudflare token for memory.

#### Scenario: CI cannot read transcripts

- **WHEN** a reviewer inspects the repository's CI secrets after provisioning
- **THEN** `CLOUDFLARE_MEMORY_TOKEN` is not among them

#### Scenario: The token is missing

- **WHEN** a memory command runs on a machine whose `.env` has no `CLOUDFLARE_MEMORY_TOKEN`
- **THEN** the command stops with a message that names the variable and the page that owns it
- **AND** no value is printed

#### Scenario: A teammate joins

- **WHEN** a teammate needs memory access
- **THEN** the admin gives them a member key, not a Cloudflare token

### Requirement: R2 keeps each full raw transcript

When the store has a bucket, for each session with status `captured` or `skipped`, the store SHALL keep the full raw transcript file in R2 at `sessions/<author email>/<agent>/<session-id>.jsonl`, and SHALL keep it with no expiry. Before upload, every non-empty value in the repo's `.env` SHALL be replaced with a fixed placeholder. A session with status `private` SHALL have no R2 object. The memory script SHALL be able to print a stored transcript reduced to user and assistant text, so a reader can return to the full record behind a fact. A transcript uploaded before this key layout SHALL stay at `sessions/<agent>/<session-id>.jsonl`, and its session row SHALL keep pointing to it. When the store has no bucket, the session row SHALL still be written with no object key, and the script SHALL state that transcripts are not stored.

#### Scenario: A known secret in a transcript

- **WHEN** a transcript contains the value of a variable from `.env`
- **THEN** the uploaded object contains the placeholder in its place

#### Scenario: A longer session is uploaded again

- **WHEN** a session that was uploaded earlier has grown since
- **THEN** the object at the same key is replaced with the full current file

#### Scenario: A reader follows a fact to its source

- **WHEN** the agent asks for the source of a fact and the store has a bucket
- **THEN** it gets the source session's reduced text, not the raw file

#### Scenario: No bucket

- **WHEN** a session is captured in a store with no bucket
- **THEN** its session row and facts are written, no upload is tried, and asking for its source states that transcripts are not stored

#### Scenario: A new upload

- **WHEN** a session by `ana@example.com` is uploaded
- **THEN** its object key starts with `sessions/ana@example.com/`

### Requirement: The memory script searches facts with keywords and tags

The payload SHALL ship a dependency-free Node.js script that searches the store. It SHALL filter by full text, tag (including aliases), type, date range, author, branch, slug, and change state, and SHALL return live facts unless asked for superseded ones. When `components.memory.team` is `true`, search SHALL return only the current person's `user` and `feedback` facts, and `project` and `thread` facts from every author. The current person's emails SHALL be every git email on the `wiki/people/` page that lists their git email, or their git email alone when no page lists it. `--everyone` SHALL remove this filter. A repo that is not a team SHALL NOT filter by person. It SHALL print one line per fact: type, body, slug, age in days, author, and fact id. It SHALL print a slug's live facts newest first, with its open threads first. Change state SHALL be derived from the repo (`active` when `openspec/changes/<slug>/` exists, `shipped` when an archive for the slug exists, and `conversation` otherwise), and SHALL NOT be stored. Search SHALL NOT depend on embeddings or a vector index.

#### Scenario: Search by tag and date

- **WHEN** the agent searches for tag `ship` since `2026-09-01`
- **THEN** it gets one line per matching live fact, each with its age and author

#### Scenario: Read a topic

- **WHEN** the agent asks for slug `add-po-search`
- **THEN** it gets that slug's open threads, then its other live facts newest first

#### Scenario: A shipped change

- **WHEN** a slug has an archive folder and no active change folder
- **THEN** the output shows the state `shipped`

#### Scenario: A teammate's preference in a team

- **WHEN** the repo is a team and a teammate wrote a `feedback` fact about deploys
- **THEN** a search for `deploy` does not show it, and a search for `deploy --everyone` shows it

#### Scenario: One person with two git emails

- **WHEN** the repo is a team and the person's `people/` page lists two git emails
- **THEN** search shows the `user` and `feedback` facts written under both emails
