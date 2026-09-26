# memory-store Specification

## Purpose
Give every WongStack repo one private, searchable store of short typed facts, and of raw session transcripts when R2 is available, so that session context survives without a commit and a team can query it across topics, people, and time.
## Requirements
### Requirement: Every repo has one memory store on Cloudflare

Every WongStack repo SHALL have one memory store: one D1 database named `<repo>-memory` in the repo's Cloudflare account, plus one private R2 bucket of the same name when the account has R2 enabled. The bucket SHALL be optional. Without it, the store SHALL keep no raw transcripts, and every other memory behavior SHALL work the same. The store SHALL be separate from any application database, and it SHALL have no staging twin. The account id, database id, and bucket name (or its absence) SHALL be recorded under `components.memory` in `.claude/.wong-stack.json`. They are not secrets.

#### Scenario: A repo is provisioned

- **WHEN** provisioning completes in a repo named `billing`
- **THEN** a D1 database named `billing-memory` exists, and a private R2 bucket of the same name exists when the account has R2 enabled
- **AND** `.claude/.wong-stack.json` records the account id, database id, and bucket name or its absence under `components.memory`

#### Scenario: An account without R2

- **WHEN** the store has no bucket
- **THEN** facts, the write gate, search, the digest, capture, and consolidation all work
- **AND** no raw transcript is stored

#### Scenario: The app database is separate

- **WHEN** the repo also has the stack pack's production and staging databases
- **THEN** the memory database is a third database, which the app's Worker has no binding to

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

### Requirement: The unit of memory is a short typed fact that is superseded, never edited

The memory database SHALL hold `sessions` (one row per transcript), `facts`, `tags`, `fact_tags`, a `runs` table for background runs, and a full-text index over each fact's body, created by forward-only migrations that ship with the payload. A fact SHALL have a slug, one type (`user`, `feedback`, `project`, `reference`, or `thread`), a body of at most 400 characters, a source (`save`, `backfill`, `migration`, or `consolidation`), a creation time, an author, and its source session. A fact SHALL NOT be edited or deleted after it is written. New understanding SHALL become a new fact that supersedes the old one, and a fact is live while nothing supersedes it. A `thread` fact records an open question, and it closes when a later fact supersedes it.

#### Scenario: A decision changes

- **WHEN** a live fact says the digest cap is 100 lines and a later session sets it to 150
- **THEN** a new fact with the new cap exists and the old fact points to it as superseded
- **AND** the old fact's body is unchanged

#### Scenario: An open thread is resolved

- **WHEN** a session resolves the question in a live `thread` fact
- **THEN** a new fact that states the resolution supersedes the thread, and the thread is no longer live

#### Scenario: A fact is too long

- **WHEN** a fact's body has more than 400 characters
- **THEN** the store rejects it and states the limit

#### Scenario: A migration runs twice

- **WHEN** the schema migrations run against a database that is already current
- **THEN** no table or row changes

### Requirement: A write gate decides add, supersede, or drop

Before the store accepts a fact, the memory script SHALL show the writer the live facts with the same slug and the closest keyword matches across all slugs. The writer SHALL then add the fact, supersede one named live fact, or drop the fact. The script SHALL record a supersede in the same batch as the new fact. The gate SHALL be the same for `/save`, the background capture, and consolidation.

#### Scenario: A paraphrase of a live fact

- **WHEN** a session produces a fact that says the same thing as a live fact in other words
- **THEN** the writer sees the live fact among the matches and drops the new fact

#### Scenario: A correction

- **WHEN** a new fact contradicts a live fact that the gate shows
- **THEN** the new fact is stored and supersedes the old one

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

### Requirement: A fact never stores a credential value

Before the store accepts a fact, its body SHALL be checked against every non-empty `.env` value and against known token patterns (for example `ghp_`, `sk-`, `AKIA`, JWTs, and `Bearer` headers). A match SHALL reject the fact. The report SHALL name the session and the pattern, but never the value.

#### Scenario: A pasted token reaches a fact draft

- **WHEN** a fact draft contains a string that matches a GitHub token pattern
- **THEN** the store rejects the fact
- **AND** the report names the session and the pattern without the value

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

### Requirement: Tags come from a curated table that the model may extend

A fact's tags SHALL exist in the `tags` table. The script SHALL list every tag with its definition and use count. Adding a tag SHALL require a definition. When the new name is close to an existing tag, the script SHALL warn and name that tag. A tag with `alias_of` set SHALL match its target in searches.

#### Scenario: A tag without a definition

- **WHEN** a fact uses a tag that is not in the table and gives no definition
- **THEN** the store rejects the fact and names the missing tag

#### Scenario: A near-duplicate tag

- **WHEN** a fact adds the tag `saves` while `save` exists
- **THEN** the script warns and names `save`

#### Scenario: An alias

- **WHEN** `checkpoint` is an alias of `save` and the agent searches for `save`
- **THEN** facts tagged `checkpoint` are included

### Requirement: A fact that cannot reach the store waits in a local spool

When a fact cannot be written to the store because the network, the token, or the API fails, the script SHALL write it to an ignored local spool, report it as spooled, and exit successfully. A spool that is not empty SHALL be a reason for the next session start to begin a background run, and that run SHALL pass the spooled facts through the write gate, upload them, and then remove them. A spooled fact SHALL still pass the credential check before it is written to the spool.

#### Scenario: Save while offline

- **WHEN** `/save` runs with no network
- **THEN** its facts are written to the spool and the save reports them as spooled
- **AND** the git checkpoint is not blocked

#### Scenario: Spool drains

- **WHEN** a later session starts with the store reachable and the spool holds facts
- **THEN** the background run passes them through the write gate, uploads them, and removes them from the spool


### Requirement: Store migrations apply once

The memory script's `migrate` command SHALL record each applied migration and SHALL skip a migration that is already recorded. A migration that is not idempotent SHALL be safe to ship.

#### Scenario: migrate runs twice

- **WHEN** `migrate` runs on a store where every migration is recorded
- **THEN** no migration statement runs again

### Requirement: Records from an earlier notes migration stay readable

The memory script SHALL NOT offer a command that imports `notes/` files. A store that already holds sessions with agent `migration`, facts with source `migration`, or R2 objects under `migration/` SHALL keep them unchanged. Search, show, and the digest SHALL return those facts like any other fact, and `source` SHALL print the stored note text behind a migrated fact.

#### Scenario: The import command is gone

- **WHEN** a user runs `memory.mjs import --file migration.json`
- **THEN** the script prints its usage and exits with a non-zero status
- **AND** the store does not change

#### Scenario: A migrated fact is traced to its note

- **WHEN** a store with a bucket holds a fact whose session is `migration:<slug>` with a stored note text
- **THEN** `memory.mjs source <fact-id>` prints that note text
