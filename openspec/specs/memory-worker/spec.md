# memory-worker Specification

## Purpose
Serve every memory call from the repo's own production Worker, so that a memory key reaches only its own repo's memory store, never the app's data, and each person's transcripts stay private to them and the repo's admin.
## Requirements
### Requirement: One memory Worker serves every store in an account

Each Cloudflare account that holds a memory store SHALL have one memory Worker named `wong-memory`, separate from every application Worker. It SHALL have bindings to each attached repo's memory database and, when the store has one, its bucket, and to a keys database named `wong-memory-keys`. It SHALL have no binding to any other resource. Attaching a repo SHALL keep every other repo's bindings. No CI secret and no application deploy SHALL carry the memory Worker's bindings.

#### Scenario: A second repo in the same account

- **WHEN** setup runs for repo `billing` in an account whose memory Worker already serves repo `home`
- **THEN** the Worker gains bindings to `billing-memory`, and `home`'s bindings still work

#### Scenario: The app's database is out of reach

- **WHEN** the account also holds the app's production database
- **THEN** no request to the memory Worker can read or write it

### Requirement: Every memory call uses a memory key

The memory script SHALL send every store call to the Worker URL recorded under `components.memory.worker`, with the memory key from `CLOUDFLARE_MEMORY_TOKEN`. Only `migrate` and the admin commands SHALL instead use the admin's `CLOUDFLARE_API_TOKEN`, straight to Cloudflare. The Worker SHALL answer the same D1 query and R2 object requests, in the same shapes, that the memory script sends to the Cloudflare REST API. Each key SHALL open one repo's store, as `admin` or `member`. The Worker SHALL refuse a key it does not know with HTTP 401, and a request for another repo's store with HTTP 403. The keys database SHALL hold only a hash of each key. A store with no recorded Worker SHALL keep using the Cloudflare REST API with the same requests, until it is moved.

#### Scenario: A member searches facts

- **WHEN** a member runs `memory.mjs search deploy`
- **THEN** the result is the same as the admin's search on the same store, before the personal-fact filter

#### Scenario: A key for another repo

- **WHEN** a key that opens `billing`'s store sends a query for `home`'s memory database
- **THEN** the Worker answers 403 and runs nothing

#### Scenario: An unknown key

- **WHEN** a request carries a key that is not in the keys database
- **THEN** the Worker answers 401 and does nothing

### Requirement: The admin manages members with the memory script

The memory script SHALL have `member add <email> [--admin]`, `member remove <email>`, `member list`, and `worker deploy` commands. They SHALL run with the admin's `CLOUDFLARE_API_TOKEN`. `member add` SHALL create a random key for the email on this repo's store, store only its hash, and print the key once, and SHALL NOT write it to any file. With `--env`, it SHALL instead write the key to this clone's `.env` as `CLOUDFLARE_MEMORY_TOKEN`, and SHALL NOT print it. Adding an email again SHALL replace its earlier key. The first member who is not an admin SHALL set `components.memory.team` to `true`. `member remove` SHALL revoke the email's key on this repo at once. `member list` SHALL print this repo's emails and roles, and no key or hash. `worker deploy` SHALL deploy or update the Worker, attach this repo, and keep every other repo's bindings. When the admin's token lacks a permission a command needs, the command SHALL stop, name the permission, and change nothing.

#### Scenario: A teammate joins

- **WHEN** the admin runs `member add ana@example.com`
- **THEN** a key is printed once, no file holds it, and `components.memory.team` is `true`

#### Scenario: A member is removed

- **WHEN** the admin runs `member remove ana@example.com`
- **THEN** the next call with Ana's key is refused with 401

#### Scenario: The token cannot deploy Workers

- **WHEN** `worker deploy` runs with a `CLOUDFLARE_API_TOKEN` that lacks `Workers Scripts Write`
- **THEN** the command stops, names that permission, and changes nothing

### Requirement: A member reads only their own transcripts

A `member` key SHALL write and read R2 objects only under `sessions/<member email>/`. Any other key SHALL be refused with HTTP 403. An `admin` key SHALL read every object in its repo's bucket, including keys with no email. When the memory script is refused a transcript, it SHALL state that only the author and the admin can read it.

#### Scenario: A member follows their own fact to its source

- **WHEN** a member asks for the source of a fact from their own session
- **THEN** they get the session's reduced text

#### Scenario: A member follows a teammate's fact

- **WHEN** a member asks for the source of a fact from a teammate's session
- **THEN** no transcript is shown, and the script states that only the author and the admin can read it

#### Scenario: The admin reads an old transcript

- **WHEN** the admin asks for a transcript stored at `sessions/<agent>/<session-id>.jsonl`
- **THEN** they get its reduced text, and a member asking for the same key is refused

### Requirement: Existing installs move behind the memory Worker

`/wong-sync` SHALL move an install whose store has no recorded Worker: it SHALL deploy the Worker or attach the repo, create an admin key for the installer's git email, replace `CLOUDFLARE_MEMORY_TOKEN` in `.env` with that key, record the Worker URL, and delete the old `<repo>-memory` Cloudflare token only after a store call through the Worker succeeds. It SHALL tell the admin that teammates who held the old token need a member key.

#### Scenario: A solo install is moved

- **WHEN** `/wong-sync` moves a repo whose `.env` holds the old memory token
- **THEN** `.env` holds an admin key, the digest loads through the Worker, and the old token no longer exists

#### Scenario: The Worker call fails during the move

- **WHEN** the first store call through the Worker fails
- **THEN** the old token and `.env` value stay as they were, and the move reports the failure
