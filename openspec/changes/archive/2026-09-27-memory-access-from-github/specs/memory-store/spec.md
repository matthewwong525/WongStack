## MODIFIED Requirements

### Requirement: Access uses a dedicated memory token

The store SHALL be read and written through the app's production Worker with a memory key named `CLOUDFLARE_MEMORY_TOKEN`, stored in the git-ignored `.env` under the secrets convention. The requirements below define how the production Worker serves it. The key SHALL open only this repo's store. It SHALL NOT be set as a CI secret, and it SHALL NOT be the widened provisioning token. No person SHALL hold a Cloudflare token for memory, except an older store's token until its move finishes. No memory key SHALL be committed to the repository.

#### Scenario: CI cannot read transcripts

- **WHEN** a reviewer inspects the repository's CI secrets after provisioning
- **THEN** `CLOUDFLARE_MEMORY_TOKEN` is not among them

#### Scenario: The token is missing

- **WHEN** a memory command runs on a machine whose `.env` has no `CLOUDFLARE_MEMORY_TOKEN`
- **THEN** the command stops with a message that names the variable, the page that owns it, and `memory.mjs join`
- **AND** no value is printed

#### Scenario: A teammate joins

- **WHEN** a teammate with access to the repo on GitHub needs memory access
- **THEN** they get a member key through `memory.mjs join`, not a Cloudflare token, and nobody sends them a key

### Requirement: The admin manages memory keys with the memory script

The memory script SHALL have `member add <email> [--admin]`, `member remove <email>`, and `member list` commands. They SHALL run with the admin's `CLOUDFLARE_API_TOKEN`, straight to the memory database. `member add` SHALL create a random key for the email on this repo's store, store only its hash, with no expiry, and print the key once, and SHALL NOT write it to any file. With `--env`, it SHALL instead write the key to this clone's `.env` as `CLOUDFLARE_MEMORY_TOKEN`, and SHALL NOT print it. Adding an email again SHALL replace the key `member add` made for it earlier, and SHALL leave the keys that email's machines got through `join`. The first member who is not an admin SHALL set `components.memory.team` to `true`. `member remove` SHALL revoke every key of the email on this repo at once, joined keys included. `member list` SHALL print one line per key: its email, role, machine name, and expiry, and no key or hash. The script SHALL have no command that deploys a Worker. When the admin's token lacks a permission a command needs, the command SHALL stop, name the permission, and change nothing.

#### Scenario: A teammate joins

- **WHEN** the admin runs `member add ana@example.com`
- **THEN** a key is printed once, no file holds it, and `components.memory.team` is `true`

#### Scenario: A member is removed

- **WHEN** the admin runs `member remove ana@example.com`, and Ana has a key from `member add` and keys from two joined machines
- **THEN** the next call with any of Ana's keys is refused with 401

#### Scenario: The list shows each machine

- **WHEN** Ana joined from two machines and the admin runs `member list`
- **THEN** the list shows two lines for Ana, each with its machine name and expiry date, and no key or hash

#### Scenario: The token cannot write D1

- **WHEN** `member add` runs with a `CLOUDFLARE_API_TOKEN` that lacks `D1 Write`
- **THEN** the command stops, names that permission, and changes nothing

#### Scenario: No deploy command

- **WHEN** someone runs `memory.mjs worker deploy`
- **THEN** the script stops with its usage, and nothing is deployed

## ADDED Requirements

### Requirement: A person with GitHub access to the repo joins memory

The memory script SHALL have a `join` command that gets a member key for this machine without the admin. It SHALL read the person's GitHub token from the authenticated `gh` CLI and send it to the production Worker's join route, together with the machine's name and the person's `git config user.email`. The Worker SHALL learn its own repository from the `GITHUB_REPOSITORY` value set by CI's production deploy, and SHALL NOT take the repository, or the address it asks GitHub at, from the request. The Worker SHALL grant a key only when GitHub reports that the token's user can read the repository and the repository is private, or can push to it and the repository is public. The key's email SHALL be one of the user's GitHub-verified emails: the `git config` email when it is verified, and otherwise the primary verified email. The Worker SHALL NOT store or log the GitHub token. The key SHALL have the `member` role, unless the email already holds an `admin` key, and SHALL expire 30 days after it is made. `join` SHALL write the key to the primary checkout's `.env` as `CLOUDFLARE_MEMORY_TOKEN`, SHALL NOT print it, and SHALL replace this machine's earlier joined key for the same email. When `gh` is not signed in, lacks the scope to read emails, or GitHub denies access, `join` SHALL change no file and SHALL print what the person can do next.

#### Scenario: A teammate on a private repo

- **WHEN** a person who can read a private repo runs `memory.mjs join`
- **THEN** `.env` holds a member key for their verified email, and `memory.mjs search deploy` returns facts

#### Scenario: A reader of a public repo

- **WHEN** a person who can read but not push to a public repo runs `memory.mjs join`
- **THEN** the Worker refuses with 403, no key is made, and `join` says to ask the repo's owner

#### Scenario: A stranger

- **WHEN** a person GitHub does not let see the repo runs `memory.mjs join`
- **THEN** the Worker refuses with 403, and no key is made

#### Scenario: An email GitHub has not verified

- **WHEN** `git config user.email` is `ana@example.com`, which is not among the person's verified GitHub emails, and their primary verified email is `ana@work.com`
- **THEN** the key is made for `ana@work.com`, and `join` names that email

#### Scenario: gh cannot read emails

- **WHEN** the person's `gh` token lacks the scope to read their emails
- **THEN** no key is made, and `join` prints the one `gh auth refresh` command that adds it

#### Scenario: A second machine

- **WHEN** Ana joins on a second machine
- **THEN** both machines' keys work

#### Scenario: The owner on a new laptop

- **WHEN** the person whose email holds the admin key joins on a new machine
- **THEN** the new key has the `admin` role and expires in 30 days

#### Scenario: A copy of the repo names another repository

- **WHEN** someone who owns a fork, but cannot read the original private repo, sends a join request that names their fork or another GitHub address
- **THEN** the Worker checks only its own repository at GitHub's own address, refuses with 403, and makes no key

#### Scenario: A Worker deployed without its repository

- **WHEN** the production Worker has no `GITHUB_REPOSITORY` value and someone runs `join`
- **THEN** the Worker refuses, and `join` says that production must be deployed by CI first

### Requirement: Joined keys expire and renew

The Worker SHALL refuse an expired key with HTTP 401 and a code that says it expired. A key with no expiry SHALL never expire; this covers the admin key made at setup, keys from `member add`, and every key made before expiry existed. Running `join` again SHALL renew a key: it SHALL check GitHub access again, and SHALL replace this machine's key with a new one that expires 30 days later.

#### Scenario: A key runs out

- **WHEN** a joined key is 31 days old and has not been renewed
- **THEN** the Worker answers 401 with the expired code, and runs nothing

#### Scenario: A leaver tries to renew

- **WHEN** a person removed from the GitHub repo runs `join` on a machine whose key has not expired
- **THEN** the Worker refuses, and the machine's key keeps working only until it expires

#### Scenario: An old key

- **WHEN** a key made before this change is used
- **THEN** it works, and has no expiry

### Requirement: A member key adds facts under its own name but does not edit or delete them

The Worker SHALL let a `member` key run only reads and the exact write statements the memory script sends: inserts of facts, fact tags, tags, and runs, the upsert of a session row, and the update that marks a live fact as superseded. In a member's insert of a fact, a tag, or a session row, the author SHALL be the key's email. The Worker SHALL refuse any other statement from a `member` key with HTTP 403, and SHALL run no statement in that batch. When the memory script writes through a memory key, it SHALL write the key's email as the author, and SHALL count the key's email among the current person's emails. An `admin` key SHALL keep running any statement that does not name the key table.

#### Scenario: A member supersedes a fact

- **WHEN** a member's `/save` writes a fact that supersedes a live fact
- **THEN** the new fact is stored and the old one is marked superseded

#### Scenario: A member deletes a fact

- **WHEN** a member key sends `DELETE FROM facts WHERE id = 3`
- **THEN** the Worker answers 403, and fact 3 is unchanged

#### Scenario: A member rewrites a fact

- **WHEN** a member key sends `UPDATE facts SET body = 'x' WHERE id = 3`
- **THEN** the Worker answers 403, and fact 3 is unchanged

#### Scenario: A member writes under another name

- **WHEN** Ana's member key sends an insert of a fact whose author is `bo@example.com`
- **THEN** the Worker answers 403, and no fact is stored

#### Scenario: A member hides one bad statement in a batch

- **WHEN** a member key sends a batch with an insert of a fact followed by a `DELETE`
- **THEN** the Worker answers 403, and neither statement runs

### Requirement: The store says when it is a team

The Worker SHALL tell the memory script, on every answered request, whether more than one email holds a key for the store. The memory script SHALL treat the repo as a team when `components.memory.team` is `true` or the Worker's last answer said so, and SHALL remember the Worker's answer on this machine for the next session.

#### Scenario: The owner's digest after a teammate joins

- **WHEN** a teammate has joined through GitHub, and `components.memory.team` is not set
- **THEN** from the owner's next session on, their digest and search show only their own `user` and `feedback` facts
