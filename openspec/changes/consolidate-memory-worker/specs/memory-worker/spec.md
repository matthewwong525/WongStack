## ADDED Requirements

### Requirement: The app's production Worker serves the memory store

Each repo's memory store SHALL be served by the repo's own production app Worker, under the path prefix `/_memory/`. The production Worker SHALL bind the memory database as `MEMORY_DB` and, when the store has one, the bucket as `MEMORY_BUCKET`. The staging Worker and every preview SHALL bind neither, and SHALL answer every `/_memory/` request with HTTP 404. The bindings SHALL be declared in the app's wrangler config and deployed by CI with the app; no separate memory Worker and no person's deploy command SHALL exist. The memory request handling SHALL ship with the memory skill, so that `/wong-sync` updates it, and the app's Worker SHALL reach it through one route. The Worker URL recorded under `components.memory.worker` SHALL be the production Worker's `workers.dev` address followed by `/_memory`.

#### Scenario: Production serves memory

- **WHEN** a member runs `memory.mjs search deploy` in a repo whose production Worker has deployed the memory route
- **THEN** the request goes to `https://<worker>.<subdomain>.workers.dev/_memory/...` and returns the facts

#### Scenario: A preview has no memory

- **WHEN** any request reaches `/_memory/` on the staging Worker or a preview alias
- **THEN** the Worker answers 404 and reads no memory database

#### Scenario: A merge deploys a memory change

- **WHEN** a change to the memory request handling merges to `main`
- **THEN** CI's production deploy carries it, and nobody runs a separate memory deploy

### Requirement: The admin manages memory keys with the memory script

The memory script SHALL have `member add <email> [--admin]`, `member remove <email>`, and `member list` commands. They SHALL run with the admin's `CLOUDFLARE_API_TOKEN`, straight to the memory database. `member add` SHALL create a random key for the email on this repo's store, store only its hash, and print the key once, and SHALL NOT write it to any file. With `--env`, it SHALL instead write the key to this clone's `.env` as `CLOUDFLARE_MEMORY_TOKEN`, and SHALL NOT print it. Adding an email again SHALL replace its earlier key. The first member who is not an admin SHALL set `components.memory.team` to `true`. `member remove` SHALL revoke the email's key on this repo at once. `member list` SHALL print this repo's emails and roles, and no key or hash. The script SHALL have no command that deploys a Worker. When the admin's token lacks a permission a command needs, the command SHALL stop, name the permission, and change nothing.

#### Scenario: A teammate joins

- **WHEN** the admin runs `member add ana@example.com`
- **THEN** a key is printed once, no file holds it, and `components.memory.team` is `true`

#### Scenario: A member is removed

- **WHEN** the admin runs `member remove ana@example.com`
- **THEN** the next call with Ana's key is refused with 401

#### Scenario: The token cannot write D1

- **WHEN** `member add` runs with a `CLOUDFLARE_API_TOKEN` that lacks `D1 Write`
- **THEN** the command stops, names that permission, and changes nothing

#### Scenario: No deploy command

- **WHEN** someone runs `memory.mjs worker deploy`
- **THEN** the script stops with its usage, and nothing is deployed

## MODIFIED Requirements

### Requirement: Every memory call uses a memory key

The memory script SHALL send every store call made with a memory key to the Worker URL recorded under `components.memory.worker`, with the memory key from `CLOUDFLARE_MEMORY_TOKEN`. Only `migrate` and the admin commands SHALL instead use the admin's `CLOUDFLARE_API_TOKEN`, straight to Cloudflare. The Worker SHALL answer the same D1 query and R2 object requests, in the same shapes, that the memory script sends to the Cloudflare REST API. Each key SHALL open one repo's store, as `admin` or `member`. The Worker SHALL refuse a key it does not know with HTTP 401. The key hashes SHALL be kept in a table in the memory database, and the Worker SHALL refuse, with HTTP 403 and without running it, any statement that names that table or changes the schema's write protection, so that no key can read or change a key. A `CLOUDFLARE_MEMORY_TOKEN` that is not a memory key SHALL keep using the Cloudflare REST API with the same requests, until the store is moved. When the Worker URL answers 404, the script SHALL treat the store as not yet reachable, so that facts wait in the spool.

#### Scenario: A member searches facts

- **WHEN** a member runs `memory.mjs search deploy`
- **THEN** the result is the same as the admin's search on the same store, before the personal-fact filter

#### Scenario: A key for another repo

- **WHEN** a key made for `billing`'s store is sent to `home`'s production Worker
- **THEN** the Worker answers 401 and runs nothing

#### Scenario: An unknown key

- **WHEN** a request carries a key that is not in the store's key table
- **THEN** the Worker answers 401 and does nothing

#### Scenario: A key tries to read the keys

- **WHEN** an admin or member key sends a statement that names the key table, in any letter case or quoting
- **THEN** the Worker answers 403, and no statement in the batch runs

#### Scenario: An older store's token

- **WHEN** `CLOUDFLARE_MEMORY_TOKEN` holds a Cloudflare token, not a memory key, and a Worker URL is recorded
- **THEN** the script calls the Cloudflare REST API with that token, as before the move

#### Scenario: Production has not deployed the route yet

- **WHEN** a fact is written with a memory key and the Worker URL answers 404
- **THEN** the fact waits in the local spool, and the next run sends it

### Requirement: Existing installs move behind the memory Worker

`/wong-sync` SHALL move an install whose `CLOUDFLARE_MEMORY_TOKEN` is still a Cloudflare token to the app's production Worker. Its planned change SHALL add the memory bindings and the memory route to the app, record the Worker URL, apply the memory migrations, and, when the store has a bucket, give the `<repo>-deploy` token `Workers R2 Storage Write`. After that change merges and production deploys, the admin SHALL create an admin key for their git email with `member add --admin --env`, and SHALL delete the old `<repo>-memory` Cloudflare token only after a store call through the Worker succeeds. Until then the old token SHALL keep working. The move SHALL tell the admin that teammates who held the old token need a member key.

#### Scenario: A solo install is moved

- **WHEN** the sync change has merged, production has deployed, and the admin finishes the move
- **THEN** `.env` holds an admin key, the digest loads through the app's production Worker, and the old token no longer exists

#### Scenario: Before production deploys

- **WHEN** the sync change is on a branch and not yet deployed to production
- **THEN** memory calls still use the old token through the Cloudflare REST API and succeed

#### Scenario: The Worker call fails during the move

- **WHEN** the first store call through the Worker fails
- **THEN** the old token and `.env` value stay as they were, and the move reports the failure

## REMOVED Requirements

### Requirement: One memory Worker serves every store in an account

**Reason**: Memory moves into each repo's own production app Worker, so there is one thing to deploy per repo, and no shared Worker whose bindings grow with every repo in the account.

**Migration**: The shared `wong-memory` Worker was never deployed, so no store moves from it. An older store on a `<repo>-memory` Cloudflare token moves straight to the app's production Worker, as "Existing installs move behind the memory Worker" requires.

### Requirement: The admin manages members with the memory script

**Reason**: Its `worker deploy` command and the scenario for a token that cannot deploy Workers belong to the removed shared Worker.

**Migration**: "The admin manages memory keys with the memory script" keeps `member add`, `member remove`, and `member list` unchanged for the user.
